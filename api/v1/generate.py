"""
API v1 router for /api/v1/generate.

Endpoints
---------
POST /api/v1/generate  body: {_actor, platform}  → {files, groupStats, summary, findings}

``platform`` is optional and defaults to "datadog" so existing callers that
don't send it keep working unchanged (ADR-0008 backward-compatibility
requirement). Pass any id returned by GET /api/v1/platforms whose
``status`` is "supported".
"""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import Principal, get_container, require_permission
from core.container import ServiceContainer
from core.platforms import registry as platform_registry

router = APIRouter()


@router.post("/generate")
def generate(
    body: dict[str, Any] = {},
    principal: Principal = Depends(require_permission("deployment:execute")),
    c: ServiceContainer = Depends(get_container),
):
    actor = body.get("_actor") if isinstance(body, dict) else None
    platform_id = (body.get("platform") if isinstance(body, dict) else None) or "datadog"

    adapter = platform_registry.get_platform(platform_id)
    if adapter is None:
        raise HTTPException(status_code=404, detail=f"Unknown platform: {platform_id}")
    if adapter.status != "supported":
        raise HTTPException(status_code=409, detail=f"Platform '{platform_id}' is not yet supported")

    return c.generate_service.generate(actor, platform_id=platform_id)
