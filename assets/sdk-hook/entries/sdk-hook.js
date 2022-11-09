import { sdkAxiosMaker } from '../../shared/services/axios';
import { getSDK } from '../../shared/requests/sdk';
import { getPayer } from '../../shared/requests/payer';
import { getFixCredentials } from '../../shared/requests/fix-credentials';
import {
  postCredentials,
  getPolicyHolder
} from '../../shared/requests/enter-credentials';
import { getTermsText } from '../../shared/requests/terms';
import { parseMany, parseOne } from '../../shared/parsers/generic';
import { serializeOne } from '../../shared/serializers/generic';
import { validateCredentials } from '../../shared/requests/validate-credentials';

let version = '0.6.1';

const steps = {
  step1: 'select-enroll-process',
  step2: 'fix-credentials',
  step3: 'choosePayer',
  step4: 'enterCredentials',
  step5: 'realTimeVerification',
  step6: 'finishEasyEnroll'
};

export default class StreamConnect {
  constructor({
    apiToken,
    sdkToken = null,
    connectAccessToken = null,
    tenant = { systemKey: '', vendor: '' },
    employer = { systemKey: '', vendor: '', name: '' },
    user = { firstName: '', lastName: '', email: '' },
    realTimeVerification = true,
    isDemo = false
  }) {
    sdkAxiosMaker({
      apiToken: sdkToken || apiToken,
      connectAccessToken,
      version,
      isDemo,
      tenant
    });
    this.props = {
      apiToken,
      tenant,
      employer,
      user,
      realTimeVerification,
      isDemo,
      steps
    };
    this.state = Object.assign(
      {
        step: steps.step1,
        isDemo: null,
        apiToken: null,
        sdkToken: null,
        employer: null,
        payer: null,
        payers: null,
        policyHolder: null,
        realTimeVerificationData: null,
        realTimeVerification: null,
        enterCredentialsUiSchema: null,
        steps: null,
        tenant: null,
        user: null
      },
      this.props
    );
  }

  restartStreamConnect = () => {
    this.state = Object.assign(
      {
        step: steps.step1,
        isDemo: null,
        apiToken: null,
        sdkToken: null,
        employer: null,
        payer: null,
        payers: null,
        policyHolder: null,
        realTimeVerification: null,
        realTimeVerificationData: null,
        enterCredentialsFormSchema: null,
        enterCredentialsUiSchema: null,
        steps: null,
        tenant: null,
        user: null
      },
      this.props
    );
  };

  setState = update => {
    Object.keys(update).forEach(key => {
      this.state[key] = Array.isArray(update[key])
        ? parseMany(update[key])
        : typeof update[key] === 'object' && update[key] !== null
        ? parseOne(Object.assign({}, this.state[key], update[key]))
        : update[key];
    });
    this.state = parseOne(this.state);
  };

  beginAddNewCredentials = () => {
    this.setState({ step: steps.step3 });
    return this.state;
  }

  beginFixCredentials = () => {
    this.setState({ step: steps.step2 });
    return this.state;
  }

  getStreamConnectInitAsync = async () => {
    const { employer, user, isDemo } = this.state;
    const doneGetSDK = () => {};
    if (this.state.step !== steps.step1) {
      throw new Error(
        `Tried to call getStreamConnectInitAsync out of state step (${steps.step1}). Current step is ${this.state.step}.`
      );
    }

    return getSDK({ employer, user, isDemo, doneGetSDK }).then(initData => {
      this.setState({ ...initData, step: steps.step1 });
      return this.state;
    });
  };

  getFixCredentialsAsync = async () => {
    const { user } = this.state;
    if (this.state.step !== steps.step2) {
      throw new Error(
        `Tried to call getFixCredentialsAsync out of state step (${steps.step2}). Current step is ${this.state.step}.`
      );
    }
    return getFixCredentials({ email: user.email }).then(({ user }) => {
      this.setState({ user: user });
      return this.state;
    });
  };

  getStreamConnectPayerAsync = async (payer) => {
    const { employer, user, tenant } = this.state;
    if (this.state.step !== steps.step3 && this.state.step !== steps.step2) {
      throw new Error(
        `Tried to call getStreamConnectPayerAsync out of state step (${steps.step3}). Current step is ${this.state.step}.`
      );
    }

    if (payer) {
      return getPayer({
        payerId: payer.id,
        employerId: employer.id,
        email: user.email
      }).then(payerData => {
        const additionalSchema = tenant => {
          let tenantAcknowledgementMessage = '';
          if (tenant.termsOfUse !== null && tenant.termsOfUse.length > 0) {
            tenantAcknowledgementMessage += `I have read and agree to the below Terms of Use for ${tenant.termsOfUseMessage ||
              tenant.name} and `;
          }
          tenantAcknowledgementMessage += `I acknowledge that my claims will be automatically sent to ${tenant.termsOfUseMessage ||
            tenant.name}`;
          return {
            termsAndServices: {
              type: 'boolean',
              title: 'I have read and I agree to the Terms of Use',
              default: false
            },
            tenantAcknowledgement: {
              type: 'boolean',
              title: tenantAcknowledgementMessage,
              default: false
            }
          };
        };

        const schema = parseOne(payerData).onboardForm.schema.properties;
        const schemaKeys = Object.keys(schema);
        let required = [];
        for (const key of schemaKeys) {
          if (schema[key].required !== void 0) {
            delete schema[key].required;
            required.push(key);
          }
        }

        const enterCredentialsFormSchema = {
          properties: { ...schema, ...additionalSchema(tenant) },
          type: 'object',
          required: required
        };
        this.setState({
          payer: payerData,
          step: steps.step4,
          enterCredentialsFormSchema: enterCredentialsFormSchema,
          enterCredentialsUiSchema: parseOne(payerData).onboardUiSchema
        });
        return this.state;
      });
    } else {
      throw new Error('No payer object was provided.');
    }
  };

  getTermsTextAsync = async () => {
    if (!this.state.termsOfUse) {
      return getTermsText({ email: this.state.user.email }).then(text => {
        this.setState({ termsOfUse: text });
        return this.state;
      });
    }

    return this.state;
  };

  handleFormSubmitAsync = async ({ formData }, errorCallBack = () => {}) => {
    if (this.state.step !== steps.step4) {
      throw new Error(
        `Tried to call handleFormSubmit out of state step (${steps.step4}). Current step is ${this.state.step}.`
      );
    }

    if (!formData) {
      throw new Error(
        'No formData object was provided on handleFormSubmit call'
      );
    }

    if (!formData.termsAndServices) {
      throw new Error(
        'formData object must have a termsAndServices value. See sdk-hooks documentation for more details.'
      );
    }

    if (!formData.tenantAcknowledgement) {
      throw new Error(
        'formData object must have tenantAckowledgement value. See sdk-hooks documentation for more details.'
      );
    }

    const {
      user,
      employer,
      payer,
      policyHolder,
      isDemo,
      realTimeVerification
    } = this.state;
    const params = {
      ...{
        username: formData.username,
        password: formData.password,
        date_of_birth: formData.dateOfBirth || null,
        payer_id: payer.id,
        accept: formData.termsAndServices,
        tenants_accept: [formData.tenantAcknowledgement],
        user: serializeOne(user),
        employer_id: employer.id
      },
      ...formData
    };
    if (isDemo) {
      this.setState({
        policyHolderId: policyHolder.policyHolderId,
        taskId: realTimeVerification ? 'DEMO' : null,
        step: realTimeVerification ? steps.step5 : steps.step6
      });
      return this.state;
    }
    return postCredentials({
      params: params,
      policyHolderId: policyHolder && policyHolder.policyHolderId,
      handleFormErrors: () => {}
    }).then(({ taskId, policyHolderId, errorMessage }) => {
      if (errorMessage) {
        errorCallBack({
          errorMessage: errorMessage
        });
        return this.state;
      } else {
        return getPolicyHolder({
          policyHolderId: policyHolderId,
          email: user.email,
          employerId: employer.id
        }).then(phData => {
          this.setState({
            taskId: realTimeVerification ? taskId : null,
            credentialsValid: taskId
              ? null
              : phData.login_problem !== null
              ? !phData.login_needs_correction
              : true,
            policyHolderId: policyHolderId,
            policyHolder: parseOne(phData),
            step: realTimeVerification ? steps.step5 : steps.step6
          });
          return this.state;
        });
      }
    });
  };

  stopRealTimeVerification = () => {
    clearInterval(this.state.realTimeInterval);
    this.setState({ realTimeInterval: null });
  };

  checkProgress = async (progressCheckCallback, maxRetries) => {
    const { user, policyHolder, taskId, realTimeVerificationData } = this.state;
    if (
      realTimeVerificationData &&
      realTimeVerificationData.currentRetries <= 0
    ) {
      this.stopRealTimeVerification();
      this.setState({
        realTimeVerificationData: {
          validationState: 'PENDING',
          credentialsValid: null,
          policyHolderId: policyHolder.policyHolderId,
          pending: true,
          progress: 100,
          endMessage:
            "Validating your credentials is taking longer than usual due to high traffic. We'll keep trying even if you leave the page. Please check back later."
        }
      });
      progressCheckCallback(this.state);
      return this.state;
    }
    const validateData = await validateCredentials({
      taskId: taskId,
      policyHolderId: policyHolder.policyHolderId,
      email: user.email
    });
    if (validateData.state === 'PENDING') {
      this.setState({
        realTimeVerificationData: {
          progress: Number.parseFloat(
            ((maxRetries -
              this.state.realTimeVerificationData.currentRetries +
              1) /
              maxRetries) *
              100
          ).toFixed(0),
          currentRetries:
            this.state.realTimeVerificationData.currentRetries - 1,
          ...validateData
        }
      });
    } else if (validateData.state === 'FAILURE') {
      this.stopRealTimeVerification();
      this.setState({
        realTimeVerificationData: {
          progress: 100,
          policyHolderId: policyHolder.policyHolderId,
          credentialsValid: false,
          pending: true,
          validationState: validateData.state,
          endMessage: validateData.message,
          ...validateData
        },
        step: this.state.steps.step6
      });
    } else if (validateData.state === 'SUCCESS') {
      this.stopRealTimeVerification();
      this.setState({
        realTimeVerificationData: {
          progress: 100,
          policyHolderId: policyHolder.policyHolderId,
          credentialsValid: false,
          pending: false,
          validationState: validateData.state,
          endMessage: validateData.message,
          ...validateData
        },
        step: this.state.steps.step6
      });
    } else {
      this.stopRealTimeVerification();
      throw new Error('This is not a valid return state from validateData');
    }
    progressCheckCallback(this.state);
    return this.state;
  };

  returnToEnterCredentials = () => {
    this.setState({
      step: steps.step4
    });
  };

  handleRealTimeVerificationAsync = async (
    progressCheckCallback = () => {}
  ) => {
    if (this.state.step !== steps.step5) {
      throw new Error(
        `Tried to call handleRealTimeVerification out of state step (${steps.step5}). Current step is ${this.state.step}.`
      );
    }
    const maxRetries = 40;
    this.setState({
      realTimeVerificationData: {
        progress: null,
        currentRetries: maxRetries
      }
    });

    const realTimeInterval = setInterval(
      this.checkProgress.bind(this, progressCheckCallback, maxRetries),
      5000
    );
    this.setState({ realTimeInterval: realTimeInterval });
  };

  finishStreamConnectAsync = async () => {
    if (this.state.step !== steps.step6) {
      throw new Error(
        `Tried to call handleRealTimeVerification out of state step (${steps.step6}). Current step is ${this.state.step}.`
      );
    }

    const {
      tenant,
      user,
      policyHolder,
      employer,
      realTimeVerificationData
    } = this.state;
    const { endMessage, pending } = realTimeVerificationData;
    const phData = await getPolicyHolder({
      policyHolderId: policyHolder.policyHolderId,
      email: user.email,
      employerId: employer.id
    });
    this.setState({
      loginProblem: phData.login_problem,
      policyHolder: phData,
      endMessage:
        phData.login_problem === 'valid'
          ? `Your claims will now automatically be submitted to ${
              tenant.name
            }${' '} shortly after they appear on the carrier website.`
          : endMessage || phData.login_correction_message,
      credentialsValid: phData.login_problem === 'valid',
      finishedEasyEnrollPending: pending && phData.login_problem === null,
      returnToEnterCredentials: this.returnToEnterCredentials.bind(this),
      taskId: null
    });
    return this.state;
  };
}
