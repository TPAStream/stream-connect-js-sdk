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
  tenant = { systemKey: '', vendor: '' },
  employer = { systemKey: '', vendor: '', name: '' },
  user = { firstName: '', lastName: '', email: '' },
  realTimeVerification = true,
  renderChoosePayer = true,
  renderPayerForm = true,
  renderEndWidget = true,
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
        apiToken={sdkToken || apiToken}
        tenant={tenant}
        realTimeVerification={realTimeVerification}
        renderChoosePayer={renderChoosePayer}
        renderPayerForm={renderPayerForm}
        renderEndWidget={renderEndWidget}
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
        version={version}
      />,
      document.querySelector(el)
    );
  });
};
export default StreamConnect;
