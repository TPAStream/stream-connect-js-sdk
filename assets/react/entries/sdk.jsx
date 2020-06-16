import '@babel/polyfill';
import React from 'react';
import { render } from 'react-dom';
import SDK from '../components/sdk';
import $ from 'jquery';

const StreamConnect = ({
  el,
  signature,
  apiToken,
  tenant = { system_key: '', vendor: '' },
  employer = { systemKey: '', vendor: '', name: '' },
  user = { firstName: '', lastName: '', email: '' },
  realTimeVerification = true,
  renderChoosePayer = true,
  isDemo = false,
  userSchema = {},
  doneGetSDK = () => {},
  doneChoosePayer = () => {},
  doneTermsOfService = () => {},
  donePopUp = () => {},
  doneCreatedForm = () => {},
  donePostCredentials = () => {},
  doneRealTime = () => {},
  doneEasyEnroll = () => {},
  handleFormErrors = () => {}
}) => {
  $(function() {
    render(
      <SDK
        signature={signature}
        user={user}
        isDemo={isDemo}
        employer={employer}
        apiToken={apiToken}
        tenant={tenant}
        realTimeVerification={realTimeVerification}
        renderChoosePayer={renderChoosePayer}
        userSchema={userSchema}
        doneGetSDK={doneGetSDK}
        doneStep3={doneChoosePayer}
        doneTermsOfService={doneTermsOfService}
        doneStep4={doneCreatedForm}
        donePostCredentials={donePostCredentials}
        doneRealtime={doneRealTime}
        donePopUp={donePopUp}
        doneEasyEnroll={doneEasyEnroll}
        handleFormErrors={handleFormErrors}
      />,
      document.querySelector(el)
    );
  });
};
export default StreamConnect;
