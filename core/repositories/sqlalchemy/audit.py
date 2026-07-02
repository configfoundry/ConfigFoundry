"""SQLAlchemy implementation of IAuditRepository (append-only audit log)."""
import json
import time
import uuid
from typing import Optional, TYPE_CHECKING

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.repositories.interfaces import IAuditRepository
from core.repositories.sqlalchemy.base import now_iso_from_unix

if TYPE_CHECKING:
    from core.storage.provider import StorageProvider


_COLUMNS = (
    "id, ts, actor, action, details, org_id, actor_type, source_ip, "
    "user_agent, resource_type, resource_id, result, correlation_id"
)


def _row_to_dict(r) -> dict:
    return {
        "id": r[0],
        "ts": now_iso_from_unix(r[1]),
        "actor": r[2],
        "action": r[3],
        "details": json.loads(r[4]) if r[4] else None,
        "org_id": r[5],
        "actor_type": r[6],
        "source_ip": r[7],
        "user_agent": r[8],
        "resource_type": r[9],
        "resource_id": r[10],
        "result": r[11],
        "correlation_id": r[12],
    }


class SQLAlchemyAuditRepository(IAuditRepository):
    """Persists audit entries in the ``audit_log`` table."""

    def __init__(self, provider: "StorageProvider") -> None:
        self._provider = provider

    @property
    def _engine(self):
        return self._provider.get_engine()

    def log(
        self,
        actor: Optional[str],
        action: str,
        details=None,
        *,
        org_id: Optional[str] = None,
        actor_type: Optional[str] = None,
        source_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        result: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> str:
        entry_id = str(uuid.uuid4())
        with Session(self._engine) as session:
            session.execute(
                text(
                    "INSERT INTO audit_log "
                    "(id, ts, actor, action, details, org_id, actor_type, "
                    " source_ip, user_agent, resource_type, resource_id, "
                    " result, correlation_id) "
                    "VALUES "
                    "(:id, :ts, :actor, :action, :details, :org_id, :actor_type, "
                    " :source_ip, :user_agent, :resource_type, :resource_id, "
                    " :result, :correlation_id)"
                ),
                {
                    "id": entry_id,
                    "ts": time.time(),
                    "actor": actor or "unknown",
                    "action": action,
                    "details": json.dumps(details) if details is not None else None,
                    "org_id": org_id,
                    "actor_type": actor_type,
                    "source_ip": source_ip,
                    "user_agent": user_agent,
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "result": result,
                    "correlation_id": correlation_id,
                },
            )
            session.commit()
        return entry_id

    def list_recent(self, limit: int = 100) -> list[dict]:
        with Session(self._engine) as session:
            rows = session.execute(
                text(f"SELECT {_COLUMNS} FROM audit_log ORDER BY ts DESC LIMIT :limit"),
                {"limit": limit},
            ).all()
        return [_row_to_dict(r) for r in rows]

    def search(
        self,
        *,
        actor: Optional[str] = None,
        action: Optional[str] = None,
        result: Optional[str] = None,
        org_id: Optional[str] = None,
        since_ts: Optional[float] = None,
        until_ts: Optional[float] = None,
        limit: int = 100,
    ) -> list[dict]:
        clauses = []
        params: dict = {"limit": limit}
        if actor:
            clauses.append("actor = :actor")
            params["actor"] = actor
        if action:
            clauses.append("action = :action")
            params["action"] = action
        if result:
            clauses.append("result = :result")
            params["result"] = result
        if org_id:
            clauses.append("org_id = :org_id")
            params["org_id"] = org_id
        if since_ts is not None:
            clauses.append("ts >= :since_ts")
            params["since_ts"] = since_ts
        if until_ts is not None:
            clauses.append("ts <= :until_ts")
            params["until_ts"] = until_ts

        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        with Session(self._engine) as session:
            rows = session.execute(
                text(f"SELECT {_COLUMNS} FROM audit_log {where} ORDER BY ts DESC LIMIT :limit"),
                params,
            ).all()
        return [_row_to_dict(r) for r in rows]
