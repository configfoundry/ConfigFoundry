"""
SQLAlchemy 2.x ORM models for ConfigFoundry.

The physical schema is unchanged from the sqlite3 era:
  - Entity tables (devices, bandwidth_caps, subnets, tag_defs):
      id TEXT PK, data TEXT NOT NULL, updated_at REAL NOT NULL
  - Audit / history tables: their own distinct columns
  - lists / meta: simple key-value tables

JSON serialisation/deserialisation remains the responsibility of the
repository layer, not these models.
"""
from typing import Optional

from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


# ---------------------------------------------------------------------------
# JSON-blob entity tables  (id / data / updated_at)
# ---------------------------------------------------------------------------

class DeviceModel(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    data: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[float] = mapped_column(Float, nullable=False)


class BandwidthCapModel(Base):
    __tablename__ = "bandwidth_caps"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    data: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[float] = mapped_column(Float, nullable=False)


class SubnetModel(Base):
    __tablename__ = "subnets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    data: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[float] = mapped_column(Float, nullable=False)


class TagDefModel(Base):
    __tablename__ = "tag_defs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    data: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[float] = mapped_column(Float, nullable=False)


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

class AuditLogModel(Base):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    ts: Mapped[float] = mapped_column(Float, nullable=False)
    actor: Mapped[Optional[str]] = mapped_column(String)
    action: Mapped[str] = mapped_column(String, nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text)

    # ------------------------------------------------------------------
    # Security-event fields (added for the auth/RBAC/policy layer).
    # All nullable so every pre-existing call site (device/bandwidth/
    # subnet/tag change events) keeps working unchanged -- only auth and
    # policy code populates these.
    # ------------------------------------------------------------------
    org_id: Mapped[Optional[str]] = mapped_column(String)
    actor_type: Mapped[Optional[str]] = mapped_column(String)   # user | api_key | system
    source_ip: Mapped[Optional[str]] = mapped_column(String)
    user_agent: Mapped[Optional[str]] = mapped_column(String)
    resource_type: Mapped[Optional[str]] = mapped_column(String)
    resource_id: Mapped[Optional[str]] = mapped_column(String)
    result: Mapped[Optional[str]] = mapped_column(String)       # success | failure | denied
    correlation_id: Mapped[Optional[str]] = mapped_column(String)


# ---------------------------------------------------------------------------
# YAML generation history
# ---------------------------------------------------------------------------

class YamlHistoryModel(Base):
    __tablename__ = "yaml_history"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    ts: Mapped[float] = mapped_column(Float, nullable=False)
    actor: Mapped[Optional[str]] = mapped_column(String)
    summary: Mapped[Optional[str]] = mapped_column(Text)
    files: Mapped[str] = mapped_column(Text, nullable=False)


# ---------------------------------------------------------------------------
# Managed dropdown lists  (list_name / items)
# ---------------------------------------------------------------------------

class ListModel(Base):
    __tablename__ = "lists"

    list_name: Mapped[str] = mapped_column(String, primary_key=True)
    items: Mapped[str] = mapped_column(Text, nullable=False)


# ---------------------------------------------------------------------------
# Key-value metadata store
# ---------------------------------------------------------------------------

class MetaModel(Base):
    __tablename__ = "meta"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[Optional[str]] = mapped_column(Text)
