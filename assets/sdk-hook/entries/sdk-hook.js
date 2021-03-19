import { sdkAxiosMaker } from '../../shared/services/axios';
import { getSDK } from '../../shared/requests/sdk';
import { getPayer } from '../../shared/requests/payer';
import { parseMany, parseOne } from '../../shared/parsers/generic';

// Injected from webpack-auto-inject version https://stackoverflow.com/questions/24663175/how-can-i-inject-a-build-number-with-webpack
let version = '[AIV]{version}[/AIV]';

let state = { init: false };

const updateState = (state, update) => {
  Object.keys(update).forEach(key => {
    state[key] = Array.isArray(update[key])
      ? parseMany(update[key])
      : typeof update[key] === 'object' && update[key] !== null
      ? parseOne(Object.assign({}, state[key], update[key]))
      : update[key];
  });
  state = parseOne(state);
};

//const clearState = (state) => {
//    state = { init: false }
//}

export const useStreamConnect = ({
  apiToken,
  tenant = { systemKey: '', vendor: '' },
  employer = { systemKey: '', vendor: '', name: '' },
  user = { firstName: '', lastName: '', email: '' },
  realTimeVerification = true,
  isDemo = false,
  doneGetSDK = () => {}
}) => {
  sdkAxiosMaker({ apiToken, version, isDemo, tenant });
  if (!state.init) {
    updateState(state, { tenant, user, employer, realTimeVerification });
    state.init = true;
  }
  const getStreamConnectInitAsync = () => {
    return getSDK({ employer, user, isDemo, doneGetSDK }).then(initData => {
      updateState(state, initData);
      return state;
    });
  };

  const getStreamConnectPayerAsync = payer => {
    if (payer) {
      return getPayer({
        payerId: payer.id,
        employerId: state.employer.id,
        email: state.user.email
      }).then(payerData => {
        updateState(state, { payer: payerData });
        return state;
      });
    }
  };

  const streamConnect = {};

  Object.defineProperties(streamConnect, {
    getStreamConnectInitAsync: {
      value: getStreamConnectInitAsync,
      writable: false
    },
    getStreamConnectPayerAsync: {
      value: getStreamConnectPayerAsync,
      writable: false
    },
    state: {
      value: Object.assign({}, state),
      writable: false
    }
  });

  return streamConnect;
};
