import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';

/* eslint-disable */
import regeneratorRuntime from 'regenerator-runtime';
/* eslint-enable */

import {
  FixPayerImages,
  resolvePayerForPH
} from '../sdk/components/payer-images';

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

const PAYER_DIRECT = {
  id: 1,
  payer_id: 1,
  payer_group_id: null,
  logo_url: 'http://example.com/direct.png'
};
const PAYER_GROUP_PRIMARY = {
  id: 2,
  payer_id: 2,
  payer_group_id: 7,
  logo_url: 'http://example.com/group.png'
};

describe('resolvePayerForPH', () => {
  it('returns the payer matched by payer_id when present', () => {
    const ph = {
      payer_id: 1,
      payer: { payer_group_id: null },
      login_problem: 'invalid'
    };
    expect(resolvePayerForPH(ph, [PAYER_DIRECT, PAYER_GROUP_PRIMARY])).toBe(
      PAYER_DIRECT
    );
  });

  it('falls back to payer_group_id when login_problem is migrating', () => {
    const ph = {
      payer_id: 99,
      payer: { payer_group_id: 7 },
      login_problem: 'migrating'
    };
    expect(resolvePayerForPH(ph, [PAYER_GROUP_PRIMARY])).toBe(
      PAYER_GROUP_PRIMARY
    );
  });

  it('migrating PH: uses payer_group_id even when ph.payer_id is also in the list', () => {
    // The migration target shares payer_group_id with the source. Even
    // if the OLD source payer is still in `payers`, a migrating PH must
    // resolve to the destination, not bounce back to the dead carrier.
    const oldPayer = {
      id: 99,
      payer_id: 99,
      payer_group_id: 7,
      logo_url: 'http://example.com/old.png'
    };
    const ph = {
      payer_id: 99,
      payer: { payer_group_id: 7 },
      login_problem: 'migrating'
    };
    expect(resolvePayerForPH(ph, [oldPayer, PAYER_GROUP_PRIMARY])).toBe(
      PAYER_GROUP_PRIMARY
    );
  });

  it('does not use the payer_group_id fallback when login_problem is not migrating', () => {
    const ph = {
      payer_id: 99,
      payer: { payer_group_id: 7 },
      login_problem: 'invalid'
    };
    expect(resolvePayerForPH(ph, [PAYER_GROUP_PRIMARY])).toBeUndefined();
  });

  it('returns undefined when neither match path applies', () => {
    const ph = {
      payer_id: 99,
      payer: { payer_group_id: null },
      login_problem: 'invalid'
    };
    expect(
      resolvePayerForPH(ph, [PAYER_DIRECT, PAYER_GROUP_PRIMARY])
    ).toBeUndefined();
  });

  it('does not match a null payer_group_id against the payers list', () => {
    const ph = {
      payer_id: 99,
      payer: { payer_group_id: null },
      login_problem: 'migrating'
    };
    expect(
      resolvePayerForPH(ph, [PAYER_DIRECT, PAYER_GROUP_PRIMARY])
    ).toBeUndefined();
  });
});

describe('FixPayerImages', () => {
  it('renders a clickable tile with the payer logo when resolvable', async () => {
    const ph = {
      id: 100,
      payer_id: 1,
      payer: { payer_group_id: null },
      login_problem: 'invalid',
      username: 'alice'
    };
    let chooseArgs = null;
    await act(async () => {
      render(
        <FixPayerImages
          policyHolders={[ph]}
          payers={[PAYER_DIRECT]}
          choosePolicyHolder={args => {
            chooseArgs = args;
          }}
        />,
        container
      );
    });
    const tile = container.querySelector('#selectPh_100');
    expect(tile).not.toBeNull();
    expect(tile.style.cursor).toBe('pointer');
    // The resolvable tile renders the carrier logo alongside the name
    // (the logo is the primary visual identifier on Fix-Credentials).
    const logo = tile.querySelector('img');
    expect(logo).not.toBeNull();
    expect(logo.getAttribute('src')).toBe(PAYER_DIRECT.logo_url);
    await act(async () => {
      tile.click();
    });
    expect(chooseArgs).toEqual({ policyHolder: ph, payer: PAYER_DIRECT });
  });

  it('renders a disabled tile with the explanatory message when not resolvable', async () => {
    const ph = {
      id: 200,
      payer_id: 99,
      payer: { payer_group_id: null },
      login_problem: 'needs_two_factor',
      username: 'bob'
    };
    let chooseArgs = null;
    await act(async () => {
      render(
        <FixPayerImages
          policyHolders={[ph]}
          payers={[PAYER_DIRECT]}
          choosePolicyHolder={args => {
            chooseArgs = args;
          }}
        />,
        container
      );
    });
    const tile = container.querySelector('#selectPh_200');
    expect(tile).not.toBeNull();
    expect(tile.style.cursor).toBe('not-allowed');
    expect(tile.querySelector('img')).toBeNull();
    expect(tile.textContent).toContain("isn't enabled for this employer");
    await act(async () => {
      tile.click();
    });
    expect(chooseArgs).toBeNull();
  });

  it('routes a migrating PH through the payer_group_id fallback', async () => {
    const ph = {
      id: 300,
      payer_id: 99,
      payer: { payer_group_id: 7 },
      login_problem: 'migrating',
      username: 'carol'
    };
    let chooseArgs = null;
    await act(async () => {
      render(
        <FixPayerImages
          policyHolders={[ph]}
          payers={[PAYER_GROUP_PRIMARY]}
          choosePolicyHolder={args => {
            chooseArgs = args;
          }}
        />,
        container
      );
    });
    const tile = container.querySelector('#selectPh_300');
    expect(tile.style.cursor).toBe('pointer');
    await act(async () => {
      tile.click();
    });
    expect(chooseArgs).toEqual({
      payer: PAYER_GROUP_PRIMARY,
      dependent: false
    });
  });

  it('still renders the username and login_problem text on a disabled tile', async () => {
    const ph = {
      id: 400,
      payer_id: 99,
      payer: { payer_group_id: null },
      login_problem: 'invalid',
      username: 'dave'
    };
    await act(async () => {
      render(
        <FixPayerImages
          policyHolders={[ph]}
          payers={[]}
          choosePolicyHolder={() => {}}
        />,
        container
      );
    });
    const tile = container.querySelector('#selectPh_400');
    expect(tile.textContent).toContain('dave');
    expect(tile.textContent).toContain('invalid');
  });

  it('renders the carrier logo on a disabled tile when ph.payer carries one', async () => {
    const ph = {
      id: 500,
      payer_id: 99,
      payer: {
        payer_group_id: null,
        name: 'Old Carrier',
        logo_url: 'http://example.com/old.png'
      },
      login_problem: 'invalid',
      username: 'erin'
    };
    await act(async () => {
      render(
        <FixPayerImages
          policyHolders={[ph]}
          payers={[]}
          choosePolicyHolder={() => {}}
        />,
        container
      );
    });
    const tile = container.querySelector('#selectPh_500');
    const logo = tile.querySelector('img');
    expect(logo).not.toBeNull();
    expect(logo.getAttribute('src')).toBe('http://example.com/old.png');
    // Disabled state dims the logo without removing it.
    expect(logo.style.opacity).toBe('0.55');
    expect(tile.style.cursor).toBe('not-allowed');
  });
});
