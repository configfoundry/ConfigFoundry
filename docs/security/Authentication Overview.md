# Authentication

Parent: [Security Overview](Security Overview.md) · [Architecture Overview](../architecture/Architecture Overview.md)

## Request pipeline

```
Request -> Reverse Proxy (TLS) -> TrustedProxyMiddleware -> AccessPolicyMiddleware -> RateLimitMiddleware
  -> SecurityHeadersMiddleware -> CORS/CorrelationID/RequestLogging -> FastAPI route
  -> get_current_principal() -> require_permission("code") -> Route handler -> AuditRepository.log(...)
```

See [Request Flow](../architecture/Request Flow.md) for the full sequence diagram.

## Mechanisms

- **Password hashing:** Argon2id (`core/security/password.py`), OWASP's current recommendation. Parameters are embedded in the stored hash, so raising them later doesn't invalidate existing hashes — upgraded transparently on next login (`needs_rehash`).
- **Password policy:** NIST 800-63B-aligned — length over complexity theater, no forced periodic rotation; adaptive hashing + account lockout instead. Complexity toggles exist and are on by default for compliance auditors who expect to see them.
- **Tokens:** short-lived JWT access tokens (15 min default, `core/security/jwt_tokens.py`) + opaque, hashed, rotate-on-use refresh tokens (14 days default) with reuse detection — presenting an already-rotated refresh token revokes its entire token family (OAuth 2.0 Security BCP response to suspected theft).
- **Session invalidation without a blacklist:** every user carries a `perm_version` integer embedded in each access token. Role changes, forced logout, password changes, and deactivation increment it; `get_current_principal()` rejects any token whose embedded value doesn't match current. Effect: immediate revocation without a persistent token blacklist.
- **Account lockout:** configurable failed-attempt threshold (default 5), configurable lockout duration (default 15 min).
- **MFA:** TOTP (RFC 6238, `core/security/mfa.py`), QR-code enrollment with two-step confirm, 10 one-time backup codes at enrollment. Seeds are AES-256-GCM encrypted at rest via the audited `cryptography` package (`core/security/crypto.py`) — **not** `core/aesgcm.py`, which documents itself as unsuitable for security-critical use.
- **API keys:** for service accounts (e.g. SNMP collectors calling the API unattended). Hashed at rest, shown in full exactly once, optionally scoped by permission list, IP allowlist, and expiration.

## Data model

```
organizations -- users -- user_roles -- roles -- role_permissions -- permissions
                  |          |
                  |          +-- refresh_tokens
                  |          +-- mfa_backup_codes
                  |
                  +-- api_keys
                  +-- network_acls
```

Full field reference: [Database Overview](../architecture/Database Overview.md).

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `CONFIGFOUNDRY_AUTH_JWT_SECRET` | random per boot | HMAC signing secret — **set explicitly in production** |
| `CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY` | random per boot | AES-256-GCM key for MFA seed encryption — **set explicitly in production** |
| `CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL` | `admin@configfoundry.local` | First Super Admin email |
| `CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD` | random, printed once | First Super Admin password |
| `CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES` | none | CIDRs allowed to set `X-Forwarded-For` |
| `CONFIGFOUNDRY_AUTH_CORS_ORIGINS` | none (closed) | Allowed cross-origin origins |

Full table: [Secrets & Configuration](Secrets & Configuration.md).

## Bootstrapping the first admin

`0002_auth_and_security.py` seeds one Super Admin automatically. Set the bootstrap env vars before the very first startup, or a random password is generated and printed once to console/log (never stored in plaintext) with `must_change_password` set.

## Using the API

See [Auth Endpoints](../api/Auth Endpoints.md) for the full request/response reference. `/docs` and `/redoc` register a `BearerAuth` scheme — paste a token into Swagger's Authorize button (no `Bearer` prefix needed).

## Known scope boundaries

Restated from [Security Overview § Known scope boundaries](Security Overview.md#known-scope-boundaries): no external IdP/OIDC/SSO yet; per-process rate limiting; time-based access policies scaffolded, not enforced; multi-tenancy on the security layer only, not yet the inventory tables; GDPR-specific tooling not built.

## HTTPS

`SecurityHeadersMiddleware` always sends `Strict-Transport-Security` — inert over plain HTTP, active once TLS is terminated (typically at a reverse proxy — see [Production Deployment](../deployment/Production Deployment.md)).

## See also

[Authorization & RBAC](Authorization & RBAC.md) · [Feature - Authentication & MFA](../reference/features/Feature - Authentication & MFA.md) · [Auth Endpoints](../api/Auth Endpoints.md)
