import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig
} from 'axios';
import type { SDKInitOptions } from '../types-init';

/**
 * Sentinel attached to a retried request's config so the interceptor
 * doesn't loop on a refresh that itself returns expired_connect_token.
 */
interface RetryAwareConfig extends InternalAxiosRequestConfig {
  __sdkConnectTokenRetried?: boolean;
}

/**
 * Stable contract field on backend 422 responses for an expired
 * connect access token. The SDK keys off this string (not the
 * human-readable `message`) so server-side copy can evolve without
 * breaking auto-recovery.
 */
const EXPIRED_TOKEN_ERROR_CODE = 'expired_connect_token';
const EXPIRED_TOKEN_EVENT = 'tpastream-connect-token-expired';

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
let _connectAccessTokenRefreshFn: (() => Promise<string>) | undefined;
let _onConnectAccessTokenExpired: (() => void) | undefined;

export const sdkAxios = new Proxy({} as AxiosInstance, {
  get(_target, prop) {
    return Reflect.get(_sdkAxios, prop);
  }
});

interface AxiosMakerArgs
  extends Pick<
    SDKInitOptions,
    | 'apiToken'
    | 'connectAccessToken'
    | 'connectAccessTokenRefreshFn'
    | 'onConnectAccessTokenExpired'
    | 'isDemo'
    | 'tenant'
    | '_overrideBaseUrl'
  > {
  version: string;
  sdkStateId?: string;
}

export const sdkAxiosMaker = ({
  apiToken,
  connectAccessToken,
  connectAccessTokenRefreshFn,
  onConnectAccessTokenExpired,
  version,
  isDemo,
  sdkStateId,
  tenant,
  _overrideBaseUrl
}: AxiosMakerArgs) => {
  _connectAccessTokenRefreshFn = connectAccessTokenRefreshFn;
  _onConnectAccessTokenExpired = onConnectAccessTokenExpired;
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
    async (error) => {
      const status = error?.response?.status;
      const errorCode = error?.response?.data?.error_code;
      const isExpiredToken =
        status === 422 && errorCode === EXPIRED_TOKEN_ERROR_CODE;
      if (!isExpiredToken) {
        return Promise.reject(error);
      }

      const originalConfig = error.config as RetryAwareConfig | undefined;
      const alreadyRetried = Boolean(originalConfig?.__sdkConnectTokenRetried);

      // Try a one-shot transparent refresh if the integrator wired
      // `connectAccessTokenRefreshFn`. Skip if the failing request was
      // itself a retry (the new token also got rejected — give up
      // rather than loop) or the original config is missing (which
      // would mean we can't replay it).
      if (_connectAccessTokenRefreshFn && originalConfig && !alreadyRetried) {
        try {
          const fresh = await _connectAccessTokenRefreshFn();
          if (fresh) {
            _sdkAxios.defaults.headers.common['X-Connect-Access-Token'] = fresh;
            originalConfig.headers.set('X-Connect-Access-Token', fresh);
            originalConfig.__sdkConnectTokenRetried = true;
            return _sdkAxios.request(originalConfig);
          }
        } catch (refreshErr) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn(
              '[stream-connect-sdk] connectAccessTokenRefreshFn rejected; ' +
                'falling back to onConnectAccessTokenExpired:',
              refreshErr
            );
          }
        }
      }

      // No refresh wired, refresh failed, or we already retried. Notify
      // the host page and reject so existing error UI fires.
      try {
        _onConnectAccessTokenExpired?.();
      } catch (cbErr) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(
            '[stream-connect-sdk] onConnectAccessTokenExpired callback ' +
              'threw:',
            cbErr
          );
        }
      }
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent(EXPIRED_TOKEN_EVENT));
      }
      return Promise.reject(error);
    }
  );
};
