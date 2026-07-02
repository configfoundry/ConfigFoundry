"""API v1 router for /api/v1/policies -- Access Policy Engine administration
(IP allow/deny rules). See core/services/policy_engine.py for evaluation
semantics (first-match-wins by priority, allowlist-mode default-deny)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from api.dependencies import Principal, get_container, get_request_context, require_permission
from core.container import ServiceContainer
from core.services.auth_service import RequestContext
from core.services.policy_service import PolicyServiceError
from schemas.auth import CreateNetworkACLBody

router = APIRouter()


@router.get("/policies/network-acls")
def list_network_acls(
    principal: Principal = Depends(require_permission("policy:manage")),
    c: ServiceContainer = Depends(get_container),
):
    return {"rules": c.policy_service.list_for_org(principal.org_id)}


@router.post("/policies/network-acls")
def create_network_acl(
    body: CreateNetworkACLBody,
    principal: Principal = Depends(require_permission("policy:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    try:
        rule = c.policy_service.create_rule(
            org_id=principal.org_id, rule_type=body.rule_type, cidr=body.cidr,
            description=body.description or "", priority=body.priority,
            actor_id=principal.id, ctx=ctx,
        )
    except PolicyServiceError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    return {"rule": rule}


@router.patch("/policies/network-acls/{rule_id}/enabled")
def set_network_acl_enabled(
    rule_id: str,
    enabled: bool,
    principal: Principal = Depends(require_permission("policy:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    c.policy_service.set_enabled(rule_id, enabled, principal.id, ctx)
    return {"id": rule_id, "enabled": enabled}


@router.delete("/policies/network-acls/{rule_id}")
def delete_network_acl(
    rule_id: str,
    principal: Principal = Depends(require_permission("policy:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    c.policy_service.delete_rule(rule_id, principal.id, ctx)
    return {"deleted": rule_id}
