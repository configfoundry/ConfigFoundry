#!/usr/bin/env bash
# install_offline.sh — install ConfigFoundry with ZERO internet access.
#
# Requires only: python3 (3.10+), and node (ONLY if you need to rebuild
# the frontend -- a pre-built frontend/out/ is used as-is if present).
#
# What this does, in order:
#   1. Verify python3 is available and new enough.
#   2. Create a virtualenv and install every Python dependency from
#      vendor/python/ using `pip install --no-index` (structurally
#      cannot reach PyPI, not just "won't" reach it).
#   3. If frontend/out/ already exists (the normal case -- it ships in the
#      release bundle), use it as-is: no Node.js needed at all.
#      Otherwise, if Node is available, rebuild it from vendor/npm/.
#   4. Print how to start the app (database migrations run automatically
#      on first launch -- see docs/architecture.md).
#
# See docs/airgap.md for the full explanation and docs/installation.md
# for a walkthrough with screenshots-in-prose.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; RESET='\033[0m'
info()  { echo -e "${BOLD}==>${RESET} $*"; }
ok()    { echo -e "${GREEN}✓${RESET} $*"; }
warn()  { echo -e "${YELLOW}!${RESET} $*"; }
fail()  { echo -e "${RED}✗ $*${RESET}" >&2; exit 1; }

echo "=================================================================="
echo "  ConfigFoundry — offline installer"
echo "=================================================================="
echo

# ---------------------------------------------------------------------
# 1. Verify Python
# ---------------------------------------------------------------------
info "Checking for Python 3.10+..."
PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  fail "python3 not found on PATH. Install Python 3.10 or newer, then re-run this script."
fi
PY_VERSION="$("$PYTHON_BIN" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
PY_OK="$("$PYTHON_BIN" -c 'import sys; print(1 if sys.version_info >= (3, 10) else 0)')"
if [[ "$PY_OK" -ne 1 ]]; then
  fail "Python $PY_VERSION found, but 3.10+ is required."
fi
ok "Python $PY_VERSION"

# ---------------------------------------------------------------------
# 2. Verify the wheelhouse exists, then install with --no-index
# ---------------------------------------------------------------------
if [[ ! -d vendor/python ]] || [[ -z "$(ls -A vendor/python/*.whl 2>/dev/null)" ]]; then
  fail "vendor/python/ is missing or empty. This isn't a valid offline release bundle -- see docs/airgap.md."
fi

info "Creating virtual environment (.venv/)..."
"$PYTHON_BIN" -m venv .venv
ok ".venv/ created"

info "Installing Python dependencies from vendor/python/ (--no-index: no network access used)..."
if ! .venv/bin/pip install --no-index --find-links vendor/python -r requirements.txt; then
  fail "Offline install failed. This usually means vendor/python/ doesn't have a wheel for this" \
       "machine's exact platform/Python version. Run 'python3 -m pip debug --verbose' to see" \
       "this machine's compatible tags, compare against vendor/python/CHECKSUMS.sha256, and see" \
       "\"Targeting a different platform\" in docs/airgap.md."
fi
ok "Python dependencies installed"

# ---------------------------------------------------------------------
# 3. Frontend: use the pre-built static export if present, else try an
#    offline rebuild if Node is available.
# ---------------------------------------------------------------------
if [[ -d frontend/out ]] && [[ -n "$(ls -A frontend/out 2>/dev/null)" ]]; then
  ok "Pre-built frontend found at frontend/out/ -- no Node.js needed."
else
  warn "frontend/out/ not found. Attempting an offline rebuild..."
  if ! command -v node >/dev/null 2>&1; then
    fail "Node.js not found and no pre-built frontend/out/ is present. Install Node 18+ and" \
         "re-run, or copy a pre-built frontend/out/ onto this machine from the release bundle."
  fi

  if [[ -d frontend/node_modules ]] && [[ -n "$(ls -A frontend/node_modules 2>/dev/null)" ]]; then
    ok "frontend/node_modules/ already present, using as-is."
  elif [[ -f vendor/npm/node_modules.tar.gz ]]; then
    info "Extracting vendored node_modules from vendor/npm/node_modules.tar.gz..."
    mkdir -p frontend
    tar -xzf vendor/npm/node_modules.tar.gz -C frontend
    ok "node_modules extracted"
  else
    fail "No frontend/node_modules/ and no vendor/npm/node_modules.tar.gz. Cannot rebuild the" \
         "frontend offline -- see \"Contents\" in vendor/npm/README.md."
  fi

  # Swap in the right native compiler for THIS machine if it's missing.
  NODE_PLATFORM="$(node -p "process.platform")"
  NODE_ARCH="$(node -p "process.arch")"
  case "$NODE_PLATFORM-$NODE_ARCH" in
    linux-x64)   SWC_DIR="linux-x64-gnu" ;;
    linux-arm64) SWC_DIR="linux-arm64-gnu" ;;
    darwin-x64)  SWC_DIR="darwin-x64" ;;
    darwin-arm64) SWC_DIR="darwin-arm64" ;;
    win32-x64)   SWC_DIR="win32-x64-msvc" ;;
    *) SWC_DIR="" ;;
  esac
  NEEDED_SWC="frontend/node_modules/next/node_modules/@next/swc-${SWC_DIR}"
  if [[ -n "$SWC_DIR" ]] && [[ ! -d "$NEEDED_SWC" ]] && [[ -d "vendor/npm/swc-binaries/$SWC_DIR" ]]; then
    info "Installing the native Next.js compiler for $NODE_PLATFORM-$NODE_ARCH..."
    mkdir -p "$NEEDED_SWC"
    cp -R "vendor/npm/swc-binaries/$SWC_DIR/." "$NEEDED_SWC/"
    ok "Native compiler installed"
  fi

  info "Building the frontend (offline)..."
  (cd frontend && npm run build)
  ok "Frontend built to frontend/out/"
fi

echo
echo "=================================================================="
echo -e "  ${GREEN}${BOLD}ConfigFoundry installed successfully.${RESET}"
echo "=================================================================="
echo "  Database migrations run automatically on first launch."
echo
echo "  Start it with:"
echo "    ./run_offline.sh"
echo "  or directly:"
echo "    .venv/bin/python3 server.py"
echo
echo "  Then open http://localhost:8420/ — the bootstrap Super Admin"
echo "  credentials are printed to the console on first startup."
echo "=================================================================="
