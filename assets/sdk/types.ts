/**
 * Wire-format types for objects that come back from sdk-api.
 *
 * These mirror what the Flask sdk-api endpoints return — keys stay
 * snake_case because customer code that uses `renderPayerForm` /
 * `renderChoosePayer` / `renderEndWidget` reads these fields directly,
 * and renaming them would be a breaking change. We add a small set of
 * client-side helpers (`loginProblemIsValid`) but otherwise preserve
 * the on-the-wire shape.
 */

export interface StreamUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  policy_holders: StreamPolicyHolderShort[];
}

export interface StreamPolicyHolderShort {
  id: number;
  payer_id: number;
  username: string;
  login_problem: string | null;
  login_needs_correction: boolean;
  payer?: { logo_url: string; name: string; payer_group_id: number | null };
  /** Reattach hints for in-flight validation. Present on the
   * policy_holders included in the tpastream_sdk init response when
   * the PH has an active validate-credentials task in flight. The
   * SDK uses these to resume mid-validation after a page reload. */
  task_id?: string | null;
  task_token?: string | null;
  /** ISO timestamp of the most recent successful crawl, or null if
   * the PH has never crawled cleanly. Used to render "Last synced:
   * 3 hours ago" alongside login_problem so a recent successful sync
   * doesn't get displayed as if the PH were broken. */
  last_successful_crawl_end?: string | null;
  /** ISO timestamp of when the PH row was created. Used to group
   * just-added PHs into a "Recently added" section. NOT a "last
   * touched" / activity signal — for that, use
   * `last_successful_crawl_end`. */
  createddate?: string | null;
}

/** Login problems that genuinely require user attention vs. ones
 * that flag attention but aren't really broken. Used by the SDK to
 * pick severity colors so a `needs_two_factor` PH that crawled
 * successfully 2 hours ago doesn't display as a critical failure. */
export const CRITICAL_LOGIN_PROBLEMS: ReadonlySet<string> = new Set([
  'invalid',
  'invalid_username_format',
  'locked',
  'broken',
  'invalid_interop_token'
]);

export const WARNING_LOGIN_PROBLEMS: ReadonlySet<string> = new Set([
  'incomplete',
  'needs_two_factor',
  'sec_question',
  'wrong_secondary',
  'mfa_carrier',
  'migrating'
]);

export interface StreamPolicyHolder extends StreamPolicyHolderShort {
  login_correction_message?: string | null;
  loginProblemIsValid: () => boolean;
  demo?: boolean;
}

export interface StreamPayer {
  id: number;
  name: string;
  logo_url: string;
  payer_group_id: number | null;
  redirect_vendor_name: string | null;
  has_security_questions: boolean;
  website_home_url_netloc: string;
  register_url: string;
  supports_interoperability_apis: boolean;
  interoperability_authorization_url?: string;
  blogs?: { article: string }[];
  onboard_form?: {
    schema: { properties: Record<string, OnboardFormProperty> };
  };
  onboard_ui_schema?: OnboardUiSchema;
}

/**
 * Subset of the react-jsonschema-form ui-schema shape that we
 * actually consume. The legacy SDK passed the whole blob to rjsf,
 * which read a much wider vocabulary (`ui:widget`, `ui:options`,
 * per-field overrides, etc.). Our port only honors `ui:order` —
 * other keys are tolerated (the index signature) but not interpreted.
 *
 * `ui:order` follows the rjsf convention: an array of field keys in
 * display order, with optional `'*'` as a wildcard meaning "any
 * other field not explicitly listed, in their natural order at this
 * position." Examples in stream/forms/:
 *   ["username", "password", "*"]
 *   ["dateOfBirth", "ssn", "*", "consent"]
 */
export interface OnboardUiSchema {
  'ui:order'?: ReadonlyArray<string | '*'>;
  // Per-field rjsf overrides (ui:widget, ui:options, etc.) live under
  // sibling keys. We don't read them today, but the index signature
  // keeps the type permissive for forwards compat.
  [field: string]: unknown;
}

export interface OnboardFormProperty {
  type: string;
  title?: string;
  required?: boolean;
  format?: string;
  default?: unknown;
  enum?: unknown[];
  // The legacy SDK referenced `properties[key].form.type` for the
  // password show/hide flip. We don't bother modelling that — the new
  // password input handles show/hide internally.
  form?: { type: string };
}

export interface StreamTenant {
  id: number;
  name: string;
  terms_of_use: string | null;
  terms_of_use_message?: string | null;
}

export interface StreamEmployer {
  id: number;
  name: string;
  support_email_derived: string;
  show_all_payers_in_easy_enroll: boolean;
  payers: { id: number }[];
}

export interface ValidateCredsResponse {
  state:
    | 'PENDING'
    | 'SUCCESS'
    | 'FAILURE'
    | 'WAITING_FOR_METHOD_CHOICE'
    | 'WAITING_FOR_TWO_FACTOR_CODE'
    | 'TRIGGERING_TWO_FACTOR_AUTH'
    | 'ENTERING_CODE'
    | 'TWO_FACTOR_AUTH_COMPLETE';
  credentials_are_valid?: boolean | null;
  message?: string;
  info?: { method_list?: string[] };
}

export const VALID_LOGIN_PROBLEMS: ReadonlySet<string> = new Set([
  'valid',
  'incomplete',
  'inactive',
  'mfa_carrier',
  'migrating',
  'needs_two_factor'
]);
