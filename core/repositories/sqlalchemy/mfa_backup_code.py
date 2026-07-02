"""SQLAlchemy implementation of IMFABackupCodeRepository."""
from __future__ import annotations

import time
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.repositories.interfaces import IMFABackupCodeRepository
from core.security.tokens import hash_token, verify_token

if TYPE_CHECKING:
    from core.storage.provider import StorageProvider


class SQLAlchemyMFABackupCodeRepository(IMFABackupCodeRepository):
    def __init__(self, provider: "StorageProvider") -> None:
        self._provider = provider

    @property
    def _engine(self):
        return self._provider.get_engine()

    def replace_all(self, user_id: str, code_hashes: list[str]) -> None:
        now = time.time()
        with Session(self._engine) as session:
            session.execute(text("DELETE FROM mfa_backup_codes WHERE user_id = :uid"), {"uid": user_id})
            for h in code_hashes:
                session.execute(
                    text(
                        "INSERT INTO mfa_backup_codes (id, user_id, code_hash, used_at, created_at) "
                        "VALUES (:id, :uid, :hash, NULL, :now)"
                    ),
                    {"id": str(uuid.uuid4()), "uid": user_id, "hash": h, "now": now},
                )
            session.commit()

    def consume(self, user_id: str, code: str) -> bool:
        with Session(self._engine) as session:
            rows = session.execute(
                text(
                    "SELECT id, code_hash FROM mfa_backup_codes "
                    "WHERE user_id = :uid AND used_at IS NULL"
                ),
                {"uid": user_id},
            ).all()
            for code_id, code_hash in rows:
                if verify_token(code, code_hash):
                    session.execute(
                        text("UPDATE mfa_backup_codes SET used_at = :now WHERE id = :id"),
                        {"id": code_id, "now": time.time()},
                    )
                    session.commit()
                    return True
        return False

    def count_remaining(self, user_id: str) -> int:
        with Session(self._engine) as session:
            r = session.execute(
                text(
                    "SELECT COUNT(*) FROM mfa_backup_codes WHERE user_id = :uid AND used_at IS NULL"
                ),
                {"uid": user_id},
            ).fetchone()
        return r[0] if r else 0
