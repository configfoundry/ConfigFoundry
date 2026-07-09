# API Keys & Policies Endpoints

Parent: [[API Documentation/API Overview|API Overview]]

Routers: `api/v1/api_keys.py`, `api/v1/policies.py`. Requires `api:manage` / `policy:manage`.

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET` | `/api/v1/api-keys` | List API keys (metadata only — key value never re-shown) | `api:manage` |
| `POST` | `/api/v1/api-keys` | Create a key — `cfk_live_...` value shown exactly once | `api:manage` |
| `DELETE` | `/api/v1/api-keys/{key_id}` | Revoke a key | `api:manage` |
| `GET` | `/api/v1/policies/network-acls` | List IP allow/deny rules | `policy:manage` |
| `POST` | `/api/v1/policies/network-acls` | Create a rule (CIDR, `allow`/`deny`, priority) | `policy:manage` |
| `PATCH` | `/api/v1/policies/network-acls/{rule_id}/enabled` | Enable/disable a rule | `policy:manage` |
| `DELETE` | `/api/v1/policies/network-acls/{rule_id}` | Delete a rule | `policy:manage` |

## Request/response notes

- API key creation returns the full key value (`cfk_live_...`) once; only a hash and prefix are persisted (`APIKeyModel.key_hash`, `key_prefix`) — see [[Database Overview]].
- A key can carry its own scoped permission list (JSON array) and IP allowlist (JSON array of CIDRs), narrower than the creating user's own grants.
- Network ACL rules are evaluated first-match-wins by ascending `priority`; if no rule matches, the scope defaults to permissive **unless** at least one `allow` rule exists for that scope, in which case unmatched traffic is denied ("allowlist mode"). See [[Security/Access Policy Engine|Access Policy Engine]].

## Errors

`404` unknown key/rule ID; `403` missing `api:manage`/`policy:manage`.

## Dependencies

`core/services/api_key_service.py`, `core/services/policy_service.py`, `core/services/policy_engine.py`, `core/security/tokens.py` (hashing).

## See also

[[Security/Access Policy Engine|Access Policy Engine]] · [[Features/Feature - API Keys|Feature - API Keys]] · [[Features/Feature - IP Access Policies|Feature - IP Access Policies]]
