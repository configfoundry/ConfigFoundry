# Storage Abstraction

Parent: [Backend Overview](Backend Overview.md) · [Database Overview](Database Overview.md)

`core/storage/` fully decouples the application from any specific database driver — no repository, service, or route contains database-specific logic.

```
core/storage/
  __init__.py          Public API + backward-compat shim (init(), list_devices(), ...)
  provider.py           StorageProvider ABC, HealthCheckResult, ProviderCapabilities, ProviderMetadata
  config.py             DatabaseConfig, AppConfig dataclasses
  factory.py             StorageFactory registry
  providers/
    sqlite.py            SQLiteProvider — fully functional
    postgresql.py        PostgreSQLProvider — scaffold
    mysql.py              MySQLProvider — scaffold
    sqlserver.py          SQLServerProvider — scaffold
```

## `StorageProvider` interface

Every provider implements: `initialize()`, `shutdown()` (idempotent), `get_engine()`, `get_session_factory()`, `health_check()` (non-raising, returns `HEALTHY`/`DEGRADED`/`UNHEALTHY` + latency), `get_metadata()`, `get_capabilities()`.

## Provider status

| Name | Class | Status |
|---|---|---|
| `sqlite` | `SQLiteProvider` | Fully functional, the default |
| `postgresql` / `postgres` | `PostgreSQLProvider` | Scaffold — `initialize()` raises `NotImplementedError` |
| `mysql` | `MySQLProvider` | Scaffold |
| `sqlserver` / `mssql` | `SQLServerProvider` | Scaffold |

Scaffold providers are interface-compliant (`get_metadata()`/`get_capabilities()` work without a live connection; `health_check()` returns `UNHEALTHY` with `{"scaffold": True}`, never raises) — this makes feature-detection UIs possible before a backend is actually implemented.

## Dependency injection

`ServiceContainer` (`core/container.py`) is the single wiring point: builds the `StorageProvider` via `StorageFactory.create(config.database)`, calls `initialize()`, then constructs every repository with that provider injected via the constructor. FastAPI resolves the container per request via `Depends(get_container)` (`api/dependencies.py`), which reads `request.app.state.container`.

## Session management

Per-operation sessions via a context manager — no session is held between calls or shared across repos/services:

```python
with Session(self._engine) as session:
    ...
    session.commit()
```

## Adding a new provider

1. Implement the `StorageProvider` ABC in `core/storage/providers/<name>.py`.
2. Export it from `core/storage/providers/__init__.py`.
3. Register it in `core/storage/factory.py::_register_builtins()`.
4. Add tests in `tests/storage/` (see `test_sqlite_provider.py` as the template).
5. Add the driver to `requirements.txt` and regenerate the offline wheelhouse (see [Air-Gap Deployment](../deployment/Air-Gap Deployment.md)).

No existing repository or service code changes — that's the point of the abstraction.

## Technical debt (from `docs/storage-architecture.md`)

- **High priority:** implement real PostgreSQL/MySQL/SQL Server providers (scaffolds are fully wired; only `initialize()`/`get_engine()`/`get_session_factory()` need real bodies). Async support (`AsyncStorageProvider`) is unbuilt.
- **Medium:** `DatabaseConfig.connection_url` has no scheme validation against the declared provider; `health_check()` doesn't expose pool statistics; no config hot-reload.
- **Low:** the backward-compat shim functions in `core/storage/__init__.py` (`list_devices()`, `upsert_device()`, etc.) should be dropped once nothing calls them directly.

See [Technical Debt](../development/Technical Debt.md) for the consolidated, prioritized list.

## See also

[Database Overview](Database Overview.md) · [Backend Overview](Backend Overview.md) · [Production Deployment](../deployment/Production Deployment.md)
