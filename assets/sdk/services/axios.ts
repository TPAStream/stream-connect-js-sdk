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
/**
 * Shared in-flight refresh promise. If multiple requests are in flight
 * when the connect token expires, each fires its own response
 * interceptor and would otherwise independently call the refresh fn.
 * Stampeding the customer's mint endpoint with N parallel calls leaves
 * N-1 orphaned tokens (server-side Redis keys + JWT signatures) since
 * only one ends up in the default header. Gate behind a shared promise:
 * the first caller starts a refresh, every subsequent caller awaits the
 * same promise.
 */
let _refreshInFlight: Promise<string | null> | null = null;
/**
 * One-shot guard for the expiry notification path. Without it, N
 * parallel failed requests in the no-refresh-fn (or
 * refresh-fn-rejected) branch each independently fire the
 * `onConnectAccessTokenExpired` callback and dispatch the
 * `tpastream-connect-token-expired` event. From the customer's POV
 * the failures are one logical "session expired" event, so we
 * coalesce to one notification per expiry cycle. Reset on any
 * successful response so a later expiry can notify again.
 */
let _expiredNotificationFired = false;

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
      // Any successful response means we're no longer in an
      // expired-token state, so a later expiry can notify again.
      _expiredNotificationFired = false;
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
          // Stampede guard: every parallel-failed request shares a
          // single refresh attempt. The first one in starts the
          // promise and stashes it; subsequent ones await the same
          // value. Cleared in the `finally` so a later expiry can
          // start a fresh refresh.
          if (!_refreshInFlight) {
            const refreshFn = _connectAccessTokenRefreshFn;
            _refreshInFlight = (async () => {
              try {
                return (await refreshFn()) || null;
              } finally {
                _refreshInFlight = null;
              }
            })();
          }
          const fresh = await _refreshInFlight;
          if (fresh) {
            _sdkAxios.defaults.headers.common['X-Connect-Access-Token'] = fresh;
            // axios v1 normalizes request headers to AxiosHeaders
            // (with `.set`) in the request pipeline, but a custom
            // adapter or a config that bypassed the pipeline could
            // leave them as a plain object. Fall back to assignment
            // so a header-shape edge case can't throw a TypeError
            // that escapes the surrounding try and bypasses the
            // expiry notification.
            const cfgHeaders = originalConfig.headers;
            if (typeof cfgHeaders?.set === 'function') {
              cfgHeaders.set('X-Connect-Access-Token', fresh);
            } else if (cfgHeaders) {
              (cfgHeaders as Record<string, string>)['X-Connect-Access-Token'] =
                fresh;
            }
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
      // the host page (once per expiry cycle — guarded by
      // _expiredNotificationFired so N parallel failures don't fan out
      // into N modals) and reject so existing error UI fires.
      if (!_expiredNotificationFired) {
        _expiredNotificationFired = true;
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
      }
      return Promise.reject(error);
    }
  );
};
