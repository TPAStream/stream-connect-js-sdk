import { useEffect } from 'react';
import { useActiveValidations } from '../contexts/ActiveValidationsContext';
import type {
  StreamPayer,
  StreamPolicyHolderShort,
  StreamUser
} from '../types';
import { BackButton } from '../ui/BackButton';
import { Stack } from '../ui/Stack';
import { Text, Title } from '../ui/Title';
import { ActiveValidationsHero } from './ActiveValidationsHero';
import { FixPayerImages } from './PayerImages';

interface FixCredentialsProps {
  streamUser: StreamUser;
  streamPayers: StreamPayer[];
  choosePolicyHolder: (args: {
    policyHolder?: StreamPolicyHolderShort;
    payer?: StreamPayer;
    dependent?: boolean;
  }) => void;
  returnSelectEnrollProcess?: false | (() => void);
  doneStep2?: (props?: unknown) => void;
}

export const FixCredentials = (props: FixCredentialsProps) => {
  useEffect(() => {
    props.doneStep2?.(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { returnSelectEnrollProcess, streamUser, streamPayers } = props;
  const { validations } = useActiveValidations();
  const allPhs = streamUser.policy_holders || [];
  const hasValidations = validations.length > 0;

  // "Recently added" = anything created in the last 7 days. The cutoff
  // is intentionally generous: the section's purpose is to surface
  // "stuff the user just added or just touched" without making them
  // hunt through a long list, so a day or two would miss the common
  // "I came back tomorrow to check" case.
  const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const recentCutoff = Date.now() - RECENT_WINDOW_MS;
  const { recent, rest } = (() => {
    const r: typeof allPhs = [];
    const o: typeof allPhs = [];
    for (const ph of allPhs) {
      const created = ph.createddate ? Date.parse(ph.createddate) : 0;
      if (created >= recentCutoff) r.push(ph);
      else o.push(ph);
    }
    return { recent: r, rest: o };
  })();

  return (
    <Stack gap="lg">
      {returnSelectEnrollProcess && (
        <BackButton onClick={returnSelectEnrollProcess as () => void} />
      )}
      <ActiveValidationsHero />

      {recent.length > 0 && (
        <Stack gap="sm">
          <Stack gap="xs">
            <Title order={3}>Recently added</Title>
            <Text size="sm" color="muted">
              {hasValidations
                ? "We'll let you know when the connection finishes."
                : 'Carriers you connected in the last week.'}
            </Text>
          </Stack>
          <FixPayerImages
            policyHolders={recent}
            payers={streamPayers}
            choosePolicyHolder={props.choosePolicyHolder}
          />
        </Stack>
      )}

      {/* Suppress the "Your other carriers" / "Your carriers" section
          entirely when there's nothing to render under it AND we're
          not in the empty-state case. Otherwise a customer with only
          recently-added PHs sees a bare heading with no body. */}
      {(rest.length > 0 || allPhs.length === 0) && (
        <Stack gap="sm">
          <Stack gap="xs">
            <Title order={recent.length > 0 ? 3 : 2}>
              {recent.length > 0 ? 'Your other carriers' : 'Your carriers'}
            </Title>
            <Text size="sm" color="muted">
              {rest.length > 0
                ? 'Tap any carrier below to update its sign-in info.'
                : "You haven't connected any carriers yet."}
            </Text>
          </Stack>
          {rest.length > 0 && (
            <FixPayerImages
              policyHolders={rest}
              payers={streamPayers}
              choosePolicyHolder={props.choosePolicyHolder}
            />
          )}
        </Stack>
      )}
    </Stack>
  );
};
