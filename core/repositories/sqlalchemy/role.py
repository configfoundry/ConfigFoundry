"""SQLAlchemy implementation of IRoleRepository (roles, role_permissions,
user_roles -- kept in one repository since they're one cohesive aggregate:
you rarely touch one without the others)."""
from __future__ import annotations

import time
import uuid
from typing import Optional, TYPE_CHECKING

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.repositories.interfaces import IRoleRepository

if TYPE_CHECKING:
    from core.storage.provider import StorageProvider

_COLUMNS = "id, org_id, name, description, is_system, created_at"


def _row_to_dict(r) -> dict:
    return {
        "id": r[0],
        "org_id": r[1],
        "name": r[2],
        "description": r[3],
        "is_system": bool(r[4]),
        "created_at": r[5],
    }


class SQLAlchemyRoleRepository(IRoleRepository):
    def __init__(self, provider: "StorageProvider") -> None:
        self._provider = provider

    @property
    def _engine(self):
        return self._provider.get_engine()

    def create(self, role: dict) -> dict:
        row = {
            "id": role.get("id") or str(uuid.uuid4()),
            "org_id": role.get("org_id"),
            "name": role["name"],
            "description": role.get("description"),
            "is_system": role.get("is_system", False),
            "created_at": time.time(),
        }
        with Session(self._engine) as session:
            session.execute(
                text(
                    f"INSERT INTO roles ({_COLUMNS}) VALUES "
                    "(:id, :org_id, :name, :description, :is_system, :created_at)"
                ),
                row,
            )
            session.commit()
        return row

    def get(self, role_id: str) -> Optional[dict]:
        with Session(self._engine) as session:
            r = session.execute(
                text(f"SELECT {_COLUMNS} FROM roles WHERE id = :id"), {"id": role_id}
            ).fetchone()
        return _row_to_dict(r) if r else None

    def list_for_org(self, org_id: str) -> list[dict]:
        with Session(self._engine) as session:
            rows = session.execute(
                text(
                    f"SELECT {_COLUMNS} FROM roles WHERE org_id IS NULL OR org_id = :org_id "
                    "ORDER BY is_system DESC, name ASC"
                ),
                {"org_id": org_id},
            ).all()
        return [_row_to_dict(r) for r in rows]

    def update(self, role_id: str, changes: dict) -> Optional[dict]:
        allowed = {"name", "description"}
        sets = {k: v for k, v in changes.items() if k in allowed}
        if not sets:
            return self.get(role_id)
        assignments = ", ".join(f"{k} = :{k}" for k in sets)
        with Session(self._engine) as session:
            session.execute(
                text(f"UPDATE roles SET {assignments} WHERE id = :id AND is_system = 0"),
                {**sets, "id": role_id},
            )
            session.commit()
        return self.get(role_id)

    def delete(self, role_id: str) -> None:
        with Session(self._engine) as session:
            session.execute(text("DELETE FROM role_permissions WHERE role_id = :id"), {"id": role_id})
            session.execute(text("DELETE FROM user_roles WHERE role_id = :id"), {"id": role_id})
            session.execute(text("DELETE FROM roles WHERE id = :id AND is_system = 0"), {"id": role_id})
            session.commit()

    def set_permissions(self, role_id: str, permission_codes: list[str]) -> None:
        with Session(self._engine) as session:
            session.execute(text("DELETE FROM role_permissions WHERE role_id = :id"), {"id": role_id})
            if permission_codes:
                placeholders = ",".join(f":c{i}" for i in range(len(permission_codes)))
                perm_rows = session.execute(
                    text(f"SELECT id, code FROM permissions WHERE code IN ({placeholders})"),
                    {f"c{i}": c for i, c in enumerate(permission_codes)},
                ).all()
                for perm_id, _code in perm_rows:
                    session.execute(
                        text(
                            "INSERT INTO role_permissions (role_id, permission_id) "
                            "VALUES (:role_id, :permission_id)"
                        ),
                        {"role_id": role_id, "permission_id": perm_id},
                    )
            session.commit()

    def get_permission_codes(self, role_id: str) -> list[str]:
        with Session(self._engine) as session:
            rows = session.execute(
                text(
                    "SELECT p.code FROM permissions p "
                    "JOIN role_permissions rp ON rp.permission_id = p.id "
                    "WHERE rp.role_id = :role_id"
                ),
                {"role_id": role_id},
            ).all()
        return [r[0] for r in rows]

    def assign_to_user(self, user_id: str, role_id: str, org_id: str) -> None:
        with Session(self._engine) as session:
            session.execute(
                text(
                    "INSERT INTO user_roles (user_id, role_id, org_id) "
                    "VALUES (:user_id, :role_id, :org_id) "
                    "ON CONFLICT(user_id, role_id, org_id) DO NOTHING"
                ),
                {"user_id": user_id, "role_id": role_id, "org_id": org_id},
            )
            session.commit()

    def unassign_from_user(self, user_id: str, role_id: str, org_id: str) -> None:
        with Session(self._engine) as session:
            session.execute(
                text(
                    "DELETE FROM user_roles WHERE user_id = :user_id "
                    "AND role_id = :role_id AND org_id = :org_id"
                ),
                {"user_id": user_id, "role_id": role_id, "org_id": org_id},
            )
            session.commit()

    def list_for_user(self, user_id: str, org_id: str) -> list[dict]:
        with Session(self._engine) as session:
            rows = session.execute(
                text(
                    "SELECT r.id, r.org_id, r.name, r.description, r.is_system, r.created_at "
                    "FROM roles r JOIN user_roles ur ON ur.role_id = r.id "
                    "WHERE ur.user_id = :user_id AND ur.org_id = :org_id"
                ),
                {"user_id": user_id, "org_id": org_id},
            ).all()
        return [_row_to_dict(r) for r in rows]

    def get_effective_permissions(self, user_id: str, org_id: str) -> set[str]:
        with Session(self._engine) as session:
            rows = session.execute(
                text(
                    "SELECT DISTINCT p.code FROM permissions p "
                    "JOIN role_permissions rp ON rp.permission_id = p.id "
                    "JOIN user_roles ur ON ur.role_id = rp.role_id "
                    "WHERE ur.user_id = :user_id AND ur.org_id = :org_id"
                ),
                {"user_id": user_id, "org_id": org_id},
            ).all()
        return {r[0] for r in rows}
