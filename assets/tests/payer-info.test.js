import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';

/* eslint-disable */
import regeneratorRuntime from 'regenerator-runtime';
/* eslint-enable */

import PayerInfo from '../sdk/components/payer-info';

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

const BASE_PAYER = {
  id: 1,
  name: 'Anthem',
  logo_url: 'http://example.com/anthem.png',
  website_home_url_netloc: 'anthem.com',
  has_security_questions: false,
  register_url: 'http://anthem.com/register'
};

it('renders the payer logo and name', async () => {
  await act(async () => {
    render(
      <PayerInfo
        payer={BASE_PAYER}
        donePopUp={() => {}}
        includePayerBlogs={false}
      />,
      container
    );
  });
  const img = container.querySelector('img');
  expect(img).not.toBeNull();
  expect(img.getAttribute('src')).toBe('http://example.com/anthem.png');
  expect(img.getAttribute('alt')).toBe('Anthem');
});

it('renders the standard pre-enroll message referencing the payer site', async () => {
  await act(async () => {
    render(
      <PayerInfo
        payer={BASE_PAYER}
        donePopUp={() => {}}
        includePayerBlogs={false}
      />,
      container
    );
  });
  expect(container.textContent).toContain('anthem.com');
  expect(container.textContent).toContain('Anthem username and password');
});

it('appends the security-questions reminder when has_security_questions=true', async () => {
  await act(async () => {
    render(
      <PayerInfo
        payer={{ ...BASE_PAYER, has_security_questions: true }}
        donePopUp={() => {}}
        includePayerBlogs={false}
      />,
      container
    );
  });
  expect(container.textContent).toContain('security questions and answers');
});

it('renders the redirect_vendor_name banner when present', async () => {
  await act(async () => {
    render(
      <PayerInfo
        payer={{ ...BASE_PAYER, redirect_vendor_name: 'Plaid' }}
        donePopUp={() => {}}
        includePayerBlogs={false}
      />,
      container
    );
  });
  expect(container.textContent).toContain('Powered by Plaid');
});
