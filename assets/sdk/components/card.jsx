import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

const styles = {
  borderRadius: '4px',
  border: '1px solid #ccc',
  padding: '30px 20px 10px 20px',
  marginBottom: '20px',
  background: '#fbfbfb',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  cursor: 'pointer',
  height: '200px'
};

export default props => (
  <div
    className={props.isConfigured ? 'raise' : ''}
    onClick={() => {
      if (props.isConfigured) {
        return props.handleClick();
      }
    }}
    style={{
      ...styles,
      ...(props.isConfigured ? { cursor: 'pointer' } : { cursor: 'default' }),
      ...props.styles
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <FontAwesomeIcon icon={props.icon} size="6x" fixedWidth />
    </div>
    <div>
      <div
        style={{
          marginTop: '10px',
          fontSize: '30px',
          letterSpacing: '1px',
          textAlign: 'center'
        }}
      >
        {props.label}
      </div>
    </div>
    <div style={{ marginTop: 'auto', opacity: 0.9 }}>{props.description}</div>
  </div>
);
