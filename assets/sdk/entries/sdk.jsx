import '@babel/polyfill';
import React from 'react';
import { render } from 'react-dom';
import SDK from '../components/sdk';
import $ from 'jquery';

let version = '0.6.2';

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
  includePayerBlogs = false,
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
      />,
      document.querySelector(el)
    );
  });
};
export default StreamConnect;
