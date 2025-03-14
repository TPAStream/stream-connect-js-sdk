import React, { Component } from 'react';
import {
  validateCredentials,
  putTask
} from '../../shared/requests/validate-credentials';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '../../shared/util/font-awesome-icons';
import Select from 'react-select';
import Highlighter from 'react-highlight-words';

export default class TwoFactorAuth extends Component {
  constructor(props) {
    super(props);
    this.defaultMaxRetries = 40;
    this.state = {
      progress: 0, // This is a percentage. So .01 to 1 pretty much
      fetching: false,
      currentRetries: this.props.maxRetries || this.defaultMaxRetries,
      methodChoice: null,
      code: ''
    };
  }

  checkProgress = () => {
    const { taskId, policyHolderId, maxRetries, email } = this.props;
    if (this.state.currentRetries <= 0) {
      clearInterval(this.interval);
      this.props.handleRealtimeCompletion({
        validationState: 'PENDING',
        credentialsValid: null,
        policyHolderId: policyHolderId,
        pending: true,
        endMessage:
          "Validating your credentials is taking longer than usual due to high traffic. We'll keep trying even if you leave the page. Please check back later."
      });
    } else {
      validateCredentials({
        taskId: taskId,
        policyHolderId: policyHolderId,
        email: email
      }).then(validateData => {
        if (
          validateData.state === 'PENDING' ||
          validateData.state === 'WAITING_FOR_METHOD_CHOICE' ||
          validateData.state === 'TRIGGERING_TWO_FACTOR_AUTH' ||
          validateData.state === 'ENTERING_CODE'
        ) {
          this.setState({
            progress: maxRetries
              ? (maxRetries - this.state.currentRetries + 1) / maxRetries
              : (this.defaultMaxRetries - this.state.currentRetries + 1) /
                this.defaultMaxRetries,
            currentRetries: this.state.currentRetries - 1,
            fetching: true
          });
        } else if (validateData.state === 'FAILURE') {
          clearInterval(this.interval);
          this.props.handleRealtimeCompletion({
            policyHolderId: policyHolderId,
            credentialsValid: false,
            pending: true,
            validationState: validateData.state,
            endMessage: validateData.message
          });
        } else if (
          validateData.state === 'SUCCESS' ||
          validateData.state === 'TWO_FACTOR_AUTH_COMPLETE'
        ) {
          clearInterval(this.interval);
          this.props.handleRealtimeCompletion({
            policyHolderId: policyHolderId,
            pending: false,
            credentialsValid: validateData.credentials_are_valid,
            validationState: validateData.state
          });
        } else if (validateData.state === 'WAITING_FOR_TWO_FACTOR_CODE') {
          clearInterval(this.interval);
          this.props.handleRealtimeCompletion({
            policyHolderId: policyHolderId,
            pending: false,
            credentialsValid: validateData.credentials_are_valid,
            twoFactorAuth: validateData,
            validationState: validateData.state
          });
        } else {
          clearInterval(this.interval);
          throw new Error('This is not a valid return state from validateData');
        }
      });
    }
  };

  handleMethodChoice(methodChoiceOption) {
    clearInterval(this.interval);
    const { taskId, policyHolderId, email } = this.props;
    this.setState({
      progress: 0,
      fetching: true
    });
    putTask({
      taskId: taskId,
      policyHolderId: policyHolderId,
      params: {
        user_email: email,
        method: methodChoiceOption.value
      }
    }).then(() => {
      this.interval = setInterval(this.checkProgress, 5000);
    });
  }

  handleCodeSubmit() {
    clearInterval(this.interval);
    const { taskId, policyHolderId, email } = this.props;
    const { code } = this.state;
    this.setState({
      progress: 0,
      fetching: true
    });
    putTask({
      taskId: taskId,
      policyHolderId: policyHolderId,
      params: {
        user_email: email,
        code: code
      }
    }).then(() => {
      this.interval = setInterval(this.checkProgress, 5000);
    });
  }

  componentDidMount() {
    // this.interval = setInterval(this.checkProgress, 5000);
    this.props.doneRealtime();
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    const { progress, fetching, methodChoice, code } = this.state;
    const { twoFactorAuthData, twoFactorAuthState } = this.props;
    if (fetching) {
      return (
        <div id="real-time-page">
          <h3>Fetching Next Steps...</h3>
          <h3>
            This may take a couple seconds...
            <FontAwesomeIcon icon={faSpinner} size="lg" spin />
          </h3>
        </div>
      );
    } else if (twoFactorAuthState === 'WAITING_FOR_METHOD_CHOICE') {
      const methodChoices =
        twoFactorAuthData.info && twoFactorAuthData.info.method_list;
      const methodOptions = methodChoices.map(mc => ({ value: mc, label: mc }));
      return (
        <div id="real-time-page">
          <h3>Choose Two Factor Authentication Method</h3>
          <Select
            id="method-dropdown"
            placeholder="Select a two factor method"
            classNamePrefix="ReactSelect"
            clearable={true}
            value={methodChoice}
            onChange={this.handleMethodChoice.bind(this)}
            options={methodOptions}
            formatOptionLabel={(obj, { inputValue }) => (
              <Highlighter
                searchWords={[inputValue]}
                textToHighlight={obj.label}
                autoEscape={true}
              />
            )}
          />
        </div>
      );
    } else if (twoFactorAuthState === 'WAITING_FOR_TWO_FACTOR_CODE') {
      return (
        <div id="real-time-page">
          <h3>Enter Two Factor Code</h3>
          <input
            placeholder={'Two Factor Auth Code'}
            onChange={e => this.setState({ code: e.currentTarget.value })}
            value={code}
          ></input>
          <button
            className="btn btn-primary"
            onClick={this.handleCodeSubmit.bind(this)}
          >
            Next
          </button>
        </div>
      );
    } else {
      return <FontAwesomeIcon icon={faSpinner} size="lg" spin />;
    }
  }
}
