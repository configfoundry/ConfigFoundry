# Runbook: Troubleshooting

Parent: [[Operations]] · [[Security/Security Overview|Security Overview]]

## Startup

**"python3 not found" / Python 3.10+ required** — install Python 3.10+, ensure it's on `PATH`; `install_offline.sh` fails fast with this exact message.

**Blank page after login** — usually a Content-Security-Policy issue: check `script-src` includes `'unsafe-inline'` in `core/security/middleware.py` (Next.js's App Router hydration script requires it). See [[Security/Security Overview#Content-Security-Policy|Security Overview § Content-Security-Policy]].

**`/docs` or `/redoc` won't load, or loads unstyled** — both are self-hosted from `static/vendor/docs/`; check `swagger-ui-bundle.js`, `swagger-ui.css`, `redoc.standalone.js` exist and aren't truncated (`ls -la static/vendor/docs/`).

**Bootstrap admin password lost** — printed exactly once at first migration, never recoverable. If another admin exists, use `POST /api/v1/users/{id}/reset-password`; otherwise see [[Security/Security Overview#Recovering from a lost admin account|Security Overview § Recovering from a lost admin account]].

## Offline install

**`install_offline.sh` fails at "Offline install failed"** — `vendor/python/` likely lacks a wheel for this machine's exact platform/Python tags. Run `python3 -m pip debug --verbose` and compare against `vendor/python/CHECKSUMS.sha256`.

**Node.js not found and no `frontend/out/`** — a release bundle should always ship a pre-built `frontend/out/`; if installing from a source checkout instead, install Node 18+ for an offline rebuild from `vendor/npm/`, or copy a pre-built `frontend/out/` from another machine.

**`validate_airgap.py` fails on "external URL not in allowlist"** — a new `http(s)://` reference isn't allowlisted. Vendor the dependency if it's genuine, or add a comment-explained allowlist entry in `scripts/validate_airgap.py` if it's harmless (a doc link, an XML namespace URI).

## Authentication

**Every request returns 403 after login** — the account has zero permissions; this is deliberate, not a bug. Assign a role via `POST /api/v1/users/{id}/roles`.

**Logged out immediately after a role change** — expected: `perm_version` invalidates existing tokens immediately rather than waiting for natural expiry. Log in again.

**Locked out after failed attempts** — wait `CONFIGFOUNDRY_AUTH_LOCKOUT_MINUTES` (default 15) or have another admin reset the account.

**Every restart logs everyone out** — `CONFIGFOUNDRY_AUTH_JWT_SECRET` isn't set explicitly; set it, see [[Security/Secrets & Configuration|Secrets & Configuration]].

## Database

**"database is locked" (SQLite)** — SQLite allows one writer at a time; surfaces under concurrent write-heavy load from multiple processes. Reduce write concurrency or move to PostgreSQL.

**Migration fails / app won't start after upgrade** — check `alembic current` against the expected head; see [[Database Overview#Migration strategy]] and [[Deployment/Upgrade & Rollback|Upgrade & Rollback]] for the rollback path (restore the pre-upgrade backup).

## Still stuck

Attach the exact error message and either `python3 scripts/validate_airgap.py --skip-functional` output (install/offline issues) or the relevant `GET /api/v1/audit/search` entries (access/permission issues) when escalating.

## See also

[[Operations/Runbook - Monitoring & Health Checks|Runbook - Monitoring & Health Checks]] · [[Security/Security Overview|Security Overview]] · [[Database Overview]]
