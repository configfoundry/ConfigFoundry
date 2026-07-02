"""API v1 router for /api/v1/api-keys -- service-account credential
management. The full key value is returned exactly once, at creation."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from api.dependencies import Principal, get_container, get_request_context, require_permission
from core.container import ServiceContainer
from core.services.auth_service import RequestContext
from schemas.auth import CreateAPIKeyBody

router = APIRouter()


@router.get("/api-keys")
def list_api_keys(
    principal: Principal = Depends(require_permission("api:manage")),
    c: ServiceContainer = Depends(get_container),
):
    # Never include key_hash in the response -- list view is metadata only.
    keys = c.api_key_service.list_for_org(principal.org_id)
    return {"api_keys": [{k: v for k, v in key.items() if k != "key_hash"} for key in keys]}


@router.post("/api-keys")
def create_api_key(
    body: CreateAPIKeyBody,
    principal: Principal = Depends(require_permission("api:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    owner = principal.id if principal.kind == "user" else None
    issued = c.api_key_service.create(
        org_id=principal.org_id, name=body.name, owner_user_id=owner,
        permissions=body.permissions, allowed_ips=body.allowed_ips,
        environment=body.environment, expires_at=body.expires_at,
        actor_id=principal.id, ctx=ctx,
    )
    return {
        "id": issued.id,
        "name": issued.name,
        "api_key": issued.full_key,   # shown ONCE -- caller must save it now
        "key_prefix": issued.key_prefix,
        "permissions": issued.permissions,
        "expires_at": issued.expires_at,
    }


@router.delete("/api-keys/{key_id}")
def revoke_api_key(
    key_id: str,
    principal: Principal = Depends(require_permission("api:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    c.api_key_service.revoke(key_id, principal.id, ctx)
    return {"revoked": key_id}
