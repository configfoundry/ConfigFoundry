# SOC 2 Compliance Mapping

Parent: [[Security/Security Overview|Security Overview]]

Maps the authentication/RBAC/policy layer to the SOC 2 Security ("Common Criteria") Trust Services Criteria most relevant to an access-control layer. This is a mapping to the codebase, **not a certification** — a SOC 2 audit also covers organizational controls (background checks, vendor management, physical security, change management) that no application code can satisfy alone.

| Control | Description | Implementation | Evidence |
|---|---|---|---|
| CC6.1 | Logical access restricted via authentication | JWT + Argon2id, MFA (TOTP), API keys for service accounts | `core/security/`, `core/services/auth_service.py` |
| CC6.1 | Access removed/modified promptly | `perm_version` invalidates outstanding tokens immediately | `core/services/user_service.py::set_active`, `api/dependencies.py::get_current_principal` |
| CC6.2 | New accounts authorized before access granted | Admin-invite model, zero permissions until explicitly assigned | `core/services/auth_service.py::create_user` |
| CC6.3 | Access is role-based, least privilege | Fine-grained permission codes, never hardcoded role checks | `core/security/permissions.py`, `api/dependencies.py::require_permission` |
| CC6.3 | Access grants are reviewable | `GET /api/v1/users`, `GET /api/v1/roles`, `GET /api/v1/roles/{id}` | `api/v1/users.py`, `api/v1/roles.py` |
| CC6.6 | Boundary protection against unauthorized network access | IP allow/deny (CIDR, IPv4+IPv6), evaluated before auth; trusted-proxy-aware IP resolution | `core/services/policy_engine.py`, `core/security/ip.py`, `core/security/middleware.py` |
| CC6.6 | Brute-force / credential-stuffing protection | Account lockout, per-IP rate limiting (stricter on login) | `core/services/auth_service.py::_register_failed_login`, `core/security/rate_limit.py` |
| CC6.7 | Sensitive data protected in transit/at rest | HSTS + security headers; Argon2id hashing; AES-256-GCM MFA seed encryption (audited library, not the hand-rolled one) | `core/security/middleware.py`, `core/security/password.py`, `core/security/crypto.py` |
| CC6.7 | Credentials never stored/transmitted in recoverable plaintext | Refresh tokens and API keys SHA-256-hashed, shown once | `core/security/tokens.py` |
| CC6.8 | Protection against session hijacking/replay | Refresh-token rotation with reuse detection — theft-and-reuse revokes the entire token family | `core/services/auth_service.py::refresh` |
| CC7.2 | Security events logged for monitoring | Every auth/RBAC/policy action logged with timestamp, actor, org, IP, user agent, resource, result, correlation ID | `models/inventory.py::AuditLogModel`, all `*_service.py` audit calls |
| CC7.2 | Logs are tamper-evident / append-only | No update/delete API surface on the audit log — write-once, read via `list_recent`/`search` only | `core/repositories/sqlalchemy/audit.py` |
| CC7.3 | Security events searchable for incident investigation | `GET /api/v1/audit/search` filters by actor, action, result, org, time range | `api/v1/audit.py` |
| CC7.3 | Requests traceable end-to-end | Correlation ID propagated from middleware into every audit entry and log line | `core/logging/middleware.py` |
| CC6.1 | No hardcoded default credentials | Bootstrap Super Admin password is operator-supplied or randomly generated + printed once, never a literal `admin`/`admin` | `alembic/versions/0002_auth_and_security.py::_seed` |

## Explicitly out of scope for this pass

**HIPAA- and PCI-DSS-specific controls were not implemented** (PCI's mandatory MFA-for-all-admin-access, 90-day rotation; HIPAA's automatic session logoff, minimum-necessary access reviews) — only SOC 2, with the architecture left modular enough to add them without redesign. Treat any HIPAA/PCI-touching deployment as needing further review, not as covered by this mapping. GDPR-specific tooling (export/erasure endpoints, consent tracking) is similarly not built — see [[Security/Security Overview#Known scope boundaries|Security Overview § Known scope boundaries]].

## See also

[[Security/Security Overview|Security Overview]] · [[Deployment/Production Deployment|Production Deployment]] (pre-go-live checklist)
