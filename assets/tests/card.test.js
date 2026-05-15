import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';

/* eslint-disable */
import regeneratorRuntime from 'regenerator-runtime';
/* eslint-enable */

import EnrollCard from '../sdk/components/card';
import { faUserPlus } from '../shared/util/font-awesome-icons';

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

it('renders label and description', async () => {
  await act(async () => {
    render(
      <EnrollCard
        handleClick={() => {}}
        label="Enroll Now"
        icon={faUserPlus}
        description="A short description"
        isConfigured={true}
      />,
      container
    );
  });
  expect(container.textContent).toContain('Enroll Now');
  expect(container.textContent).toContain('A short description');
});

it('fires handleClick when isConfigured=true', async () => {
  let clicked = false;
  await act(async () => {
    render(
      <EnrollCard
        handleClick={() => {
          clicked = true;
        }}
        label="Click Me"
        icon={faUserPlus}
        description=""
        isConfigured={true}
      />,
      container
    );
  });
  await act(async () => {
    container.firstChild.click();
  });
  expect(clicked).toBe(true);
});

it('does NOT fire handleClick when isConfigured=false', async () => {
  let clicked = false;
  await act(async () => {
    render(
      <EnrollCard
        handleClick={() => {
          clicked = true;
        }}
        label="Disabled"
        icon={faUserPlus}
        description=""
        isConfigured={false}
      />,
      container
    );
  });
  await act(async () => {
    container.firstChild.click();
  });
  expect(clicked).toBe(false);
  expect(container.firstChild.style.cursor).toBe('default');
});
