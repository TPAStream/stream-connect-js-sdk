# Client Usage

The `stream-connect-sdk` is the official JavaScript SDK for embedding TPA Stream’s enrollment and credential-linking flow into your application.

---

## Installation (Recommended)

We strongly recommend installing via **npm** for version control, modern bundling, and IDE support.

### 📦 Install

```bash
npm install stream-connect-sdk
# or
yarn add stream-connect-sdk
# or
pnpm add stream-connect-sdk
````

### 🧩 Basic Usage

```js
import StreamConnect from 'stream-connect-sdk';

StreamConnect({
  el: '#react-hook',
  employer: {
    vendor: 'internal',
    systemKey: 'ekey-123',
    name: 'Acme, Inc.',
  },
  user: {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    memberSystemKey: 'your-unique-id',
  },
    sdkToken: 'PublicSdkToken - get this at https://app.tpastream.com/settings/sdk',
  isDemo: false,
  realTimeVerification: true,
  doneGetSDK: ({ user, payers }) => console.log('SDK ready for', user.email),
  handleInitErrors: (err) => console.error('Init error:', err),
  handleFormErrors: (err, ctx) => console.error('Form error:', ctx.response),
});
```

### Why npm?

| Benefit                | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| **Version Control**    | Lock specific SDK versions in `package.json`.           |
| **Modern Tooling**     | Integrates with React, Vue, Angular, Vite, and Webpack. |
| **Offline Builds**     | No external CDN calls.                                  |
| **TypeScript Support** | Autocomplete and static typing in supported editors.    |
| **Tree-Shaking**       | Smaller bundles, faster loads.                          |

---

## CDN (Quick Start / Legacy)

You can still use the SDK directly via a CDN if your app is static or unbundled.

```html
<!-- Latest (auto-updates). Pin a version for production stability. -->
<script
  src="https://app.tpastream.com/static/js/sdk-v-0.7.2.js"
  defer
  integrity="sha384-WNDnKi+lZR7OF7JE4SDOqOlEo1PgNlDzDHPQT4rwjLAMVfB1DPbVf0grnTAf0W2C"
  crossorigin="anonymous"></script>

<div id="react-hook"></div>

<script>
  window.StreamConnect({
    el: '#react-hook',
    employer: {
      vendor: 'internal',
      systemKey: 'ekey-123',
      name: 'Acme, Inc.'
    },
    user: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      memberSystemKey: 'your-unique-id'
    },
    sdkToken: 'PublicSdkToken',
    isDemo: true,
  });
</script>
```

### CDN Versions

| URL                                                  | Description                  |
| ---------------------------------------------------- | ---------------------------- |
| `https://app.tpastream.com/static/js/sdk.js`         | Latest release               |
| `https://app.tpastream.com/static/js/sdk-v-0.7.2.js` | Pinned version (recommended) |

> ✅ Always pin to a specific version with SRI in production.

---

## Configuration Reference

**Legend:** ✅ Required • **Type** accurate • **Default** shown when omitted

| Key                       | Required | Type               | Default      | Notes                                                        |
| ------------------------- | :------: | ------------------ | ------------ | ------------------------------------------------------------ |
| `el`                      |     ✅    | `string`           | —            | CSS selector where the SDK will render.                      |
| `sdkToken`                |     ✅    | `string`           | —            | Public token issued by TPA Stream. Not secret.               |
| `tenant`                  |    ◻︎    | `object`           | `{}`         | Only required for multi-tenant tokens.                       |
| `tenant.vendor`           |    ◻︎    | `string`           | `'internal'` | Vendor code for this tenant.                                 |
| `tenant.systemKey`        |    ◻︎    | `string`           | —            | Tenant system key.                                           |
| `employer`                |     ✅    | `object`           | —            | Employer context; created if absent.                         |
| `employer.vendor`         |     ✅    | `string`           | `'internal'` | Employer vendor code.                                        |
| `employer.systemKey`      |     ✅    | `string`           | —            | Employer system key.                                         |
| `employer.name`           |    ◻︎    | `string`           | —            | Only needed if the employer doesn’t already exist.           |
| `user`                    |     ✅    | `object`           | —            | End user (employee/member) going through enrollment.         |
| `user.firstName`          |     ✅    | `string`           | —            |                                                              |
| `user.lastName`           |     ✅    | `string`           | —            |                                                              |
| `user.email`              |     ✅    | `string`           | —            | Used to link policy holders.                                 |
| `user.memberSystemKey`    |    ◻︎    | `string`           | —            | Your own unique identifier for the user.                     |
| `user.phoneNumber`        |    ◻︎    | `string`           | —            | Optional phone number.                                       |
| `user.dateOfBirth`        |    ◻︎    | `string`           | —            | `YYYY-MM-DD`.                                                |
| `connectAccessToken`      |    ◻︎    | `string`           | —            | Short-lived JWT for enhanced security / Fix-Credentials.     |
| `includePayerBlogs`       |    ◻︎    | `boolean`          | `false`      | Show payer update “blogs” in forms.                          |
| `enableInterop`           |    ◻︎    | `boolean`          | `false`      | Redirect to SDK interop page in new tab.                     |
| `enableInteropSinglePage` |    ◻︎    | `boolean`          | `false`      | Single-page variant; overrides `enableInterop`.              |
| `webViewDelegation`       |    ◻︎    | `boolean`          | `false`      | Delegate final redirect to host app (mobile/webview).        |
| `entrySdkStateId`         |    ◻︎    | `string`           | `''`         | Override auto-generated state ID for delegated flows.        |
| `forceEndStep`            |    ◻︎    | `boolean`          | `false`      | Jump directly to end-widget view.                            |
| `isDemo`                  |    ◻︎    | `boolean`          | `false`      | Use demo mode for styling/testing.                           |
| `realTimeVerification`    |    ◻︎    | `boolean`          | `true`       | Validate credentials in real time.                           |
| `realtimeTimeout`         |    ◻︎    | `number` (seconds) | `200`        | Max wait for crawler; consider 300–600 for MFA.              |
| `renderChoosePayer`       |    ◻︎    | `boolean`          | `true`       | Disable to render a custom payer picker.                     |
| `renderPayerForm`         |    ◻︎    | `boolean`          | `true`       | Disable to render your own form.                             |
| `renderEndWidget`         |    ◻︎    | `boolean`          | `true`       | Disable to show a custom success screen.                     |
| `userSchema`              |    ◻︎    | `object`           | `{}`         | `react-jsonschema-form` UI schema.                           |
| `fixCredentials`          |    ◻︎    | `boolean`          | `false`      | Enables Fix-Credentials flow; requires Connect Access Token. |

> ⚠️ **PII Warning:** Never log passwords, MFA codes, or security answers.

---

## Callback Reference (Execution Order)

### 1️⃣ `doneGetSDK({ user, payers, tenant, employer })`

Triggered after initialization. Use to capture SDK context.

### 2️⃣ Fix-Credentials (Optional)

* `doneSelectEnrollProcess()` — when Fix-Credentials buttons render.
* `doneFixCredentials()` — when a Fix-Credentials action starts.

### 3️⃣ `doneChoosePayer({ choosePayer, usedPayers, dropdown, streamPayers })`

After Choose-Payer widget renders.
If `renderChoosePayer: false`, use `choosePayer({ payer })` in your own UI.

### 4️⃣ `doneCreatedForm({ formJsonSchema, returnToChoosePayer, streamPayer, streamTenant, tenantTerms, toggleTermsOfUse, validateCreds })`

After form renders.
If `renderPayerForm: false`, use `validateCreds({ params })` to submit.

### 5️⃣ `doneTermsOfService()`

User clicked Terms of Service link (styling hook).

### 6️⃣ `donePopUp()`

User opened payer pop-up (styling hook).

### 7️⃣ `donePostCredentials({ params })`

Before credentials post.
Redact secrets before logging or saving.

### 8️⃣ `doneRealTime()`

Realtime validation widget rendered (styling hook).

### 9️⃣ `doneEasyEnroll({ employer, payer, tenant, policyHolder, user, pending, endingMessage, returnFlowFunction })`

Final step of flow.
Use `returnFlowFunction()` to restart or re-enter if invalid credentials.

### Error Hooks

* `handleInitErrors(error)` — Misconfiguration (e.g. missing keys).
* `handleFormErrors(error, { response, request, config })` — Failed credential post.

---

## Advanced Topics

### Connect Access Token (Recommended)

A short-lived JWT generated server-side for enhanced security.

* Lifetime: usually 1 hour.
* Required for Fix-Credentials.
* Never expose Connect secrets in the browser.
* Pass in via `connectAccessToken`.

### Interop

Use `enableInterop` or `enableInteropSinglePage` to redirect the user back to your app after payer login.
See [Interop](./interop.md) for full details.

### Delegation (webViewDelegation)

If using an in-app webview, set `webViewDelegation: true`.
You may override the `entrySdkStateId` to track session continuity.
Your app should handle the delegated redirect path.

---

## Troubleshooting

| Symptom                 | Likely Cause                                        | Fix                                                      |
| ----------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| Nothing renders         | Invalid `el` selector                               | Ensure element exists before calling `StreamConnect()`.  |
| Init error              | Missing `sdkToken`, `employer`, or `user` fields    | Use `handleInitErrors` to inspect details.               |
| Form hangs              | Short timeout                                       | Increase `realtimeTimeout` to 300–600s for MFA carriers. |
| Custom UI not advancing | Forgot to call `choosePayer()` or `validateCreds()` | Invoke SDK callbacks to move to next step.               |

---

## Security Checklist

* ✅ Serve only over HTTPS.
* ✅ Treat all callback data as sensitive.
* ✅ Redact passwords and MFA codes in logs.
* ✅ Prefer npm (local bundle) or pinned CDN + SRI.
* ✅ Rotate Connect secrets regularly; only send the JWT client-side.

---

## Migration from CDN to npm

If you previously used:

```html
<script src="https://app.tpastream.com/static/js/sdk.js"></script>
<script>window.StreamConnect({...})</script>
```

Switch to:

```js
import StreamConnect from 'stream-connect-sdk';
StreamConnect({...});
```

No global `window.StreamConnect` is required in the npm build.

---

## Changelog

See [Releases on npm](https://www.npmjs.com/package/stream-connect-sdk) for version history and new features such as Fix-Credentials, Interop delegation, and performance improvements.
