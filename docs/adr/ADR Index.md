# Architecture Decision Records — Index

Parent: [Architecture Overview](../architecture/Architecture Overview.md)

Reconstructed from explicit rationale already documented in the codebase (module docstrings, `docs/*.md`), not from a formal ADR process in the repository — no `ADR-*.md` files exist in the source today. Each entry below cites where the reasoning is recorded in code/docs.

| ADR | Title | Status |
|---|---|---|
| [ADR-0001](ADR-0001 - SQLite Default with StorageProvider Abstraction.md) | SQLite as default storage, behind a swappable `StorageProvider` abstraction | Accepted, implemented |
| [ADR-0002](ADR-0002 - Permission-Code RBAC.md) | Permission-code RBAC instead of hardcoded role checks | Accepted, implemented |
| [ADR-0003](ADR-0003 - Air-Gap-First Architecture.md) | Air-gap-first architecture (vendored dependencies, self-hosted assets) | Accepted, implemented |
| [ADR-0004](ADR-0004 - Alembic Migrations.md) | Alembic-based migrations, replacing the custom sqlite3 migration system | Accepted, implemented; legacy system kept as reference only |
| [ADR-0005](ADR-0005 - Same-Origin Static Frontend.md) | Next.js static export served same-origin by FastAPI | Accepted, implemented |
| [ADR-0006](ADR-0006 - URL-Based API Versioning.md) | URL-based, router-per-version API versioning | Accepted, implemented (v1 only so far) |
| [ADR-0007](ADR-0007 - perm_version Token Invalidation.md) | `perm_version` stamp instead of a token blacklist | Accepted, implemented |
| [ADR-0008](ADR-0008 - Platform Adapter Architecture.md) | Platform Adapter architecture — vendor-neutral MonitoringConfiguration + pluggable monitoring platforms | Accepted, implemented |

## See also

[Architecture Overview](../architecture/Architecture Overview.md) · [Technical Debt](../development/Technical Debt.md)
