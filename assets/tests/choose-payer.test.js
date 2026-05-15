import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';

/* eslint-disable */
import regeneratorRuntime from 'regenerator-runtime';
/* eslint-enable */

import ChoosePayer from '../sdk/components/choose-payer';

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

const PAYERS = [
  { id: 1, payer_id: 1, name: 'Anthem', logo_url: 'http://example.com/a.png' },
  {
    id: 2,
    payer_id: 2,
    name: 'Aetna',
    logo_url: 'http://example.com/aetna.png'
  }
];
const EMPLOYER = { payers: [{ id: 1 }] };

it('renders the choose-payer wrapper and the heading', async () => {
  await act(async () => {
    render(
      <ChoosePayer
        streamPayers={PAYERS}
        streamEmployer={EMPLOYER}
        usedPayers={[]}
        choosePayer={() => {}}
        isDemo={false}
        dropDown={false}
        doneStep3={() => {}}
      />,
      container
    );
  });
  expect(container.querySelector('#choose-payer')).not.toBeNull();
  expect(container.textContent).toContain('Choose an Account to add Below');
});

it('renders all payer tiles in non-dropdown mode', async () => {
  await act(async () => {
    render(
      <ChoosePayer
        streamPayers={PAYERS}
        streamEmployer={EMPLOYER}
        usedPayers={[]}
        choosePayer={() => {}}
        isDemo={false}
        dropDown={false}
        doneStep3={() => {}}
      />,
      container
    );
  });
  expect(container.querySelector('#selectPayer_1')).not.toBeNull();
  expect(container.querySelector('#selectPayer_2')).not.toBeNull();
});

it('renders the dropdown when dropDown=true', async () => {
  await act(async () => {
    render(
      <ChoosePayer
        streamPayers={PAYERS}
        streamEmployer={EMPLOYER}
        usedPayers={[]}
        choosePayer={() => {}}
        isDemo={false}
        dropDown={true}
        doneStep3={() => {}}
      />,
      container
    );
  });
  expect(container.querySelector('#payer-dropdown')).not.toBeNull();
});

it('isDemo mode renders the predefined-payers heading', async () => {
  await act(async () => {
    render(
      <ChoosePayer
        streamPayers={PAYERS}
        streamEmployer={EMPLOYER}
        usedPayers={[]}
        choosePayer={() => {}}
        isDemo={true}
        dropDown={false}
        doneStep3={() => {}}
      />,
      container
    );
  });
  expect(container.textContent).toContain(
    'Or Select From this Predefined List'
  );
});

it('calls doneStep3 on mount', async () => {
  let doneCalled = false;
  await act(async () => {
    render(
      <ChoosePayer
        streamPayers={PAYERS}
        streamEmployer={EMPLOYER}
        usedPayers={[]}
        choosePayer={() => {}}
        isDemo={false}
        dropDown={false}
        doneStep3={() => {
          doneCalled = true;
        }}
      />,
      container
    );
  });
  expect(doneCalled).toBe(true);
});
