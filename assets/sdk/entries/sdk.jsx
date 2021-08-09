import '@babel/polyfill';
import React from 'react';
import { render } from 'react-dom';
import SDK from '../components/sdk';
import $ from 'jquery';

// Injected from webpack-auto-inject version https://stackoverflow.com/questions/24663175/how-can-i-inject-a-build-number-with-webpack
var version = '[AIV]{version}[/AIV]';

const StreamConnect = ({
  el,
  signature,
  apiToken,
  sdkToken = null,
  connectAccessToken = undefined,
  tenant = { systemKey: '', vendor: '' },
  employer = { systemKey: '', vendor: '', name: '' },
  user = { firstName: '', lastName: '', email: '' },
  realTimeVerification = true,
  renderChoosePayer = true,
  renderPayerForm = true,
  renderEndWidget = true,
  isDemo = false,
  fixCredentials = false,
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
  $(function() {
    render(
      <SDK
        signature={signature}
        user={user}
        isDemo={isDemo}
        employer={employer}
        apiToken={sdkToken || apiToken}
        connectAccessToken={connectAccessToken}
        tenant={tenant}
        realTimeVerification={realTimeVerification}
        fixCredentials={fixCredentials}
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
      />,
      document.querySelector(el)
    );
  });
};
export default StreamConnect;
