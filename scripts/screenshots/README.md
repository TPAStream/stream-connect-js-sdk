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
  what's currently published on S3 vs what you just captured, side by
  side. Pass `--old=<dir>` to diff against a local directory instead.
  Use it before pushing to S3.
- `upload.mjs` — `aws s3 sync` to `tpastream-public/<prefix>/` with
  `--acl public-read`. Default prefix is `sdk-docs`. No `--delete`, so a
  partial capture only overwrites the keys it actually produced.

## Typical flow

```bash
npm run build                 # produces ./sdk.js
npm run screenshots           # captures all shots to /tmp/sdk-shots
npm run screenshots:preview   # eyeball at http://localhost:8085
npm run screenshots:upload    # push to s3://tpastream-public/sdk-docs/
```

For a single shot: `node scripts/screenshots/capture.mjs choose-payer`.

## The shots this pipeline owns

| id | published under `sdk-docs/` | backend |
|---|---|---|
| `demo-init-page` | `quickstart-screenshots/demo-init-page.png` | demo |
| `error-init-page` | `quickstart-screenshots/error-init-page.png` | `realToken` |
| `choose-payer` | `flow-screenshots/choose-payer.png` | demo |
| `choose-payer-dropdown` | `flow-screenshots/choose-payer-dropdown.png` | demo |
| `enter-credentials` | `flow-screenshots/enter-credentials.png` | demo |
| `pop-up` | `flow-screenshots/pop-up.png` | demo |
| `terms-of-service` | `flow-screenshots/terms-of-service.png` | demo |
| `realtime-validation` | `flow-screenshots/realtime-validation.png` | `realToken` |
| `select-enroll-widget` | `fix-credentials/select-enroll-widget.png` | `realToken` |

The `realToken` shots need a running `STREAM_WEBAPP` whose `/sdk-test`
can mint tokens — so that container has to be up **and** its dev DB
migrated (`alembic upgrade head`). A dev DB a few migrations behind
serves a 500 from `/sdk-test` and the capture dies there.

## `employer-key-page` belongs to the other pipeline

`docs/quickstart.md` Step 5 embeds an Employer Key screenshot, but it's a
webapp shot, not an SDK one: it's captured by the pipeline in the
`stream` repo (`scripts/screenshots/shots/employers.mjs`) and published
under the `webapp-docs/` prefix. Refresh it there, not here — see
`.claude/docs/screenshots.md` in that repo for the decision tree between
the two pipelines.

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

To get it into the preview gallery, add it to `ENTRIES` in `preview.mjs`
as well — that list is maintained by hand and is not derived from
`SHOTS`, so it currently omits all three `realToken` shots.
