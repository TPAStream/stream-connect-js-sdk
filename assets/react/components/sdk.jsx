import React, { Component, Fragment } from 'react';
import Form from 'react-jsonschema-form';
import {
  getSDK,
  postCredentials,
  validateCredentials,
  getPolicyHolder
} from '../requests/sdk';
import { sdkAxiosMaker } from '../services/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQuestionCircle,
  faSpinner,
  faArrowCircleLeft
} from '../util/font-awesome-icons';
import TermsOfUse from './terms-of-use';
import Popup from 'react-popup';
import Select from 'react-select';
import Highlighter from 'react-highlight-words';

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

class FinishedEasyEnroll extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.props.doneEasyEnroll(this.props);
  }

  render() {
    const {
      credentialsValid,
      tenant,
      returnToPage,
      endingMessage,
      payer,
      employer
    } = this.props;
    if (credentialsValid) {
      return (
        <div id="finished-with-easy-enroll">
          <h2>Success!</h2>
          <p>
            Your claims will now automatically be submitted to {tenant.name}
            shortly after they appear on the carrier website.
          </p>
          <p>
            Depending on your carrier, not all dependent claims may be submitted
            in all cases. To ensure claims are submitted for all individuals
            covered under a plan, you must add their accounts as well.
          </p>
          <button id="restart-easy-enroll" onClick={returnToPage}>
            Click here to add additional logins
          </button>
        </div>
      );
    } else {
      return (
        <div id="finished-with-easy-enroll">
          <h2>Invalid Credentials</h2>
          <p>{endingMessage}</p>
          <h4>Why am I here?</h4>
          <div>
            Enrolling with {tenant.name} links your insurance account with{' '}
            {tenant.name} so that you don't have to manually submit your EOBs.
            After a one-time set up, all of your EOBs will be automatically
            submitted to {tenant.name} for processing.
          </div>
          <h4>I think these credentials are valid.</h4>
          <div>
            <a href={`mailto:${employer.support_email_derived}`}>Email us</a>{' '}
            and we'll help
          </div>
          <h4>I don't know my username or password.</h4>
          <div>
            You can update your{' '}
            <a target="_blank" href={payer.register_url}>
              {payer.name} account here
            </a>
          </div>
          <button onClick={returnToPage}>Let me try again</button>
        </div>
      );
    }
  }
}

class ControlledPopup extends Popup {
  constructor(props) {
    super(props);
  }

  componentDidUpdate() {
    super.componentDidUpdate();
    if (this.props.donePopUp) {
      this.props.donePopUp();
    }
  }
}

class PayerInfo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      popUpActive: false
    };
  }
  render() {
    const { payer, donePopUp } = this.props;
    const { popUpActive } = this.state;
    let message = `
          Before you proceed, make sure you have registered on ${payer.website_home_url_netloc}
          and have your ${payer.name} username and password at your fingertips.
      `;
    if (payer.has_security_questions) {
      message += ` Also, have all ${payer.name} security questions and answers written down before you enroll below.`;
    }
    return (
      <div>
        <img src={payer.logo_url} style={{ maxWidth: '400px' }}></img>
        <div style={{ display: 'flex' }}>
          <h3>Enter Credentials for {payer.website_home_url_netloc}</h3>
          <FontAwesomeIcon
            icon={faQuestionCircle}
            size="lg"
            onClick={() => {
              Popup.close();
              Popup.create({
                title: 'Help Getting Started',
                content: `If you've not yet made an account with ${payer.website_home_url_netloc}, make one there first.`,
                buttons: {
                  left: [
                    {
                      text: 'Go To Payer Site!',
                      action: () => {
                        window.open(payer.register_url, '_blank');
                      }
                    }
                  ],
                  right: [
                    {
                      text: 'Ok!',
                      action: () => {
                        Popup.close();
                        this.setState({ popUpActive: false });
                      }
                    }
                  ]
                }
              });
              this.setState({ popUpActive: true });
            }}
          />
          <ControlledPopup
            closeBtn={false}
            donePopUp={popUpActive ? donePopUp : null}
          />
        </div>
        <p
          style={{
            border: 'solid',
            padding: '10px',
            backgroundColor: '#FCF8E3'
          }}
        >
          {message}
        </p>
      </div>
    );
  }
}

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
    if (credentialsValid) {
      this.setState({
        loading: false,
        step: 5,
        credentialsValid: credentialsValid,
        taskId: null
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
        credentialsValid: credentialsValid,
        taskId: null
      });
    }
  };

  validateCreds = ({ params: params }) => {
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
      }).then(({ taskId, policyHolderId }) => {
        getPolicyHolder({
          policyHolderId: policyHolderId,
          email: streamUser.email,
          employerId: streamEmployer.id
        }).then(phData => {
          this.setState({
            termsOfUse: false,
            taskId: this.props.realTimeVerification ? taskId : null,
            policyHolderId: policyHolderId,
            streamPolicyHolder: phData,
            step: 5
          });
        });
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
      streamPolicyHolder
    } = this.state;
    if (loading) {
      return <FontAwesomeIcon icon={faSpinner} size="lg" spin />;
    } else if (step === 3) {
      return (
        <Step3
          streamPayers={streamPayers}
          choosePayer={this.setStep4}
          usedPayers={streamUser.policy_holders.map(ph => ph.payer_id)}
          doneStep3={this.props.doneStep3}
          dropDown={streamEmployer._show_all_payers_in_easy_enroll}
          isDemo={this.props.isDemo}
        />
      );
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

const PayerImages = ({ streamPayers, usedPayers, choosePayer }) => {
  return (
    <div
      id="payer-images"
      style={{
        marginTop: '40px',
        display: 'table-cell',
        verticalAlign: 'middle',
        horizontalAlign: 'middle'
      }}
    >
      {streamPayers.map(payer => {
        return (
          <div
            id={`selectPayer_${payer.id}`}
            key={`selectPayer_${payer.id}`}
            style={{
              border: 'solid',
              width: '300px',
              padding: '20px',
              height: '100px'
            }}
          >
            {usedPayers.includes(payer.id) ? (
              <a
                onClick={e => {
                  e.preventDefault();
                  choosePayer({ payer: payer, dependent: true });
                }}
                style={{ width: '300px' }}
              >
                <div>Add a dependent login</div>
                <img
                  src={payer.logo_url}
                  style={{
                    maxWidth: '200px',
                    maxHeight: '50px',
                    opacity: '.5'
                  }}
                />
              </a>
            ) : (
              <a
                onClick={e => {
                  e.preventDefault();
                  choosePayer({ payer: payer, dependent: false });
                }}
                style={{ width: '300px' }}
              >
                <img
                  src={payer.logo_url}
                  style={{
                    maxWidth: '200px',
                    maxHeight: '50px'
                  }}
                />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
};

class Step3 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      payerNameFilter: null,
      payerOptions: this.props.streamPayers.map(payer => {
        return { label: payer.name, value: payer.id };
      })
    };
  }

  componentDidMount() {
    this.props.doneStep3();
  }

  componentDidUpdate() {
    this.props.doneStep3();
  }

  handlePayerNameFilter(payerNameFilter) {
    this.setState({
      payerNameFilter: payerNameFilter
    });
    this.props.choosePayer({
      payer: this.props.streamPayers.find(
        payer => payer.id === payerNameFilter.value
      )
    });
  }

  render() {
    const {
      streamPayers,
      usedPayers,
      choosePayer,
      isDemo,
      dropDown
    } = this.props;
    const { payerNameFilter, payerOptions } = this.state;
    if (isDemo) {
      return (
        <div id="choose-payer">
          <h3>Choose an Account to add Below</h3>
          <Select
            id="payer-dropdown"
            placeholder="Search for Payer"
            classNamePrefix="ReactSelect"
            clearable={true}
            value={payerNameFilter}
            onChange={this.handlePayerNameFilter.bind(this)}
            options={payerOptions}
            formatOptionLabel={(obj, { inputValue }) => (
              <Highlighter
                searchWords={[inputValue]}
                textToHighlight={obj.label}
                autoEscape={true}
              />
            )}
          />
          <h3>Or Select From this Predefined List</h3>
          <PayerImages
            streamPayers={streamPayers.filter(p =>
              [18, 16, 171].includes(p.id)
            )}
            usedPayers={usedPayers}
            choosePayer={choosePayer}
          />
        </div>
      );
    } else {
      return (
        <div id="choose-payer">
          <h3>Choose an Account to add Below</h3>
          {dropDown ? (
            <Select
              id="payer-dropdown"
              placeholder="Search for Payer"
              classNamePrefix="ReactSelect"
              clearable={true}
              value={payerNameFilter}
              onChange={this.handlePayerNameFilter.bind(this)}
              options={payerOptions}
              formatOptionLabel={(obj, { inputValue }) => (
                <Highlighter
                  searchWords={[inputValue]}
                  textToHighlight={obj.label}
                  autoEscape={true}
                />
              )}
            />
          ) : (
            <PayerImages
              streamPayers={streamPayers}
              usedPayers={usedPayers}
              choosePayer={choosePayer}
            />
          )}
        </div>
      );
    }
  }
}

class Step4 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      schema: null,
      uiSchema: null,
      formData: null,
      submitDisabled: false
    };
  }

  componentDidMount() {
    this.props.doneStep4();
  }

  componentWillMount() {
    const { streamPayer, additionalSchema, additionalUiSchema } = this.props;
    const schema = streamPayer.onboard_form.schema.properties;
    const schemaKeys = Object.keys(schema);
    let required = []; // new way required is added to properties
    for (const key of schemaKeys) {
      if (schema[key].required !== null) {
        delete schema[key].required; // We don't want required on the schema itself. So let's remove it
        required.push(key);
      }
    }
    const uiSchema = streamPayer.onboard_ui_schema;
    const fullSchema = {
      ...schema,
      ...additionalSchema
    };
    const fullUiSchema = {
      ...uiSchema,
      ...additionalUiSchema
    };
    this.setState({
      schema: {
        type: 'object',
        required: required,
        properties: fullSchema
      },
      uiSchema: fullUiSchema,
      formData: null,
      submitDisabled: false
    });
  }

  validateForm = (formData, errors) => {
    if (!formData.tenantAcknowledgement) {
      errors.tenantAcknowledgement.addError(
        `You must acknowledge that claims will be automatically sent to ${this.props.tenantName}.`
      );
    }
    if (formData.termsAndServices !== true) {
      errors.termsAndServices.addError(
        'You must agree to the terms and services.'
      );
    }
    return errors;
  };

  handleChange = ({ formData, uiSchema, schema }, e) => {
    if (
      this.state.formData &&
      this.state.formData.showPassword !== formData.showPassword
    ) {
      this.setState({
        uiSchema: {},
        schema: {}
      }); // This is a hack to deal with uiSchema being wack https://github.com/rjsf-team/react-jsonschema-form/issues/517#issuecomment-384307931
      if (formData.showPassword) {
        uiSchema.password['ui:widget'] = 'text';
        schema.properties.password.form.type = 'text';
      } else {
        uiSchema.password['ui:widget'] = 'password';
        schema.properties.password.form.type = 'password';
      }
    }
    if (
      formData.termsAndServices === 'on' ||
      formData.termsAndServices === true
    ) {
      formData.termsAndServices = true;
    } else {
      formData.termsAndServices = false;
    }
    this.setState({
      formData: formData,
      uiSchema: uiSchema,
      schema: schema
    });
  };

  handleSubmit = ({ formData }, event) => {
    event.preventDefault();
    this.setState({
      submitDisabled: true
    });

    const params = {
      ...{
        username: formData.username,
        password: formData.password,
        date_of_birth: formData.dateOfBirth || null,
        payer_id: this.props.streamPayer.id,
        accept: formData.termsAndServices,
        tenants_accept: [formData.tenantAcknowledgement]
      },
      ...formData
    };
    this.props.validateCreds({ params: params });
  };

  render() {
    const { schema, uiSchema, formData, submitDisabled } = this.state;
    const { streamPayer, tenantTerms, returnToStep3, donePopUp } = this.props;
    // We'll want to remove the div below eventually. It is just for my eyes.
    return (
      <div style={{ marginTop: '15px' }} id="easy-enroll-form-page">
        {returnToStep3 ? (
          <FontAwesomeIcon
            size="lg"
            icon={faArrowCircleLeft}
            onClick={returnToStep3}
          />
        ) : null}
        <PayerInfo payer={streamPayer} donePopUp={donePopUp} />
        <Form
          schema={schema}
          uiSchema={uiSchema}
          formData={formData}
          showErrorList={false}
          onSubmit={this.handleSubmit}
          onChange={this.handleChange}
          validate={this.validateForm}
          //noValidate={true}
          id="easy-enroll-form"
        >
          <div>
            <div className="tenant-terms">{tenantTerms}</div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitDisabled}
            >
              Validate Credentials
            </button>
            {submitDisabled ? (
              <FontAwesomeIcon icon={faSpinner} size="lg" spin />
            ) : null}
          </div>
        </Form>
      </div>
    );
  }
}

class RealTimeVerification extends Component {
  constructor(props) {
    super(props);
    this.defaultMaxRetries = 40;
    this.state = {
      progress: 0, // This is a percentage. So .01 to 1 pretty much
      currentRetries: this.props.maxRetries || this.defaultMaxRetries
    };
  }

  checkProgress = () => {
    const { taskId, policyHolderId, maxRetries, email } = this.props;

    if (this.state.currentRetries <= 0) {
      throw new Error(
        `Validating your credentials is taking longer than usual due to high traffic. 
         We’ll keep trying even if you leave the page. Please check back later.`
      );
    }

    validateCredentials({
      taskId: taskId,
      policyHolderId: policyHolderId,
      email: email
    }).then(validateData => {
      if (validateData.state === 'PENDING') {
        this.setState({
          progress: maxRetries
            ? (maxRetries - this.state.currentRetries + 1) / maxRetries
            : (this.defaultMaxRetries - this.state.currentRetries + 1) /
              this.defaultMaxRetries,
          currentRetries: this.state.currentRetries - 1
        });
      } else if (validateData.state === 'FAILURE') {
        clearInterval(this.interval);
        this.props.handleRealtimeCompletion({
          policyHolderId: policyHolderId,
          credentialsValid: true, // We are just going to send the users to the done page if this fails
          validationState: validateData.state
        });
      } else if (validateData.state === 'SUCCESS') {
        clearInterval(this.interval);
        this.props.handleRealtimeCompletion({
          policyHolderId: policyHolderId,
          credentialsValid: validateData.credentials_are_valid,
          validationState: validateData.state
        });
      } else {
        clearInterval(this.interval);
        throw new Error('This is not a valid return state from validateData');
      }
    });
  };

  demoProgress = () => {
    if (this.state.progress < 0.74) {
      this.setState({
        progress: this.state.progress + 0.25
      });
    } else {
      clearInterval(this.interval);
      this.props.handleRealtimeCompletion({
        credentialsValid: true
      });
    }
  };

  componentDidMount() {
    if (this.props.taskId === 'DEMO') {
      this.interval = setInterval(this.demoProgress, 500);
    } else {
      this.interval = setInterval(this.checkProgress, 5000);
    }
    this.props.doneRealtime();
  }

  componentWillMount() {
    clearInterval(this.interval);
  }

  render() {
    const { progress } = this.state;
    if (progress < 1) {
      return (
        <div id="real-time-page">
          <h3>Now Doing Real Time Validation...</h3>
          <h3>This may take a few minutes...</h3>
          <div style={{ display: 'flex' }} id="real-time-progress-flex-div">
            <h3
              id="real-time-progress"
              data-progress={Number.parseFloat(progress * 100).toFixed(0)}
            >
              Progress {Number.parseFloat(progress * 100).toFixed(0)}%
            </h3>
            <FontAwesomeIcon icon={faSpinner} size="lg" spin />
          </div>
        </div>
      );
    } else {
      return <FontAwesomeIcon icon={faSpinner} size="lg" spin />;
    }
  }
}

export default SDK;
