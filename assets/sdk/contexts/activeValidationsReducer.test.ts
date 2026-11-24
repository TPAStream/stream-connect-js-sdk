import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  type ActiveValidation,
  initial,
  reducer
} from './activeValidationsReducer.ts';

// Run with `npm run test:unit` (node --test). Node strips the types.

const TASK = 'task-1';

const entry = (
  overrides: Partial<ActiveValidation> = {}
): ActiveValidation => ({
  id: TASK,
  policyHolderId: 7,
  taskId: TASK,
  taskToken: 'token-a',
  payer: { id: 3, name: 'Carrier', logo_url: '' },
  email: 'member@example.invalid',
  state: 'pending',
  startedAt: 1000,
  ...overrides
});

const methodChoice = {
  state: 'WAITING_FOR_METHOD_CHOICE' as const,
  info: { method_list: ['sms', 'email'] }
};

// A resubmit while the task is still running gets the same task id
// back from the server, so the SDK adds an entry with an id it
// already has. The stream for that id stays open, and the server only
// sends a step when it changes, so the entry must keep its step.
test('re-adding a live id keeps its 2FA step and method list', () => {
  let s = reducer(initial, { type: 'add', validation: entry() });
  s = reducer(s, { type: 'apply_state', taskId: TASK, data: methodChoice });
  s = reducer(s, {
    type: 'add',
    validation: entry({ taskToken: 'token-b', startedAt: 2000 })
  });

  assert.equal(s.validations.length, 1);
  const v = s.validations[0];
  assert.equal(v?.state, 'method_choice');
  assert.deepEqual(v?.twoFactorAuthData, methodChoice);
  assert.equal(v?.startedAt, 1000);
  assert.equal(v?.taskToken, 'token-b');
});

test('re-adding a live id in code entry keeps the code step', () => {
  let s = reducer(initial, { type: 'add', validation: entry() });
  s = reducer(s, {
    type: 'apply_state',
    taskId: TASK,
    data: { state: 'WAITING_FOR_TWO_FACTOR_CODE', message: 'Wrong code' }
  });
  s = reducer(s, { type: 'add', validation: entry() });

  const v = s.validations[0];
  assert.equal(v?.state, 'awaiting_code');
  assert.equal(v?.endMessage, 'Wrong code');
});

// A finished or given-up entry has no open stream. Re-adding it must
// still reset it to pending so the runner opens a new stream.
for (const ended of ['success', 'failure', 'pending_async'] as const) {
  test(`re-adding a ${ended} id starts it over as pending`, () => {
    let s = reducer(initial, {
      type: 'add',
      validation: entry({ state: ended, terminalConfirmed: true })
    });
    s = reducer(s, { type: 'add', validation: entry({ startedAt: 2000 }) });

    const v = s.validations[0];
    assert.equal(v?.state, 'pending');
    assert.equal(v?.terminalConfirmed, undefined);
    assert.equal(v?.startedAt, 2000);
  });
}

test('adding a new id appends it', () => {
  let s = reducer(initial, { type: 'add', validation: entry() });
  s = reducer(s, {
    type: 'add',
    validation: entry({ id: 'task-2', taskId: 'task-2' })
  });
  assert.deepEqual(
    s.validations.map((v) => v.id),
    [TASK, 'task-2']
  );
});
