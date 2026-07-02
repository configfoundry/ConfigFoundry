"""
RBAC resolution service.

The single place that answers "does this user have permission X in org Y".
Route handlers never inspect role names -- they call
``has_permission(user_id, org_id, code)`` (or the FastAPI dependency
wrapper in ``api/dependencies.py`` that calls this), keeping authorization
entirely data-driven per the "no hardcoded role checks" requirement.

Super Admin special case
-------------------------
A user holding the system "Super Admin" role is granted every permission,
in every organization, without needing an explicit per-org role
assignment -- checked via ``is_super_admin`` rather than baking "Super
Admin bypasses everything" into every individual permission check.
"""
from __future__ import annotations

from core.repositories.interfaces import IRoleRepository, IUserRepository
from core.security.permissions import PERMISSION_CODES


class RBACService:
    def __init__(self, role_repo: IRoleRepository, user_repo: IUserRepository) -> None:
        self._role_repo = role_repo
        self._user_repo = user_repo

    def is_super_admin(self, user_id: str, org_id: str) -> bool:
        roles = self._role_repo.list_for_user(user_id, org_id)
        return any(r["is_system"] and r["name"] == "Super Admin" for r in roles)

    def get_effective_permissions(self, user_id: str, org_id: str) -> set[str]:
        if self.is_super_admin(user_id, org_id):
            return set(PERMISSION_CODES)
        return self._role_repo.get_effective_permissions(user_id, org_id)

    def has_permission(self, user_id: str, org_id: str, code: str) -> bool:
        return code in self.get_effective_permissions(user_id, org_id)

    def has_any_privileged_role(self, user_id: str, org_id: str, role_names: list[str]) -> bool:
        """True if the user holds any role whose name is in *role_names*
        (used for the MFA-required-roles policy check)."""
        roles = self._role_repo.list_for_user(user_id, org_id)
        held = {r["name"] for r in roles}
        return bool(held & set(role_names))
