# ADR-0004: Alembic-Based Migrations, Replacing the Custom sqlite3 System

Parent: [ADR Index](ADR Index.md) · [Database Overview](../architecture/Database Overview.md#migration-strategy)

## Context

ConfigFoundry originally shipped a hand-rolled sqlite3 migration system (`core/migrations_legacy.py`). Adding SQLAlchemy 2.x, a real ORM, and (eventually) multiple database backends made a custom, SQLite-only migration runner both a maintenance burden and a blocker to multi-database support — SQLite also doesn't support most `ALTER TABLE` forms directly, which any migration system targeting it must work around.

## Decision

Adopt Alembic, the standard SQLAlchemy migration toolkit, applied automatically at startup via `core/migrations/runner.py::run_migrations()`. The runner detects three states: fresh DB (no `alembic_version`, no app tables) -> `upgrade head`; legacy DB (no `alembic_version`, has app tables from the old system) -> `stamp head` without touching data; already-managed DB -> `upgrade head` (no-op or applies pending). SQLite's lack of direct `ALTER TABLE` support is handled via `op.batch_alter_table()` (a table-copy-rename dance, transparent to callers), used in every migration touching an existing table.

## Consequences

**Positive:** migration files use SQLAlchemy column types rather than dialect-specific SQL, so the same file generates correct DDL for SQLite, PostgreSQL, and MySQL without change — directly enabling [ADR-0001](ADR-0001 - SQLite Default with StorageProvider Abstraction.md)'s multi-provider goal; `alembic upgrade head --sql` gives DBA-reviewable SQL previews without execution, useful in change-controlled environments; startup is always safe to run (no-op if already current).

**Negative:** the old custom system (`core/migrations_legacy.py`) is kept in the tree as "reference only," which is a small but real piece of dead-weight code a new contributor might mistake for live — see [Technical Debt](../development/Technical Debt.md); two migrations exist so far (`0001_baseline_schema.py`, `0002_auth_and_security.py`) — the "never edit a shipped migration" discipline hasn't yet been tested against a large volume of accumulated migration files.

## Alternatives considered

Continuing to extend the custom sqlite3 system was rejected once multi-database support and a real ORM entered scope — reinventing what Alembic already solves (dependency-ordered revisions, autogenerate diffing, batch mode for SQLite) would be exactly the kind of "clever abstraction" the project's own principles discourage in favor of using a well-understood standard tool.

## See also

[Database Overview](../architecture/Database Overview.md#migration-strategy) · [Engineering Wiki](../development/Engineering Wiki.md)
