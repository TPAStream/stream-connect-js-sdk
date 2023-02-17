import React, { Component } from 'react';
import { getSDK } from '../../shared/requests/sdk';
import {
  postCredentials,
  getPolicyHolder
} from '../../shared/requests/enter-credentials';
import { getTerms } from '../../shared/requests/terms';
import { getPayer } from '../../shared/requests/payer';
import { getFixCredentials } from '../../shared/requests/fix-credentials';
import { sdkAxiosMaker } from '../../shared/services/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '../../shared/util/font-awesome-icons';
import TermsOfUse from './terms-of-use';
import Step1 from './select-enroll-process';
import Step2 from './fix-credentials';
import Step3 from './choose-payer';
import Step4 from './enter-credentials';
import FinishedEasyEnroll from './finished-easyenroll';
import RealTimeVerification from './realtime-validation';
import TwoFactorAuth from './two-factor-auth';

class SDK extends Component {
  constructor(props) {
    super(props);
    sdkAxiosMaker(props);
    this.defaultState = {
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
      finishedEasyEnrollPending: null,
      loginProblem: null,
      termsHtmlString: null,
      twoFactorAuth: null,
      twoFactorAuthState: null,
      validationState: null,
      error: null,
      formData: null
    };

    this.state = Object.assign({}, this.defaultState);
  }

  handleRealtimeCompletion = async ({
    policyHolderId,
    credentialsValid,
    pending,
    endMessage,
    twoFactorAuth,
    validationState
  }) => {
    const { streamUser, streamEmployer } = this.state;
    this.setState({
      loading: true
    });
    if (this.props.isDemo) {
      this.setState({
        loading: false,
        loginProblem: 'valid',
        streamPolicyHolder: { demo: true },
        endMessage: null,
        step: 5,
        credentialsValid: true,
        finishedEasyEnrollPending: false,
        taskId: null
      });
    } else if (twoFactorAuth) {
      this.setState({
        loading: false,
        step: 5,
        twoFactorAuth: twoFactorAuth,
        twoFactorAuthState: validationState
      });
    } else {
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
        credentialsValid: phData.login_problem === 'valid',
        finishedEasyEnrollPending: pending && phData.login_problem === null,
        taskId: null
      });
    }
  };

  validateCreds = ({ params: params, errorCallBack = data => {} }) => {
    const { streamUser, streamEmployer, policyHolderId } = this.state;
    const additionalParams = {
      user: streamUser,
      employer_id: streamEmployer.id
    };
    this.setState({
      formData: null
    });
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

  toggleTermsOfUse = formData => {
    const { streamUser, termsHtmlString } = this.state;
    if (formData) {
      this.setState({
        formData: formData
      });
    }
    if (!termsHtmlString) {
      this.setState({
        loading: true
      });
      getTerms({ email: streamUser.email }).then(termsHtmlStringResponse =>
        this.setState({
          loading: false,
          termsOfUse: !this.state.termsOfUse,
          termsHtmlString: termsHtmlStringResponse
        })
      );
    } else {
      this.setState({
        termsOfUse: !this.state.termsOfUse
      });
    }
  };

  setStepConfigError = error => {
    this.setState({
      loading: false,
      step: -1,
      error: error
    });
    this.props.handleInitErrors(error);
  };

  setStep1 = () => {
    this.setState({
      loading: false,
      step: 1,
      termsOfUse: false,
      streamPayer: null,
      policyHolderId: null,
      streamPolicyHolder: null
    });
  };

  setStep2 = () => {
    const { streamUser } = this.state;
    this.setState({
      loading: true
    });
    getFixCredentials({ email: streamUser.email }).then(({ user }) => {
      this.setState({
        loading: false,
        step: 2,
        termsOfUse: false,
        streamPayer: null,
        policyHolderId: null,
        streamPolicyHolder: null,
        streamUser: user
      });
    });
  };

  setStep3 = () => {
    this.setState({
      loading: false,
      step: 3,
      termsOfUse: false,
      streamPayer: null,
      policyHolderId: null
    });
  };

  setStep4 = ({ payer, dependent, policyHolder }) => {
    const { streamPayer, streamUser, streamEmployer } = this.state;
    if (policyHolder) {
      this.setState({
        streamPolicyHolder: policyHolder,
        policyHolderId: policyHolder.id
      });
    }
    if (payer) {
      if (streamPayer && streamPayer.id == payer.id) {
        this.setState({
          loading: false,
          dependent: dependent ? dependent : this.state.dependent,
          streamPayer: payer ? payer : this.state.streamPayer,
          termsOfUse: false,
          step: 4,
          realTimeVerification: false,
          twoFactorAuth: null,
          twoFactorAuthState: null,
          taskId: null
        });
      } else {
        this.setState({
          loading: true
        });
        getPayer({
          payerId: payer.id,
          employerId: streamEmployer.id,
          email: streamUser.email,
          referer: this.props.interoperabilityRedirectUrl
        }).then(payerResponse => {
          this.setState({
            loading: false,
            dependent: dependent ? dependent : this.state.dependent,
            streamPayer: payerResponse,
            termsOfUse: false,
            step: 4,
            realTimeVerification: false,
            twoFactorAuth: null,
            twoFactorAuthState: null,
            taskId: null
          });
        });
      }
    } else {
      this.setState({
        loading: false,
        dependent: dependent ? dependent : this.state.dependent,
        termsOfUse: false,
        step: 4,
        realTimeVerification: false,
        twoFactorAuth: null,
        twoFactorAuthState: null,
        taskId: null
      });
    }
  };

  restartProcess = () => {
    this.setState(this.defaultState);
    this.makeInitRequest();
  };

  makeInitRequest = () => {
    getSDK(this.props).then(({ user, payers, tenant, employer, error }) => {
      this.setState({
        streamUser: user,
        streamPayers: payers,
        streamTenant: tenant,
        streamEmployer: employer
      });
      if (error) {
        this.setStepConfigError(error);
        return;
      } else if (this.props.fixCredentials) {
        if (!this.props.connectAccessToken) {
          this.setStepConfigError(
            'You must have a connect access token enabled and set to use fix-credentials functionality.'
          );
          return;
        } else {
          this.setStep1();
        }
      } else if (payers.length === 1) {
        this.setStep4({ payer: payers[0] });
      } else {
        this.setStep3();
      }
      this.setState({
        error: null
      });
    });
  };

  componentDidMount() {
    this.makeInitRequest();
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
      finishedEasyEnrollPending,
      termsHtmlString,
      twoFactorAuth,
      twoFactorAuthState,
      formData
    } = this.state;
    if (loading) {
      return <FontAwesomeIcon icon={faSpinner} size="lg" spin />;
    } else if (step === -1) {
      return (
        <div>
          This widget has encountered a configuration error. Please contact the
          site host.
        </div>
      );
    } else if (step === 1) {
      return (
        <Step1
          doneStep1={this.props.doneStep1}
          setFixCredentials={this.setStep2.bind(this)}
          setChoosePayer={this.setStep3.bind(this)}
        />
      );
    } else if (step === 2) {
      return (
        <Step2
          doneStep2={this.props.doneStep2}
          streamUser={streamUser}
          streamPayers={streamPayers}
          choosePolicyHolder={this.setStep4.bind(this)}
          returnSelectEnrollProcess={
            this.props.fixCredentials && this.setStep1.bind(this)
          }
        />
      );
    } else if (step === 3) {
      if (this.props.renderChoosePayer) {
        return (
          <Step3
            streamPayers={streamPayers}
            streamEmployer={streamEmployer}
            returnSelectEnrollProcess={
              this.props.fixCredentials && this.setStep1.bind(this)
            }
            choosePayer={this.setStep4.bind(this)}
            usedPayers={streamUser.policy_holders.map(ph => ph.payer_id)}
            doneStep3={this.props.doneStep3}
            dropDown={streamEmployer.show_all_payers_in_easy_enroll}
            isDemo={this.props.isDemo}
          />
        );
      } else {
        this.props.doneStep3({
          choosePayer: this.setStep4.bind(this),
          usedPayers: streamUser.policy_holders.map(ph => ph.payer_id),
          dropDown: streamEmployer.show_all_payers_in_easy_enroll,
          streamPayers: streamPayers,
          streamEmployer: streamEmployer
        });
        return <div></div>;
      }
    } else if (step === 4) {
      if (termsOfUse) {
        return (
          <TermsOfUse
            returnButton={() => {
              return (
                <button
                  onClick={() => {
                    this.toggleTermsOfUse(formData);
                  }}
                >
                  Return To Form
                </button>
              );
            }}
            termsHtmlString={termsHtmlString}
            doneTermsOfService={this.props.doneTermsOfService}
          />
        );
      } else if (this.props.renderPayerForm) {
        return (
          <Step4
            streamPayer={streamPayer}
            streamPolicyHolder={streamPolicyHolder}
            tenantTerms={streamTenant.terms_of_use}
            formData={formData}
            streamTenant={streamTenant}
            tenantName={streamTenant.name}
            toggleTermsOfUse={this.toggleTermsOfUse.bind(this)}
            interoperabilityRedirectUrl={this.props.interoperabilityRedirectUrl}
            includePayerBlogs={this.props.includePayerBlogs}
            userAddedUISchema={this.props.userSchema}
            returnToStep3={
              streamPayers.length > 1 && policyHolderId === null
                ? this.setStep3.bind(this)
                : null
            }
            returnToStep2={
              this.props.fixCredentials && policyHolderId !== null
                ? this.setStep2.bind(this)
                : null
            }
            validateCreds={this.validateCreds.bind(this)}
            doneStep4={this.props.doneStep4}
            donePopUp={this.props.donePopUp}
          />
        );
      } else {
        this.props.doneStep4({
          streamPayer: streamPayer,
          formJsonSchema: streamPayer.onboard_form,
          tenantTerms: streamTenant.terms_of_use,
          streamTenant: streamTenant,
          toggleTermsOfUse: this.toggleTermsOfUse.bind(this),
          returnToChoosePayer: this.setStep3.bind(this),
          validateCreds: this.validateCreds.bind(this)
        });
        return <div></div>;
      }
    } else if (step === 5) {
      if (this.props.realTimeVerification && taskId) {
        if (twoFactorAuth) {
          return (
            <TwoFactorAuth
              taskId={taskId}
              policyHolderId={policyHolderId}
              handleRealtimeCompletion={this.handleRealtimeCompletion.bind(
                this
              )}
              doneRealtime={this.props.doneRealtime}
              email={streamUser.email}
              twoFactorAuthData={twoFactorAuth}
              twoFactorAuthState={twoFactorAuthState}
            />
          );
        } else {
          return (
            <RealTimeVerification
              taskId={taskId}
              policyHolderId={policyHolderId}
              handleRealtimeCompletion={this.handleRealtimeCompletion.bind(
                this
              )}
              doneRealtime={this.props.doneRealtime}
              email={streamUser.email}
            />
          );
        }
      } else {
        if (this.props.renderEndWidget) {
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
              pending={finishedEasyEnrollPending}
              endingMessage={endMessage}
              returnToPage={
                (this.props.realTimeVerification
                ? credentialsValid
                : true)
                  ? this.restartProcess.bind(this)
                  : this.setStep4.bind(this)
              }
              doneEasyEnroll={this.props.doneEasyEnroll}
            />
          );
        } else {
          this.props.doneEasyEnroll({
            tenant: streamTenant,
            payer: streamPayer,
            user: streamUser,
            policyHolder: streamPolicyHolder,
            employer: streamEmployer,
            credentialsValid: this.props.realTimeVerification
              ? credentialsValid
              : true,
            pending: finishedEasyEnrollPending,
            endingMessage: endMessage,
            returnFlowFunction: (this.props.realTimeVerification
            ? credentialsValid
            : true)
              ? this.restartProcess.bind(this)
              : this.setStep4.bind(this)
          });
          return <div></div>;
        }
      }
    } else {
      return <div>Failed to find an associated step</div>;
    }
  }
}

export default SDK;
