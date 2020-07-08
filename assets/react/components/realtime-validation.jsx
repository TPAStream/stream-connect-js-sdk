import React, { Component } from 'react';
import { validateCredentials } from '../requests/validate-credentials';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '../util/font-awesome-icons';

export default class RealTimeVerification extends Component {
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
            credentialsValid: true, // We are just going to send the users to the done page if this fails,
            pending: false,
            validationState: validateData.state
          });
        } else if (validateData.state === 'SUCCESS') {
          clearInterval(this.interval);
          this.props.handleRealtimeCompletion({
            policyHolderId: policyHolderId,
            pending: false,
            credentialsValid: validateData.credentials_are_valid,
            validationState: validateData.state
          });
        } else {
          clearInterval(this.interval);
          throw new Error('This is not a valid return state from validateData');
        }
      });
    }
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
