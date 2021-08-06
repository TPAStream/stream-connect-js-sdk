import React, { Component } from 'react';
import EnrollCard from './card';
import { faUserPlus, faUserEdit } from '../../shared/util/font-awesome-icons';

export default class SelectEnrollProcess extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.props.doneStep1(this.props);
  }

  render() {
    const {} = this.props;
    const cards = [
      {
        value: 'enroll',
        label: 'Enroll New Member',
        click: this.props.setChoosePayer,
        icon: faUserPlus,
        description: '',
        isConfigured: true
      },
      {
        value: 'fixcredentials',
        label: 'Fix Credentials',
        click: this.props.setFixCredentials,
        icon: faUserEdit,
        description: '',
        isConfigured: true
      }
    ];
    return (
      <div id="select-enroll-process">
        <div className="row">
          {cards.map(card => (
            <div key={card.value} className="col-sm-6">
              <EnrollCard
                handleClick={() => card.click()}
                label={card.label}
                icon={card.icon}
                description={card.description}
                isConfigured={card.isConfigured}
                badgeNumber={card.badgeNumber}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
}
