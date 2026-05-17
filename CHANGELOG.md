# Changelog

All notable changes to the `stream-connect-sdk` npm package. The
companion React Native hook (`stream-connect-sdk-hook`) is on its own
release line; see [`sdk-hook/docs/README.md`](./sdk-hook/docs/README.md).

## 0.8.0

### Look and feel

* Polished default appearance: cards, generous whitespace, system-font
  stack, accessible focus rings. No host-page CSS required; the SDK
  is visually self-contained.
* New `theme.primaryColor` init option (hex like `#2563eb`) recolors
  buttons, links, focus rings, and progress bars. See
  [`docs/theme.md`](./docs/theme.md).

### Stack

* React 19, full TypeScript port.
* Tailwind utility classes with the `tpa-` prefix to avoid host-page
  collisions. The reset + theme variables are wrapped under
  `.tpa-sdk-root` so they don't leak outside the SDK subtree; the
  utility classes themselves are prefixed but global, so a host page
  that already uses `.tpa-*` class names would still collide (none
  observed in real customer integrations).
* Headless UI primitives for accessible Dialog and Combobox.
* React Hook Form + Zod for the carrier credential form.
* **Removed dependencies**: `@fortawesome/*`, `font-awesome`,
  `react-jsonschema-form`, `react-popup`, `react-select`,
  `react-highlight-words`, `query-string`, `@babel/polyfill`,
  `regenerator-runtime`.

### Credential validation

* Server-Sent Events stream replaces polling. State transitions
  arrive as they happen instead of on a 5-second cadence.
* Backed by the new `/v3/sdk/progress/<task_id>/stream` endpoint.
  Auth is a short-lived task-scoped JWT minted by the Flask
  credential-submit endpoint and forwarded as a `?token=` query
  param on the SSE subscription. The token is audience-locked to
  `sdk:sse:progress`, bound to `(user_id, task_id)`, and expires
  after 10 minutes.
* Multiple validations can run in parallel; each owns its own SSE
  subscription. The credential-submit response also returns a
  `task_token` field for SDK consumers.

### MFA / 2FA

* Inline in the validation hero element. Method picker, code entry,
  and error handling all render in the hero card without a modal hop
  or full-screen swap. See [`docs/two-factor.md`](./docs/two-factor.md).

### Terms of Use

* Renders as a Dialog overlay portal instead of replacing the
  credentials form. Form state survives the round trip; no formData
  ferrying required. The inline "Terms of Use" link is `tabIndex={-1}`
  so keyboard users cycle straight from the consent checkbox to the
  next form control.

### Init() options

* `realTimeVerification` default is unchanged from 0.7.7 (still
  `true`). Transport changed (SSE replaces polling); the UI is now
  non-blocking. Pass `realTimeVerification: false` explicitly to
  skip the validation UI.
* `enableInterop` deprecated in favor of `enablePatientAccessAPI`.
  Legacy name keeps working indefinitely; using it logs a one-time
  `console.warn`.
* `enableInteropSinglePage` deprecated in favor of
  `enablePatientAccessAPISinglePage`. Same indefinite-support rule.
* **Default change**: `enablePatientAccessAPI` now defaults to `true`
  (was implicitly `false` in 0.7.x). PAA-routed payers (those with
  `supports_interoperability_apis: true` — Anthem, UHC Interop, Kaiser
  Interop, Empire BCBS API, etc.) take the OAuth-popup branch
  automatically; the old fallthrough rendered `interoperability.OnBoard`
  with `interoperability_refresh_token` as a user-visible text input,
  which no real user could fill (the OAuth callback populates that
  field server-side). Customers who explicitly pass
  `enablePatientAccessAPI: false` (or `enableInterop: false`) keep
  the legacy behavior.
* `enablePatientAccessAPISinglePage` remains default `false`. Turning
  it on changes the OAuth flow from popup to full host-page redirect
  and would silently lose host-page state for popup-flow customers, so
  it stays opt-in.

### Headless bundle (new)

* `stream-connect-sdk/headless` subpath export ships the same SDK
  without the bundled Tailwind stylesheet (~27 KiB smaller). For
  customers who drive every step themselves via the renderXxx
  callbacks and don't want our utility-class CSS in their host page.
  Same StreamConnect function, same auth, same SSE/2FA pipeline; the
  only difference is whether `tailwind.css` is imported at module
  load. See [docs/headless.md](./docs/headless.md).
* `realtimeTimeout` and `maxRetries` are accepted but `@deprecated`
  no-ops (both were knobs for the deleted polling loop).
* `fixCredentials` is accepted but `@deprecated` and ignored.
  Member-portal mode is now derived automatically from the presence
  of `connectAccessToken` (which was already a hard backend
  requirement for the fix-credentials endpoint, so token presence
  was always the de-facto gate). Passing `fixCredentials` logs a
  one-time `console.warn`; integrators should drop it from their
  init() call.
* `userSchema` is still accepted but no longer drives form rendering.
  Customer-supplied keys are forwarded into the credential-submit
  payload as extra fields; a console warning fires once per init if
  `userSchema` is non-empty.
* All other init() options keep the same shape and names: `done*`
  callbacks, the three `render*` toggles, `theme`, `_overrideBaseUrl`,
  `forceEndStep`, etc.
* **New**: `theme.primaryColor`.
* **New**: `enablePatientAccessAPI` and `enablePatientAccessAPISinglePage`.

### Migration notes

See [`docs/migration-0.7-to-0.8.md`](./docs/migration-0.7-to-0.8.md)
for the full upgrade story. The short version:

* Default render path: new appearance applies automatically; no code
  changes needed.
* Custom render props (`renderChoosePayer={false}` /
  `renderPayerForm={false}` / `renderEndWidget={false}`): data shape
  passed into your components is unchanged.
* Bootstrap CSS is no longer needed on the host page.
* 0.7.x remains supported on the CDN for integrators not ready to
  upgrade.

## 0.7.7

* Fix-Credentials no longer white-screens when a member's carrier
  isn't in the loaded payer list; the tile renders disabled with an
  explanatory message and EnterCredentials is null-safe against a
  missing streamPayer.
* Log SDK version (`TPAStream Connect SDK v0.7.7`) on entry-point
  load.
* Migrate `EnterCredentials.componentWillMount` to constructor
  (removes React deprecation warning).
* Tighten loose-equality comparisons in `interoperability-payer-form`
  and `sdk` setStep4.
* Remove leftover dev `console.log` from interoperability polling.
* Tests added for `card`, `choose-payer`, `fix-credentials`,
  `payer-info`, `select-enroll-process`, `payer-images`, and
  `enter-credentials`.
* Dependency security: `npm audit fix` for moderate-severity
  transitive advisories.
* **`axios` bumped from `^0.21.1` to `^1.7.9`** (major version). The
  1.x line carries breaking changes (default `transformResponse`,
  error object shape, `crossdomain` / `Cookie` removal,
  `paramsSerializer`, response header casing). All in-SDK consumers
  of `sdkAxios` were audited:
  * Request shapes: all `.get/.post/.put` calls use the
    `(url, body, { params })` style supported in 1.x; no calls pass
    `transformResponse` or `paramsSerializer`.
  * Response handling: consumers read `response.data.data.<field>`
    only; `.data` JSON-parse path is unchanged in 1.x.
  * Error handling: `error.response.data.message` is unchanged in
    1.x.
  * Request defaults: phantom `crossdomain: true` removed (was a
    no-op axios silently dropped);
    `defaults.headers['X-Connect-Access-Token']` migrated to
    `defaults.headers.common['X-Connect-Access-Token']` per the 1.x
    convention.
  * No header reads in consumer code, so the response-header-casing
    change is not a risk.
  * Any host page that wraps `sdkAxios` externally and inspects axios
    internals would be the only remaining surface to verify.
* **`jquery` removed as a dependency**. The single use in
  `entries/sdk.jsx` (`$(document).ready`) was replaced with a vanilla
  `onDOMReady` helper. Embedding pages that bring their own jQuery
  are unaffected; pages that relied on the SDK to load jQuery for
  them now need to load it themselves (no evidence any did).

## 0.7.6

* Surface the carrier's specific error message in the
  interoperability payer form.

## 0.7.5

* Autofill username on fix credentials if it exists.

## 0.7.4

* Fix invalid message with 2fa-only carriers.

## v0.7.3

* Add `logo_url` to the `doneCreatedForm` callback.

## v0.7.2

* Change button language to account for redirects.

## v0.7.0

* Add fix-credentials flow for interop migrating login problem.
* Aggressively expire AccessTokens and handle redirect with new
  tokens passed in interop.

## v0.6.9

* Add `realtimeTimeout` to allow configuration around the
  validate-credentials wait time for MFA / normal validate crawls.
* Fix bug with 2fa end where screen would flicker.

## v0.6.8

* Add webview delegation init option. Allows an implementor to handle
  the final part of redirection themselves.
* Add `forceEndStep` init option.

## v0.6.7

* Open a new payer window when entering credentials for a patient
  access API.

## v0.6.4

* Hotfix URL issues with improper routing.

## v0.6.3

* Add interoperability payer flag and redirect URL.

## v0.6.2

* Bump version and have better npm ignore.

## v0.6.1

* Add payer blogs. See `includePayerBlogs` in client-usage
  documentation.
* Various bug fixes in SDK-Hooks.
* Fix SDK flow bug which caused page to stop rendering on multiple
  login inputs. Related to AIV which is now deprecated.
* Various package updates.
* Remove auto version injector. Deprecated. TPAStream devs must now
  manually update the version file.

## v0.5.5

* Add ability to implement custom widgets for payer form and the end
  widget.

## v0.5.4

* Fix bug where single-payer employers won't render.

## v0.5.3

* Add config error page.
* Make state transfer through terms-of-service widget.

## v0.5.2

* Fix issue with Anthem security questions.

## v0.5.1

* Add two-factor-authentication handling.

## v0.5.0

* Fix bug with SDK demo mode where final page won't load.

## v0.4.8

* Add individual endpoints for payer and terms of service.
* Separate the versions of the API and create a version manager.
* Drastically improve initial endpoint load time by bringing down
  less info.

## v0.4.7

* Add versioning to the CDN provider.
* Append version to all request headers for the underlying API to
  read.
