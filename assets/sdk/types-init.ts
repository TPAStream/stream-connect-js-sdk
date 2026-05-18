/**
 * Init() option types. Kept in a sibling file from types.ts because
 * the axios layer depends on a tiny subset of these and pulling in the
 * full Stream* types would be circular.
 */

export interface InitTenant {
  systemKey: string;
  vendor: string;
}

export interface InitEmployer {
  systemKey: string;
  vendor: string;
  name: string;
}

export interface InitUser {
  firstName: string;
  lastName: string;
  email: string;
  memberSystemKey?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
}

export interface InitTheme {
  primaryColor?: string;
}

export interface SDKInitOptions {
  /** CSS selector for the mount element. */
  el: string;

  // Auth
  apiToken?: string;
  sdkToken?: string;
  connectAccessToken?: string;
  /** Optional async hook for refreshing an expired `connectAccessToken`
   * without a page reload. The backend mints these short-lived tokens
   * server-side (default ~60 min TTL, see Connect Access Token docs);
   * when a member leaves the SDK page open past that window and comes
   * back, the next API call gets a 422 with
   * `error_code: "expired_connect_token"`. If this hook is provided,
   * the SDK calls it, swaps the returned string into the axios
   * `X-Connect-Access-Token` header, and retries the failed request
   * transparently. If it's not provided (or it rejects), the SDK
   * dispatches a `tpastream-connect-token-expired` CustomEvent on
   * `window` and surfaces the error to the existing
   * `handleFormErrors` / `handleInitErrors` callbacks. */
  connectAccessTokenRefreshFn?: () => Promise<string>;
  /** Fires once when the SDK detects an expired connect token AND
   * either no `connectAccessTokenRefreshFn` was provided or it
   * rejected. Use to show a "session expired, please reload" UI in
   * the host page. The same signal is also dispatched as a
   * `tpastream-connect-token-expired` CustomEvent on `window` for
   * integrations that prefer a global listener. */
  onConnectAccessTokenExpired?: () => void;

  // Identity
  tenant?: InitTenant;
  employer?: InitEmployer;
  user?: InitUser;

  // Behavior
  realTimeVerification?: boolean;
  /** @deprecated Was the polling-loop timeout in the 0.7.x SDK. The
   * 0.8 SDK uses SSE with a server-side stream deadline; this option
   * is accepted for back-compat but no longer affects timing. */
  realtimeTimeout?: number;
  /** Default true — render the choose-payer step inline. Pass false
   * to receive a callback in `doneStep3` and render it yourself. */
  renderChoosePayer?: boolean;
  /** Default true — same shape but for the credentials form. */
  renderPayerForm?: boolean;
  /** Default true — same shape but for the end widget. */
  renderEndWidget?: boolean;
  includePayerBlogs?: boolean;
  isDemo?: boolean;
  /** @deprecated Removed in 0.8. Member-portal mode is now derived
   * automatically from the presence of `connectAccessToken` (the
   * backend `/sdk-api/fix-credentials` endpoint requires that token,
   * so token presence was always the de-facto gate). The legacy flag
   * is still accepted at init() time for back-compat and ignored;
   * passing it logs a one-time deprecation warning. */
  fixCredentials?: boolean;

  /** @deprecated Use `enablePatientAccessAPI`. */
  enableInterop?: boolean;
  /** @deprecated Use `enablePatientAccessAPISinglePage`. */
  enableInteropSinglePage?: boolean;
  /** Default `true` in 0.8. When on, PAA-routed payers (those with
   * `supports_interoperability_apis: true` on the payer row — Anthem,
   * UHC Interop, Kaiser Interop, Empire BCBS API, etc.) take the
   * OAuth-popup branch via `InteroperabilityPayerForm`. When off,
   * those same payers fall through to the raw `interoperability.OnBoard`
   * schema which exposes `interoperability_refresh_token` as a user-
   * visible text input — meaningless to a real user since the OAuth
   * callback is what populates that field server-side. Pass `false`
   * to keep the legacy behavior (rare; only if your integration is
   * deliberately bypassing PAA). */
  enablePatientAccessAPI?: boolean;
  /** Default `false`. When on, the OAuth redirect for PAA payers
   * navigates the host page directly to the carrier instead of opening
   * a popup; the carrier redirects back via `?accessToken=...` on the
   * SDK's page. Intended for SPA hosts that can preserve their state
   * across the redirect (and that have a server-side callback to
   * exchange the code). Defaulting this on would silently lose the
   * host page state for popup-flow customers, so it stays opt-in. */
  enablePatientAccessAPISinglePage?: boolean;

  /** Accepts boolean (legacy 0.7.x signature — true → end widget) or
   * number (specific step to land on, typically 5 for the FinishedEasyEnroll
   * widget). The boolean form is preserved for back-compat with existing
   * `forceEndStep: true` integrations and is treated as truthy → 5. */
  forceEndStep?: boolean | number;
  entrySdkStateId?: string;
  webViewDelegation?: boolean;
  userSchema?: Record<string, unknown>;
  theme?: InitTheme;

  // Lifecycle callbacks
  doneGetSDK?: (data: unknown) => void;
  doneSelectEnrollProcess?: (props?: unknown) => void;
  doneFixCredentials?: (props?: unknown) => void;
  doneChoosePayer?: (props?: unknown) => void;
  doneTermsOfService?: () => void;
  donePopUp?: () => void;
  doneCreatedForm?: (props?: unknown) => void;
  donePostCredentials?: (params?: unknown) => void;
  doneRealTime?: () => void;
  doneEasyEnroll?: (data: unknown) => void;
  handleFormErrors?: (error: unknown, ctx?: unknown) => void;
  handleInitErrors?: (error: unknown) => void;

  // Legacy callback names (still wired for back-compat)
  doneStep1?: (props?: unknown) => void;
  doneStep2?: (props?: unknown) => void;
  doneStep3?: (data?: unknown) => void;
  doneStep4?: (data?: unknown) => void;
  doneRealtime?: () => void;
  /** @deprecated Was the retry count for the 0.7.x polling validation
   * loop. The 0.8 SDK uses SSE with no client-side retry knob; this
   * option is accepted for back-compat but no longer affects behavior. */
  maxRetries?: number;

  /** Override for tests + the /sdk-test sandbox. */
  _overrideBaseUrl?: string;
}
