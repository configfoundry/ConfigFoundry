"""API v1 router for /api/v1/roles -- RBAC administration."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from api.dependencies import Principal, get_container, get_request_context, require_permission
from core.container import ServiceContainer
from core.services.auth_service import RequestContext
from schemas.auth import CreateRoleBody, UpdateRolePermissionsBody

router = APIRouter()


@router.get("/roles")
def list_roles(
    principal: Principal = Depends(require_permission("role:read")),
    c: ServiceContainer = Depends(get_container),
):
    return {"roles": c.role_service.list_for_org(principal.org_id)}


@router.get("/permissions")
def list_permissions(
    principal: Principal = Depends(require_permission("role:read")),
    c: ServiceContainer = Depends(get_container),
):
    return {"permissions": c.role_service.list_permissions()}


@router.post("/roles")
def create_role(
    body: CreateRoleBody,
    principal: Principal = Depends(require_permission("role:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    role = c.role_service.create(
        principal.org_id, body.name, body.description or "", body.permissions, principal.id, ctx
    )
    return {"role": role}


@router.get("/roles/{role_id}")
def get_role(
    role_id: str,
    principal: Principal = Depends(require_permission("role:read")),
    c: ServiceContainer = Depends(get_container),
):
    role = c.role_service.get(role_id)
    if role is None:
        return JSONResponse({"error": "Role not found"}, status_code=404)
    return {"role": role}


@router.patch("/roles/{role_id}/permissions")
def update_role_permissions(
    role_id: str,
    body: UpdateRolePermissionsBody,
    principal: Principal = Depends(require_permission("role:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    try:
        role = c.role_service.update_permissions(role_id, body.permissions, principal.id, ctx)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    return {"role": role}


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: str,
    principal: Principal = Depends(require_permission("role:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    try:
        c.role_service.delete(role_id, principal.id, ctx)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    return {"deleted": role_id}
