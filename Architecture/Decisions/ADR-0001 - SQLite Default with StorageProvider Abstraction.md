# ADR-0001: SQLite as Default Storage, Behind a Swappable StorageProvider Abstraction

Parent: [[Architecture/Decisions/ADR Index|ADR Index]] · [[Backend/Storage Abstraction|Storage Abstraction]]

## Context

ConfigFoundry needs a database, but the project's "zero required backend dependencies beyond what's vendored" principle rules out requiring a database server to stand up before the app can even run — especially given the air-gap/locked-down deployment target, where standing up a separate managed database server may not be trivial or even permitted. At the same time, larger teams and multi-instance deployments will eventually need a real client-server database.

## Decision

Default to SQLite (built into Python, zero extra dependency, one file) behind a `StorageProvider` ABC that no repository, service, or route is allowed to bypass. PostgreSQL, MySQL, and SQL Server are implemented as interface-compliant scaffolds today — registered in `StorageFactory`, fully described via `get_metadata()`/`get_capabilities()`, but `initialize()` raises `NotImplementedError` until a real implementation lands.

## Consequences

**Positive:** a fresh clone runs with no database server to stand up; swapping providers touches zero service/repository code by design; scaffold providers make feature-detection UI possible before a backend is implemented.

**Negative:** SQLite's single-writer model means concurrent write-heavy workloads hit "database is locked" errors; multi-instance deployment is not validated end-to-end against SQLite; the PostgreSQL/MySQL/SQL Server scaffolds create an expectation gap — someone configuring `provider: postgresql` today gets a `NotImplementedError`, not a working database, until those are actually implemented (tracked in [[Roadmap Overview]] v0.7.0 for SQL Server specifically).

## Alternatives considered (inferred from the scaffold design itself)

Requiring PostgreSQL from day one was implicitly rejected — it would violate the "zero required backend dependencies" principle and complicate air-gapped/offline installs (a database server is a much heavier air-gap dependency than a single vendored Python wheel). An ORM-agnostic raw-SQL approach was also implicitly rejected in favor of SQLAlchemy 2.x, which gives dialect portability for free once real non-SQLite providers are implemented.

## See also

[[Backend/Storage Abstraction|Storage Abstraction]] · [[Database Overview]]
