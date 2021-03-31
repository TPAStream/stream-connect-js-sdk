import React, { Component } from 'react';

export default class FinishedEasyEnroll extends Component {
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
      pending,
      payer,
      employer
    } = this.props;
    if (pending) {
      return (
        <div id="finished-with-easy-enroll">
          <h2>Pending...</h2>
          <p>{endingMessage}</p>
          <p>
            Once we finish validation, your claims will now automatically be
            submitted to {tenant.name} shortly after they appear on the carrier
            website.
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
    } else if (credentialsValid) {
      return (
        <div id="finished-with-easy-enroll">
          <h2>Success!</h2>
          <p>
            Your claims will now automatically be submitted to {tenant.name}{' '}
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
