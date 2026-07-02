"""
API v1 router for /api/v1/audit.

Endpoints
---------
GET /api/v1/audit         query: limit                        -> {entries: [...]}
GET /api/v1/audit/search  query: actor, action, result, since, until, limit -> {entries: [...]}
"""
from fastapi import APIRouter, Depends, Request

from api.dependencies import Principal, get_container, require_permission
from core.container import ServiceContainer

router = APIRouter()


@router.get("/audit")
def list_audit(
    request: Request,
    principal: Principal = Depends(require_permission("audit:read")),
    c: ServiceContainer = Depends(get_container),
):
    limit = int(request.query_params.get("limit", "100"))
    return {"entries": c.audit_service.list_recent(limit)}


@router.get("/audit/search")
def search_audit(
    request: Request,
    principal: Principal = Depends(require_permission("audit:read")),
    c: ServiceContainer = Depends(get_container),
):
    qp = request.query_params
    entries = c.audit_repo.search(
        actor=qp.get("actor"),
        action=qp.get("action"),
        result=qp.get("result"),
        org_id=qp.get("org_id"),
        since_ts=float(qp["since"]) if "since" in qp else None,
        until_ts=float(qp["until"]) if "until" in qp else None,
        limit=int(qp.get("limit", "100")),
    )
    return {"entries": entries}
