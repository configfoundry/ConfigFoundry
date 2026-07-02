"""
API v1 router for /api/v1/users -- user administration.

All endpoints require the ``user:read`` or ``user:manage`` permission
(never a role-name check) and operate within the caller's organization.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from api.dependencies import Principal, get_container, get_request_context, require_permission
from core.container import ServiceContainer
from core.services.auth_service import AuthError, RequestContext
from schemas.auth import AdminResetPasswordBody, AssignRoleBody, CreateUserBody, UpdateUserBody

router = APIRouter()


@router.get("/users")
def list_users(
    principal: Principal = Depends(require_permission("user:read")),
    c: ServiceContainer = Depends(get_container),
):
    return {"users": c.user_service.list_for_org(principal.org_id)}


@router.post("/users")
def create_user(
    body: CreateUserBody,
    principal: Principal = Depends(require_permission("user:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    try:
        user = c.auth_service.create_user(
            org_id=principal.org_id, email=body.email, password=body.password,
            full_name=body.full_name, actor_id=principal.id, ctx=ctx,
        )
    except AuthError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    return {"user": c.user_service.get(user["id"])}


@router.get("/users/{user_id}")
def get_user(
    user_id: str,
    principal: Principal = Depends(require_permission("user:read")),
    c: ServiceContainer = Depends(get_container),
):
    user = c.user_service.get(user_id)
    if user is None or user["org_id"] != principal.org_id:
        return JSONResponse({"error": "User not found"}, status_code=404)
    user["roles"] = c.user_service.get_roles(user_id, principal.org_id)
    return {"user": user}


@router.patch("/users/{user_id}")
def update_user(
    user_id: str,
    body: UpdateUserBody,
    principal: Principal = Depends(require_permission("user:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    changes = body.model_dump(exclude_unset=True)
    user = c.user_service.update_profile(user_id, changes, principal.id, ctx)
    return {"user": user}


@router.delete("/users/{user_id}")
def deactivate_user(
    user_id: str,
    principal: Principal = Depends(require_permission("user:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    user = c.user_service.set_active(user_id, False, principal.id, ctx)
    return {"user": user}


@router.post("/users/{user_id}/reactivate")
def reactivate_user(
    user_id: str,
    principal: Principal = Depends(require_permission("user:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    user = c.user_service.set_active(user_id, True, principal.id, ctx)
    return {"user": user}


@router.post("/users/{user_id}/roles")
def assign_role(
    user_id: str,
    body: AssignRoleBody,
    principal: Principal = Depends(require_permission("user:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    c.user_service.assign_role(user_id, body.role_id, principal.org_id, principal.id, ctx)
    return {"roles": c.user_service.get_roles(user_id, principal.org_id)}


@router.delete("/users/{user_id}/roles/{role_id}")
def unassign_role(
    user_id: str,
    role_id: str,
    principal: Principal = Depends(require_permission("user:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    c.user_service.unassign_role(user_id, role_id, principal.org_id, principal.id, ctx)
    return {"roles": c.user_service.get_roles(user_id, principal.org_id)}


@router.post("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: str,
    body: AdminResetPasswordBody,
    principal: Principal = Depends(require_permission("user:manage")),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    try:
        c.auth_service.admin_reset_password(user_id, body.new_password, principal.id, ctx)
    except AuthError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    return {"reset": True}
