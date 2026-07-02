# Upgrade Guide

## Version compatibility

ConfigFoundry migrations are additive and forward-only — upgrading
across any number of released versions in one step is supported, since
`alembic upgrade head` applies every pending migration in order
automatically at startup. There's no requirement to upgrade one minor
version at a time. Downgrading is not supported as a matter of policy —
restore the pre-upgrade database backup instead (see below) if you need
to roll back.

## Before you upgrade

1. **Back up the database.** `upgrade_offline.sh` does this
   automatically when given `--db-from`, but do it yourself too if
   you're upgrading a source install rather than using the offline
   bundle:
   ```bash
   cp db/configfoundry.db db/configfoundry.db.pre-upgrade-$(date +%Y%m%d-%H%M%S).bak
   ```
2. **Read the release notes** for the target version — any breaking
   change (rare, given the "never remove existing features" principle,
   but a config file format change or a renamed environment variable is
   possible) will be called out there.
3. **Test against a copy**, not production, if this is a significant
   version jump or your deployment is high-stakes — restore your backup
   into a scratch instance, run the upgrade there first.

## Upgrading an air-gapped install

```bash
# from the root of the NEW release bundle
./upgrade_offline.sh --db-from /path/to/old/install/db/configfoundry.db
```

This:

1. Backs up the target database (timestamped, original left untouched).
2. Copies it into the new release's `db/` directory.
3. Re-runs the offline dependency install using the **new** release's
   vendored wheelhouse/npm artifacts (a fresh `.venv/`, not a patched
   old one — avoids dependency drift).
4. Reminds you that nothing is migrated yet — migrations apply
   automatically the next time you start the app.

```bash
./run_offline.sh
```

Watch the startup log for the migration summary confirming which
revisions were applied.

## Upgrading a source install (internet access available)

```bash
git pull
pip install -r requirements.txt      # picks up any new/changed dependencies
cd frontend && npm install && npm run build && cd ..   # only if rebuilding frontend from source
python3 server.py
```

Migrations apply automatically on the next startup, same as any other
boot.

## After you upgrade

- Confirm the app started cleanly and the startup log shows the
  expected head revision (`alembic current` should match, see
  [Migrations](./migrations.md)).
- Spot-check a few core flows: log in, view inventory, generate a
  config.
- Keep the pre-upgrade backup for at least one full operational cycle
  before deleting it.

## Rolling back

Restore the pre-upgrade backup and reinstall the previous release's
code/dependencies:

```bash
cp db/configfoundry.db.pre-upgrade-<timestamp>.bak db/configfoundry.db
# then reinstall/run the previous release's code as normal
```

`alembic downgrade` exists as a lower-level tool (see
[Database Migrations § Roll back one migration](./database-migrations.md#roll-back-one-migration))
but restoring the pre-upgrade file backup is the recommended path — it's
simpler and doesn't depend on every migration having a correct, tested
`downgrade()` implementation.

## See also

- [Migrations](./migrations.md) — how schema changes are applied.
- [Air-Gap Deployment](./airgap.md) — regenerating vendor bundles for a
  new release before upgrading an offline install.
- [Release Process](./release-process.md) — what changes between
  releases and how they're versioned.
