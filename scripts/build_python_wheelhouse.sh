#!/usr/bin/env bash
# build_python_wheelhouse.sh
#
# Downloads every wheel needed to install ConfigFoundry's Python
# dependencies (requirements.txt, and optionally requirements-dev.txt)
# WITHOUT internet access, into vendor/python/ and vendor/python-dev/.
#
# This script itself needs internet access (it's a developer/CI-time tool,
# run once whenever a dependency is added or bumped) -- the *output* is
# what lets install_offline.sh run with zero network access on the actual
# target machine. See docs/airgap.md for the full explanation of this
# connected-machine-builds / air-gapped-machine-installs split.
#
# By default this builds a wheelhouse covering BOTH linux x86_64 and linux
# aarch64 (the two realistic enterprise server architectures) for the
# Python minor version currently running this script. Compiled packages
# (cryptography, sqlalchemy, pydantic-core, cffi, greenlet, uvloop, ...)
# each publish wheels tagged against DIFFERENT manylinux glibc baselines
# (manylinux2014, manylinux_2_28, ...) depending on the package and
# release -- there's no single tag that matches all of them. This script
# tries a list of known-good baseline tags per package and keeps the first
# one that resolves, rather than failing the whole run on one mismatch.
#
# Usage:
#   scripts/build_python_wheelhouse.sh                  # both arches, runtime deps
#   scripts/build_python_wheelhouse.sh --with-dev        # + pytest/test tooling
#   scripts/build_python_wheelhouse.sh --arch x86_64     # one arch only
#   scripts/build_python_wheelhouse.sh --python-version 3.11
#   scripts/build_python_wheelhouse.sh --windows         # ALSO fetch Windows
#       # wheels where they exist (pure-Python + any win_amd64 binary
#       # wheels available). Compiled packages without a Windows wheel on
#       # PyPI are skipped with a warning -- see docs/airgap.md.
#
# Requires: python3, pip (with internet access for THIS run only).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

WITH_DEV=0
ARCHES=("x86_64" "aarch64")
INCLUDE_WINDOWS=0
PYVER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-dev) WITH_DEV=1; shift ;;
    --arch) ARCHES=("$2"); shift 2 ;;
    --windows) INCLUDE_WINDOWS=1; shift ;;
    --python-version) PYVER="$2"; shift 2 ;;
    -h|--help) sed -n '2,33p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$PYVER" ]]; then
  PYVER="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
fi
PYVER_NODOT="${PYVER//./}"
ABI="cp${PYVER_NODOT}"

# Known-good manylinux baseline tags to try, per arch, newest-compatible
# first isn't required -- we just try each until one has the requested
# version. Extend this list if a future dependency needs a newer baseline.
MANYLINUX_TAGS_x86_64=("manylinux2014_x86_64" "manylinux_2_28_x86_64" "manylinux_2_34_x86_64")
MANYLINUX_TAGS_aarch64=("manylinux2014_aarch64" "manylinux_2_28_aarch64" "manylinux_2_34_aarch64")

# ---------------------------------------------------------------------------
# download_requirements <requirements-file> <dest-dir>
#
# Parses a requirements.txt-style file (ignoring comments/blank lines/
# environment markers) and downloads each pinned package individually with
# --no-deps, trying every (arch x manylinux-tag) combination until one
# succeeds. Pure-Python packages succeed on the first try and are simply
# not re-downloaded for subsequent arches (pip skips re-saving an
# already-present file of the same name).
# ---------------------------------------------------------------------------
download_requirements() {
  local req_file="$1"
  local dest="$2"
  mkdir -p "$dest"

  local line name_version
  while IFS= read -r line; do
    line="${line%%#*}"                    # strip trailing comments
    line="$(echo "$line" | sed 's/[[:space:]]*$//')"
    [[ -z "$line" ]] && continue
    name_version="${line%%;*}"            # strip environment markers (e.g. "; sys_platform != ...")
    name_version="$(echo "$name_version" | sed 's/[[:space:]]*$//')"
    [[ -z "$name_version" ]] && continue

    # Try EVERY requested arch independently -- a compiled package needs a
    # separate wheel per arch, so succeeding on x86_64 must NOT skip the
    # aarch64 attempt (that was a real bug caught by scripts/tests before
    # this comment existed: an early `break` after the first arch quietly
    # produced a single-architecture wheelhouse while claiming success).
    # A pure-Python (py3-none-any) wheel matches every platform constraint,
    # so it downloads once on the first arch and pip simply reports
    # "already downloaded" on the rest -- no real duplicate work happens.
    local any_ok=0
    for arch in "${ARCHES[@]}"; do
      local tags_var="MANYLINUX_TAGS_${arch}[@]"
      local tags=("${!tags_var}")
      local arch_ok=0
      for tag in "${tags[@]}"; do
        if python3 -m pip download "$name_version" -d "$dest" \
             --platform "$tag" --python-version "$PYVER" \
             --implementation cp --abi "$ABI" \
             --only-binary=:all: --no-deps \
             --quiet 2>/tmp/wheelhouse_err.log; then
          arch_ok=1
          break
        fi
        # Some packages ship abi3 wheels (cryptography, argon2-cffi-bindings)
        # instead of a per-minor-version ABI tag; retry with --abi abi3.
        if python3 -m pip download "$name_version" -d "$dest" \
             --platform "$tag" --python-version "$PYVER" \
             --implementation cp --abi abi3 \
             --only-binary=:all: --no-deps \
             --quiet 2>/tmp/wheelhouse_err.log; then
          arch_ok=1
          break
        fi
      done
      [[ "$arch_ok" -eq 1 ]] && any_ok=1
    done
    local ok="$any_ok"

    # Pure-Python (py3-none-any) fallback -- no platform restriction needed.
    # Only reached if EVERY arch above failed (i.e. likely a pure-Python
    # package that doesn't need platform args at all, or a package this
    # tag list doesn't yet cover).
    if [[ "$ok" -eq 0 ]]; then
      if python3 -m pip download "$name_version" -d "$dest" \
           --only-binary=:all: --no-deps --quiet 2>/tmp/wheelhouse_err.log; then
        ok=1
      fi
    fi

    if [[ "$INCLUDE_WINDOWS" -eq 1 ]]; then
      python3 -m pip download "$name_version" -d "$dest" \
        --platform win_amd64 --python-version "$PYVER" \
        --implementation cp --abi "$ABI" \
        --only-binary=:all: --no-deps --quiet 2>/dev/null \
      || python3 -m pip download "$name_version" -d "$dest" \
           --platform win_amd64 --python-version "$PYVER" \
           --implementation cp --abi abi3 \
           --only-binary=:all: --no-deps --quiet 2>/dev/null \
      || echo "    (warn) no Windows wheel found for $name_version -- skipped, see docs/airgap.md" >&2
    fi

    if [[ "$ok" -eq 0 ]]; then
      echo "!! FAILED to download any wheel for: $name_version" >&2
      echo "   Last error:" >&2
      tail -5 /tmp/wheelhouse_err.log >&2 || true
      exit 1
    fi
    echo "  ✓ $name_version"
  done < "$req_file"
}

echo "=================================================================="
echo "  ConfigFoundry -- Python offline wheelhouse builder"
echo "  Target: Python ${PYVER}, arch(es): ${ARCHES[*]}$( [[ $INCLUDE_WINDOWS -eq 1 ]] && echo ', win_amd64 (best-effort)' )"
echo "=================================================================="
echo
echo "--> Downloading runtime dependencies into vendor/python/ ..."
rm -rf vendor/python
download_requirements requirements.txt vendor/python
(cd vendor/python && sha256sum *.whl | sort -k2 > CHECKSUMS.sha256)
echo "    Done: $(ls vendor/python/*.whl | wc -l | tr -d ' ') wheels, checksums written."
echo

if [[ "$WITH_DEV" -eq 1 ]]; then
  echo "--> Downloading dev/test dependencies into vendor/python-dev/ ..."
  rm -rf vendor/python-dev
  download_requirements requirements-dev.txt vendor/python-dev
  (cd vendor/python-dev && sha256sum *.whl | sort -k2 > CHECKSUMS.sha256)
  echo "    Done: $(ls vendor/python-dev/*.whl | wc -l | tr -d ' ') wheels, checksums written."
  echo
fi

echo "--> Verifying the wheelhouse installs with ZERO network access ..."
VERIFY_VENV="$(mktemp -d)"
python3 -m venv "$VERIFY_VENV"
"$VERIFY_VENV/bin/pip" install --no-index --find-links vendor/python -r requirements.txt
echo "    OK -- installs cleanly with --no-index (no PyPI access used) for this machine's own platform."
rm -rf "$VERIFY_VENV"

echo
echo "=================================================================="
echo "  Wheelhouse ready: vendor/python/ ($(du -sh vendor/python | cut -f1))"
if [[ "$WITH_DEV" -eq 1 ]]; then
  echo "  Dev wheelhouse ready: vendor/python-dev/ ($(du -sh vendor/python-dev | cut -f1))"
fi
echo "  Commit these directories (or attach them to the release bundle --"
echo "  see scripts/build_release_bundle.sh) so install_offline.sh can use"
echo "  them on a machine with no internet access. pip automatically picks"
echo "  the correct wheel for the target machine's platform out of the"
echo "  mixed-architecture directory -- no manual selection needed."
echo "=================================================================="
