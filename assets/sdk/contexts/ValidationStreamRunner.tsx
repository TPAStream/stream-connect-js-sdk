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

  useEffect(() => {
    // Open a subscription for any validation we don't already have one
    // for. pending_async is treated as terminal-for-subscription-purposes
    // (the SSE stream is gone; the user will see the final state on the
    // next session) so we don't re-open subscriptions to it.
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
    return () => {
      for (const unsub of subscriptions.current.values()) {
        unsub();
      }
      subscriptions.current.clear();
    };
  }, []);

  const openStream = (validation: ActiveValidation) =>
    subscribeToProgress({
      taskId: validation.taskId,
      taskToken: validation.taskToken,
      onState: (data) => {
        applyStateUpdate(validation.id, data);
        if (
          data.state === 'SUCCESS' ||
          data.state === 'TWO_FACTOR_AUTH_COMPLETE'
        ) {
          // Refresh PH to capture the final login_problem state. The
          // panel renders the right copy from there. We don't need to
          // pass anything back to the orchestrator — the panel reads
          // straight off the validation's state.
          getPolicyHolder({
            policyHolderId: validation.policyHolderId,
            email,
            employerId
          })
            .then((ph) => {
              const valid = ph.loginProblemIsValid();
              applyStateUpdate(validation.taskId, {
                state: valid ? 'SUCCESS' : 'FAILURE',
                credentials_are_valid: valid,
                message: valid
                  ? undefined
                  : (ph.login_correction_message ?? undefined)
              });
              // Mark this validation's terminal state as
              // refresh-confirmed so the panel's auto-dismiss timer
              // can fire. Without this, an SSE-only SUCCESS would
              // dismiss in 4s even if the PH refresh later flipped to
              // failure, hiding a real bad-creds outcome from the user.
              markTerminalConfirmed(validation.taskId);
              // Fire the legacy terminal callback. doneEasyEnroll was
              // the 0.7-era "the credential submit + validation is
              // done" hook; without this, customers relying on it
              // would silently stop receiving terminal events under
              // the default non-blocking flow.
              onTerminal?.({
                policyHolderId: validation.policyHolderId,
                payerId: validation.payer.id,
                payer: validation.payer,
                credentialsValid: valid,
                loginProblem: ph.login_problem ?? null,
                loginCorrectionMessage: ph.login_correction_message ?? null
              });
            })
            .catch(() => {
              // PH refresh failed. The wire-level
              // `credentials_are_valid` (lifted from the SSE payload
              // by `stateFromTaskMeta`) is the authoritative
              // pre-refresh signal — preserve it on the terminal
              // callback rather than always reporting success.
              // Otherwise a transient refresh failure tells the host
              // page via doneEasyEnroll that the credential succeeded
              // while the SDK UI is showing failure (the apply_state
              // reducer already used the wire value to set the
              // failure UI state).
              const wireValid = data.credentials_are_valid !== false;
              // Confirm terminal state on the catch path too: we've
              // exhausted the refresh attempt and the wire-level
              // signal is now the authoritative result. The panel can
              // safely auto-dismiss a `success` card from here.
              markTerminalConfirmed(validation.taskId);
              onTerminal?.({
                policyHolderId: validation.policyHolderId,
                payerId: validation.payer.id,
                payer: validation.payer,
                credentialsValid: wireValid,
                loginProblem: null,
                loginCorrectionMessage: wireValid
                  ? null
                  : (data.message ?? null)
              });
            });
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
      },
      onTimeout: () => {
        // Move to pending_async — backend timeout for the SSE stream
        // (10 min). The task may still complete later but we won't
        // know until the user reopens the page. Use the dedicated
        // action rather than dispatching a wire state, because the
        // wire vocabulary doesn't have a "still pending after the
        // SSE stream closed" value (the stream just times out).
        markPendingAsync(validation.id);
      },
      onError: () => {
        // SSE fetch failed or the stream broke partway through. We
        // don't know if the validation will still complete server-side,
        // so move it to pending_async ("we'll let you know when it's
        // done") rather than leaving the user on "Connecting…" forever.
        // The reconcile loop above skips pending_async, so we won't
        // immediately re-open and loop on the same error.
        markPendingAsync(validation.id);
      }
    });

  // Returns nothing — the panel renders the validations list.
  return null;
};
