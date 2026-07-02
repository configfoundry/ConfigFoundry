"""
API key service -- issuance, verification, and revocation for machine/
service accounts (e.g. unattended scripts or SNMP collectors calling the
API without a human login).

Verification (``authenticate``) checks, in order: key exists and is
enabled, not expired, not revoked, and -- if the key has an IP allowlist
configured -- that the caller's resolved IP matches. IP resolution itself
happens in the Access Policy Engine / dependency layer, not here; this
service is handed the already-resolved client IP.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

from core.repositories.interfaces import IAPIKeyRepository, IAuditRepository
from core.security import tokens
from core.security.ip import ip_in_any_cidr
from core.services.auth_service import RequestContext


class APIKeyError(Exception):
    pass


@dataclass
class APIKeyIssued:
    id: str
    name: str
    full_key: str          # shown ONCE -- caller must save it now
    key_prefix: str
    permissions: list[str]
    expires_at: Optional[float]


class APIKeyService:
    def __init__(self, api_key_repo: IAPIKeyRepository, audit_repo: IAuditRepository) -> None:
        self._repo = api_key_repo
        self._audit_repo = audit_repo

    def create(
        self,
        *,
        org_id: str,
        name: str,
        owner_user_id: Optional[str],
        permissions: list[str],
        allowed_ips: list[str],
        environment: str,
        expires_at: Optional[float],
        actor_id: str,
        ctx: RequestContext,
    ) -> APIKeyIssued:
        full_key, prefix, key_hash = tokens.generate_api_key()
        row = self._repo.create(
            {
                "org_id": org_id,
                "name": name,
                "owner_user_id": owner_user_id,
                "key_prefix": prefix,
                "key_hash": key_hash,
                "permissions": permissions,
                "allowed_ips": allowed_ips,
                "environment": environment,
                "expires_at": expires_at,
            }
        )
        self._audit_repo.log(
            actor_id, "api_key.created", {"name": name, "prefix": prefix},
            org_id=org_id, actor_type="user", source_ip=ctx.source_ip,
            user_agent=ctx.user_agent, resource_type="api_key", resource_id=row["id"],
            result="success", correlation_id=ctx.correlation_id,
        )
        return APIKeyIssued(
            id=row["id"], name=name, full_key=full_key, key_prefix=prefix,
            permissions=permissions, expires_at=expires_at,
        )

    def list_for_org(self, org_id: str) -> list[dict]:
        return self._repo.list_for_org(org_id)

    def revoke(self, key_id: str, actor_id: str, ctx: RequestContext) -> None:
        key = self._repo.get(key_id)
        self._repo.revoke(key_id)
        self._audit_repo.log(
            actor_id, "api_key.revoked", {"key_id": key_id},
            org_id=key["org_id"] if key else None, actor_type="user",
            source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="api_key", resource_id=key_id, result="success",
            correlation_id=ctx.correlation_id,
        )

    def authenticate(self, raw_key: str, client_ip: Optional[str]) -> dict:
        """Returns the api_key row on success. Raises APIKeyError otherwise."""
        record = self._repo.get_by_hash(tokens.hash_token(raw_key))
        if record is None or not record["enabled"] or record["revoked_at"] is not None:
            raise APIKeyError("Invalid API key")
        if record["expires_at"] and record["expires_at"] < time.time():
            raise APIKeyError("API key has expired")
        if record["allowed_ips"] and client_ip:
            if not ip_in_any_cidr(client_ip, record["allowed_ips"]):
                raise APIKeyError("API key is not permitted from this IP address")
        elif record["allowed_ips"] and not client_ip:
            raise APIKeyError("API key requires a verifiable source IP")

        self._repo.touch_last_used(record["id"], time.time())
        return record
