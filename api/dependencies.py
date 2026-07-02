"""
FastAPI dependency providers.

Routes import ``get_container`` via ``Depends()`` to receive the
``ServiceContainer`` for the current request.  The container is stored on
``app.state.container`` by ``create_app()``.

Authentication / authorization dependencies
---------------------------------------------
``get_current_principal``
    Resolves the caller from the ``Authorization`` header -- either a
    user JWT access token or a service-account API key (disambiguated by
    the ``cfk_live_`` prefix) -- into a single ``Principal``. Also
    re-evaluates the Access Policy Engine now that the caller's
    organization is known (the HTTP-layer middleware in
    ``core/security/middleware.py`` only checks global/pre-auth rules).

``require_permission(code)``
    Dependency factory: returns a dependency that resolves the current
    principal and raises 403 unless it holds *code*. This is the ONLY
    place route handlers should gate access -- never a role-name check.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, HTTPException, Request

from core.container import ServiceContainer
from core.logging.context import get_request_id
from core.security import jwt_tokens
from core.services.api_key_service import APIKeyError
from core.services.auth_service import RequestContext

_API_KEY_PREFIX = "cfk_live_"


def get_container(request: Request) -> ServiceContainer:
    """Return the application-level service container."""
    return request.app.state.container


def get_request_context(request: Request) -> RequestContext:
    """Build a RequestContext (source IP, user agent, correlation id) for
    audit logging -- source IP prefers the Access-Policy-Engine-resolved
    value set by TrustedProxyMiddleware."""
    client_ip = getattr(request.state, "client_ip", None) or (
        request.client.host if request.client else None
    )
    return RequestContext(
        source_ip=client_ip,
        user_agent=request.headers.get("user-agent"),
        correlation_id=get_request_id(),
    )


@dataclass
class Principal:
    kind: str            # "user" | "api_key"
    id: str               # user id or api key id
    org_id: Optional[str]
    permissions: set[str]
    display_name: str


def _extract_bearer_token(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return token


def get_current_principal(
    request: Request, c: ServiceContainer = Depends(get_container)
) -> Principal:
    token = _extract_bearer_token(request)
    client_ip = getattr(request.state, "client_ip", None) or (
        request.client.host if request.client else None
    )

    if token.startswith(_API_KEY_PREFIX):
        try:
            record = c.api_key_service.authenticate(token, client_ip)
        except APIKeyError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc
        principal = Principal(
            kind="api_key",
            id=record["id"],
            org_id=record["org_id"],
            permissions=set(record["permissions"]),
            display_name=record["name"],
        )
    else:
        try:
            claims = jwt_tokens.decode_access_token(token, c.security_config)
        except jwt_tokens.TokenError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc
        if claims.token_type != "user":
            raise HTTPException(status_code=401, detail="Invalid access token")

        user = c.user_repo.get(claims.sub)
        if user is None or not user["is_active"]:
            raise HTTPException(status_code=401, detail="Account no longer active")
        if claims.perm_version != user["perm_version"]:
            # Role change, password change, or forced logout happened
            # since this token was issued -- reject it immediately rather
            # than waiting for natural expiry.
            raise HTTPException(status_code=401, detail="Session no longer valid, please log in again")

        permissions = c.rbac_service.get_effective_permissions(user["id"], user["org_id"])
        principal = Principal(
            kind="user", id=user["id"], org_id=user["org_id"],
            permissions=permissions, display_name=user.get("full_name") or user["email"],
        )

    # Per-org policy re-check now that the org is known (the middleware
    # layer only enforced global rules pre-authentication).
    if client_ip and principal.org_id:
        decision = c.policy_engine.evaluate_ip(client_ip, org_id=principal.org_id)
        if not decision.allowed:
            c.audit_repo.log(
                principal.id, "policy.access_denied", {"reason": decision.reason},
                org_id=principal.org_id, actor_type=principal.kind, source_ip=client_ip,
                user_agent=request.headers.get("user-agent"), resource_type="http_request",
                resource_id=request.url.path, result="denied", correlation_id=get_request_id(),
            )
            raise HTTPException(status_code=403, detail="Access denied by network policy")

    return principal


def require_permission(code: str):
    """Dependency factory -- use as
    ``Depends(require_permission("inventory:write"))``."""

    def _check(principal: Principal = Depends(get_current_principal)) -> Principal:
        if code not in principal.permissions:
            raise HTTPException(
                status_code=403,
                detail=f"Missing required permission: {code}",
            )
        return principal

    return _check


def require_any_permission(*codes: str):
    """Like require_permission but satisfied by holding ANY of *codes*."""

    def _check(principal: Principal = Depends(get_current_principal)) -> Principal:
        if not (set(codes) & principal.permissions):
            raise HTTPException(
                status_code=403,
                detail=f"Missing required permission (any of): {', '.join(codes)}",
            )
        return principal

    return _check
