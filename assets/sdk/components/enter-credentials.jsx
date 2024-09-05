import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faArrowCircleLeft
} from '../../shared/util/font-awesome-icons';
import Form from 'react-jsonschema-form';
import PayerInfo from './payer-info';
import InteroperabilityPayerForm from './interoperability-payer-form';

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

export default class EnterCredentials extends Component {
  constructor(props) {
    super(props);
    this.state = {
      schema: null,
      uiSchema: null,
      formData: this.props.formData || null,
      submitDisabled: false
    };
  }

  toggleTermsOfUse() {
    const { toggleTermsOfUse } = this.props;
    const { formData } = this.state;
    toggleTermsOfUse(formData);
  }

  componentDidMount() {
    this.props.doneStep4();
  }

  componentWillMount() {
    const {
      streamPayer,
      streamTenant,
      userAddedUISchema,
      formData
    } = this.props;
    const schema = streamPayer.onboard_form.schema.properties;
    const schemaKeys = Object.keys(schema);
    let required = []; // new way required is added to properties
    for (const key of schemaKeys) {
      if (schema[key].required !== void 0) {
        delete schema[key].required; // We don't want required on the schema itself. So let's remove it
        required.push(key);
      }
    }
    const uiSchema = streamPayer.onboard_ui_schema;
    const fullSchema = {
      ...schema,
      ...AdditionalSchema(streamTenant)
    };
    const fullUiSchema = {
      ...uiSchema,
      ...AdditionalUiSchema({
        toggleTermsOfUse: this.toggleTermsOfUse.bind(this),
        userAddedUISchema
      })
    };
    this.setState({
      schema: {
        type: 'object',
        required: required,
        properties: fullSchema
      },
      uiSchema: fullUiSchema,
      formData: formData,
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

  handlePostError = ({ errorMessage }) => {
    this.setState({
      submitDisabled: false,
      errorMessage: errorMessage
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
    this.props.validateCreds({
      params: params,
      errorCallBack: this.handlePostError
    });
  };

  render() {
    const {
      schema,
      uiSchema,
      formData,
      submitDisabled,
      errorMessage
    } = this.state;
    const {
      streamPayer,
      streamPolicyHolder,
      streamTenant,
      tenantTerms,
      includePayerBlogs,
      enableInterop,
      enableInteropSinglePage,
      returnToStep3,
      returnToStep2,
      donePopUp
    } = this.props;
    return (
      <div style={{ marginTop: '15px' }} id="easy-enroll-form-page">
        {returnToStep3 ? (
          <FontAwesomeIcon
            size="lg"
            icon={faArrowCircleLeft}
            onClick={returnToStep3}
          />
        ) : null}
        {returnToStep2 ? (
          <FontAwesomeIcon
            size="lg"
            icon={faArrowCircleLeft}
            onClick={returnToStep2}
          />
        ) : null}
        {errorMessage && <div>{errorMessage}</div>}
        {streamPolicyHolder && streamPolicyHolder.login_correction_message && (
          <div>{streamPolicyHolder.login_correction_message}</div>
        )}
        <PayerInfo
          payer={streamPayer}
          donePopUp={donePopUp}
          includePayerBlogs={includePayerBlogs}
        />
        {enableInterop && streamPayer.supports_interoperability_apis ? (
          <InteroperabilityPayerForm
            streamPayer={streamPayer}
            streamTenant={streamTenant}
            tenantTerms={tenantTerms}
            email={this.props.email}
            enableInteropSinglePage={enableInteropSinglePage}
            handleTermsClick={this.toggleTermsOfUse.bind(this)}
            validateCreds={this.props.validateCreds}
            handlePostError={this.handlePostError.bind(this)}
          />
        ) : (
          <Form
            schema={schema}
            uiSchema={uiSchema}
            formData={formData}
            showErrorList={false}
            onSubmit={this.handleSubmit}
            onChange={this.handleChange}
            validate={this.validateForm}
            id="easy-enroll-form"
          >
            <div>
              <div className="tenant-terms">{tenantTerms}</div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitDisabled}
              >
                Validate Credentials for {streamPayer.name}
                {streamPayer.redirect_vendor_name ? (
                  <>
                    <br />
                    Powered by {streamPayer.redirect_vendor_name}
                  </>
                ) : null}
              </button>
              {submitDisabled ? (
                <FontAwesomeIcon icon={faSpinner} size="lg" spin />
              ) : null}
            </div>
          </Form>
        )}
      </div>
    );
  }
}
