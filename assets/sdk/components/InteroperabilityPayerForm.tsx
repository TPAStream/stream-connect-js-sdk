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
          // A SUCCESS without ph_id is a backend protocol error: the
          // PAA flow finished but the response didn't tell us which PH
          // got created. Without this guard, validateCreds would be
          // called with interopPhId=undefined, fall through to the
          // standard inline-credentials path, and POST an empty
          // params={} as a regular credential submit. Surface the
          // misconfiguration instead.
          if (!data.ph_id) {
            const message =
              'The carrier connection succeeded but we did not receive ' +
              'the policy-holder ID needed to continue. Please contact ' +
              'support.';
            setErrorMessage(message);
            handlePostError({ errorMessage: message });
            return;
          }
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
          // Open without `noopener` in the windowFeatures string: per
          // the HTML spec, `noopener` (and `noreferrer`, which implies
          // it) cause window.open to return null even on success, so
          // we'd lose the ability to distinguish "popup blocked" from
          // "popup opened." Instead, open normally and null out
          // `popup.opener` immediately, which yields equivalent
          // security (the carrier OAuth page can't navigate the host
          // site via window.opener). The awaited beginInterop above
          // can break the user-gesture chain on stricter browsers,
          // making popup-blocking likely; the null-check below surfaces
          // it as a recoverable error instead of silently starting the
          // poll loop against an OAuth tab the user never saw.
          const popup = window.open(
            streamPayer.interoperability_authorization_url,
            '_blank'
          );
          if (!popup) {
            setConnecting(false);
            setErrorMessage(
              'Your browser blocked the carrier sign-in window. ' +
                'Please allow popups for this site and try again.'
            );
            return;
          }
          // Manual opener strip, equivalent to the `noopener`
          // windowFeature but without breaking the return value.
          // `noreferrer` is not replicated; the carrier OAuth page will
          // see a Referer header from the host site, which is fine for
          // standard OAuth flows.
          popup.opener = null;
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

        {/*
          Keyboard-accessible Terms-of-Use trigger. The inline link
          inside the checkbox label below is tabIndex={-1} to keep the
          checkbox → checkbox → submit flow smooth; this button gives
          keyboard-only users a focusable way to open the terms before
          consenting.
        */}
        <button
          type="button"
          onClick={() =>
            handleTermsClick({ tenantAccept, tpastreamTermsAccept })
          }
          className="tpa-self-start tpa-text-sm tpa-text-primary-600 tpa-underline focus-visible:tpa-outline-none focus-visible:tpa-ring-2 focus-visible:tpa-ring-primary-500 focus-visible:tpa-rounded"
        >
          View Terms of Use
        </button>

        <Checkbox
          checked={tpastreamTermsAccept}
          onChange={(e) => setTpastreamTermsAccept(e.target.checked)}
          // Plain text label; the dedicated "View Terms of Use"
          // button rendered above handles the modal trigger. A nested
          // `<button>` inside the `<label>` produced by Checkbox is
          // invalid interactive-content nesting and causes inconsistent
          // mouse / AT activation (clicking the button can also toggle
          // the checkbox depending on the browser).
          label="I have read and agree to the Terms of Use."
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
