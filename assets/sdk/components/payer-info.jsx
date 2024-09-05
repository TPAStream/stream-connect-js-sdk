import React, { Component } from 'react';
import Popup from 'react-popup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '../../shared/util/font-awesome-icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export class ControlledPopup extends Popup {
  constructor(props) {
    super(props);
  }

  componentDidUpdate() {
    super.componentDidUpdate();
    if (this.props.donePopUp) {
      this.props.donePopUp();
    }
  }
}

export default class PayerInfo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      popUpActive: false
    };
  }
  render() {
    const { payer, donePopUp, includePayerBlogs } = this.props;
    const { popUpActive } = this.state;
    let message = `
          Before you proceed, make sure you have registered on ${payer.website_home_url_netloc}
          and have your ${payer.name} username and password at your fingertips.
      `;
    if (payer.has_security_questions) {
      message += ` Also, have all ${payer.name} security questions and answers written down before you enroll below.`;
    }
    return (
      <div>
        <h3>Enter Credentials for</h3>
        <img
          src={payer.logo_url}
          style={{ maxWidth: '400px' }}
          alt={payer.name}
        ></img>
        {payer.redirect_vendor_name ? (
          <h5 style={{ textAlign: 'left' }}>
            Powered by {payer.redirect_vendor_name}
          </h5>
        ) : null}
        <div style={{ display: 'flex' }}>
          <FontAwesomeIcon
            icon={faQuestionCircle}
            size="lg"
            onClick={() => {
              Popup.close();
              Popup.create({
                title: 'Help Getting Started',
                content: `If you've not yet made an account with ${payer.website_home_url_netloc}, make one there first.`,
                buttons: {
                  left: [
                    {
                      text: 'Go To Payer Site!',
                      action: () => {
                        window.open(payer.register_url, '_blank');
                      }
                    }
                  ],
                  right: [
                    {
                      text: 'Ok!',
                      action: () => {
                        Popup.close();
                        this.setState({ popUpActive: false });
                      }
                    }
                  ]
                }
              });
              this.setState({ popUpActive: true });
            }}
          />
          <ControlledPopup
            closeBtn={false}
            donePopUp={popUpActive ? donePopUp : null}
          />
        </div>
        <p
          style={{
            border: 'solid',
            padding: '10px',
            backgroundColor: '#FCF8E3'
          }}
        >
          {message}
        </p>
        {includePayerBlogs
          ? payer.blogs.map(blog => {
              const article = marked.parse(blog.article);
              const clean = DOMPurify.sanitize(article);
              return <div dangerouslySetInnerHTML={{ __html: clean }} />;
            })
          : null}
      </div>
    );
  }
}
