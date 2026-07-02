#!/usr/bin/env bash
# run_offline.sh — start ConfigFoundry using the offline virtualenv
# created by install_offline.sh. No network access used or required.
#
# Passes through any extra arguments to server.py, e.g.:
#   ./run_offline.sh --port 9000 --no-browser
#   ./run_offline.sh --config /etc/configfoundry/config.yaml

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

if [[ ! -x .venv/bin/python3 ]]; then
  echo "✗ .venv/ not found. Run ./install_offline.sh first." >&2
  exit 1
fi

if [[ ! -d frontend/out ]] || [[ -z "$(ls -A frontend/out 2>/dev/null)" ]]; then
  echo "! frontend/out/ is missing -- the UI will 404. Run ./install_offline.sh to build it." >&2
fi

exec .venv/bin/python3 server.py "$@"
