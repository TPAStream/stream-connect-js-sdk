import type { StreamPayer, ValidateCredsResponse } from '../types';

/**
 * The pure state half of ActiveValidationsContext: the entry shape,
 * the wire-to-UX state mapping and the reducer. Kept free of React so
 * `node --test` can exercise it directly
 * (activeValidationsReducer.test.ts).
 *
 * UX state vocabulary (mapped from the celery task-meta wire shape
 * by `applyStateUpdate`):
 *   - pending: task is queued or running, no user action needed
 *   - method_choice: 2FA method picker required
 *   - awaiting_code: 2FA code entry required
 *   - submitting: user submitted method/code, waiting for next state
 *   - success: task completed cleanly
 *   - failure: task ended with a user-actionable error
 *   - pending_async: task is taking too long; will keep running, user
 *     can navigate away
 */

export type ValidationUxState =
  | 'pending'
  | 'method_choice'
  | 'awaiting_code'
  | 'submitting'
  | 'success'
  | 'failure'
  | 'pending_async';

export interface ActiveValidation {
  /** Stable id for this validation entry — uses the celery task id. */
  id: string;
  policyHolderId: number;
  taskId: string;
  taskToken: string;
  payer: Pick<StreamPayer, 'id' | 'name' | 'logo_url'>;
  /** Email is needed for the existing PUT /sdk-api/validate-credentials
   * endpoints when the user submits method/code. */
  email: string;
  state: ValidationUxState;
  /** When state is method_choice or awaiting_code, the raw payload
   * the worker yielded — carries `info.method_list` etc. */
  twoFactorAuthData?: ValidateCredsResponse;
  endMessage?: string | null;
  /** Set when a user-initiated submit (method pick / code entry)
   * failed at the network layer so we can revert from submitting
   * back to the choice/entry state and surface the error inline. */
  submitError?: string | null;
  /** True once the runner's post-SUCCESS policy-holder refresh has
   * resolved (or the catch fallback has confirmed the wire-level
   * `credentials_are_valid`). Used by the panel to gate auto-dismiss
   * on `success` so a card whose `loginProblemIsValid()` later flips
   * to false isn't whisked away as a clean success. Set by
   * `markTerminalConfirmed` from `ValidationStreamRunner`. */
  terminalConfirmed?: boolean;
  startedAt: number;
}

export interface State {
  validations: ActiveValidation[];
}

export type Action =
  | { type: 'add'; validation: ActiveValidation }
  | {
      type: 'apply_state';
      taskId: string;
      data: ValidateCredsResponse;
    }
  | { type: 'mark_submitting'; taskId: string }
  | { type: 'mark_pending_async'; taskId: string }
  | { type: 'mark_submit_error'; taskId: string; message: string }
  | { type: 'mark_terminal_confirmed'; taskId: string }
  | { type: 'remove'; taskId: string }
  | { type: 'reset' };

export const initial: State = { validations: [] };

/** States in which ValidationStreamRunner holds no stream open. */
const ENDED_STATES: ReadonlySet<ValidationUxState> = new Set([
  'success',
  'failure',
  'pending_async'
]);

const stateFromWire = (
  data: ValidateCredsResponse
): { state: ValidationUxState; endMessage?: string | null } => {
  switch (data.state) {
    case 'WAITING_FOR_METHOD_CHOICE':
      // Carrier rejection messages (e.g. "method unavailable") can ride
      // along on a method_choice event. Surface as endMessage so the
      // hero renders it above the picker.
      return { state: 'method_choice', endMessage: data.message };
    case 'WAITING_FOR_TWO_FACTOR_CODE':
      // After the user submits a wrong/expired code, the carrier sends
      // us back to awaiting_code with a rejection message. Surfacing
      // it as endMessage lets the hero render "wrong code, try again"
      // inline above the code input.
      return { state: 'awaiting_code', endMessage: data.message };
    case 'SUCCESS':
    case 'TWO_FACTOR_AUTH_COMPLETE': {
      // The worker can return SUCCESS for "crawl finished" even if the
      // credentials themselves were rejected — credentials_are_valid is
      // the gate that distinguishes "we ran a clean validation" from
      // "we tried and the carrier said no". Treat false explicitly as
      // failure so the hero / panel show the right copy and don't
      // claim success on a soft fail.
      if (data.credentials_are_valid === false) {
        return { state: 'failure', endMessage: data.message };
      }
      return { state: 'success' };
    }
    case 'FAILURE':
      return { state: 'failure', endMessage: data.message };
    default:
      return { state: 'pending' };
  }
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'add': {
      // A member who resubmits the same credentials while the task is
      // still running gets that task's id back from the server, so the
      // id can already be here, mid-2FA. Its stream is still open (the
      // runner keys streams by id) and the server sends a step only
      // when the step changes, so it will not resend the method
      // picker or the code prompt. Replacing the entry would reset it
      // to `pending` and drop the method list, leaving the member on
      // "Connecting…". Keep the live entry's progress instead; take
      // the identity fields (token, email, payer) from the new add.
      //
      // An entry that has ended (success, failure, pending_async) has
      // no open stream, so it is replaced as before: back to the
      // state the caller passed, and the runner opens a new stream.
      const existing = state.validations.find(
        (v) => v.id === action.validation.id
      );
      if (existing && !ENDED_STATES.has(existing.state)) {
        return {
          validations: state.validations.map((v) =>
            v === existing
              ? {
                  ...action.validation,
                  state: existing.state,
                  twoFactorAuthData: existing.twoFactorAuthData,
                  endMessage: existing.endMessage,
                  submitError: existing.submitError,
                  terminalConfirmed: existing.terminalConfirmed,
                  startedAt: existing.startedAt
                }
              : v
          )
        };
      }
      return {
        validations: [
          ...state.validations.filter((v) => v.id !== action.validation.id),
          action.validation
        ]
      };
    }
    case 'apply_state': {
      const next = stateFromWire(action.data);
      return {
        validations: state.validations.map((v) =>
          v.id === action.taskId
            ? {
                ...v,
                state: next.state,
                twoFactorAuthData:
                  next.state === 'method_choice' ||
                  next.state === 'awaiting_code'
                    ? action.data
                    : v.twoFactorAuthData,
                // Replace endMessage with whatever the new state says
                // (which may be undefined). The `??` fallback would
                // leak stale 2FA carrier errors across transitions:
                // e.g. wrong-code msg saved on WAITING_FOR_TWO_FACTOR_CODE
                // would persist through a subsequent PENDING and then a
                // bare FAILURE would render the old retry msg as the
                // terminal failure reason. Replace, don't preserve.
                endMessage: next.endMessage ?? null,
                // Any SSE-driven state transition clears a prior
                // submitError — if the server advanced the validation
                // the user-visible error from a stale submit no longer
                // applies.
                submitError: null
              }
            : v
        )
      };
    }
    case 'mark_submitting':
      return {
        validations: state.validations.map((v) =>
          v.id === action.taskId
            ? // Clear any prior submitError when the user retries —
              // otherwise the hero would render the stale message
              // alongside the new "Working on it…" spinner and persist
              // after a successful retry.
              { ...v, state: 'submitting', submitError: null }
            : v
        )
      };
    case 'mark_pending_async':
      return {
        validations: state.validations.map((v) =>
          v.id === action.taskId
            ? // Clear stale submitError on the transition. A method/code
              // PUT failure followed by a stream timeout would otherwise
              // leave the card showing "Couldn't reach the carrier..."
              // while the hero header says "Still working on it" — the
              // old retry-error no longer describes the current state.
              { ...v, state: 'pending_async', submitError: null }
            : v
        )
      };
    case 'mark_submit_error':
      return {
        validations: state.validations.map((v) => {
          if (v.id !== action.taskId) return v;
          // Revert from submitting back to whichever step the user
          // was on so they can retry. method_list presence tells us
          // the picker step; otherwise assume code-entry. If we have
          // no twoFactorAuthData at all, fall back to pending — the
          // SSE stream will continue advancing the state.
          const hasMethodList =
            !!v.twoFactorAuthData?.info?.method_list?.length;
          const revertTo: ValidationUxState = v.twoFactorAuthData
            ? hasMethodList
              ? 'method_choice'
              : 'awaiting_code'
            : 'pending';
          return { ...v, state: revertTo, submitError: action.message };
        })
      };
    case 'mark_terminal_confirmed':
      return {
        validations: state.validations.map((v) =>
          v.id === action.taskId ? { ...v, terminalConfirmed: true } : v
        )
      };
    case 'remove':
      return {
        validations: state.validations.filter((v) => v.id !== action.taskId)
      };
    case 'reset':
      return initial;
    default:
      return state;
  }
};
