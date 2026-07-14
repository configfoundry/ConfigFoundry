# SOC 2 Control Mapping

This maps ConfigFoundry's authentication/RBAC/policy layer to the SOC 2
Security ("Common Criteria") Trust Services Criteria most relevant to an
access-control layer. It is a mapping to *this codebase*, not a
certification -- a SOC 2 audit also covers organizational controls
(background checks, vendor management, physical security, change
management process, etc.) that no application code can satisfy on its
own. Treat this as the evidence index an auditor would ask for regarding
"how does the application enforce access control and log security
events."

The architecture is intentionally modular (Access Policy Engine,
Authentication, and Authorization are separate layers -- see
[`authentication.md`](authentication.md)) so **GDPR-specific controls
can be layered on later** (data export/erasure endpoints, consent
tracking) without touching the authentication or RBAC internals. Not
built in this pass; the audit trail and per-user data model already
support it.

| Control | Description | Implementation | Evidence |
|---|---|---|---|
| CC6.1 | Logical access is restricted via authentication | JWT + Argon2id password hashing, MFA (TOTP), API keys for service accounts | `core/security/`, `core/services/auth_service.py` |
| CC6.1 | Access removed/modified promptly when no longer needed | `perm_version` invalidates all outstanding tokens immediately on deactivation, role change, or forced logout -- not "wait for token expiry" | `core/services/user_service.py::set_active`, `api/dependencies.py::get_current_principal` |
| CC6.2 | New accounts are authorized before access is granted | Admin-invite model (no open self-registration); accounts hold zero permissions until explicitly assigned a role | `core/services/auth_service.py::create_user`, `docs/authentication.md` |
| CC6.3 | Access is role-based and follows least privilege | Fine-grained permission codes (`core/security/permissions.py`), never a hardcoded role-name check in a route; five system roles plus unlimited custom roles | `core/security/permissions.py`, `api/dependencies.py::require_permission` |
| CC6.3 | Access grants are reviewable | `GET /api/v1/users`, `GET /api/v1/roles`, `GET /api/v1/roles/{id}` expose current grants for review | `api/v1/users.py`, `api/v1/roles.py` |
| CC6.6 | Boundary protection against unauthorized network access | Access Policy Engine: IP allow/deny (CIDR, IPv4+IPv6), evaluated before authentication; trusted-proxy-aware IP resolution prevents X-Forwarded-For spoofing | `core/services/policy_engine.py`, `core/security/ip.py`, `core/security/middleware.py` |
| CC6.6 | Brute-force / credential-stuffing protection | Account lockout after N failed attempts (configurable), per-IP rate limiting with a stricter bucket on `/auth/login` | `core/services/auth_service.py::_register_failed_login`, `core/security/rate_limit.py` |
| CC6.7 | Sensitive data protected in transit and at rest | HSTS + secure headers enforced (`SecurityHeadersMiddleware`); passwords Argon2id-hashed (irreversible); MFA seeds AES-256-GCM encrypted (audited `cryptography` library, not the project's hand-rolled AES module) | `core/security/middleware.py`, `core/security/password.py`, `core/security/crypto.py` |
| CC6.7 | Credentials never stored or transmitted in recoverable plaintext | Refresh tokens and API keys are SHA-256-hashed at rest, shown to the caller exactly once at issuance | `core/security/tokens.py` |
| CC6.8 | Protection against session hijacking / token replay | Refresh-token rotation-on-use with reuse detection: a stolen-and-reused token revokes the entire token family | `core/services/auth_service.py::refresh` |
| CC7.2 | Security events are logged for monitoring | Every auth/RBAC/policy action logged with timestamp, actor, org, source IP, user agent, resource, result, and correlation ID | `models/inventory.py::AuditLogModel`, all `*_service.py` audit calls |
| CC7.2 | Logs are tamper-evident / append-only | Audit log has no update/delete API surface -- write-once via `IAuditRepository.log()`, read via `list_recent`/`search` only | `core/repositories/sqlalchemy/audit.py` |
| CC7.3 | Security events are searchable for incident investigation | `GET /api/v1/audit/search` filters by actor, action, result, org, and time range | `api/v1/audit.py` |
| CC7.3 | Requests are traceable end-to-end | Correlation ID propagated from HTTP middleware into every audit entry and log line for a given request | `core/logging/middleware.py`, `RequestContext.correlation_id` |
| CC6.1 | No hardcoded default credentials ship in the codebase | Bootstrap Super Admin password is either operator-supplied via env var or randomly generated and printed once, never a literal `admin`/`admin` in source | `alembic/versions/0002_auth_and_security.py::_seed` |

## Explicitly out of scope for this pass

Per the original build request: **HIPAA- and PCI-DSS-specific controls
were not implemented** (e.g. PCI's mandatory MFA-for-all-admin-access,
90-day password rotation; HIPAA's automatic session logoff, minimum
necessary access reviews) -- only SOC 2, with the architecture left
modular enough to add them without a redesign. If this deployment will
ever touch cardholder data or protected health information, treat this
document as a starting point, not sufficient coverage, and revisit those
frameworks' specific requirements directly.
