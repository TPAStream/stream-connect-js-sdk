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
 * step state. Multiple validations can run in parallel — one per
 * (PolicyHolder, taskId) pair. The orchestrator adds a validation
 * after each successful credential submit and the floating panel
 * + 2FA modal render directly off this context.
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
  | { type: 'remove'; taskId: string }
  | { type: 'reset' };

const initial: State = { validations: [] };

const stateFromWire = (
  data: ValidateCredsResponse
): { state: ValidationUxState; endMessage?: string | null } => {
  switch (data.state) {
    case 'WAITING_FOR_METHOD_CHOICE':
      return { state: 'method_choice' };
    case 'WAITING_FOR_TWO_FACTOR_CODE':
      return { state: 'awaiting_code' };
    case 'SUCCESS':
    case 'TWO_FACTOR_AUTH_COMPLETE':
      return { state: 'success' };
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
                endMessage: next.endMessage ?? v.endMessage
              }
            : v
        )
      };
    }
    case 'mark_submitting':
      return {
        validations: state.validations.map((v) =>
          v.id === action.taskId ? { ...v, state: 'submitting' } : v
        )
      };
    case 'mark_pending_async':
      return {
        validations: state.validations.map((v) =>
          v.id === action.taskId ? { ...v, state: 'pending_async' } : v
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
