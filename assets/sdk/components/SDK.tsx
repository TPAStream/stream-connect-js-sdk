import { useCallback, useEffect, useRef, useState } from 'react';
import { useActiveValidations } from '../contexts/ActiveValidationsContext';
import { ValidationStreamRunner } from '../contexts/ValidationStreamRunner';
import { SpinnerIcon } from '../icons';
import { sdkAxiosMaker } from '../services/axios';
import {
  getFixCredentials,
  getPayer,
  getPolicyHolder,
  getSDK,
  getTerms,
  postCredentials
} from '../services/requests';
import type {
  StreamEmployer,
  StreamPayer,
  StreamPolicyHolder,
  StreamPolicyHolderShort,
  StreamTenant,
  StreamUser,
  ValidateCredsResponse
} from '../types';
import type { SDKInitOptions } from '../types-init';
import { Alert } from '../ui/Alert';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';
import { Text, Title } from '../ui/Title';
import { ActiveValidationsPanel } from './ActiveValidationsPanel';
import { ChoosePayer } from './ChoosePayer';
import { EnterCredentials } from './EnterCredentials';
import { FinishedEasyEnroll } from './FinishedEasyEnroll';
import { FixCredentials } from './FixCredentials';
import { SelectEnrollProcess } from './SelectEnrollProcess';
import { TermsOfUse } from './TermsOfUse';

const VERSION = '0.8.0-alpha.1';

interface SDKProps extends SDKInitOptions {
  /** Computed inside the entry; passed in here so the controller
   * doesn't need to recompute on every state transition. */
  resolvedPAA?: boolean;
  resolvedPAASingle?: boolean;
}

interface SDKState {
  step: number | null;
  loading: boolean;
  termsOfUse: boolean;
  streamUser: StreamUser | null;
  streamTenant: StreamTenant | null;
  streamPayers: StreamPayer[] | null;
  streamPayer: StreamPayer | null;
  streamEmployer: StreamEmployer | null;
  dependent: boolean;
  taskId: string | null;
  taskToken: string | null;
  policyHolderId: number | null;
  endMessage: string | null;
  credentialsValid: boolean | null;
  streamPolicyHolder: StreamPolicyHolder | null;
  finishedEasyEnrollPending: boolean | null;
  termsHtmlString: string | null;
  twoFactorAuth: ValidateCredsResponse | null;
  twoFactorAuthState: string | null;
  validationState: string | null;
  error: string | null;
  restartFlow: boolean;
  formData: Record<string, unknown> | null;
}

const defaultState: SDKState = {
  step: null,
  loading: true,
  termsOfUse: false,
  streamUser: null,
  streamTenant: null,
  streamPayers: null,
  streamPayer: null,
  streamEmployer: null,
  dependent: false,
  taskId: null,
  taskToken: null,
  policyHolderId: null,
  endMessage: null,
  credentialsValid: null,
  streamPolicyHolder: null,
  finishedEasyEnrollPending: null,
  termsHtmlString: null,
  twoFactorAuth: null,
  twoFactorAuthState: null,
  validationState: null,
  error: null,
  restartFlow: false,
  formData: null
};

export const SDK = (props: SDKProps) => {
  const [state, setState] = useState<SDKState>(defaultState);
  const initialized = useRef(false);
  const { addValidation, validations } = useActiveValidations();
  const useNonBlockingValidation = props.realTimeVerification !== false;

  // Refresh the user's PH list whenever a validation reaches a
  // terminal state. The runner already calls getPolicyHolder for
  // the individual PH (to refine credentialsValid in the context),
  // but the FixCredentials list renders from streamUser.policy_holders
  // which doesn't include the newly-minted last_successful_crawl_end
  // until we refetch the user. Without this, a freshly-validated PH
  // shows "Connected" but no "Last synced" timestamp.
  useEffect(() => {
    const hasJustCompleted = validations.some(
      (v) => v.state === 'success' || v.state === 'failure'
    );
    if (!hasJustCompleted) return;
    if (!state.streamUser) return;
    getFixCredentials({ email: state.streamUser.email })
      .then(({ user }) => {
        setState((s) => (s.streamUser ? { ...s, streamUser: user } : s));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validations]);

  // Initialize the axios client once on mount with the customer's tokens.
  useEffect(() => {
    sdkAxiosMaker({
      apiToken: props.apiToken,
      connectAccessToken: props.connectAccessToken,
      version: VERSION,
      isDemo: props.isDemo,
      sdkStateId: props.entrySdkStateId,
      tenant: props.tenant,
      _overrideBaseUrl: props._overrideBaseUrl
    });
  }, [
    props.apiToken,
    props.connectAccessToken,
    props.isDemo,
    props.entrySdkStateId,
    props.tenant,
    props._overrideBaseUrl
  ]);

  const setStepConfigError = useCallback(
    (error: string) => {
      setState((s) => ({ ...s, loading: false, step: -1, error }));
      props.handleInitErrors?.(error);
    },
    [props.handleInitErrors]
  );

  const setStep1 = useCallback(() => {
    setState((s) => ({
      ...s,
      loading: false,
      step: 1,
      termsOfUse: false,
      streamPayer: null,
      policyHolderId: null,
      streamPolicyHolder: null
    }));
  }, []);

  const setStep2 = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    if (!state.streamUser) return;
    getFixCredentials({ email: state.streamUser.email }).then(({ user }) => {
      setState((s) => ({
        ...s,
        loading: false,
        step: 2,
        termsOfUse: false,
        streamPayer: null,
        policyHolderId: null,
        streamPolicyHolder: null,
        streamUser: user
      }));
    });
  }, [state.streamUser]);

  const setStep3 = useCallback(() => {
    setState((s) => ({
      ...s,
      loading: false,
      step: 3,
      termsOfUse: false,
      streamPayer: null,
      policyHolderId: null
    }));
  }, []);

  const setStep4 = useCallback(
    (args: {
      payer?: StreamPayer;
      dependent?: boolean;
      policyHolder?: StreamPolicyHolderShort;
    }) => {
      const { payer, dependent, policyHolder } = args;
      if (policyHolder && !payer) {
        setStepConfigError(
          "This account's carrier isn't enabled for this employer. Please contact your administrator."
        );
        return;
      }
      if (!state.streamUser || !state.streamEmployer) return;

      setState((s) => ({
        ...s,
        ...(policyHolder && {
          streamPolicyHolder: policyHolder as unknown as StreamPolicyHolder,
          policyHolderId: policyHolder.id
        })
      }));

      if (!payer) {
        setState((s) => ({
          ...s,
          loading: false,
          dependent: dependent ?? s.dependent,
          termsOfUse: false,
          step: 4,
          twoFactorAuth: null,
          twoFactorAuthState: null,
          taskId: null
        }));
        return;
      }

      if (state.streamPayer && state.streamPayer.id === payer.id) {
        setState((s) => ({
          ...s,
          loading: false,
          dependent: dependent ?? s.dependent,
          streamPayer: payer,
          termsOfUse: false,
          step: 4,
          twoFactorAuth: null,
          twoFactorAuthState: null,
          taskId: null
        }));
        return;
      }

      setState((s) => ({ ...s, loading: true }));
      const usePAASingle =
        props.resolvedPAASingle ?? props.enableInteropSinglePage;
      const referer = usePAASingle
        ? props.webViewDelegation
          ? 'sdk_interop_done_delegation'
          : window.location.origin +
            window.location.pathname +
            window.location.search +
            (window.location.search
              ? '&forceTPAStreamSdkEnd=1'
              : '?forceTPAStreamSdkEnd=1')
        : undefined;

      getPayer({
        payerId: payer.id,
        employerId: state.streamEmployer.id,
        email: state.streamUser.email,
        referer
      }).then((payerResponse) => {
        setState((s) => ({
          ...s,
          loading: false,
          dependent: dependent ?? s.dependent,
          streamPayer: payerResponse,
          termsOfUse: false,
          step: 4,
          twoFactorAuth: null,
          twoFactorAuthState: null,
          taskId: null
        }));
      });
    },
    [
      state.streamUser,
      state.streamEmployer,
      state.streamPayer,
      props.resolvedPAASingle,
      props.enableInteropSinglePage,
      props.webViewDelegation,
      setStepConfigError
    ]
  );

  const handleRealtimeCompletion = useCallback(
    (args: {
      policyHolderId: number;
      credentialsValid?: boolean | null;
      pending?: boolean;
      validationState?: string;
      endMessage?: string;
      twoFactorAuth?: ValidateCredsResponse;
    }) => {
      if (!state.streamUser || !state.streamEmployer) return;
      const {
        credentialsValid,
        pending,
        endMessage,
        twoFactorAuth,
        validationState
      } = args;

      setState((s) => ({ ...s, loading: true }));

      if (props.isDemo) {
        setState((s) => ({
          ...s,
          loading: false,
          streamPolicyHolder: { demo: true } as unknown as StreamPolicyHolder,
          endMessage: null,
          step: 5,
          credentialsValid: true,
          finishedEasyEnrollPending: false,
          taskId: null
        }));
        return;
      }

      if (twoFactorAuth) {
        setState((s) => ({
          ...s,
          loading: false,
          step: 5,
          twoFactorAuth,
          twoFactorAuthState: validationState ?? null
        }));
        return;
      }

      getPolicyHolder({
        policyHolderId: args.policyHolderId,
        email: state.streamUser.email,
        employerId: state.streamEmployer.id
      }).then((phData) => {
        setState((s) => ({
          ...s,
          loading: false,
          streamPolicyHolder: phData,
          endMessage: endMessage || phData.login_correction_message || null,
          step: 5,
          credentialsValid: phData.loginProblemIsValid(),
          finishedEasyEnrollPending: !!pending && phData.login_problem === null,
          taskId: null
        }));
      });
    },
    [state.streamUser, state.streamEmployer, props.isDemo]
  );

  const validateCreds = useCallback(
    (args: {
      params: Record<string, unknown>;
      errorCallBack: (data: { errorMessage?: string }) => void;
      interopPhId?: number;
    }) => {
      const { params, errorCallBack, interopPhId } = args;
      if (!state.streamUser || !state.streamEmployer) return;
      const additionalParams = {
        user: state.streamUser,
        employer_id: state.streamEmployer.id
      };
      setState((s) => ({ ...s, formData: null }));
      props.donePostCredentials?.({ params });

      if (interopPhId) {
        getPolicyHolder({
          policyHolderId: interopPhId,
          email: state.streamUser.email,
          employerId: state.streamEmployer.id
        }).then((phData) => {
          setState((s) => ({
            ...s,
            termsOfUse: false,
            taskId: null,
            taskToken: null,
            credentialsValid: true,
            policyHolderId: interopPhId,
            streamPolicyHolder: phData,
            step: 5
          }));
        });
        return;
      }

      if (props.isDemo) {
        setState((s) => ({
          ...s,
          termsOfUse: false,
          policyHolderId: state.policyHolderId,
          taskId: props.realTimeVerification ? 'DEMO' : null,
          step: 5
        }));
        return;
      }

      postCredentials({
        params: { ...params, ...additionalParams },
        policyHolderId: state.policyHolderId,
        handleFormErrors: props.handleFormErrors
      }).then(({ taskId, taskToken, policyHolderId, errorMessage }) => {
        if (errorMessage) {
          errorCallBack({ errorMessage });
          return;
        }
        if (!state.streamUser || !state.streamEmployer || !policyHolderId)
          return;

        // Non-blocking realtime path: push the validation into the
        // floating panel and return the user to the picker step they
        // came from (Reconnect = step 2, Add new = step 3) so they can
        // start another validation in parallel. The panel + 2FA modal
        // own the rest of the flow without taking over the screen.
        if (
          useNonBlockingValidation &&
          taskId &&
          taskToken &&
          state.streamPayer
        ) {
          addValidation({
            policyHolderId,
            taskId,
            taskToken,
            payer: {
              id: state.streamPayer.id,
              name: state.streamPayer.name,
              logo_url: state.streamPayer.logo_url
            },
            email: state.streamUser.email,
            state: 'pending'
          });
          // Refresh the user's PH list so the destination page
          // (FixCredentials / ChoosePayer) reflects the just-submitted
          // PH instead of the stale init-time snapshot. Without this,
          // a user who fixes their last broken PH lands on an empty
          // list and a hero — the hero is right but the missing list
          // entry feels like the SDK forgot what they just did.
          getFixCredentials({ email: state.streamUser.email })
            .then(({ user }) => {
              setState((s) => ({
                ...s,
                termsOfUse: false,
                policyHolderId: null,
                streamPayer: null,
                streamPolicyHolder: null,
                taskId: null,
                taskToken: null,
                streamUser: user,
                step: props.fixCredentials ? 2 : 3,
                formData: null
              }));
            })
            .catch(() => {
              // Refresh failure is non-fatal — fall back to the stale
              // user list so the user still gets a usable page.
              setState((s) => ({
                ...s,
                termsOfUse: false,
                policyHolderId: null,
                streamPayer: null,
                streamPolicyHolder: null,
                taskId: null,
                taskToken: null,
                step: props.fixCredentials ? 2 : 3,
                formData: null
              }));
            });
          return;
        }

        // Legacy blocking path: realTimeVerification: false (or no
        // task_token returned) → step 5 + FinishedEasyEnroll.
        getPolicyHolder({
          policyHolderId,
          email: state.streamUser.email,
          employerId: state.streamEmployer.id
        }).then((phData) => {
          setState((s) => ({
            ...s,
            termsOfUse: false,
            taskId: null,
            taskToken: null,
            credentialsValid:
              phData.login_problem !== null
                ? !phData.login_needs_correction
                : true,
            policyHolderId,
            streamPolicyHolder: phData,
            step: 5
          }));
        });
      });
    },
    [
      state.streamUser,
      state.streamEmployer,
      state.policyHolderId,
      state.streamPayer,
      props.donePostCredentials,
      props.handleFormErrors,
      props.realTimeVerification,
      props.isDemo,
      props.fixCredentials,
      useNonBlockingValidation,
      addValidation
    ]
  );

  const toggleTermsOfUse = useCallback(
    (formData?: Record<string, unknown>) => {
      if (formData) setState((s) => ({ ...s, formData }));
      if (!state.termsHtmlString) {
        if (!state.streamUser) return;
        setState((s) => ({ ...s, loading: true }));
        getTerms({ email: state.streamUser.email }).then((html) => {
          setState((s) => ({
            ...s,
            loading: false,
            termsOfUse: !s.termsOfUse,
            termsHtmlString: html
          }));
        });
      } else {
        setState((s) => ({ ...s, termsOfUse: !s.termsOfUse }));
      }
    },
    [state.termsHtmlString, state.streamUser]
  );

  // The init request takes a `restartFlow` argument instead of
  // reading it off state, so the value is current at call time.
  // (Reading it off state would close over the stale value at the
  // moment makeInitRequest was last reconstructed by useCallback,
  // which lags behind the setState call inside restartProcess.)
  const makeInitRequest = useCallback(
    (restartFlow = false) => {
      getSDK({
        employer: props.employer,
        user: props.user,
        isDemo: props.isDemo,
        doneGetSDK: props.doneGetSDK
      }).then(({ user, payers, tenant, employer, error }) => {
        if (error || !user || !payers || !tenant || !employer) {
          setStepConfigError(
            (error as { message?: string })?.message || 'Initialization failed'
          );
          return;
        }
        setState((s) => ({
          ...s,
          streamUser: user,
          streamPayers: payers,
          streamTenant: tenant,
          streamEmployer: employer,
          error: null
        }));

        // Resume hint: if any of the user's PHs has an in-flight
        // validation task (server-side Redis pointer is still active),
        // the user serializer attached task_id + task_token. Push them
        // into the floating panel so the user sees what's still running
        // — but don't hijack the wizard. The user lands on whatever
        // step makes sense (ChoosePayer / FixCredentials) and the
        // panel + 2FA modal handle the in-flight work in parallel.
        if (!restartFlow && useNonBlockingValidation) {
          for (const ph of user.policy_holders || []) {
            if (!ph.task_id || !ph.task_token) continue;
            const matchingPayer = payers.find((p) => p.id === ph.payer_id);
            if (!matchingPayer) continue;
            addValidation({
              policyHolderId: ph.id,
              taskId: ph.task_id,
              taskToken: ph.task_token,
              payer: {
                id: matchingPayer.id,
                name: matchingPayer.name,
                logo_url: matchingPayer.logo_url
              },
              email: user.email,
              state: 'pending'
            });
          }
        }

        if (props.forceEndStep && !restartFlow) {
          setState((s) => ({
            ...s,
            loading: false,
            step: 5,
            credentialsValid: true
          }));
          return;
        }
        if (props.fixCredentials) {
          if (!props.connectAccessToken) {
            setStepConfigError(
              'You must have a connect access token enabled and set to use fix-credentials functionality.'
            );
            return;
          }
          setState((s) => ({
            ...s,
            loading: false,
            step: 1,
            termsOfUse: false,
            streamPayer: null,
            policyHolderId: null,
            streamPolicyHolder: null
          }));
          return;
        }
        if (payers.length === 1) {
          // setStep4 needs streamUser/streamEmployer in state. Set them first
          // (already done above), then advance.
          setTimeout(() => setStep4({ payer: payers[0]! }), 0);
        } else {
          setState((s) => ({
            ...s,
            loading: false,
            step: 3,
            termsOfUse: false,
            streamPayer: null,
            policyHolderId: null
          }));
        }
      });
    },
    [
      props.employer,
      props.user,
      props.isDemo,
      props.doneGetSDK,
      props.forceEndStep,
      props.fixCredentials,
      props.connectAccessToken,
      useNonBlockingValidation,
      addValidation,
      setStep4,
      setStepConfigError
    ]
  );

  // restartProcess is defined AFTER makeInitRequest so it can call it.
  // Resetting state alone wouldn't be enough — the initial useEffect
  // is empty-deps and only fires once, so the controller would sit on
  // `loading: true` forever without a manual re-fire here.
  const restartProcess = useCallback(() => {
    setState({ ...defaultState, restartFlow: true });
    makeInitRequest(true);
  }, [makeInitRequest]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    makeInitRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The wizard step rendering is wrapped at the bottom in a fragment
  // alongside <ActiveValidationsPanel /> + <ValidationStreamRunner />.
  // Extracting into an IIFE keeps the existing per-step early-return
  // structure intact while letting the runner/panel render alongside.
  const renderWizard = () => {
    if (state.loading) {
      return (
        <Card>
          <Stack gap="md" align="center">
            <SpinnerIcon className="tpa-w-8 tpa-h-8 tpa-text-primary-600" />
            <Text color="muted" size="sm">
              Loading…
            </Text>
          </Stack>
        </Card>
      );
    }

    if (state.step === -1) {
      return (
        <Card>
          <Alert variant="danger" title="Configuration error">
            {state.error || 'Please contact the site host.'}
          </Alert>
        </Card>
      );
    }

    if (state.step === 1) {
      return (
        <SelectEnrollProcess
          doneStep1={props.doneStep1}
          setFixCredentials={setStep2}
          setChoosePayer={setStep3}
        />
      );
    }

    if (state.step === 2 && state.streamUser && state.streamPayers) {
      return (
        <FixCredentials
          doneStep2={props.doneStep2}
          streamUser={state.streamUser}
          streamPayers={state.streamPayers}
          choosePolicyHolder={setStep4}
          returnSelectEnrollProcess={!!props.fixCredentials && setStep1}
        />
      );
    }

    if (
      state.step === 3 &&
      state.streamUser &&
      state.streamPayers &&
      state.streamEmployer
    ) {
      if (props.renderChoosePayer === false) {
        props.doneStep3?.({
          choosePayer: setStep4,
          usedPayers: state.streamUser.policy_holders.map((ph) => ph.payer_id),
          dropDown: state.streamEmployer.show_all_payers_in_easy_enroll,
          streamPayers: state.streamPayers,
          streamEmployer: state.streamEmployer
        });
        return <div />;
      }
      return (
        <ChoosePayer
          streamPayers={state.streamPayers}
          streamEmployer={state.streamEmployer}
          usedPayers={state.streamUser.policy_holders.map((ph) => ph.payer_id)}
          choosePayer={(args) =>
            setStep4({ payer: args.payer, dependent: !!args.dependent })
          }
          returnSelectEnrollProcess={!!props.fixCredentials && setStep1}
          doneStep3={props.doneStep3}
          dropDown={state.streamEmployer.show_all_payers_in_easy_enroll}
          isDemo={!!props.isDemo}
        />
      );
    }

    if (state.step === 4 && state.streamPayer && state.streamTenant) {
      if (state.termsOfUse) {
        return (
          <TermsOfUse
            termsHtmlString={state.termsHtmlString || ''}
            onClose={() => toggleTermsOfUse(state.formData ?? undefined)}
            doneTermsOfService={props.doneTermsOfService}
          />
        );
      }
      if (props.renderPayerForm === false) {
        props.doneStep4?.({
          streamPayer: state.streamPayer,
          formJsonSchema: state.streamPayer.onboard_form,
          tenantTerms: state.streamTenant.terms_of_use,
          streamTenant: state.streamTenant,
          toggleTermsOfUse,
          returnToChoosePayer: setStep3,
          validateCreds,
          email: state.streamUser?.email
        });
        return <div />;
      }
      return (
        <EnterCredentials
          streamPayer={state.streamPayer}
          streamPolicyHolder={state.streamPolicyHolder}
          tenantTerms={state.streamTenant.terms_of_use}
          formData={state.formData}
          email={state.streamUser?.email || ''}
          streamTenant={state.streamTenant}
          toggleTermsOfUse={toggleTermsOfUse}
          enableInterop={props.enableInterop}
          enableInteropSinglePage={props.enableInteropSinglePage}
          enablePatientAccessAPI={props.enablePatientAccessAPI}
          enablePatientAccessAPISinglePage={
            props.enablePatientAccessAPISinglePage
          }
          includePayerBlogs={props.includePayerBlogs}
          userAddedUISchema={props.userSchema}
          returnToStep3={
            state.streamPayers &&
            state.streamPayers.length > 1 &&
            state.policyHolderId === null
              ? setStep3
              : false
          }
          returnToStep2={
            props.fixCredentials && state.policyHolderId !== null
              ? setStep2
              : false
          }
          validateCreds={validateCreds}
          doneStep4={props.doneStep4}
          donePopUp={props.donePopUp}
        />
      );
    }

    if (state.step === 5) {
      // The realtime / 2FA inline branches that used to live here are
      // gone — non-blocking validation is the only path now and is
      // rendered by ActiveValidationsHero (inline in FixCredentials /
      // ChoosePayer) + ActiveValidationsPanel (corner). Step 5 is the
      // FinishedEasyEnroll end widget only.
      if (state.streamTenant && state.streamUser && state.streamEmployer) {
        const credValid = props.realTimeVerification
          ? state.credentialsValid
          : true;
        const returnFn = credValid
          ? restartProcess
          : () => setStep4({ payer: state.streamPayer || undefined });
        if (props.renderEndWidget === false) {
          props.doneEasyEnroll?.({
            tenant: state.streamTenant,
            payer: state.streamPayer,
            user: state.streamUser,
            policyHolder: state.streamPolicyHolder,
            employer: state.streamEmployer,
            credentialsValid: credValid,
            pending: state.finishedEasyEnrollPending,
            endingMessage: state.endMessage,
            returnFlowFunction: returnFn
          });
          return <div />;
        }
        return (
          <FinishedEasyEnroll
            tenant={state.streamTenant}
            payer={state.streamPayer}
            user={state.streamUser}
            policyHolder={state.streamPolicyHolder}
            employer={state.streamEmployer}
            credentialsValid={credValid}
            pending={state.finishedEasyEnrollPending}
            endingMessage={state.endMessage}
            returnToPage={returnFn}
            doneEasyEnroll={props.doneEasyEnroll}
          />
        );
      }
    }

    return (
      <Card>
        <Title order={3}>Failed to find an associated step</Title>
      </Card>
    );
  };

  return (
    <>
      {renderWizard()}
      {useNonBlockingValidation && state.streamUser && state.streamEmployer && (
        <ValidationStreamRunner
          email={state.streamUser.email}
          employerId={state.streamEmployer.id}
        />
      )}
      {useNonBlockingValidation && <ActiveValidationsPanel />}
    </>
  );
};
