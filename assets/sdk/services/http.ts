import type { SDKInitOptions } from '../types-init';

/**
 * The SDK's HTTP client: a small wrapper around the browser's `fetch`.
 *
 * Until 0.8.7 this was an axios instance. axios and its ~26 transitive
 * packages were the source of nearly every advisory in the shipped
 * bundle, and the SDK used a small part of it, so this module replaces
 * it. It keeps the parts of axios's behaviour that the SDK and
 * integrators can observe:
 *
 * - Responses resolve to `{ data, status, statusText, headers, config }`.
 *   `data` is parsed JSON when the body is JSON, the raw text when it is
 *   not (an HTML 502 page from a proxy), and `''` when the body is empty.
 *   `headers` is a plain object with lower-cased names.
 * - Any non-2xx status rejects with an `SdkHttpError` whose `response`
 *   holds the same fields. A request that never reached the server
 *   rejects with an `SdkHttpError` that has a `request` and NO
 *   `response`, so callers can tell "the server said no" from "could
 *   not reach the server".
 * - `message`, `code` and `status` match what axios set
 *   ("Request failed with status code 422" / `ERR_BAD_REQUEST`,
 *   "Network Error" / `ERR_NETWORK`). Some of these messages are shown
 *   to the member, so they must not drift.
 * - Query parameters are encoded the way axios 1.x encodes them;
 *   `undefined` and `null` values are dropped.
 * - No timeout (axios had none configured) and cookies only on
 *   same-origin requests (axios's `withCredentials: false`).
 *
 * `fetch` is read from `globalThis` at call time, never at import time,
 * so the headless entry and server-side rendering can import this
 * module with no `window` and no `fetch`. Tests inject a fake through
 * `createSdkHttpClient({ fetch })`.
 */

/**
 * Stable contract field on backend 422 responses for an expired
 * connect access token. The SDK keys off this string (not the
 * human-readable `message`) so server-side copy can evolve without
 * breaking auto-recovery.
 */
export const EXPIRED_TOKEN_ERROR_CODE = 'expired_connect_token';
export const EXPIRED_TOKEN_EVENT = 'tpastream-connect-token-expired';

/** The Accept header axios 1.x sent on every request. */
const DEFAULT_ACCEPT = 'application/json, text/plain, */*';

export type SdkHttpParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export type SdkHttpHeaders = Record<string, string>;

export interface SdkHttpRequestOptions {
  params?: SdkHttpParams;
  headers?: SdkHttpHeaders;
}

/**
 * A request as it was sent. Exposed on responses and errors as
 * `config`, the same place axios put it, and replayed by the
 * expired-token refresh.
 */
export interface SdkHttpRequestConfig {
  method: string;
  url: string;
  baseURL: string;
  params?: SdkHttpParams;
  /** Merged default and per-request headers. */
  headers: SdkHttpHeaders;
  /** The serialized body (a JSON string for object bodies). */
  data?: BodyInit;
  /**
   * Set on the replay that follows a token refresh, so a replay that
   * also comes back expired gives up instead of looping.
   */
  __sdkConnectTokenRetried?: boolean;
}

/** Stand-in for axios's `error.request` (an XMLHttpRequest there). */
export interface SdkHttpRequestInfo {
  method: string;
  url: string;
}

// biome-ignore lint/suspicious/noExplicitAny: response bodies are untyped JSON, as they were under axios.
export interface SdkHttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: SdkHttpHeaders;
  config: SdkHttpRequestConfig;
  request: SdkHttpRequestInfo;
}

/**
 * Rejection value for every failed request. Carries the fields the SDK
 * and integrators read from axios errors. `isAxiosError` stays `true`
 * so an integrator who checks errors with their own copy of
 * `axios.isAxiosError()` keeps getting the same answer.
 */
export class SdkHttpError extends Error {
  override name = 'SdkHttpError';
  readonly isAxiosError = true;
  code: string;
  status?: number;
  config: SdkHttpRequestConfig;
  request?: SdkHttpRequestInfo;
  response?: SdkHttpResponse;
  /** The underlying fetch failure, for network errors. */
  cause?: unknown;

  constructor(
    message: string,
    code: string,
    config: SdkHttpRequestConfig,
    request?: SdkHttpRequestInfo,
    response?: SdkHttpResponse,
    cause?: unknown
  ) {
    super(message);
    this.code = code;
    this.config = config;
    this.request = request;
    this.response = response;
    this.status = response?.status;
    if (cause !== undefined) this.cause = cause;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      config: this.config
    };
  }
}

export const isSdkHttpError = (value: unknown): value is SdkHttpError =>
  value instanceof SdkHttpError;

// ---------------------------------------------------------------------
// URL building (axios 1.x semantics)
// ---------------------------------------------------------------------

const isAbsoluteURL = (url: string) => /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);

/** axios `combineURLs`: exactly one slash between base and path. */
export const combineURLs = (baseURL: string, relativeURL: string): string =>
  relativeURL
    ? `${baseURL.replace(/\/?\/$/, '')}/${relativeURL.replace(/^\/+/, '')}`
    : baseURL;

/** axios `buildURL`'s value encoder. */
const encodeParam = (val: string) =>
  encodeURIComponent(val)
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '+');

export const buildURL = (
  baseURL: string,
  url: string,
  params?: SdkHttpParams
): string => {
  let full = baseURL && !isAbsoluteURL(url) ? combineURLs(baseURL, url) : url;
  if (!params) return full;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    parts.push(`${encodeParam(key)}=${encodeParam(String(value))}`);
  }
  if (!parts.length) return full;
  const hash = full.indexOf('#');
  if (hash !== -1) full = full.slice(0, hash);
  return `${full}${full.includes('?') ? '&' : '?'}${parts.join('&')}`;
};

// ---------------------------------------------------------------------
// Headers and bodies
// ---------------------------------------------------------------------

/** Set a header, replacing any existing key that differs only in case. */
const setHeader = (headers: SdkHttpHeaders, name: string, value: string) => {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) delete headers[key];
  }
  headers[name] = value;
};

const getHeader = (
  headers: SdkHttpHeaders,
  name: string
): string | undefined => {
  const lower = name.toLowerCase();
  const key = Object.keys(headers).find((k) => k.toLowerCase() === lower);
  return key === undefined ? undefined : headers[key];
};

const hasHeader = (headers: SdkHttpHeaders, name: string) => {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((k) => k.toLowerCase() === lower);
};

const mergeHeaders = (...sources: (SdkHttpHeaders | undefined)[]) => {
  const out: SdkHttpHeaders = {};
  for (const source of sources) {
    if (!source) continue;
    for (const [k, v] of Object.entries(source)) setHeader(out, k, v);
  }
  return out;
};

/**
 * axios's default request transform: plain objects and arrays become
 * JSON with `Content-Type: application/json`; FormData,
 * URLSearchParams, Blob and strings go through as they are and the
 * browser (or the caller) sets their content type.
 */
const serializeBody = (
  data: unknown,
  headers: SdkHttpHeaders
): BodyInit | undefined => {
  if (data === undefined || data === null) return undefined;
  if (
    typeof data === 'string' ||
    (typeof FormData !== 'undefined' && data instanceof FormData) ||
    (typeof URLSearchParams !== 'undefined' &&
      data instanceof URLSearchParams) ||
    (typeof Blob !== 'undefined' && data instanceof Blob) ||
    data instanceof ArrayBuffer
  ) {
    return data as BodyInit;
  }
  if (!hasHeader(headers, 'Content-Type')) {
    setHeader(headers, 'Content-Type', 'application/json');
  }
  return JSON.stringify(data);
};

/**
 * axios's default response transform: try JSON, fall back to the raw
 * text, and never throw. An empty body is `''`.
 */
const parseBody = (text: string): unknown => {
  if (!text) return '';
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const headersToObject = (headers: Headers | undefined): SdkHttpHeaders => {
  const out: SdkHttpHeaders = {};
  headers?.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
};

// ---------------------------------------------------------------------
// The client
// ---------------------------------------------------------------------

export interface SdkHttpConfigureArgs
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

export interface SdkHttpClientOptions {
  /** Injected fetch for tests. Defaults to `globalThis.fetch`, read per request. */
  fetch?: typeof fetch;
  /** Injected page-path reader for tests. Defaults to `window.location.pathname`. */
  getPagePath?: () => string | undefined;
}

const defaultPagePath = () =>
  typeof window !== 'undefined' ? window.location?.pathname : undefined;

const warn = (...args: unknown[]) => {
  if (typeof console !== 'undefined' && console.warn) console.warn(...args);
};

export const createSdkHttpClient = (options: SdkHttpClientOptions = {}) => {
  const getPagePath = options.getPagePath ?? defaultPagePath;

  /**
   * Live configuration. `configure()` replaces it when the SDK
   * initializes. Before that, requests go out with the same two
   * headers the unconfigured axios instance carried, relative to the
   * page, and without the page-path header or the expired-token
   * handling (axios attached those only when the SDK configured it).
   */
  const defaults: { baseURL: string; headers: SdkHttpHeaders } = {
    baseURL: '',
    headers: { 'X-Is-Demo': '1', 'X-SDK-Version': 'N/A' }
  };
  let configured = false;
  let lastConfiguredToken: string | null = null;
  let refreshFn: (() => Promise<string>) | undefined;
  let onExpired: (() => void) | undefined;
  /**
   * Shared in-flight refresh promise. If multiple requests are in
   * flight when the connect token expires, each would otherwise call
   * the refresh fn independently. Stampeding the customer's mint
   * endpoint with N parallel calls leaves N-1 orphaned tokens
   * (server-side Redis keys + JWT signatures) since only one ends up
   * in the default header. The first caller starts a refresh; every
   * later caller awaits the same promise.
   */
  let refreshInFlight: Promise<string | null> | null = null;
  /**
   * One-shot guard for the expiry notification. Without it, N parallel
   * failed requests in the no-refresh-fn (or refresh-fn-rejected)
   * branch would each fire `onConnectAccessTokenExpired` and dispatch
   * the `tpastream-connect-token-expired` event. From the customer's
   * point of view that is one "session expired" event, so it is
   * coalesced to one notification per expiry cycle. Reset on any
   * successful response so a later expiry can notify again.
   */
  let expiredNotificationFired = false;

  const resolveFetch = (): typeof fetch | undefined =>
    options.fetch ??
    (typeof globalThis.fetch === 'function'
      ? globalThis.fetch.bind(globalThis)
      : undefined);

  const dispatch = async (
    config: SdkHttpRequestConfig
  ): Promise<SdkHttpResponse> => {
    const fullURL = buildURL(config.baseURL, config.url, config.params);
    const request: SdkHttpRequestInfo = {
      method: config.method.toUpperCase(),
      url: fullURL
    };
    const fetchFn = resolveFetch();
    if (!fetchFn) {
      throw new SdkHttpError(
        'fetch is not available in this environment',
        'ERR_NOT_SUPPORT',
        config
      );
    }
    let res: Response;
    let text: string;
    try {
      res = await fetchFn(fullURL, {
        method: request.method,
        headers: config.headers,
        body: config.data,
        // axios's withCredentials: false. Cookies go only to the
        // page's own origin; the cross-origin embed sends none.
        credentials: 'same-origin'
      });
      text = await res.text();
    } catch (cause) {
      // fetch rejects only when no HTTP response arrived (DNS, TLS,
      // CORS, offline) or the body stream broke. Same message and
      // code as axios's XHR adapter, and no `response`.
      throw new SdkHttpError(
        'Network Error',
        'ERR_NETWORK',
        config,
        request,
        undefined,
        cause
      );
    }
    const response: SdkHttpResponse = {
      data: parseBody(text),
      status: res.status,
      statusText: res.statusText,
      headers: headersToObject(res.headers),
      config,
      request
    };
    if (res.status >= 200 && res.status < 300) return response;
    throw new SdkHttpError(
      `Request failed with status code ${res.status}`,
      res.status >= 400 && res.status < 500
        ? 'ERR_BAD_REQUEST'
        : 'ERR_BAD_RESPONSE',
      config,
      request,
      response
    );
  };

  const notifyExpired = () => {
    if (expiredNotificationFired) return;
    expiredNotificationFired = true;
    try {
      onExpired?.();
    } catch (cbErr) {
      warn(
        '[stream-connect-sdk] onConnectAccessTokenExpired callback threw:',
        cbErr
      );
    }
    if (
      typeof window !== 'undefined' &&
      window.dispatchEvent &&
      typeof CustomEvent !== 'undefined'
    ) {
      window.dispatchEvent(new CustomEvent(EXPIRED_TOKEN_EVENT));
    }
  };

  const handleError = async (error: unknown): Promise<SdkHttpResponse> => {
    const err = error as SdkHttpError;
    const status = err?.response?.status;
    const errorCode = (err?.response?.data as { error_code?: unknown })
      ?.error_code;
    if (!(status === 422 && errorCode === EXPIRED_TOKEN_ERROR_CODE)) {
      throw error;
    }
    const originalConfig = err.config;
    const alreadyRetried = Boolean(originalConfig?.__sdkConnectTokenRetried);

    const replayWith = (token: string) => {
      const replayHeaders = { ...originalConfig.headers };
      setHeader(replayHeaders, 'X-Connect-Access-Token', token);
      // The replay's own failure propagates as is. A replay that comes
      // back expired again reaches this handler with
      // `__sdkConnectTokenRetried` set, notifies and rejects.
      return send({
        ...originalConfig,
        headers: replayHeaders,
        __sdkConnectTokenRetried: true
      });
    };

    // A slow request sent with an older token can come back expired
    // after another request's refresh has already finished. The client
    // already holds a newer token, so replay once with it instead of
    // calling the integrator's refresh function a second time.
    if (originalConfig && !alreadyRetried) {
      const sentToken = getHeader(
        originalConfig.headers,
        'X-Connect-Access-Token'
      );
      const currentToken = getHeader(
        defaults.headers,
        'X-Connect-Access-Token'
      );
      if (currentToken && currentToken !== sentToken) {
        return replayWith(currentToken);
      }
    }

    // Try a one-shot transparent refresh if the integrator wired
    // `connectAccessTokenRefreshFn`. Skip if the failing request was
    // itself a replay (the new token also got rejected: give up rather
    // than loop).
    if (refreshFn && originalConfig && !alreadyRetried) {
      let fresh: string | null = null;
      try {
        // Stampede guard: every parallel-failed request shares one
        // refresh attempt. Cleared in the `finally` so a later expiry
        // can start a fresh refresh.
        if (!refreshInFlight) {
          const fn = refreshFn;
          refreshInFlight = (async () => {
            try {
              return (await fn()) || null;
            } finally {
              refreshInFlight = null;
            }
          })();
        }
        fresh = await refreshInFlight;
      } catch (refreshErr) {
        warn(
          '[stream-connect-sdk] connectAccessTokenRefreshFn rejected; ' +
            'falling back to onConnectAccessTokenExpired:',
          refreshErr
        );
      }
      if (fresh) {
        // Later requests carry the new token, and so does the replay.
        setHeader(defaults.headers, 'X-Connect-Access-Token', fresh);
        return replayWith(fresh);
      }
    }

    // No refresh wired, refresh failed or returned nothing, or this was
    // already the replay. Notify the host page once per expiry cycle and
    // reject so the existing error UI fires.
    notifyExpired();
    throw error;
  };

  const send = async (
    input: SdkHttpRequestConfig
  ): Promise<SdkHttpResponse> => {
    const config: SdkHttpRequestConfig = {
      ...input,
      headers: mergeHeaders(
        { Accept: DEFAULT_ACCEPT },
        defaults.headers,
        input.headers
      )
    };
    if (!configured) return dispatch(config);

    // Where the widget is mounted (TPA-6661): cross-origin requests
    // carry only the Origin header, so the path of the hosting page has
    // to be reported explicitly. The backend stamps it per (SDK token,
    // tenant) to route fix-credentials emails back to the portal page
    // that embeds the widget. Read per request, not once at configure
    // time: a single-page host that routes the member to another view
    // must report the path the widget is on now.
    const pagePath = getPagePath();
    if (pagePath) setHeader(config.headers, 'X-SDK-Page-Path', pagePath);

    let response: SdkHttpResponse;
    try {
      response = await dispatch(config);
    } catch (error) {
      return handleError(error);
    }
    const refreshed = response.headers['x-set-connect-access-token'];
    if (refreshed) {
      setHeader(defaults.headers, 'X-Connect-Access-Token', refreshed);
    }
    // Any successful response means we're no longer in an expired-token
    // state, so a later expiry can notify again.
    expiredNotificationFired = false;
    return response;
  };

  const request = (
    method: string,
    url: string,
    data: unknown,
    opts: SdkHttpRequestOptions = {}
  ) => {
    const headers: SdkHttpHeaders = { ...opts.headers };
    const body =
      method === 'GET' || method === 'DELETE'
        ? undefined
        : serializeBody(data, headers);
    return send({
      // Lower-case on `config`, as axios had it; upper-cased on the wire.
      method: method.toLowerCase(),
      url,
      baseURL: defaults.baseURL,
      params: opts.params,
      headers,
      data: body
    });
  };

  return {
    /** Read-only view of the live base URL and default headers. */
    get defaults(): { baseURL: string; headers: Readonly<SdkHttpHeaders> } {
      return { baseURL: defaults.baseURL, headers: { ...defaults.headers } };
    },
    get: (url: string, opts?: SdkHttpRequestOptions) =>
      request('GET', url, undefined, opts),
    delete: (url: string, opts?: SdkHttpRequestOptions) =>
      request('DELETE', url, undefined, opts),
    post: (url: string, data?: unknown, opts?: SdkHttpRequestOptions) =>
      request('POST', url, data, opts),
    put: (url: string, data?: unknown, opts?: SdkHttpRequestOptions) =>
      request('PUT', url, data, opts),

    /**
     * Configure the client with the integrator's tokens and base URL.
     * Called once on mount by the SDK component.
     *
     * **Caveat: multi-instance host pages are not isolated.** If one
     * page mounts two `StreamConnect()` instances with different
     * tokens, the second init() reconfigures this shared client and the
     * first instance's later requests inherit the new headers. A
     * console warning flags the case. In practice no integration ships
     * two SDKs side by side with different tokens.
     */
    configure({
      apiToken,
      connectAccessToken,
      connectAccessTokenRefreshFn,
      onConnectAccessTokenExpired,
      version,
      isDemo,
      sdkStateId,
      tenant,
      _overrideBaseUrl
    }: SdkHttpConfigureArgs) {
      refreshFn = connectAccessTokenRefreshFn;
      onExpired = onConnectAccessTokenExpired;
      const nextToken = apiToken || '';
      if (lastConfiguredToken !== null && lastConfiguredToken !== nextToken) {
        warn(
          '[stream-connect-sdk] the HTTP client is being reconfigured with ' +
            'a different apiToken than the previous call. The client is a ' +
            'module-level singleton; the previous SDK instance (if still ' +
            'mounted) will start using these new headers on its next ' +
            'request. Two concurrent SDK instances on the same page with ' +
            'different tokens are not currently isolated.'
        );
      }
      lastConfiguredToken = nextToken;
      defaults.baseURL =
        _overrideBaseUrl || 'https://app.tpastream.com/sdk-api';
      defaults.headers = {
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
      };
      configured = true;
    }
  };
};

export type SdkHttpClient = ReturnType<typeof createSdkHttpClient>;

/** The SDK's shared client. */
export const sdkHttp: SdkHttpClient = createSdkHttpClient();

/** Configure the shared client; see `SdkHttpClient.configure`. */
export const sdkHttpMaker = (args: SdkHttpConfigureArgs) =>
  sdkHttp.configure(args);
