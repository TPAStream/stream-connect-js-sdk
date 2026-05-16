import { type FormEvent, useState } from 'react';
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
 * dominant content when the user lands on FixCredentials or ChoosePayer
 * after submitting credentials. Mirrors the corner notification but
 * with full prominence — the corner panel is for quick-scan visibility
 * once the user starts navigating elsewhere; this hero is for the
 * "I just submitted, what now?" moment.
 *
 * Renders nothing when there are no active validations, so the
 * destination pages keep their original layout for first-time users.
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

const InlineMethodPicker = ({ v }: { v: ActiveValidation }) => {
  const { markSubmitting, markSubmitError } = useActiveValidations();
  const [picked, setPicked] = useState<ComboboxItem | null>(null);
  const methods = v.twoFactorAuthData?.info?.method_list || [];
  const items: ComboboxItem[] = methods.map((m) => ({ value: m, label: m }));

  const submit = (chosen: ComboboxItem | null) => {
    if (!chosen) return;
    setPicked(chosen);
    markSubmitting(v.taskId);
    // On success the next SSE event advances the validation state.
    // On failure we revert from submitting back to method_choice and
    // surface the error inline — otherwise the card would say
    // "Working on it…" forever with no way for the user to retry.
    putTask({
      taskId: v.taskId,
      policyHolderId: v.policyHolderId,
      params: { user_email: v.email, method: chosen.value }
    }).catch((err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Couldn't reach the carrier. Please try again.";
      markSubmitError(v.taskId, message);
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

const InlineCodeEntry = ({ v }: { v: ActiveValidation }) => {
  const { markSubmitting, markSubmitError } = useActiveValidations();
  const [code, setCode] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    markSubmitting(v.taskId);
    putTask({
      taskId: v.taskId,
      policyHolderId: v.policyHolderId,
      params: { user_email: v.email, code: code.trim() }
    }).catch((err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Couldn't reach the carrier. Please try again.";
      markSubmitError(v.taskId, message);
    });
  };

  return (
    <form onSubmit={submit} className="tpa-flex tpa-gap-2 tpa-items-end">
      <div className="tpa-flex-1">
        <TextInput
          label="Verification code"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
        />
      </div>
      <Button type="submit" disabled={!code.trim()} size="lg">
        Continue
      </Button>
    </form>
  );
};

const ValidationHeroCard = ({ v }: { v: ActiveValidation }) => {
  const copy = stateCopy(v.state);
  const tone = toneClasses[copy.tone];

  return (
    <div
      className={`tpa-rounded-lg tpa-border-2 tpa-shadow-card tpa-p-5 ${tone.card}`}
    >
      <div className="tpa-flex tpa-items-center tpa-gap-4">
        {v.payer.logo_url && (
          <img
            src={v.payer.logo_url}
            alt={v.payer.name}
            className="tpa-max-h-10 tpa-max-w-[120px] tpa-object-contain tpa-flex-shrink-0"
          />
        )}
        <div className="tpa-flex-1 tpa-min-w-0">
          <Text size="xs" color="muted">
            {v.payer.name}
          </Text>
          <div className="tpa-flex tpa-items-center tpa-gap-2 tpa-mt-0.5">
            <Title order={3}>{copy.headline}</Title>
            {(v.state === 'pending' || v.state === 'submitting') && (
              <SpinnerIcon className={`tpa-w-5 tpa-h-5 ${tone.icon}`} />
            )}
            {v.state === 'success' && (
              <CheckCircleIcon className={`tpa-w-6 tpa-h-6 ${tone.icon}`} />
            )}
          </div>
          <Text size="sm" color="muted" className="tpa-mt-1">
            {copy.sub}
          </Text>
          {v.endMessage && v.state === 'failure' && (
            <Text
              size="sm"
              className="tpa-mt-2 tpa-text-red-700 tpa-font-medium"
            >
              {v.endMessage}
            </Text>
          )}
          {v.submitError && (
            <Text
              size="sm"
              className="tpa-mt-2 tpa-text-red-700 tpa-font-medium"
            >
              {v.submitError}
            </Text>
          )}
        </div>
      </div>

      {/* Inline interaction: keep all action in-place, no modal hop. */}
      {v.state === 'method_choice' && (
        <div className="tpa-mt-4">
          <InlineMethodPicker v={v} />
        </div>
      )}
      {v.state === 'awaiting_code' && (
        <div className="tpa-mt-4">
          <InlineCodeEntry v={v} />
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
      {validations.map((v) => (
        <ValidationHeroCard key={v.id} v={v} />
      ))}
    </Stack>
  );
};
