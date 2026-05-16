# Migrating from 0.7.x to 0.8

The 0.8 release is **backward-compatible** with 0.7.x at the `init()` call site: every option supported in 0.7.7 keeps working, including the custom render props (`renderChoosePayer`, `renderPayerForm`, `renderEndWidget`), all `done*` callbacks, `theme` (new), `userSchema` (changed, see below), and the rest.

If you do nothing, the 0.8 SDK will run with your existing 0.7.x init object. The visible changes are the new default appearance and the SSE-backed validation UI. This document calls out the handful of cases where a no-op upgrade is *not* what you want.

## What changed

### Look and feel
- Polished default appearance: cards, generous whitespace, system-font stack, accessible focus rings. No host-page CSS required; the SDK is visually self-contained.
- New `theme.primaryColor` init option recolors buttons, links, focus rings, and progress bars. See [Theme](./theme.md).

### Stack
- React 19, full TypeScript port.
- Tailwind utility classes with the `tpa-` prefix to avoid name collisions with host-page CSS. The reset and theme variables are scoped under `.tpa-sdk-root` so they only affect the SDK subtree; the utility classes themselves are global but prefixed, so they only apply where the prefixed class names appear in the DOM.
- Headless UI primitives for accessible Dialog and Combobox.
- React Hook Form + Zod for the carrier credential form.
- **Removed dependencies**: `@fortawesome/*`, `font-awesome`, `react-jsonschema-form`, `react-popup`, `react-select`, `react-highlight-words`, `query-string`, `@babel/polyfill`, `regenerator-runtime`.

### Credential validation
- Server-Sent Events stream replaces polling. State transitions arrive as they happen instead of on a 5-second cadence.
- Backed by the new `/v3/sdk/progress/<task_id>/stream` endpoint. Auth is a short-lived task-scoped JWT (audience `sdk:sse:progress`, bound to the user + task, 10-minute TTL) returned in the credential-submit response as `task_token` and forwarded as a `?token=...` query param on the SSE subscription.
- Multiple validations can run in parallel; each owns its own SSE subscription.
- Validation now renders in a non-blocking hero element + corner panel rather than blocking the carrier picker.

### `init()` options
- `realTimeVerification` default is unchanged from 0.7.7 (still `true`). The transport changed; the default did not.
- `enableInterop` -> `enablePatientAccessAPI`. Legacy name keeps working; using it logs a one-time console deprecation warning.
- `enableInteropSinglePage` -> `enablePatientAccessAPISinglePage`. Same deprecation treatment.
- **New**: `theme` / `theme.primaryColor`.
- **New**: `enablePatientAccessAPI`, `enablePatientAccessAPISinglePage`.

## Things to double-check

### 1. Drop the Bootstrap CSS link (optional)

The 0.7.x quickstart told integrators to load Bootstrap 4.3 in the host page. The 0.8 SDK does not require it; you can remove the `<link rel="stylesheet" href=".../bootstrap.min.css">` tag. Host pages that already load Bootstrap for their own reasons can keep doing so without conflict, since SDK styles are scoped to `.tpa-sdk-root` and namespaced with the `tpa-` prefix, so the two stylesheets do not collide.

### 2. `userSchema` no longer drives form rendering

In 0.7.x, `userSchema` was a [react-jsonschema-form](https://react-jsonschema-form.readthedocs.io/) UI-schema object that customized the credentials form layout. `react-jsonschema-form` was removed in 0.8 to cut bundle size.

`userSchema` is still accepted as an init option for back-compat:
- It is forwarded into the credential-submit payload (your backend can read it if you need to).
- It no longer affects the form's visual rendering.
- The SDK logs a one-time console warning if it sees a non-empty `userSchema`.

If you depended on UI-schema-driven extra fields in 0.7.x, please file an issue at https://github.com/TPAStream/stream-connect-js-sdk/issues so we can scope an alternative.

### 3. `realTimeVerification` behavior is different

The default is still `true`. What changed:
- The transport is now SSE instead of a 5-second polling loop.
- The validation UI is now **non-blocking**. The user can continue interacting with the SDK while validation streams in the corner panel, rather than being held on a loading screen for up to 200 seconds.
- The credentials form will surface MFA prompts inline if the carrier challenges the submission.

If you previously omitted `realTimeVerification` and relied on the blocking, polling-based behavior, you have two choices:
- **Recommended**: leave the default `true`. The non-blocking UI is the same fidelity of feedback, just nicer.
- **Preserve 0.7.x submit-and-trust**: pass `realTimeVerification: false` explicitly. The SDK will not display validation feedback or MFA prompts; submitted credentials are treated as accepted and the flow advances immediately.

### 4. `realtimeTimeout` is a no-op

In 0.7.x this set the polling-loop timeout. In 0.8 the timeout is server-side (~10 minutes on the SSE stream) and `realtimeTimeout` is accepted but ignored. You can leave the option in place or remove it; either is fine.

### 5. Rename `enableInterop` (no rush)

The legacy aliases keep working indefinitely; one-time console warning when set. Rename at your convenience:

| 0.7.x | 0.8 canonical |
|---|---|
| `enableInterop` | `enablePatientAccessAPI` |
| `enableInteropSinglePage` | `enablePatientAccessAPISinglePage` |

### 6. Custom render props: data shapes unchanged

If you use `renderChoosePayer={false}` / `renderPayerForm={false}` / `renderEndWidget={false}` and drive those steps from `doneChoosePayer` / `doneCreatedForm` / `doneEasyEnroll`, the data passed into your callbacks is unchanged.

## What you do NOT need to do

- You do not need to add a `theme` option. The default appearance applies automatically.
- You do not need to rename `apiToken` / `sdkToken`. Both still work.
- You do not need to install React or React-DOM. The SDK bundles its own React 19.
- You do not need to handle `task_token` yourself. The SDK uses it internally for the SSE subscription.
- You do not need to consume `?accessToken=...` or `?forceTPAStreamSdkEnd=1` URL parameters yourself. The SDK reads them on init and strips them via `history.replaceState`.

## 0.7.x remains supported

If you are not ready to upgrade, the CDN keeps every pinned version available indefinitely. Pin to the last 0.7.x:

```html
<script src="https://app.tpastream.com/static/js/sdk-v-0.7.7.js"></script>
```

Open an issue if a 0.7.x bugfix backport is needed for a customer who cannot move yet.
