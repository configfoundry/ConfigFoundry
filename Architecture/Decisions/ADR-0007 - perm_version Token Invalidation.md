# ADR-0007: perm_version Stamp Instead of a Token Blacklist

Parent: [[Architecture/Decisions/ADR Index|ADR Index]] · [[Security/Authorization & RBAC|Authorization & RBAC]]

## Context

Short-lived JWT access tokens are stateless by design — the server doesn't look them up on every request, which is the performance point of using JWTs at all. But some events (role change, forced logout, password change, account deactivation) need access to be revoked *immediately*, not "whenever this token's 15-minute TTL naturally expires." A naive fix is a token blacklist: a persistent, ever-growing table of revoked token IDs checked on every request — which reintroduces the per-request database lookup JWTs were meant to avoid, and needs its own cleanup/expiry housekeeping.

## Decision

Every `UserModel` row carries a `perm_version` integer. It's embedded in every access token issued to that user at login. Role changes, forced logout, password changes, and deactivation all increment it. `get_current_principal()` rejects any token whose embedded `perm_version` doesn't match the user's current database value.

## Consequences

**Positive:** revocation is immediate on the very next request, without a growing blacklist table or a housekeeping job to prune it; the check is a single integer comparison against a value already fetched as part of loading the principal, not an extra lookup; conceptually simple — one column, one comparison, no separate revocation subsystem.

**Negative:** a `perm_version` bump revokes **every** outstanding token for that user, not a single targeted session — coarser than a true per-token blacklist, which could revoke one stolen token while leaving the user's other active sessions untouched. This is an accepted tradeoff, not an oversight: refresh-token-level reuse detection (a separate mechanism, see [[Security/Authentication#Mechanisms|Authentication § Mechanisms]]) already handles the "one specific token was stolen" case with finer granularity; `perm_version` handles the coarser "this user's entire access needs to change right now" case.

## Alternatives considered

A persistent token blacklist (checked per-request) was implicitly rejected for the performance and housekeeping reasons above. Simply waiting out the 15-minute access-token TTL after a role change was rejected as insufficient for the "forced logout" and "account deactivation" cases, where immediate effect is a genuine security requirement, not a convenience.

## See also

[[Security/Authorization & RBAC#Immediate revocation without a token blacklist|Authorization & RBAC § Immediate revocation]] · [[Security/Authentication|Authentication]]
