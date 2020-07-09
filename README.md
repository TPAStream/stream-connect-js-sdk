 !['Tpastream Logo'](https://s3.amazonaws.com/tpastream-public/tpastream-logo-hori-RGB.179x33.png)
# Stream Connect JavaScript SDK

## Version

### 0.4.7

## Philosophy
This SDK is designed to implement the [EasyEnrollment platform](https://www.easyenrollment.net) into our clients own hosted web-portals. We want to make it fit as seemlessly as possible with the current experience of their sites; because of this, we have provided functionality to add callbacks to the end of each of the necessary flows and we are as unopinionated as possible about the styling of the SDK's flow.

In the spirit of creating a seemless process we will also be forgoing the verification of emails for users using easyenrollment. Instead, we will be relying on the implementers to provide valid emails, first names, and last names in order to create an association of information to a user.

## Client Usage
We have decided that the best possible way to implement this SDK is a simple config pattern. A prospective user will communicate with us to recieve an SDK apiToken as well as employer system keys. 

A mock implementation might look something like the following:

Using TPAStream as a CDN
```html
    <script src="https://app.tpastream.com/static/js/sdk.js"></script>
    <script>
        window.StreamConnect({
            el: '#react-hook', // This is where we nest all the pages for the form. You will pass in a selector.
            tenant: {
                systemKey: 'test',
                vendor: 'internal'
            },
            employer: {
                systemKey: 'some-system-key',
                vendor: 'internal',
                name: 'some-employer-name'
            },
            user: {
                firstName: 'Joe', 
                lastName: 'Sajor', 
                email: 'some-email@place.com' // You're going to need to provide This
            },
            isDemo: false,
            apiToken: 'VeryLegitKey', // We'll provide this.
            realTimeVerification: true,
            renderChoosePayer: true,
            doneGetSDK: ({ user, payers, tenant, employer }) => {},
            doneChoosePayer: () => {},
            doneTermsOfService: () => {},
            doneCreatedForm: () => {},
            donePostCredentials: ({ params }) => {},
            doneRealTime: () => {},
            doneEasyEnroll: ({ employer, payer, tenant, policyHolder, user }) => {},
            donePopUp: () => {},
            handleFormErrors: (error, {response, request, config}) => {} // This is a callback which will basically act as a try catch for form issues
            userSchema: {} // This is advanced functionality for those who know react-jsonform-schema
        })
    </script>
```

As shown above the SDK is mounted by calling `window.StreamConnect({})` and passing in the desired parameters.

As of SDK version 0.4.7 the CDN provider is now versioned and will support up to 10 minor versions behind.
 * Importing the various versions of the SDK is handled in `src` attribute on your script tag
    * `"https://app.tpastream.com/static/js/sdk.js"` --> Grabs the latest version of the SDK
    * `"https://app.tpastream.com/static/js/sdk-v-<VersionNumber>.js"` --> For a specific version. Examples below.
        * `"https://app.tpastream.com/static/js/sdk-v-0.4.7.js"`

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



The SDK currently supports the following parameters:
* `el` (This is where the SDK will render)
* `tenant`
    * `systemKey`
    * `vendor` (This will usually be `'internal'`)
* `employer`
    * `systemKey`
    * `vendor` (This will usually be `'internal'`)
    * `name`
* `user`
    * `firstName`
    * `lastName`
    * `email`
    * memberSystemKey (This key is your own identifier for members in your system)
    * phoneNumber
    * dateOfBirth
* `apiToken`
* isDemo (This will let you set it up without worrying about a user)
* realTimeVerification
* renderChoosePayer (If this is set to false doneChoosePayer* will pass all the required methods to create your own module)
* userSchema (This is an object `{}` following [react-jsonschema-form](https://react-jsonschema-form.readthedocs.io/en/latest/) pattern for making `ui:schema`)
* doneGetSDK*
    * user
    * payers
    * tenant
    * employer
* doneChoosePayer* (italicized are only present when renderChoosePayer is `false`)
    * *choosePayer* (This function when called with have the SDK render the next view).
        * *payer* (An object value from the streamPayers list)
        * You're object should look like `choosePayer({payer: streamPayers[some_index]})`
    * *usedPayers*
    * *dropDown*
    * *streamPayers* 
* doneTermsOfService*
* doneCreatedForm*
* donePostCredentials*
    * params (All submitted params to our API)
* doneRealTime*
* donePopUp*
* doneEasyEnroll* (Below are args passed into the func)
    * employer
    * payer
    * policyHolder
    * user
    * tenant
    * pending
    * endingMessage
* handleFormErrors*
    * error
    * error_parts
        * response
        * request
        * config

`(Required parameters are Highlighted)`

Function (`() => {}`) paramters are Starred\*

## Functionality
The SDK currently has the following flow:
1. Mount Onto Page and Make initial request.
2. From response data answer --> `Do we have multiple payers?`
    * `Yes` --> Proceed to Step 4
    * `No` --> Proceed to Step 3
3. Render choose payer's page. Let user select payer to add their new credentials to.
4. Render payer form.
    * This page will have Terms of Use, Acknowledgement, and any relevant form fields like `Security Questions` or `DOB`.
5. Handle Realtime Validation
    * If Realtime validation is off proceed to Step 7
6. Direct persons to re-enter credentials if they were found to be invalid or if valid proceed to Step 7
7. Render finish form. Prompt if they would like to add more credentials.
    * If yes this will restart from Step 1

## Change Log
### v0.4.7 (Latest)
    * Add versioning to the CDN provider
    * Append version to all request headers for underlying api to read.

## Example Page
[Here!](https://www.tpastream.com/sdk_demo.html)

## Package
[Here!](https://www.npmjs.com/package/stream-connect-sdk)

## Development Commands
`npm install`
`npm run build`
`npm run format`

Make sure to bump the version of the `package.json` with each release.

Develop APIToken `49d492e0-9772-4975-8d1e-17f0ad8f2de0` not for actual customer use.