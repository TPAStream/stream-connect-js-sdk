import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowCircleLeft } from '../util/font-awesome-icons';
import Form from 'react-jsonschema-form';
import PayerInfo from './payer-info';

export default class EnterCredentials extends Component {
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
