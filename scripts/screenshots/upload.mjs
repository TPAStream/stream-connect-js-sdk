// Push captured PNGs to s3://tpastream-public/sdk-docs/, public-read.
// The bucket already has a CORS rule for *.tpastream.com (GET-only on
// the first rule), which is sufficient for <img> tags on the docs
// site or anywhere else.
//
//   node scripts/screenshots/upload.mjs            # from /tmp/sdk-shots
//   node scripts/screenshots/upload.mjs --src=/some/dir --prefix=sdk-docs-test
//
// Requires AWS credentials with s3:PutObject on tpastream-public/* (the
// `terraform-dev` IAM user in stream-infrastructure has this).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
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

const SRC = path.resolve(ROOT, flag('src', '/tmp/sdk-shots'));
const BUCKET = flag('bucket', 'tpastream-public');
const PREFIX = flag('prefix', 'sdk-docs').replace(/^\/+|\/+$/g, '');
const DRY = argv.includes('--dry-run');

if (!fs.existsSync(SRC)) {
  console.error(`src not found: ${SRC}`);
  process.exit(2);
}

const target = `s3://${BUCKET}/${PREFIX}/`;
const args = [
  's3',
  'sync',
  SRC,
  target,
  '--acl',
  'public-read',
  '--exclude',
  '*',
  '--include',
  '*.png',
  '--cache-control',
  'public, max-age=300',
  '--content-type',
  'image/png'
];
if (DRY) args.push('--dryrun');

console.log(`aws ${args.join(' ')}`);
const r = spawnSync('aws', args, { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);

if (!DRY) {
  // Print URLs so the SDK markdown updates can be pasted in.
  console.log('');
  console.log('Uploaded:');
  for (const rel of walk(SRC, SRC)) {
    if (!rel.endsWith('.png')) continue;
    console.log(`  https://${BUCKET}.s3.amazonaws.com/${PREFIX}/${rel}`);
  }
}

function* walk(dir, root) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(full, root);
    else yield path.relative(root, full);
  }
}
