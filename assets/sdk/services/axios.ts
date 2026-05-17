import axios, { type AxiosInstance } from 'axios';
import type { SDKInitOptions } from '../types-init';

/**
 * sdkAxios is a module-level singleton mutated when the SDK
 * initializes (sdkAxiosMaker rebuilds it with the customer's tokens +
 * base URL). Importing modules read the live binding via the getter
 * rather than capturing the initial value at import time.
 *
 * **Caveat: multi-instance host pages are not isolated.** If a single
 * page mounts two `StreamConnect()` instances on different `el`
 * selectors with different tokens, the second init() reconfigures the
 * shared axios singleton and the first instance's subsequent requests
 * inherit the new headers. We warn on second-init-with-divergent-token
 * so an integrator at least sees a console message if they trip the
 * case. Proper isolation would require per-instance axios contexts
 * threaded through every request module; tracked for a future SDK
 * rev. In practice no customer integration ships two SDKs side-by-side
 * with different tokens today.
 */

let _sdkAxios: AxiosInstance = axios.create({
  headers: { 'X-Is-Demo': '1', 'X-SDK-Version': 'N/A' }
});
let _lastConfiguredToken: string | null = null;

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
  const nextToken = apiToken || '';
  if (
    _lastConfiguredToken !== null &&
    _lastConfiguredToken !== nextToken &&
    typeof console !== 'undefined' &&
    console.warn
  ) {
    console.warn(
      '[stream-connect-sdk] sdkAxiosMaker is being re-invoked with a ' +
        'different apiToken than the previous call. The axios instance ' +
        'is a module-level singleton; the previous SDK instance (if ' +
        'still mounted) will start using these new headers on its ' +
        'next request. Two concurrent SDK instances on the same page ' +
        'with different tokens are not currently isolated.'
    );
  }
  _lastConfiguredToken = nextToken;
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
