"""Admin-facing role & permission management for the Roles admin screen."""
from __future__ import annotations

from typing import Optional

from core.repositories.interfaces import IAuditRepository, IPermissionRepository, IRoleRepository
from core.services.auth_service import RequestContext


class RoleService:
    def __init__(
        self, role_repo: IRoleRepository, permission_repo: IPermissionRepository, audit_repo: IAuditRepository
    ) -> None:
        self._role_repo = role_repo
        self._permission_repo = permission_repo
        self._audit_repo = audit_repo

    def list_permissions(self) -> list[dict]:
        return self._permission_repo.list_all()

    def list_for_org(self, org_id: str) -> list[dict]:
        roles = self._role_repo.list_for_org(org_id)
        for r in roles:
            r["permissions"] = self._role_repo.get_permission_codes(r["id"])
        return roles

    def get(self, role_id: str) -> Optional[dict]:
        role = self._role_repo.get(role_id)
        if role:
            role["permissions"] = self._role_repo.get_permission_codes(role_id)
        return role

    def create(
        self, org_id: str, name: str, description: str, permission_codes: list[str],
        actor_id: str, ctx: RequestContext,
    ) -> dict:
        role = self._role_repo.create({"org_id": org_id, "name": name, "description": description})
        self._role_repo.set_permissions(role["id"], permission_codes)
        self._audit_repo.log(
            actor_id, "role.created", {"name": name, "permissions": permission_codes},
            org_id=org_id, actor_type="user", source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="role", resource_id=role["id"], result="success",
            correlation_id=ctx.correlation_id,
        )
        return self.get(role["id"])

    def update_permissions(
        self, role_id: str, permission_codes: list[str], actor_id: str, ctx: RequestContext
    ) -> dict:
        role = self._role_repo.get(role_id)
        if role and role["is_system"]:
            raise ValueError("System roles cannot have their permissions edited directly")
        self._role_repo.set_permissions(role_id, permission_codes)
        self._audit_repo.log(
            actor_id, "role.permissions_updated", {"role_id": role_id, "permissions": permission_codes},
            org_id=role["org_id"] if role else None, actor_type="user",
            source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="role", resource_id=role_id, result="success",
            correlation_id=ctx.correlation_id,
        )
        return self.get(role_id)

    def delete(self, role_id: str, actor_id: str, ctx: RequestContext) -> None:
        role = self._role_repo.get(role_id)
        if role and role["is_system"]:
            raise ValueError("System roles cannot be deleted")
        self._role_repo.delete(role_id)
        self._audit_repo.log(
            actor_id, "role.deleted", {"role_id": role_id},
            org_id=role["org_id"] if role else None, actor_type="user",
            source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="role", resource_id=role_id, result="success",
            correlation_id=ctx.correlation_id,
        )
