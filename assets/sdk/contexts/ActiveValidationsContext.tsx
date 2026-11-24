import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer
} from 'react';
import type { ValidateCredsResponse } from '../types';
import {
  type ActiveValidation,
  initial,
  reducer
} from './activeValidationsReducer';

export type {
  ActiveValidation,
  ValidationUxState
} from './activeValidationsReducer';

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
 * The entry shape, the UX state vocabulary and the reducer live in
 * activeValidationsReducer.ts.
 */

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
