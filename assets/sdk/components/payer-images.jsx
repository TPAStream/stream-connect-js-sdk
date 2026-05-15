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

export const resolvePayerForPH = (ph, payers) => {
  // Migrating PHs point at the OLD carrier; the destination is the new
  // one that shares the same `payer_group_id`. Resolve against the
  // group, and explicitly skip the PH's own dead `payer_id` so we don't
  // bounce back to the source when both source and destination happen
  // to be in the employer's enabled-carriers list during the migration
  // window.
  if (
    ph.login_problem === 'migrating' &&
    ph.payer &&
    ph.payer.payer_group_id !== null &&
    ph.payer.payer_group_id !== undefined
  ) {
    return payers.find(
      p =>
        ph.payer.payer_group_id === p.payer_group_id &&
        p.payer_id !== ph.payer_id
    );
  }
  return payers.find(p => ph.payer_id === p.payer_id);
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
        marginTop: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '480px'
      }}
    >
      {policyHolders.map(ph => {
        const resolved = resolvePayerForPH(ph, payers);
        const disabled = !resolved;
        return (
          <div
            id={`selectPh_${ph.id}`}
            key={`selectPh_${ph.id}`}
            style={{
              border: '1px solid',
              borderColor: disabled ? '#fde2e2' : '#fecaca',
              borderRadius: '8px',
              width: '100%',
              padding: '14px 16px',
              fontSize: '0.875rem',
              backgroundColor: disabled ? '#fafafa' : '#fef2f2',
              color: disabled ? '#525252' : '#991b1b',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'box-shadow 120ms ease, transform 120ms ease',
              boxShadow: disabled ? 'none' : '0 1px 2px rgba(0,0,0,0.04)'
            }}
            onMouseEnter={
              disabled
                ? undefined
                : e => {
                    e.currentTarget.style.boxShadow =
                      '0 4px 10px rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
            }
            onMouseLeave={
              disabled
                ? undefined
                : e => {
                    e.currentTarget.style.boxShadow =
                      '0 1px 2px rgba(0,0,0,0.04)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
            }
            onClick={
              disabled
                ? undefined
                : () => {
                    if (ph.login_problem === 'migrating') {
                      choosePolicyHolder({
                        payer: resolved,
                        dependent: false
                      });
                    } else {
                      choosePolicyHolder({
                        policyHolder: ph,
                        payer: resolved
                      });
                    }
                  }
            }
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  minWidth: 0
                }}
              >
                {(resolved && resolved.logo_url) ||
                (ph.payer && ph.payer.logo_url) ? (
                  <img
                    src={
                      (resolved && resolved.logo_url) ||
                      (ph.payer && ph.payer.logo_url)
                    }
                    alt=""
                    style={{
                      maxWidth: '64px',
                      maxHeight: '32px',
                      flexShrink: 0,
                      opacity: disabled ? 0.55 : 1
                    }}
                  />
                ) : null}
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: '#1f2937',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {(resolved && resolved.name) ||
                    (ph.payer && ph.payer.name) ||
                    'Carrier'}
                </div>
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#9ca3af',
                  flexShrink: 0
                }}
              >
                {ph.login_problem}
              </div>
            </div>
            <div
              style={{
                marginTop: '8px',
                color: '#4b5563',
                fontSize: '0.8125rem'
              }}
            >
              <span style={{ color: '#6b7280' }}>User:</span>{' '}
              <span style={{ color: '#111827' }}>{ph.username}</span>
            </div>
            {disabled ? (
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '0.8125rem',
                  color: '#6b7280'
                }}
              >
                This carrier isn't enabled for this employer. Please contact
                your administrator.
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
