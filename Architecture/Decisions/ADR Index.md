# Architecture Decision Records — Index

Parent: [[Architecture Overview]]

Reconstructed from explicit rationale already documented in the codebase (module docstrings, `docs/*.md`), not from a formal ADR process in the repository — no `ADR-*.md` files exist in the source today. Each entry below cites where the reasoning is recorded in code/docs.

| ADR | Title | Status |
|---|---|---|
| [[Architecture/Decisions/ADR-0001 - SQLite Default with StorageProvider Abstraction|ADR-0001]] | SQLite as default storage, behind a swappable `StorageProvider` abstraction | Accepted, implemented |
| [[Architecture/Decisions/ADR-0002 - Permission-Code RBAC|ADR-0002]] | Permission-code RBAC instead of hardcoded role checks | Accepted, implemented |
| [[Architecture/Decisions/ADR-0003 - Air-Gap-First Architecture|ADR-0003]] | Air-gap-first architecture (vendored dependencies, self-hosted assets) | Accepted, implemented |
| [[Architecture/Decisions/ADR-0004 - Alembic Migrations|ADR-0004]] | Alembic-based migrations, replacing the custom sqlite3 migration system | Accepted, implemented; legacy system kept as reference only |
| [[Architecture/Decisions/ADR-0005 - Same-Origin Static Frontend|ADR-0005]] | Next.js static export served same-origin by FastAPI | Accepted, implemented |
| [[Architecture/Decisions/ADR-0006 - URL-Based API Versioning|ADR-0006]] | URL-based, router-per-version API versioning | Accepted, implemented (v1 only so far) |
| [[Architecture/Decisions/ADR-0007 - perm_version Token Invalidation|ADR-0007]] | `perm_version` stamp instead of a token blacklist | Accepted, implemented |

## See also

[[Architecture Overview]] · [[Development/Technical Debt|Technical Debt]]
