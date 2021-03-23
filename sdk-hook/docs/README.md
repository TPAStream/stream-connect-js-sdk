# SDK Hook Usage Docs

This is a pure no component set of interfaces to instance and run the StreamConnect sdk.
Specifically it is recommended to use this package for react-native implementations of
the sdk.

## Instance Parameters
* Are required

| Field                         |            Description                                                                                  | Type    | Example                                               | Default   |
|-------------------------------|---------------------------------------------------------------------------------------------------------|---------|-------------------------------------------------------|-----------|
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
| `apiToken`*                   | The SDK Token. This has to be configured before-hand. It isn't a secret.                                | String  | `apiToken: 'VeryLegitKey'`                            | N\A       |
| `isDemo`                      | This let's you tell the SDK to not work with real data. Instead letting an implementer work on styling. | Boolean | `isDemo: true`                                        | `false`   |
| `realTimeVerification`        | For realtime validation of logins. If disabled all creds will be assumed correct by the sdk.            | Boolean | `realTimeVerification: false`                         | `true`    |

## Mock Implementation

NPM package
```javascript

// Install with NPM
npm i stream-connect-sdk-hook

import StreamConnect from 'stream-connect-sdk-hook';

const streamConnect = new StreamConnect({
  realTimeVerification: true,
  isDemo: false,
  apiToken: 'not-real-api-token',
  tenant: {
      vendor: 'internal',
      systemKey: 'test-tenant-key'
  },
  employer: {
      name: 'testingEmployer',
      systemKey: 'testing-sdk',
      vendor: 'internal',
  },
  user: {
      firstName: 'Not Real',
      lastName: 'Not Real',
      email: 'youremail+testingsdk@email.com'
  },
});
```

## SDK Steps and Functions Per Step

**Notes**
* Any function suffixed with Async returns a promise when called.
* All functions return the classes state property.

### Flow
The streamConnect SDK is designed to follow the following steps: choosePayer --> enterCredentials --> realTimeVerification --> finishEasyEnroll

The following steps will be described below as well as all of the functions provided by the StreamConnect class and how to implement them.

### choosePayer (step3)

During the first step an implementor should focus on initing the StreamConnect class filling out the config as show above. After initing the sdk an implementor should be concerned with letting the user choose a payer. The following functions are part of this flow:
* getStreamConnectInitAsync
* getStreamConnectPayerAsync

**getStreamConnectInitAsync**
* This should be the first call you make within the implementation of streamConnect
* Takes no params and returns a promise of the sdk's state.
* The state will look similar to this:
    * ```javascript {
        apiToken: "fake-api-token",
        employer: {
            employerId: 000000,
            id: 000000,
            name: "testingEmployer",
            payers: [],
            showAllPayersInEasyEnroll: true,
            supportEmailDerived: "support+sunnybenefits@easyenrollment.net",
            systemKey: "testing-sdk",
            uuid: "guid",
            vendor: "internal",
        },
        enterCredentialsUiSchema: null,
        isDemo: false,
        payer: null,
        payers: (236) [{id: 139, logoUrl: "https://s3.amazonaws.com/tpastream-public/AARP_UHC_logo.jpg", name: "AARP Medicare Supplement Insurance Plans from UnitedHealthCare", payerId: 139}, …],
        policyHolder: null,
        realTimeVerification: true,
        step: "choosePayer",
        steps: {
            step3: "choosePayer",
            step4: "enterCredentials",
            step5: "realTimeVerification",
            step6: "finishEasyEnroll",
        },
        tenant: {
            id: 14,
            name: "Sunny Benefits (Development)",
            systemKey: "system-key",
            tenantId: 14,
            termsOfUse: null,
            termsOfUseMessage: "Sunny Benefits, Inc. (Development)",
            vendor: "internal",
        },
        user: {
            active: true,
            email: "notrealemail-testing@gmail.com",
            firstName: "Testing...",
            fullName: null,
            lastName: "Testing...",
            policyHolders: [],
            roles: [{…}],
            userId: 169850,
            uuid: "guid",
        }}



* An implementor should be expressly concerned with the `payers` array within the state field. The `payers` array has several objects within it which will be passed into the next function on the sdk flow.

```javascript
getStreamConnectInitAsync
/* mock implementation */

import React, { useState, useEffect } from 'react';
import StreamConnect from 'stream-connect-sdk-hook';

const streamConnect = new StreamConnect({
  realTimeVerification: true,
  isDemo: false,
  apiToken: 'not-real-api-token',
  tenant: {
      vendor: 'internal',
      systemKey: 'test-tenant-key'
  },
  employer: {
      name: 'testingEmployer',
      systemKey: 'testing-sdk',
      vendor: 'internal',
  },
  user: {
      firstName: 'Not Real',
      lastName: 'Not Real',
      email: 'youremail+testingsdk@email.com'
  },
});

const App = (props) => {
  const [ streamConnectPayers, setStreamConnectPayers ] = useState(null);

  useEffect(() => {
    streamConnect.getStreamConnectInitAsync().then(({ payers }) => setStreamConnectPayers(payers))
  }, []);

  console.log(streamConnectPayers);

  return (
    streamConnectPayers.forEach(p => {
        return (<button onClick={() => {}}>{p.name}</button>)
    })
  )
};

export default App;
```

**getStreamConnectPayerAsync**
* This is the final call of step choosePayer. This call will progress the sdk to the next step, enter-credentials.
* Returns a promise and takes a `payer` object from the `payers` array that was set from the previous function.
* This call will get the full data of the `payer` object that you provide into the function.
    * ```javascript
        hasSecurityQuestions: false
        id: 18
        logoUrl: "https://s3.amazonaws.com/tpastream-public/aetna-logo.png"
        name: "Aetna"
        onboardForm: {form: Array(2), required: Array(2), schema: {…}, type: "object"}
        onboardUiSchema: {password: {…}, ui:order: Array(3), username: {…}}
        registerUrl: "https://member.aetna.com/memberRegistration/register/home"
* From here an implementor should access the state object of `streamConnect`
    * `streamConnect.state.enterCredentialsFormSchema`
        * A jsonschema-form object. We highly recommend you use https://github.com/royaizenberg/react-native-jsonschema-form or https://github.com/rjsf-team/react-jsonschema-form in order to parse and create the forms for these payers.
    * `streamConnect.state.enterCredentialsUiSchema`
        * A jsonschema-form UIObject.

```javascript
getStreamConnectPayerAsync
/* mock implementation */
...
const App = (props) => {
  const [ streamConnectPayers, setStreamConnectPayers ] = useState(null);
  const [ payerId, setPayerId ] = useState(null);
  const [ payerData, setPayerData ] = useState(null);

  useEffect(() => {
    streamConnect.getStreamConnectInitAsync().then(({ payers }) => setStreamConnectPayers(payers))
  }, []);

  useEffect(() => {
    streamConnect.getStreamConnectPayerAsync(streamConnectPayers.find(p => p.id === payerId)).then(({ payer }) => setPayerData(payer))
  }, [payerId])

  console.log(payerData);

  return (
    streamConnectPayers.forEach(p => {
        return (<button onClick={() => {setPayerId(p.id)}}>{p.name}</button>)
    })
  )
};

export default App;
```

### enterCredentials (step4)

This step is about rendering the form for the streamConnect sdk as well as rendering the terms of service somewhere on the page for the user to read. A significant part of this steps docs will be showing an example as to implement the jsonschema object acquired in the previous step.

**Rendering a form from step4 streamConnect**

```javascript
import Form from 'react-jsonschema-form';

/* mock implementation */
...

const App = (props) => {
  const [ streamConnectPayers, setStreamConnectPayers ] = useState(null);
  const [ payerId, setPayerId ] = useState(null);
  const [ payerData, setPayerData ] = useState(null);
  const [ formData, setFormData ] = useState(null);

  useEffect(() => {
    streamConnect.getStreamConnectInitAsync().then(({ payers }) => setStreamConnectPayers(payers))
  }, []);

  useEffect(() => {
    streamConnect.getStreamConnectPayerAsync(streamConnectPayers.find(p => p.id === payerId)).then(({ payer }) => setPayerData(payer))
  }, [payerId])

  const handleFormChange = ({ formData, uiSchema, schema }, e) => {
    setFormData(formData);
  }

  return (
    !payerData ? streamConnectPayers.forEach(p => {
        return (<button onClick={() => {setPayerId(p.id)}}>{p.name}</button>)
    }) : <Form
          schema={streamConnect.state.enterCredentialsFormSchema}
          uiSchema={streamConnect.state.enterCredentialsUiSchema}
          formData={formData}
          showErrorList={false}
          onSubmit={() => {}}
          onChange={handleFormChange}
          validate={(formData, errors) => { return errors; }}
          id="easy-enroll-form"
        >
            <div>
              <div className="tenant-terms">{payerData.tenant}</div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={false}
              >
                Validate Credentials
              </button>
            </div>
        </Form>
  )
};

export default App;
```

Now that we have a form rendered it is time to wire up the two enterCredentials functions

* getTermsTextAsync
* handleFormSubmitAsync

**getTermsTextAsync**
* This function is designed for an implementor to recieve a promise with the TPAStream terms of service as text.
    * If you are implementing the SDK we require that you add the terms of service somewhere on your page
    * Users must also check the terms of service box on the implemented SDK form.
* Example call:
    * `streamConnect.getTermsTextAsync().then(({ termsOfUse }) => { setTermsOfUse(termsOfUse) })`
    * An implementor should add a button somewhere within their created form to show terms of use. Then they should acquire it from the streamConnect.state or from the return function of `getTermsTextAsync`

**handleFormSubmitAsync**
* The final call of enterCredentials. 
* If you are an implementor using react-jsonschema-form you should be able to implement this like the following.
```javascript
    ...
    <Form
          schema={streamConnect.state.enterCredentialsFormSchema}
          uiSchema={{ ...streamConnect.state.enterCredentialsUiSchema, ...AdditionalUiSchema({ toggleTermsOfUse: toggleTerms })}}
          formData={formData}
          showErrorList={false}
          onSubmit={(formData, errors) => { streamConnect.handleFormSubmitAsync(formData).then((data) => setStreamConnectData(data))}}
          onChange={handleFormChange}
          validate={(formData, errors) => { return errors; }}
          //noValidate={true}
          id="easy-enroll-form"
    >
                <div>
              <div className="tenant-terms">{payerData.tenant}</div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={false}
              >
                Validate Credentials
              </button>
            </div>
    </Form>
```
* `handleFormSubmitAsync` takes one parameter: (formData).
    * `formData` is expected to have the following values from the form.
        * `termsAndServices` (Bool)
        * `tenantAcknowledgement` (Bool)
        * `username` (String)
        * `password` (String)
        * Conditionally `dateOfBirth` (String)
        * If there are security questions it will expect to have all of the values defined in the jsonschema property. 
    * This then returns a promise with the state in tact and sets the SDK step to step 5

### realTimeVerification (step5)

Realtime validation is where the SDK reaches out to our systems and kicks off a crawl and watches waiting for the result to see if the password and username provided are valid or invalid. This process will attempt to gather information for up to 5 minutes before deciding to give up. Should the process take longer than 5 minutes the policyHolder (the credentials) will be marked as pending by the SDK.

* `handleRealTimeVerificationAsync` takes one parameter: (progressCheckCallback)
    * `progressCheckCallback` is a function parameter
        * It is called within the function passed the entirety of the streamConnect sdk's state.
        * Example call and usage: `streamConnect.handleRealTimeVerification(({ realTimeVerificationData }) => { setRealTimeProgress(realTimeVerificationData.progress)});`
        * `realTimeVerificationData` can have the following:
            * `progress`: (Number),
            * `policyHolderId`: (Number / id),
            * `credentialsValid`: (Bool),
            * `pending`: (Bool),
            * `validationState`: (Enum),
                * SUCCESS
                * FAILURE
                * PENDING
            * `endMessage`: (String),
* handleRealTimeVerificationAsync will kick off the realTimeVerification process. It will continue crawling and attempting to refresh. Your progressCheckCallback will be called with each check. There it will update the progress bar return data via the `realTimeVerificationData` object.

Once the realtimeVerification progress reaches `100` streamConnect.state.step will change to `'finishEasyEnroll'`

### finishEasyEnroll (step6)

The final step of the streamConnect sdk. Here the credentials have been checked and submitted into the TPAStream system. In order to get the final push of data the implementor must call.

* `finishStreamConnectAsync` takes no parameters returns a promise
* Example Call: `streamConnect.finishStreamConnect().then(({ policyHolder, endingMessage, pending }) => {setStreamConnectFinish({ policyHolder, endingMessage, pending });})`
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