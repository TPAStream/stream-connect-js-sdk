// Drive the locally-built sdk.js through demo mode in headless
// Chromium and write PNGs to the configured output root. The script
// owns its own throwaway HTTP server so the SDK can load via
// http:// (avoids file:// CORS issues with backend XHR).
//
// Usage:
//   npm run build           # produces ./sdk.js
//   node scripts/screenshots/capture.mjs
//   node scripts/screenshots/capture.mjs --out=/some/dir choose-payer
//
// --out defaults to $SCREENSHOT_OUT or /tmp/sdk-shots. Push to S3
// from there with scripts/screenshots/upload.mjs.

import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Local stream webapp that hosts /sdk-test (dev-only). We pull a
// freshly-minted sdkToken + connectAccessToken + fixture from there
// for any shot that wants `isDemo: false`. Override via env.
const STREAM_WEBAPP = process.env.STREAM_WEBAPP || 'http://localhost:4000';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const SDK_BUNDLE = path.join(ROOT, 'sdk.js');

const argv = process.argv.slice(2);
const OUT_FLAG = argv.find((a) => a.startsWith('--out='));
const OUT_ROOT = path.resolve(
  ROOT,
  OUT_FLAG
    ? OUT_FLAG.split('=')[1]
    : process.env.SCREENSHOT_OUT || '/tmp/sdk-shots'
);
const onlyIds = new Set(argv.filter((a) => !a.startsWith('--')));

// Each shot drives one DOM state. The `out` paths land under
// OUT_ROOT, keeping the SDK's docs/ subdirectory naming so the
// mapping from doc reference to PNG is obvious.
//
// `clip` controls cropping:
//   { kind: 'element', selector: '.sdk-frame' }  → tight crop of one element
//   { kind: 'viewport' }                         → full viewport (for modals)
const FRAME = { kind: 'element', selector: '.sdk-frame' };
// Modal shots need a viewport snug enough that the centered overlay
// doesn't drown in whitespace. headlessui portals its dialog to
// document.body, so clipping to .sdk-frame would miss it.
const MODAL_VIEWPORT = { width: 720, height: 600 };

const SHOTS = [
  {
    id: 'demo-init-page',
    viewport: { width: 720, height: 720 },
    out: 'quickstart-screenshots/demo-init-page.png',
    init: { isDemo: true },
    drive: (page) => page.waitForSelector('#choose-payer'),
    clip: FRAME
  },
  {
    id: 'choose-payer',
    viewport: { width: 720, height: 720 },
    out: 'flow-screenshots/choose-payer.png',
    init: { isDemo: true },
    drive: (page) => page.waitForSelector('#payer-images'),
    clip: FRAME
  },
  {
    // Visually distinct from `choose-payer` by focusing + opening
    // the Combobox listbox. The `dropDown: true` init flag is a
    // no-op in demo mode (the combobox always renders) — the
    // value is in showing the open-listbox state.
    id: 'choose-payer-dropdown',
    viewport: { width: 720, height: 720 },
    out: 'flow-screenshots/choose-payer-dropdown.png',
    init: { isDemo: true, dropDown: true },
    drive: async (page) => {
      await page.waitForSelector('#choose-payer');
      await page.getByPlaceholder('Search for your carrier').click();
      await page.waitForSelector('[role="option"]');
      await page.waitForTimeout(200);
    },
    clip: FRAME
  },
  {
    id: 'enter-credentials',
    viewport: { width: 720, height: 900 },
    out: 'flow-screenshots/enter-credentials.png',
    init: { isDemo: true },
    drive: async (page) => {
      await page.waitForSelector('#payer-images');
      await page
        .locator('#payer-images')
        .locator('img, button')
        .first()
        .click();
      await page.waitForSelector('#easy-enroll-form-page');
    },
    clip: FRAME
  },
  {
    id: 'pop-up',
    viewport: MODAL_VIEWPORT,
    out: 'flow-screenshots/pop-up.png',
    init: { isDemo: true },
    drive: async (page) => {
      await page
        .locator('#payer-images')
        .locator('img, button')
        .first()
        .click();
      await page.waitForSelector('#easy-enroll-form-page');
      // PayerInfo.tsx: <IconButton aria-label="Help getting started">
      await page.getByLabel('Help getting started').click();
      await page.waitForTimeout(300);
    },
    clip: { kind: 'viewport' }
  },
  {
    id: 'terms-of-service',
    viewport: { width: 720, height: 700 },
    out: 'flow-screenshots/terms-of-service.png',
    init: { isDemo: true },
    // The demo tenant returns empty terms_of_use, so the modal
    // stays on the spinner. Mock /sdk-api/terms_of_service with a
    // canned HTML body so the dialog renders realistic content.
    routes: [
      [
        '**/sdk-api/terms_of_service*',
        {
          status: 200,
          contentType: 'application/json',
          // The SDK reads response.data.data.html_string (see
          // assets/sdk/services/requests.ts::getTerms).
          body: JSON.stringify({
            data: {
              html_string: [
                '<p>By connecting your insurance carrier, you authorize',
                'TPA Stream to access your claims and benefits data on',
                'your behalf for the purpose of importing it into your',
                "benefits administrator's system.</p>",
                '<p>You may revoke this authorization at any time by',
                'disconnecting the carrier from your account.</p>',
                '<p>For full terms, including data retention and',
                "security practices, see the tenant's published",
                'privacy policy.</p>'
              ].join(' ')
            }
          })
        }
      ]
    ],
    drive: async (page) => {
      await page
        .locator('#payer-images')
        .locator('img, button')
        .first()
        .click();
      await page.waitForSelector('#easy-enroll-form-page');
      await page.getByRole('button', { name: 'View Terms of Use' }).click();
      await page.waitForSelector('.tpa-prose');
      await page.waitForTimeout(300);
    },
    clip: { kind: 'viewport' }
  },
  {
    id: 'error-init-page',
    viewport: { width: 720, height: 320 },
    out: 'quickstart-screenshots/error-init-page.png',
    realToken: true,
    // Strip required user fields → backend returns 422; the SDK
    // surfaces the init error state in lieu of the wizard.
    init: (t) =>
      realInit(t, { user: { firstName: '', lastName: '', email: '' } }),
    drive: async (page) => {
      // Step-config-error fallback renders a paragraph beginning
      // "We had trouble initializing the SDK." — wait on text.
      await page
        .getByText(/trouble initializing|missing required|configuration/i)
        .first()
        .waitFor({ state: 'visible' });
    },
    clip: FRAME
  },
  {
    id: 'select-enroll-widget',
    viewport: { width: 720, height: 720 },
    out: 'fix-credentials/select-enroll-widget.png',
    realToken: true,
    init: (t) => realInit(t, { fixCredentials: true }),
    drive: async (page) => {
      // Fix-credentials mode renders the select-enroll-process step
      // when the user has any policy_holders. The seed fixture has
      // ~10 PHs, so this should populate.
      await page.waitForSelector(
        '#choose-payer, #select-enroll-process, .tpa-sdk-root',
        {
          timeout: 15000
        }
      );
      await page.waitForTimeout(500);
    },
    clip: FRAME
  }
  // employer-key-page + realtime-validation still need bespoke setup
  // (custom employer with missing-config, or a real credentials
  // submit + SSE). Tracked as PR follow-ups.
];

async function startServer({ port = 4178 } = {}) {
  const sdkSrc = await fs.readFile(SDK_BUNDLE);
  const upstream = new URL(STREAM_WEBAPP);
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/sdk.js')) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      return res.end(sdkSrc);
    }
    // Proxy /sdk-api/* through to the local stream webapp so the
    // browser stays same-origin (avoids CORS preflight on tokenized
    // requests) and the SDK can use `_overrideBaseUrl: '/sdk-api'`.
    if (req.url.startsWith('/sdk-api/')) {
      const proxyReq = (upstream.protocol === 'https:' ? https : http).request(
        {
          hostname: upstream.hostname,
          port: upstream.port || (upstream.protocol === 'https:' ? 443 : 80),
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: upstream.host }
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );
      proxyReq.on('error', (err) => {
        res.writeHead(502);
        res.end(`proxy error: ${err.message}`);
      });
      req.pipe(proxyReq);
      return;
    }
    const u = new URL(req.url, `http://localhost:${port}`);
    const init = u.searchParams.get('init') || '{}';
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    // The npm artifact is libraryTarget: 'commonjs2'. To load it as
    // a plain <script>, shim module/exports before the bundle runs
    // and pull StreamConnect off module.exports afterwards. Same
    // pattern as stream/templates/sdk_test.html in the stream repo.
    // Wrap the mount point in a centered max-width container so
    // the captured widget approximates a typical embedded
    // integration (usually 500-700px), not the full viewport. Real
    // host pages almost never give the SDK the full browser width.
    res.end(`<!doctype html><html lang="en"><head>
<meta charset="utf-8"><title>SDK shot</title>
<style>
  html,body{margin:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif}
  .sdk-frame{max-width:560px;margin:48px auto;padding:0 16px}
</style>
<script>
  window.module = { exports: {} };
  window.exports = window.module.exports;
</script>
<script src="/sdk.js"></script>
<script>
  window.StreamConnect =
    (window.module.exports && window.module.exports.default) ||
    window.module.exports;
  delete window.module;
  delete window.exports;
</script>
</head><body>
<div class="sdk-frame"><div id="sdk-hook"></div></div>
<script>
  window.StreamConnect(Object.assign({ el: '#sdk-hook' }, ${init}));
</script>
</body></html>`);
  });
  await new Promise((r) => server.listen(port, r));
  return { server, base: `http://localhost:${port}` };
}

async function fetchFreshTokens() {
  return new Promise((resolve, reject) => {
    const u = new URL('/sdk-test', STREAM_WEBAPP);
    const lib = u.protocol === 'https:' ? https : http;
    lib
      .get(u, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`/sdk-test returned ${res.statusCode}`));
        }
        let body = '';
        res.on('data', (c) => {
          body += c;
        });
        res.on('end', () => {
          const grab = (key) => {
            const m = body.match(
              new RegExp(`${key}:\\s*("([^"]+)"|'([^']+)')`)
            );
            return m ? m[2] || m[3] : null;
          };
          const tokens = {
            sdkToken: grab('sdkToken'),
            connectAccessToken: grab('connectAccessToken'),
            employerSystemKey: grab('systemKey'),
            employerName: grab('name'),
            firstName: grab('firstName'),
            lastName: grab('lastName'),
            email: grab('email'),
            memberSystemKey: grab('memberSystemKey')
          };
          if (!tokens.sdkToken || !tokens.connectAccessToken) {
            return reject(
              new Error('failed to parse tokens from /sdk-test response')
            );
          }
          resolve(tokens);
        });
      })
      .on('error', reject);
  });
}

// Build a real-token init object. Shots that pass `realToken: true`
// invoke this. ToS, fix-credentials, employer-key error states all
// need a real backend round-trip.
function realInit(tokens, overrides = {}) {
  return {
    _overrideBaseUrl: '/sdk-api',
    sdkToken: tokens.sdkToken,
    connectAccessToken: tokens.connectAccessToken,
    tenant: { systemKey: '', vendor: '' },
    employer: {
      systemKey: tokens.employerSystemKey,
      vendor: 'internal',
      name: tokens.employerName
    },
    user: {
      firstName: tokens.firstName,
      lastName: tokens.lastName,
      email: tokens.email,
      memberSystemKey: tokens.memberSystemKey
    },
    isDemo: false,
    ...overrides
  };
}

async function captureOne(browser, base, shot, tokens) {
  const page = await browser.newPage({ viewport: shot.viewport });
  for (const [pattern, response] of shot.routes || []) {
    await page.route(pattern, (route) => route.fulfill(response));
  }
  const init = typeof shot.init === 'function' ? shot.init(tokens) : shot.init;
  const url = `${base}/?init=${encodeURIComponent(JSON.stringify(init))}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await shot.drive(page);
  await page.waitForTimeout(250); // settle focus rings / transitions
  const outPath = path.join(OUT_ROOT, shot.out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  if (shot.clip?.kind === 'element') {
    await page.locator(shot.clip.selector).screenshot({ path: outPath });
  } else {
    await page.screenshot({ path: outPath, fullPage: false });
  }
  await page.close();
  return outPath;
}

async function main() {
  const shots = onlyIds.size ? SHOTS.filter((s) => onlyIds.has(s.id)) : SHOTS;
  if (!shots.length) {
    console.error(
      `no shots matched; known: ${SHOTS.map((s) => s.id).join(', ')}`
    );
    process.exit(2);
  }

  await fs.access(SDK_BUNDLE).catch(() => {
    console.error(`${SDK_BUNDLE} missing — run \`npm run build\` first`);
    process.exit(2);
  });

  const needsTokens = shots.some((s) => s.realToken);
  let tokens = null;
  if (needsTokens) {
    try {
      tokens = await fetchFreshTokens();
      console.log(`tokens: sdkToken=${tokens.sdkToken.slice(0, 8)}…`);
    } catch (e) {
      console.error(
        `failed to mint tokens from ${STREAM_WEBAPP}/sdk-test: ${e.message}\n(skipping real-token shots; set STREAM_WEBAPP to override)`
      );
    }
  }

  const { server, base } = await startServer();
  const browser = await chromium.launch();
  try {
    console.log(`out: ${OUT_ROOT}`);
    for (const shot of shots) {
      if (shot.realToken && !tokens) {
        console.error(`- ${shot.id.padEnd(24)} skipped (no tokens)`);
        continue;
      }
      try {
        const p = await captureOne(browser, base, shot, tokens);
        console.log(`✓ ${shot.id.padEnd(24)} ${p}`);
      } catch (e) {
        console.error(`✗ ${shot.id.padEnd(24)} ${e.message}`);
        process.exitCode = 1;
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
