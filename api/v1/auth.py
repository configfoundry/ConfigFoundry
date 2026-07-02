"""
API v1 router for /api/v1/auth -- login, token lifecycle, MFA, password.

Endpoints
---------
POST /api/v1/auth/login                 -- email+password -> tokens, or {"mfa_required": true, ...}
POST /api/v1/auth/mfa/verify             -- complete MFA challenge -> tokens
POST /api/v1/auth/refresh                -- rotate refresh token -> new tokens
POST /api/v1/auth/logout                 -- revoke one refresh token (this session)
POST /api/v1/auth/logout-all             -- revoke every session for the caller
GET  /api/v1/auth/me                     -- current principal + effective permissions
POST /api/v1/auth/password/change        -- self-service password change
POST /api/v1/auth/mfa/enroll/begin       -- start TOTP enrollment (secret + QR URI)
POST /api/v1/auth/mfa/enroll/confirm     -- confirm enrollment -> backup codes
POST /api/v1/auth/mfa/disable            -- turn off MFA for the caller
GET  /api/v1/auth/sessions               -- list this user's active refresh-token sessions
DELETE /api/v1/auth/sessions/{id}        -- revoke one session (must belong to the caller)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from api.dependencies import Principal, get_container, get_current_principal, get_request_context
from core.container import ServiceContainer
from core.security import jwt_tokens
from core.services.auth_service import AccountLockedError, AuthError, MFARequiredError, RequestContext
from schemas.auth import (
    ChangePasswordBody,
    LoginBody,
    MfaEnrollConfirmBody,
    MfaVerifyBody,
    RefreshBody,
)

router = APIRouter()


def _token_response(pair) -> dict:
    return {
        "access_token": pair.access_token,
        "refresh_token": pair.refresh_token,
        "token_type": pair.token_type,
        "expires_in": pair.expires_in,
    }


@router.post("/auth/login")
def login(
    body: LoginBody,
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    try:
        pair = c.auth_service.login(body.email, body.password, ctx)
    except MFARequiredError as e:
        return {"mfa_required": True, "mfa_token": e.mfa_token}
    except AccountLockedError as e:
        return JSONResponse({"error": str(e)}, status_code=423)
    except AuthError as e:
        return JSONResponse({"error": str(e)}, status_code=401)
    return _token_response(pair)


@router.post("/auth/mfa/verify")
def mfa_verify(
    body: MfaVerifyBody,
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    try:
        user_id = jwt_tokens.decode_mfa_pending_token(body.mfa_token, c.security_config)
    except jwt_tokens.TokenError as e:
        return JSONResponse({"error": str(e)}, status_code=401)

    user = c.user_repo.get(user_id)
    if user is None:
        return JSONResponse({"error": "Invalid session"}, status_code=401)

    if not c.mfa_service.verify_login_challenge(user, body.code):
        c.audit_repo.log(
            user_id, "auth.mfa_verify", {"reason": "bad_code"},
            org_id=user["org_id"], actor_type="user", source_ip=ctx.source_ip,
            user_agent=ctx.user_agent, resource_type="user", resource_id=user_id,
            result="failure", correlation_id=ctx.correlation_id,
        )
        return JSONResponse({"error": "Invalid or expired code"}, status_code=401)

    try:
        pair = c.auth_service.complete_mfa_login(user_id, ctx)
    except AuthError as e:
        return JSONResponse({"error": str(e)}, status_code=401)
    return _token_response(pair)


@router.post("/auth/refresh")
def refresh(
    body: RefreshBody,
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    try:
        pair = c.auth_service.refresh(body.refresh_token, ctx)
    except AuthError as e:
        return JSONResponse({"error": str(e)}, status_code=401)
    return _token_response(pair)


@router.post("/auth/logout")
def logout(
    body: RefreshBody,
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    c.auth_service.logout(body.refresh_token, ctx)
    return {"logged_out": True}


@router.post("/auth/logout-all")
def logout_all(
    principal: Principal = Depends(get_current_principal),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    c.auth_service.logout_all(principal.id, ctx)
    return {"logged_out": True}


@router.get("/auth/me")
def me(
    principal: Principal = Depends(get_current_principal),
    c: ServiceContainer = Depends(get_container),
):
    if principal.kind != "user":
        return {
            "kind": "api_key", "id": principal.id, "name": principal.display_name,
            "org_id": principal.org_id, "permissions": sorted(principal.permissions),
        }
    user = c.user_repo.get(principal.id)
    roles = c.role_repo.list_for_user(principal.id, principal.org_id)
    return {
        "kind": "user",
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "org_id": user["org_id"],
        "mfa_enabled": user["mfa_enabled"],
        "must_change_password": user["must_change_password"],
        "roles": [{"id": r["id"], "name": r["name"]} for r in roles],
        "permissions": sorted(principal.permissions),
    }


@router.post("/auth/password/change")
def change_password(
    body: ChangePasswordBody,
    principal: Principal = Depends(get_current_principal),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    try:
        c.auth_service.change_password(principal.id, body.old_password, body.new_password, ctx)
    except AuthError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    return {"changed": True}


@router.post("/auth/mfa/enroll/begin")
def mfa_enroll_begin(
    principal: Principal = Depends(get_current_principal),
    c: ServiceContainer = Depends(get_container),
):
    user = c.user_repo.get(principal.id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    start = c.mfa_service.begin_enrollment(user["id"], user["email"])
    return {"secret": start.secret, "provisioning_uri": start.provisioning_uri}


@router.post("/auth/mfa/enroll/confirm")
def mfa_enroll_confirm(
    body: MfaEnrollConfirmBody,
    principal: Principal = Depends(get_current_principal),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    try:
        result = c.mfa_service.confirm_enrollment(principal.id, body.secret, body.code)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    c.audit_repo.log(
        principal.id, "auth.mfa_enabled", None,
        org_id=principal.org_id, actor_type="user", source_ip=ctx.source_ip,
        user_agent=ctx.user_agent, resource_type="user", resource_id=principal.id,
        result="success", correlation_id=ctx.correlation_id,
    )
    return {"backup_codes": result.backup_codes}


@router.post("/auth/mfa/disable")
def mfa_disable(
    principal: Principal = Depends(get_current_principal),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    c.mfa_service.disable(principal.id)
    c.audit_repo.log(
        principal.id, "auth.mfa_disabled", None,
        org_id=principal.org_id, actor_type="user", source_ip=ctx.source_ip,
        user_agent=ctx.user_agent, resource_type="user", resource_id=principal.id,
        result="success", correlation_id=ctx.correlation_id,
    )
    return {"disabled": True}


@router.get("/auth/sessions")
def list_sessions(
    principal: Principal = Depends(get_current_principal),
    c: ServiceContainer = Depends(get_container),
):
    sessions = c.refresh_token_repo.list_active_for_user(principal.id)
    return {
        "sessions": [
            {
                "id": s["id"], "issued_at": s["issued_at"], "expires_at": s["expires_at"],
                "source_ip": s["source_ip"], "user_agent": s["user_agent"],
            }
            for s in sessions
        ]
    }


@router.delete("/auth/sessions/{session_id}")
def revoke_session(
    session_id: str,
    principal: Principal = Depends(get_current_principal),
    c: ServiceContainer = Depends(get_container),
    ctx: RequestContext = Depends(get_request_context),
):
    # Ownership check: only ever revoke a session belonging to the caller.
    owned = {s["id"] for s in c.refresh_token_repo.list_active_for_user(principal.id)}
    if session_id not in owned:
        raise HTTPException(status_code=404, detail="Session not found")
    c.refresh_token_repo.revoke(session_id)
    c.audit_repo.log(
        principal.id, "auth.session_revoked", {"session_id": session_id},
        org_id=principal.org_id, actor_type="user", source_ip=ctx.source_ip,
        user_agent=ctx.user_agent, resource_type="user", resource_id=principal.id,
        result="success", correlation_id=ctx.correlation_id,
    )
    return {"revoked": session_id}
