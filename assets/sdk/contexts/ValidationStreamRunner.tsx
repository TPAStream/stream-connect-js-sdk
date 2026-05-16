import { useEffect, useRef } from 'react';
import { subscribeToProgress } from '../services/progress-stream';
import { getPolicyHolder } from '../services/requests';
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
 */

interface ValidationStreamRunnerProps {
  /** Used by the post-success refresh to call getPolicyHolder with
   * the same identity context the orchestrator does. */
  email: string;
  employerId: number;
}

export const ValidationStreamRunner = ({
  email,
  employerId
}: ValidationStreamRunnerProps) => {
  const { validations, applyStateUpdate, markPendingAsync } =
    useActiveValidations();
  // Track which validations we've already subscribed to so React
  // strict-mode double-mount doesn't open two streams per task.
  const subscriptions = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    // Open a subscription for any validation we don't already have one
    // for. pending_async is treated as terminal-for-subscription-purposes
    // (the SSE stream is gone; the user will see the final state on the
    // next session) so we don't re-open subscriptions to it.
    for (const v of validations) {
      if (subscriptions.current.has(v.id)) continue;
      if (
        v.state === 'success' ||
        v.state === 'failure' ||
        v.state === 'pending_async'
      )
        continue;
      const unsub = openStream(v);
      subscriptions.current.set(v.id, unsub);
    }
    // Tear down subscriptions for validations no longer in the list,
    // or that have reached a terminal state (including pending_async).
    const liveIds = new Set(
      validations
        .filter(
          (v) =>
            v.state !== 'success' &&
            v.state !== 'failure' &&
            v.state !== 'pending_async'
        )
        .map((v) => v.id)
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
    return () => {
      for (const unsub of subscriptions.current.values()) {
        unsub();
      }
      subscriptions.current.clear();
    };
  }, []);

  const openStream = (v: ActiveValidation) =>
    subscribeToProgress({
      taskId: v.taskId,
      taskToken: v.taskToken,
      onState: (data) => {
        applyStateUpdate(v.id, data);
        if (
          data.state === 'SUCCESS' ||
          data.state === 'TWO_FACTOR_AUTH_COMPLETE'
        ) {
          // Refresh PH to capture the final login_problem state. The
          // panel renders the right copy from there. We don't need to
          // pass anything back to the orchestrator — the panel reads
          // straight off the validation's state.
          getPolicyHolder({
            policyHolderId: v.policyHolderId,
            email,
            employerId
          })
            .then((ph) => {
              const valid = ph.loginProblemIsValid();
              applyStateUpdate(v.taskId, {
                state: valid ? 'SUCCESS' : 'FAILURE',
                credentials_are_valid: valid,
                message: valid
                  ? undefined
                  : (ph.login_correction_message ?? undefined)
              });
            })
            .catch(() => {
              // Best-effort. The success state already landed; the
              // refresh would have just refined credentialsValid.
            });
        }
      },
      onTimeout: () => {
        // Move to pending_async — backend timeout for the SSE stream
        // (10 min). The task may still complete later but we won't
        // know until the user reopens the page. Use the dedicated
        // action rather than dispatching a wire state, because the
        // wire vocabulary doesn't have a "still pending after the
        // SSE stream closed" value (the stream just times out).
        markPendingAsync(v.id);
      },
      onError: () => {
        // SSE fetch failed or the stream broke partway through. We
        // don't know if the validation will still complete server-side,
        // so move it to pending_async ("we'll let you know when it's
        // done") rather than leaving the user on "Connecting…" forever.
        // The reconcile loop above skips pending_async, so we won't
        // immediately re-open and loop on the same error.
        markPendingAsync(v.id);
      }
    });

  // Returns nothing — the panel renders the validations list.
  return null;
};
