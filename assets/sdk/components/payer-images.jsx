import React from 'react';

export const PayerImages = ({ streamPayers, usedPayers, choosePayer }) => {
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

export const FixPayerImages = ({
  policyHolders,
  payers,
  choosePolicyHolder
}) => {
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
      {policyHolders.map(ph => {
        return (
          <div
            id={`selectPh_${ph.id}`}
            key={`selectPh_${ph.id}`}
            style={{
              border: 'solid',
              width: '300px',
              padding: '5px',
              height: '100px',
              fontSize: '.75rem',
              backgroundColor: '#f2dede',
              color: '#a94442',
              borderColor: '#ebccd1',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (ph.login_problem === 'migrating') {
                choosePolicyHolder({
                  payer: payers.find(
                    p => ph.payer.payer_group_id === p.payer_group_id
                  ),
                  dependent: false
                });
              } else {
                choosePolicyHolder({
                  policyHolder: ph,
                  payer: payers.find(p => ph.payer_id === p.payer_id)
                });
              }
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <b>User:</b> {ph.username}
                </div>
                <div>
                  <b>Problem:</b> {ph.login_problem}
                </div>
              </div>
            </div>
            <img
              src={
                payers.find(p => ph.payer_id === p.payer_id)?.logo_url ||
                payers.find(p => ph.payer.payer_group_id === p.payer_group_id)
                  ?.logo_url
              }
              style={{
                maxWidth: '200px',
                maxHeight: '50px',
                marginTop: '10px',
                marginLeft: '50px'
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
