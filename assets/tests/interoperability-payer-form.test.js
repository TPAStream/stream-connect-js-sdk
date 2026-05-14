import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';

/* eslint-disable */
import regeneratorRuntime from 'regenerator-runtime';
/* eslint-enable */

jest.mock('../shared/requests/interop', () => ({
  beginInterop: jest.fn(),
  getInteropState: jest.fn()
}));

import { beginInterop } from '../shared/requests/interop';
import InteroperabilityPayerForm from '../sdk/components/interoperability-payer-form';

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

const baseProps = {
  email: 'test@example.com',
  streamTenant: { name: 'Test Tenant' },
  streamPayer: {
    name: 'Test Payer',
    redirect_vendor_name: null,
    website_home_url_netloc: 'anthem.com',
    interoperability_authorization_url: 'https://anthem.com/oauth'
  },
  tenantTerms: 'terms',
  handleTermsClick: () => {},
  validateCreds: () => {},
  handlePostError: () => {}
};

it('renders the carrier error message when state.errorMessage is set', async () => {
  let formInstance = null;
  await act(async () => {
    render(
      <InteroperabilityPayerForm
        {...baseProps}
        ref={ref => {
          formInstance = ref;
        }}
      />,
      container
    );
  });

  await act(async () => {
    formInstance.setState({
      errorMessage: 'The member details does not meet our match score criteria.'
    });
  });

  const alert = container.querySelector('.patient-access-api-error');
  expect(alert).not.toBeNull();
  expect(alert.textContent).toContain('Your carrier responded:');
  expect(alert.textContent).toContain(
    'The member details does not meet our match score criteria.'
  );
});

it('does not render the carrier error block when there is no errorMessage', async () => {
  await act(async () => {
    render(<InteroperabilityPayerForm {...baseProps} />, container);
  });
  expect(container.querySelector('.patient-access-api-error')).toBeNull();
});

async function renderAndSubmit(rejection) {
  let formInstance = null;
  beginInterop.mockImplementation(() => Promise.reject(rejection));

  await act(async () => {
    render(
      <InteroperabilityPayerForm
        {...baseProps}
        ref={ref => {
          formInstance = ref;
        }}
      />,
      container
    );
  });

  await act(async () => {
    await formInstance.handleSubmit({ preventDefault: () => {} });
  });
}

it('coerces an Axios-shaped rejection to a string before rendering', async () => {
  const axiosError = new Error('Request failed with status code 500');
  axiosError.response = { data: { error: 'carrier is unreachable' } };
  await renderAndSubmit(axiosError);

  const alert = container.querySelector('.patient-access-api-error');
  expect(alert).not.toBeNull();
  expect(alert.textContent).toContain('carrier is unreachable');
  expect(alert.textContent).not.toContain('[object Object]');
});

it('falls back to error.message when there is no response payload', async () => {
  await renderAndSubmit(new Error('Network Error'));

  const alert = container.querySelector('.patient-access-api-error');
  expect(alert).not.toBeNull();
  expect(alert.textContent).toContain('Network Error');
});
