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
  radius?: 'sm' | 'md' | 'lg';
}

export interface SDKInitOptions {
  /** CSS selector for the mount element. */
  el: string;

  // Auth
  apiToken?: string;
  sdkToken?: string;
  connectAccessToken?: string;

  // Identity
  tenant?: InitTenant;
  employer?: InitEmployer;
  user?: InitUser;

  // Behavior
  realTimeVerification?: boolean;
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
  fixCredentials?: boolean;

  /** @deprecated Use `enablePatientAccessAPI`. */
  enableInterop?: boolean;
  /** @deprecated Use `enablePatientAccessAPISinglePage`. */
  enableInteropSinglePage?: boolean;
  enablePatientAccessAPI?: boolean;
  enablePatientAccessAPISinglePage?: boolean;

  forceEndStep?: number;
  entrySdkStateId?: string;
  webViewDelegation?: boolean;
  userSchema?: object;
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
  maxRetries?: number;

  /** Override for tests + the /sdk-test sandbox. */
  _overrideBaseUrl?: string;
}
