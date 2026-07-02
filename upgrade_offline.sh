#!/usr/bin/env bash
# upgrade_offline.sh — upgrade an existing ConfigFoundry install to a new
# release, using ONLY the new release's vendored dependencies. No network
# access used or required.
#
# Run this from the ROOT OF THE NEW RELEASE (i.e. after extracting
# ConfigFoundry-Offline-vX.Y.Z.zip somewhere and cd-ing into it) -- it
# expects vendor/python/ and (optionally) vendor/npm/ to already be the
# NEW version's vendor bundle, and --db-from to point at the OLD
# install's database file to carry forward.
#
# Usage:
#   ./upgrade_offline.sh --db-from /path/to/old/install/db/configfoundry.db
#
# What this does:
#   1. Back up the target database file (timestamped copy, never deletes
#      the original).
#   2. Re-run install_offline.sh's dependency install (fresh .venv, same
#      as a clean install -- cheap and avoids any dependency drift from a
#      partially-upgraded virtualenv).
#   3. Point this install at the carried-forward database.
#   4. Remind you that migrations run automatically the next time you
#      start the app (./run_offline.sh) -- ConfigFoundry always migrates
#      forward to the schema its running code expects on startup, the
#      same as a normal boot. See docs/upgrade.md for what to check
#      before and after.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; RESET='\033[0m'
info()  { echo -e "${BOLD}==>${RESET} $*"; }
ok()    { echo -e "${GREEN}✓${RESET} $*"; }
fail()  { echo -e "${RED}✗ $*${RESET}" >&2; exit 1; }

DB_FROM=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-from) DB_FROM="$2"; shift 2 ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

echo "=================================================================="
echo "  ConfigFoundry — offline upgrade"
echo "=================================================================="
echo

if [[ -n "$DB_FROM" ]]; then
  [[ -f "$DB_FROM" ]] || fail "Database not found at: $DB_FROM"
  mkdir -p db
  TS="$(date +%Y%m%d-%H%M%S)"
  BACKUP="db/configfoundry.db.pre-upgrade-${TS}.bak"
  info "Backing up $DB_FROM -> $BACKUP"
  cp "$DB_FROM" "$BACKUP"
  ok "Backup written (original left untouched at $DB_FROM)"

  info "Copying database into this release's db/ directory..."
  cp "$DB_FROM" db/configfoundry.db
  ok "db/configfoundry.db ready"
else
  echo "  (no --db-from given -- starting with a fresh database; pass"
  echo "   --db-from /path/to/old/db/configfoundry.db to carry data forward)"
fi
echo

info "Installing this release's dependencies (offline)..."
./install_offline.sh
echo

echo "=================================================================="
echo -e "  ${GREEN}${BOLD}Upgrade prepared.${RESET}"
echo "=================================================================="
echo "  Nothing has been migrated yet -- ConfigFoundry always applies"
echo "  pending schema migrations automatically on startup, the same as"
echo "  any normal boot. Start the upgraded app with:"
echo "    ./run_offline.sh"
echo "  and watch the startup log for the migration summary. See"
echo "  docs/upgrade.md for the pre/post upgrade checklist."
echo "=================================================================="
