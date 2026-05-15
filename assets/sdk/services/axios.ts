import axios, { type AxiosInstance } from 'axios';
import type { SDKInitOptions } from '../types-init';

/**
 * sdkAxios is mutated when the SDK initializes (sdkAxiosMaker
 * rebuilds it with the customer's tokens + base URL). Importing
 * modules read the live binding via the getter rather than capturing
 * the initial value at import time.
 */

let _sdkAxios: AxiosInstance = axios.create({
  headers: { 'X-Is-Demo': '1', 'X-SDK-Version': 'N/A' }
});

export const sdkAxios = new Proxy({} as AxiosInstance, {
  get(_target, prop) {
    return Reflect.get(_sdkAxios, prop);
  }
});

interface AxiosMakerArgs
  extends Pick<
    SDKInitOptions,
    'apiToken' | 'connectAccessToken' | 'isDemo' | 'tenant' | '_overrideBaseUrl'
  > {
  version: string;
  sdkStateId?: string;
}

export const sdkAxiosMaker = ({
  apiToken,
  connectAccessToken,
  version,
  isDemo,
  sdkStateId,
  tenant,
  _overrideBaseUrl
}: AxiosMakerArgs) => {
  _sdkAxios = axios.create({
    baseURL: _overrideBaseUrl || 'https://app.tpastream.com/sdk-api',
    headers: {
      'X-TPAStream-Token': apiToken || '',
      'X-SDK-Version': version,
      ...(sdkStateId && { 'X-SDK-State-Id': sdkStateId }),
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
  _sdkAxios.interceptors.response.use(
    (response) => {
      const refreshed = response.headers['x-set-connect-access-token'];
      if (refreshed) {
        _sdkAxios.defaults.headers.common['X-Connect-Access-Token'] = refreshed;
      }
      return response;
    },
    (error) => Promise.reject(error)
  );
};
