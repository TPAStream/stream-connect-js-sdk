import { useEffect } from 'react';
import type {
  StreamEmployer,
  StreamPayer,
  StreamPolicyHolder,
  StreamTenant,
  StreamUser
} from '../types';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';
import { Text, Title } from '../ui/Title';

interface FinishedEasyEnrollProps {
  tenant: StreamTenant;
  payer: StreamPayer | null;
  user: StreamUser;
  policyHolder: StreamPolicyHolder | null;
  employer: StreamEmployer;
  credentialsValid: boolean | null;
  pending: boolean | null;
  endingMessage: string | null;
  returnToPage: () => void;
  doneEasyEnroll?: (data: unknown) => void;
}

export const FinishedEasyEnroll = (props: FinishedEasyEnrollProps) => {
  const {
    credentialsValid,
    tenant,
    returnToPage,
    endingMessage,
    pending,
    payer,
    employer
  } = props;

  useEffect(() => {
    props.doneEasyEnroll?.(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pending) {
    return (
      <Card>
        <Stack gap="md">
          <Title order={2}>Pending</Title>
          {endingMessage && <Text>{endingMessage}</Text>}
          <Text color="muted">
            Once we finish validation, your claims will automatically be
            submitted to {tenant.name} shortly after they appear on the carrier
            website.
          </Text>
          <Text color="muted" size="sm">
            Depending on your carrier, not all dependent claims may be submitted
            in all cases. To ensure claims are submitted for all individuals
            covered under a plan, you must add their accounts as well.
          </Text>
          <Button onClick={returnToPage} fullWidth>
            Add additional logins
          </Button>
        </Stack>
      </Card>
    );
  }

  if (credentialsValid) {
    return (
      <Card>
        <Stack gap="md">
          <Alert variant="success" title="Success!" />
          <Text>
            Your claims will now automatically be submitted to {tenant.name}{' '}
            shortly after they appear on the carrier website.
          </Text>
          <Text color="muted" size="sm">
            Depending on your carrier, not all dependent claims may be submitted
            in all cases. To ensure claims are submitted for all individuals
            covered under a plan, you must add their accounts as well.
          </Text>
          <Button onClick={returnToPage} fullWidth>
            Add additional logins
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Card>
      <Stack gap="md">
        <Alert variant="danger" title="Invalid credentials">
          {endingMessage}
        </Alert>
        <div>
          <Title order={4}>Why am I here?</Title>
          <Text size="sm" color="muted">
            Enrolling with {tenant.name} links your insurance account so you
            don't have to manually submit your EOBs. After a one-time set up,
            all of your EOBs will be automatically submitted to {tenant.name}{' '}
            for processing.
          </Text>
        </div>
        <div>
          <Title order={4}>I think these credentials are valid.</Title>
          <Text size="sm" color="muted">
            <a href={`mailto:${employer.support_email_derived}`}>Email us</a>{' '}
            and we'll help.
          </Text>
        </div>
        {payer && (
          <div>
            <Title order={4}>I don't know my username or password.</Title>
            <Text size="sm" color="muted">
              You can update your{' '}
              <a target="_blank" href={payer.register_url} rel="noreferrer">
                {payer.name} account here
              </a>
              .
            </Text>
          </div>
        )}
        <Button variant="secondary" onClick={returnToPage} fullWidth>
          Let me try again
        </Button>
      </Stack>
    </Card>
  );
};
