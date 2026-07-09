# Auth Endpoints

Parent: [[API Documentation/API Overview|API Overview]] · [[Security/Authentication|Authentication]]

Router: `api/v1/auth.py`. Public except `/auth/me` and session management.

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | `{email, password}` -> tokens, or `{mfa_required, mfa_token}` if MFA enrolled | Public |
| `POST` | `/api/v1/auth/mfa/verify` | `{mfa_token, code}` -> tokens | Public (requires valid `mfa_token` from login) |
| `POST` | `/api/v1/auth/refresh` | `{refresh_token}` -> new tokens (old one rotated out) | Public (requires valid refresh token) |
| `POST` | `/api/v1/auth/logout` | `{refresh_token}` — revokes one session | Bearer |
| `POST` | `/api/v1/auth/logout-all` | Revokes every session for the caller | Bearer |
| `GET` | `/api/v1/auth/me` | Current principal's profile | Bearer |
| `POST` | `/api/v1/auth/password/change` | Change own password | Bearer |
| `POST` | `/api/v1/auth/mfa/enroll/begin` | -> `{secret, provisioning_uri}` (QR enrollment start) | Bearer |
| `POST` | `/api/v1/auth/mfa/enroll/confirm` | `{secret, code}` -> `{backup_codes}` | Bearer |
| `POST` | `/api/v1/auth/mfa/disable` | Disable MFA for the caller | Bearer |
| `GET` | `/api/v1/auth/sessions` | List active sessions (refresh token families) | Bearer |
| `DELETE` | `/api/v1/auth/sessions/{session_id}` | Revoke one session | Bearer |

## Errors

`401` on bad credentials, locked account, or expired/invalid token; `429` on rate-limited login attempts (`CONFIGFOUNDRY_AUTH_RATE_LIMIT_LOGIN`, default `10/60`); `403` if `perm_version` mismatch (token issued before a role change/forced logout).

## Dependencies

`core/services/auth_service.py`, `core/services/mfa_service.py`, `core/security/jwt_tokens.py`, `core/security/password.py`, `core/security/mfa.py`, `core/security/rate_limit.py`.

## See also

[[Security/Authentication|Authentication]] · [[Features/Feature - Authentication & MFA|Feature - Authentication & MFA]]
