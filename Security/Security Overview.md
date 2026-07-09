# Security Overview

Parent: [[Repository Overview]] · [[Architecture Overview]]

Single entry point for ConfigFoundry's security model — cross-links [[Security/Authentication|Authentication]], [[Security/Authorization & RBAC|Authorization & RBAC]], [[Security/RBAC Permission Catalog|RBAC Permission Catalog]], [[Security/Access Policy Engine|Access Policy Engine]], and [[Security/SOC 2 Compliance Mapping|SOC 2 Compliance Mapping]].

## Threat model, briefly

ConfigFoundry assumes deployment on a trusted internal network segment or behind a reverse proxy handling TLS, with the operator controlling who gets an account — it is not designed to be exposed directly to the public internet unfronted. Within that assumption it defends against: credential theft (short-lived tokens, MFA, Argon2id hashing), privilege escalation (explicit permission grants, no implicit access), session hijacking (refresh-token rotation with reuse detection), and unauthorized network access (the IP-based Access Policy Engine).

## Content-Security-Policy

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'
```

Applied uniformly by `SecurityHeadersMiddleware` (`core/security/middleware.py`). Same-origin only, no CDN allowlisting anywhere — forced by the air-gap requirement, and incidentally the stricter, more defensible policy. The one relaxation, `'unsafe-inline'` on `script-src`, is required because Next.js's App Router embeds its hydration payload in an inline `<script>` tag — a framework constraint, not a convenience choice, and it does not weaken the policy against loading *external* script sources.

## Other headers

`Strict-Transport-Security` (inert over plain HTTP, active once TLS is terminated at the reverse proxy), `X-Frame-Options: DENY` (belt-and-suspenders alongside `frame-ancestors 'none'`), standard MIME-sniffing protection.

## Rate limiting

Per-IP, in-memory, stricter on `/auth/login` and `/auth/mfa/*` (`CONFIGFOUNDRY_AUTH_RATE_LIMIT_LOGIN`, default `10/60`).

> [!NOTE]
> **Known limitation:** per-process — a multi-instance deployment enforces independent limits per instance, not one shared global limit. A Redis-backed limiter behind the same interface is a documented future step (v0.8.x, see [[Roadmap Overview]]).

## Audit trail

Every security-relevant event (login, MFA change, role change, API key lifecycle, policy change) and every business-data mutation is recorded via `AuditRepository.log(...)`, queryable at `GET /api/v1/audit/search` (requires `audit:read`). Nothing is auto-purged — plan storage growth accordingly for compliance retention requirements. See [[Database Overview]] for the `audit_log` schema.

## Recovering from a lost admin account

1. With direct database access: a small, deliberate one-off script using `core/security/password.py`'s Argon2id hasher to set a new password hash directly — not a supported CLI command by design (avoids shipping a built-in backdoor).
2. Otherwise: delete the database and let ConfigFoundry re-bootstrap on next startup — **last resort**, loses all existing data.
3. For production: always maintain at least two Super Admin/Organization Admin accounts to avoid this scenario.

## Known scope boundaries

> [!IMPORTANT]
> Stated explicitly, not silently absent: no external IdP/OIDC/SSO integration yet (planned v0.7.0); rate limiting is per-process, not distributed; time-based (business-hours) access policies are scaffolded (`PolicyEngine.evaluate_time_window()`) but always return "allowed"; multi-tenancy covers the security layer but not yet the inventory tables (`devices`/`bandwidth_caps`/`subnets`/`tag_defs`/`lists`/`yaml_history`). See [[Roadmap Overview]] for when each closes.

## Vulnerabilities & recommendations

Assessed from the codebase, not a formal pentest — treat as a starting point, not a certification.

| Area | Observation | Recommendation |
|---|---|---|
| Secrets defaults | `CONFIGFOUNDRY_AUTH_JWT_SECRET` and `CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY` default to a random value regenerated every restart in dev | **Must** be set explicitly before production go-live — see [[Security/Secrets & Configuration\|Secrets & Configuration]] and [[Deployment/Production Deployment\|Production Deployment]] pre-go-live checklist |
| `X-Forwarded-For` trust | If `CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES` is unset or overly broad, a client can spoof its own IP and bypass the Access Policy Engine | Set to exactly the reverse proxy's CIDR, never `0.0.0.0/0` |
| Rate limiting scope | In-memory/per-process — doesn't protect a multi-instance deployment as one unit | Acceptable for the documented single-instance topology; revisit before scaling horizontally |
| `core/aesgcm.py` | Hand-rolled AES-GCM implementation exists in the codebase, explicitly documented in its own docstring as not constant-time / unsuitable for security-critical use | Confirmed unused for MFA/secret encryption (that uses the audited `cryptography` package instead) — but its mere presence is a risk if a future contributor reaches for it by mistake; consider removing or renaming it out of the security-adjacent namespace, see [[Development/Technical Debt\|Technical Debt]] |
| Legacy `api/*.py` routes | Unversioned route files sibling to `api/v1/` predate the auth layer in spirit; confirm they are genuinely unmounted (not imported by `app.py`) rather than a live, unauthenticated backdoor | Verify and delete/archive — see [[Development/Technical Debt\|Technical Debt]] |
| Legacy `static/` frontend | Predates the authentication layer — its API client sends no bearer token | Only a risk if ever served alongside the authenticated Next.js frontend; today the two are mutually exclusive by design (`app.py` serves one or the other), so low risk as-is, but worth a defense-in-depth note for anyone modifying `create_app()`'s static-mount logic |
| No `/health` endpoint | `/openapi.json` is used as a liveness substitute — unauthenticated but low-information | Low risk; tracked for v0.6.0 |
| GDPR-specific controls | Not built (data export/erasure, consent tracking) | Not committed to a timeline; audit trail and RBAC foundation support adding later — see [[Security/SOC 2 Compliance Mapping\|SOC 2 Compliance Mapping]] |

## Reporting a vulnerability

Report privately (GitHub's private security advisory feature, or the maintainer directly) — never as a public issue. See `SECURITY.md` in the repository root.

## See also

[[Security/Authentication|Authentication]] · [[Security/Authorization & RBAC|Authorization & RBAC]] · [[Security/RBAC Permission Catalog|RBAC Permission Catalog]] · [[Security/Access Policy Engine|Access Policy Engine]] · [[Security/Secrets & Configuration|Secrets & Configuration]] · [[Security/SOC 2 Compliance Mapping|SOC 2 Compliance Mapping]]
