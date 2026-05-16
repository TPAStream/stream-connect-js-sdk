import { type FormEvent, useEffect, useRef, useState } from 'react';
import { beginInterop, getInteropState } from '../services/requests';
import type { StreamPayer, StreamTenant } from '../types';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Stack } from '../ui/Stack';
import { Text, Title } from '../ui/Title';

interface InteroperabilityPayerFormProps {
  streamPayer: StreamPayer;
  streamTenant: StreamTenant;
  tenantTerms: string | null;
  email: string;
  enablePatientAccessAPISinglePage?: boolean;
  /** Saved checkbox state to re-hydrate from after a Terms round trip
   * (this form unmounts while the TermsOfUse screen is shown). */
  initialTenantAccept?: boolean;
  initialTpastreamTermsAccept?: boolean;
  /** Called when the user clicks "Terms of Use" — receives the current
   * accept state so the orchestrator can stash it for re-hydration. */
  handleTermsClick: (currentState: {
    tenantAccept: boolean;
    tpastreamTermsAccept: boolean;
  }) => void;
  validateCreds: (args: {
    params: Record<string, unknown>;
    errorCallBack: (data: { errorMessage?: string }) => void;
    interopPhId?: number;
  }) => void;
  handlePostError: (args: { errorMessage: string }) => void;
}

export const InteroperabilityPayerForm = (
  props: InteroperabilityPayerFormProps
) => {
  const {
    streamPayer,
    streamTenant,
    tenantTerms,
    email,
    enablePatientAccessAPISinglePage,
    initialTenantAccept,
    initialTpastreamTermsAccept,
    handleTermsClick,
    validateCreds,
    handlePostError
  } = props;

  const [tenantAccept, setTenantAccept] = useState(!!initialTenantAccept);
  const [tpastreamTermsAccept, setTpastreamTermsAccept] = useState(
    !!initialTpastreamTermsAccept
  );
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const checkDone = () => {
    getInteropState({ email })
      .then((data) => {
        if (data.status === 'SUCCESS') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setConnecting(false);
          validateCreds({
            params: {},
            errorCallBack: () => {},
            interopPhId: data.ph_id
          });
        } else if (data.status === 'FAILURE') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setConnecting(false);
          const message = data.error || 'Connection failed';
          setErrorMessage(message);
          handlePostError({ errorMessage: message });
        } else if (data.status === 'IN_PROGRESS') {
          // keep polling
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          const message = 'Unknown state of interop flow';
          setConnecting(false);
          setErrorMessage(message);
          handlePostError({ errorMessage: message });
        }
      })
      .catch((error) => {
        // Polling failed (network/auth/server error). Stop the
        // interval and surface a recoverable error rather than
        // leaving the user spinning on "connecting" while unhandled
        // promise rejections accumulate in the console.
        if (intervalRef.current) clearInterval(intervalRef.current);
        setConnecting(false);
        const message =
          error?.response?.data?.message ||
          'Connection check failed. Please try again.';
        setErrorMessage(message);
        handlePostError({ errorMessage: message });
      });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConnecting(true);
    setErrorMessage(null);
    try {
      await beginInterop({ email });
      if (enablePatientAccessAPISinglePage) {
        if (streamPayer.interoperability_authorization_url) {
          window.location.replace(
            streamPayer.interoperability_authorization_url
          );
        } else {
          // No auth URL means the payer's PAA config is incomplete on
          // the backend side. Without surfacing this the form stays in
          // "connecting" forever with no error and no way to retry.
          setConnecting(false);
          setErrorMessage(
            "This carrier's connection is misconfigured. Please contact your administrator."
          );
        }
      } else {
        if (streamPayer.interoperability_authorization_url) {
          // noopener+noreferrer so the carrier OAuth page can't reach
          // back through window.opener to navigate the host site.
          window.open(
            streamPayer.interoperability_authorization_url,
            '_blank',
            'noopener,noreferrer'
          );
          intervalRef.current = setInterval(checkDone, 5000);
        } else {
          // Same as the single-page branch — without an auth URL the
          // user can't be redirected to the carrier and the poll loop
          // below would tick forever against nothing.
          setConnecting(false);
          setErrorMessage(
            "This carrier's connection is misconfigured. Please contact your administrator."
          );
        }
      }
    } catch (error: unknown) {
      const e = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      const message =
        e?.response?.data?.error ||
        e?.message ||
        'Something went wrong. Please try again.';
      setConnecting(false);
      setErrorMessage(message);
    }
  };

  return (
    <form onSubmit={onSubmit} id="easy-enroll-form">
      <Stack gap="md">
        <Stack gap="xs">
          <Title order={2}>Connect to {streamPayer.name}</Title>
          {streamPayer.redirect_vendor_name && (
            <Text color="muted" size="sm">
              Powered by {streamPayer.redirect_vendor_name}
            </Text>
          )}
        </Stack>

        {errorMessage && (
          <Alert variant="danger" title="Carrier responded">
            {errorMessage}
          </Alert>
        )}

        <Text>
          The security of your information is very important to us. You'll be
          redirected to securely sign in on{' '}
          {streamPayer.website_home_url_netloc}'s website and connect to TPA
          Stream. This verifies that it's OK to share your information with us
          to process your claims.
        </Text>

        <Checkbox
          checked={tpastreamTermsAccept}
          onChange={(e) => setTpastreamTermsAccept(e.target.checked)}
          label={
            <>
              I have read and agree to the{' '}
              <button
                type="button"
                // Skip in tab order so Tab cycles directly from the
                // checkbox to the next form control. Mouse click still
                // opens the terms overlay.
                tabIndex={-1}
                onClick={() =>
                  handleTermsClick({
                    tenantAccept,
                    tpastreamTermsAccept
                  })
                }
                className="tpa-text-primary-600 tpa-underline"
              >
                Terms of Use
              </button>
            </>
          }
        />

        <Checkbox
          checked={tenantAccept}
          onChange={(e) => setTenantAccept(e.target.checked)}
          label={
            <>
              I have read and agree to the above Terms of Use for{' '}
              <strong>{streamTenant.name}</strong> and acknowledge that my
              claims will be automatically sent to{' '}
              <strong>{streamTenant.name}</strong>.
            </>
          }
        />

        {tenantTerms && (
          <div className="tpa-text-xs tpa-text-slate-500 tpa-bg-slate-50 tpa-rounded-md tpa-p-3">
            {tenantTerms}
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={connecting}
          disabled={connecting || !(tenantAccept && tpastreamTermsAccept)}
        >
          Connect to {streamPayer.name}
        </Button>
      </Stack>
    </form>
  );
};
