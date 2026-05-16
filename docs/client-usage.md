
# Client Usage
We have decided that the best possible way to implement this SDK is a simple config pattern. A prospective user will communicate with us to receive an SDK sdkToken as well as employer system keys.

A mock implementation might look something like the following:

Using TPAStream as a CDN
```html
    <script src="https://app.tpastream.com/static/js/sdk.js"></script>
    <script>
        window.StreamConnect({
            el: '#react-hook', // CSS selector; the SDK renders under this element.
            employer: {
                systemKey: 'some-system-key',
                vendor: 'internal',
                name: 'some-employer-name'
            },
            user: {
                firstName: 'Joe',
                lastName: 'Sajor',
                email: 'some-email@place.com'
            },
            isDemo: false,
            sdkToken: 'VeryLegitKey',
            // Optional 0.8 additions:
            theme: { primaryColor: '#2563eb' },
            enablePatientAccessAPI: true,
            // Behavior toggles (defaults shown):
            realTimeVerification: true,
            renderChoosePayer: true,
            renderPayerForm: true,
            renderEndWidget: true,
            // Lifecycle callbacks:
            doneGetSDK: ({ user, payers, tenant, employer }) => {},
            doneChoosePayer: () => {},
            doneTermsOfService: () => {},
            doneCreatedForm: () => {},
            donePostCredentials: ({ params }) => {},
            doneRealTime: () => {},
            doneEasyEnroll: ({ employer, payer, tenant, policyHolder, user }) => {},
            donePopUp: () => {},
            handleFormErrors: (error, {response, request, config}) => {}
        })
    </script>
```

As shown above the SDK is mounted by calling `window.StreamConnect({})` and passing in the desired parameters.

As of SDK version 0.4.7 the CDN provider is versioned. Past versions remain available indefinitely.
 * The version is selected by the `src` attribute on your script tag.
    * `"https://app.tpastream.com/static/js/sdk.js"` -> Latest published version of the SDK.
    * `"https://app.tpastream.com/static/js/sdk-v-<VersionNumber>.js"` -> A specific version. Examples:
        * `"https://app.tpastream.com/static/js/sdk-v-0.8.0.js"`
        * `"https://app.tpastream.com/static/js/sdk-v-0.7.7.js"` (last 0.7.x)

NPM package
```javascript

// Install with NPM
npm i stream-connect-sdk

import StreamConnect from 'stream-connect-sdk';

StreamConnect({
  el: '#react-hook',
  isDemo: true
});
```

#### * Are required

| Field                         |            Description                                                                                  | Type    | Example                                               | Default   |
|-------------------------------|---------------------------------------------------------------------------------------------------------|---------|-------------------------------------------------------|-----------|
| `el`*                         | A CSS selector for where you want the sdk to render: all items will render under this element           | String  | `el: '#react-hook'`                                   | N\A       |
| `tenant`                      | The tenant configuration for this sdk instance. **Only needed if your token is configured to many tenants. Such a configuration will be made clear when TPAStream provides a token.** | Object  | `tenant: {}`                                          | `{}`      |
| `tenant.vendor`               | The `code` for the specific vendor_tenant configured for this sdk-token. This is usually `internal`     | String  | `tenant: { vendor: 'internal' }`                      | `internal`|
| `tenant.systemKey`            | The unique systemKey configured for your selected tenant on the selected vendor.                        | String  | `tenant: { systemKey: 'uniquekey' }`                  | N\A       |
| `employer`*                   | The employer configuration for this sdk instance. Employers will be created if they don't exist already | Object  | `employer: {}`                                        | N\A       |
| `employer.vendor`*            | The `code` for the specific vendor your employer is configured to.                                      | String  | `employer: { vendor: 'internal' }`                    | `internal`|
| `employer.systemKey`*         | The unique systemKey configured for your selected employer on said vendor                               | String  | `employer: { systemKey: 'ekey' }`                     | N\A       |
| `employer.name`               | Name of the employer. *Only needed if the employer doesn't already exist*                               | String  | `employer: { name: 'some-employer-name' }`            | N\A       |
| `user`*                       | The user configuration. These are created automatically if they don't exist in our system. Think of users as employees going through and entering their payer credentials into our system. This is **not** an Implementors account on TPAStream (IE youremail@email.com). If you wish to set-up the SDK for the first time try using something like `youremail+testingsdk@email.com` in order to get the ball rolling.             | Object  | `user: {}`                                            | N\A       |
| `user.firstName`*             | The user's first name                                                                                   | String  | `user: { firstName: 'Name' }`                         | N\A       |
| `user.lastName`*              | The user's last name                                                                                    | String  | `user: { lastName: 'name' }`                          | N\A       |
| `user.email`*                 | The user's email.                                                                                       | String  | `user: { email: 'email@email.com' }`                  | N\A       |
| `user.memberSystemKey`        | A unique key for an implementer to identify for their system.                                           | String  | `user: { memberSystemKey: 'some-key' }`               | N\A       |
| `user.phoneNumber`            | The user's phone number                                                                                 | String  | `user: { phoneNumber: '000-000-0000' }`               | N\A       |
| `user.dateOfBirth`            | The user's date of birth                                                                                | String  | `user: { dateOfBirth: 'YYYY-MM-DD' }`                 | N\A       |
| `sdkToken`*                   | The SDK Token. This has to be configured before-hand. It isn't a secret.                                | String  | `sdkToken: 'VeryLegitKey'`                            | N\A       |
| `apiToken`*                   | The SDK token. Same value as `sdkToken`; pass either. If both are set, `apiToken` wins. Not a secret.   | String  | `apiToken: 'VeryLegitKey'`                            | N\A       |
| `connectAccessToken`          | A generated token if advanced security is enabled. See [Connect Access Token](./connect-access-token.md). The 0.8 SDK also accepts a fresh `?accessToken=...` on the URL after a Patient Access API redirect; if present, it overrides this option for that load and is stripped from the URL via `history.replaceState`. | String  | `connectAccessToken: ''`                              | N\A       |
| `includePayerBlogs`           | Enable optional payer updates blog on each enrollment form. Has some additional info about the payer.   | Boolean | `includePayerBlogs: false`                            | `false`   |
| `theme`                       | Branding overrides applied as scoped CSS variables on the SDK root subtree. See [Theme](./theme.md).    | Object  | `theme: { primaryColor: '#2563eb' }`                  | `{}`      |
| `theme.primaryColor`          | Hex color (e.g. `#2563eb`) used to recolor buttons, links, focus rings, and progress bars. Scoped to the SDK subtree; will not bleed into host-page CSS. | String  | `theme: { primaryColor: '#2563eb' }`                  | (built-in indigo) |
| `enablePatientAccessAPI`      | Enables Patient Access API payers (carriers that authenticate via a redirect to the carrier website rather than collecting credentials inline). See [Interop](./interop.md). | Boolean | `enablePatientAccessAPI: true` | `false` |
| `enablePatientAccessAPISinglePage` | Same as `enablePatientAccessAPI` but performs the redirect in the current tab instead of opening a new window. If true, takes precedence over `enablePatientAccessAPI`. | Boolean | `enablePatientAccessAPISinglePage: true` | `false` |
| `enableInterop`               | **Deprecated** alias for `enablePatientAccessAPI`. Still works indefinitely; using it logs a one-time console warning. | Boolean | `enableInterop: true` | `false` |
| `enableInteropSinglePage`     | **Deprecated** alias for `enablePatientAccessAPISinglePage`. Same behavior. | Boolean | `enableInteropSinglePage: true` | `false` |
| `forceEndStep` | Skip directly to the end widget on load. Accepts the legacy boolean form (`true` -> end widget) and the explicit step-number form (`5` is the FinishedEasyEnroll step). The SDK also auto-applies this when the URL contains `?forceTPAStreamSdkEnd=1` (the flag is then stripped from the address bar). | Boolean \| Number | `forceEndStep: true` or `forceEndStep: 5` | `false` |
| `entrySdkStateId` | Overrides the SDK-generated state id. Used to preserve SDK flow logs across a `webViewDelegation` round trip. Do not set otherwise. | String | `entrySdkStateId: 'somestateid'` | N\A |
| `webViewDelegation` | Enables redirection delegation to a top-level webview hosting the SDK. The interop final redirect goes to `/patientaccessapi/sdk-interop-done-delegation/<string:sdk_state_id>/<int:ph_id>` for the host app to parse instead of `sdk_interop_done` or `window.location`. | Boolean | `webViewDelegation: true` | `false` |
| `isDemo`                      | Tells the SDK not to work with real data; useful while iterating on styling. Demo mode cannot save or validate credentials. | Boolean | `isDemo: true`                                        | `false`   |
| `realTimeVerification`        | Enables credential-validation UI feedback. Default is `true` (unchanged since 0.7.7). The 0.8 SDK uses a Server-Sent Events stream instead of the 0.7 polling loop, and validation renders in the non-blocking hero + corner-panel UI rather than blocking the carrier picker. Pass `false` to submit and immediately advance with no validation UI. | Boolean | `realTimeVerification: true`                          | `true`    |
| `realtimeTimeout`             | **Deprecated in 0.8.** Was the polling-loop timeout in 0.7.x. The 0.8 SDK uses SSE with a server-side stream deadline (~10 minutes) and no longer reads this option. Accepted for back-compat but has no effect. | Number | `realtimeTimeout: 600`                          | n/a    |
| `renderChoosePayer`           | Render the built-in choose-payer widget. If `false`, the widget is omitted and you must drive payer selection from the `doneChoosePayer` callback. | Boolean | `renderChoosePayer: false`                            | `true`    |
| `renderPayerForm`             | Render the built-in credentials form. If `false`, drive it from `doneCreatedForm`. | Boolean | `renderPayerForm: false`                              | `true`    |
| `renderEndWidget`             | Render the built-in end widget. If `false`, drive it from `doneEasyEnroll`. | Boolean | `renderEndWidget: false`                              | `true`    |
| `userSchema`                  | **Changed in 0.8.** In 0.7.x this drove `react-jsonschema-form` UI-schema customization for the credentials form. `react-jsonschema-form` was removed in 0.8, so `userSchema` no longer affects rendering; the object is forwarded into the credential-submit payload for downstream consumers, and the SDK emits a one-time console warning when set. File an issue if you relied on UI-schema-driven extra fields. | Object  | `userSchema: {}`                                      | `{}`      |
| `fixCredentials`              | Enable [fix-credentials functionality](./fix-credentials.md) in the SDK. Requires `connectAccessToken`. | Boolean | `fixCredentials: true` | `false` |
| `maxRetries`                  | **Deprecated in 0.8.** Was the retry count for the 0.7.x polling validation loop. The 0.8 SDK uses SSE with no client-side retry knob; this option is accepted for back-compat but has no effect. | Number  | `maxRetries: 3` | n/a |
| `_overrideBaseUrl`            | Override the API base URL the SDK talks to. Used by the `/sdk-test` sandbox and integration tests; do not set in production. | String  | `_overrideBaseUrl: 'https://stevedev.tpastream.com'` | (`app.tpastream.com`) |

## Redirect query parameters (Patient Access API)

When the Patient Access API flow returns the user from a carrier site back to the page hosting the SDK, the redirect URL can carry two query parameters that the 0.8 SDK reads automatically on init:

* **`?accessToken=...`**: a fresh connect-access token minted by `app.tpastream.com` after the carrier redirect completes. The SDK reads it on load, uses it for the remainder of the session, and (regardless of whether `connectAccessToken` was already set in the init object) takes the URL value as the freshest. The token is single-use.
* **`?forceTPAStreamSdkEnd=1`**: set by the redirect URL the SDK constructs when `enablePatientAccessAPISinglePage` is `true`. Tells this load to skip straight to the end widget instead of restarting at choose-payer.

Both parameters are stripped from the URL via `history.replaceState` after the SDK reads them. `replaceState` (not `pushState`) is used deliberately: the back button cannot restore the original URL, so the single-use access token cannot leak via history navigation, browser autofill, or referrer headers.

You do not need to handle these parameters yourself; this section documents them so that integrators who inspect the URL or rely on `popstate` events know what to expect.

## Callbacks
The main way an implementor will be interacting and modifying the `stream-connect-js-sdk` is via our various callbacks placed at key flowpoints of the SDK. In these callbacks the implementors are recommended to use `JavaScript` to style the various widgets as well as handle any additional custom logic which they deem necessary. These callbacks also include various amounts of information which can be helpful when trying to integrate fully with the TPAStream system.

### `doneGetSDK`
`doneGetSDK` is the first callback to be called in the SDK flow. It occurs when the system has finished its initial request to TPAStream systems.

Data passed back -- These objects will have various information from the SDK. An Implementor might be concerned with any of the below.
* `user`
    * `email` -- You should see that this email is the same as the one you set in configuration. The SDK can interface with a TPAStream user to create policy_holders via email and token.
    * `user_id` -- The unique identifier TPAStream uses for this user.
    * `policy_holders` -- This will list out all of the policy_holders associated with the user. You can think of these as the saved credentials per carrier. Data passed back here will be limited.
        * `payer_id` -- The ID for the specific payer these credentials exist for.
        * `id` and `policy_holder_id` -- The unique identifier TPAStream uses for this set of credentials. If you implement any of the *TPAStream Webhooks* you will find this info useful for association.
* `tenant`
    * `id` and `tenant_id`
    * `name`
    * `terms_of_use_message` -- This is configured at the tenant level. It allows specific terms of service messages per tenant. If you implement a custom widget you might be concerned with this data.
* `payers` -- List of Payers. If implementing a custom choose-payer widget (`renderChoosePayer` is `false`) an implementor should use this data in the `doneChoosePayer.choosePayer` callback.
    * `id` and `payer_id`
    * `logo_url`
    * `name`
* `employer`
    * `id` and `employer_id`
    * `name`
    * `payers` -- The preferred payers to use on an employer. This can be configured in the TPAStream App.
    * `show_all_payers_in_easy_enroll` -- When set `true` all payers supported in TPAStream will render as options in the widget. `true` is the default for an employer generated by the SDK
    * `support_email_derived` -- Configured within the TPAStream App.

Example Usage:
```javascript
StreamConnect({
  el: '#react-hook',
  ...
  doneGetSDK: ({ user, payers, tenant, employer }) => {
      // Do something with this data
  },
});
```

### `doneSelectEnrollProcess`
`doneSelectEnrollProcess` is fired right after doneGetSDK when `fixCredentials` is `true`. This is primarly meant for styling the two buttons.

Example Usage:
```javascript
StreamConnect({
  el: '#react-hook',
  ...
  doneSelectEnrollProcess: () => {
      // Do some styling
  },
});
```

### `doneFixCredentials`
`doneFixCredentials` is is fired after the Fix Credentials card is clicked in the select enroll flow. This only fires when `fixCredentials` is `true`

Example Usage:
```javascript
StreamConnect({
  el: '#react-hook',
  ...
  doneFixCredentials: () => {
      // Do some styling
  },
});
```

### `handleInitErrors`
`handleInitErrors` is a callback which runs whenever there was a configuraiton error with the SDK. This configuration error will have a message attached to it explaining to an implementor what the problem with the configuration was. During this callback an implementor could add custom logic to handle custom messaging for the user who might be experiencing this error.
Example Usage:
```javascript
StreamConnect({
  el: '#react-hook',
  ...
  handleInitErrors: (error) => {
      // Do something with this data
  },
});
```

### `doneChoosePayer`
`doneChoosePayer` is the second callback to be called in the SDK flow. It occurs when the system has finished rendering the choose-payer widget. If the default widget is enabled then there are no parameters passed back into it. Instead implementors will be using this callback to style the default widget to their liking. This may take a little bit of effort depending on how your system looks and feels. It is best to worry about these changes while setting `isDemo` equal to `true` so that you can do so without worrying about creating data.

If `renderChoosePayer: false` then this callback now passes back the params necessary for an implementor to create their own completely custom widget.
* `choosePayer` -- This is a `javascript function`. Calling this will render the next widget. On a custom implementation you should have this as the select option. 
    Accepted Properties below
    * `payer` -- This is an `object` value. This object should be from `doneGetSDK.streamPayers`
    * An example call would look like `choosePayer({ payer: streamPayers[some_choosen_index] })`
* `usedPayers` -- This is a list of `payer_id`s. These ids are for payers which already have credentials associated to them.
* `dropdown` -- If this value is `true` then the SDK will intend for a dropdown of all payers to be used. This value is the same as `doneGetSDK.employer.show_all_payers_in_easy_enroll`
* `streamPayers` -- A list of all payers for this SDK instance based on employer. This will be the same as `doneGetSDK.streamPayers`

Example Usage:
```javascript
StreamConnect({
  el: '#react-hook',
  ...
  renderChoosePayer: false, // If this is true then there will be no data passed back to doneChoosePayer
  doneChoosePayer: ({ choosePayer, usedPayers, dropdown, streamPayers }) => {
      const selectPayer = (payerId) => {
          hideCustomWidget();
          choosePayer({ payer: streamPayers.find(p => p.id === payerId)});
      }
      /* 
        Here this function would do some stuff to render your custom widget.
        selectPayer will be called when a payer is chosen by the user. That will in turn pass a payer ID back to the func.
        That will in turn pick a payer from streamPayers and pass it to choose payer. When choose payer is called. The
        Next SDK widget will render nested inside #react-hook
      */
      renderCustomWidget({ carriers: streamPayers, carriersWithCredentials: usedPayers, selectPayer: selectPayer })
  },
});
```

### `doneCreatedForm`
`doneCreatedForm` is the third callback to be called in the SDK flow. It occurs when the system finishes render the specific enrollment form for a carrier. This callback is purely used by the implementor for styling the form via JavaScript.

If `renderPayerForm: false` then this callback now passes back the params necessary for an implementor to create their own completely custom widget.
* `formJsonSchema` -- Provides a JS object which contains the configuration of the forms. Follows [Json Schema Form](https://github.com/json-schema-form) configuration.
    * Within this schema you will find all the security questions for a given payer as well as lots of other values and requirements.
* `returnToChoosePayer` -- When called it will reset the `el` which the SDK is hooked into and re-render the ChoosePayer widget.
    * An example call would look like `returnToChoosePayer();`
* `streamPayer` -- The carrier/payer object associated with the form and the credentials to be implemented.
* `streamTenant` -- The tenant object the SDK and credentials it will be associated. This can be used to adjust text on your widget.
* `tenantTerms` -- The custom terms of service configured by the Tenant.
* `toggleTermsOfUse` -- renders the terms of use widget.
    * An example call would look like `toggleTermsOfUse();`
* `validateCreds` -- Function which will submit the values of the form and then begin the realtime validation process.
    * `params` -- The values from the form to be submitted.
    * An example call would look like `validateCreds({ params: formValues });`

Example Usage:
```javascript
StreamConnect({
  el: '#react-hook',
  ...
  doneCreatedForm: ({ formJsonSchema, returnToChoosePayer, streamPayer, streamTenant, tenantTerms, toggleTermsOfUse, validateCreds}) => {},
});
```

### `doneTermsOfService`
`doneTermsOfService` Callback occurs when the user clicks on the TPAStream terms of service link. This callback is purely used by the implementor for styling the form via JavaScript.

Example Usage:
```javascript
StreamConnect({
  el: '#react-hook',
  ...
  doneTermsOfService: () => {
      // Do some styling
  },
});
```

### `donePopUp`
`donePopUp` Callback occurs when the user clicks on carrier pop-up. This callback is purely used by the implementor for styling the form via JavaScript.

Example Usage:
```javascript
StreamConnect({
  el: '#react-hook',
  ...
  donePopUp: () => {
      // Do some styling
  },
});
```

### `donePostCredentials`
`donePostCredentials` fires when the user submits the credentials form and the SDK is posting the new creds. The callback gives implementors a chance to intercept the post payload (for example to persist to your own backend) before the SDK moves on to the validation step.

These values vary by carrier. Common fields:
* `params`
    * `username`
    * `password`
    * `date_of_birth`
    * `termsAndServices` and `accept` -- The user accepted the terms of use
    * `payer_id`
    * `tenants_accept` -- (List) Whether or not the user accepted the tenants terms of use
    * `tenantAcknowledgement` -- Whether or not the user accepted the sending of their claims to the tenant.
    * `security_question_first` -- First security question answer
    * `security_question_first_choice`
    * `security_question_second`
    * `security_question_second_choice`
    * `security_question_third`
    * `security_question_third_choice`

In 0.8, the credential-submit response also includes a `task_token` (a short-lived task-scoped JWT bound to the validation task) that the SDK uses internally to subscribe to the `/v3/sdk/progress/<task_id>/stream` SSE channel. Implementors do not need to handle the token themselves; the SDK uses it transparently. The token is audience-locked to `sdk:sse:progress`, valid for 10 minutes, and tied to the submitting user.

Example Usage:
```javascript
StreamConnect({
  el: '#react-hook',
  ...
  donePostCredentials: ({ params }) => {
      // Save the params to your system
      saveParams(params);
  },
});
```

### `handleFormErrors`
`handleFormErrors` Callback occurs when there was an issue submiting and saving the users credentials. While the SDK handles these errors and their presentation to the user, implementors might want additional info around these errors in order to better tune the SDK.

This information can be obtuse. Its use may vary. Most implementors prefer to save this data in order to create info on what issues the users may have with saving.
* `error`
* `error_parts`
    * `response`
    * `request`
    * `config`

Example Usage:
```javascript
StreamConnect({
  el: '#react-hook',
  ...
  handleFormErrors: (error, {response, request, config}) => {
      // Save the params to your system
      console.log("Error Response -- Saving error to backend for logging purposes...");
      console.log(response);
      saveError(error);
  },
});
```

### `doneRealTime`
`doneRealTime` Callback occurs when the system finishes rendering the realtime-validation widget. If `realTimeVerification: false` this callback is never hit. This call back is purely for styling purposes.

Example Usage:
```javascript
StreamConnect({
  el: '#react-hook',
  ...
  doneRealTime: () => {
      // Do some styling
  },
});
```

### `doneEasyEnroll`
`doneEasyEnroll` This is the final callback of the SDK widget and it occurs when the system. There is a bunch of data dumped at the end which can be useful for an implementor when they are working the *TPAStream Webhooks*

There are several properties passed back through this callback. Only a few may be applicable to an implementor.
* `employer`
* `payer`
* `tenant`
* `user`
* `pending` -- The literal value the SDK is looking at to determine whether or not to show the pending page. If this is true the policyHolder is still pending.
* `endingMessage` -- The specific ending message the SDK got from the backend to say to this user depending on their credentials status.
* `policyHolder` -- The now saved policy_holder
    * `policy_holder_id`
    * `payer_id`
    * `login_correction_message` -- This will be null unless the `login_problem !== 'valid' || login_problem !== null`
    * `login_needs_correction` -- `true` or `false`. If `true` these credentials were found to be invalid via the realtime-validation engine.
    * `login_problem` -- This can be equal to any of the following below. Each has a different meaning around the credentials
        * `'valid'` -- The credentials are completely fine. Claims should start being collected shortly
        * `'invalid'` -- The crawl engine found that these credentials are not valid for the carrier. The user will be prompted to re-enter valid credentials into the SDK.
        * `'locked'` -- The crawl engine has identified that the carrier has locked this account for any number of reasons. This will require further action on the user's side in order to resolve.
        * `'broken'` -- The crawl engine has identified some issue with this credential's account. This usually requires the carriers to fix some issue on their site for progress to occure
        * `'needs_two_factor'` -- Support for two factor authentication for said payer is coming soon.
        * `'incomplete'` -- The crawl engine has identified that the registration for the user's credentials on the carrier site is incomplete. This will require action on the user's side to resolve.
        * `'inactive'` -- The user's account has been identified as inactive and thus will not be accessible to the crawler.
        * `'sec_question'` -- The user's security questions appear to be incorrect. The user will be prompted to re-enter valid credentials
        * `'wrong_secondary'` -- The user's account is configured to be using the wrong secondary method of authentication. This will prompt the user to update their account to use security questions.
        * `null` -- The crawl engine is still trying to confirm the status of these credentials. This may take up to 24 hours depending on the carrier's site uptime.

If `renderEndWidget: true` then you will be given access to the following params as well.
* `returnFlowFunction` This will restart the SDK engine or return the user to the payer form depending on if the credentials were valid or not.
    * An example call of this function looks like `returnFlowFunction()`

Example Usage:
```javascript
StreamConnect({
  el: '#react-hook',
  ...
  doneEasyEnroll: ({ employer, payer, tenant, policyHolder, user, returnFlowFunction }) => {
      // Do something with the data.
  },
});
```
