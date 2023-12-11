import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '../../shared/util/font-awesome-icons';
import { beginInterop, getInteropState } from '../../shared/requests/interop';

export default class InteroperabilityPayerForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tenantAccept: false,
      tpastreamTermsAccept: false,
      connectingToInterop: false
    };
  }

  checkDone() {
    const { email } = this.props;
    getInteropState({ email: email }).then(data => {
      if (data.status === 'SUCCESS') {
        this.setState({ connectingToInterop: false });
        clearInterval(this.interval);
        this.props.validateCreds({
          params: {},
          errorCallBack: this.handleError,
          interopPhId: data.ph_id
        });
      } else if (data.status === 'FAILURE') {
        clearInterval(this.interval);
        this.setState({ errorMessage: data.error, connectingToInterop: false });
        this.props.handlePostError({ errorMessage: data.error });
      } else if (data.status === 'IN_PROGRESS') {
        console.log('Interop in progress, waiting for completion');
      } else {
        const errorMessage = 'Unknown State of Interop flow';
        clearInterval(this.interval);
        this.setState({
          errorMessage: errorMessage,
          connectingToInterop: false
        });
        this.props.handlePostError({ errorMessage: errorMessage });
      }
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    const { streamPayer, email } = this.props;
    this.setState({ connectingToInterop: true });
    beginInterop({ email: email }).then(
      data => {
        this.setState({ connectingToInterop: true });
        // Begin redirect oauth flow. Query in the background for SUCCESS or FAILURE.
        // Do a check every 5 seconds since that is how long it takes the end page to close.
        // Open in new tab. This should really hopefully be the default
        window.open(streamPayer.interoperability_authorization_url);
        this.interval = setInterval(this.checkDone.bind(this), 5000);
      },
      error => {
        this.setState({
          errorMessage: error,
          connectingToInterop: false
        });
      }
    );
  }

  render() {
    const {
      tenantAccept,
      tpastreamTermsAccept,
      error,
      connectingToInterop
    } = this.state;
    const {
      streamTenant,
      streamPayer,
      tenantTerms,
      handleTermsClick
    } = this.props;
    return (
      <form id="easy-enroll-form" onSubmit={this.handleSubmit.bind(this)}>
        {error && <div>{error}</div>}
        <h2 id="interoperability-api-notification">
          Connect to {streamPayer.website_home_url_netloc}
        </h2>
        <p>
          The security of your information is very important to us. You're being
          redirected to securely login on {streamPayer.website_home_url_netloc}
          's website and connect to TPA Stream. This verifies that it's OK to
          share your information with us to process your claims.
        </p>
        <div className="row">
          <div className="col-sm-12">
            <div className="form-group text-left">
              <div className="checkbox">
                <input
                  type="checkbox"
                  checked={tpastreamTermsAccept}
                  onChange={event =>
                    this.setState({
                      tpastreamTermsAccept:
                        event.target.value == 'on' ? true : false
                    })
                  }
                  required
                />
                <label htmlFor="accept">
                  I have read and I agree to the
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={handleTermsClick}
                  >
                    Terms Of Use
                  </button>
                </label>
              </div>
              <div className="checkbox">
                <input
                  type="checkbox"
                  required
                  checked={tenantAccept}
                  onChange={event =>
                    this.setState({
                      tenantAccept: event.target.value == 'on' ? true : false
                    })
                  }
                />
                <label htmlFor="accept">
                  I have read and agree to the above Terms of Use for
                  <strong>{' ' + streamTenant.name}</strong> and I acknowledge
                  that my claims will be automatically sent to
                  <strong>{' ' + streamTenant.name}</strong>
                </label>
                <div className="tenant-terms">{tenantTerms}</div>
              </div>
            </div>
          </div>
          <div className="form-group">
            <button
              type="submit"
              className="btn btn-lg btn-block btn-primary"
              disabled={
                connectingToInterop || !(tenantAccept && tpastreamTermsAccept)
              }
            >
              Connect to {streamPayer.website_home_url_netloc}
            </button>
            {connectingToInterop ? (
              <FontAwesomeIcon icon={faSpinner} size="lg" spin />
            ) : null}
          </div>
        </div>
      </form>
    );
  }
}
