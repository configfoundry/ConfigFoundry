# Troubleshooting

## Startup

**"python3 not found" / "Python 3.10+ required"**
Install Python 3.10 or newer and ensure it's on `PATH`. Check with
`python3 --version`. `install_offline.sh` fails fast with this exact
message rather than a stack trace further in.

**Server starts but the browser tab shows a blank page**
This was a real bug class during development, root-caused to the
Content-Security-Policy being stricter than what the frontend actually
needs. If you're running a build predating that fix, or you've
customized the CSP in `core/security/middleware.py`, check that
`script-src` includes `'unsafe-inline'` — Next.js's App Router embeds an
inline hydration `<script>` tag that a stricter policy silently blocks
with no visible error except a blank page. See
[Security § Content-Security-Policy](../security/security.md#content-security-policy).

**`/docs` or `/redoc` won't load, or loads with missing styling**
Both pages are fully self-hosted (`static/vendor/docs/`) specifically so
this doesn't depend on CDN access. If they're broken, check that
`static/vendor/docs/swagger-ui-bundle.js`, `swagger-ui.css`, and
`redoc.standalone.js` exist and aren't truncated
(`ls -la static/vendor/docs/` — compare sizes against a known-good
release). A truncated download during a build interruption is the most
likely cause if this ever regresses.

**Bootstrap admin password wasn't printed / I lost it**
It's printed exactly once, to the console/log, at first migration —
never stored in plaintext anywhere and not recoverable. If you missed
it and the account still has `must_change_password` set with no known
password, use another Super Admin account to call
`POST /api/v1/users/{id}/reset-password`, or, if this is truly the only
admin account and you have direct database access, see
[Security § Recovering from a lost admin account](../security/security.md).

## Offline install

**`install_offline.sh` fails at "Offline install failed"**
Usually means `vendor/python/` doesn't contain a wheel matching this
exact machine's platform/Python version tags. Run
`python3 -m pip debug --verbose` to see this machine's compatible tags
and compare against `vendor/python/CHECKSUMS.sha256`. See
[Air-Gap Deployment § Targeting a different platform](airgap.md#targeting-a-different-platform).

**`install_offline.sh` says Node.js not found and no `frontend/out/`**
The release bundle should always ship a pre-built `frontend/out/`,
making Node unnecessary. If you're working from a source checkout
instead of a release bundle and `frontend/out/` genuinely isn't there,
either install Node 18+ and let the script attempt an offline rebuild
from `vendor/npm/`, or copy a pre-built `frontend/out/` over from a
machine that has one.

**`scripts/validate_airgap.py` fails on "external URL not in allowlist"**
A new file added a `http://`/`https://` reference that isn't in
`ALLOWED_URL_SUBSTRINGS`. If it's a genuine CDN/remote-asset dependency,
vendor it instead (see [Air-Gap Deployment](airgap.md)). If it's a
harmless reference that's never actually fetched (a doc link, an XML
namespace URI), add it to the allowlist in
`scripts/validate_airgap.py` with a comment explaining why it's safe.

## Authentication

**Logged in but every request returns 403**
The account has zero permissions — new users start with none until a
role is explicitly assigned (`POST /api/v1/users/{id}/roles`). This is
deliberate, not a bug — see [RBAC](../security/rbac.md).

**Getting logged out immediately after a role change**
Expected behavior — `perm_version` is bumped on role changes, which
invalidates existing access tokens immediately rather than waiting for
natural expiry. Log in again to get a token reflecting the new
permissions. See [Authorization § Immediate revocation](../security/authorization.md).

**Locked out after failed login attempts**
Wait out `CONFIGFOUNDRY_AUTH_LOCKOUT_MINUTES` (default 15), or have
another admin reset the account. Threshold and duration are both
configurable — see [Configuration](../reference/configuration.md).

**Every restart logs everyone out**
`CONFIGFOUNDRY_AUTH_JWT_SECRET` isn't set, so a new random one is
generated on every startup, invalidating all previously issued tokens.
Set it explicitly — see [Configuration § Set this in production](../reference/configuration.md#authentication-security-configfoundry_auth_).

## Database

**"database is locked" errors under SQLite**
SQLite allows only one writer at a time. This surfaces under
concurrent write-heavy load from multiple processes/instances pointed
at the same file. Either reduce write concurrency, or move to
PostgreSQL — see [Storage](../architecture/storage.md).

**Migration didn't apply / app won't start after upgrade**
Migrations run automatically at startup and should never require a
manual step. If startup fails with a migration error, check
`alembic current` against the expected head for the version you're
upgrading to, and see [Migrations](../architecture/migrations.md) and
[Upgrade Guide](upgrade.md) for the safe rollback path (restore the
pre-upgrade backup `upgrade_offline.sh` creates automatically).

## Still stuck

Check [FAQ](../getting-started/faq.md) for shorter, more specific questions, or open an
issue with the exact error message and the output of
`python3 scripts/validate_airgap.py --skip-functional` (for
install/offline issues) or the relevant `GET /api/v1/audit/search`
entries (for access/permission issues) attached.
