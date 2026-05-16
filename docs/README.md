# stream-connect-sdk docs

Reference for the 0.8 SDK. Start with the quickstart and the migration
guide; reach for the rest as needed.

## Getting started

* [Quickstart](./quickstart.md): minimal HTML page that mounts the
  SDK, step-by-step (plus Android / iOS / React Native WebView patterns)
* [Migration: 0.7 to 0.8](./migration-0.7-to-0.8.md): what changed,
  what's deprecated, what stayed the same
* [Client Usage](./client-usage.md): full reference for every init
  option and lifecycle callback

## Feature deep dives

* [SDK Flow](./sdk-flow.md): the wizard step machine (choose-payer,
  enter-credentials, real-time validation, end widget)
* [Theme](./theme.md): `theme.primaryColor` and what it does (and
  doesn't) recolor
* [Two-Factor Authentication](./two-factor.md): inline MFA in the
  hero element, what state transitions look like, what can go wrong
* [Fix Credentials](./fix-credentials.md): the per-carrier
  status-badge view (`fixCredentials: true`)
* [Patient Access API (Interop)](./interop.md): carriers that
  authenticate via redirect to the carrier site instead of inline
  credentials

## Security

* [Connect Access Token](./connect-access-token.md): server-side
  minting of `connectAccessToken` for fix-credentials and other
  advanced flows

## Reference

* [Errors](./error.md): error messages grouped by where they originate
  in the SDK lifecycle (init, cred-submit, SSE, MFA)
* [FAQ](./faq.md)

## Other packages in this repo

* [`stream-connect-sdk-hook` (v0.6.3, deprecated)](../sdk-hook/docs/README.md):
  a separate React Native / headless hook package on its own release
  line. **Deprecated** as of 0.6.3 in favor of the WebView pattern
  documented in [Quickstart > Mobile](./quickstart.md#mobile-android-ios-react-native).
  Existing integrations keep working; new ones should embed the main
  SDK in a WebView.
