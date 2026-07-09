# Feature: API Keys

Parent: [[Security/Authentication|Authentication]] · [[Repository Overview]]

## Purpose

Long-lived, scoped credentials for service accounts and unattended scripts (e.g. SNMP collectors calling the API) that shouldn't use a human login flow.

## Business value

Lets automation authenticate without embedding a human's password or session, and lets that automation's blast radius be scoped narrowly (specific permissions, specific IP range, an expiration).

## Current implementation

`POST /api/v1/api-keys` (requires `api:manage`) returns the full key (`cfk_live_...`) exactly once; only a hash and prefix are persisted. Keys can carry their own scoped permission list and IP allowlist, narrower than the creating user's grants, plus an expiration.

## Files involved

- Backend: `api/v1/api_keys.py`, `core/services/api_key_service.py`, `core/security/tokens.py`, `models/auth.py::APIKeyModel`
- Frontend: `frontend/src/modules/administration/ApiKeysView.tsx`, `(app)/account/api-tokens` (personal tokens, if distinct from admin-managed keys — verify)

## User flow

Administration -> API Keys -> create -> copy the shown value immediately (never shown again) -> use as `Authorization: Bearer cfk_live_...`.

## Dependencies

[[Security/RBAC Permission Catalog|RBAC Permission Catalog]] (`api:manage`), [[Security/Access Policy Engine|Access Policy Engine]] (a key's own IP allowlist is enforced independently of the global policy engine — confirm the exact interaction in `core/services/api_key_service.py` during a deeper review).

## Known limitations

Richer scoping/management UI is explicitly a v0.7.0 "deepen this" item, not a v0.5 gap — the feature already ships; see [[Roadmap Overview]].

## Future improvements

Richer scoping and management UI (v0.7.0).

## See also

[[API Documentation/API Keys & Policies Endpoints|API Keys & Policies Endpoints]] · [[Security/Access Policy Engine|Access Policy Engine]]
