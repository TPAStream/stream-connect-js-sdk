import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer
} from 'react';
import type { StreamPayer, ValidateCredsResponse } from '../types';

/**
 * In-flight credential validation tracking, decoupled from the wizard
 * step state. Multiple validations can run in parallel (one per
 * (PolicyHolder, taskId) pair). The orchestrator adds a validation
 * after each successful credential submit; the floating
 * ActiveValidationsPanel + the inline ActiveValidationsHero (method
 * picker + code entry in the hero card) render directly off this
 * context. There is no modal — 2FA prompts render inline alongside
 * the wizard.
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

interface State {
  validations: ActiveValidation[];
}

type Action =
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

const initial: State = { validations: [] };

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

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'add':
      return {
        validations: [
          ...state.validations.filter((v) => v.id !== action.validation.id),
          action.validation
        ]
      };
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

interface ActiveValidationsContextValue {
  validations: ActiveValidation[];
  addValidation: (v: Omit<ActiveValidation, 'startedAt' | 'id'>) => void;
  applyStateUpdate: (taskId: string, data: ValidateCredsResponse) => void;
  markSubmitting: (taskId: string) => void;
  markPendingAsync: (taskId: string) => void;
  markSubmitError: (taskId: string, message: string) => void;
  markTerminalConfirmed: (taskId: string) => void;
  remove: (taskId: string) => void;
  reset: () => void;
}

const ActiveValidationsContext = createContext<ActiveValidationsContextValue>({
  validations: [],
  addValidation: () => {},
  applyStateUpdate: () => {},
  markSubmitting: () => {},
  markPendingAsync: () => {},
  markSubmitError: () => {},
  markTerminalConfirmed: () => {},
  remove: () => {},
  reset: () => {}
});

interface ProviderProps {
  children: ReactNode;
}

export const ActiveValidationsProvider = ({ children }: ProviderProps) => {
  const [state, dispatch] = useReducer(reducer, initial);

  const addValidation: ActiveValidationsContextValue['addValidation'] =
    useCallback((v) => {
      dispatch({
        type: 'add',
        validation: {
          ...v,
          id: v.taskId,
          startedAt: Date.now()
        }
      });
    }, []);

  const applyStateUpdate = useCallback(
    (taskId: string, data: ValidateCredsResponse) => {
      dispatch({ type: 'apply_state', taskId, data });
    },
    []
  );

  const markSubmitting = useCallback((taskId: string) => {
    dispatch({ type: 'mark_submitting', taskId });
  }, []);

  const markPendingAsync = useCallback((taskId: string) => {
    dispatch({ type: 'mark_pending_async', taskId });
  }, []);

  const markSubmitError = useCallback((taskId: string, message: string) => {
    dispatch({ type: 'mark_submit_error', taskId, message });
  }, []);

  const markTerminalConfirmed = useCallback((taskId: string) => {
    dispatch({ type: 'mark_terminal_confirmed', taskId });
  }, []);

  const remove = useCallback((taskId: string) => {
    dispatch({ type: 'remove', taskId });
  }, []);

  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const value = useMemo(
    () => ({
      validations: state.validations,
      addValidation,
      applyStateUpdate,
      markSubmitting,
      markPendingAsync,
      markSubmitError,
      markTerminalConfirmed,
      remove,
      reset
    }),
    [
      state.validations,
      addValidation,
      applyStateUpdate,
      markSubmitting,
      markPendingAsync,
      markSubmitError,
      markTerminalConfirmed,
      remove,
      reset
    ]
  );

  return (
    <ActiveValidationsContext.Provider value={value}>
      {children}
    </ActiveValidationsContext.Provider>
  );
};

export const useActiveValidations = () => useContext(ActiveValidationsContext);
