import React, { Component } from 'react';
import { FixPayerImages } from './payer-images';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowCircleLeft } from '../../shared/util/font-awesome-icons';

export default class FixCredentials extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.props.doneStep2(this.props);
  }

  render() {
    const { returnSelectEnrollProcess, streamUser, streamPayers } = this.props;
    const problemPhs = streamUser.policy_holders
      ? streamUser.policy_holders.filter(ph => ph.login_needs_correction)
      : [];
    return (
      <div id="fix-credentials">
        {returnSelectEnrollProcess ? (
          <FontAwesomeIcon
            size="lg"
            icon={faArrowCircleLeft}
            onClick={returnSelectEnrollProcess}
          />
        ) : null}
        <h3>Choose an Account to fix Below</h3>
        {problemPhs.length > 0 ? (
          <FixPayerImages
            policyHolders={problemPhs}
            payers={streamPayers}
            choosePolicyHolder={this.props.choosePolicyHolder}
          />
        ) : (
          <div>You currently have no credentials that need adjusted.</div>
        )}
      </div>
    );
  }
}
