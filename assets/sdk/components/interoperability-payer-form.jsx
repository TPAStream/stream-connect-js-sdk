import React, { Component } from 'react';

export default class InteroperabilityPayerForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tenantAccept: false,
      tpastreamTermsAccept: false
    };
  }

  checkDone() {
    const { windowProxyObj } = this.state;
    if (windowProxyObj.location.href.includes('sdk-interop-done')) {
      const ph_id = parseInt(
        windowProxyObj.location.href.replace(
          'https://app.tpastream.com/sdk-interop-done/',
          ''
        )
      );
      windowProxyObj.close();
      clearInterval(this.interval);
      this.props.validateCreds({
        params: {},
        errorCallBack: this.handleError,
        interopPhId: ph_id
      });
    } else if (
      windowProxyObj.location.href.includes('sdk-interop-error-done')
    ) {
      const error = windowProxyObj.location.href.replace(
        'https://app.tpastream.com/sdk-interop-error-done/',
        ''
      );
      windowProxyObj.close();
      clearInterval(this.interval);
      this.setState({ error: error });
      this.handleError(error);
    }
  }

  handleSubmit(event) {
    event.preventDefault();
    const { streamPayer } = this.props;
    // Redirect the person to the oauth flow. They will return to the sdk eventually.
    const windowProxyObj = window.open(
      streamPayer.interoperability_authorization_url
    );
    this.setState({ windowProxyObj: windowProxyObj });
    this.interval = setInterval(this.checkDone.bind(this), 1000);
  }

  render() {
    const { tenantAccept, tpastreamTermsAccept, error } = this.state;
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
              disabled={!(tenantAccept && tpastreamTermsAccept)}
            >
              Connect to {streamPayer.website_home_url_netloc}
            </button>
          </div>
        </div>
      </form>
    );
  }
}
