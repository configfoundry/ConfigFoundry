"""
API v1 router for /api/v1/meta.

Endpoints
---------
GET /api/v1/meta  → {deviceCount, bandwidthCount, subnetCount, lastSavedAt, lastSavedBy}
"""
from fastapi import APIRouter, Depends

from api.dependencies import Principal, get_container, require_permission
from core.container import ServiceContainer

router = APIRouter()


@router.get("/meta")
def get_meta(
    principal: Principal = Depends(require_permission("meta:read")),
    c: ServiceContainer = Depends(get_container),
):
    return c.meta_service.get_meta()
