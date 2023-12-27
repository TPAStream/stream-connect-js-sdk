import '@babel/polyfill';
import React from 'react';
import { render } from 'react-dom';
import SDK from '../components/sdk';
import $ from 'jquery';

let version = '0.6.7';

function uuidv4() {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

const affirmInstance = ({
  el,
  apiToken,
  sdkToken,
  connectAccessToken,
  tenant,
  employer,
  user,
  realTimeVerification,
  renderChoosePayer,
  renderPayerForm,
  renderEndWidget,
  includePayerBlogs,
  isDemo,
  fixCredentials,
  enableInterop,
  enableInteropSinglePage,
  forceEndStep,
  userSchema,
  doneGetSDK,
  doneSelectEnrollProcess,
  doneFixCredentials,
  doneChoosePayer,
  doneTermsOfService,
  donePopUp,
  doneCreatedForm,
  donePostCredentials,
  doneRealTime,
  doneEasyEnroll,
  handleFormErrors,
  handleInitErrors
}) => {
  const sdkPropParsed = {
    el: typeof el == 'string',
    apiToken: apiToken ? typeof apiToken == 'string' : true,
    sdkToken: sdkToken ? typeof sdkToken == 'string' : true,
    connectAccessToken: connectAccessToken
      ? typeof connectAccessToken == 'string'
      : true,
    tenant:
      tenant &&
      typeof tenant == 'object' &&
      typeof tenant.systemKey == 'string' &&
      typeof tenant.vendor == 'string',
    employer:
      employer &&
      typeof employer == 'object' &&
      typeof employer.systemKey == 'string' &&
      typeof employer.name == 'string',
    user:
      user &&
      typeof user == 'object' &&
      typeof user.firstName == 'string' &&
      typeof user.lastName == 'string' &&
      typeof user.email == 'string' &&
      (user.memberSystemKey ? typeof user.memberSystemKey == 'string' : true) &&
      (user.phoneNumber ? typeof user.phoneNumber == 'string' : true) &&
      (user.dateOfBirth ? typeof user.dateOfBirth == 'string' : true),
    realTimeVerification: typeof realTimeVerification == 'boolean',
    renderChoosePayer: typeof renderChoosePayer == 'boolean',
    renderPayerForm: typeof renderPayerForm == 'boolean',
    renderEndWidget: typeof renderEndWidget == 'boolean',
    includePayerBlogs: typeof includePayerBlogs == 'boolean',
    isDemo: typeof isDemo == 'boolean',
    fixCredentials: typeof fixCredentials == 'boolean',
    enableInterop: typeof enableInterop == 'boolean',
    enableInteropSinglePage: typeof enableInteropSinglePage == 'boolean',
    userSchema: typeof userSchema == 'object',
    doneGetSDK: typeof doneGetSDK == 'function',
    doneSelectEnrollProcess: typeof doneSelectEnrollProcess == 'function',
    doneFixCredentials: typeof doneFixCredentials == 'function',
    doneChoosePayer: typeof doneChoosePayer == 'function',
    doneTermsOfService: typeof doneTermsOfService == 'function',
    donePopUp: typeof donePopUp == 'function',
    doneCreatedForm: typeof doneCreatedForm == 'function',
    donePostCredentials: typeof donePostCredentials == 'function',
    doneRealTime: typeof doneRealTime == 'function',
    doneEasyEnroll: typeof doneEasyEnroll == 'function',
    handleFormErrors: typeof handleFormErrors == 'function',
    handleInitErrors: typeof handleInitErrors == 'function'
  };

  for (const key in sdkPropParsed) {
    if (!sdkPropParsed[key]) {
      console.log(
        `${key} instance variable is currently incorrectly configured.`
      );
      return false;
    }
  }
  return true;
};

const StreamConnect = ({
  el,
  apiToken = null,
  sdkToken = null,
  connectAccessToken = undefined,
  tenant = { systemKey: '', vendor: '' },
  employer = { systemKey: '', vendor: '', name: '' },
  user = {
    firstName: '',
    lastName: '',
    email: '',
    memberSystemKey: '',
    phoneNumber: '',
    dateOfBirth: ''
  },
  realTimeVerification = true,
  renderChoosePayer = true,
  renderPayerForm = true,
  renderEndWidget = true,
  includePayerBlogs = false,
  isDemo = false,
  fixCredentials = false,
  enableInterop = false,
  enableInteropSinglePage = false,
  userSchema = {},
  doneGetSDK = () => {},
  doneSelectEnrollProcess = () => {},
  doneFixCredentials = () => {},
  doneChoosePayer = () => {},
  doneTermsOfService = () => {},
  donePopUp = () => {},
  doneCreatedForm = () => {},
  donePostCredentials = () => {},
  doneRealTime = () => {},
  doneEasyEnroll = () => {},
  handleFormErrors = () => {},
  handleInitErrors = () => {}
}) => {
  const configuredCorrectly = affirmInstance({
    el,
    apiToken,
    sdkToken,
    connectAccessToken,
    tenant,
    employer,
    user,
    realTimeVerification,
    renderChoosePayer,
    renderPayerForm,
    renderEndWidget,
    includePayerBlogs,
    isDemo,
    fixCredentials,
    enableInterop,
    enableInteropSinglePage,
    userSchema,
    doneGetSDK,
    doneSelectEnrollProcess,
    doneFixCredentials,
    doneChoosePayer,
    doneTermsOfService,
    donePopUp,
    doneCreatedForm,
    donePostCredentials,
    doneRealTime,
    doneEasyEnroll,
    handleFormErrors,
    handleInitErrors
  });

  if (!configuredCorrectly) {
    throw Error('Configuration Instance Issue');
  }
  // A unique ID set for each SDK instance run.
  const sdkStateId = uuidv4();
  const searchParams = new window.URLSearchParams(window.location.search);
  const shouldForceEnd = searchParams.get('forceTPAStreamSdkEnd');
  if (shouldForceEnd) {
    // Remove this after so on refreshes we don't force end.
    // But do not immediately reload page
    searchParams.delete('forceTPAStreamSdkEnd');
    const newRelativePathQuery =
      window.location.pathname + '?' + searchParams.toString();
    history.pushState(null, '', newRelativePathQuery);
  }
  $(function() {
    render(
      <SDK
        user={user}
        isDemo={isDemo}
        employer={employer}
        apiToken={sdkToken || apiToken}
        connectAccessToken={connectAccessToken}
        enableInterop={enableInterop || enableInteropSinglePage}
        enableInteropSinglePage={enableInteropSinglePage}
        forceEndStep={!!shouldForceEnd}
        tenant={tenant}
        realTimeVerification={realTimeVerification}
        fixCredentials={fixCredentials}
        includePayerBlogs={includePayerBlogs}
        renderChoosePayer={renderChoosePayer}
        renderPayerForm={renderPayerForm}
        renderEndWidget={renderEndWidget}
        userSchema={userSchema}
        doneGetSDK={doneGetSDK}
        doneStep1={doneSelectEnrollProcess}
        doneStep2={doneFixCredentials}
        doneStep3={doneChoosePayer}
        doneTermsOfService={doneTermsOfService}
        doneStep4={doneCreatedForm}
        donePostCredentials={donePostCredentials}
        doneRealtime={doneRealTime}
        donePopUp={donePopUp}
        doneEasyEnroll={doneEasyEnroll}
        handleFormErrors={handleFormErrors}
        handleInitErrors={handleInitErrors}
        version={version}
        sdkStateId={sdkStateId}
      />,
      document.querySelector(el)
    );
  });
};
export default StreamConnect;
