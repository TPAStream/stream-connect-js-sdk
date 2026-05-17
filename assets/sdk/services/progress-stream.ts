/**
 * Subscribe to a Celery task's state transitions via SSE, authed by
 * a short-lived task-scoped JWT.
 *
 * The token is minted server-side at task-dispatch time (see
 * `stream/security/sdk_task_token.py`) and returned alongside the
 * task_id from the validate-credentials POST. The SDK threads it
 * here; this module appends `?token=...` to the SSE URL. The token
 * is bound to (user_id, task_id) and audience-locked to
 * `sdk:sse:progress`, so it can't be replayed against any other
 * endpoint.
 *
 * Returns an `unsubscribe()` function the caller invokes on unmount;
 * the underlying AbortController kills the fetch and the server-side
 * pubsub cleanup runs via the disconnect path.
 */

import type { ValidateCredsResponse } from '../types';
import { sdkAxios } from './axios';
import { consumeSSE } from './sse';

interface SubscribeArgs {
  taskId: string;
  taskToken: string;
  onState: (state: ValidateCredsResponse) => void;
  onTimeout?: () => void;
  onError?: (err: unknown) => void;
}

/** Map a Celery task-meta payload to the SDK's state vocabulary.
 *
 * The validate-credentials task publishes via `update_state(state=…,
 * meta=…)`. Stock states (PENDING/STARTED/RETRY/SUCCESS/FAILURE)
 * carry no `meta` shape we depend on; the 2FA-flow custom states
 * (WAITING_FOR_METHOD_CHOICE, WAITING_FOR_TWO_FACTOR_CODE,
 * TRIGGERING_TWO_FACTOR_AUTH, ENTERING_CODE, TWO_FACTOR_AUTH_COMPLETE)
 * each carry a meta dict that the SDK consumer needs.
 *
 * For the WAITING_FOR_METHOD_CHOICE case specifically, the meta is
 * `{"method_list": [...]}` — the legacy polling endpoint nested it
 * under `data.info.method_list`, and the TwoFactorAuth component
 * still reads `twoFactorAuthData.info.method_list`, so we wrap it
 * here for shape parity.
 */
const stateFromTaskMeta = (
  meta: Record<string, unknown>
): ValidateCredsResponse | null => {
  const status = meta.status as string | undefined;
  const result = meta.result as Record<string, unknown> | string | undefined;

  if (!status) return null;

  const TWO_FACTOR_STATES = new Set([
    'WAITING_FOR_METHOD_CHOICE',
    'WAITING_FOR_TWO_FACTOR_CODE',
    'TRIGGERING_TWO_FACTOR_AUTH',
    'ENTERING_CODE',
    'TWO_FACTOR_AUTH_COMPLETE'
  ]);
  if (TWO_FACTOR_STATES.has(status)) {
    const info =
      typeof result === 'object' && result !== null
        ? (result as Record<string, unknown>)
        : undefined;
    // Lift carrier-rejection messages and credentials_are_valid out
    // of the nested `info` blob to the top level of the response so
    // the validation reducer / hero can render them inline (e.g. a
    // WAITING_FOR_TWO_FACTOR_CODE event after a wrong code carries a
    // carrier-specific message that needs to surface above the code
    // input). The full info is still passed through for components
    // that read it (e.g. the method picker needs info.method_list).
    const liftedMessage =
      info && typeof info.message === 'string' ? info.message : undefined;
    const liftedValid =
      info && typeof info.credentials_are_valid === 'boolean'
        ? info.credentials_are_valid
        : undefined;
    return {
      state: status as ValidateCredsResponse['state'],
      ...(info && { info }),
      ...(liftedMessage !== undefined && { message: liftedMessage }),
      ...(liftedValid !== undefined && { credentials_are_valid: liftedValid })
    } as ValidateCredsResponse;
  }

  if (status === 'PENDING' || status === 'STARTED' || status === 'RETRY') {
    return { state: 'PENDING' };
  }
  if (status === 'SUCCESS') {
    if (typeof result === 'object' && result !== null) {
      return {
        state: 'SUCCESS',
        ...(result as object)
      } as ValidateCredsResponse;
    }
    return { state: 'SUCCESS' };
  }
  if (status === 'FAILURE') {
    return {
      state: 'FAILURE',
      message:
        typeof result === 'string'
          ? result
          : ((result as { message?: string } | undefined)?.message ??
            'Task failed')
    };
  }
  return null;
};

const baseV3Url = (axiosBaseURL: string): string => {
  // axios baseURL is .../sdk-api; the SSE sub-app is mounted at /v3/sdk
  // sibling to it. Strip /sdk-api and append /v3/sdk.
  const sdkApiIdx = axiosBaseURL.lastIndexOf('/sdk-api');
  const root =
    sdkApiIdx >= 0
      ? axiosBaseURL.slice(0, sdkApiIdx)
      : axiosBaseURL.replace(/\/$/, '');
  return `${root}/v3/sdk`;
};

export const subscribeToProgress = ({
  taskId,
  taskToken,
  onState,
  onTimeout,
  onError
}: SubscribeArgs): (() => void) => {
  const controller = new AbortController();
  const baseURL = sdkAxios.defaults.baseURL || '';
  const url =
    `${baseV3Url(baseURL)}/progress/${encodeURIComponent(taskId)}/stream` +
    `?token=${encodeURIComponent(taskToken)}`;

  // Track whether we've observed a truly terminal event from the
  // higher-level state vocabulary (SUCCESS / FAILURE /
  // TWO_FACTOR_AUTH_COMPLETE / timeout). PENDING/STARTED/RETRY are
  // progress states; if the stream closes cleanly after one of those
  // without progressing further, ValidationStreamRunner needs to know
  // so it can mark the validation pending_async instead of leaving
  // the user stuck on "Connecting...".
  const TERMINAL_STATES = new Set([
    'SUCCESS',
    'FAILURE',
    'TWO_FACTOR_AUTH_COMPLETE'
  ]);
  let sawTerminalEvent = false;

  consumeSSE({
    url,
    // Token rides in the URL, not a header — keeps EventSource-like
    // semantics simple and survives any host-page CSP that restricts
    // request headers. The token is short-lived (~10 min) and
    // audience-locked so URL exposure (logs, history) has bounded blast.
    headers: {},
    signal: controller.signal,
    onMessage: ({ event, data }) => {
      if (event === 'timeout') {
        sawTerminalEvent = true;
        onTimeout?.();
        return;
      }
      if (event === 'ping') return;
      if (event !== 'state') return;
      try {
        const meta = JSON.parse(data) as Record<string, unknown>;
        const state = stateFromTaskMeta(meta);
        if (state) {
          onState(state);
          if (TERMINAL_STATES.has(state.state)) sawTerminalEvent = true;
        }
      } catch (err) {
        onError?.(err);
      }
    },
    onError,
    shouldSuppressCloseError: () => sawTerminalEvent
  });

  return () => controller.abort();
};
