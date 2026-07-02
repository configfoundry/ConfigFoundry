"""SQLAlchemy implementation of IUserRepository."""
from __future__ import annotations

import time
import uuid
from typing import Optional, TYPE_CHECKING

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.repositories.interfaces import IUserRepository

if TYPE_CHECKING:
    from core.storage.provider import StorageProvider

_COLUMNS = (
    "id, org_id, email, username, full_name, hashed_password, is_active, "
    "is_verified, must_change_password, mfa_enabled, mfa_secret_encrypted, "
    "failed_login_count, locked_until, perm_version, password_changed_at, "
    "last_login_at, created_at, updated_at"
)


def _row_to_dict(r) -> dict:
    return {
        "id": r[0],
        "org_id": r[1],
        "email": r[2],
        "username": r[3],
        "full_name": r[4],
        "hashed_password": r[5],
        "is_active": bool(r[6]),
        "is_verified": bool(r[7]),
        "must_change_password": bool(r[8]),
        "mfa_enabled": bool(r[9]),
        "mfa_secret_encrypted": r[10],
        "failed_login_count": r[11],
        "locked_until": r[12],
        "perm_version": r[13],
        "password_changed_at": r[14],
        "last_login_at": r[15],
        "created_at": r[16],
        "updated_at": r[17],
    }


class SQLAlchemyUserRepository(IUserRepository):
    def __init__(self, provider: "StorageProvider") -> None:
        self._provider = provider

    @property
    def _engine(self):
        return self._provider.get_engine()

    def create(self, user: dict) -> dict:
        now = time.time()
        row = {
            "id": user.get("id") or str(uuid.uuid4()),
            "org_id": user["org_id"],
            "email": user["email"].strip().lower(),
            "username": user.get("username"),
            "full_name": user.get("full_name"),
            "hashed_password": user["hashed_password"],
            "is_active": user.get("is_active", True),
            "is_verified": user.get("is_verified", False),
            "must_change_password": user.get("must_change_password", False),
            "mfa_enabled": False,
            "mfa_secret_encrypted": None,
            "failed_login_count": 0,
            "locked_until": None,
            "perm_version": 1,
            "password_changed_at": now,
            "last_login_at": None,
            "created_at": now,
            "updated_at": now,
        }
        with Session(self._engine) as session:
            session.execute(
                text(
                    f"INSERT INTO users ({_COLUMNS}) VALUES "
                    "(:id, :org_id, :email, :username, :full_name, :hashed_password, "
                    ":is_active, :is_verified, :must_change_password, :mfa_enabled, "
                    ":mfa_secret_encrypted, :failed_login_count, :locked_until, "
                    ":perm_version, :password_changed_at, :last_login_at, :created_at, :updated_at)"
                ),
                row,
            )
            session.commit()
        return row

    def get(self, user_id: str) -> Optional[dict]:
        with Session(self._engine) as session:
            r = session.execute(
                text(f"SELECT {_COLUMNS} FROM users WHERE id = :id"), {"id": user_id}
            ).fetchone()
        return _row_to_dict(r) if r else None

    def get_by_email(self, email: str) -> Optional[dict]:
        with Session(self._engine) as session:
            r = session.execute(
                text(f"SELECT {_COLUMNS} FROM users WHERE email = :email"),
                {"email": (email or "").strip().lower()},
            ).fetchone()
        return _row_to_dict(r) if r else None

    def list_by_org(self, org_id: str) -> list[dict]:
        with Session(self._engine) as session:
            rows = session.execute(
                text(f"SELECT {_COLUMNS} FROM users WHERE org_id = :org_id ORDER BY created_at ASC"),
                {"org_id": org_id},
            ).all()
        return [_row_to_dict(r) for r in rows]

    def update(self, user_id: str, changes: dict) -> Optional[dict]:
        allowed = {
            "email", "username", "full_name", "hashed_password", "is_active",
            "is_verified", "must_change_password", "mfa_enabled",
            "mfa_secret_encrypted", "password_changed_at",
        }
        sets = {k: v for k, v in changes.items() if k in allowed}
        if not sets:
            return self.get(user_id)
        if "email" in sets:
            sets["email"] = sets["email"].strip().lower()
        sets["updated_at"] = time.time()
        assignments = ", ".join(f"{k} = :{k}" for k in sets)
        with Session(self._engine) as session:
            session.execute(
                text(f"UPDATE users SET {assignments} WHERE id = :id"),
                {**sets, "id": user_id},
            )
            session.commit()
        return self.get(user_id)

    def delete(self, user_id: str) -> None:
        with Session(self._engine) as session:
            session.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
            session.commit()

    def increment_failed_login(self, user_id: str) -> int:
        with Session(self._engine) as session:
            session.execute(
                text(
                    "UPDATE users SET failed_login_count = failed_login_count + 1, "
                    "updated_at = :now WHERE id = :id"
                ),
                {"id": user_id, "now": time.time()},
            )
            session.commit()
            r = session.execute(
                text("SELECT failed_login_count FROM users WHERE id = :id"), {"id": user_id}
            ).fetchone()
        return r[0] if r else 0

    def reset_failed_login(self, user_id: str) -> None:
        with Session(self._engine) as session:
            session.execute(
                text(
                    "UPDATE users SET failed_login_count = 0, locked_until = NULL, "
                    "updated_at = :now WHERE id = :id"
                ),
                {"id": user_id, "now": time.time()},
            )
            session.commit()

    def set_lock(self, user_id: str, locked_until: Optional[float]) -> None:
        with Session(self._engine) as session:
            session.execute(
                text("UPDATE users SET locked_until = :locked_until, updated_at = :now WHERE id = :id"),
                {"id": user_id, "locked_until": locked_until, "now": time.time()},
            )
            session.commit()

    def bump_perm_version(self, user_id: str) -> int:
        with Session(self._engine) as session:
            session.execute(
                text(
                    "UPDATE users SET perm_version = perm_version + 1, updated_at = :now "
                    "WHERE id = :id"
                ),
                {"id": user_id, "now": time.time()},
            )
            session.commit()
            r = session.execute(
                text("SELECT perm_version FROM users WHERE id = :id"), {"id": user_id}
            ).fetchone()
        return r[0] if r else 0

    def touch_login(self, user_id: str) -> None:
        with Session(self._engine) as session:
            session.execute(
                text("UPDATE users SET last_login_at = :now, updated_at = :now WHERE id = :id"),
                {"id": user_id, "now": time.time()},
            )
            session.commit()
