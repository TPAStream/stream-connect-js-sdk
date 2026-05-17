# Headless mode — drive every step yourself

The default `stream-connect-sdk` bundle ships with a complete Plaid-Link-style UI: a stepped wizard, a choose-carrier tile grid, a credentials form, an end widget, and a floating validation hero / corner panel. For most integrators that's exactly what you want — drop in a `<div id="...">`, call `StreamConnect({ el, ...identity })`, done.

Some integrators want something different. They have a design system the SDK chrome doesn't match. They want the SDK invisible — just the data pipe — so they can render the carrier picker, the credentials form, and the end screen with their own components. The 0.8 SDK supports this in two pieces: the existing `renderXxx: false` callback contract, plus a separate **headless bundle** that ships without our stylesheet.

## When to use the headless bundle

| Use headless when... | Use the default (styled) bundle when... |
|---|---|
| You drive every step (choose-carrier, credentials form, end screen) with your own React/Vue/whatever components and only need the SDK for the data flow. | You want the built-in widgets. The 50 KB of Tailwind output is a fair trade for "drop in and it works." |
| Your host page has its own styling system and our `tpa-*` utility classes are unwanted dead bytes. | You want a design that auto-themes from your brand color via `theme.primaryColor`. |
| You're shipping the SDK on a bandwidth-sensitive page (mobile, embedded). | You don't have a design team building custom UI for the connect flow. |
| You want full control over mobile / responsive behavior. | You're OK with the default layout. |

The headless bundle does NOT change the SDK's behavior — same auth, same SSE-driven validation, same 2FA flow, same backend contract. It only changes whether `tailwind.css` is bundled.

## Installation

```bash
npm install stream-connect-sdk@^0.8
```

Both bundles ship in the same package; pick at import time:

```js
// Styled (default) — built-in widgets render with their full chrome.
import StreamConnect from 'stream-connect-sdk';

// Headless — same StreamConnect function, no stylesheet bundled.
import StreamConnect from 'stream-connect-sdk/headless';
```

## Headless init recipe

```js
import StreamConnect from 'stream-connect-sdk/headless';

StreamConnect({
  el: '#sdk-mount',
  apiToken: '...',
  tenant: { systemKey: 'YOUR_TENANT_KEY', vendor: 'internal' },
  employer: { systemKey: '...', vendor: 'internal', name: '...' },
  user: { firstName: '...', lastName: '...', email: '...' },

  // Skip the built-in renderers — your code handles the UI.
  renderChoosePayer: false,
  renderPayerForm: false,
  renderEndWidget: false,

  // Callbacks fire INSTEAD of the built-in widgets rendering.
  doneChoosePayer: (payload) => {
    // Render your own carrier picker. Call payload.choosePayer({ payer })
    // to advance to the credentials step.
    mountMyCarrierPicker(payload);
  },
  doneCreatedForm: (payload) => {
    // Render your own credentials form. Call payload.validateCreds({ params })
    // to submit. params must include payer_id + accept + tenants_accept;
    // see assets/sdk/components/EnterCredentials.tsx for the canonical shape.
    mountMyCredsForm(payload);
  },
  doneEasyEnroll: (payload) => {
    // Final terminal event after validation completes. payload includes
    // policyHolder, payer, employer, tenant, user, credentialsValid,
    // endingMessage, pending.
    mountMyEndScreen(payload);
  }
});
```

## What's still mounted in headless mode

The SDK still mounts a React root at `el` because the renderXxx callbacks need a host React tree to live in. Two things render by default and are typically what customers want even in headless mode:

- **ActiveValidationsHero** — the inline 2FA prompt (method picker + code entry). When a validation needs 2FA, this card appears above your custom UI. It's the only way to gather the OTP from the user.
- **ActiveValidationsPanel** — the floating corner notification showing in-flight validations.

Both rely on the SDK's `tpa-*` utility classes. In the headless bundle those classes have no styles attached, so the elements render as unstyled divs and inputs. Two paths:

1. **Style them yourself.** The hero is `.tpa-sdk-root > [data-tpa-hero]`; the panel is `[data-tpa-panel]`. Style with your own CSS to match your design system.
2. **Hide them entirely** and provide your own 2FA UI. Subscribe to the same SSE stream the hero uses via... actually, this isn't currently exposed as a public API. If you need full 2FA control without the hero, file an issue — we'll plumb it.

The Terms-of-Use Dialog is mounted only when the user clicks "View Terms of Use" in your custom form (which calls `toggleTermsOfUse()` from the credentials callback payload). It uses the styled Dialog component; in headless mode it renders as an unstyled overlay. Style it via `.tpa-sdk-root [role="dialog"]` or pre-fetch the terms HTML yourself and render in your own modal.

## What's NOT in the headless bundle

- `tailwind.css` (the entire utility-class stylesheet) — about 27 KiB minified.

That's it. Every component, every reducer, every API client, every type — all identical between bundles. The split is purely about whether the stylesheet is imported.

## Migrating from the styled to the headless bundle

If you're already using the default styled bundle with `renderChoosePayer: false` etc., switching to headless is one import line:

```diff
- import StreamConnect from 'stream-connect-sdk';
+ import StreamConnect from 'stream-connect-sdk/headless';
```

All your init options and callbacks keep working as-is. The only visual change is the SDK's chrome (hero, panel, dialog) lose their default styling — apply your own CSS or hide them per the section above.

## See also

- [Client usage](./client-usage.md) — full options reference + the `renderChoosePayer` / `renderPayerForm` / `renderEndWidget` flags.
- [SDK flow](./sdk-flow.md) — the step machine you're driving callbacks for.
- [Two-factor authentication](./two-factor.md) — what the hero is rendering when a validation needs MFA.
