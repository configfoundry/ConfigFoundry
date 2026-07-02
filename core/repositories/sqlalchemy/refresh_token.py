"""SQLAlchemy implementation of IRefreshTokenRepository."""
from __future__ import annotations

import time
import uuid
from typing import Optional, TYPE_CHECKING

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.repositories.interfaces import IRefreshTokenRepository

if TYPE_CHECKING:
    from core.storage.provider import StorageProvider

_COLUMNS = (
    "id, user_id, token_hash, family_id, issued_at, expires_at, "
    "revoked_at, replaced_by, source_ip, user_agent"
)


def _row_to_dict(r) -> dict:
    return {
        "id": r[0],
        "user_id": r[1],
        "token_hash": r[2],
        "family_id": r[3],
        "issued_at": r[4],
        "expires_at": r[5],
        "revoked_at": r[6],
        "replaced_by": r[7],
        "source_ip": r[8],
        "user_agent": r[9],
    }


class SQLAlchemyRefreshTokenRepository(IRefreshTokenRepository):
    def __init__(self, provider: "StorageProvider") -> None:
        self._provider = provider

    @property
    def _engine(self):
        return self._provider.get_engine()

    def create(self, token: dict) -> dict:
        row = {
            "id": token.get("id") or str(uuid.uuid4()),
            "user_id": token["user_id"],
            "token_hash": token["token_hash"],
            "family_id": token.get("family_id") or str(uuid.uuid4()),
            "issued_at": token.get("issued_at", time.time()),
            "expires_at": token["expires_at"],
            "revoked_at": None,
            "replaced_by": None,
            "source_ip": token.get("source_ip"),
            "user_agent": token.get("user_agent"),
        }
        with Session(self._engine) as session:
            session.execute(
                text(
                    f"INSERT INTO refresh_tokens ({_COLUMNS}) VALUES "
                    "(:id, :user_id, :token_hash, :family_id, :issued_at, :expires_at, "
                    ":revoked_at, :replaced_by, :source_ip, :user_agent)"
                ),
                row,
            )
            session.commit()
        return row

    def get_by_hash(self, token_hash: str) -> Optional[dict]:
        with Session(self._engine) as session:
            r = session.execute(
                text(f"SELECT {_COLUMNS} FROM refresh_tokens WHERE token_hash = :h"),
                {"h": token_hash},
            ).fetchone()
        return _row_to_dict(r) if r else None

    def revoke(self, token_id: str) -> None:
        with Session(self._engine) as session:
            session.execute(
                text("UPDATE refresh_tokens SET revoked_at = :now WHERE id = :id AND revoked_at IS NULL"),
                {"id": token_id, "now": time.time()},
            )
            session.commit()

    def revoke_family(self, family_id: str) -> None:
        with Session(self._engine) as session:
            session.execute(
                text(
                    "UPDATE refresh_tokens SET revoked_at = :now "
                    "WHERE family_id = :fid AND revoked_at IS NULL"
                ),
                {"fid": family_id, "now": time.time()},
            )
            session.commit()

    def revoke_all_for_user(self, user_id: str) -> None:
        with Session(self._engine) as session:
            session.execute(
                text(
                    "UPDATE refresh_tokens SET revoked_at = :now "
                    "WHERE user_id = :uid AND revoked_at IS NULL"
                ),
                {"uid": user_id, "now": time.time()},
            )
            session.commit()

    def list_active_for_user(self, user_id: str) -> list[dict]:
        now = time.time()
        with Session(self._engine) as session:
            rows = session.execute(
                text(
                    f"SELECT {_COLUMNS} FROM refresh_tokens WHERE user_id = :uid "
                    "AND revoked_at IS NULL AND expires_at > :now ORDER BY issued_at DESC"
                ),
                {"uid": user_id, "now": now},
            ).all()
        return [_row_to_dict(r) for r in rows]

    def mark_replaced(self, token_id: str, replaced_by: str) -> None:
        with Session(self._engine) as session:
            session.execute(
                text(
                    "UPDATE refresh_tokens SET revoked_at = :now, replaced_by = :rb WHERE id = :id"
                ),
                {"id": token_id, "rb": replaced_by, "now": time.time()},
            )
            session.commit()
