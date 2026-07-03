#!/usr/bin/env bash
# build_release_bundle.sh — assemble ConfigFoundry-Offline-vX.Y.Z.zip, a
# single self-contained archive that installs and runs on a machine with
# ZERO internet access using only its own contents.
#
# Run this on a machine WITH internet access -- it's the one piece of
# the whole offline pipeline that's allowed to need it (see
# docs/release-process.md and docs/airgap.md#repository-vs-release-artifact
# for why the git repository itself stays free of these large generated
# artifacts while the release bundle carries all of them).
#
# What this does, in order:
#   1. Determine the release version from frontend/package.json.
#   2. Ensure vendor/python/ exists (it's normally already committed --
#      small and kept in git on purpose -- but regenerate it if missing).
#   3. Ensure vendor/npm/ (swc-binaries/ + node_modules.tar.gz) exists,
#      regenerating it via scripts/build_npm_offline_vendor.sh if not --
#      this is the one step that needs internet access AND a full
#      `npm ci`, which is why it's never committed to git and always
#      built fresh here (or reused if already present from a prior run).
#   4. Build the frontend static export fresh (frontend/out/), so the
#      bundle never ships a stale build.
#   5. Stage a clean copy of everything an offline install needs:
#      application source, the built frontend, vendor/python/,
#      vendor/npm/, docs/, every install/run/upgrade script, the air-gap
#      validator, LICENSE, and a VERSION file -- explicitly excluding
#      dev-only cruft (.git, __pycache__, .venv, node_modules, .next).
#   6. Run the FULL scripts/validate_airgap.py (including the functional
#      offline-install + import-validation checks) against the STAGED
#      copy. A bundle that would fail air-gap validation, or that is
#      missing a required runtime package, is never produced.
#   7. Zip the staged directory and write a top-level CHECKSUMS.sha256
#      covering every file inside, plus a standalone .sha256 of the zip
#      itself for post-transfer integrity verification.
#
# See docs/release-process.md for the full release checklist this is
# one step of, and docs/airgap.md for what the bundle guarantees.
#
# Usage:
#   ./scripts/build_release_bundle.sh [--skip-frontend-build] [--skip-npm-vendor] [--skip-validation]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; RESET='\033[0m'
info()  { echo -e "${BOLD}==>${RESET} $*"; }
ok()    { echo -e "${GREEN}✓${RESET} $*"; }
warn()  { echo -e "${YELLOW}!${RESET} $*"; }
fail()  { echo -e "${RED}✗ $*${RESET}" >&2; exit 1; }

SKIP_FRONTEND_BUILD=0
SKIP_NPM_VENDOR=0
SKIP_VALIDATION=0
for arg in "$@"; do
  case "$arg" in
    --skip-frontend-build) SKIP_FRONTEND_BUILD=1 ;;
    --skip-npm-vendor) SKIP_NPM_VENDOR=1 ;;
    --skip-validation) SKIP_VALIDATION=1 ;;
    -h|--help)
      sed -n '2,33p' "$0"; exit 0 ;;
    *) fail "Unknown argument: $arg" ;;
  esac
done

echo "=================================================================="
echo "  ConfigFoundry — release bundle builder"
echo "=================================================================="
echo

# ---------------------------------------------------------------------
# 1. Determine version
# ---------------------------------------------------------------------
command -v python3 >/dev/null 2>&1 || fail "python3 is required"
VERSION="$(python3 -c "import json; print(json.load(open('frontend/package.json'))['version'])")"
[[ -n "$VERSION" ]] || fail "Could not determine version from frontend/package.json"
BUNDLE_NAME="ConfigFoundry-Offline-v${VERSION}"
info "Building release bundle: ${BUNDLE_NAME}"

# ---------------------------------------------------------------------
# 2. Ensure the Python wheelhouse exists (normally already committed)
# ---------------------------------------------------------------------
if [[ -d vendor/python ]] && [[ -n "$(ls -A vendor/python/*.whl 2>/dev/null)" ]]; then
  ok "vendor/python/ already present ($(ls vendor/python/*.whl | wc -l | tr -d ' ') wheels)"
else
  info "vendor/python/ missing or empty -- building it now (needs internet access)..."
  ./scripts/build_python_wheelhouse.sh
  ok "vendor/python/ built"
fi

# ---------------------------------------------------------------------
# 3. Ensure the npm offline vendor payload exists -- this is the one
#    piece never committed to git (see vendor/npm/README.md), so a
#    release build always needs to produce it fresh unless a prior run
#    already left one in the working tree.
# ---------------------------------------------------------------------
if [[ "$SKIP_NPM_VENDOR" -eq 1 ]]; then
  warn "Skipping npm vendor build (--skip-npm-vendor) -- using vendor/npm/ as-is, if present."
elif [[ -d vendor/npm/swc-binaries ]] && [[ -f vendor/npm/node_modules.tar.gz ]]; then
  ok "vendor/npm/ already present -- reusing (delete it first to force a rebuild)"
else
  info "vendor/npm/ missing -- building it now (needs internet access and a full npm ci)..."
  ./scripts/build_npm_offline_vendor.sh
  ok "vendor/npm/ built"
fi

# ---------------------------------------------------------------------
# 4. Build the frontend fresh
# ---------------------------------------------------------------------
if [[ "$SKIP_FRONTEND_BUILD" -eq 1 ]]; then
  warn "Skipping frontend build (--skip-frontend-build) -- using existing frontend/out/ as-is."
  [[ -d frontend/out ]] || fail "frontend/out/ does not exist and --skip-frontend-build was given."
else
  info "Building frontend static export..."
  if command -v make >/dev/null 2>&1; then
    make build
  else
    (cd frontend && npm run build)
  fi
  ok "frontend/out/ built"
fi

# ---------------------------------------------------------------------
# 5. Stage the bundle contents
# ---------------------------------------------------------------------
STAGE_ROOT="$(mktemp -d)"
STAGE_DIR="${STAGE_ROOT}/${BUNDLE_NAME}"
mkdir -p "$STAGE_DIR"
trap 'rm -rf "$STAGE_ROOT"' EXIT

info "Staging bundle contents in a temporary directory..."

copy_path() {
  local src="$1"
  [[ -e "$src" ]] || { warn "  (skipping missing path: $src)"; return; }
  mkdir -p "$STAGE_DIR/$(dirname "$src")"
  cp -R "$src" "$STAGE_DIR/$src"
}

# Application source
for p in app.py server.py requirements.txt requirements-dev.txt \
         alembic.ini README.md LICENSE Makefile; do
  copy_path "$p"
done
# Copy all top-level Python packages automatically
for d in */ ; do
    d="${d%/}"

    case "$d" in
        .git|.github|frontend|vendor|tests|docs|scripts|static|alembic|__pycache__)
            continue
            ;;
    esac

    if [[ -f "$d/__init__.py" ]]; then
        copy_path "$d"
    fi
done

# Copy required non-package directories
copy_path alembic
copy_path static
copy_path docs
copy_path scripts

# Frontend: pre-built static export (what install_offline.sh uses by
# default) PLUS the source tree (so the optional offline-rebuild path in
# install_offline.sh has something to rebuild from) -- explicitly
# excluding node_modules/.next/build caches, never vendored source.
mkdir -p "$STAGE_DIR/frontend"
cp -R frontend/out "$STAGE_DIR/frontend/out"
for p in package.json package-lock.json tsconfig.json next.config.mjs next-env.d.ts; do
  [[ -e "frontend/$p" ]] && cp "frontend/$p" "$STAGE_DIR/frontend/$p"
done
[[ -d frontend/src ]] && cp -R frontend/src "$STAGE_DIR/frontend/src"
[[ -d frontend/public ]] && cp -R frontend/public "$STAGE_DIR/frontend/public"

# Offline vendor bundles
[[ -d vendor/python ]] || fail "vendor/python/ is missing -- run scripts/build_python_wheelhouse.sh first."
copy_path vendor

# Installer scripts
for p in install_offline.sh install_offline.ps1 run_offline.sh run_offline.ps1 \
         upgrade_offline.sh upgrade_offline.ps1; do
  copy_path "$p"
done

# Strip dev-only cruft that may have been pulled in via directory copies
find "$STAGE_DIR" -type d \( -name "__pycache__" -o -name ".next" -o -name "node_modules" -o -name ".git" \) -prune -exec rm -rf {} + 2>/dev/null || true

# Version metadata
echo "$VERSION" > "$STAGE_DIR/VERSION"
{
  echo "ConfigFoundry Offline Release"
  echo "Version:    $VERSION"
  echo "Built:      $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Git commit: $(git rev-parse HEAD 2>/dev/null || echo unknown)"
} > "$STAGE_DIR/RELEASE_INFO.txt"

ok "Bundle staged at $(basename "$STAGE_DIR")/ ($(du -sh "$STAGE_DIR" | cut -f1))"

# ---------------------------------------------------------------------
# 6. Validate the staged bundle before packaging it
#
# This runs the FULL validation, including the functional checks (a
# real `pip install --no-index` into a throwaway venv, then an actual
# `from app import create_app` import/boot against that venv) -- not
# `--skip-functional`. A release bundle is exactly the artifact where
# "every required runtime package is actually present" needs to be
# proven, not assumed; catching a missing dependency here, before the
# zip is written, is the whole point of this step. It costs a bit more
# time than the static-only checks, but every wheel is already local
# (no network round-trip), so it stays fast.
# ---------------------------------------------------------------------
if [[ "$SKIP_VALIDATION" -eq 1 ]]; then
  warn "Skipping air-gap validation (--skip-validation). Do not publish an unvalidated bundle."
else
  info "Running full air-gap validation (incl. offline install + import check) against the staged bundle..."
  if ! (cd "$STAGE_DIR" && python3 scripts/validate_airgap.py); then
    fail "Staged bundle FAILED air-gap validation -- a required runtime package may be missing. Not producing a zip. See output above."
  fi
  ok "Staged bundle passes full air-gap validation, including the import/boot check"
fi

# Validation above imports the application, which makes CPython write
# fresh __pycache__/*.pyc files into the staged copy as a side effect.
# Strip them again so they never end up in CHECKSUMS.sha256 or the zip.
find "$STAGE_DIR" -type d -name "__pycache__" -prune -exec rm -rf {} + 2>/dev/null || true

# ---------------------------------------------------------------------
# 7. Checksum every staged file, then zip
# ---------------------------------------------------------------------
info "Writing CHECKSUMS.sha256 for every file in the bundle..."
(
  cd "$STAGE_DIR"
  find . -type f ! -name "CHECKSUMS.sha256" -print0 \
    | xargs -0 sha256sum \
    | sed 's|\./||' \
    | sort -k2 > CHECKSUMS.sha256
)
ok "CHECKSUMS.sha256 written ($(wc -l < "$STAGE_DIR/CHECKSUMS.sha256") files)"

# Build the zip in the temporary staging area first (never write an
# in-progress/partial archive directly into the repo), then copy the
# finished, complete file into place as a single atomic write.
TMP_ZIP="${STAGE_ROOT}/${BUNDLE_NAME}.zip"
info "Creating ${BUNDLE_NAME}.zip..."
(cd "$STAGE_ROOT" && zip -rq "$TMP_ZIP" "$BUNDLE_NAME")
sha256sum "$TMP_ZIP" | sed "s|$(dirname "$TMP_ZIP")/||" > "${TMP_ZIP}.sha256"

OUTPUT_ZIP="${REPO_ROOT}/${BUNDLE_NAME}.zip"
if [[ -e "$OUTPUT_ZIP" ]]; then
  fail "${OUTPUT_ZIP} already exists. Remove or rename the existing bundle before re-running (this script never overwrites an existing release archive)."
fi
cp "$TMP_ZIP" "$OUTPUT_ZIP"
cp "${TMP_ZIP}.sha256" "${OUTPUT_ZIP}.sha256"
ok "$(basename "$OUTPUT_ZIP") written ($(du -h "$OUTPUT_ZIP" | cut -f1))"
ok "$(basename "$OUTPUT_ZIP").sha256 written"

echo
echo "=================================================================="
echo -e "  ${GREEN}${BOLD}Release bundle ready:${RESET} ${BUNDLE_NAME}.zip"
echo "=================================================================="
echo "  Verify on the target machine before installing:"
echo "    sha256sum -c ${BUNDLE_NAME}.zip.sha256"
echo "    unzip ${BUNDLE_NAME}.zip && cd ${BUNDLE_NAME}"
echo "    python3 scripts/validate_airgap.py"
echo "    ./install_offline.sh"
echo "=================================================================="
