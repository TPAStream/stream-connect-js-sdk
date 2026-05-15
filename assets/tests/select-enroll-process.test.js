import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';

/* eslint-disable */
import regeneratorRuntime from 'regenerator-runtime';
/* eslint-enable */

import SelectEnrollProcess from '../sdk/components/select-enroll-process';

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

it('renders both Enroll and Fix Credentials cards', async () => {
  await act(async () => {
    render(
      <SelectEnrollProcess
        doneStep1={() => {}}
        setChoosePayer={() => {}}
        setFixCredentials={() => {}}
      />,
      container
    );
  });
  expect(container.textContent).toContain('Enroll New Member');
  expect(container.textContent).toContain('Fix Credentials');
});

it('clicking "Fix Credentials" fires setFixCredentials, not setChoosePayer', async () => {
  let fixCalled = false;
  let chooseCalled = false;
  await act(async () => {
    render(
      <SelectEnrollProcess
        doneStep1={() => {}}
        setChoosePayer={() => {
          chooseCalled = true;
        }}
        setFixCredentials={() => {
          fixCalled = true;
        }}
      />,
      container
    );
  });
  const cards = container.querySelectorAll('.col-sm-6 > div');
  // cards[0] = Enroll, cards[1] = Fix Credentials
  await act(async () => {
    cards[1].click();
  });
  expect(fixCalled).toBe(true);
  expect(chooseCalled).toBe(false);
});

it('clicking "Enroll New Member" fires setChoosePayer', async () => {
  let chooseCalled = false;
  await act(async () => {
    render(
      <SelectEnrollProcess
        doneStep1={() => {}}
        setChoosePayer={() => {
          chooseCalled = true;
        }}
        setFixCredentials={() => {}}
      />,
      container
    );
  });
  const cards = container.querySelectorAll('.col-sm-6 > div');
  await act(async () => {
    cards[0].click();
  });
  expect(chooseCalled).toBe(true);
});

it('calls doneStep1 on mount', async () => {
  let doneCalled = false;
  await act(async () => {
    render(
      <SelectEnrollProcess
        doneStep1={() => {
          doneCalled = true;
        }}
        setChoosePayer={() => {}}
        setFixCredentials={() => {}}
      />,
      container
    );
  });
  expect(doneCalled).toBe(true);
});
