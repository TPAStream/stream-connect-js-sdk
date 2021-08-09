import axios from 'axios';

let sdkAxios = axios.create({
  crossdomain: true,
  headers: { 'X-Is-Demo': '1', 'X-SDK-Version': 'N/A' }
});

const sdkAxiosMaker = ({
  apiToken,
  connectAccessToken,
  version,
  isDemo,
  tenant
}) => {
  sdkAxios = axios.create({
    crossdomain: true,
    headers: {
      'X-TPAStream-Token': apiToken,
      'X-SDK-Version': version,
      'X-Is-Demo': isDemo ? '1' : '0',
      ...(connectAccessToken && {
        'X-Connect-Access-Token': connectAccessToken
      }),
      ...(tenant && {
        'X-Tenant-Label': tenant.vendor,
        'X-Tenant-Key': tenant.systemKey
      })
    }
  });
  sdkAxios.interceptors.response.use(
    response => {
      if (response.headers['x-set-connect-access-token']) {
        sdkAxios.defaults.headers['X-Connect-Access-Token'] =
          response.headers['x-set-connect-access-token'];
      }
      return response;
    },
    error => {
      return Promise.reject(error);
    }
  );
};

export { sdkAxiosMaker, sdkAxios };
