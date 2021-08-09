import React, { Component } from 'react';
import Select from 'react-select';
import Highlighter from 'react-highlight-words';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowCircleLeft } from '../../shared/util/font-awesome-icons';
import { PayerImages } from './payer-images';

export default class ChoosePayer extends Component {
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
      streamEmployer,
      usedPayers,
      choosePayer,
      isDemo,
      dropDown,
      returnSelectEnrollProcess
    } = this.props;
    const { payerNameFilter, payerOptions } = this.state;
    if (isDemo) {
      return (
        <div id="choose-payer">
          {returnSelectEnrollProcess ? (
            <FontAwesomeIcon
              size="lg"
              icon={faArrowCircleLeft}
              onClick={returnSelectEnrollProcess}
            />
          ) : null}
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
          {returnSelectEnrollProcess ? (
            <FontAwesomeIcon
              size="lg"
              icon={faArrowCircleLeft}
              onClick={returnSelectEnrollProcess}
            />
          ) : null}
          <h3>Choose an Account to add Below</h3>
          {dropDown ? (
            <div>
              {(streamEmployer.payers.length > 0 || usedPayers.length > 0) && (
                <PayerImages
                  streamPayers={streamPayers.filter(
                    p =>
                      streamEmployer.payers.map(ep => ep.id).includes(p.id) ||
                      usedPayers.includes(p.id)
                  )}
                  usedPayers={usedPayers}
                  choosePayer={choosePayer}
                />
              )}
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
            </div>
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
