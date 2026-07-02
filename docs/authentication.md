# Authentication, Authorization & Security

ConfigFoundry ships with a full authentication, RBAC, and Access Policy
Engine layer. This document covers the architecture, configuration, and
day-one operational steps (bootstrapping the first admin, issuing API
keys, etc.). For the SOC 2 control mapping, see
[`compliance-soc2.md`](./compliance-soc2.md).

---

## Request pipeline

```
Request
  │
  ▼
Reverse Proxy (TLS termination -- see "HTTPS" below)
  │
  ▼
TrustedProxyMiddleware        resolve real client IP (X-Forwarded-For,
  │                           only trusted from configured proxies)
  ▼
AccessPolicyMiddleware        IP allow/deny -- runs BEFORE authentication
  │                           (global rules only; per-org rules re-checked
  │                           once the caller's org is known)
  ▼
RateLimitMiddleware           per-IP throttling, stricter on /auth/login
  │
  ▼
SecurityHeadersMiddleware     HSTS, CSP, X-Frame-Options, etc.
  │
  ▼
CORS / CorrelationID / RequestLogging   (existing middleware, unchanged)
  │
  ▼
FastAPI route
  │
  ▼
get_current_principal()       JWT or API key -> Principal
  │
  ▼
require_permission("code")    RBAC check -- no hardcoded role names, ever
  │
  ▼
Route handler
  │
  ▼
AuditRepository.log(...)      every security-sensitive action recorded
```

Middleware registration order is in `app.py`; see the comment there for
why registration order is the reverse of execution order (Starlette
convention).

---

## Data model

```
organizations  ──┬── users ──┬── user_roles ──── roles ──── role_permissions ──── permissions
                  │           │
                  │           └── refresh_tokens
                  │           └── mfa_backup_codes
                  │
                  ├── api_keys
                  └── network_acls
```

All tables are defined in `models/auth.py`, created by
`alembic/versions/0002_auth_and_security.py`. The existing `audit_log`
table (`models/inventory.py`) was extended with nullable columns
(`org_id`, `source_ip`, `user_agent`, `resource_type`, `resource_id`,
`result`, `correlation_id`) rather than duplicated -- one audit trail for
both business-object changes and security events.

---

## Authentication

* **Password hashing**: Argon2id (`core/security/password.py`), OWASP's
  current recommendation. Parameters (time cost, memory cost,
  parallelism) are configurable and embedded in the stored hash, so
  raising them later doesn't invalidate existing hashes -- they're
  upgraded transparently on next successful login (`needs_rehash`).
* **Password policy**: NIST 800-63B-aligned -- length over complexity
  theatre, no forced periodic rotation, adaptive hashing + account
  lockout instead. Complexity toggles (mixed case / digit / symbol /
  common-password rejection) exist and are on by default because some
  compliance auditors expect to see them.
* **Tokens**: short-lived JWT access tokens (15 min default,
  `core/security/jwt_tokens.py`) + opaque, hashed, rotate-on-use refresh
  tokens (14 days default) with reuse detection -- presenting an
  already-rotated refresh token revokes its entire token family
  immediately (OAuth 2.0 Security BCP response to suspected theft).
* **Session invalidation without a blacklist**: every user row carries a
  `perm_version` integer, embedded in each access token. Role changes,
  forced logout, password changes, and account deactivation increment
  it; `get_current_principal` rejects any token whose `perm_version`
  doesn't match the current value. Effect: revocation is immediate, not
  "wait for the 15-minute token to expire," without needing a persistent
  token blacklist.
* **Account lockout**: configurable failed-attempt threshold (default 5)
  locks the account for a configurable duration (default 15 min).
* **MFA**: TOTP (RFC 6238, `core/security/mfa.py`), QR-code enrollment
  with a two-step confirm flow, 10 one-time backup codes generated at
  enrollment. MFA secrets are AES-256-GCM encrypted at rest
  (`core/security/crypto.py`, via the audited `cryptography` package --
  deliberately NOT `core/aesgcm.py`, which documents itself as
  unsuitable for anything security-critical).
* **API keys**: for service accounts / unattended scripts (e.g. SNMP
  collectors calling the API without a human login). Hashed at rest,
  shown in full exactly once at creation, optionally scoped by
  permission list, IP allowlist, and expiration.

---

## Authorization (RBAC)

Permissions are `<resource>:<action>` codes (full catalog in
`core/security/permissions.py`), never hardcoded role-name checks in
route handlers -- every protected route depends on
`require_permission("some:code")`. Five system roles are seeded with
sensible default grants (Super Admin, Organization Admin, Operator, Read
Only, Auditor); organizations may also define custom roles with any
combination of permissions via `POST /api/v1/roles`.

Newly created users hold **zero permissions** until explicitly assigned a
role -- there is no implicit access "just because an account exists."

---

## Access Policy Engine

Runs before authentication (see pipeline above). IP allow/deny rules
(`NetworkACL`, `core/services/policy_engine.py`) use first-match-wins
evaluation ordered by `priority` (lower = evaluated first): the first
rule whose CIDR contains the request IP decides the outcome. If nothing
matches, the scope defaults to permissive UNLESS at least one `allow`
rule exists for that scope, in which case presence of an allow rule
signals "allowlist mode" and anything unmatched is denied by default.
IPv4 and IPv6 both supported (stdlib `ipaddress`, no dependency).

**Not yet enforced**: time-based access windows (maintenance windows /
business hours) -- `PolicyEngine.evaluate_time_window()` exists as an
extension point but always allows. Flagged here rather than silently
absent.

---

## Configuration

All settings are environment-variable driven (`CONFIGFOUNDRY_AUTH_*`),
mirroring the existing `CONFIGFOUNDRY_DB_*` / `CONFIGFOUNDRY_LOG_*`
convention. Full reference in `core/security/config.py`'s module
docstring. The most important ones for a production deployment:

| Variable | Purpose | Default |
|---|---|---|
| `CONFIGFOUNDRY_AUTH_JWT_SECRET` | HMAC signing secret | randomly generated at startup (dev-only; **set explicitly in production** or every restart invalidates all sessions) |
| `CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY` | base64, 32 bytes -- encrypts MFA seeds at rest | randomly generated at startup (same caveat) |
| `CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL` | first Super Admin's email | `admin@configfoundry.local` |
| `CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD` | first Super Admin's password | randomly generated, printed once to the server log at first migration |
| `CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES` | comma-separated CIDRs allowed to set X-Forwarded-For | none |
| `CONFIGFOUNDRY_AUTH_CORS_ORIGINS` | comma-separated allowed origins | none (CORS closed by default) |

---

## Bootstrapping the first admin

The auth migration (`0002_auth_and_security.py`) seeds one Super Admin
user automatically. Set `CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL` and
`CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD` before the very first startup to
control the credentials; otherwise a random password is generated and
printed once to the console/log (never stored in plaintext, never a
hardcoded `admin`/`admin` credential shipped in code) and the account is
flagged `must_change_password`.

---

## Using the API

```
POST /api/v1/auth/login              {email, password} -> tokens, or {mfa_required, mfa_token}
POST /api/v1/auth/mfa/verify         {mfa_token, code}  -> tokens
POST /api/v1/auth/refresh            {refresh_token}    -> new tokens (old one rotated out)
POST /api/v1/auth/logout             {refresh_token}
POST /api/v1/auth/logout-all
GET  /api/v1/auth/me
POST /api/v1/auth/password/change
POST /api/v1/auth/mfa/enroll/begin   -> {secret, provisioning_uri}
POST /api/v1/auth/mfa/enroll/confirm {secret, code} -> {backup_codes}

GET/POST            /api/v1/users
PATCH/DELETE         /api/v1/users/{id}
POST/DELETE          /api/v1/users/{id}/roles[/{role_id}]
POST                 /api/v1/users/{id}/reset-password

GET/POST             /api/v1/roles
GET                  /api/v1/permissions
PATCH                /api/v1/roles/{id}/permissions
DELETE               /api/v1/roles/{id}

GET/POST/DELETE      /api/v1/api-keys[/{id}]

GET/POST/DELETE      /api/v1/policies/network-acls[/{id}]
PATCH                /api/v1/policies/network-acls/{id}/enabled
```

All existing business endpoints (devices, bandwidth, subnets, tags,
lists, generate, audit, history, meta, export) now require the
appropriate permission -- the API is no longer open by default.
Send `Authorization: Bearer <access_token>` (user login) or
`Authorization: Bearer cfk_live_...` (API key) on every request.

### Interactive docs (Swagger UI / ReDoc)

`/docs` and `/redoc` are registered as a `BearerAuth` HTTP security scheme
in the OpenAPI document, so every protected route shows a lock icon and
Swagger UI exposes an **Authorize** button. Paste either a JWT access
token or an API key there (no `Bearer` prefix needed -- Swagger adds it)
and "Try it out" will send it on every subsequent request from that tab.

---

## Known scope boundaries

Stated plainly so nothing here is a surprise later:

* **Multi-tenancy**: the `Organization` model and the entire security
  layer (users, roles, API keys, policies, audit) are fully org-scoped
  and ready for multiple tenants. The pre-existing business tables
  (devices, bandwidth, subnets, tags, lists, history) are **not** yet
  retrofitted with `org_id` -- they remain single-tenant, scoped
  implicitly to one seeded "default" organization. Retrofitting those
  tables is a larger, separate migration touching all 8 existing
  services and was out of scope for this pass.
* **External IdP / OIDC / SSO**: not implemented. The token/claims model
  is compatible with adding it later (an external identity would map to
  the same `User` + `perm_version` + RBAC machinery) but no OIDC client
  code exists yet.
* **Rate limiting**: in-memory, per-process (`core/security/rate_limit.py`).
  Fine for a single-process deployment; if ConfigFoundry is ever run as
  multiple replicas without sticky sessions, each replica enforces its
  own independent limit. Swapping in a Redis-backed limiter behind the
  same interface would need no other code changes.
* **Time-based access policies**: scaffolded, not enforced (see Access
  Policy Engine section above).
* **GDPR-specific features** (data export/erasure endpoints, consent
  tracking): the audit trail and RBAC foundation support adding these,
  but they are not built in this pass -- SOC 2 was the primary target.

---

## HTTPS

`SecurityHeadersMiddleware` always sends `Strict-Transport-Security` --
it's inert over plain HTTP and takes effect once TLS is terminated
(typically at a reverse proxy in front of this app, which is also where
`CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES` becomes relevant for correct client
IP resolution).
