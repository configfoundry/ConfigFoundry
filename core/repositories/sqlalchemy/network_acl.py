"""SQLAlchemy implementation of INetworkACLRepository (Access Policy Engine
IP allow/deny rules)."""
from __future__ import annotations

import time
import uuid
from typing import Optional, TYPE_CHECKING

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.repositories.interfaces import INetworkACLRepository

if TYPE_CHECKING:
    from core.storage.provider import StorageProvider

_COLUMNS = "id, org_id, rule_type, cidr, description, priority, enabled, created_by, created_at"


def _row_to_dict(r) -> dict:
    return {
        "id": r[0],
        "org_id": r[1],
        "rule_type": r[2],
        "cidr": r[3],
        "description": r[4],
        "priority": r[5],
        "enabled": bool(r[6]),
        "created_by": r[7],
        "created_at": r[8],
    }


class SQLAlchemyNetworkACLRepository(INetworkACLRepository):
    def __init__(self, provider: "StorageProvider") -> None:
        self._provider = provider

    @property
    def _engine(self):
        return self._provider.get_engine()

    def create(self, rule: dict) -> dict:
        row = {
            "id": rule.get("id") or str(uuid.uuid4()),
            "org_id": rule.get("org_id"),
            "rule_type": rule["rule_type"],
            "cidr": rule["cidr"],
            "description": rule.get("description"),
            "priority": rule.get("priority", 100),
            "enabled": rule.get("enabled", True),
            "created_by": rule.get("created_by"),
            "created_at": time.time(),
        }
        with Session(self._engine) as session:
            session.execute(
                text(
                    f"INSERT INTO network_acls ({_COLUMNS}) VALUES "
                    "(:id, :org_id, :rule_type, :cidr, :description, :priority, "
                    ":enabled, :created_by, :created_at)"
                ),
                row,
            )
            session.commit()
        return row

    def list_effective(self, org_id: Optional[str]) -> list[dict]:
        with Session(self._engine) as session:
            if org_id:
                rows = session.execute(
                    text(
                        f"SELECT {_COLUMNS} FROM network_acls "
                        "WHERE (org_id IS NULL OR org_id = :org_id) AND enabled = 1 "
                        "ORDER BY priority ASC"
                    ),
                    {"org_id": org_id},
                ).all()
            else:
                rows = session.execute(
                    text(
                        f"SELECT {_COLUMNS} FROM network_acls "
                        "WHERE org_id IS NULL AND enabled = 1 ORDER BY priority ASC"
                    )
                ).all()
        return [_row_to_dict(r) for r in rows]

    def list_all_for_org(self, org_id: Optional[str]) -> list[dict]:
        with Session(self._engine) as session:
            if org_id:
                rows = session.execute(
                    text(
                        f"SELECT {_COLUMNS} FROM network_acls "
                        "WHERE org_id IS NULL OR org_id = :org_id ORDER BY priority ASC"
                    ),
                    {"org_id": org_id},
                ).all()
            else:
                rows = session.execute(
                    text(f"SELECT {_COLUMNS} FROM network_acls WHERE org_id IS NULL ORDER BY priority ASC")
                ).all()
        return [_row_to_dict(r) for r in rows]

    def delete(self, rule_id: str) -> None:
        with Session(self._engine) as session:
            session.execute(text("DELETE FROM network_acls WHERE id = :id"), {"id": rule_id})
            session.commit()

    def set_enabled(self, rule_id: str, enabled: bool) -> None:
        with Session(self._engine) as session:
            session.execute(
                text("UPDATE network_acls SET enabled = :enabled WHERE id = :id"),
                {"id": rule_id, "enabled": enabled},
            )
            session.commit()
