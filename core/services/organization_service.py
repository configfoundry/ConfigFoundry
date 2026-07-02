"""Thin service around IOrganizationRepository. Kept minimal in this pass
-- ConfigFoundry's existing inventory tables (devices, bandwidth, subnets,
etc.) are NOT yet organization-scoped (see docs/authentication.md, "Known
scope boundaries"), so today there is effectively one active organization
per deployment. This service exists so the schema, API, and admin UI are
already multi-tenant-shaped for when that changes."""
from __future__ import annotations

from typing import Optional

from core.repositories.interfaces import IAuditRepository, IOrganizationRepository
from core.services.auth_service import RequestContext

DEFAULT_ORG_SLUG = "default"


class OrganizationService:
    def __init__(self, org_repo: IOrganizationRepository, audit_repo: IAuditRepository) -> None:
        self._org_repo = org_repo
        self._audit_repo = audit_repo

    def get_default_org(self) -> Optional[dict]:
        return self._org_repo.get_by_slug(DEFAULT_ORG_SLUG)

    def list_all(self) -> list[dict]:
        return self._org_repo.list_all()

    def get(self, org_id: str) -> Optional[dict]:
        return self._org_repo.get(org_id)

    def create(self, name: str, slug: str, actor_id: str, ctx: RequestContext) -> dict:
        org = self._org_repo.create({"name": name, "slug": slug})
        self._audit_repo.log(
            actor_id, "organization.created", {"name": name, "slug": slug},
            org_id=org["id"], actor_type="user", source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="organization", resource_id=org["id"], result="success",
            correlation_id=ctx.correlation_id,
        )
        return org
