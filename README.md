!['Tpastream Logo'](https://s3.amazonaws.com/tpastream-public/tpastream-logo-hori-RGB.179x33.png)

# Stream Connect JavaScript SDK

## Version

### 0.8.0

Polished default appearance, React 19 + TypeScript, real-time credential-validation streaming, and a substantial dependency cleanup. The init() contract is backward-compatible: every option supported in 0.7.7 keeps working, including the custom render props (`renderChoosePayer`, `renderPayerForm`, `renderEndWidget`).

## Philosophy

This SDK embeds the [EasyEnrollment platform](https://www.easyenrollment.net) into the host application's own pages. From 0.8.0 onward, the SDK ships with a polished default appearance so it looks good out of the box on any host page, with no required CSS work. Branding is configurable via `theme.primaryColor`, and the existing custom render props remain available for integrators who want full control over a particular step.

## Change Log

Latest highlights below. The full per-version changelog lives in
[CHANGELOG.md](./CHANGELOG.md).

### 0.8.0 highlights

* Polished default appearance; no host-page CSS required.
* `theme.primaryColor` init option recolors buttons, links, focus
  rings, and progress bars.
* React 19, full TypeScript port; substantial dependency cleanup
  (Bootstrap, jQuery, FontAwesome, react-jsonschema-form, react-popup,
  react-select, query-string and others removed).
* Non-blocking credential validation: SSE-driven progress in a hero
  element + corner panel, parallel validations, inline 2FA, no
  modal/full-screen takeover.
* `enableInterop` -> `enablePatientAccessAPI` rename (legacy alias
  kept indefinitely).
* `realtimeTimeout` and `maxRetries` accepted but `@deprecated`
  no-ops (knobs for the deleted polling loop).
* `fixCredentials` accepted but `@deprecated` and ignored;
  member-portal mode is derived from `connectAccessToken` presence.
* Backward-compatible with 0.7.7 at the `init()` call site. See
  [`docs/migration-0.7-to-0.8.md`](./docs/migration-0.7-to-0.8.md)
  for the upgrade story.

## Example Page

[Here!](https://www.tpastream.com/sdk_demo.html)

## Package

[Here!](https://www.npmjs.com/package/stream-connect-sdk)

## Additional Documentation

Start with [`docs/`](./docs/README.md) for a full table of contents.
Common entry points:

* [Quickstart](docs/quickstart.md)
* [Client Usage](docs/client-usage.md): full init option reference
* [Migrating from 0.7.x to 0.8](docs/migration-0.7-to-0.8.md)
* [SDK Flow](docs/sdk-flow.md)
* [Two-Factor Authentication](docs/two-factor.md)
* [Fix Credentials](docs/fix-credentials.md)
* [Patient Access API (Interop)](docs/interop.md)
* [Theme](docs/theme.md)
* [Connect Access Token](docs/connect-access-token.md)
* [Errors](docs/error.md)
* [FAQ](docs/faq.md)

The separate React Native hook package (`stream-connect-sdk-hook@0.6.2`)
is **soft-deprecated** in favor of embedding the main SDK in a WebView.
The published 0.6.2 tarball on npm keeps working for existing
integrations; we're not republishing because the hook's source
imports from `assets/shared/` which the 0.8 rewrite deleted, and
the right path for new integrations is the WebView pattern anyway.
See [`sdk-hook/docs/README.md`](sdk-hook/docs/README.md) for the
deprecation notice and recommended pattern;
[Quickstart > Mobile](docs/quickstart.md#mobile-android-ios-react-native)
has end-to-end examples.

## Development Commands

```
npm install                # install dependencies
npm run build              # build sdk.js (production bundle)
npm run format             # biome check --write across assets/
npm test                   # lint + typecheck (runs both below)
npm run test:lint          # biome check assets/
npm run test:types         # tsc --noEmit
```

Bump the `version` in `package.json` with each release and update
[CHANGELOG.md](./CHANGELOG.md).

## Local sandbox

A dev-only `/sdk-test` route is wired into the stream webapp for
iterating on the SDK against a real backend. It mints a fresh
connect access token server-side per request and embeds the SDK with
a known-good fixture. See `stream/views.py::sdk_test` in the
[stream repo](https://github.com/LakeEriePartners/stream) for the
implementation, and `stream/static/js/sdk-test.js` for the bundled
SDK artifact it serves.
