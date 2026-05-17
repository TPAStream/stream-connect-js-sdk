import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { type ZodTypeAny, z } from 'zod';
import type { StreamPayer, StreamPolicyHolder, StreamTenant } from '../types';
import { Alert } from '../ui/Alert';
import { BackButton } from '../ui/BackButton';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Checkbox } from '../ui/Checkbox';
import { PasswordInput } from '../ui/PasswordInput';
import { Stack } from '../ui/Stack';
import { TextInput } from '../ui/TextInput';
import { Text } from '../ui/Title';
import { InteroperabilityPayerForm } from './InteroperabilityPayerForm';
import { PayerInfo } from './PayerInfo';

interface EnterCredentialsProps {
  streamPayer: StreamPayer;
  streamPolicyHolder: StreamPolicyHolder | null;
  streamTenant: StreamTenant;
  tenantTerms: string | null;
  formData?: Record<string, unknown> | null;
  email: string;
  toggleTermsOfUse: (formData?: Record<string, unknown>) => void;
  enableInterop?: boolean;
  enableInteropSinglePage?: boolean;
  enablePatientAccessAPI?: boolean;
  enablePatientAccessAPISinglePage?: boolean;
  includePayerBlogs?: boolean;
  /** Customer-side UI schema overrides. The 0.7.x SDK forwarded this
   * to react-jsonschema-form, which had its own UI-schema language.
   * 0.8 uses React Hook Form + Zod; rjsf is gone. Any top-level
   * key/value pairs the customer sets here are folded into the
   * submission payload as extra fields (matching the most common
   * 0.7.x usage: injecting tenant-specific identifiers). A console
   * warning fires once per mount so integrators relying on rjsf
   * UI-schema rendering know their override won't paint controls. */
  userAddedUISchema?: Record<string, unknown>;
  returnToStep3?: false | (() => void);
  returnToStep2?: false | (() => void);
  validateCreds: (args: {
    params: Record<string, unknown>;
    errorCallBack: (data: { errorMessage?: string }) => void;
  }) => void;
  doneStep4?: (data?: unknown) => void;
  donePopUp?: () => void;
}

/**
 * Translate a single JSON Schema property into a Zod schema. The
 * carrier onboard_form schemas in production are uniformly simple —
 * string fields with optional enum / format. Anything more exotic
 * falls through as `z.any()` so the submit still succeeds.
 */
const propertyToZod = (
  // biome-ignore lint/suspicious/noExplicitAny: schema shape is dynamic
  property: any,
  isRequired: boolean
): ZodTypeAny => {
  let schema: ZodTypeAny;
  let isNumericCoerce = false;
  if (property?.enum && Array.isArray(property.enum)) {
    schema = z.string();
  } else {
    switch (property?.type) {
      case 'boolean':
        schema = z.boolean();
        break;
      case 'integer':
      case 'number':
        // Pre-validate the raw input string before coercion. An empty
        // input field arrives as "" which z.coerce.number() turns into
        // 0, bypassing the isRequired check below. Reject empties up
        // front (and surface the same "Required" message the string
        // branch uses) so a blank required numeric field can't slip
        // through with a 0 value.
        schema = z.coerce.number();
        isNumericCoerce = true;
        break;
      default:
        schema = z.string();
    }
  }
  if (!isRequired) {
    if (isNumericCoerce) {
      // Optional numeric: an untouched HTML input arrives as "" which
      // z.coerce.number() turns into 0. Without the preprocess, the
      // submission would include a literal 0 for a field the user
      // never touched. Treat empty/whitespace as "not provided" by
      // mapping to undefined before piping through the coerce.
      schema = z.preprocess(
        (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
        z.coerce.number().optional()
      );
    } else {
      schema = schema.optional();
    }
  } else if (schema instanceof z.ZodString) {
    schema = schema.min(1, 'Required');
  } else if (isNumericCoerce) {
    // Required numeric: layer a raw-string preflight so empty inputs
    // fail with 'Required' instead of being silently coerced to 0.
    schema = z.string().min(1, 'Required').pipe(z.coerce.number());
  }
  return schema;
};

interface FormState {
  fields: Array<{
    key: string;
    title: string;
    type: 'text' | 'password' | 'select' | 'checkbox';
    options?: string[];
    placeholder?: string;
  }>;
  zodSchema: z.ZodTypeAny;
}

const buildFormFromOnboardSchema = (payer: StreamPayer): FormState => {
  const schemaObj = payer.onboard_form?.schema as
    | { properties?: Record<string, unknown>; required?: string[] }
    | undefined;
  const properties = schemaObj?.properties || {};
  // Standard JSON Schema puts required field names in a top-level
  // `required: [...]` array. rjsf also allows `required: true` on
  // individual property objects (non-standard). Honor BOTH so existing
  // carrier schemas authored under either convention keep validating
  // required fields in 0.8.
  const schemaRequired = Array.isArray(schemaObj?.required)
    ? new Set(schemaObj.required)
    : new Set<string>();
  const requiredKeys = new Set<string>();
  const shape: Record<string, ZodTypeAny> = {};
  const fields: FormState['fields'] = [];

  for (const [key, prop] of Object.entries(properties)) {
    // biome-ignore lint/suspicious/noExplicitAny: property is dynamic
    const p = prop as any;
    const isRequired =
      schemaRequired.has(key) ||
      (p?.required !== undefined ? !!p.required : false);
    if (isRequired) requiredKeys.add(key);
    shape[key] = propertyToZod(p, isRequired);

    let type: FormState['fields'][number]['type'] = 'text';
    if (p?.format === 'password' || key.toLowerCase().includes('password')) {
      type = 'password';
    } else if (p?.enum && Array.isArray(p.enum)) {
      type = 'select';
    } else if (p?.type === 'boolean') {
      type = 'checkbox';
    }

    fields.push({
      key,
      title: p?.title || key,
      type,
      options: type === 'select' ? p.enum : undefined
    });
  }

  // Honor `ui:order` from the carrier's onboard_ui_schema (rjsf
  // convention; backend forms ship this — see e.g. stream/forms/kaiser.py
  // `"ui:order": ["username", "password", "*"]`). The `*` is a wildcard
  // for "any field not explicitly listed, in their existing order."
  // Without this sort, fields render in JSON-deserialization order,
  // which puts password before username on most carriers.
  const uiOrder = payer.onboard_ui_schema?.['ui:order'];
  if (uiOrder && uiOrder.length > 0) {
    const explicit = uiOrder.filter((k): k is string => k !== '*');
    const wildcardIdx = uiOrder.indexOf('*');
    const explicitSet = new Set(explicit);
    const explicitFields = explicit
      .map((k) => fields.find((f) => f.key === k))
      .filter((f): f is FormState['fields'][number] => !!f);
    const remaining = fields.filter((f) => !explicitSet.has(f.key));
    if (wildcardIdx === -1) {
      // No wildcard — explicit fields first, anything else trailing.
      fields.length = 0;
      fields.push(...explicitFields, ...remaining);
    } else {
      // Wildcard slot exists — splice remaining fields where it sits.
      const before = explicit.slice(0, wildcardIdx);
      const after = explicit.slice(wildcardIdx);
      const beforeFields = before
        .map((k) => fields.find((f) => f.key === k))
        .filter((f): f is FormState['fields'][number] => !!f);
      const afterFields = after
        .map((k) => fields.find((f) => f.key === k))
        .filter((f): f is FormState['fields'][number] => !!f);
      fields.length = 0;
      fields.push(...beforeFields, ...remaining, ...afterFields);
    }
  }

  // Mandatory terms & tenant-acknowledgement fields the legacy SDK
  // injected via AdditionalSchema().
  shape.termsAndServices = z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms and services.' })
  });
  shape.tenantAcknowledgement = z.literal(true, {
    errorMap: () => ({
      message: 'You must acknowledge that claims will be sent to the tenant.'
    })
  });

  return {
    fields,
    zodSchema: z.object(shape)
  };
};

export const EnterCredentials = (props: EnterCredentialsProps) => {
  const {
    streamPayer,
    streamPolicyHolder,
    streamTenant,
    tenantTerms,
    formData,
    enableInterop,
    enableInteropSinglePage,
    enablePatientAccessAPI,
    enablePatientAccessAPISinglePage,
    includePayerBlogs,
    returnToStep3,
    returnToStep2,
    donePopUp
  } = props;

  const usePAASingle =
    enablePatientAccessAPISinglePage ?? enableInteropSinglePage;
  // PAA is enabled if EITHER the base flag is truthy OR the single-page
  // flag is truthy. Plain truthiness OR (not `??`) here is intentional:
  // a `??` chain short-circuits on `enablePatientAccessAPI: false` and
  // never checks single-page, so passing `false` for the base flag
  // would block single-page from enabling PAA. The docs say single-page
  // can be passed instead of base, so it should always win when truthy.
  const usePAA = !!(enablePatientAccessAPI ?? enableInterop) || !!usePAASingle;

  // One-time warning: rjsf-shaped UI overrides won't render in 0.8.
  // Plain key/value pairs still fold into the submission payload.
  const warnedAboutUserSchema = useRef(false);
  if (
    props.userAddedUISchema &&
    Object.keys(props.userAddedUISchema).length > 0 &&
    !warnedAboutUserSchema.current
  ) {
    warnedAboutUserSchema.current = true;
    console.warn(
      '[stream-connect-sdk] `userSchema` is forwarded into the submission payload but no longer drives form rendering (rjsf was removed in 0.8). If you depended on UI-schema-driven extra fields, file an issue.'
    );
  }

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Build the form state once per streamPayer.
  const formState = streamPayer?.onboard_form
    ? buildFormFromOnboardSchema(streamPayer)
    : null;

  const suggestedUsername =
    (formData?.username as string) || streamPolicyHolder?.username || '';

  type FormValues = Record<string, unknown>;
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    getValues
  } = useForm<FormValues>({
    resolver: formState ? zodResolver(formState.zodSchema) : undefined,
    defaultValues: {
      // Spread saved formData LAST so a Terms-of-Use round trip's
      // captured values win over the static defaults. Without this,
      // the checkbox defaults would overwrite a user's checked state
      // when they return from the terms view.
      username: suggestedUsername,
      termsAndServices: false,
      tenantAcknowledgement: false,
      ...(formData || {})
    }
  });

  useEffect(() => {
    if (!streamPayer) return;
    // Match the legacy 0.7.x doneCreatedForm/doneStep4 payload shape
    // that custom render-prop integrators read from. Even when the
    // built-in form renders (renderPayerForm: true), customers wire
    // this callback for analytics, styling hooks, or to read the
    // schema. Sending only { streamPayer } would silently drop the
    // legacy contract.
    //
    // Fire for PAA carriers too: they don't have an `onboard_form`
    // (auth happens via redirect, not an inline form) but the SDK
    // still renders the PAA consent form below, and existing
    // integrations hooking doneCreatedForm for lifecycle tracking
    // should be notified for those carriers as well. formJsonSchema
    // is undefined in the PAA case.
    props.doneStep4?.({
      streamPayer,
      formJsonSchema: streamPayer.onboard_form,
      tenantTerms,
      streamTenant,
      toggleTermsOfUse: props.toggleTermsOfUse,
      returnToChoosePayer: returnToStep3 || (() => {}),
      validateCreds: props.validateCreds,
      email: props.email
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamPayer]);

  // PAA carriers authenticate via redirect and don't ship an
  // onboard_form (there's no inline credentials form to render). Don't
  // short-circuit them to the "carrier unavailable" alert; the
  // InteroperabilityPayerForm branch below handles them.
  // Reuse the same usePAA derivation as above: either the base flag,
  // its legacy alias, or the single-page variant counts as "PAA on".
  const wantsPAARedirect =
    !!streamPayer && !!usePAA && !!streamPayer.supports_interoperability_apis;
  if (!streamPayer || (!streamPayer.onboard_form && !wantsPAARedirect)) {
    return (
      <Card>
        <Alert variant="warning" title="Carrier unavailable">
          This account's carrier isn't available in this widget. Please contact
          your administrator.
        </Alert>
      </Card>
    );
  }

  const onSubmit = (values: FormValues) => {
    setSubmitting(true);
    setErrorMessage(null);
    const params = {
      // Customer-supplied extras land first; carrier form values land
      // next; canonical SDK-controlled fields are spread LAST so they
      // can't be overwritten by either source. A carrier schema with a
      // `payer_id` / `accept` / `tenants_accept` field would otherwise
      // clobber the SDK's value via the trailing `...values`.
      ...(props.userAddedUISchema || {}),
      ...values,
      username: values.username,
      password: values.password,
      date_of_birth: values.dateOfBirth || null,
      payer_id: streamPayer.id,
      accept: values.termsAndServices,
      tenants_accept: [values.tenantAcknowledgement]
    };
    props.validateCreds({
      params,
      errorCallBack: ({ errorMessage }) => {
        setSubmitting(false);
        if (errorMessage) setErrorMessage(errorMessage);
      }
    });
  };

  return (
    <Stack gap="md" id="easy-enroll-form-page">
      {(returnToStep3 || returnToStep2) && (
        <BackButton onClick={(returnToStep3 || returnToStep2) as () => void} />
      )}

      {errorMessage && (
        // Title omitted on purpose. The hardcoded "Couldn't connect"
        // string fit network failures but misled for account-conflict
        // errors (e.g. "this sign-in is already linked"); the backend's
        // message is descriptive enough on its own. If we add a title
        // later it should be derived from the error class on the wire,
        // not pinned in the SDK.
        <Alert variant="danger">{errorMessage}</Alert>
      )}

      {streamPolicyHolder?.login_correction_message && (
        <Alert variant="warning">
          {streamPolicyHolder.login_correction_message}
        </Alert>
      )}

      <Card>
        <Stack gap="lg">
          <PayerInfo
            payer={streamPayer}
            donePopUp={donePopUp}
            includePayerBlogs={includePayerBlogs}
          />

          {usePAA && streamPayer.supports_interoperability_apis ? (
            <InteroperabilityPayerForm
              streamPayer={streamPayer}
              streamTenant={streamTenant}
              tenantTerms={tenantTerms}
              email={props.email}
              enablePatientAccessAPISinglePage={usePAASingle}
              // Pass saved checkbox state through both directions so a
              // Terms-of-Use round trip preserves the user's selections.
              // The PAA form has its own local checkbox state (not RHF)
              // so we plumb the pair via formData like the regular form.
              initialTenantAccept={!!formData?.tenantAccept}
              initialTpastreamTermsAccept={!!formData?.tpastreamTermsAccept}
              handleTermsClick={(currentState) =>
                props.toggleTermsOfUse(currentState)
              }
              validateCreds={props.validateCreds}
              handlePostError={({ errorMessage }) =>
                setErrorMessage(errorMessage)
              }
            />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} id="easy-enroll-form">
              <Stack gap="md">
                {formState!.fields
                  .filter((f) => f.key !== 'showPassword')
                  .map((field) => {
                    if (field.type === 'password') {
                      return (
                        <PasswordInput
                          key={field.key}
                          label={field.title}
                          autoComplete="current-password"
                          {...register(field.key)}
                          error={
                            errors[field.key]?.message as string | undefined
                          }
                        />
                      );
                    }
                    if (field.type === 'select' && field.options) {
                      const selectId = `tpa-select-${field.key}`;
                      const selectErrorId = `${selectId}-error`;
                      const selectError = errors[field.key]?.message as
                        | string
                        | undefined;
                      return (
                        <div key={field.key}>
                          <label
                            htmlFor={selectId}
                            className="tpa-block tpa-text-sm tpa-font-medium tpa-text-slate-700 tpa-mb-1.5"
                          >
                            {field.title}
                          </label>
                          <select
                            id={selectId}
                            {...register(field.key)}
                            aria-invalid={selectError ? true : undefined}
                            aria-describedby={
                              selectError ? selectErrorId : undefined
                            }
                            className="tpa-w-full tpa-rounded-md tpa-border tpa-border-slate-300 tpa-px-3 tpa-py-2.5 focus:tpa-outline-none focus-visible:tpa-border-primary-500 focus-visible:tpa-ring-2 focus-visible:tpa-ring-primary-500"
                          >
                            <option value="">Select…</option>
                            {field.options.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                          {selectError && (
                            <p
                              id={selectErrorId}
                              className="tpa-mt-1.5 tpa-text-sm tpa-text-red-600"
                              role="alert"
                            >
                              {selectError}
                            </p>
                          )}
                        </div>
                      );
                    }
                    if (field.type === 'checkbox') {
                      return (
                        <Controller
                          key={field.key}
                          control={control}
                          name={field.key}
                          render={({ field: rhfField }) => (
                            <Checkbox
                              label={field.title}
                              checked={!!rhfField.value}
                              onChange={(e) =>
                                rhfField.onChange(e.target.checked)
                              }
                              error={
                                errors[field.key]?.message as string | undefined
                              }
                            />
                          )}
                        />
                      );
                    }
                    return (
                      <TextInput
                        key={field.key}
                        label={field.title}
                        autoComplete={
                          field.key === 'username' ? 'username' : undefined
                        }
                        {...register(field.key)}
                        error={errors[field.key]?.message as string | undefined}
                      />
                    );
                  })}

                {/*
                  Keyboard-accessible Terms-of-Use trigger. The inline
                  link inside the checkbox label below is tabIndex={-1}
                  to keep the typed-field → checkbox → checkbox → submit
                  flow smooth, but keyboard-only users still need a way
                  to OPEN the terms before consenting. This dedicated
                  button sits between the credential fields and the
                  consent checkbox so it lands naturally in the tab
                  order, and serves the same `props.toggleTermsOfUse`.
                */}
                <button
                  type="button"
                  onClick={() => props.toggleTermsOfUse(getValues())}
                  className="tpa-self-start tpa-text-sm tpa-text-primary-600 tpa-underline focus-visible:tpa-outline-none focus-visible:tpa-ring-2 focus-visible:tpa-ring-primary-500 focus-visible:tpa-rounded"
                >
                  View Terms of Use
                </button>

                <Controller
                  control={control}
                  name="termsAndServices"
                  render={({ field }) => (
                    <Checkbox
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      error={
                        errors.termsAndServices?.message as string | undefined
                      }
                      // Plain text label, no nested interactive
                      // element. A `<button>` inside the `<label>`
                      // produced by Checkbox is invalid interactive-
                      // content nesting and causes inconsistent
                      // mouse / AT activation (clicking the button can
                      // also toggle the checkbox depending on the
                      // browser). The dedicated "View Terms of Use"
                      // button rendered above this checkbox is the
                      // keyboard / mouse / AT entry point for opening
                      // the modal.
                      label="I have read and agree to the Terms of Use."
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="tenantAcknowledgement"
                  render={({ field }) => (
                    <Checkbox
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      error={
                        errors.tenantAcknowledgement?.message as
                          | string
                          | undefined
                      }
                      label={
                        <>
                          {streamTenant.terms_of_use &&
                          streamTenant.terms_of_use.length > 0
                            ? `I have read and agree to the Terms of Use for ${streamTenant.terms_of_use_message || streamTenant.name} and `
                            : ''}
                          I acknowledge that my claims will be automatically
                          sent to{' '}
                          {streamTenant.terms_of_use_message ||
                            streamTenant.name}
                          .
                        </>
                      }
                    />
                  )}
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
                  loading={submitting}
                  disabled={submitting}
                >
                  Validate credentials for {streamPayer.name}
                </Button>
                {streamPayer.redirect_vendor_name && (
                  <Text size="xs" color="muted" className="tpa-text-center">
                    Powered by {streamPayer.redirect_vendor_name}
                  </Text>
                )}
              </Stack>
            </form>
          )}
        </Stack>
      </Card>
    </Stack>
  );
};
