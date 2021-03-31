import React from 'react';

class TermsOfUse extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.props.doneTermsOfService();
  }

  render() {
    const { termsHtmlString } = this.props;
    return (
      <div id="terms-of-use">
        <div dangerouslySetInnerHTML={{ __html: termsHtmlString }} />
        {this.props.returnButton()}
      </div>
    );
  }
}

export default TermsOfUse;
