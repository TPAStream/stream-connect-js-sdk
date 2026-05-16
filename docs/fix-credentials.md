# Fix Credentials

The fix-credentials view lets a returning user see and act on every
carrier they've connected: reconnect a broken login, finish a 2FA
challenge, or add a new carrier. It is opt-in via the `fixCredentials`
init option and requires
[Connect Access Token](./connect-access-token.md) to be enabled on your
SDK instance.

## Init options

```javascript
StreamConnect({
  el: '#react-hook',
  apiToken: 'your-sdk-token',
  connectAccessToken: '<minted server-side, see connect-access-token.md>',
  fixCredentials: true,
  // ... rest of init
});
```

* `fixCredentials` (boolean) - enables the view. Without it the SDK
  starts on the standard choose-payer flow.
* `connectAccessToken` (string) - required when `fixCredentials` is
  true. See [Connect Access Token](./connect-access-token.md) for how
  it's minted and rotated.

## What the user sees

The fix-credentials view lists every policy-holder the user has
connected. Each carrier renders as a tile with:

* The carrier logo and name
* A status badge (described below)
* "Last synced N min/hr/day ago" when there's a recent successful crawl

### Status badges

| Badge | When it fires |
|---|---|
| **Connected** | Login is valid AND the last successful crawl is recent. Healthy state. |
| **Action needed** | Carrier flagged a transient issue (security question, MFA prompt waiting, etc.); the user can re-enter info to clear it. |
| **Reconnect** | Login is genuinely broken (wrong password, locked account, expired registration). Clicking the tile takes the user back through the credentials form. |
| **Validating now** | A validation task is in flight against this PH. The tile pulses; the floating hero (top of the page) shows live progress. |

The label rendering is in
[`assets/sdk/components/PayerImages.tsx`](../assets/sdk/components/PayerImages.tsx)
(`labelFor` / `severityFor`). Severity maps to badge color via the
`tpa-` theme tokens, so a customer-supplied
[`theme.primaryColor`](./theme.md) doesn't recolor the semantic status
states.

### Sort order

Tiles are sorted top-to-bottom by:

1. In-flight validations (the carrier the user just submitted)
2. Critical-broken PHs (Reconnect)
3. Warning PHs (Action needed)
4. Healthy PHs, most-recently-synced first

This puts the carriers that need attention at the top, with the
just-submitted one always visually pinned next to the hero.

### "Recently added" section

PHs created in the last 7 days are grouped into a "Recently added"
section above the main list, so the user can see what they just
connected without scrolling. The remaining carriers render under
"Your other carriers" (or "Your carriers" if there's no recent
section).

## Empty state

A user with no connected carriers sees:

> You haven't connected any carriers yet.

with a single "Your carriers" heading. Selecting a carrier from
choose-payer is still reachable via the "Add a new carrier" entry
point.

## Reconnecting a carrier

Clicking any tile with **Reconnect** or **Action needed** lands the
user on the credentials form for that carrier, pre-filled with the
username on file. The submit returns the user back to the
fix-credentials list with the new validation in flight (visible in
the hero + on the tile as "Validating now").

The wizard does NOT take over the screen during validation; multiple
validations can run in parallel and the user can keep navigating.

## Adding a new carrier from fix-credentials

Users with `fixCredentials: true` see an "Add a new carrier" entry
that drops them into the standard choose-payer flow (step 3). Submit
returns them to the fix-credentials list, not the choose-payer
picker, so the just-submitted carrier shows up immediately in
"Recently added".

(Implementation note: the return-step logic uses `state.policyHolderId`
to distinguish "reconnect existing" from "add new" - see
[SDK.tsx](../assets/sdk/components/SDK.tsx) `returnStep` near the
post-validation refresh.)

## Hooks for custom rendering

* `doneFixCredentials` - fires once per render of the fix-credentials
  view, after data loads. Useful for analytics or applying custom
  styling.
* `doneSelectEnrollProcess` - fires when the legacy "Reconnect or Add
  new" select screen renders. The 0.8 view collapses that selection
  into the carrier-tile list, so this fires once at mount and is
  primarily kept for back-compat.

## See also

* [Theme](./theme.md) for branding the SDK shell (the status badges
  use semantic colors that aren't affected by `theme.primaryColor`)
* [Connect Access Token](./connect-access-token.md) for the security
  setup `fixCredentials` requires
* [SDK Flow](./sdk-flow.md) for the broader step machine the
  fix-credentials view plugs into
