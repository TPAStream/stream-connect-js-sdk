# SDK docs screenshots

Headless capture pipeline for the screenshots referenced from the
`docs/` markdown. Output lands in `s3://tpastream-public/sdk-docs/`
(public-read, CORS open to `*.tpastream.com`), and the markdown
references the absolute S3 URL. There are no committed PNGs in `docs/`
for the shots this script owns; renaming or repositioning a shot is a
markdown-only change.

## What runs where

- `capture.mjs` — boots a tiny HTTP server that serves the locally-built
  `sdk.js` plus a parameterized fixture page, drives Chromium through
  each configured "shot" (demo mode and real-token mode both supported),
  and writes PNGs to `--out` (default `/tmp/sdk-shots`). For shots that
  need a real backend, it pulls a freshly-minted `sdkToken` +
  `connectAccessToken` from `STREAM_WEBAPP/sdk-test` (default
  `http://localhost:4000`) and proxies `/sdk-api/*` through to it so the
  browser stays same-origin.
- `preview.mjs` — static gallery on `--port` (default `8085`) showing
  old (committed in `docs/`) vs new (captured) side by side. Use for
  diffing before pushing to S3.
- `upload.mjs` — `aws s3 sync` to `tpastream-public/<prefix>/` with
  `--acl public-read`. Default prefix is `sdk-docs`.

## Typical flow

```bash
npm run build                 # produces ./sdk.js
npm run screenshots           # captures all shots to /tmp/sdk-shots
npm run screenshots:preview   # eyeball at http://localhost:8085
npm run screenshots:upload    # push to s3://tpastream-public/sdk-docs/
```

For a single shot: `node scripts/screenshots/capture.mjs choose-payer`.

## Adding a new shot

Append an entry to the `SHOTS` array in `capture.mjs` with:

- `id`, `viewport`, `out`, `init` (object or function of tokens)
- `drive(page)` — Playwright actions to reach the target state
- `clip` — `FRAME` (the `.sdk-frame` wrapper) for inline widgets, or
  `{ kind: 'viewport' }` for modals/overlays that portal outside
- `routes` — optional `page.route()` mocks if the path needs a faked
  backend response (see ToS for the pattern)
- `realToken: true` if the shot needs a server-issued sdkToken +
  connectAccessToken

Then add the corresponding `![alt](https://tpastream-public.s3...)`
reference in the relevant `docs/*.md` and push the new PNG with
`npm run screenshots:upload`.

## Known-missing shots

- `employer-key-page` (quickstart Step 5) — needs a bespoke employer
  fixture with a missing systemKey to trigger the right error state.
- `realtime-validation` (sdk-flow Real Time Validation) — needs a real
  credentials submit + SSE stream from the backend. Doable with a
  `page.route()` mock of `/v3/sdk/progress/<task>/stream` that emits
  canned `text/event-stream` chunks, but not wired in yet.

The committed PNGs for those two states are still the 0.7-era versions.
