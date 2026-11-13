#!/usr/bin/env bash
# Run the private publish-dist checks against a checkout of ahuai6/Sub-Store-Fork.
#
# The fork's scripts are the source of truth. This file only invokes them in
# the same order as .github/workflows/publish-dist.yml in that repo. It does
# not publish, push, upload artifacts, or copy any private source beyond the
# geo.js files that workflow already stages for publish_public_dist.sh.
#
# Usage: run_fork_publish_checks.sh <fork-checkout>
# Env:   PUBLIC_DIST_REPO   owner/name passed to the module renderer
#        (default ahuai6/Sub-Store-Fork-Dist)

set -euo pipefail

root=${1:?fork checkout required}
cd "$root"
repo=${PUBLIC_DIST_REPO:-ahuai6/Sub-Store-Fork-Dist}

if [[ ! -f .github/scripts/apply-fork-frontend.mjs || ! -f .github/scripts/render_surge_beta_module.py ]]; then
  echo "::error::${root} does not look like a Sub-Store-Fork checkout."
  exit 1
fi

node .github/scripts/apply-fork-frontend.mjs --check
node .github/scripts/apply-fork-runtime.mjs --check

corepack enable
(
  cd backend
  pnpm i --frozen-lockfile
)

version="$(curl -fsSL https://github.com/MetaCubeX/mihomo/releases/latest/download/version.txt | tr -d '\r\n')"
if [[ -z "$version" ]]; then
  echo "::error::mihomo version.txt was empty"
  exit 1
fi
echo "Using mihomo version: ${version}"
(
  cd backend
  MIHOMO_VERSION="$version" node ../.github/scripts/sync_mihomo_version.mjs
)

(
  cd backend
  # src/test/proxy-producers/golden-snapshot.spec.js is part of this glob.
  # Those snapshots must stay byte-identical.
  pnpm test
)
python3 -m unittest discover -s .github/scripts -p 'test_render_surge_beta_module.py'

(
  cd backend
  # sub-store-0 and sub-store-1 are the Surge-only bundles. The Node bundle
  # and the other script artifacts stay on runtime host detection.
  pnpm bundle:esbuild
)

out="${root}/public-dist"
rm -rf "$out"
mkdir -p "$out"
python3 .github/scripts/render_surge_beta_module.py \
  --check \
  --public-repo "$repo" \
  --output "$out/Surge-Beta.sgmodule" | tee "$out/module.diff"
cp scripts/check/geo.js "$out/geo.js"
cp scripts/check/GEO-LICENSE.txt "$out/GEO-LICENSE.txt"
cp scripts/check/GEO-NOTICE.md "$out/GEO-NOTICE.md"
cp backend/sub-store.min.js "$out/sub-store.min.js"
cp backend/dist/sub-store-0.min.js "$out/"
cp backend/dist/sub-store-1.min.js "$out/"
cp backend/dist/sub-store-parser.loon.min.js "$out/"
cp backend/dist/cron-sync-artifacts.min.js "$out/"
cp backend/dist/proxy-utils.esm.mjs "$out/"
cp backend/dist/sub-store.bundle.js "$out/"
cp backend/dist/runtime-manifest.json "$out/"
node --eval="process.stdout.write(require('./backend/package.json').version)" > "$out/version.txt"
git rev-parse HEAD > "$out/source-sha.txt"
git fetch origin upstream
git merge-base HEAD FETCH_HEAD > "$out/upstream-sha.txt"

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "### Surge beta module diff vs upstream"
    echo ""
    echo '```diff'
    cat "$out/module.diff"
    echo '```'
  } >> "$GITHUB_STEP_SUMMARY"
fi
