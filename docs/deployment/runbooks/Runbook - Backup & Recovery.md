# Runbook: Backup & Recovery

Parent: [Database Overview](../../architecture/Database Overview.md#backups) · [Operations](Operations.md)

## Backup

**SQLite (default):**
```bash
cp db/configfoundry.db db/configfoundry.db.pre-upgrade-$(date +%Y%m%d-%H%M%S).bak
```
Valid only when no write is in progress — for a live server prefer `sqlite3 db/configfoundry.db ".backup db/configfoundry.db.bak"` or briefly stop the process. `upgrade_offline.sh` performs this automatically before an upgrade.

**PostgreSQL/MySQL/SQL Server:** use standard tooling (`pg_dump`, `mysqldump`, vendor equivalents) — ConfigFoundry does not wrap or replace these; it only needs a connection string on restore.

## What's in a backup

The database file/dump contains: full inventory (devices, bandwidth caps, subnets, tags, lists), YAML generation history, the complete audit log, and all security/RBAC data (users, roles, permissions, hashed credentials, API keys, network ACLs). It does **not** contain `CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY` or `CONFIGFOUNDRY_AUTH_JWT_SECRET` — those live in the environment, not the database. Back those up separately in a secrets manager; losing `SECRET_ENC_KEY` makes existing MFA enrollments permanently undecryptable even if the database itself is intact.

## Recovery — restoring from backup

```bash
cp db/configfoundry.db.pre-upgrade-<timestamp>.bak db/configfoundry.db
python3 server.py   # migrations reconcile automatically if the backup predates a later schema
```

## Recovery — lost admin account

See [Security Overview § Recovering from a lost admin account](../../security/Security Overview.md#recovering-from-a-lost-admin-account). In order of preference: use another Super Admin's `reset-password` endpoint; a one-off direct-DB script using the Argon2id hasher; last resort, delete the database and re-bootstrap (loses all data).

## Retention

Nothing is auto-purged today — a deliberate default (nothing disappears without an explicit action). Plan storage growth for the audit log and `yaml_history` accordingly if compliance retention windows apply. Retention/export tooling is planned for v0.7.0 — see [Roadmap Overview](../../roadmap/Roadmap Overview.md).

## Disaster recovery drill checklist

- [ ] Restore a recent backup into a scratch instance
- [ ] Confirm `alembic current` matches expected head
- [ ] Confirm login works with a known test account
- [ ] Confirm inventory counts match the source system at backup time
- [ ] Time the restore — know your actual RTO, don't assume it

## See also

[Database Overview](../../architecture/Database Overview.md#backups) · [Upgrade & Rollback](../Upgrade & Rollback.md) · [Secrets & Configuration](../../security/Secrets & Configuration.md)
