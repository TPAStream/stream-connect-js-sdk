import { useEffect, useRef } from 'react';
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
  validation,
  onDismiss
}: {
  validation: ActiveValidation;
  onDismiss: () => void;
}) => {
  const tone =
    validation.state === 'success'
      ? 'tpa-bg-emerald-50 tpa-border-emerald-200'
      : validation.state === 'failure'
        ? 'tpa-bg-red-50 tpa-border-red-200'
        : validation.state === 'method_choice' ||
            validation.state === 'awaiting_code'
          ? 'tpa-bg-primary-50 tpa-border-primary-200 tpa-animate-pulse'
          : 'tpa-bg-white tpa-border-slate-200';

  return (
    <div
      className={`tpa-rounded-lg tpa-border tpa-shadow-card tpa-p-3 tpa-flex tpa-items-center tpa-gap-2 ${tone}`}
    >
      <div className="tpa-flex tpa-items-center tpa-gap-3 tpa-min-w-0 tpa-flex-1">
        {validation.payer.logo_url && (
          <img
            src={validation.payer.logo_url}
            alt=""
            className="tpa-max-h-7 tpa-max-w-[64px] tpa-object-contain tpa-flex-shrink-0"
          />
        )}
        <div className="tpa-min-w-0 tpa-flex-1 tpa-text-left">
          <div className="tpa-text-sm tpa-font-medium tpa-text-slate-900 tpa-truncate">
            {validation.payer.name}
          </div>
          <div className="tpa-text-xs tpa-text-slate-600 tpa-truncate">
            {stateLabel(validation.state)}
          </div>
        </div>
        {(validation.state === 'pending' ||
          validation.state === 'submitting') && (
          <SpinnerIcon className="tpa-w-4 tpa-h-4 tpa-text-primary-600" />
        )}
        {validation.state === 'success' && (
          <CheckCircleIcon className="tpa-w-5 tpa-h-5 tpa-text-emerald-600" />
        )}
      </div>
      {validation.state === 'failure' && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss ${validation.payer.name} validation`}
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
 * lives inline in the ActiveValidationsHero, which is mounted at the
 * SDK root so the prompts are always visible on whichever step the
 * user is on. The panel intentionally does NOT open a modal so the
 * user is never prompted in two places at once.
 */
export const ActiveValidationsPanel = () => {
  const { validations, remove } = useActiveValidations();

  // Auto-dismiss successes after a hold. The naive version of this
  // recreates every timer whenever ANY validation changes (e.g. an
  // unrelated card streams a new state update), which keeps resetting
  // the hold on a successful card so it never actually dismisses.
  // Track timers per task ID via a ref and only schedule one on the
  // first transition into 'success'.
  const successTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  useEffect(() => {
    const live = new Set(validations.map((validation) => validation.taskId));
    const timers = successTimersRef.current;
    // Schedule a one-shot dismiss for any success we haven't scheduled
    // yet, but only after the ValidationStreamRunner has confirmed the
    // terminal state via its post-SUCCESS PH refresh (or its catch
    // fallback). Without the `terminalConfirmed` gate, an SSE-only
    // SUCCESS would arm the dismiss timer immediately and a slow PH
    // refresh that later flipped to failure would leave the user with
    // no UI trail of the failure.
    for (const validation of validations) {
      if (
        validation.state === 'success' &&
        validation.terminalConfirmed &&
        !timers.has(validation.taskId)
      ) {
        timers.set(
          validation.taskId,
          setTimeout(() => {
            timers.delete(validation.taskId);
            remove(validation.taskId);
          }, SUCCESS_DISMISS_MS)
        );
      }
    }
    // Cancel timers for validations that left the list or transitioned
    // out of 'success' (rare, but the user might dismiss manually).
    for (const [taskId, t] of timers) {
      const validation = validations.find((x) => x.taskId === taskId);
      if (!validation || validation.state !== 'success' || !live.has(taskId)) {
        clearTimeout(t);
        timers.delete(taskId);
      }
    }
  }, [validations, remove]);

  // Tear down everything on unmount.
  useEffect(() => {
    const timers = successTimersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  if (validations.length === 0) return null;

  // Position absolutely within the SDK root, not fixed to the
  // viewport. The SDK is often embedded as a widget inside a host page
  // (not full-screen) and a viewport-fixed corner would float over
  // unrelated host-page content outside the widget. Anchoring to
  // .tpa-sdk-root (which we set to position: relative in tailwind.css)
  // keeps the panel inside the widget's own corner.
  return (
    <div
      // `max-w-[calc(100%-2rem)]` caps the panel at the SDK root's
      // own width minus the corner margins so a narrow embed
      // container (320-375px mobile viewport) doesn't push the
      // panel past the host page's edge. The `w-72` (288px) is the
      // preferred desktop width.
      className="tpa-absolute tpa-top-4 tpa-right-4 tpa-z-40 tpa-flex tpa-flex-col tpa-gap-2 tpa-w-72 tpa-max-w-[calc(100%-2rem)]"
      aria-live="polite"
    >
      {validations.map((validation) => (
        <ValidationCard
          key={validation.id}
          validation={validation}
          onDismiss={() => remove(validation.taskId)}
        />
      ))}
    </div>
  );
};
