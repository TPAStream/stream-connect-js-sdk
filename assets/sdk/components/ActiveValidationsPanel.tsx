import { useEffect } from 'react';
import {
  type ActiveValidation,
  useActiveValidations
} from '../contexts/ActiveValidationsContext';
import { CheckCircleIcon, SpinnerIcon } from '../icons';

/**
 * Floating panel pinned to the top-right of the SDK root. Shows one
 * card per in-flight validation as status-only chips: success cards
 * auto-dismiss after a short hold, failures stay until the user clicks
 * them away. 2FA is handled inline in the hero element, not via this
 * panel.
 *
 * Rendered alongside the wizard step state so the user can keep adding
 * carriers / fixing other credentials while background validations run.
 */

const SUCCESS_DISMISS_MS = 4000;

const stateLabel = (s: ActiveValidation['state']): string => {
  switch (s) {
    case 'pending':
      return 'Connecting…';
    case 'method_choice':
      return 'Choose a verification method';
    case 'awaiting_code':
      return 'Enter your verification code';
    case 'submitting':
      return 'Working on it…';
    case 'success':
      return 'Connected';
    case 'failure':
      return "Couldn't connect";
    case 'pending_async':
      return "Still working — we'll keep going";
  }
};

const ValidationCard = ({
  v,
  onDismiss
}: {
  v: ActiveValidation;
  onDismiss: () => void;
}) => {
  const tone =
    v.state === 'success'
      ? 'tpa-bg-emerald-50 tpa-border-emerald-200'
      : v.state === 'failure'
        ? 'tpa-bg-red-50 tpa-border-red-200'
        : v.state === 'method_choice' || v.state === 'awaiting_code'
          ? 'tpa-bg-primary-50 tpa-border-primary-200 tpa-animate-pulse'
          : 'tpa-bg-white tpa-border-slate-200';

  return (
    <div
      className={`tpa-rounded-lg tpa-border tpa-shadow-card tpa-p-3 tpa-flex tpa-items-center tpa-gap-2 ${tone}`}
    >
      <div className="tpa-flex tpa-items-center tpa-gap-3 tpa-min-w-0 tpa-flex-1">
        {v.payer.logo_url && (
          <img
            src={v.payer.logo_url}
            alt=""
            className="tpa-max-h-7 tpa-max-w-[64px] tpa-object-contain tpa-flex-shrink-0"
          />
        )}
        <div className="tpa-min-w-0 tpa-flex-1 tpa-text-left">
          <div className="tpa-text-sm tpa-font-medium tpa-text-slate-900 tpa-truncate">
            {v.payer.name}
          </div>
          <div className="tpa-text-xs tpa-text-slate-600 tpa-truncate">
            {stateLabel(v.state)}
          </div>
        </div>
        {(v.state === 'pending' || v.state === 'submitting') && (
          <SpinnerIcon className="tpa-w-4 tpa-h-4 tpa-text-primary-600" />
        )}
        {v.state === 'success' && (
          <CheckCircleIcon className="tpa-w-5 tpa-h-5 tpa-text-emerald-600" />
        )}
      </div>
      {v.state === 'failure' && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="tpa-text-slate-400 hover:tpa-text-slate-600 tpa-text-lg tpa-leading-none tpa-px-1"
        >
          ×
        </button>
      )}
    </div>
  );
};

/**
 * Floating breadcrumb pinned top-right. Shows in-flight validations
 * as a status-only display — interaction (method picker, code entry)
 * lives inline in the hero card on FixCredentials/ChoosePayer, so the
 * panel intentionally does NOT open a modal. This keeps the user
 * from being prompted in two places at once.
 */
export const ActiveValidationsPanel = () => {
  const { validations, remove } = useActiveValidations();

  // Auto-dismiss successes after a hold.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const v of validations) {
      if (v.state === 'success') {
        timers.push(setTimeout(() => remove(v.taskId), SUCCESS_DISMISS_MS));
      }
    }
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [validations, remove]);

  if (validations.length === 0) return null;

  return (
    <div
      className="tpa-fixed tpa-top-4 tpa-right-4 tpa-z-40 tpa-flex tpa-flex-col tpa-gap-2 tpa-w-72"
      aria-live="polite"
    >
      {validations.map((v) => (
        <ValidationCard key={v.id} v={v} onDismiss={() => remove(v.taskId)} />
      ))}
    </div>
  );
};
