import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';

/* eslint-disable */
import regeneratorRuntime from 'regenerator-runtime';
/* eslint-enable */

import EnterCredentials from '../sdk/components/enter-credentials';

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

const TENANT = { name: 'Tenant', terms_of_use: null, terms_of_use_message: '' };

it('renders a fallback message instead of crashing when streamPayer is null', async () => {
  await act(async () => {
    render(
      <EnterCredentials
        streamPayer={null}
        streamTenant={TENANT}
        doneStep4={() => {}}
      />,
      container
    );
  });
  expect(container.textContent).toContain("isn't available in this widget");
});

it('renders a fallback message when streamPayer has no onboard_form', async () => {
  await act(async () => {
    render(
      <EnterCredentials
        streamPayer={{ id: 1, name: 'Test Payer' }}
        streamTenant={TENANT}
        doneStep4={() => {}}
      />,
      container
    );
  });
  expect(container.textContent).toContain("isn't available in this widget");
});
