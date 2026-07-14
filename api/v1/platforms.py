"""
API v1 router for /api/v1/platforms.

Endpoints
---------
GET /api/v1/platforms  -> [{id, name, description, status, version, icon,
                             supportsGeneration, supportsDeployment,
                             supportsValidation, supportsVerification}, ...]

Replaces the earlier "exporters" naming end-to-end -- see ADR-0008. The
frontend's Monitoring Platforms hub consumes this instead of a hardcoded
card list, so adding a platform to the registry is enough to make it show
up here with no frontend change required.
"""
from fastapi import APIRouter, Depends

from api.dependencies import Principal, require_permission
from core.platforms import registry as platform_registry

router = APIRouter()


@router.get("/platforms")
def list_platforms(
    principal: Principal = Depends(require_permission("meta:read")),
):
    return [
        {
            "id": info.id,
            "name": info.name,
            "description": info.description,
            "status": info.status,
            "version": info.version,
            "icon": info.icon,
            "supportsGeneration": info.supports_generation,
            "supportsDeployment": info.supports_deployment,
            "supportsValidation": info.supports_validation,
            "supportsVerification": info.supports_verification,
        }
        for info in platform_registry.list_platforms()
    ]
