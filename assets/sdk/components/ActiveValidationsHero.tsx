import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  type ActiveValidation,
  useActiveValidations
} from '../contexts/ActiveValidationsContext';
import { CheckCircleIcon, SpinnerIcon } from '../icons';
import { putTask } from '../services/requests';
import { Button } from '../ui/Button';
import { Combobox, type ComboboxItem } from '../ui/Combobox';
import { Stack } from '../ui/Stack';
import { TextInput } from '../ui/TextInput';
import { Text, Title } from '../ui/Title';

/**
 * In-page hero banner that surfaces in-flight validations as the
 * dominant content the user sees after submitting credentials. Mounted
 * once at the SDK root so the prompts remain actionable on every step
 * (choose-payer, fix-credentials, credentials form, end widget). The
 * corner ActiveValidationsPanel is for quick-scan visibility once the
 * user navigates elsewhere; this hero is for the "I just submitted,
 * what now?" moment, no matter which step they're on.
 *
 * Renders nothing when there are no active validations, so every step
 * keeps its original layout for first-time users.
 */

const stateCopy = (
  s: ActiveValidation['state']
): { headline: string; sub: string; tone: HeroTone } => {
  switch (s) {
    case 'pending':
      return {
        headline: 'Connecting…',
        sub: 'Hang tight, this usually takes under a minute.',
        tone: 'info'
      };
    case 'method_choice':
      return {
        headline: "Verify it's you",
        sub: "Pick where you'd like the carrier to send a verification code.",
        tone: 'attention'
      };
    case 'awaiting_code':
      return {
        headline: 'Enter your code',
        sub: 'Check the device or inbox the carrier just sent the code to.',
        tone: 'attention'
      };
    case 'submitting':
      return {
        headline: 'Working on it…',
        sub: 'Submitting your response.',
        tone: 'info'
      };
    case 'success':
      return {
        headline: 'Connected!',
        sub: 'Your claims will start flowing in shortly.',
        tone: 'success'
      };
    case 'failure':
      return {
        headline: "Couldn't connect",
        sub: 'There was a problem reaching this carrier.',
        tone: 'danger'
      };
    case 'pending_async':
      return {
        headline: 'Still working on it',
        sub: "This is taking longer than usual. We'll keep trying.",
        tone: 'info'
      };
  }
};

type HeroTone = 'info' | 'attention' | 'success' | 'danger';

const toneClasses: Record<HeroTone, { card: string; icon: string }> = {
  info: {
    card: 'tpa-bg-white tpa-border-slate-200',
    icon: 'tpa-text-primary-600'
  },
  attention: {
    card: 'tpa-bg-primary-50 tpa-border-primary-300',
    icon: 'tpa-text-primary-600'
  },
  success: {
    card: 'tpa-bg-emerald-50 tpa-border-emerald-200',
    icon: 'tpa-text-emerald-600'
  },
  danger: {
    card: 'tpa-bg-red-50 tpa-border-red-200',
    icon: 'tpa-text-red-600'
  }
};

const InlineMethodPicker = ({
  validation
}: { validation: ActiveValidation }) => {
  const { markSubmitting, markSubmitError } = useActiveValidations();
  const [picked, setPicked] = useState<ComboboxItem | null>(null);
  const methods = validation.twoFactorAuthData?.info?.method_list || [];
  const items: ComboboxItem[] = methods.map((m) => ({ value: m, label: m }));

  const submit = (chosen: ComboboxItem | null) => {
    if (!chosen) return;
    setPicked(chosen);
    markSubmitting(validation.taskId);
    // On success the next SSE event advances the validation state.
    // On failure we revert from submitting back to method_choice and
    // surface the error inline — otherwise the card would say
    // "Working on it…" forever with no way for the user to retry.
    putTask({
      taskId: validation.taskId,
      policyHolderId: validation.policyHolderId,
      params: { user_email: validation.email, method: chosen.value }
    }).catch((err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Couldn't reach the carrier. Please try again.";
      markSubmitError(validation.taskId, message);
      setPicked(null);
    });
  };

  return (
    <Combobox
      items={items}
      value={picked}
      onChange={submit}
      label="Verification method"
      placeholder="Send a code to…"
    />
  );
};

const InlineCodeEntry = ({ validation }: { validation: ActiveValidation }) => {
  const { markSubmitting, markSubmitError } = useActiveValidations();
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus the code input on mount, but only if the user has nothing
  // else focused. The hero is SDK-root-mounted and can transition into
  // awaiting_code while the user is typing in an unrelated form on the
  // host page (or even in another SDK form, like the EnterCredentials
  // step on a different in-flight validation). A bare `autoFocus`
  // attribute steals that focus unconditionally — verified in 0.7.x.
  // Checking document.activeElement gives us the common-case ergonomic
  // (user just hit submit on the method picker, nothing else is
  // focused, the code input gets focus naturally) without the
  // focus-stealing footgun.
  useEffect(() => {
    if (!inputRef.current) return;
    const active = document.activeElement;
    if (active && active !== document.body && active.tagName !== 'HTML') {
      return;
    }
    inputRef.current.focus();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    markSubmitting(validation.taskId);
    putTask({
      taskId: validation.taskId,
      policyHolderId: validation.policyHolderId,
      params: { user_email: validation.email, code: code.trim() }
    }).catch((err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Couldn't reach the carrier. Please try again.";
      markSubmitError(validation.taskId, message);
    });
  };

  return (
    <form
      onSubmit={submit}
      // flex-wrap so the Continue button drops below the input on
      // narrow widths (the SDK is embedded as a widget; a host page
      // sidebar at 280-320px would otherwise force the button to
      // squash to a single character per line). At >sm breakpoints
      // the row stays inline.
      className="tpa-flex tpa-flex-wrap tpa-gap-2 tpa-items-end"
    >
      <div className="tpa-flex-1 tpa-min-w-[160px]">
        <TextInput
          ref={inputRef}
          label="Verification code"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      </div>
      <Button type="submit" disabled={!code.trim()} size="lg">
        Continue
      </Button>
    </form>
  );
};

const ValidationHeroCard = ({
  validation
}: { validation: ActiveValidation }) => {
  const copy = stateCopy(validation.state);
  const tone = toneClasses[copy.tone];

  return (
    <div
      className={`tpa-rounded-lg tpa-border-2 tpa-shadow-card tpa-p-5 ${tone.card}`}
    >
      <div className="tpa-flex tpa-items-center tpa-gap-4">
        {validation.payer.logo_url && (
          // Decorative: the payer name is rendered as text immediately
          // below this image. An informative alt would announce the
          // carrier name twice to screen readers. Same shape as the
          // floating ActiveValidationsPanel.
          <img
            src={validation.payer.logo_url}
            alt=""
            className="tpa-max-h-10 tpa-max-w-[120px] tpa-object-contain tpa-flex-shrink-0"
          />
        )}
        <div className="tpa-flex-1 tpa-min-w-0">
          <Text size="xs" color="muted">
            {validation.payer.name}
          </Text>
          <div className="tpa-flex tpa-items-center tpa-gap-2 tpa-mt-0.5">
            <Title order={3}>{copy.headline}</Title>
            {(validation.state === 'pending' ||
              validation.state === 'submitting') && (
              <SpinnerIcon className={`tpa-w-5 tpa-h-5 ${tone.icon}`} />
            )}
            {validation.state === 'success' && (
              <CheckCircleIcon className={`tpa-w-6 tpa-h-6 ${tone.icon}`} />
            )}
          </div>
          <Text size="sm" color="muted" className="tpa-mt-1">
            {copy.sub}
          </Text>
          {validation.endMessage &&
            (validation.state === 'failure' ||
              validation.state === 'method_choice' ||
              validation.state === 'awaiting_code') && (
              // failure shows it as the terminal error reason; the 2FA
              // states show it as a carrier-rejection retry hint above
              // the method picker / code input (e.g. "Wrong code, try
              // again"). Keeping the same red styling because both are
              // "something failed and you should react" copy.
              <Text
                size="sm"
                className="tpa-mt-2 tpa-text-red-700 tpa-font-medium"
              >
                {validation.endMessage}
              </Text>
            )}
          {validation.submitError && (
            <Text
              size="sm"
              className="tpa-mt-2 tpa-text-red-700 tpa-font-medium"
            >
              {validation.submitError}
            </Text>
          )}
        </div>
      </div>

      {/* Inline interaction: keep all action in-place, no modal hop. */}
      {validation.state === 'method_choice' && (
        <div className="tpa-mt-4">
          <InlineMethodPicker validation={validation} />
        </div>
      )}
      {validation.state === 'awaiting_code' && (
        <div className="tpa-mt-4">
          <InlineCodeEntry validation={validation} />
        </div>
      )}
    </div>
  );
};

export const ActiveValidationsHero = () => {
  const { validations } = useActiveValidations();
  if (validations.length === 0) return null;
  return (
    <Stack gap="sm">
      {validations.map((validation) => (
        <ValidationHeroCard key={validation.id} validation={validation} />
      ))}
    </Stack>
  );
};
