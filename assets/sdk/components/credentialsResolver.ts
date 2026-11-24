import type { FieldErrors, Resolver } from 'react-hook-form';

/**
 * Validation for the carrier credential form (EnterCredentials).
 *
 * Until 0.8.6 this form was validated by a zod schema built at render
 * time from the carrier's `onboard_form.schema`. zod was the SDK's only
 * runtime dependency with an open advisory, and the form needs four
 * rules, so this module replaces it. It keeps zod 3's behaviour for
 * every rule the form used, including the visible error messages and
 * the stripping of keys the schema does not name.
 */

export type FieldRule =
  /** Text, password, date and select fields. */
  | { kind: 'string'; required: boolean }
  | { kind: 'boolean'; required: boolean }
  /** `type: integer | number` properties; the input value is a string. */
  | { kind: 'number'; required: boolean }
  /** A checkbox that must be ticked, with its own error message. */
  | { kind: 'mustBeTrue'; message: string };

export type CredentialsRules = Record<string, FieldRule>;

export type FormValues = Record<string, unknown>;

export interface FieldError {
  type: string;
  message: string;
}

export const TERMS_MESSAGE = 'You must agree to the terms and services.';
export const TENANT_ACK_MESSAGE =
  'You must acknowledge that claims will be sent to the tenant.';

/** The two consent checkboxes every carrier form carries. */
export const consentRules: CredentialsRules = {
  termsAndServices: { kind: 'mustBeTrue', message: TERMS_MESSAGE },
  tenantAcknowledgement: { kind: 'mustBeTrue', message: TENANT_ACK_MESSAGE }
};

/**
 * Translate one JSON Schema property into a rule. The carrier
 * onboard_form schemas in production are uniformly simple: string
 * fields with an optional enum or format. An enum is always a string
 * (a select). Anything else that is not boolean or numeric is treated
 * as a string, as before.
 */
export const propertyToRule = (
  // biome-ignore lint/suspicious/noExplicitAny: schema shape is dynamic
  property: any,
  required: boolean
): FieldRule => {
  if (property?.enum && Array.isArray(property.enum)) {
    return { kind: 'string', required };
  }
  switch (property?.type) {
    case 'boolean':
      return { kind: 'boolean', required };
    case 'integer':
    case 'number':
      return { kind: 'number', required };
    default:
      return { kind: 'string', required };
  }
};

/** zod 3's name for the type of a value, used in "Expected X, received Y". */
const typeName = (v: unknown): string => {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isNaN(v) ? 'nan' : 'number';
  if (v instanceof Date) return 'date';
  if (v instanceof Map) return 'map';
  if (v instanceof Set) return 'set';
  if (v instanceof Promise) return 'promise';
  return typeof v;
};

/** zod 3 says "Required" when the value is missing altogether. */
const invalidType = (expected: string, v: unknown): FieldError => ({
  type: 'invalid_type',
  message:
    v === undefined
      ? 'Required'
      : `Expected ${expected}, received ${typeName(v)}`
});

const REQUIRED: FieldError = { type: 'too_small', message: 'Required' };

type Outcome = { ok: true; value: unknown } | { ok: false; error: FieldError };

const toNumber = (v: unknown): Outcome => {
  const n = Number(v);
  return Number.isNaN(n)
    ? { ok: false, error: invalidType('number', n) }
    : { ok: true, value: n };
};

const checkField = (rule: FieldRule, v: unknown): Outcome => {
  switch (rule.kind) {
    case 'mustBeTrue':
      return v === true
        ? { ok: true, value: true }
        : {
            ok: false,
            error: { type: 'invalid_literal', message: rule.message }
          };
    case 'boolean':
      if (v === undefined && !rule.required) return { ok: true, value: v };
      return typeof v === 'boolean'
        ? { ok: true, value: v }
        : { ok: false, error: invalidType('boolean', v) };
    case 'string':
      if (v === undefined && !rule.required) return { ok: true, value: v };
      if (typeof v !== 'string') {
        return { ok: false, error: invalidType('string', v) };
      }
      if (rule.required && v.length < 1) return { ok: false, error: REQUIRED };
      return { ok: true, value: v };
    case 'number':
      if (rule.required) {
        // The raw input must be a non-empty string before it is turned
        // into a number, so a blank field fails instead of becoming 0.
        if (typeof v !== 'string') {
          return { ok: false, error: invalidType('string', v) };
        }
        if (v.length < 1) return { ok: false, error: REQUIRED };
        return toNumber(v);
      }
      // Optional: a blank input means "not provided", not 0.
      if (v === undefined || (typeof v === 'string' && v.trim() === '')) {
        return { ok: true, value: undefined };
      }
      return toNumber(v);
  }
};

/**
 * Check `values` against `rules`. On success `values` holds only the
 * keys the rules name (numbers converted); on failure it is empty and
 * `errors` holds one error per failing field.
 */
export const validateCredentials = (
  values: FormValues,
  rules: CredentialsRules
): { values: FormValues; errors: Record<string, FieldError> } => {
  const out: FormValues = {};
  const errors: Record<string, FieldError> = {};
  for (const [key, rule] of Object.entries(rules)) {
    const result = checkField(rule, values[key]);
    if (!result.ok) {
      errors[key] = result.error;
    } else if (result.value !== undefined || key in values) {
      out[key] = result.value;
    }
  }
  if (Object.keys(errors).length > 0) return { values: {}, errors };
  return { values: out, errors };
};

/** A react-hook-form resolver for the carrier credential form. */
export const credentialsResolver =
  (rules: CredentialsRules): Resolver<FormValues> =>
  (values, _context, options) => {
    const result = validateCredentials(values, rules);
    const errorKeys = Object.keys(result.errors);
    if (errorKeys.length === 0) return { values: result.values, errors: {} };
    const errors: FieldErrors<FormValues> = {};
    for (const key of errorKeys) {
      const error = result.errors[key] as FieldError;
      errors[key] = { ...error, ref: options?.fields?.[key]?.ref };
    }
    return { values: {}, errors };
  };
