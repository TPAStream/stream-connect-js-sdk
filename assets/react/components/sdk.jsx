import React, { Component } from 'react';
import { getSDK, postCredentials, getPolicyHolder } from '../requests/sdk';
import { sdkAxiosMaker } from '../services/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '../util/font-awesome-icons';
import TermsOfUse from './terms-of-use';
import Step3 from './choose-payer';
import Step4 from './enter-credentials';
import FinishedEasyEnroll from './finished-easyenroll';
import RealTimeVerification from './realtime-validation';

const AdditionalUiSchema = ({ toggleTermsOfUse, userAddedUISchema }) => {
  let editableUiSchema = {
    termsAndServices: {
      'ui:widget': props => {
        return (
          <div className="checkbox">
            <input
              id="accept"
              required
              name="accept"
              type="checkbox"
              onChange={event => props.onChange(event.target.value)}
            />
            <label htmlFor="accept">
              I have read and I agree to the
              <button
                type="button"
                className="btn btn-link"
                style={{ padding: '0px' }}
                onClick={toggleTermsOfUse}
              >
                Terms Of Use
              </button>
            </label>
          </div>
        );
      },
      'ui:options': {
        label: false
      }
    }
  };
  const schemaToAdd = userAddedUISchema ? userAddedUISchema : {};
  return { ...editableUiSchema, ...schemaToAdd };
};

const AdditionalSchema = tenant => {
  let tenantAcknowledgementMessage = '';
  if (tenant.terms_of_use !== null && tenant.terms_of_use.length > 0) {
    tenantAcknowledgementMessage += `I have read and agree to the below Terms of Use for ${tenant.terms_of_use_message ||
      tenant.name} and `;
  }
  tenantAcknowledgementMessage += `I acknowledge that my claims will be automatically sent to ${tenant.terms_of_use_message ||
    tenant.name}`;
  return {
    showPassword: {
      type: 'boolean',
      title: 'Show password',
      default: false
    },
    termsAndServices: {
      type: 'boolean'
    },
    tenantAcknowledgement: {
      type: 'boolean',
      title: tenantAcknowledgementMessage,
      default: false,
      enum: [true, false]
    }
  };
};

// Ending up using a class because the current implementation is using async call
class SDK extends Component {
  constructor(props) {
    super(props);
    sdkAxiosMaker(props);

    this.state = {
      step: null,
      loading: true,
      termsOfUse: false,
      streamUser: null,
      streamTenant: null,
      streamPayers: null,
      streamPayer: null,
      streamEmployer: null,
      dependent: false,
      taskId: null,
      policyHolderId: null,
      endMessage: null,
      credentialsValid: null,
      streamPolicyHolder: null,
      loginProblem: null
    };
  }

  handleRealtimeCompletion = async ({
    policyHolderId,
    credentialsValid,
    endMessage
  }) => {
    const { streamUser, streamEmployer } = this.state;
    this.setState({
      loading: true
    });
    const phData = await getPolicyHolder({
      policyHolderId: policyHolderId,
      email: streamUser.email,
      employerId: streamEmployer.id
    });
    this.setState({
      loading: false,
      loginProblem: phData.login_problem,
      streamPolicyHolder: phData,
      endMessage: endMessage || phData.login_correction_message,
      step: 5,
      credentialsValid: credentialsValid,
      taskId: null
    });
  };

  validateCreds = ({ params: params, errorCallBack }) => {
    const { streamUser, streamEmployer, policyHolderId } = this.state;
    /* PH API Post Arguments
      username=args.get("username"),
      password=args.get("password"),
      date_of_birth=args.get("date_of_birth"),
      employer_id=args.get("employer_id"),
      payer_name=args.get("payer"),
      payer_id=payer_id,
      member_id=args.get("member_id"),
      accept=args.get("accept"),
      remote_addr=request.remote_addr,
      user_agent=request.headers.get("User-Agent"),
      tenants_accept=args.get("tenants_accept"),
      policy_holder_id=policy_holder_id,
      crawl=args.get("crawl"),
      crawl_force=args.get("crawl_force"),
      request_origin=request.url,
      json_args=args 
    */
    const additionalParams = {
      user: streamUser,
      employer_id: streamEmployer.id
    };
    this.props.donePostCredentials({ params: params });
    if (this.props.isDemo) {
      this.setState({
        termsOfUse: false,
        policyHolderId: policyHolderId,
        taskId: this.props.realTimeVerification ? 'DEMO' : null,
        step: 5
      });
    } else {
      postCredentials({
        params: { ...params, ...additionalParams },
        policyHolderId: policyHolderId,
        handleFormErrors: this.props.handleFormErrors
      }).then(({ taskId, policyHolderId, errorMessage }) => {
        if (errorMessage) {
          errorCallBack({
            errorMessage: errorMessage
          });
        } else {
          getPolicyHolder({
            policyHolderId: policyHolderId,
            email: streamUser.email,
            employerId: streamEmployer.id
          }).then(phData => {
            this.setState({
              termsOfUse: false,
              taskId: this.props.realTimeVerification ? taskId : null,
              credentialsValid: taskId
                ? null
                : phData.login_problem !== null
                ? !phData.login_needs_correction
                : true,
              policyHolderId: policyHolderId,
              streamPolicyHolder: phData,
              step: 5
            });
          });
        }
      });
    }
  };

  toggleTermsOfUse = () => {
    this.setState({
      termsOfUse: !this.state.termsOfUse
    });
  };

  setStep3 = () => {
    this.setState({
      step: 3,
      termsOfUse: false,
      streamPayer: null,
      policyHolderId: null
    });
  };

  setStep4 = ({ payer, dependent }) => {
    this.setState({
      dependent: dependent ? dependent : this.state.dependent,
      streamPayer: payer ? payer : this.state.streamPayer,
      termsOfUse: false,
      step: 4,
      realTimeVerification: false
    });
  };

  restartProcess = () => {
    this.setState({
      step: null,
      loading: true,
      termsOfUse: false,
      streamUser: null,
      streamTenant: null,
      streamPayers: null,
      streamPayer: null,
      streamEmployer: null,
      dependent: false,
      taskId: null,
      policyHolderId: null,
      endMessage: null,
      credentialsValid: null,
      loginProblem: null
    });
    getSDK(this.props).then(({ user, payers, tenant, employer }) => {
      if (payers.length === 1) {
        this.setStep4({ payer: payers[0] });
      } else {
        this.setStep3();
      }
      this.setState({
        loading: false,
        streamUser: user,
        streamPayers: payers,
        streamTenant: tenant,
        streamEmployer: employer
      });
    });
  };

  componentDidMount() {
    getSDK(this.props).then(({ user, payers, tenant, employer }) => {
      if (payers.length === 1) {
        this.setStep4({ payer: payers[0] });
      } else {
        this.setStep3();
      }
      this.setState({
        loading: false,
        streamUser: user,
        streamPayers: payers,
        streamTenant: tenant,
        streamEmployer: employer
      });
    });
  }

  render() {
    const {
      loading,
      step,
      streamUser,
      streamPayers,
      streamTenant,
      termsOfUse,
      streamPayer,
      streamEmployer,
      taskId,
      credentialsValid,
      policyHolderId,
      endMessage,
      streamPolicyHolder,
    } = this.state;
    if (loading) {
      return <FontAwesomeIcon icon={faSpinner} size="lg" spin />;
    } else if (step === 3) {
      if (this.props.renderChoosePayer) {
        return (
          <Step3
            streamPayers={streamPayers}
            streamEmployer={streamEmployer}
            choosePayer={this.setStep4}
            usedPayers={streamUser.policy_holders.map(ph => ph.payer_id)}
            doneStep3={this.props.doneStep3}
            dropDown={streamEmployer.show_all_payers_in_easy_enroll}
            isDemo={this.props.isDemo}
          />
        );
      } else {
        this.props.doneStep3({
          choosePayer: this.setStep4,
          usedPayers: streamUser.policy_holders.map(ph => ph.payer_id),
          dropDown: streamEmployer.show_all_payers_in_easy_enroll,
          streamPayers: streamPayers
        });
        return <div></div>;
      }
    } else if (step === 4) {
      if (termsOfUse) {
        return (
          <TermsOfUse
            returnButton={() => {
              return (
                <button onClick={this.toggleTermsOfUse}>Return To Form</button>
              );
            }}
            doneTermsOfService={this.props.doneTermsOfService}
          />
        );
      } else {
        return (
          <Step4
            streamPayer={streamPayer}
            tenantTerms={streamTenant.terms_of_use}
            additionalSchema={AdditionalSchema(streamTenant)}
            tenantName={streamTenant.name}
            additionalUiSchema={AdditionalUiSchema({
              toggleTermsOfUse: this.toggleTermsOfUse,
              userAddedUISchema: this.props.userSchema
            })}
            returnToStep3={
              streamPayers.length > 1 && policyHolderId === null
                ? this.setStep3
                : null
            }
            validateCreds={this.validateCreds}
            doneStep4={this.props.doneStep4}
            donePopUp={this.props.donePopUp}
          />
        );
      }
    } else if (step === 5) {
      if (this.props.realTimeVerification && taskId) {
        return (
          <RealTimeVerification
            taskId={taskId}
            policyHolderId={policyHolderId}
            handleRealtimeCompletion={this.handleRealtimeCompletion}
            doneRealtime={this.props.doneRealtime}
            email={streamUser.email}
          />
        );
      } else {
        return (
          <FinishedEasyEnroll
            tenant={streamTenant}
            payer={streamPayer}
            user={streamUser}
            policyHolder={streamPolicyHolder}
            employer={streamEmployer}
            credentialsValid={
              this.props.realTimeVerification ? credentialsValid : true
            }
            endingMessage={endMessage}
            returnToPage={
              (this.props.realTimeVerification
              ? credentialsValid
              : true)
                ? this.restartProcess
                : this.setStep4
            }
            doneEasyEnroll={this.props.doneEasyEnroll}
          />
        );
      }
    } else {
      return <div>Failed to find an associated step</div>;
    }
  }
}

export default SDK;
