#!/usr/bin/env bash
# build_release_bundle.sh — assemble ConfigFoundry-Offline-vX.Y.Z.zip, a
# single self-contained archive that installs and runs on a machine with
# ZERO internet access using only its own contents.
#
# Run this on a machine WITH internet access (or at least with the
# vendor/ bundles already freshly built) -- it does not itself download
# anything; it only assembles what's already in the working tree.
#
# What this does, in order:
#   1. Determine the release version from frontend/package.json.
#   2. Build the frontend static export fresh (frontend/out/), so the
#      bundle never ships a stale build.
#   3. Stage a clean copy of everything an offline install needs:
#      application source, the built frontend, vendor/python/,
#      vendor/npm/, docs/, every install/run/upgrade script, the air-gap
#      validator, LICENSE, and a VERSION file -- explicitly excluding
#      dev-only cruft (.git, __pycache__, .venv, node_modules, .next).
#   4. Run scripts/validate_airgap.py against the STAGED copy. A bundle
#      that would fail air-gap validation is never produced.
#   5. Zip the staged directory and write a top-level CHECKSUMS.sha256
#      covering every file inside, plus a standalone .sha256 of the zip
#      itself for post-transfer integrity verification.
#
# See docs/release-process.md for the full release checklist this is
# one step of, and docs/airgap.md for what the bundle guarantees.
#
# Usage:
#   ./scripts/build_release_bundle.sh [--skip-frontend-build] [--skip-validation]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; RESET='\033[0m'
info()  { echo -e "${BOLD}==>${RESET} $*"; }
ok()    { echo -e "${GREEN}✓${RESET} $*"; }
warn()  { echo -e "${YELLOW}!${RESET} $*"; }
fail()  { echo -e "${RED}✗ $*${RESET}" >&2; exit 1; }

SKIP_FRONTEND_BUILD=0
SKIP_VALIDATION=0
for arg in "$@"; do
  case "$arg" in
    --skip-frontend-build) SKIP_FRONTEND_BUILD=1 ;;
    --skip-validation) SKIP_VALIDATION=1 ;;
    -h|--help)
      sed -n '2,25p' "$0"; exit 0 ;;
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
# 2. Build the frontend fresh
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
# 3. Stage the bundle contents
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
for d in core api models alembic static docs scripts; do
  copy_path "$d"
done

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
# 4. Validate the staged bundle before packaging it
# ---------------------------------------------------------------------
if [[ "$SKIP_VALIDATION" -eq 1 ]]; then
  warn "Skipping air-gap validation (--skip-validation). Do not publish an unvalidated bundle."
else
  info "Running air-gap validation against the staged bundle..."
  if ! (cd "$STAGE_DIR" && python3 scripts/validate_airgap.py --skip-functional); then
    fail "Staged bundle FAILED air-gap validation. Not producing a zip. See output above."
  fi
  ok "Staged bundle passes air-gap validation"
fi

# ---------------------------------------------------------------------
# 5. Checksum every staged file, then zip
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
