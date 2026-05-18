import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
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
import { ActiveValidationsHero } from './ActiveValidationsHero';
import { ActiveValidationsPanel } from './ActiveValidationsPanel';
import { ChoosePayer } from './ChoosePayer';
import { EnterCredentials } from './EnterCredentials';
import { FinishedEasyEnroll } from './FinishedEasyEnroll';
import { FixCredentials } from './FixCredentials';
import { SelectEnrollProcess } from './SelectEnrollProcess';
import { TermsOfUse } from './TermsOfUse';

const VERSION = '0.8.1';

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

  // Fix-credentials mode is derived from connectAccessToken presence,
  // not from the legacy `fixCredentials` flag (which is now deprecated
  // and ignored, see entries/sdk.tsx normalizeOptions for the
  // deprecation warning). The backend `/sdk-api/fix-credentials`
  // endpoint requires a connect access token, so the token's presence
  // at init time IS the signal for "the customer wants the manage-
  // your-carriers view." Customers without the token continue to get
  // the standard choose-payer flow.
  const inFixMode = !!props.connectAccessToken;

  // Refresh user.policy_holders via whichever endpoint the SDK has
  // access to in this session. Fix-credentials mode uses the
  // `/sdk-api/fix-credentials` endpoint (gated by connectAccessToken);
  // standard enrollment uses the regular `tpastream_sdk` init endpoint.
  // Using fix-credentials in standard mode consistently hits the catch
  // path and leaves stale data on the picker (e.g. just-submitted
  // carriers don't show up in usedPayers).
  const refreshUserPolicyHolders = useCallback(async () => {
    if (!state.streamUser) return null;
    if (inFixMode) {
      const { user } = await getFixCredentials({
        email: state.streamUser.email
      });
      return user;
    }
    // getSDK is the standard init endpoint. The post body's identity
    // fields (employer + user) come from props directly: the SDK was
    // originally initialized with them and they don't change
    // mid-session. (state.streamEmployer is the backend-shaped
    // StreamEmployer, which has different fields from the InitEmployer
    // getSDK expects, so we don't use it here.)
    const result = await getSDK({
      employer: props.employer,
      user: props.user ?? {
        firstName: '',
        lastName: '',
        email: state.streamUser.email
      },
      isDemo: !!props.isDemo
    });
    return result.user ?? null;
  }, [state.streamUser, inFixMode, props.employer, props.user, props.isDemo]);

  // Refresh the user's PH list whenever a validation FIRST reaches a
  // terminal state. The runner already calls getPolicyHolder for the
  // individual PH (to refine credentialsValid in the context), but the
  // FixCredentials list renders from streamUser.policy_holders which
  // doesn't include the newly-minted last_successful_crawl_end until
  // we refetch the user. Track which task ids we've already refreshed
  // so a stale terminal-state validation in the array doesn't trigger
  // a refetch on every unrelated state change. Without this guard, a
  // single failed validation lingering in the panel caused every later
  // SSE event on any *other* validation to refetch the whole user.
  const refreshedForTaskIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const newlyCompleted = validations.filter(
      (v) =>
        (v.state === 'success' || v.state === 'failure') &&
        !refreshedForTaskIds.current.has(v.taskId)
    );
    if (newlyCompleted.length === 0) return;
    if (!state.streamUser) return;
    for (const v of newlyCompleted) refreshedForTaskIds.current.add(v.taskId);
    refreshUserPolicyHolders()
      .then((user) => {
        if (!user) return;
        setState((prev) =>
          prev.streamUser ? { ...prev, streamUser: user } : prev
        );
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validations]);

  // Fire the legacy `doneRealtime` callback once per validation as it
  // enters the realtime phase. The 0.7.x SDK fired this at mount of
  // the (now-deleted) RealTimeVerification component; the equivalent
  // moment in 0.8 is when a validation first appears in the active set.
  // Tracked in a ref so we don't re-fire on every render of the
  // validations array.
  const announcedRealtime = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!props.doneRealtime) return;
    for (const v of validations) {
      if (!announcedRealtime.current.has(v.taskId)) {
        announcedRealtime.current.add(v.taskId);
        props.doneRealtime();
      }
    }
  }, [validations, props.doneRealtime]);

  // Stable per-instance state-id. The 0.7.x entry generated one with
  // crypto.getRandomValues; we use crypto.randomUUID where available.
  // Customers can override by passing entrySdkStateId. The X-SDK-State-Id
  // header lets server logs correlate every request in one wizard run.
  const sdkStateId = useRef<string>(
    props.entrySdkStateId ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sdk-${Date.now()}-${Math.random().toString(16).slice(2)}`)
  );

  // Initialize the axios client once on mount with the customer's tokens.
  useEffect(() => {
    sdkAxiosMaker({
      apiToken: props.apiToken,
      connectAccessToken: props.connectAccessToken,
      connectAccessTokenRefreshFn: props.connectAccessTokenRefreshFn,
      onConnectAccessTokenExpired: props.onConnectAccessTokenExpired,
      version: VERSION,
      isDemo: props.isDemo,
      sdkStateId: sdkStateId.current,
      tenant: props.tenant,
      _overrideBaseUrl: props._overrideBaseUrl
    });
    // The token-expiry hooks (refresh fn + callback) are stashed
    // module-locally inside sdkAxiosMaker, so they're not in this
    // effect's deps. They're identity references the customer passes
    // once at init() time; redefining them per-render would defeat the
    // expiry-detection cache anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.apiToken,
    props.connectAccessToken,
    props.isDemo,
    props.tenant,
    props._overrideBaseUrl
  ]);

  const setStepConfigError = useCallback(
    (error: string) => {
      setState((prev) => ({ ...prev, loading: false, step: -1, error }));
      props.handleInitErrors?.(error);
    },
    [props.handleInitErrors]
  );

  const setStep1 = useCallback(() => {
    setState((prev) => ({
      ...prev,
      loading: false,
      step: 1,
      termsOfUse: false,
      streamPayer: null,
      policyHolderId: null,
      streamPolicyHolder: null
    }));
  }, []);

  const setStep2 = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));
    if (!state.streamUser) return;
    getFixCredentials({ email: state.streamUser.email })
      .then(({ user }) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          step: 2,
          termsOfUse: false,
          streamPayer: null,
          policyHolderId: null,
          streamPolicyHolder: null,
          streamUser: user
        }));
      })
      .catch(() => {
        // Without this catch the spinner would never clear if the
        // fix-credentials API failed — user is stuck on loading.
        setStepConfigError(
          "Couldn't load your carriers. Please reload the page."
        );
      });
  }, [state.streamUser, setStepConfigError]);

  const setStep3 = useCallback(() => {
    setState((prev) => ({
      ...prev,
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

      setState((prev) => ({
        ...prev,
        ...(policyHolder && {
          streamPolicyHolder: policyHolder as unknown as StreamPolicyHolder,
          policyHolderId: policyHolder.id
        })
      }));

      if (!payer) {
        setState((prev) => ({
          ...prev,
          loading: false,
          dependent: dependent ?? prev.dependent,
          termsOfUse: false,
          step: 4,
          twoFactorAuth: null,
          twoFactorAuthState: null,
          taskId: null
        }));
        return;
      }

      if (state.streamPayer && state.streamPayer.id === payer.id) {
        setState((prev) => ({
          ...prev,
          loading: false,
          dependent: dependent ?? prev.dependent,
          streamPayer: payer,
          termsOfUse: false,
          step: 4,
          twoFactorAuth: null,
          twoFactorAuthState: null,
          taskId: null
        }));
        return;
      }

      setState((prev) => ({ ...prev, loading: true }));
      const usePAASingle =
        props.resolvedPAASingle ??
        props.enablePatientAccessAPISinglePage ??
        props.enableInteropSinglePage;
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
      })
        .then((payerResponse) => {
          setState((prev) => ({
            ...prev,
            loading: false,
            dependent: dependent ?? prev.dependent,
            streamPayer: payerResponse,
            termsOfUse: false,
            step: 4,
            twoFactorAuth: null,
            twoFactorAuthState: null,
            taskId: null
          }));
        })
        .catch(() => {
          // Without this catch the spinner would never clear if the
          // getPayer API call rejected — user is stuck on loading.
          setStepConfigError(
            "Couldn't load carrier configuration. Please try again."
          );
        });
    },
    [
      state.streamUser,
      state.streamEmployer,
      state.streamPayer,
      props.resolvedPAASingle,
      props.enablePatientAccessAPISinglePage,
      props.enableInteropSinglePage,
      props.webViewDelegation,
      setStepConfigError
    ]
  );

  const validateCreds = useCallback(
    (args: {
      params: Record<string, unknown>;
      /** Optional. The public custom-render docs show
       * `validateCreds({ params })` without a callback; default to a
       * no-op so existing `renderPayerForm={false}` integrations don't
       * crash when the credential submit returns an error. */
      errorCallBack?: (data: { errorMessage?: string }) => void;
      interopPhId?: number;
    }) => {
      const { params, interopPhId } = args;
      const errorCallBack = args.errorCallBack ?? (() => {});
      if (!state.streamUser || !state.streamEmployer) return;
      const additionalParams = {
        user: state.streamUser,
        employer_id: state.streamEmployer.id
      };
      setState((prev) => ({ ...prev, formData: null }));
      props.donePostCredentials?.({ params });

      if (interopPhId) {
        getPolicyHolder({
          policyHolderId: interopPhId,
          email: state.streamUser.email,
          employerId: state.streamEmployer.id
        })
          .then((phData) => {
            setState((prev) => ({
              ...prev,
              termsOfUse: false,
              taskId: null,
              taskToken: null,
              credentialsValid: true,
              policyHolderId: interopPhId,
              streamPolicyHolder: phData,
              step: 5
            }));
          })
          .catch(() => {
            // OAuth succeeded server-side but the post-success PH lookup
            // failed. Advance to step 5 with credentialsValid still set
            // (the upstream interop SUCCESS already confirmed the link)
            // so the user reaches the end widget instead of stranding on
            // the previous step. The end widget renders from the in-memory
            // PH summary that was already fetched at init.
            setState((prev) => ({
              ...prev,
              termsOfUse: false,
              taskId: null,
              taskToken: null,
              credentialsValid: true,
              policyHolderId: interopPhId,
              step: 5
            }));
          });
        return;
      }

      if (props.isDemo) {
        // Demo always lands on the success branch of FinishedEasyEnroll.
        // Without credentialsValid, the now-default realTimeVerification:true
        // path renders the failure branch because state.credentialsValid is
        // null. Pin true here so the demo widget reflects a clean run.
        setState((prev) => ({
          ...prev,
          termsOfUse: false,
          policyHolderId: state.policyHolderId,
          taskId: props.realTimeVerification ? 'DEMO' : null,
          credentialsValid: true,
          finishedEasyEnrollPending: false,
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
        // start another validation in parallel. The floating panel +
        // the inline ActiveValidationsHero (2FA method picker / code
        // entry rendered inline in the hero card, no modal) own the
        // rest of the flow without taking over the screen.
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

          // Pick the return step from the flow the user actually came
          // from. In fix-credentials mode (derived from
          // connectAccessToken) the user can choose "Reconnect
          // existing" (state.PH set → return to step 2, the
          // fix-credentials list) OR "Add new carrier" (state.PH null
          // → return to step 3, the carrier picker, so they can chain
          // another add). Honoring just inFixMode without the
          // PH-set check would bounce "Add new" users back to the
          // FixCredentials list instead of the picker they expect.
          const returnStep = inFixMode && state.policyHolderId ? 2 : 3;
          // refreshUserPolicyHolders picks fix-credentials vs the
          // standard sdk init endpoint based on whether the SDK has a
          // connect access token; the previous unconditional
          // getFixCredentials call always hit the catch path in
          // standard enrollment mode and left a stale user list.
          refreshUserPolicyHolders()
            .then((user) => {
              setState((prev) => ({
                ...prev,
                termsOfUse: false,
                policyHolderId: null,
                streamPayer: null,
                streamPolicyHolder: null,
                taskId: null,
                taskToken: null,
                streamUser: user ?? prev.streamUser,
                step: returnStep,
                formData: null
              }));
            })
            .catch(() => {
              // Refresh failure is non-fatal — fall back to the stale
              // user list so the user still gets a usable page.
              setState((prev) => ({
                ...prev,
                termsOfUse: false,
                policyHolderId: null,
                streamPayer: null,
                streamPolicyHolder: null,
                taskId: null,
                taskToken: null,
                step: returnStep,
                formData: null
              }));
            });
          return;
        }

        // Legacy `realTimeVerification: false` / submit-and-trust path
        // → step 5 + FinishedEasyEnroll. Force credentialsValid=true
        // unconditionally to match the documented 0.7-era contract: the
        // user submitted creds, we accepted them, the async validation
        // task will refine login_problem later. Deriving credentialsValid
        // from the pre-refresh `login_problem` (which may still be the
        // stale broken value for a returning user) would surface the
        // invalid-credentials end widget for a flow that's supposed to
        // be submit-and-trust.
        getPolicyHolder({
          policyHolderId,
          email: state.streamUser.email,
          employerId: state.streamEmployer.id
        })
          .then((phData) => {
            setState((prev) => ({
              ...prev,
              termsOfUse: false,
              taskId: null,
              taskToken: null,
              credentialsValid: true,
              policyHolderId,
              streamPolicyHolder: phData,
              step: 5
            }));
          })
          .catch((err) => {
            // PH refresh failed after credential submit. Advance to
            // step 5 anyway (with credentialsValid optimistically true
            // since the post itself succeeded) so the user sees the end
            // widget instead of being stranded on the credential form
            // with no feedback. handleFormErrors gets the error so the
            // host page can log/notify.
            props.handleFormErrors?.(err);
            setState((prev) => ({
              ...prev,
              termsOfUse: false,
              taskId: null,
              taskToken: null,
              credentialsValid: true,
              policyHolderId,
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
      inFixMode,
      useNonBlockingValidation,
      addValidation
    ]
  );

  const toggleTermsOfUse = useCallback(
    (formData?: Record<string, unknown>) => {
      if (formData) setState((prev) => ({ ...prev, formData }));
      if (!state.termsHtmlString) {
        if (!state.streamUser) return;
        // Open the overlay immediately. TermsOfUse renders a spinner
        // inside the Dialog while termsHtmlString is empty so the
        // user gets feedback without us flipping the wizard-level
        // `loading` flag (which would unmount the credential form
        // underneath the overlay and produce a visible blink before
        // the fetch resolved).
        setState((prev) => ({ ...prev, termsOfUse: true }));
        getTerms({ email: state.streamUser.email })
          .then((html) => {
            setState((prev) => ({ ...prev, termsHtmlString: html }));
          })
          .catch(() => {
            // Close the overlay on fetch failure so the user isn't
            // stuck staring at a spinner that will never resolve.
            // They can re-trigger from the form.
            setState((prev) => ({ ...prev, termsOfUse: false }));
          });
      } else {
        setState((prev) => ({ ...prev, termsOfUse: !prev.termsOfUse }));
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
        setState((prev) => ({
          ...prev,
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
        // without hijacking the wizard. The user lands on whatever
        // step makes sense (ChoosePayer / FixCredentials) and the
        // floating panel + inline ActiveValidationsHero (2FA method
        // picker / code entry, no modal) handle the in-flight work in
        // parallel.
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
          // The boolean form (`forceEndStep: true` legacy 0.7.x signature)
          // and the explicit-step number form are both supported. Truthy
          // boolean collapses to step 5 (FinishedEasyEnroll). For a number,
          // honor the requested step ONLY if it maps to a known wizard
          // step AND that step can render off cold-init state. Step 4
          // (EnterCredentials) requires `state.streamPayer` which this
          // branch doesn't have, so it falls through to "Failed to find
          // an associated step." Exclude 4 from the allowed targets
          // and clamp to 5; the customer should route to step 4 via the
          // ChoosePayer flow, not via forceEndStep.
          const FORCE_END_TARGETS = new Set([1, 2, 3, 5]);
          const target =
            typeof props.forceEndStep === 'number' &&
            FORCE_END_TARGETS.has(props.forceEndStep)
              ? props.forceEndStep
              : 5;
          setState((prev) => ({
            ...prev,
            loading: false,
            step: target,
            credentialsValid: true
          }));
          return;
        }
        if (inFixMode) {
          // Member-portal flow: customer minted a connectAccessToken
          // at init, which gates `/sdk-api/fix-credentials`. Start at
          // step 1 (SelectEnrollProcess) so the user can choose
          // "Reconnect existing" (fix-credentials list) or "Add new
          // carrier" (choose-payer). The legacy mismatch error path
          // that used to live here (`fixCredentials: true` without
          // connectAccessToken) is gone now that fix-credentials is
          // derived from token presence; passing the legacy flag
          // without a token just lands you in the standard flow.
          setState((prev) => ({
            ...prev,
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
          // Inline the step-4 transition rather than going through
          // setStep4. setStep4's useCallback closes over state.streamUser
          // / state.streamEmployer, which are still null at the time
          // this callback was created (the previous setState merging
          // them in hasn't flushed yet). Going through setStep4 here
          // hits its `!state.streamUser || !state.streamEmployer`
          // early-return and the loading screen sticks forever for
          // single-payer employers.
          //
          // BUT: EnterCredentials needs the full payer payload
          // (onboard_form, supports_interoperability_apis, etc.) which
          // the init-response payer doesn't carry. Fetch via getPayer
          // first, mirror the multi-payer path through setStep4 —
          // including the PAA single-page `referer` so the backend
          // generates an authorization URL with the return-to-end-widget
          // redirect context. Without this the single-page PAA flow
          // can't resume correctly after carrier auth for one-payer
          // employers.
          const singlePayerUsePAASingle =
            props.resolvedPAASingle ??
            props.enablePatientAccessAPISinglePage ??
            props.enableInteropSinglePage;
          const singlePayerReferer = singlePayerUsePAASingle
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
            payerId: payers[0]!.id,
            employerId: employer.id,
            email: user.email,
            referer: singlePayerReferer
          })
            .then((payerResponse) => {
              setState((prev) => ({
                ...prev,
                loading: false,
                streamUser: user,
                streamPayers: payers,
                streamTenant: tenant,
                streamEmployer: employer,
                streamPayer: payerResponse,
                termsOfUse: false,
                step: 4,
                twoFactorAuth: null,
                twoFactorAuthState: null,
                taskId: null
              }));
            })
            .catch(() => {
              setStepConfigError(
                "Couldn't load carrier configuration. Please reload."
              );
            });
        } else {
          setState((prev) => ({
            ...prev,
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
      inFixMode,
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

  // ----------------------------------------------------------------
  //                       Step render helpers
  // ----------------------------------------------------------------
  // Each `renderStepN_*` returns the JSX for one wizard step. They
  // close over `state`, `props`, the `setStepN` transition callbacks,
  // `validateCreds`, `toggleTermsOfUse`, `restartProcess`, and
  // `inFixMode` — all defined above. Splitting the old 200-line
  // renderWizard if-ladder into one helper per step lets future
  // readers grep "renderStep4" to find the credentials-form branch
  // instead of counting `if (state.step === N)` blocks.
  //
  // Step mapping (recap):
  //   loading   - generic "Loading…" card while init request is in flight
  //   step  -1  - configuration error (init failed, bad token, etc.)
  //   step   1  - SelectEnrollProcess (member-portal mode entry: fix
  //               existing creds vs. add new carrier)
  //   step   2  - FixCredentials tile list (member-portal mode)
  //   step   3  - ChoosePayer tile picker (standard flow OR add-new
  //               from member-portal mode)
  //   step   4  - EnterCredentials form (OR InteroperabilityPayerForm
  //               for PAA-routed payers)
  //   step   5  - FinishedEasyEnroll end widget (success / failure
  //               terminal screen)
  //   unknown   - fallback card; should never render in practice

  const renderLoadingCard = () => (
    <Card>
      <Stack gap="md" align="center">
        <SpinnerIcon className="tpa-w-8 tpa-h-8 tpa-text-primary-600" />
        <Text color="muted" size="sm">
          Loading…
        </Text>
      </Stack>
    </Card>
  );

  const renderConfigError = () => (
    <Card>
      <Alert variant="danger" title="Configuration error">
        {state.error || 'Please contact the site host.'}
      </Alert>
    </Card>
  );

  const renderStep1_SelectEnrollProcess = () => (
    <SelectEnrollProcess
      doneStep1={props.doneStep1}
      setFixCredentials={setStep2}
      setChoosePayer={setStep3}
    />
  );

  const renderStep2_FixCredentials = () => {
    if (!state.streamUser || !state.streamPayers) return null;
    return (
      <FixCredentials
        doneStep2={props.doneStep2}
        streamUser={state.streamUser}
        streamPayers={state.streamPayers}
        choosePolicyHolder={setStep4}
        returnSelectEnrollProcess={inFixMode && setStep1}
      />
    );
  };

  const renderStep3_ChoosePayer = () => {
    if (!state.streamUser || !state.streamPayers || !state.streamEmployer) {
      return null;
    }
    if (props.renderChoosePayer === false) {
      // Custom-render path: the integrator drives the picker UI from
      // the doneStep3 callback. We return an empty div so the
      // surrounding layout still has a node.
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
        returnSelectEnrollProcess={inFixMode && setStep1}
        doneStep3={props.doneStep3}
        dropDown={state.streamEmployer.show_all_payers_in_easy_enroll}
        isDemo={!!props.isDemo}
      />
    );
  };

  const renderStep4_EnterCredentials = () => {
    if (!state.streamPayer || !state.streamTenant) return null;

    // Shared overlay node — rendered in BOTH the custom-render and
    // default-render branches so a custom form calling
    // toggleTermsOfUse() always gets the modal mounted on top.
    const termsOverlay = (
      <TermsOfUse
        open={state.termsOfUse}
        termsHtmlString={state.termsHtmlString || ''}
        onClose={() => toggleTermsOfUse()}
        doneTermsOfService={props.doneTermsOfService}
      />
    );

    if (props.renderPayerForm === false) {
      // Custom-render path: the integrator drives the credentials
      // form from the doneStep4 callback. We still mount TermsOfUse
      // so toggleTermsOfUse() in the integrator's callback renders
      // the modal as the public docs document.
      props.doneStep4?.({
        streamPayer: state.streamPayer,
        formJsonSchema: state.streamPayer.onboard_form,
        tenantTerms: state.streamTenant.terms_of_use,
        streamTenant: state.streamTenant,
        // Back-compat with 0.7.7 which surfaced `logoUrl` as a
        // top-level convenience field sourced from the *tenant* logo
        // (the deleted 0.7.7 test asserted logoUrl === tenant.logo_url).
        // Custom render-prop integrators that read it for tenant
        // branding keep working.
        logoUrl:
          (state.streamTenant as { logo_url?: string } | null)?.logo_url ??
          null,
        toggleTermsOfUse,
        returnToChoosePayer: setStep3,
        validateCreds,
        email: state.streamUser?.email
      });
      return termsOverlay;
    }
    // Default: render the credentials form with the terms overlay
    // portaled on top. EnterCredentials stays mounted underneath so
    // form state survives the round trip.
    return (
      <>
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
            inFixMode && state.policyHolderId !== null ? setStep2 : false
          }
          validateCreds={validateCreds}
          doneStep4={props.doneStep4}
          donePopUp={props.donePopUp}
        />
        {termsOverlay}
      </>
    );
  };

  const renderStep5_FinishedEasyEnroll = () => {
    // The realtime / 2FA inline branches that used to live in step 5
    // are gone — non-blocking validation is the only path now and is
    // rendered by ActiveValidationsHero (mounted at the SDK root) +
    // ActiveValidationsPanel (corner). Step 5 is the end widget only.
    if (!state.streamTenant || !state.streamUser || !state.streamEmployer) {
      return null;
    }
    // `credValid` is the canonical success/failure signal that the
    // end widget + the renderEndWidget=false callback both branch on.
    // With realTimeVerification disabled the SDK trusts the submit
    // unconditionally (legacy 0.7-era submit-and-trust path).
    const credValid = props.realTimeVerification
      ? state.credentialsValid
      : true;
    const returnFn = credValid
      ? restartProcess
      : () => setStep4({ payer: state.streamPayer || undefined });

    if (props.renderEndWidget === false) {
      // Custom-render path: integrator drives the end screen from
      // the doneEasyEnroll callback. We return an empty div so the
      // surrounding fragment still has a node.
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
  };

  const renderUnknownStep = () => (
    <Card>
      <Title order={3}>Failed to find an associated step</Title>
    </Card>
  );

  // The wizard step rendering is wrapped at the bottom in a fragment
  // alongside <ActiveValidationsPanel /> + <ValidationStreamRunner />.
  // Each renderStepN_* helper can return `null` when its required
  // state is missing (mid-flight data refresh, etc.); the `??`
  // fallback keeps the original behavior of dropping into the
  // "Failed to find an associated step" card so the UI never blanks.
  const renderWizard = () => {
    if (state.loading) return renderLoadingCard();
    if (state.step === -1) return renderConfigError();
    let rendered: ReactNode = null;
    if (state.step === 1) rendered = renderStep1_SelectEnrollProcess();
    else if (state.step === 2) rendered = renderStep2_FixCredentials();
    else if (state.step === 3) rendered = renderStep3_ChoosePayer();
    else if (state.step === 4) rendered = renderStep4_EnterCredentials();
    else if (state.step === 5) rendered = renderStep5_FinishedEasyEnroll();
    return rendered ?? renderUnknownStep();
  };

  return (
    <>
      {/* Hero mounted at SDK level so a validation hitting 2FA while
          the user is on SelectEnrollProcess / EnterCredentials /
          FinishedEasyEnroll still gets actionable UI. Previously the
          hero was inline-mounted in ChoosePayer / FixCredentials only,
          which left those other steps with a status-only panel and no
          way to enter the code. */}
      {useNonBlockingValidation && <ActiveValidationsHero />}
      {renderWizard()}
      {useNonBlockingValidation && state.streamUser && state.streamEmployer && (
        <ValidationStreamRunner
          email={state.streamUser.email}
          employerId={state.streamEmployer.id}
          onTerminal={(terminal) => {
            // Bridge to the 0.7-era doneEasyEnroll shape. Payload
            // mirrors the documented `{ employer, payer, tenant,
            // policyHolder, user, endingMessage, pending }` callback
            // surface from docs/client-usage.md so custom end-widget
            // code reading `payer.logo_url` etc. keeps working under
            // the default non-blocking flow. Without this, customers
            // relying on doneEasyEnroll for terminal notification
            // would silently stop receiving callbacks.
            props.doneEasyEnroll?.({
              policyHolder: {
                policy_holder_id: terminal.policyHolderId,
                payer_id: terminal.payerId,
                login_problem: terminal.loginProblem,
                login_needs_correction: !terminal.credentialsValid,
                login_correction_message: terminal.loginCorrectionMessage
              },
              payer: terminal.payer,
              employer: state.streamEmployer,
              tenant: state.streamTenant,
              user: state.streamUser,
              // Mirror the top-level `credentialsValid` field the
              // built-in end widget and the renderEndWidget={false}
              // callback path pass through. Integrations branching on
              // the final result get a consistent shape regardless of
              // whether they took the SSE non-blocking path or the
              // legacy submit-and-trust path.
              credentialsValid: terminal.credentialsValid,
              endingMessage: terminal.loginCorrectionMessage,
              pending: false
            });
          }}
        />
      )}
      {useNonBlockingValidation && <ActiveValidationsPanel />}
    </>
  );
};
