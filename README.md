!['Tpastream Logo'](https://s3.amazonaws.com/tpastream-public/tpastream-logo-hori-RGB.179x33.png)

# Stream Connect JavaScript SDK

## Version

### 0.8.0

Polished default appearance, React 19 + TypeScript, real-time credential-validation streaming, and a substantial dependency cleanup. The init() contract is backward-compatible: every option supported in 0.7.7 keeps working, including the custom render props (`renderChoosePayer`, `renderPayerForm`, `renderEndWidget`).

## Philosophy

This SDK embeds the [EasyEnrollment platform](https://www.easyenrollment.net) into the host application's own pages. From 0.8.0 onward, the SDK ships with a polished default appearance so it looks good out of the box on any host page, with no required CSS work. Branding is configurable via `theme.primaryColor`, and the existing custom render props remain available for integrators who want full control over a particular step.

## Change Log

### 0.8.0

  Look and feel

    * Polished default appearance — cards, generous whitespace, system-font stack, accessible focus rings. No host-page CSS required; the SDK is visually self-contained
    * New `theme.primaryColor` init option (hex like `#2563eb`) recolors buttons, links, focus rings, and progress bars

  Stack

    * React 19, full TypeScript port
    * Tailwind utility classes (`tpa-` prefix) for styling, scoped to a single `.tpa-sdk-root` subtree to prevent host-page CSS collisions
    * Headless UI primitives for accessible Dialog and Combobox
    * React Hook Form + Zod for the carrier credential form
    * Removed: `@fortawesome/*`, `font-awesome`, `react-jsonschema-form`, `react-popup`, `react-select`, `react-highlight-words`, `query-string`, `@babel/polyfill`, `regenerator-runtime`

  Credential validation

    * Server-Sent Events stream replaces polling. State transitions arrive as they happen instead of on a 5-second cadence
    * Backed by the new `/v3/sdk/progress/<task_id>/stream` endpoint. Auth is a short-lived task-scoped JWT minted by the Flask credential-submit endpoint and forwarded as a `?token=…` query param on the SSE subscription. The token is audience-locked to `sdk:sse:progress`, bound to (user_id, task_id), and expires after 10 minutes
    * Multiple validations can run in parallel; each owns its own SSE subscription. The credential-submit response also returns a `task_token` field for SDK consumers

  Init() options

    * `realTimeVerification` default is unchanged from 0.7.7 (still `true`). What's changed is the *transport*: validation state now arrives over SSE instead of a 5-second polling loop, and surfaces in the non-blocking hero + corner-panel UI rather than blocking the carrier picker. Pass `realTimeVerification: false` explicitly to preserve the old submit-and-trust behavior with no validation UI feedback
    * `enableInterop` is deprecated in favor of `enablePatientAccessAPI`. The legacy name keeps working indefinitely; using it logs a one-time deprecation warning to the console
    * `enableInteropSinglePage` is deprecated in favor of `enablePatientAccessAPISinglePage`, same indefinite-support rule
    * No other init() option changed. All `done*` callbacks, the three `render*` toggles, `theme`, `userSchema`, `_overrideBaseUrl`, and the rest keep the same shape and names
    * New: `theme.primaryColor`
    * New: `enablePatientAccessAPI` and `enablePatientAccessAPISinglePage`

  Migration notes

    * If you use the default render path, the new appearance applies automatically with no code changes
    * If you use custom render props (`renderChoosePayer={false}` / `renderPayerForm={false}` / `renderEndWidget={false}`), the data shape passed into your components is unchanged
    * If you previously omitted `realTimeVerification`, validation is still on by default. The transport is now SSE-backed and the UI is non-blocking: after submit, the user is returned to the picker / manage page while the hero + corner panel tracks validation in real time (MFA prompts surface inline). To preserve the prior 0.7-style submit-and-trust flow without modification, set `realTimeVerification: false` explicitly
    * The SDK no longer needs Bootstrap CSS on the host page. Pages that already load Bootstrap can continue to do so without conflict
    * 0.7.x remains supported for integrators not ready to upgrade

### 0.7.7

    * Fix-Credentials no longer white-screens when a member's carrier isn't in the loaded payer list; the tile renders disabled with an explanatory message and EnterCredentials is null-safe against a missing streamPayer
    * Log SDK version (`TPAStream Connect SDK v0.7.7`) on entry-point load
    * Migrate `EnterCredentials.componentWillMount` to constructor (removes React deprecation warning)
    * Tighten loose-equality comparisons in `interoperability-payer-form` and `sdk` setStep4
    * Remove leftover dev `console.log` from interoperability polling
    * Tests added for `card`, `choose-payer`, `fix-credentials`, `payer-info`, `select-enroll-process`, `payer-images`, and `enter-credentials`
    * Dependency security: `npm audit fix` for moderate-severity transitive advisories
    * **`axios` bumped from `^0.21.1` to `^1.7.9` (major version)**. The 1.x line carries breaking changes (default `transformResponse`, error object shape, `crossdomain` / `Cookie` removal, `paramsSerializer`, response header casing). All in-SDK consumers of `sdkAxios` were audited:
        - Request shapes: all `.get/.post/.put` calls use the `(url, body, { params })` style supported in 1.x; no calls pass `transformResponse` or `paramsSerializer`.
        - Response handling: consumers read `response.data.data.<field>` only; `.data` JSON-parse path is unchanged in 1.x.
        - Error handling: `error.response.data.message` is unchanged in 1.x.
        - Request defaults: phantom `crossdomain: true` removed (was a no-op axios silently dropped); `defaults.headers['X-Connect-Access-Token']` migrated to `defaults.headers.common['X-Connect-Access-Token']` per the 1.x convention.
        - No header reads in consumer code, so the response-header-casing change is not a risk.
        Any host page that wraps `sdkAxios` externally and inspects axios internals would be the only remaining surface to verify.
    * **`jquery` removed as a dependency**. The single use in `entries/sdk.jsx` (`$(document).ready`) was replaced with a vanilla `onDOMReady` helper. Embedding pages that bring their own jQuery are unaffected; pages that relied on the SDK to load jQuery for them now need to load it themselves (we have no evidence any did).

### 0.7.6

    * Surface the carrier's specific error message in the interoperability payer form

### 0.7.5

    * Autofill username on fix credentials if it exists

### 0.7.4

    * Fix invalid message with 2fa-only carriers

### v0.7.3

    * add logo_url to the doneCreatedForm callback

### v0.7.2

    * Change button language to account for redirects

### v0.7.0

    * Add in to fix-credentials flow interop migrating login problem
    * Aggressively Expire AccessTokens and handle redirect with new tokens passed in interop

### v0.6.9

    * Add in `realtimeTimeout` to allow for configuration around the validate credentials wait time for MFA / normal validate crawls.
    * Fix bug with 2fa end where screen would flicker.

### v0.6.8

    * Adds in webview delegation init option. This allows an implementor to handle the final part of redirection themselves.
    * Adds in forceEndStep init option.

### v0.6.7

    * Open a new payer window when entering credentials for a patient access api.

### v0.6.4

    * Hotfix URL issues with improper routing.

### v0.6.3

    * Add in interoperability payer flag and redirect URL

### v0.6.2

    * Bump version and have better npm ignore

### v0.6.1

    * Add in payer blogs. See includePayerBlogs in client-usage documentaiton.
    * Various bug fixes in SDK-Hooks
    * Fix SDK flow bug which caused page to stop rendering on multiple login inputs. This was related to AIV which is now deprecated.
    * Various package updates
    * Remove auto version injector. Deprecated. TPAStream Devs MUST now manually update the file (unfortunately)

### v0.5.5

    * Add in ability to implement custom widgets for payer form and the end widget.

### v0.5.4

    * Fix bug where single payer employers won't render

### v0.5.3

    * Add config error page
    * Make state transfer through terms of service widget

### v0.5.2

    * Fix issue with Anthem security questions.

### v0.5.1

    * Add two factor authentication handling.

### v0.5.0

    * Fix bug with sdk demo mode where final page won't load

### v0.4.8

    * Add individual endpoints for the following: payer and terms of service
    * Seperate the versions of the api and create a version manager.
    * Drastically improve initial endpoint loadtime by bringing down less info.

### v0.4.7

    * Add versioning to the CDN provider
    * Append version to all request headers for underlying api to read.

## Example Page

[Here!](https://www.tpastream.com/sdk_demo.html)

## Package

[Here!](https://www.npmjs.com/package/stream-connect-sdk)

## Additional Documentation

[Client Usage](docs/client-usage.md)

[SDK Flow Details](docs/sdk-flow.md)

[QuickStart Guide](docs/quickstart.md)

[Theme](docs/theme.md)

[Migrating from 0.7.x to 0.8](docs/migration-0.7-to-0.8.md)

[SDK-Hook Guide](sdk-hook/docs/README.md)

## Development Commands

`npm install`
`npm run build`
`npm run format`

Make sure to bump the version of the `package.json` with each release.

Develop APIToken `49d492e0-9772-4975-8d1e-17f0ad8f2de0` not for actual customer use.

On init you can pass in \_overrideBaseUrl for development sandbox as well.
