"""Admin-facing user management (list/get/update/deactivate/role
assignment). Distinct from AuthService, which owns login/token/password
mechanics -- this is CRUD + audit logging for the Users admin screen."""
from __future__ import annotations

from typing import Optional

from core.repositories.interfaces import IAuditRepository, IRoleRepository, IUserRepository
from core.services.auth_service import RequestContext

_SAFE_FIELDS = (
    "id", "org_id", "email", "username", "full_name", "is_active", "is_verified",
    "mfa_enabled", "must_change_password", "last_login_at", "created_at", "updated_at",
)


def _sanitize(user: dict) -> dict:
    """Strip hashed_password / mfa_secret_encrypted before returning to callers."""
    return {k: user[k] for k in _SAFE_FIELDS if k in user}


class UserService:
    def __init__(
        self, user_repo: IUserRepository, role_repo: IRoleRepository, audit_repo: IAuditRepository
    ) -> None:
        self._user_repo = user_repo
        self._role_repo = role_repo
        self._audit_repo = audit_repo

    def get(self, user_id: str) -> Optional[dict]:
        user = self._user_repo.get(user_id)
        return _sanitize(user) if user else None

    def list_for_org(self, org_id: str) -> list[dict]:
        return [_sanitize(u) for u in self._user_repo.list_by_org(org_id)]

    def set_active(self, user_id: str, is_active: bool, actor_id: str, ctx: RequestContext) -> dict:
        user = self._user_repo.update(user_id, {"is_active": is_active})
        if is_active is False:
            self._user_repo.bump_perm_version(user_id)  # kill any live sessions immediately
        self._audit_repo.log(
            actor_id, "user.deactivated" if not is_active else "user.reactivated",
            {"user_id": user_id},
            org_id=user["org_id"] if user else None, actor_type="user",
            source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="user", resource_id=user_id, result="success",
            correlation_id=ctx.correlation_id,
        )
        return _sanitize(user)

    def update_profile(self, user_id: str, changes: dict, actor_id: str, ctx: RequestContext) -> dict:
        allowed = {"full_name", "username"}
        sets = {k: v for k, v in changes.items() if k in allowed}
        user = self._user_repo.update(user_id, sets)
        self._audit_repo.log(
            actor_id, "user.updated", {"fields": list(sets)},
            org_id=user["org_id"] if user else None, actor_type="user",
            source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="user", resource_id=user_id, result="success",
            correlation_id=ctx.correlation_id,
        )
        return _sanitize(user)

    def assign_role(self, user_id: str, role_id: str, org_id: str, actor_id: str, ctx: RequestContext) -> None:
        self._role_repo.assign_to_user(user_id, role_id, org_id)
        self._user_repo.bump_perm_version(user_id)
        self._audit_repo.log(
            actor_id, "user.role_assigned", {"user_id": user_id, "role_id": role_id},
            org_id=org_id, actor_type="user", source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="user", resource_id=user_id, result="success",
            correlation_id=ctx.correlation_id,
        )

    def unassign_role(self, user_id: str, role_id: str, org_id: str, actor_id: str, ctx: RequestContext) -> None:
        self._role_repo.unassign_from_user(user_id, role_id, org_id)
        self._user_repo.bump_perm_version(user_id)
        self._audit_repo.log(
            actor_id, "user.role_unassigned", {"user_id": user_id, "role_id": role_id},
            org_id=org_id, actor_type="user", source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="user", resource_id=user_id, result="success",
            correlation_id=ctx.correlation_id,
        )

    def get_roles(self, user_id: str, org_id: str) -> list[dict]:
        return self._role_repo.list_for_user(user_id, org_id)
