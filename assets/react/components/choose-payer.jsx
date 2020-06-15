import React, { Component } from 'react';
import Select from 'react-select';
import Highlighter from 'react-highlight-words';

const PayerImages = ({ streamPayers, usedPayers, choosePayer }) => {
  return (
    <div
      id="payer-images"
      style={{
        marginTop: '40px',
        display: 'table-cell',
        verticalAlign: 'middle',
        horizontalAlign: 'middle'
      }}
    >
      {streamPayers.map(payer => {
        return (
          <div
            id={`selectPayer_${payer.id}`}
            key={`selectPayer_${payer.id}`}
            style={{
              border: 'solid',
              width: '300px',
              padding: '20px',
              height: '100px'
            }}
          >
            {usedPayers.includes(payer.id) ? (
              <a
                onClick={e => {
                  e.preventDefault();
                  choosePayer({ payer: payer, dependent: true });
                }}
                style={{ width: '300px' }}
              >
                <div>Add a dependent login</div>
                <img
                  src={payer.logo_url}
                  style={{
                    maxWidth: '200px',
                    maxHeight: '50px',
                    opacity: '.5'
                  }}
                />
              </a>
            ) : (
              <a
                onClick={e => {
                  e.preventDefault();
                  choosePayer({ payer: payer, dependent: false });
                }}
                style={{ width: '300px' }}
              >
                <img
                  src={payer.logo_url}
                  style={{
                    maxWidth: '200px',
                    maxHeight: '50px'
                  }}
                />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
};

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
      usedPayers,
      choosePayer,
      isDemo,
      dropDown
    } = this.props;
    const { payerNameFilter, payerOptions } = this.state;
    if (isDemo) {
      return (
        <div id="choose-payer">
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
          <h3>Choose an Account to add Below</h3>
          {dropDown ? (
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
