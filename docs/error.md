# Error Documentation

Errors are grouped by where they come from in the SDK lifecycle. Each
entry covers the message, the HTTP / SDK state it shows up in, and
what to do about it.

## Init-time configuration errors

### `init failed: el must be a CSS selector string`

The first argument to `StreamConnect({ el })` was undefined, missing,
or not a string. Pass a CSS selector that resolves to a single
element on the page (e.g. `'#react-hook'`).

### `init failed: element <selector> not found in DOM`

The selector passed in `el` doesn't match anything when the SDK tries
to mount. Either the element doesn't exist yet (load the SDK after
your container element renders), or the selector is wrong. The SDK
calls `handleInitErrors` with the error so your host page can log /
recover.

### `You are missing required parameters in user. We require [firstName, lastName, email].`

The `user` object passed to `StreamConnect({ user: ... })` is
missing one of the three required fields. Backend returns 422.

### `User is not a valid user for the easyenrollment sdk`

The email passed in `user.email` matches a TPAStream admin account.
Use a different email; admin accounts can't double as enrollment
users. For local testing the `+` alias trick works
(`youremail+sdktest@gmail.com`).

### `There was no APIKey Provided`

`sdkToken` / `apiToken` is missing from the init object. Both are the
same option (apiToken wins if both are set). Get the value from
TPAStream support.

### `This Token is not active`

`sdkToken` is valid but hasn't been activated yet (or has been
deactivated). Contact TPAStream support.

### `This is not a valid version for this endpoint`

The SDK version being loaded predates a server-side change. Pinned
CDN versions remain available indefinitely, so this is rare; usually
it indicates a bundle that's older than any pinned release.

## Connect Access Token errors

### `You must have a connect access token enabled and set to use fix-credentials functionality.`

The `fixCredentials: true` init option requires a
`connectAccessToken`. Mint one server-side via
`POST /api/create-connect-token` (see
[Connect Access Token](./connect-access-token.md)) and pass it to
`StreamConnect`.

### `You must include a redirect URL in your sdk-token config to enable interoperability`

The Patient Access API flow (`enablePatientAccessAPI: true`) needs a
redirect URL registered with your sdkToken so the carrier knows where
to send the user after they authenticate. Contact TPAStream support
to configure this on the sdkToken.

## SSE / real-time validation errors (0.8+)

These come from the `/v3/sdk/progress/<task_id>/stream` endpoint that
the 0.8 SDK uses for live validation updates. They are NOT shown to
the user directly. The SDK transitions the validation into a
recoverable state (`failure` or `pending_async`) and surfaces a copy
in the hero element.

| HTTP status | Detail message | Meaning | Recovery |
|---|---|---|---|
| 401 | `Missing token` | The SSE URL was hit without a `?token=` query param | Shouldn't happen via the SDK; if you proxy the URL yourself, forward the token |
| 401 | `Task token has expired` | JWT `exp` passed (10-minute TTL after dispatch) | Re-submit the credentials to get a fresh token |
| 401 | `Task not available` | The Redis `progress_task_owner` pointer expired (typically same TTL as token) | Same: re-submit |
| 403 | `Not your task` | The JWT and Redis pointer disagree on `user_id` | Token reuse across sessions; re-init the SDK |
| 422 | `Task token is invalid` | Bad signature, unknown algorithm, or malformed claims | Token was tampered with or minted by a different deploy |
| 422 | `Task token does not match requested task` | The token's `task_id` claim doesn't match the URL path | Token reuse against the wrong task; re-submit |
| 422 | `Task token audience mismatch` | `aud` claim isn't `sdk:sse:progress` | Token from a different service was forwarded |
| 422 | `Task token missing required claim: <name>` | Mint upstream produced a token missing one of `exp` / `iat` / `task_id` / `sub` | Backend bug; report it |

On any error the SDK transitions the active validation to
`pending_async` (visible in the hero / corner panel) and leaves the
wizard usable. The user can keep adding carriers; when they return
later the validation's true terminal state is reflected.

## Cred-submit + validation errors

### `Could not reach the carrier. Please try again.`

Generic transient error from the cred-submit POST. Often a brief
backend hiccup; user retry usually clears it. Surfaced in the inline
form error and via `handleFormErrors` so your host page can log.

### `Connection failed` / `<carrier-specific message>`

The carrier's Patient Access API redirect returned a `FAILURE` state.
The carrier-specific message is forwarded verbatim from the carrier's
response. Common causes: user denied consent on the carrier page,
carrier-side auth failure, expired authorization grant.

### `This carrier's connection is misconfigured. Please contact your administrator.`

The Patient Access API redirect couldn't begin because the carrier
has no `interoperability_authorization_url` configured on the backend
payer row. Not a customer-fixable problem; needs backend payer
config.

### `Connection check failed. Please try again.`

The `getInteropState` polling request rejected (network / auth /
server error). The SDK clears the interval, surfaces this message,
and lets the user retry the carrier auth from the start.

### `Unknown state of interop flow`

The interop polling endpoint returned a status the SDK doesn't know
how to handle. Indicates a backend-frontend version skew; report it.

## Form-validation errors

### `Required`

A required field on the credentials form is empty. Comes from the
Zod schema generated from the carrier's `onboard_form.schema`.

### `You must agree to the terms and services.`

The "I have read and agree to the Terms of Use" checkbox wasn't
ticked.

### `You must acknowledge that claims will be sent to the tenant.`

The tenant acknowledgement checkbox wasn't ticked.

## See also

* [Client Usage](./client-usage.md) for the full init option contract
  and the `handleFormErrors` / `handleInitErrors` callback signatures
* [SDK Flow](./sdk-flow.md) for how the wizard recovers from each
  error class
* [Two-Factor Authentication](./two-factor.md) for the MFA-specific
  error states
