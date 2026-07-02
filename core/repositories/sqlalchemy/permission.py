"""SQLAlchemy implementation of IPermissionRepository."""
from __future__ import annotations

import uuid
from typing import Optional, TYPE_CHECKING

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.repositories.interfaces import IPermissionRepository

if TYPE_CHECKING:
    from core.storage.provider import StorageProvider

_COLUMNS = "id, code, category, description"


def _row_to_dict(r) -> dict:
    return {"id": r[0], "code": r[1], "category": r[2], "description": r[3]}


class SQLAlchemyPermissionRepository(IPermissionRepository):
    def __init__(self, provider: "StorageProvider") -> None:
        self._provider = provider

    @property
    def _engine(self):
        return self._provider.get_engine()

    def list_all(self) -> list[dict]:
        with Session(self._engine) as session:
            rows = session.execute(text(f"SELECT {_COLUMNS} FROM permissions ORDER BY code ASC")).all()
        return [_row_to_dict(r) for r in rows]

    def get_by_code(self, code: str) -> Optional[dict]:
        with Session(self._engine) as session:
            r = session.execute(
                text(f"SELECT {_COLUMNS} FROM permissions WHERE code = :code"), {"code": code}
            ).fetchone()
        return _row_to_dict(r) if r else None

    def ensure_seeded(self, catalog: list[dict]) -> None:
        with Session(self._engine) as session:
            existing = {
                row[0]
                for row in session.execute(text("SELECT code FROM permissions")).all()
            }
            for entry in catalog:
                if entry["code"] in existing:
                    continue
                session.execute(
                    text(
                        "INSERT INTO permissions (id, code, category, description) "
                        "VALUES (:id, :code, :category, :description)"
                    ),
                    {
                        "id": str(uuid.uuid4()),
                        "code": entry["code"],
                        "category": entry.get("category"),
                        "description": entry.get("description"),
                    },
                )
            session.commit()
