import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  type CredentialsRules,
  TENANT_ACK_MESSAGE,
  TERMS_MESSAGE,
  consentRules,
  credentialsResolver,
  propertyToRule,
  validateCredentials
} from './credentialsResolver.ts';

// Run with `npm run test:unit` (node --test). Node strips the types.

// A carrier form like the ones in production: required username and
// password, a required date of birth, a required plan select, and an
// optional member id.
const rules: CredentialsRules = {
  username: propertyToRule({ type: 'string' }, true),
  password: propertyToRule({ type: 'string', format: 'password' }, true),
  date_of_birth: propertyToRule({ type: 'string', format: 'date' }, true),
  plan: propertyToRule({ type: 'string', enum: ['PPO', 'HMO'] }, true),
  member_id: propertyToRule({ type: 'string' }, false),
  ...consentRules
};

const valid = {
  username: 'member',
  password: 'secret',
  date_of_birth: '1980-02-03',
  plan: 'PPO',
  member_id: '',
  termsAndServices: true,
  tenantAcknowledgement: true
};

const errorsFor = (values: Record<string, unknown>) =>
  validateCredentials(values, rules).errors;

test('all valid returns the values and no errors', () => {
  const result = validateCredentials(valid, rules);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.values, valid);
});

test('a required field left empty says Required', () => {
  const errors = errorsFor({ ...valid, username: '' });
  assert.deepEqual(Object.keys(errors), ['username']);
  assert.equal(errors.username?.message, 'Required');
});

test('a required field that is missing says Required', () => {
  const { username: _, ...rest } = valid;
  assert.equal(errorsFor(rest).username?.message, 'Required');
});

test('a required field that is filled passes', () => {
  assert.equal(errorsFor({ ...valid, username: 'x' }).username, undefined);
});

test('an optional field may be empty, missing or filled', () => {
  assert.equal(errorsFor({ ...valid, member_id: '' }).member_id, undefined);
  assert.equal(errorsFor({ ...valid, member_id: 'A1' }).member_id, undefined);
  const { member_id: _, ...rest } = valid;
  const result = validateCredentials(rest, rules);
  assert.deepEqual(result.errors, {});
  assert.equal('member_id' in result.values, false);
});

test('a required date field must be filled', () => {
  assert.equal(
    errorsFor({ ...valid, date_of_birth: '' }).date_of_birth?.message,
    'Required'
  );
  assert.equal(errorsFor(valid).date_of_birth, undefined);
});

test('a required select must have an option chosen', () => {
  // The placeholder option "Select…" has the value "".
  assert.equal(errorsFor({ ...valid, plan: '' }).plan?.message, 'Required');
  assert.equal(errorsFor({ ...valid, plan: 'HMO' }).plan, undefined);
});

test('the terms checkbox unchecked gives its own message', () => {
  const errors = errorsFor({ ...valid, termsAndServices: false });
  assert.deepEqual(Object.keys(errors), ['termsAndServices']);
  assert.equal(errors.termsAndServices?.message, TERMS_MESSAGE);
  assert.equal(
    TERMS_MESSAGE,
    'You must agree to the terms and services.',
    'visible text unchanged from 0.8.5'
  );
});

test('the tenant checkbox unchecked gives its own message', () => {
  const errors = errorsFor({ ...valid, tenantAcknowledgement: false });
  assert.deepEqual(Object.keys(errors), ['tenantAcknowledgement']);
  assert.equal(errors.tenantAcknowledgement?.message, TENANT_ACK_MESSAGE);
  assert.equal(
    TENANT_ACK_MESSAGE,
    'You must acknowledge that claims will be sent to the tenant.'
  );
});

test('a failing form reports every failing field at once', () => {
  const errors = errorsFor({
    ...valid,
    password: '',
    termsAndServices: false,
    tenantAcknowledgement: false
  });
  assert.deepEqual(Object.keys(errors).sort(), [
    'password',
    'tenantAcknowledgement',
    'termsAndServices'
  ]);
});

test('keys the rules do not name are dropped, as zod did', () => {
  const result = validateCredentials({ ...valid, extra: 'x' }, rules);
  assert.equal('extra' in result.values, false);
});

test('boolean fields: optional may be missing, required must be set', () => {
  const r: CredentialsRules = {
    opt: propertyToRule({ type: 'boolean' }, false),
    req: propertyToRule({ type: 'boolean' }, true)
  };
  assert.deepEqual(validateCredentials({ req: false }, r).errors, {});
  assert.equal(validateCredentials({}, r).errors.req?.message, 'Required');
  assert.equal(
    validateCredentials({ req: 'yes' }, r).errors.req?.message,
    'Expected boolean, received string'
  );
});

test('numeric fields: blank required fails, blank optional is omitted', () => {
  const r: CredentialsRules = {
    req: propertyToRule({ type: 'integer' }, true),
    opt: propertyToRule({ type: 'number' }, false)
  };
  assert.equal(
    validateCredentials({ req: '', opt: '' }, r).errors.req?.message,
    'Required'
  );
  assert.equal(
    validateCredentials({ req: 'abc', opt: '' }, r).errors.req?.message,
    'Expected number, received nan'
  );
  const ok = validateCredentials({ req: '42', opt: '  ' }, r);
  assert.deepEqual(ok.errors, {});
  assert.deepEqual(ok.values, { req: 42, opt: undefined });
});

test('the resolver returns react-hook-form shapes', async () => {
  const resolver = credentialsResolver(rules);
  const options = {
    fields: {},
    shouldUseNativeValidation: false
  } as unknown as Parameters<typeof resolver>[2];
  const good = await resolver(valid, undefined, options);
  assert.deepEqual(good.errors, {});
  assert.deepEqual(good.values, valid);
  const bad = await resolver({ ...valid, username: '' }, undefined, options);
  assert.deepEqual(bad.values, {});
  assert.equal(bad.errors.username?.message, 'Required');
});
