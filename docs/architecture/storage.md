# Storage

ConfigFoundry decouples the application from any specific database
through a `StorageProvider` abstraction — no repository, service, or
route contains database-specific logic. This page is the operational
summary; the full internals (the ABC contract, data classes, module
layout) are documented in [Storage Architecture](storage-architecture.md).

## Supported providers

| Provider | Status | Driver |
|---|---|---|
| SQLite | Fully functional, the default | built into Python, zero extra dependency |
| PostgreSQL | Scaffolded — interface implemented, not yet production-validated | `psycopg2` (not vendored by default — add to `requirements.txt` and rebuild the wheelhouse if you need it, see [Air-Gap Deployment](../deployment/airgap.md)) |
| MySQL | Scaffolded | `pymysql` or `mysqlclient` |
| SQL Server | Scaffolded | `pyodbc` |

SQLite is the default because it satisfies the "zero required backend
dependencies" architecture principle — a fresh clone runs with no
database server to stand up. Larger or multi-instance deployments should
move to PostgreSQL; see [Enterprise Deployment](../deployment/enterprise.md) for
guidance on when that switch is worth making.

## Choosing a provider

Environment variables (`CONFIGFOUNDRY_DB_*`) or a YAML config file — see
[Configuration](../reference/configuration.md) for the full reference. Quick
version:

::: tabs
@tab Environment variables
```bash
# SQLite (default) — nothing to set
python3 server.py

# PostgreSQL
export CONFIGFOUNDRY_DB_PROVIDER=postgresql
export CONFIGFOUNDRY_DB_CONNECTION_URL="postgresql+psycopg2://user:pass@db-host:5432/configfoundry"
python3 server.py
```
@tab YAML config
```yaml
database:
  provider: postgresql
  connection_url: "postgresql+psycopg2://user:pass@db-host:5432/configfoundry"
  pool_size: 10
  max_overflow: 20
```
:::

## Health checks

Every provider implements a non-raising `health_check()` returning
`HEALTHY` / `DEGRADED` / `UNHEALTHY` with a latency measurement — this
is what [Monitoring](../deployment/monitoring.md) polls for the readiness endpoint.

## Migrations

Schema changes for whichever provider is active are applied
automatically at startup through Alembic — see [Migrations](migrations.md)
for how that works and how to write a new one.

## Backups

PostgreSQL/MySQL/SQL Server: use your database's standard backup
tooling (`pg_dump`, `mysqldump`, etc.) — ConfigFoundry doesn't wrap or
replace these, it just needs a connection string on restore.

> [!TIP]
> SQLite: back up the single file (`db/configfoundry.db`) directly — a
> plain file copy is a valid backup **as long as no write is in
> progress**. For a live server, use `sqlite3 .backup` or briefly stop
> the process instead of copying the file blind.

`upgrade_offline.sh` automatically backs up the SQLite database before
applying an upgrade — see [Upgrade Guide](../deployment/upgrade.md).

## Adding a new provider

`StorageProvider` is an ABC with a small, explicit contract
(`initialize`, `shutdown`, `get_engine`, `get_session_factory`,
`health_check`, `get_metadata`, `get_capabilities`). A new backend means
implementing that contract and registering it in `StorageFactory` — no
existing repository or service code changes, by design. Full method
signatures and data class definitions are in
[Storage Architecture](storage-architecture.md).
