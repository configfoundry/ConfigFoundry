# Upgrade & Rollback

Parent: [Deployment Overview](Deployment Overview.md) · [Database Overview](../architecture/Database Overview.md#migration-strategy)

## Version compatibility

Migrations are additive and forward-only — `alembic upgrade head` applies every pending migration in order automatically at startup, so upgrading across multiple released versions in one step is supported. Downgrading is **not** supported as a matter of policy — restore the pre-upgrade backup instead.

## Before upgrading

1. **Back up the database:**
   ```bash
   cp db/configfoundry.db db/configfoundry.db.pre-upgrade-$(date +%Y%m%d-%H%M%S).bak
   ```
   (`upgrade_offline.sh` does this automatically when given `--db-from`.)
2. Read the release notes ([Changelog](../../CHANGELOG.md)) for the target version.
3. Test against a copy first for a significant version jump or a high-stakes deployment.

## Upgrading an air-gapped install

```bash
# from the root of the NEW release bundle
./upgrade_offline.sh --db-from /path/to/old/install/db/configfoundry.db
./run_offline.sh
```

Backs up the target DB (timestamped, original untouched), copies it into the new release's `db/`, re-runs the offline install against the new release's vendored wheelhouse/npm artifacts (fresh `.venv/`, not patched). Migrations apply automatically on next start — watch the startup log for the migration summary.

## Upgrading a source install

```bash
git pull
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..   # only if rebuilding frontend
python3 server.py
```

## After upgrading

Confirm the startup log shows the expected head revision (`alembic current`); spot-check log in, view inventory, generate a config; keep the pre-upgrade backup at least one full operational cycle.

## Rolling back

```bash
cp db/configfoundry.db.pre-upgrade-<timestamp>.bak db/configfoundry.db
# reinstall/run the previous release's code
```

`alembic downgrade` exists as a lower-level tool but restoring the file backup is the recommended path — simpler, doesn't depend on every migration having a correct, tested `downgrade()`.

## See also

[Database Overview](../architecture/Database Overview.md#migration-strategy) · [Air-Gap Deployment](Air-Gap Deployment.md) · [Runbook - Backup & Recovery](runbooks/Runbook - Backup & Recovery.md)
