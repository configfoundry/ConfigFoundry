# Runbook: Incident Response

Parent: [[Security/Security Overview|Security Overview]] · [[Operations]]

## Suspected credential compromise (a user's account)

1. Force logout: increment the affected user's `perm_version` via a role no-op change or dedicated admin action — invalidates all outstanding access tokens on the next request. See [[Security/Authorization & RBAC#Immediate revocation without a token blacklist|Authorization & RBAC § Immediate revocation]].
2. `POST /api/v1/users/{id}/reset-password` to force a new password.
3. Review `GET /api/v1/audit/search?actor=<user>` for what the account did while potentially compromised.
4. If MFA was not enrolled, enroll it now; if it was, consider rotating backup codes.

## Suspected refresh token theft

The system already responds automatically: presenting an already-rotated refresh token triggers reuse detection and **revokes the entire token family** (`core/services/auth_service.py::refresh`). Confirm this fired by checking the audit log for a revocation event; if it didn't (unexpected), treat as a bug and escalate to engineering.

## Suspected stolen/leaked API key

1. `DELETE /api/v1/api-keys/{key_id}` immediately.
2. Review `GET /api/v1/audit/search` filtered to that key's activity for the exposure window.
3. Issue a replacement key scoped as narrowly as possible (minimum permissions, IP allowlist, expiration) — see [[Features/Feature - API Keys|Feature - API Keys]].

## Credential-stuffing / brute-force activity

Signal: spike in `401`/`429` on `/api/v1/auth/login` in the request log or audit log. The automatic account lockout (`CONFIGFOUNDRY_AUTH_LOCKOUT_THRESHOLD`) handles individual accounts but does not itself alert — this must be caught by external log/audit monitoring. Response: tighten `CONFIGFOUNDRY_AUTH_RATE_LIMIT_LOGIN` temporarily, add a deny rule in the [[Security/Access Policy Engine|Access Policy Engine]] for the source IP/CIDR if identifiable, review whether affected accounts need a forced password reset.

## Data integrity concern (unexpected inventory change)

`GET /api/v1/audit/search` filtered by resource type/ID and date range — every business mutation is attributed to an actor with a timestamp. Cross-reference with `GET /api/v1/history` if the concern involves a specific generated config.

## Suspected unauthorized network access

Review [[Security/Access Policy Engine|Access Policy Engine]] rules — confirm `CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES` is scoped correctly (an overly broad value lets a client spoof `X-Forwarded-For` and defeat IP-based rules entirely). Add/tighten deny rules as needed.

## After any incident

1. Document the timeline using audit log entries as the primary source of truth.
2. Confirm the response action is itself reflected in the audit log (role changes, key revocations, policy changes all are, automatically).
3. Update [[Security/Security Overview#Vulnerabilities & recommendations|Security Overview § Vulnerabilities & recommendations]] if the incident revealed a gap not already tracked there.

## See also

[[Security/Security Overview|Security Overview]] · [[Operations/Runbook - Monitoring & Health Checks|Runbook - Monitoring & Health Checks]] · [[Features/Feature - Audit Log & History|Feature - Audit Log & History]]
