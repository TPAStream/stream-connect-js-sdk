import { useEffect, useRef } from 'react';
import { subscribeToProgress } from '../services/progress-stream';
import { getPolicyHolder, validateCredentials } from '../services/requests';
import type { ValidateCredsResponse } from '../types';
import {
  type ActiveValidation,
  useActiveValidations
} from './ActiveValidationsContext';

/**
 * Renders nothing. Maintains one SSE subscription per active
 * validation in the context. When state updates land, dispatches
 * them into the context. On terminal state (success / failure),
 * does the same getPolicyHolder follow-up the legacy controller's
 * `handleRealtimeCompletion` did so the credentialsValid flag stays
 * accurate.
 *
 * Lives outside the wizard step state so it survives navigation —
 * the user can browse ChoosePayer / FixCredentials / EnterCredentials
 * while the SSE subscriptions tick along in the background.
 *
 * A single stream connection is capped server-side at about ten
 * minutes, but the validation behind it runs far longer (the post-MFA
 * claims pull is routinely the slow part) and stays observable for its
 * whole life. So a `timeout` is not an outcome, it's a connection
 * ending. The runner reattaches: re-GET the policy holder for the
 * still-active task and a freshly minted stream token, resubscribe,
 * keep rendering live state. `pending_async` ("still working on it")
 * is the fallback for when reattach can't proceed, not the routine
 * response to a ten-minute mark.
 */

/** How many times we'll re-open a stream for one validation before
 * settling for pending_async. Each connection covers ~10 min and the
 * backend keeps a validation observable for ~90 min
 * (VALIDATION_OBSERVATION_WINDOW_SECONDS), so 8 reattaches span the
 * window; 10 (11 connections, ~110 min) is deliberately past it, which
 * means the server's own pointer expiry decides the end rather than
 * this number. */
const MAX_REATTACHES = 10;

/** Backoff before re-opening after an *error* (as opposed to a clean
 * timeout, which reattaches immediately). Without it, a stream that
 * fails instantly (SSE endpoint 503, member's network dropped)
 * would burn all ten attempts in a couple of seconds and turn a blip
 * into a retry storm across every member mid-validation. Indexed by
 * attempt, clamped to the last entry. */
const ERROR_BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];

const TERMINAL_WIRE_STATES: ReadonlySet<string> = new Set([
  'SUCCESS',
  'FAILURE',
  'TWO_FACTOR_AUTH_COMPLETE'
]);

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

interface ValidationStreamRunnerProps {
  /** Used by the post-success refresh to call getPolicyHolder with
   * the same identity context the orchestrator does. */
  email: string;
  employerId: number;
  /** Fired once per validation when it reaches a terminal SSE state
   * (SUCCESS / FAILURE / TWO_FACTOR_AUTH_COMPLETE), after the
   * PH-refresh resolves. Mirrors the 0.7-era `doneEasyEnroll`
   * callback so existing integrations get a terminal-state hook even
   * in the non-blocking flow. The orchestrator wires
   * `props.doneEasyEnroll` here; the runner only knows it as
   * `onTerminal` so this module stays independent of the public init
   * type. */
  onTerminal?: (data: {
    policyHolderId: number;
    payerId: number;
    /** The carrier info captured at validation-dispatch time.
     * Surfaced separately from policyHolder.payer_id so the bridge
     * can hand the 0.7-era doneEasyEnroll callback a top-level
     * `payer` object matching the documented shape. */
    payer: { id: number; name: string; logo_url: string };
    credentialsValid: boolean;
    loginProblem: string | null;
    loginCorrectionMessage: string | null;
  }) => void;
}

export const ValidationStreamRunner = ({
  email,
  employerId,
  onTerminal
}: ValidationStreamRunnerProps) => {
  const {
    validations,
    applyStateUpdate,
    markPendingAsync,
    markTerminalConfirmed
  } = useActiveValidations();
  // Track which validations we've already subscribed to so React
  // strict-mode double-mount doesn't open two streams per task.
  const subscriptions = useRef<Map<string, () => void>>(new Map());
  // Reattaches spent per validation, so one validation can't loop
  // forever re-opening streams.
  const reattaches = useRef<Map<string, number>>(new Map());
  // Validations with a reattach in flight. A stream can report an
  // error and then a close in quick succession; without this, both
  // would race to open a replacement.
  const reattaching = useRef<Set<string>>(new Set());
  // Flipped on unmount. A reattach awaiting the network at that
  // moment must not resurrect a stream into a torn-down runner.
  const mounted = useRef(true);

  useEffect(() => {
    // Open a subscription for any validation we don't already have one
    // for. pending_async is treated as terminal-for-subscription-purposes
    // (reattach was exhausted or ruled out; the user will see the final
    // state on the next session) so we don't re-open subscriptions to it.
    for (const validation of validations) {
      if (subscriptions.current.has(validation.id)) continue;
      if (
        validation.state === 'success' ||
        validation.state === 'failure' ||
        validation.state === 'pending_async'
      )
        continue;
      const unsub = openStream(validation);
      subscriptions.current.set(validation.id, unsub);
    }
    // Tear down subscriptions for validations no longer in the list,
    // or that have reached a terminal state (including pending_async).
    const liveIds = new Set(
      validations
        .filter(
          (validation) =>
            validation.state !== 'success' &&
            validation.state !== 'failure' &&
            validation.state !== 'pending_async'
        )
        .map((validation) => validation.id)
    );
    for (const [id, unsub] of subscriptions.current.entries()) {
      if (!liveIds.has(id)) {
        unsub();
        subscriptions.current.delete(id);
      }
    }
    // Cleanup-on-validations-change is handled inline above via the
    // reconcile loop; the unmount cleanup lives in the empty-deps
    // effect below so the live `subscriptions.current` map survives
    // re-renders triggered by validations changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validations]);

  // Mount/unmount lifecycle: tear down all subscriptions when the
  // runner is unmounted entirely (the SDK is being torn down).
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const unsub of subscriptions.current.values()) {
        unsub();
      }
      subscriptions.current.clear();
    };
  }, []);

  /** True while this validation is still ours to drive: it hasn't
   * been reconciled away, and the runner hasn't unmounted, while we
   * were awaiting the network. */
  const stillLive = (validation: ActiveValidation) =>
    mounted.current && subscriptions.current.has(validation.id);

  /** Turn a resolved policy holder into the terminal state the panel
   * and the host page read.
   *
   * Guarded on `mounted`, NOT on `stillLive`. By the time a PH refresh
   * resolves, the reconcile effect has already torn this validation's
   * subscription down: applying a terminal wire state removes the id
   * from `liveIds`, which is the point. `stillLive` here would
   * therefore be false on every successful validation and would drop
   * the refresh result, the auto-dismiss gate, and the host's
   * doneEasyEnroll callback. `mounted` is the question actually worth
   * asking: if the SDK itself is gone, don't call back into it. */
  const finalizeFromPolicyHolder = (
    validation: ActiveValidation,
    ph: Awaited<ReturnType<typeof getPolicyHolder>>
  ) => {
    if (!mounted.current) return;
    const valid = ph.loginProblemIsValid();
    applyStateUpdate(validation.id, {
      state: valid ? 'SUCCESS' : 'FAILURE',
      credentials_are_valid: valid,
      message: valid ? undefined : (ph.login_correction_message ?? undefined)
    });
    // Mark this validation's terminal state as refresh-confirmed so
    // the panel's auto-dismiss timer can fire. Without this, an
    // SSE-only SUCCESS would dismiss in 4s even if the PH refresh
    // later flipped to failure, hiding a real bad-creds outcome from
    // the user.
    markTerminalConfirmed(validation.id);
    // Fire the legacy terminal callback. doneEasyEnroll was the
    // 0.7-era "the credential submit + validation is done" hook;
    // without this, customers relying on it would silently stop
    // receiving terminal events under the default non-blocking flow.
    onTerminal?.({
      policyHolderId: validation.policyHolderId,
      payerId: validation.payer.id,
      payer: validation.payer,
      credentialsValid: valid,
      loginProblem: ph.login_problem ?? null,
      loginCorrectionMessage: ph.login_correction_message ?? null
    });
  };

  /** Terminal state when the PH refresh didn't resolve. Same
   * `mounted`-not-`stillLive` reasoning as above. */
  const finalizeFromWire = (
    validation: ActiveValidation,
    data: ValidateCredsResponse
  ) => {
    if (!mounted.current) return;
    // The wire-level `credentials_are_valid` (lifted from the SSE
    // payload by `stateFromTaskMeta`) is the authoritative pre-refresh
    // signal. Preserve it on the terminal callback rather than always
    // reporting success: otherwise a transient refresh failure tells
    // the host page via doneEasyEnroll that the credential succeeded
    // while the SDK UI is showing failure (the apply_state reducer
    // already used the wire value to set the failure UI state).
    const wireValid = data.credentials_are_valid !== false;
    // Confirm terminal state on this path too: the refresh attempt is
    // spent and the wire-level signal is now the authoritative result.
    // The panel can safely auto-dismiss a `success` card from here.
    markTerminalConfirmed(validation.id);
    onTerminal?.({
      policyHolderId: validation.policyHolderId,
      payerId: validation.payer.id,
      payer: validation.payer,
      credentialsValid: wireValid,
      loginProblem: null,
      loginCorrectionMessage: wireValid ? null : (data.message ?? null)
    });
  };

  /** The terminal handling shared by the streaming path and the
   * reattach path. `data` is the wire payload that ended the
   * validation; the PH refresh is what turns it into the flag the
   * panel and the host page read.
   *
   * `ph` lets a caller that has already fetched the policy holder
   * hand it over instead of paying for a second GET. The reattach
   * path is in that position: it fetched the PH to look for a live
   * task, and finding none is what told it the task was already
   * terminal, so `login_problem` was written before that fetch. */
  const handleTerminal = (
    validation: ActiveValidation,
    data: ValidateCredsResponse,
    ph?: Awaited<ReturnType<typeof getPolicyHolder>>
  ) => {
    if (data.state === 'SUCCESS' || data.state === 'TWO_FACTOR_AUTH_COMPLETE') {
      if (ph) {
        finalizeFromPolicyHolder(validation, ph);
        return;
      }
      // Refresh PH to capture the final login_problem state. The
      // panel renders the right copy from there. We don't need to
      // pass anything back to the orchestrator — the panel reads
      // straight off the validation's state.
      getPolicyHolder({
        policyHolderId: validation.policyHolderId,
        email,
        employerId
      })
        .then((fresh) => finalizeFromPolicyHolder(validation, fresh))
        .catch(() => finalizeFromWire(validation, data));
    } else if (data.state === 'FAILURE') {
      // Failures don't go through the success/2FA-complete refresh
      // above (no PH to refetch), but they're still terminal from
      // the customer's perspective.
      onTerminal?.({
        policyHolderId: validation.policyHolderId,
        payerId: validation.payer.id,
        payer: validation.payer,
        credentialsValid: false,
        loginProblem: null,
        loginCorrectionMessage: data.message ?? null
      });
    }
  };

  /**
   * A stream ended without the validation ending. Get back on it.
   *
   * `streamedTaskId` is the task the dead connection was watching,
   * which is what we ask about if it turns out there's nothing left
   * to reattach to. The validation's own id never changes across
   * reattaches (the context is keyed by it); only the stream target
   * does.
   */
  const reattach = async (
    validation: ActiveValidation,
    streamedTaskId: string,
    reason: 'timeout' | 'error'
  ) => {
    if (reattaching.current.has(validation.id)) return;
    if (!stillLive(validation)) return;
    reattaching.current.add(validation.id);
    // Abort whatever is left of the dead stream first. A mid-stream
    // error (one unparseable frame, say) doesn't close the reader on
    // its own, and two readers on one validation would double every
    // subsequent state update.
    subscriptions.current.get(validation.id)?.();
    try {
      const attempt = (reattaches.current.get(validation.id) ?? 0) + 1;
      reattaches.current.set(validation.id, attempt);
      if (attempt > MAX_REATTACHES) {
        markPendingAsync(validation.id);
        return;
      }
      if (reason === 'error') {
        const idx = Math.min(attempt - 1, ERROR_BACKOFF_MS.length - 1);
        await sleep(ERROR_BACKOFF_MS[idx] ?? 1000);
        if (!stillLive(validation)) return;
      }

      let ph: Awaited<ReturnType<typeof getPolicyHolder>>;
      try {
        ph = await getPolicyHolder({
          policyHolderId: validation.policyHolderId,
          email,
          employerId
        });
      } catch {
        // Can't even ask. Don't guess at an outcome.
        markPendingAsync(validation.id);
        return;
      }
      if (!stillLive(validation)) return;

      if (ph.task_id && ph.task_token) {
        subscriptions.current.set(
          validation.id,
          openStream(validation, {
            taskId: ph.task_id,
            taskToken: ph.task_token
          })
        );
        return;
      }

      // No live task pointer. The backend clears it the moment a task
      // reaches a terminal state, so this almost always means the
      // validation finished while we were between connections. But
      // "almost always" isn't good enough to tell a member their
      // connection succeeded, and a stale login_problem would happily
      // supply a wrong answer. Ask the polling GET, which reports the
      // task's real state, and only finalize on a terminal one.
      let final: ValidateCredsResponse;
      try {
        final = await validateCredentials({
          taskId: streamedTaskId,
          policyHolderId: validation.policyHolderId,
          email
        });
      } catch {
        markPendingAsync(validation.id);
        return;
      }
      if (!stillLive(validation)) return;

      if (final && TERMINAL_WIRE_STATES.has(final.state)) {
        applyStateUpdate(validation.id, final);
        // Hand over the `ph` fetched above rather than making
        // handleTerminal re-GET the same row. The task was already
        // terminal when we fetched it (that's what the missing pointer
        // told us), so its login_problem was already final.
        handleTerminal(validation, final, ph);
      } else {
        markPendingAsync(validation.id);
      }
    } finally {
      reattaching.current.delete(validation.id);
    }
  };

  const openStream = (
    validation: ActiveValidation,
    target?: { taskId: string; taskToken: string }
  ) => {
    const taskId = target?.taskId ?? validation.taskId;
    const taskToken = target?.taskToken ?? validation.taskToken;
    return subscribeToProgress({
      taskId,
      taskToken,
      onState: (data) => {
        applyStateUpdate(validation.id, data);
        handleTerminal(validation, data);
      },
      onTimeout: () => {
        // The server's per-connection deadline, not the validation's.
        // Get a fresh token and carry on watching.
        void reattach(validation, taskId, 'timeout');
      },
      onError: () => {
        // SSE fetch failed or the stream broke partway through. Same
        // move as a timeout, with a backoff. The validation is
        // probably still running; and if the failure was the 401 that
        // now means "task already finished", the reattach path
        // resolves the real outcome instead of stranding the member
        // on "Connecting…".
        void reattach(validation, taskId, 'error');
      }
    });
  };

  // Returns nothing — the panel renders the validations list.
  return null;
};
