import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';

/* eslint-disable */
import regeneratorRuntime from 'regenerator-runtime';
/* eslint-enable */

import FixCredentials from '../sdk/components/fix-credentials';

let container = null;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

const PAYER = {
  id: 1,
  payer_id: 1,
  payer_group_id: null,
  logo_url: 'http://example.com/p.png'
};
const PROBLEM_PH = {
  id: 100,
  payer_id: 1,
  payer: { payer_group_id: null },
  username: 'alice',
  login_problem: 'invalid',
  login_needs_correction: true
};
const HEALTHY_PH = {
  id: 200,
  payer_id: 1,
  payer: { payer_group_id: null },
  username: 'bob',
  login_problem: null,
  login_needs_correction: false
};

it('renders the empty message when no PHs need correction', async () => {
  await act(async () => {
    render(
      <FixCredentials
        doneStep2={() => {}}
        streamUser={{ policy_holders: [HEALTHY_PH] }}
        streamPayers={[PAYER]}
        choosePolicyHolder={() => {}}
      />,
      container
    );
  });
  expect(container.textContent).toContain('no credentials that need adjusted');
  expect(container.querySelector('#payer-images')).toBeNull();
});

it('renders FixPayerImages tiles when there are problem PHs', async () => {
  await act(async () => {
    render(
      <FixCredentials
        doneStep2={() => {}}
        streamUser={{ policy_holders: [PROBLEM_PH, HEALTHY_PH] }}
        streamPayers={[PAYER]}
        choosePolicyHolder={() => {}}
      />,
      container
    );
  });
  // FixPayerImages is rendered for the one problem PH
  expect(container.querySelector('#payer-images')).not.toBeNull();
  expect(container.querySelector('#selectPh_100')).not.toBeNull();
  // Healthy PH not surfaced in the fix-credentials tile list
  expect(container.querySelector('#selectPh_200')).toBeNull();
});

it('handles streamUser without policy_holders', async () => {
  await act(async () => {
    render(
      <FixCredentials
        doneStep2={() => {}}
        streamUser={{}}
        streamPayers={[PAYER]}
        choosePolicyHolder={() => {}}
      />,
      container
    );
  });
  expect(container.textContent).toContain('no credentials that need adjusted');
});

it('renders the back arrow when returnSelectEnrollProcess is provided', async () => {
  await act(async () => {
    render(
      <FixCredentials
        doneStep2={() => {}}
        streamUser={{ policy_holders: [] }}
        streamPayers={[]}
        choosePolicyHolder={() => {}}
        returnSelectEnrollProcess={() => {}}
      />,
      container
    );
  });
  // The arrow is an svg rendered by FontAwesomeIcon
  expect(container.querySelector('svg')).not.toBeNull();
});
