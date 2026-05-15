!['Tpastream Logo'](https://s3.amazonaws.com/tpastream-public/tpastream-logo-hori-RGB.179x33.png)

# Stream Connect JavaScript SDK

## Version

### 0.7.7

Defensive fix for the Fix-Credentials flow (no white-screen on unresolvable carriers), plus dependency hygiene, lint cleanup, and added test coverage. Logs the SDK version on entry-point load.

## Philosophy

This SDK is designed to implement the [EasyEnrollment platform](https://www.easyenrollment.net) into our clients own hosted web-portals. We want to make it fit as seemlessly as possible with the current experience of their sites; because of this, we have provided functionality to add callbacks to the end of each of the necessary flows and we are as unopinionated as possible about the styling of the SDK's flow.

In the spirit of creating a seemless process we will also be forgoing the verification of emails for users using easyenrollment. Instead, we will be relying on the implementers to provide valid emails, first names, and last names in order to create an association of information to a user.

## Change Log

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

[SDK-Hook Guide](sdk-hook/docs/README.md)

## Development Commands

`npm install`
`npm run build`
`npm run format`

Make sure to bump the version of the `package.json` with each release.

Develop APIToken `49d492e0-9772-4975-8d1e-17f0ad8f2de0` not for actual customer use.

On init you can pass in \_overrideBaseUrl for development sandbox as well.
