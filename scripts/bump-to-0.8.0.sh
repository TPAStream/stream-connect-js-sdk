#!/usr/bin/env bash
# scripts/bump-to-0.8.0.sh
#
# Run this AFTER PR #95 (0.8.0-react19-tailwind) merges to master.
# Bumps every "0.8.0-alpha.1" reference in the repo to "0.8.0", builds
# the bundle, commits, pushes. Then you run `npm publish` on TTY to
# cut the final 0.8.0 release.
#
# Usage:
#   bash scripts/bump-to-0.8.0.sh
#
# After it finishes:
#   1. npm publish              # on a real TTY, supply 2FA
#   2. switch to the stream repo, rebase fuhry/cdn-bake-080 onto
#      origin/master, run `npm install` to refresh the lockfile against
#      the freshly-published 0.8.0, commit, push the CDN bake PR.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
echo ">>> repo: $(pwd)"

# Sanity-check we're on master + clean
branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$branch" != "master" ]]; then
  echo "ERROR: expected to be on master (currently on '$branch'). Check out master first."
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree not clean. Commit or stash before bumping."
  git status --short
  exit 1
fi

git pull --ff-only origin master
echo ">>> on master @ $(git rev-parse --short HEAD)"

# 1. package.json
sed -i 's/"version": "0.8.0-alpha.1"/"version": "0.8.0"/' package.json
echo "  updated package.json"

# 2. SDK entry runtime version
sed -i "s/const VERSION = '0.8.0-alpha.1';/const VERSION = '0.8.0';/" \
  assets/sdk/entries/sdk.tsx
echo "  updated assets/sdk/entries/sdk.tsx"

# 3. README.md
sed -i 's/### 0.8.0 (currently published as `0.8.0-alpha.1` on npm + CDN)/### 0.8.0/' README.md
echo "  updated README.md"

# 4. CHANGELOG.md
sed -i 's/## 0.8.0 (currently published as `0.8.0-alpha.1`)/## 0.8.0/' CHANGELOG.md
echo "  updated CHANGELOG.md"

# 5. docs/quickstart.md
sed -i 's|`<script src="https://app.tpastream.com/static/js/sdk-v-0.8.0-alpha.1.js"></script>` (the current 0.8 publish; once 0.8.0 ships, swap to `sdk-v-0.8.0.js`)|`<script src="https://app.tpastream.com/static/js/sdk-v-0.8.0.js"></script>`|' \
  docs/quickstart.md
echo "  updated docs/quickstart.md"

# 6. docs/client-usage.md
sed -i 's|`"https://app.tpastream.com/static/js/sdk-v-0.8.0-alpha.1.js"` (the current 0.8 publish; once 0.8.0 ships, swap to `sdk-v-0.8.0.js`)|`"https://app.tpastream.com/static/js/sdk-v-0.8.0.js"`|' \
  docs/client-usage.md
echo "  updated docs/client-usage.md"

# 7. sdk-hook/docs/README.md  (WebView example pinned URL + 3-line comment)
sed -i '/<!-- Pin to a specific version. `sdk-v-0.8.0-alpha.1.js` is the/,/`sdk-v-0.8.0.js`. -->/d' \
  sdk-hook/docs/README.md
sed -i 's|<script src="https://app.tpastream.com/static/js/sdk-v-0.8.0-alpha.1.js"></script>|<script src="https://app.tpastream.com/static/js/sdk-v-0.8.0.js"></script>|' \
  sdk-hook/docs/README.md
echo "  updated sdk-hook/docs/README.md"

# Re-build the bundle so the published artifact has the new VERSION
# baked in. (The version literal in entries/sdk.tsx is what shows up in
# the SDK's console.log at runtime, so this matters.)
echo ">>> rebuilding bundle..."
npm run build > /dev/null
echo "  rebuilt sdk.js ($(stat -c %s sdk.js) bytes)"

# Verify nothing still says alpha.1 in the bundle's top-of-file VERSION
if grep -q "0.8.0-alpha.1" sdk.js | head -1; then
  echo "ERROR: bundle still contains '0.8.0-alpha.1' references — investigate before publishing"
  exit 1
fi

# Lint + typecheck
echo ">>> npm test..."
npm test > /dev/null
echo "  lint + typecheck green"

# Commit
git add package.json assets/sdk/entries/sdk.tsx README.md CHANGELOG.md \
  docs/quickstart.md docs/client-usage.md sdk-hook/docs/README.md sdk.js
git commit -m "chore: cut 0.8.0 (drop alpha.1 suffix)" \
  -m "Bumps version: 0.8.0-alpha.1 -> 0.8.0.

Touched: package.json (the npm version), assets/sdk/entries/sdk.tsx
(the runtime VERSION literal the SDK console.logs on init), and the
docs/CDN references in README/CHANGELOG/quickstart/client-usage/
sdk-hook README. Bundle rebuilt to bake the new VERSION literal.

Run \`npm publish\` from a TTY to cut the 0.8.0 release."

git push

echo ""
echo ">>> Bump committed and pushed."
echo ">>> Next step: npm publish (from a real TTY for 2FA)."
echo ""
echo ">>> After npm publish succeeds:"
echo "    cd ~/projects/stream.cdn-bake-080"
echo "    git rebase origin/master"
echo "    npm install   # refreshes lockfile against the freshly-published 0.8.0"
echo "    git add package-lock.json"
echo "    git commit --amend --no-edit"
echo "    git push -u origin fuhry/cdn-bake-080"
echo "    gh pr create --fill"
