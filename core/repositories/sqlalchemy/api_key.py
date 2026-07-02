"""SQLAlchemy implementation of IAPIKeyRepository."""
from __future__ import annotations

import json
import time
import uuid
from typing import Optional, TYPE_CHECKING

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.repositories.interfaces import IAPIKeyRepository

if TYPE_CHECKING:
    from core.storage.provider import StorageProvider

_COLUMNS = (
    "id, org_id, name, owner_user_id, key_prefix, key_hash, permissions, "
    "allowed_ips, environment, enabled, expires_at, last_used_at, "
    "created_at, revoked_at"
)


def _row_to_dict(r) -> dict:
    return {
        "id": r[0],
        "org_id": r[1],
        "name": r[2],
        "owner_user_id": r[3],
        "key_prefix": r[4],
        "key_hash": r[5],
        "permissions": json.loads(r[6]) if r[6] else [],
        "allowed_ips": json.loads(r[7]) if r[7] else [],
        "environment": r[8],
        "enabled": bool(r[9]),
        "expires_at": r[10],
        "last_used_at": r[11],
        "created_at": r[12],
        "revoked_at": r[13],
    }


class SQLAlchemyAPIKeyRepository(IAPIKeyRepository):
    def __init__(self, provider: "StorageProvider") -> None:
        self._provider = provider

    @property
    def _engine(self):
        return self._provider.get_engine()

    def create(self, api_key: dict) -> dict:
        row = {
            "id": api_key.get("id") or str(uuid.uuid4()),
            "org_id": api_key["org_id"],
            "name": api_key["name"],
            "owner_user_id": api_key.get("owner_user_id"),
            "key_prefix": api_key["key_prefix"],
            "key_hash": api_key["key_hash"],
            "permissions": json.dumps(api_key.get("permissions", [])),
            "allowed_ips": json.dumps(api_key.get("allowed_ips", [])),
            "environment": api_key.get("environment", "production"),
            "enabled": True,
            "expires_at": api_key.get("expires_at"),
            "last_used_at": None,
            "created_at": time.time(),
            "revoked_at": None,
        }
        with Session(self._engine) as session:
            session.execute(
                text(
                    f"INSERT INTO api_keys ({_COLUMNS}) VALUES "
                    "(:id, :org_id, :name, :owner_user_id, :key_prefix, :key_hash, "
                    ":permissions, :allowed_ips, :environment, :enabled, :expires_at, "
                    ":last_used_at, :created_at, :revoked_at)"
                ),
                row,
            )
            session.commit()
        return self.get(row["id"])

    def get(self, key_id: str) -> Optional[dict]:
        with Session(self._engine) as session:
            r = session.execute(
                text(f"SELECT {_COLUMNS} FROM api_keys WHERE id = :id"), {"id": key_id}
            ).fetchone()
        return _row_to_dict(r) if r else None

    def get_by_hash(self, key_hash: str) -> Optional[dict]:
        with Session(self._engine) as session:
            r = session.execute(
                text(f"SELECT {_COLUMNS} FROM api_keys WHERE key_hash = :h"), {"h": key_hash}
            ).fetchone()
        return _row_to_dict(r) if r else None

    def list_for_org(self, org_id: str) -> list[dict]:
        with Session(self._engine) as session:
            rows = session.execute(
                text(f"SELECT {_COLUMNS} FROM api_keys WHERE org_id = :org_id ORDER BY created_at DESC"),
                {"org_id": org_id},
            ).all()
        return [_row_to_dict(r) for r in rows]

    def revoke(self, key_id: str) -> None:
        with Session(self._engine) as session:
            session.execute(
                text("UPDATE api_keys SET enabled = 0, revoked_at = :now WHERE id = :id"),
                {"id": key_id, "now": time.time()},
            )
            session.commit()

    def touch_last_used(self, key_id: str, ts: float) -> None:
        with Session(self._engine) as session:
            session.execute(
                text("UPDATE api_keys SET last_used_at = :ts WHERE id = :id"),
                {"id": key_id, "ts": ts},
            )
            session.commit()
