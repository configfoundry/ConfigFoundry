# Security

This page is the single entry point for ConfigFoundry's security model.
It summarizes and cross-links the detail that lives in
[Authentication](./authentication.md), [Authorization](./authorization.md),
[RBAC](./rbac.md), and [compliance-soc2.md](./compliance-soc2.md), and
adds the pieces that don't belong in any one of those: the CSP design,
the vulnerability reporting process, and account-recovery procedures.

## Threat model, briefly

ConfigFoundry assumes it is deployed on a trusted internal network
segment or behind a reverse proxy handling TLS, and that the operator
controls who gets an account. It is not designed to be exposed directly
to the public internet without a reverse proxy in front of it. Within
that assumption, the security layer defends against: credential theft
(short-lived tokens, MFA, Argon2id hashing), privilege escalation
(explicit permission grants, no implicit access), session hijacking
(refresh token rotation with reuse detection), and unauthorized network
access (the IP-based Access Policy Engine).

## Authentication summary

Argon2id password hashing, short-lived JWT access tokens (15 min
default) with rotate-on-use refresh tokens (14 days default) that detect
reuse and revoke the entire token family if an already-rotated token is
presented, TOTP-based MFA with encrypted-at-rest seeds, and API keys for
service accounts. Full detail: [Authentication](./authentication.md).

## Authorization summary

Every protected route depends on a permission code
(`require_permission("resource:action")`), never a hardcoded role name.
New accounts start with zero permissions. Role changes take effect
immediately via a `perm_version` check, without needing a token
blacklist. Full detail: [Authorization](./authorization.md), full
permission catalog: [RBAC](./rbac.md).

## Content-Security-Policy

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'
```

Applied uniformly to every response by `SecurityHeadersMiddleware`
(`core/security/middleware.py`). Same-origin only — no CDN allowlisting
anywhere, which the air-gap requirement forced and which happens to also
be the stricter, more defensible policy: everything the frontend and the
`/docs`/`/redoc` pages need is self-hosted (see
[Air-Gap Deployment](./airgap.md)).

The one relaxation is `'unsafe-inline'` on `script-src`, required
because Next.js's App Router embeds its hydration payload in an inline
`<script>` tag — this is a framework constraint, not a choice made for
convenience, and it does not weaken the policy against loading
*external* script sources, which remains fully locked to `'self'`.

## Other security headers

Alongside CSP, every response gets `Strict-Transport-Security`,
`X-Frame-Options: DENY` (belt-and-suspenders alongside
`frame-ancestors 'none'`), and standard MIME-sniffing protection. HSTS
is inert over plain HTTP and takes effect once TLS is terminated at your
reverse proxy — see [Deployment](./deployment.md).

## Rate limiting

Per-IP, in-memory, stricter on `/auth/login` and `/auth/mfa/*`
(`CONFIGFOUNDRY_AUTH_RATE_LIMIT_LOGIN`, default `10/60`).

> [!NOTE]
> Known limitation: this is per-process, so a multi-instance deployment
> enforces independent limits per instance rather than one shared global
> limit — see [Authentication § Known scope boundaries](./authentication.md#known-scope-boundaries).

## Audit trail

Every security-relevant event (login, MFA change, role change, API key
lifecycle, policy change) and every business-data mutation is recorded
via `AuditRepository.log(...)`, queryable at
`GET /api/v1/audit/search` (requires `audit:read`). Nothing is
auto-purged — plan storage growth accordingly if retention matters for
your compliance requirements.

## Recovering from a lost admin account

If the bootstrap Super Admin's credentials are lost and no other admin
account exists:

1. If you have direct database access, the cleanest path is a small,
   deliberate script using the same `core/security/password.py` Argon2id
   hasher to set a new password hash directly on the user row — do this
   once, out-of-band, not as a supported CLI command (there isn't one,
   by design, to avoid shipping a built-in backdoor).
2. Alternatively, delete the database and let ConfigFoundry re-bootstrap
   on next startup.
3. For a production deployment, avoid this scenario entirely: always
   have at least two Super Admin or Organization Admin accounts.

> [!WARNING]
> Step 2 is a last resort, not a first one — deleting the database means
> losing all existing inventory and security data, with no way back.

## Known scope boundaries

> [!IMPORTANT]
> Restated here from [Authentication](./authentication.md) since they're
> security-relevant: no external IdP/OIDC/SSO integration yet; rate
> limiting is per-process, not distributed; time-based (business-hours)
> access policies are scaffolded but not enforced; multi-tenancy covers
> the security layer but not yet the inventory tables. None of these are
> silently absent — each is called out explicitly so a deployer can
> decide whether it matters for their environment.

## Reporting a vulnerability

See [SECURITY.md](../SECURITY.md) in the repository root — report
privately (GitHub's private security advisory feature, or the
maintainer directly), never as a public issue.
