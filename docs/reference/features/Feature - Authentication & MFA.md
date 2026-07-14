# Feature: Authentication & MFA

Parent: [Authentication](../../security/Authentication Overview.md) · [Repository Overview](../Repository Overview.md)

## Purpose

Enterprise-grade login: Argon2id passwords, JWT + rotating refresh tokens, TOTP MFA, account lockout.

## Business value

Meets the security baseline expected in regulated environments (banks, government, defense, healthcare, telecom) — the primary target deployment context per [Target Users & Use Cases](../../internal/product/Target Users & Use Cases.md).

## Current implementation

See [Authentication](../../security/Authentication Overview.md) for full mechanism detail. UI-facing: login page (`(auth)/login`), MFA enrollment/disable and session management under `(app)/account/{mfa,sessions}`, password change under account settings.

## Files involved

- Backend: `api/v1/auth.py`, `core/services/auth_service.py`, `core/services/mfa_service.py`, `core/security/{password,jwt_tokens,mfa,crypto,rate_limit}.py`
- Frontend: `frontend/src/modules/auth/LoginView.tsx`, `frontend/src/modules/account/{MfaCard,SessionsCard,ChangePasswordCard}.tsx`, `frontend/src/providers/AuthProvider`

## User flow

Log in with email/password -> if MFA enrolled, prompted for TOTP code -> tokens issued -> access token auto-refreshed via refresh token until expiry/logout. Enrollment: Account -> MFA -> scan QR -> confirm code -> receive 10 backup codes.

## Dependencies

[RBAC Permission Catalog](../../security/RBAC Permission Catalog.md) (a token only becomes useful once a role is assigned), [Access Policy Engine](../../security/Access Policy Engine.md) (runs before auth).

## Known limitations

No external IdP/OIDC/SSO yet (v0.7.0). No self-service "Forgot Password" — confirmed absent per `frontend/VUEXY_MIGRATION_REPORT.md`, shown as an honest placeholder rather than built; only an admin-initiated reset (`POST /api/v1/users/{id}/reset-password`) exists today.

## Future improvements

LDAP and external IdP/OIDC/SSO (v0.7.0), self-service password reset/email verification (unscheduled — flagged as a gap during the frontend migration).

## See also

[Authentication](../../security/Authentication Overview.md) · [Auth Endpoints](../../api/Auth Endpoints.md)
