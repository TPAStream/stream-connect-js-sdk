import axios from 'axios';

let sdkAxios = axios.create({
  crossdomain: true,
  headers: { 'X-Is-Demo': '1' }
});

const sdkAxiosMaker = ({ apiToken, isDemo, tenant }) => {
  sdkAxios = axios.create({
    crossdomain: true,
    headers: {
      'X-TPAStream-Token': apiToken,
      'X-Is-Demo': isDemo ? '1' : '0',
      ...(tenant && {
        'X-Tenant-Label': tenant.vendor,
        'X-Tenant-Key': tenant.systemKey
      })
    }
  });
};

export { sdkAxiosMaker, sdkAxios };
