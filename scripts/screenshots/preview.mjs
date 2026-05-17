// Tiny static server that renders an old-vs-new gallery so the
// captured PNGs can be eyeballed before they go to S3.
//
//   node scripts/screenshots/preview.mjs            # serves :8085
//   node scripts/screenshots/preview.mjs --port=9090 --new=/tmp/sdk-shots

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const m = argv.find((a) => a.startsWith(`--${name}=`));
  return m ? m.split('=')[1] : def;
};

const PORT = Number(flag('port', 8085));
const NEW_ROOT = path.resolve(ROOT, flag('new', '/tmp/sdk-shots'));
const OLD_ROOT = path.resolve(ROOT, 'docs');

// Mapping: id → { label, oldPath (relative to OLD_ROOT), newPath (relative to NEW_ROOT) }
const ENTRIES = [
  ['demo-init-page', 'quickstart-screenshots/demo-init-page.png'],
  ['choose-payer', 'flow-screenshots/choose-payer.png'],
  ['choose-payer-dropdown', 'flow-screenshots/choose-payer-dropdown.png'],
  ['enter-credentials', 'flow-screenshots/enter-credentials.png'],
  ['pop-up', 'flow-screenshots/pop-up.png'],
  ['terms-of-service', 'flow-screenshots/terms-of-service.png']
].map(([id, rel]) => ({ id, rel }));

function html() {
  const cards = ENTRIES.map(({ id, rel }) => {
    const oldExists = fs.existsSync(path.join(OLD_ROOT, rel));
    const newExists = fs.existsSync(path.join(NEW_ROOT, rel));
    const newStat = newExists ? fs.statSync(path.join(NEW_ROOT, rel)) : null;
    const cacheBust = newStat ? `?v=${newStat.mtimeMs}` : '';
    return `
    <section>
      <h2>${id} <small style="color:#666">— ${rel}</small></h2>
      <div class="row">
        <figure>
          <figcaption>old (0.7 era, in docs/)</figcaption>
          ${oldExists ? `<img src="/old/${rel}">` : `<div class="missing">missing</div>`}
        </figure>
        <figure>
          <figcaption>new (just captured)</figcaption>
          ${newExists ? `<img src="/new/${rel}${cacheBust}">` : `<div class="missing">not yet captured</div>`}
        </figure>
      </div>
    </section>`;
  }).join('\n');

  return `<!doctype html><html><head>
<meta charset="utf-8"><title>SDK screenshots preview</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #f6f7f9; }
  h1 { margin-top: 0; }
  section { background: #fff; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  section h2 { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  figure { margin: 0; }
  figcaption { font-size: 12px; color: #555; margin-bottom: 6px; }
  img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; display: block; }
  .missing { padding: 40px; text-align: center; color: #aaa; background: #fafafa; border: 1px dashed #ddd; border-radius: 4px; }
  header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
  code { background: #eef; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
</style>
</head><body>
<header>
  <h1>SDK screenshots preview</h1>
  <div><code>new=${NEW_ROOT}</code> &middot; <code>old=${OLD_ROOT}</code></div>
</header>
${cards}
</body></html>`;
}

function serveFile(res, abs) {
  fs.readFile(abs, (err, buf) => {
    if (err) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store'
    });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  if (u.pathname === '/' || u.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html());
  }
  if (u.pathname.startsWith('/old/')) {
    return serveFile(
      res,
      path.join(OLD_ROOT, u.pathname.slice('/old/'.length))
    );
  }
  if (u.pathname.startsWith('/new/')) {
    return serveFile(
      res,
      path.join(NEW_ROOT, u.pathname.slice('/new/'.length))
    );
  }
  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`preview: http://localhost:${PORT}`);
  console.log(`  new=${NEW_ROOT}`);
  console.log(`  old=${OLD_ROOT}`);
});
