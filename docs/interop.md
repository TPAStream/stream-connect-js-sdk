# Patient Access API (Interop)

TPAStream supports carrier Patient Access APIs for SDK users. Instead of collecting carrier credentials inline, the user authenticates on the carrier's own website and TPAStream receives a 90-day access token that it uses to harvest the data. The init option that enables this flow is **`enablePatientAccessAPI`**.

> Renamed in 0.8. The option was originally called `enableInterop`; both names still work indefinitely. Passing `enableInterop` logs a one-time console deprecation warning but otherwise behaves identically. New integrations should use the canonical name.

## Client Usage
When `enablePatientAccessAPI` is set and your tenant / token is configured within TPAStream as Patient Access API-compliant, the SDK exposes payers that authenticate via a redirect to the payer website instead of an inline credentials form.

Here's how the flow goes at a top level:

![Patient Access API Flow](interop-screenshots/InteropSDKFlow.png)

As shown above, the user is sent to a new window on the payer's website, completes authentication there, and the SDK detects the connection back to TPAStream and continues normally.

## Single-page variant

Pass **`enablePatientAccessAPISinglePage`** instead of (or in addition to) `enablePatientAccessAPI` to perform the redirect in the current tab rather than opening a new window. When both are set, single-page wins.

The legacy alias `enableInteropSinglePage` is also still accepted with the same deprecation-warning treatment.

## Redirect query parameters

After the carrier redirect completes, the SDK reads two URL parameters automatically on load:

* `?accessToken=...`: a fresh connect-access token minted by `app.tpastream.com`.
* `?forceTPAStreamSdkEnd=1`: set in the single-page variant to flag the OAuth return. As of 0.8.2 the SDK shows a self-dismissing "Connected" toast in the floating panel and returns the member to the carrier picker (so they can add another carrier) rather than the full-page end widget. When `realTimeVerification: false` (no panel), it falls back to the end widget. The explicit `forceEndStep` init option is unaffected and still routes to the end widget.

Both are stripped from the URL via `history.replaceState` so they cannot leak via browser history or autofill. See [Client Usage > Redirect query parameters](./client-usage.md#redirect-query-parameters-patient-access-api) for the full mechanics.

## See also

* [Connect Access Token](./connect-access-token.md): how the
  `?accessToken=` minting fits into the broader connect-token security
  model
* [Fix Credentials](./fix-credentials.md): Patient Access API carriers
  show up in the same fix-credentials list with the same status badges
  as inline-credential carriers
