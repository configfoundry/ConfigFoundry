"""
SQLAlchemy 2.x ORM models for authentication, authorization, and the
Access Policy Engine.

Unlike the JSON-blob entity tables in ``models/inventory.py`` (id / data /
updated_at), these are properly normalized relational tables -- RBAC and
policy lookups need real columns, foreign keys, and indexes, not a JSON
blob scanned in Python.

Table map
---------
``organizations``    Multi-tenant root. Every security entity below is
                      scoped to one (or, for system-wide roles/policies,
                      NULL = applies to all orgs).
``users``             Human accounts. Passwords are Argon2id hashes
                      (core/security/password.py); MFA seeds are AES-GCM
                      encrypted (core/security/crypto.py), never plaintext.
``roles``             Named bundles of permissions. ``is_system=True`` rows
                      are the five seeded roles (Super Admin, Organization
                      Admin, Operator, Read Only, Auditor); orgs may also
                      define custom roles.
``permissions``       Flat catalog of permission codes (e.g.
                      "inventory:write"). Never hardcoded in route
                      handlers -- routes depend on a permission CODE, and
                      which roles grant that code is entirely data-driven.
``role_permissions``  Role <-> Permission (many-to-many).
``user_roles``        User <-> Role, scoped per organization (a user can
                      hold different roles in different orgs).
``refresh_tokens``    Opaque, hashed, rotate-on-use refresh tokens with
                      reuse detection via ``family_id``.
``api_keys``          Hashed, scoped, IP-restrictable service-account
                      credentials.
``network_acls``      Access Policy Engine allow/deny CIDR rules.
``mfa_backup_codes``  One-time TOTP recovery codes, hashed.

See ``models/inventory.py`` for the existing ``AuditLogModel`` -- it has
been extended (not duplicated) with the richer fields security events
need (org_id, source_ip, user_agent, resource, result, correlation_id).
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


# ---------------------------------------------------------------------------
# Organizations (multi-tenant root)
# ---------------------------------------------------------------------------

class OrganizationModel(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[float] = mapped_column(Float, nullable=False)
    updated_at: Mapped[float] = mapped_column(Float, nullable=False)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    org_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    username: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True)
    full_name: Mapped[Optional[str]] = mapped_column(String)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # MFA
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    mfa_secret_encrypted: Mapped[Optional[str]] = mapped_column(Text)

    # Brute-force protection
    failed_login_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    locked_until: Mapped[Optional[float]] = mapped_column(Float)

    # Token invalidation stamp -- bumped on role change / forced logout /
    # password change so already-issued JWTs stop being honored immediately
    # instead of waiting out their TTL. See core/security/jwt_tokens.py.
    perm_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    password_changed_at: Mapped[float] = mapped_column(Float, nullable=False)
    last_login_at: Mapped[Optional[float]] = mapped_column(Float)
    created_at: Mapped[float] = mapped_column(Float, nullable=False)
    updated_at: Mapped[float] = mapped_column(Float, nullable=False)


# ---------------------------------------------------------------------------
# Roles & permissions (fine-grained RBAC)
# ---------------------------------------------------------------------------

class RoleModel(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    # NULL org_id = system role, visible/assignable in every organization.
    org_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("organizations.id"), index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[float] = mapped_column(Float, nullable=False)


class PermissionModel(Base):
    __tablename__ = "permissions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    code: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    category: Mapped[Optional[str]] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text)


class RolePermissionModel(Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[str] = mapped_column(
        String, ForeignKey("roles.id"), primary_key=True
    )
    permission_id: Mapped[str] = mapped_column(
        String, ForeignKey("permissions.id"), primary_key=True
    )


class UserRoleModel(Base):
    __tablename__ = "user_roles"

    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), primary_key=True
    )
    role_id: Mapped[str] = mapped_column(
        String, ForeignKey("roles.id"), primary_key=True
    )
    # Scopes the grant to one org -- required even though role_id already
    # may belong to an org, because system roles (org_id NULL on the role
    # itself) are assigned to a user *within* a specific org.
    org_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id"), primary_key=True
    )


# ---------------------------------------------------------------------------
# Refresh tokens (rotation + reuse detection)
# ---------------------------------------------------------------------------

class RefreshTokenModel(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    # All tokens descended from one original login share a family_id. If a
    # revoked/already-rotated token is presented again, the whole family is
    # revoked -- that pattern only happens if a refresh token was stolen and
    # used by both the attacker and the legitimate holder.
    family_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    issued_at: Mapped[float] = mapped_column(Float, nullable=False)
    expires_at: Mapped[float] = mapped_column(Float, nullable=False)
    revoked_at: Mapped[Optional[float]] = mapped_column(Float)
    replaced_by: Mapped[Optional[str]] = mapped_column(String)
    source_ip: Mapped[Optional[str]] = mapped_column(String)
    user_agent: Mapped[Optional[str]] = mapped_column(String)


# ---------------------------------------------------------------------------
# API keys (service accounts / machine-to-machine)
# ---------------------------------------------------------------------------

class APIKeyModel(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    org_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    owner_user_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.id"))

    key_prefix: Mapped[str] = mapped_column(String, nullable=False, index=True)
    key_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)

    # JSON-encoded list of permission codes granted to this key. Stored as
    # Text (like the entity tables) rather than a join table -- API key
    # scopes are a fixed snapshot at creation time, not something that
    # needs relational querying.
    permissions: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    # JSON-encoded list of CIDR strings this key may be used from. Empty
    # list = no IP restriction.
    allowed_ips: Mapped[str] = mapped_column(Text, nullable=False, default="[]")

    environment: Mapped[str] = mapped_column(String, nullable=False, default="production")
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    expires_at: Mapped[Optional[float]] = mapped_column(Float)
    last_used_at: Mapped[Optional[float]] = mapped_column(Float)
    created_at: Mapped[float] = mapped_column(Float, nullable=False)
    revoked_at: Mapped[Optional[float]] = mapped_column(Float)


# ---------------------------------------------------------------------------
# Access Policy Engine -- network ACLs
# ---------------------------------------------------------------------------

class NetworkACLModel(Base):
    __tablename__ = "network_acls"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    # NULL org_id = global rule, evaluated for every organization.
    org_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("organizations.id"), index=True
    )
    rule_type: Mapped[str] = mapped_column(String, nullable=False)  # "allow" | "deny"
    cidr: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String)
    # Lower priority number = evaluated first. Deny rules should generally
    # sit at lower priority numbers than allow rules so an explicit deny
    # cannot be shadowed by a broad allow -- the policy engine documents
    # its precedence rules in core/services/policy_engine.py.
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[float] = mapped_column(Float, nullable=False)


# ---------------------------------------------------------------------------
# MFA backup codes
# ---------------------------------------------------------------------------

class MFABackupCodeModel(Base):
    __tablename__ = "mfa_backup_codes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    code_hash: Mapped[str] = mapped_column(String, nullable=False)
    used_at: Mapped[Optional[float]] = mapped_column(Float)
    created_at: Mapped[float] = mapped_column(Float, nullable=False)
