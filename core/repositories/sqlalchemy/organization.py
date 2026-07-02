"""SQLAlchemy implementation of IOrganizationRepository."""
from __future__ import annotations

import time
import uuid
from typing import Optional, TYPE_CHECKING

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.repositories.interfaces import IOrganizationRepository

if TYPE_CHECKING:
    from core.storage.provider import StorageProvider

_COLUMNS = "id, name, slug, is_active, created_at, updated_at"


def _row_to_dict(r) -> dict:
    return {
        "id": r[0],
        "name": r[1],
        "slug": r[2],
        "is_active": bool(r[3]),
        "created_at": r[4],
        "updated_at": r[5],
    }


class SQLAlchemyOrganizationRepository(IOrganizationRepository):
    def __init__(self, provider: "StorageProvider") -> None:
        self._provider = provider

    @property
    def _engine(self):
        return self._provider.get_engine()

    def create(self, org: dict) -> dict:
        now = time.time()
        row = {
            "id": org.get("id") or str(uuid.uuid4()),
            "name": org["name"],
            "slug": org["slug"],
            "is_active": org.get("is_active", True),
            "created_at": now,
            "updated_at": now,
        }
        with Session(self._engine) as session:
            session.execute(
                text(
                    "INSERT INTO organizations (id, name, slug, is_active, created_at, updated_at) "
                    "VALUES (:id, :name, :slug, :is_active, :created_at, :updated_at)"
                ),
                row,
            )
            session.commit()
        return row

    def get(self, org_id: str) -> Optional[dict]:
        with Session(self._engine) as session:
            r = session.execute(
                text(f"SELECT {_COLUMNS} FROM organizations WHERE id = :id"), {"id": org_id}
            ).fetchone()
        return _row_to_dict(r) if r else None

    def get_by_slug(self, slug: str) -> Optional[dict]:
        with Session(self._engine) as session:
            r = session.execute(
                text(f"SELECT {_COLUMNS} FROM organizations WHERE slug = :slug"), {"slug": slug}
            ).fetchone()
        return _row_to_dict(r) if r else None

    def list_all(self) -> list[dict]:
        with Session(self._engine) as session:
            rows = session.execute(text(f"SELECT {_COLUMNS} FROM organizations ORDER BY created_at ASC")).all()
        return [_row_to_dict(r) for r in rows]

    def update(self, org_id: str, changes: dict) -> Optional[dict]:
        allowed = {"name", "slug", "is_active"}
        sets = {k: v for k, v in changes.items() if k in allowed}
        if not sets:
            return self.get(org_id)
        sets["updated_at"] = time.time()
        assignments = ", ".join(f"{k} = :{k}" for k in sets)
        with Session(self._engine) as session:
            session.execute(
                text(f"UPDATE organizations SET {assignments} WHERE id = :id"),
                {**sets, "id": org_id},
            )
            session.commit()
        return self.get(org_id)
