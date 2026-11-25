import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import {
  EXPIRED_TOKEN_EVENT,
  type SdkHttpConfigureArgs,
  SdkHttpError,
  buildURL,
  createSdkHttpClient
} from './http.ts';

// Run with `npm run test:unit` (node --test). Node strips the types.
//
// Every test drives a fresh client with an injected fake fetch, so no
// test touches the network or the shared `sdkHttp` singleton.

interface Call {
  url: string;
  init: RequestInit;
  headers: Record<string, string>;
}

type Reply =
  | Response
  | Error
  | (() => Response | Error | Promise<Response | Error>);

const json = (status: number, body: unknown, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  });

const expired = () =>
  json(422, { error_code: 'expired_connect_token', message: 'expired' });

/** A fake fetch that answers from a queue and records every call. */
const fakeFetch = (...replies: Reply[]) => {
  const calls: Call[] = [];
  const fn = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      init,
      headers: { ...(init.headers as Record<string, string>) }
    });
    const next = replies.shift();
    if (!next) throw new Error(`unexpected request ${String(input)}`);
    const reply = await (typeof next === 'function' ? next() : next);
    if (reply instanceof Error) throw reply;
    return reply;
  };
  return { fetch: fn as typeof fetch, calls };
};

const baseArgs: SdkHttpConfigureArgs = {
  apiToken: 'api-tok',
  connectAccessToken: 'cat-1',
  version: '0.8.7',
  isDemo: false,
  sdkStateId: 'state-1',
  tenant: { vendor: 'VEND', systemKey: 'TKEY' },
  _overrideBaseUrl: 'https://api.example/sdk-api'
};

const makeClient = (
  replies: Reply[],
  args: Partial<SdkHttpConfigureArgs> = {},
  pagePath: string | undefined = '/portal/benefits'
) => {
  const fake = fakeFetch(...replies);
  const client = createSdkHttpClient({
    fetch: fake.fetch,
    getPagePath: () => pagePath
  });
  client.configure({ ...baseArgs, ...args });
  return { client, calls: fake.calls };
};

// Silence and capture the client's console warnings.
let warnings: unknown[][] = [];
const originalWarn = console.warn;
beforeEach(() => {
  warnings = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
});
afterEach(() => {
  console.warn = originalWarn;
});

// --- 1. Default headers and the per-request page path ------------------

test('sends every default header with its exact name and value', async () => {
  const { client, calls } = makeClient([json(200, { ok: 1 })]);
  await client.get('tpastream_sdk');
  assert.deepEqual(calls[0]?.headers, {
    Accept: 'application/json, text/plain, */*',
    'X-TPAStream-Token': 'api-tok',
    'X-SDK-Version': '0.8.7',
    'X-SDK-State-Id': 'state-1',
    'X-Is-Demo': '0',
    'X-Connect-Access-Token': 'cat-1',
    'X-Tenant-Label': 'VEND',
    'X-Tenant-Key': 'TKEY',
    'X-SDK-Page-Path': '/portal/benefits'
  });
});

test('omits the optional headers when their inputs are absent', async () => {
  const { client, calls } = makeClient([json(200, {})], {
    apiToken: undefined,
    connectAccessToken: undefined,
    sdkStateId: undefined,
    tenant: undefined,
    isDemo: true
  });
  await client.get('x');
  assert.deepEqual(calls[0]?.headers, {
    Accept: 'application/json, text/plain, */*',
    'X-TPAStream-Token': '',
    'X-SDK-Version': '0.8.7',
    'X-Is-Demo': '1',
    'X-SDK-Page-Path': '/portal/benefits'
  });
});

test('reads the page path on every request, and skips it when unknown', async () => {
  let path: string | undefined = '/first';
  const fake = fakeFetch(json(200, {}), json(200, {}), json(200, {}));
  const client = createSdkHttpClient({
    fetch: fake.fetch,
    getPagePath: () => path
  });
  client.configure(baseArgs);
  await client.get('a');
  path = '/second';
  await client.get('a');
  path = undefined;
  await client.get('a');
  assert.equal(fake.calls[0]?.headers['X-SDK-Page-Path'], '/first');
  assert.equal(fake.calls[1]?.headers['X-SDK-Page-Path'], '/second');
  assert.equal('X-SDK-Page-Path' in (fake.calls[2]?.headers ?? {}), false);
});

test('the default page-path reader tolerates a missing window', async () => {
  assert.equal(typeof (globalThis as { window?: unknown }).window, 'undefined');
  const fake = fakeFetch(json(200, {}));
  const client = createSdkHttpClient({ fetch: fake.fetch });
  client.configure(baseArgs);
  await client.get('a');
  assert.equal('X-SDK-Page-Path' in (fake.calls[0]?.headers ?? {}), false);
});

test('before configure, requests carry only the placeholder headers', async () => {
  const fake = fakeFetch(json(200, {}));
  const client = createSdkHttpClient({
    fetch: fake.fetch,
    getPagePath: () => '/p'
  });
  await client.get('tpastream_sdk');
  assert.equal(fake.calls[0]?.url, 'tpastream_sdk');
  assert.deepEqual(fake.calls[0]?.headers, {
    Accept: 'application/json, text/plain, */*',
    'X-Is-Demo': '1',
    'X-SDK-Version': 'N/A'
  });
});

test('warns when reconfigured with a different apiToken', () => {
  const { client } = makeClient([]);
  client.configure(baseArgs);
  assert.equal(warnings.length, 0);
  client.configure({ ...baseArgs, apiToken: 'other' });
  assert.equal(warnings.length, 1);
});

// --- 2. Base URL joining and query strings ------------------------------

test('joins the base URL and path with exactly one slash', () => {
  for (const base of ['https://h/sdk-api', 'https://h/sdk-api/']) {
    for (const path of ['x/1', '/x/1']) {
      assert.equal(buildURL(base, path), 'https://h/sdk-api/x/1');
    }
  }
  // axios treats a protocol-relative path as absolute; so does this.
  assert.equal(buildURL('https://h/sdk-api', '//o/x'), '//o/x');
  assert.equal(buildURL('', 'tpastream_sdk'), 'tpastream_sdk');
  assert.equal(buildURL('https://h/sdk-api', 'https://o/abs'), 'https://o/abs');
});

test('uses the production base URL unless _overrideBaseUrl is set', async () => {
  const { client, calls } = makeClient([json(200, {})], {
    _overrideBaseUrl: undefined
  });
  await client.get('payer/1/2');
  assert.equal(calls[0]?.url, 'https://app.tpastream.com/sdk-api/payer/1/2');
  assert.equal(client.defaults.baseURL, 'https://app.tpastream.com/sdk-api');

  const other = makeClient([json(200, {})], {
    _overrideBaseUrl: 'http://localhost:4000/sdk-api/'
  });
  await other.client.get('/payer/1/2');
  assert.equal(other.calls[0]?.url, 'http://localhost:4000/sdk-api/payer/1/2');
});

test('encodes params byte-for-byte like axios 1.20 and drops null and undefined', async () => {
  // Expected strings captured from axios 1.20.0's buildURL.
  assert.equal(
    buildURL('https://h/sdk-api', '/lead', {
      email: 'a+b@x.com',
      referer: undefined,
      n: null,
      z: 1
    }),
    'https://h/sdk-api/lead?email=a%2Bb%40x.com&z=1'
  );
  assert.equal(
    buildURL('https://h/sdk-api', 'x', { email: "é & = ?#[]@!$'()*,;: " }),
    "https://h/sdk-api/x?email=%C3%A9+%26+%3D+%3F%23%5B%5D%40!$'()*,%3B:+"
  );
  assert.equal(buildURL('https://h', 'x?a=1', { b: 2 }), 'https://h/x?a=1&b=2');
  assert.equal(buildURL('https://h', 'x#frag', { b: 2 }), 'https://h/x?b=2');
  assert.equal(buildURL('https://h', 'x', { gone: undefined }), 'https://h/x');

  const { client, calls } = makeClient([json(200, {})]);
  await client.get('payer/3/4', {
    params: { email: 'm@example.com', referer: undefined }
  });
  assert.equal(
    calls[0]?.url,
    'https://api.example/sdk-api/payer/3/4?email=m%40example.com'
  );
});

// --- 3. Request bodies --------------------------------------------------

test('JSON-encodes object bodies with Content-Type application/json', async () => {
  const { client, calls } = makeClient([json(200, {}), json(200, {})]);
  await client.post('policy_holder_sdk/policy_holder', { a: 1, b: 'x' });
  await client.put('validate-credentials/1/t', { method: 'sms' });
  for (const [i, method] of ['POST', 'PUT'].entries()) {
    assert.equal(calls[i]?.init.method, method);
    assert.equal(calls[i]?.headers['Content-Type'], 'application/json');
  }
  assert.equal(calls[0]?.init.body, '{"a":1,"b":"x"}');
  assert.equal(calls[1]?.init.body, '{"method":"sms"}');
});

test('sends no body and no Content-Type on GET or DELETE', async () => {
  const { client, calls } = makeClient([json(200, {}), json(200, {})]);
  await client.get('interop', { params: { email: 'e' } });
  await client.delete('thing/1');
  for (const call of calls) {
    assert.equal(call.init.body, undefined);
    assert.equal('Content-Type' in call.headers, false);
  }
  assert.equal(calls[0]?.init.method, 'GET');
  assert.equal(calls[1]?.init.method, 'DELETE');
});

test('passes FormData and URLSearchParams through for the browser to encode', async () => {
  const { client, calls } = makeClient([json(200, {}), json(200, {})]);
  const form = new FormData();
  form.set('k', 'v');
  const search = new URLSearchParams({ k: 'v' });
  await client.post('f', form);
  await client.post('u', search);
  assert.equal(calls[0]?.init.body, form);
  assert.equal(calls[1]?.init.body, search);
  assert.equal('Content-Type' in (calls[0]?.headers ?? {}), false);
});

// --- 4. Response parsing ------------------------------------------------

test('parses JSON and exposes status, statusText and lower-cased headers', async () => {
  const { client } = makeClient([
    json(200, { data: { user: { id: 7 } } }, { 'X-Custom': 'yes' })
  ]);
  const res = await client.get('tpastream_sdk');
  assert.deepEqual(res.data, { data: { user: { id: 7 } } });
  assert.equal(res.status, 200);
  assert.equal(res.headers['x-custom'], 'yes');
  assert.equal(res.config.method, 'get');
});

test('an empty 204 or empty 200 resolves with data equal to an empty string', async () => {
  const { client } = makeClient([
    new Response(null, { status: 204 }),
    new Response('', { status: 200 })
  ]);
  assert.equal((await client.put('x', {})).data, '');
  assert.equal((await client.get('x')).data, '');
});

test('JSON is parsed even without a JSON content type, as axios did', async () => {
  const { client } = makeClient([new Response('{"a":1}', { status: 200 })]);
  assert.deepEqual((await client.get('x')).data, { a: 1 });
});

test('an HTML 502 from a proxy rejects with a usable error, not a parse error', async () => {
  const html = '<html><body>502 Bad Gateway</body></html>';
  const { client } = makeClient([
    new Response(html, {
      status: 502,
      headers: { 'content-type': 'text/html' }
    })
  ]);
  const err = await client.get('x').catch((e) => e);
  assert.ok(err instanceof SdkHttpError);
  assert.equal(err.message, 'Request failed with status code 502');
  assert.equal(err.code, 'ERR_BAD_RESPONSE');
  assert.equal(err.response?.status, 502);
  assert.equal(err.response?.data, html);
});

// --- 5. Non-2xx statuses and network failures ---------------------------

test('a non-2xx status rejects with the axios-compatible error fields', async () => {
  const { client } = makeClient([json(400, { message: 'Bad creds' })]);
  const err = await client
    .post('policy_holder_sdk/policy_holder', {})
    .catch((e) => e);
  assert.ok(err instanceof SdkHttpError);
  assert.equal(err.name, 'SdkHttpError');
  assert.equal(err.isAxiosError, true);
  assert.equal(err.message, 'Request failed with status code 400');
  assert.equal(err.code, 'ERR_BAD_REQUEST');
  assert.equal(err.status, 400);
  assert.equal(err.response?.status, 400);
  assert.deepEqual(err.response?.data, { message: 'Bad creds' });
  // axios kept the method lower-case on config; the wire has it upper-case.
  assert.equal(err.config.method, 'post');
  assert.equal(err.config.url, 'policy_holder_sdk/policy_holder');
  assert.equal(err.config.data, '{}');
  assert.deepEqual(err.request, {
    method: 'POST',
    url: 'https://api.example/sdk-api/policy_holder_sdk/policy_holder'
  });
  assert.equal(JSON.parse(JSON.stringify(err)).code, 'ERR_BAD_REQUEST');
});

test('2xx statuses other than 200 resolve', async () => {
  const { client } = makeClient([json(201, { id: 1 })]);
  assert.equal((await client.post('x', {})).status, 201);
});

test('a network failure rejects with a request and NO response', async () => {
  const cause = new TypeError('Failed to fetch');
  const { client } = makeClient([cause]);
  const err = await client.get('interop').catch((e) => e);
  assert.ok(err instanceof SdkHttpError);
  assert.equal(err.message, 'Network Error');
  assert.equal(err.code, 'ERR_NETWORK');
  assert.equal(err.response, undefined);
  assert.equal(err.status, undefined);
  assert.ok(err.request);
  assert.equal(err.cause, cause);
});

test('a body stream that breaks mid-read is a network failure too', async () => {
  const broken = new Response(
    new ReadableStream({
      start(controller) {
        controller.error(new TypeError('network error'));
      }
    }),
    { status: 200 }
  );
  const { client } = makeClient([broken]);
  const err = await client.get('x').catch((e) => e);
  assert.equal(err.code, 'ERR_NETWORK');
  assert.equal(err.response, undefined);
});

// --- 6. Credentials and 7. timeouts -------------------------------------

test("sends cookies only same-origin (axios's withCredentials: false) and sets no timeout", async () => {
  const { client, calls } = makeClient([json(200, {})]);
  await client.get('x');
  assert.equal(calls[0]?.init.credentials, 'same-origin');
  assert.equal(calls[0]?.init.signal, undefined);
});

// --- 8. The expired-token flow ------------------------------------------

test('a refreshed token in X-Set-Connect-Access-Token is used from the next request on', async () => {
  const { client, calls } = makeClient([
    json(200, {}, { 'X-Set-Connect-Access-Token': 'cat-2' }),
    json(200, {})
  ]);
  await client.get('a');
  await client.get('b');
  assert.equal(calls[0]?.headers['X-Connect-Access-Token'], 'cat-1');
  assert.equal(calls[1]?.headers['X-Connect-Access-Token'], 'cat-2');
});

test('refresh succeeds and the replay succeeds', async () => {
  let refreshes = 0;
  const { client, calls } = makeClient(
    [expired(), json(200, { data: 'ok' }), json(200, {})],
    {
      connectAccessTokenRefreshFn: async () => {
        refreshes += 1;
        return 'cat-fresh';
      }
    }
  );
  const res = await client.post('interop', { user_email: 'e' });
  assert.deepEqual(res.data, { data: 'ok' });
  assert.equal(refreshes, 1);
  assert.equal(calls.length, 2);
  // The replay is the same request with the fresh token.
  assert.equal(calls[1]?.url, calls[0]?.url);
  assert.equal(calls[1]?.init.method, 'POST');
  assert.equal(calls[1]?.init.body, '{"user_email":"e"}');
  assert.equal(calls[1]?.headers['Content-Type'], 'application/json');
  assert.equal(calls[1]?.headers['X-Connect-Access-Token'], 'cat-fresh');
  assert.equal(calls[1]?.headers['X-SDK-Page-Path'], '/portal/benefits');
  // Later requests carry the fresh token as well.
  await client.get('next');
  assert.equal(calls[2]?.headers['X-Connect-Access-Token'], 'cat-fresh');
});

test('refresh succeeds but the replay is expired again: no loop, one notification', async () => {
  let refreshes = 0;
  let notified = 0;
  const { client, calls } = makeClient([expired(), expired()], {
    connectAccessTokenRefreshFn: async () => {
      refreshes += 1;
      return 'cat-fresh';
    },
    onConnectAccessTokenExpired: () => {
      notified += 1;
    }
  });
  const err = await client.get('interop').catch((e) => e);
  assert.ok(err instanceof SdkHttpError);
  assert.equal(err.response?.status, 422);
  assert.equal(err.config.__sdkConnectTokenRetried, true);
  assert.equal(refreshes, 1);
  assert.equal(calls.length, 2);
  assert.equal(notified, 1);
});

test('a replay that fails for another reason rejects with that error and does not notify', async () => {
  let notified = 0;
  const { client } = makeClient([expired(), json(500, { message: 'boom' })], {
    connectAccessTokenRefreshFn: async () => 'cat-fresh',
    onConnectAccessTokenExpired: () => {
      notified += 1;
    }
  });
  const err = await client.get('x').catch((e) => e);
  assert.equal(err.response?.status, 500);
  assert.equal(notified, 0);
});

test('a refresh function that throws falls back to one notification and rejects with the 422', async () => {
  let notified = 0;
  const { client, calls } = makeClient([expired()], {
    connectAccessTokenRefreshFn: async () => {
      throw new Error('mint endpoint down');
    },
    onConnectAccessTokenExpired: () => {
      notified += 1;
    }
  });
  const err = await client.get('x').catch((e) => e);
  assert.equal(err.response?.status, 422);
  assert.equal(err.response?.data.error_code, 'expired_connect_token');
  assert.equal(calls.length, 1);
  assert.equal(notified, 1);
  assert.equal(warnings.length, 1);
});

test('a refresh function that returns an empty string notifies instead of replaying', async () => {
  let notified = 0;
  const { client, calls } = makeClient([expired()], {
    connectAccessTokenRefreshFn: async () => '',
    onConnectAccessTokenExpired: () => {
      notified += 1;
    }
  });
  await client.get('x').catch(() => {});
  assert.equal(calls.length, 1);
  assert.equal(notified, 1);
});

test('with no refresh function, the notification fires once until a success resets it', async () => {
  let notified = 0;
  const { client } = makeClient(
    [expired(), expired(), json(200, {}), expired()],
    {
      onConnectAccessTokenExpired: () => {
        notified += 1;
      }
    }
  );
  await client.get('a').catch(() => {});
  await client.get('b').catch(() => {});
  assert.equal(notified, 1);
  await client.get('c');
  await client.get('d').catch(() => {});
  assert.equal(notified, 2);
});

test('parallel expired requests share one refresh call', async () => {
  let refreshes = 0;
  let release: (v: string) => void = () => {};
  const pending = new Promise<string>((resolve) => {
    release = resolve;
  });
  const { client, calls } = makeClient(
    [expired(), expired(), json(200, { n: 1 }), json(200, { n: 2 })],
    {
      connectAccessTokenRefreshFn: () => {
        refreshes += 1;
        return pending;
      }
    }
  );
  const both = Promise.all([client.get('a'), client.get('b')]);
  // Let both 422s land before the refresh resolves.
  await new Promise((r) => setTimeout(r, 10));
  release('cat-fresh');
  const results = await both;
  assert.equal(refreshes, 1);
  assert.equal(calls.length, 4);
  assert.deepEqual(
    results.map((r) => r.status),
    [200, 200]
  );
});

/**
 * A slow request answers only when the test releases it, so its 422
 * can land after another request's refresh has finished.
 */
const slowReply = () => {
  let release: (r: Response) => void = () => {};
  const promise = new Promise<Response>((resolve) => {
    release = resolve;
  });
  return { reply: () => promise, release };
};

test('a late 422 for a request sent with an old token replays with the current token, without a second refresh', async () => {
  let refreshes = 0;
  const slow = slowReply();
  const { client, calls } = makeClient(
    // a (slow), b, b's replay, a's replay
    [slow.reply, expired(), json(200, { b: 1 }), json(200, { a: 1 })],
    {
      connectAccessTokenRefreshFn: async () => {
        refreshes += 1;
        return 'cat-fresh';
      }
    }
  );
  const a = client.get('a');
  const b = await client.get('b');
  assert.deepEqual(b.data, { b: 1 });
  assert.equal(refreshes, 1);
  // Now the slow request, sent with cat-1, comes back expired.
  slow.release(expired());
  const res = await a;
  assert.deepEqual(res.data, { a: 1 });
  assert.equal(refreshes, 1);
  assert.equal(calls.length, 4);
  assert.equal(calls[0]?.headers['X-Connect-Access-Token'], 'cat-1');
  assert.equal(calls[3]?.url, calls[0]?.url);
  assert.equal(calls[3]?.headers['X-Connect-Access-Token'], 'cat-fresh');
});

test('a late-422 replay that is expired again is not replayed and notifies once', async () => {
  let refreshes = 0;
  let notified = 0;
  const slow = slowReply();
  const { client, calls } = makeClient(
    [slow.reply, expired(), json(200, {}), expired()],
    {
      connectAccessTokenRefreshFn: async () => {
        refreshes += 1;
        return 'cat-fresh';
      },
      onConnectAccessTokenExpired: () => {
        notified += 1;
      }
    }
  );
  const a = client.get('a').catch((e) => e);
  await client.get('b');
  slow.release(expired());
  const err = await a;
  assert.ok(err instanceof SdkHttpError);
  assert.equal(err.response?.status, 422);
  assert.equal(err.config.__sdkConnectTokenRetried, true);
  assert.equal(calls.length, 4);
  assert.equal(refreshes, 1);
  assert.equal(notified, 1);
});

test('only a 422 with error_code expired_connect_token triggers the flow', async () => {
  let refreshes = 0;
  let notified = 0;
  const { client } = makeClient(
    [
      json(422, { error_code: 'something_else' }),
      json(401, { error_code: 'expired_connect_token' })
    ],
    {
      connectAccessTokenRefreshFn: async () => {
        refreshes += 1;
        return 'x';
      },
      onConnectAccessTokenExpired: () => {
        notified += 1;
      }
    }
  );
  await client.get('a').catch(() => {});
  await client.get('b').catch(() => {});
  assert.equal(refreshes, 0);
  assert.equal(notified, 0);
});

test('a throwing notification callback is caught and the window event still fires', async () => {
  const target = new EventTarget();
  const g = globalThis as { window?: unknown };
  g.window = target;
  let events = 0;
  target.addEventListener(EXPIRED_TOKEN_EVENT, () => {
    events += 1;
  });
  try {
    const { client } = makeClient([expired()], {
      onConnectAccessTokenExpired: () => {
        throw new Error('host bug');
      }
    });
    const err = await client.get('x').catch((e) => e);
    assert.equal(err.response?.status, 422);
    assert.equal(events, 1);
    assert.equal(warnings.length, 1);
  } finally {
    Reflect.deleteProperty(g, 'window');
  }
});

// --- 9. Import with no window and no fetch ------------------------------

// A fresh copy of the module (the query string defeats the import
// cache), so its top level runs again under the test's globals.
const freshImport = (tag: string): Promise<typeof import('./http.ts')> => {
  const specifier = `./http.ts?${tag}`;
  return import(specifier);
};

test('importing with no window and no fetch does not throw; a request rejects cleanly', async () => {
  const g = globalThis as { fetch?: unknown; window?: unknown };
  const savedFetch = g.fetch;
  g.fetch = undefined;
  try {
    assert.equal(typeof g.window, 'undefined');
    const mod = await freshImport('no-fetch');
    const client = mod.createSdkHttpClient();
    client.configure(baseArgs);
    const err = await client.get('x').catch((e: unknown) => e);
    assert.ok(err instanceof mod.SdkHttpError);
    assert.equal((err as SdkHttpError).response, undefined);
  } finally {
    g.fetch = savedFetch;
  }
});

test('the shared client reads globalThis.fetch at call time', async () => {
  const g = globalThis as { fetch?: unknown };
  const savedFetch = g.fetch;
  const fake = fakeFetch(json(200, { late: true }));
  try {
    const mod = await freshImport('late-fetch');
    g.fetch = fake.fetch;
    const res = await mod.sdkHttp.get('x');
    assert.deepEqual(res.data, { late: true });
  } finally {
    g.fetch = savedFetch;
  }
});
