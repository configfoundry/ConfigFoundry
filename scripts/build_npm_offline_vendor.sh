#!/usr/bin/env bash
# build_npm_offline_vendor.sh
#
# Vendors everything needed to build the Next.js frontend WITHOUT npm
# registry access, into vendor/npm/. Like build_python_wheelhouse.sh, this
# script itself needs internet access (run once per dependency bump, on a
# connected machine) -- its output is what lets install_offline.sh /
# upgrade_offline.sh rebuild the frontend with zero network access.
#
# IMPORTANT CONTEXT (read this before running):
# next@14.2.34 and next@14.2.35 were published on npm WITHOUT matching
# @next/swc-<platform> binary packages (the native compiler each platform
# needs) -- only 14.2.33 has a full, consistent set across every platform.
# That mismatch is the exact root cause of the "Found lockfile missing
# swc dependencies, patching..." crash documented in the Makefile's `build`
# target. frontend/package.json now pins `next` to the EXACT version
# `14.2.33` (not a `^14.2.0` range) specifically to avoid ever landing on
# a broken combination again. Do not widen that pin without first checking
# that every @next/swc-<platform> package exists at the new exact version.
#
# What this script does:
#   1. `npm ci` (or `npm install` if no lockfile yet) to get a fully
#      resolved, consistent node_modules/ for THIS machine's platform.
#   2. Additionally fetches (via `npm pack`, which -- unlike `npm install`
#      -- can download a package for a platform other than the one running
#      the command) the @next/swc-* native binary for every platform listed
#      in $TARGET_PLATFORMS below, so the resulting vendor bundle works
#      when extracted onto a DIFFERENT machine than the one that built it.
#   3. Packs frontend/node_modules into vendor/npm/node_modules.tar.gz and
#      the extra platform binaries into vendor/npm/swc-binaries/<platform>/.
#
# Usage:
#   scripts/build_npm_offline_vendor.sh
#
# Requires: node, npm (with internet access for this run only).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
VENDOR_DIR="$REPO_ROOT/vendor/npm"

# Every @next/swc-* platform package to vendor alongside node_modules, so
# install_offline.sh can select the right one at extract time regardless
# of which machine built this vendor bundle.
TARGET_PLATFORMS=(
  "linux-x64-gnu"
  "linux-arm64-gnu"
  "linux-x64-musl"
  "linux-arm64-musl"
  "darwin-x64"
  "darwin-arm64"
  "win32-x64-msvc"
)

NEXT_VERSION="$(python3 -c "import json; print(json.load(open('$FRONTEND_DIR/package.json'))['dependencies']['next'])")"

echo "=================================================================="
echo "  ConfigFoundry -- npm offline vendor builder (next@${NEXT_VERSION})"
echo "=================================================================="
echo

cd "$FRONTEND_DIR"
echo "--> Installing a fully resolved node_modules/ for this machine ..."
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
echo

mkdir -p "$VENDOR_DIR/swc-binaries"
echo "--> Fetching @next/swc-* native binaries for every target platform ..."
for plat in "${TARGET_PLATFORMS[@]}"; do
  dest="$VENDOR_DIR/swc-binaries/$plat"
  if [[ -d "$dest" ]]; then
    echo "    $plat: already vendored, skipping"
    continue
  fi
  mkdir -p "$dest"
  tmp="$(mktemp -d)"
  if (cd "$tmp" && npm pack "@next/swc-${plat}@${NEXT_VERSION}" >/dev/null 2>/tmp/swc_pack_err.log); then
    tarball="$(ls "$tmp"/*.tgz)"
    tar -xzf "$tarball" -C "$dest" --strip-components=1
    rm -rf "$tmp"
    echo "    ✓ $plat"
  else
    rm -rf "$tmp" "$dest"
    echo "    ✗ $plat -- not available at ${NEXT_VERSION} (see /tmp/swc_pack_err.log). This platform"
    echo "      won't be selectable by install_offline.sh; every OTHER platform is unaffected."
  fi
done
echo

echo "--> Packing frontend/node_modules into vendor/npm/node_modules.tar.gz ..."
tar -czf "$VENDOR_DIR/node_modules.tar.gz" -C "$FRONTEND_DIR" node_modules
cp "$FRONTEND_DIR/package-lock.json" "$VENDOR_DIR/package-lock.json.snapshot"
sha256sum "$VENDOR_DIR/node_modules.tar.gz" > "$VENDOR_DIR/CHECKSUMS.sha256"
find "$VENDOR_DIR/swc-binaries" -maxdepth 1 -mindepth 1 -type d | while read -r d; do
  (cd "$d" && find . -type f -exec sha256sum {} \; ) >> "$VENDOR_DIR/CHECKSUMS.sha256"
done
echo

echo "=================================================================="
echo "  npm vendor bundle ready: vendor/npm/ ($(du -sh "$VENDOR_DIR" | cut -f1))"
echo "  Contents:"
echo "    node_modules.tar.gz          -- this machine's platform, ready to extract as-is"
echo "    swc-binaries/<platform>/     -- native compiler for every other target platform"
echo "    package-lock.json.snapshot   -- exact lockfile this bundle was built from"
echo "  install_offline.sh / upgrade_offline.sh extract node_modules.tar.gz, then"
echo "  swap in the right swc-binaries/<platform>/ if it doesn't match this machine."
echo "=================================================================="
