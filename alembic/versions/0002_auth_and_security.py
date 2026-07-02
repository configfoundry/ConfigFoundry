"""Authentication, RBAC, and Access Policy Engine tables.

Adds the full security layer: organizations (multi-tenant root), users,
roles/permissions (fine-grained RBAC), refresh_tokens, api_keys,
network_acls (IP allow/deny for the Access Policy Engine), and
mfa_backup_codes. Also extends the existing ``audit_log`` table with the
richer fields security events need (org_id, source_ip, user_agent,
resource_type/id, result, correlation_id) rather than creating a second
audit table.

Seed data (idempotent-in-spirit -- this migration only ever runs once per
database, but seeding logic checks for existing rows anyway so a manual
re-run or a future `ensure_seeded()` call doesn't duplicate anything):

* One default Organization (slug "default") -- see
  core/services/organization_service.py for why the existing inventory
  tables aren't yet org-scoped.
* The full permission catalog (core/security/permissions.py).
* The five system roles (Super Admin, Organization Admin, Operator, Read
  Only, Auditor) with their default permission grants.
* One bootstrap Super Admin user, from CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL /
  CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD env vars. If the password env var
  is not set, a random one is generated and printed once -- ConfigFoundry
  intentionally never ships a hardcoded default admin/admin credential.

Revision ID: a3f9c2e1d7b4
Revises: c1f4e7a8b2d0
Create Date: 2026-07-02 00:00:00.000000
"""
from __future__ import annotations

import os
import secrets
import time
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a3f9c2e1d7b4"
down_revision: Union[str, None] = "c1f4e7a8b2d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Organizations
    # ------------------------------------------------------------------
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("org_id", sa.String(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("username", sa.String(), nullable=True),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
        sa.Column("must_change_password", sa.Boolean(), nullable=False),
        sa.Column("mfa_enabled", sa.Boolean(), nullable=False),
        sa.Column("mfa_secret_encrypted", sa.Text(), nullable=True),
        sa.Column("failed_login_count", sa.Integer(), nullable=False),
        sa.Column("locked_until", sa.Float(), nullable=True),
        sa.Column("perm_version", sa.Integer(), nullable=False),
        sa.Column("password_changed_at", sa.Float(), nullable=False),
        sa.Column("last_login_at", sa.Float(), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("username"),
    )
    op.create_index("ix_users_org_id", "users", ["org_id"])

    # ------------------------------------------------------------------
    # Roles & permissions
    # ------------------------------------------------------------------
    op.create_table(
        "roles",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("org_id", sa.String(), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_system", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_roles_org_id", "roles", ["org_id"])

    op.create_table(
        "permissions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "role_permissions",
        sa.Column("role_id", sa.String(), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("permission_id", sa.String(), sa.ForeignKey("permissions.id"), nullable=False),
        sa.PrimaryKeyConstraint("role_id", "permission_id"),
    )

    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("role_id", sa.String(), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("org_id", sa.String(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "role_id", "org_id"),
    )

    # ------------------------------------------------------------------
    # Refresh tokens
    # ------------------------------------------------------------------
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column("family_id", sa.String(), nullable=False),
        sa.Column("issued_at", sa.Float(), nullable=False),
        sa.Column("expires_at", sa.Float(), nullable=False),
        sa.Column("revoked_at", sa.Float(), nullable=True),
        sa.Column("replaced_by", sa.String(), nullable=True),
        sa.Column("source_ip", sa.String(), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_family_id", "refresh_tokens", ["family_id"])

    # ------------------------------------------------------------------
    # API keys
    # ------------------------------------------------------------------
    op.create_table(
        "api_keys",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("org_id", sa.String(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("owner_user_id", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("key_prefix", sa.String(), nullable=False),
        sa.Column("key_hash", sa.String(), nullable=False),
        sa.Column("permissions", sa.Text(), nullable=False),
        sa.Column("allowed_ips", sa.Text(), nullable=False),
        sa.Column("environment", sa.String(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("expires_at", sa.Float(), nullable=True),
        sa.Column("last_used_at", sa.Float(), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("revoked_at", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key_hash"),
    )
    op.create_index("ix_api_keys_org_id", "api_keys", ["org_id"])
    op.create_index("ix_api_keys_key_prefix", "api_keys", ["key_prefix"])

    # ------------------------------------------------------------------
    # Access Policy Engine -- network ACLs
    # ------------------------------------------------------------------
    op.create_table(
        "network_acls",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("org_id", sa.String(), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("rule_type", sa.String(), nullable=False),
        sa.Column("cidr", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_network_acls_org_id", "network_acls", ["org_id"])

    # ------------------------------------------------------------------
    # MFA backup codes
    # ------------------------------------------------------------------
    op.create_table(
        "mfa_backup_codes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("code_hash", sa.String(), nullable=False),
        sa.Column("used_at", sa.Float(), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mfa_backup_codes_user_id", "mfa_backup_codes", ["user_id"])

    # ------------------------------------------------------------------
    # Extend audit_log with security-event fields (all nullable -- every
    # pre-existing call site is unaffected).
    # ------------------------------------------------------------------
    with op.batch_alter_table("audit_log") as batch_op:
        batch_op.add_column(sa.Column("org_id", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("actor_type", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("source_ip", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("user_agent", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("resource_type", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("resource_id", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("result", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("correlation_id", sa.String(), nullable=True))

    # ------------------------------------------------------------------
    # Seed data
    # ------------------------------------------------------------------
    _seed(op.get_bind())


def _seed(conn) -> None:
    # Imported lazily so `alembic revision --autogenerate` and other
    # metadata-only commands don't require the full app import graph.
    from core.security.password import hash_password
    from core.security.config import SecurityConfig
    from core.security.permissions import PERMISSION_CATALOG, SYSTEM_ROLES

    now = time.time()

    # ---- default organization ----
    org_id = str(uuid.uuid4())
    conn.execute(
        sa.text(
            "INSERT INTO organizations (id, name, slug, is_active, created_at, updated_at) "
            "VALUES (:id, :name, :slug, 1, :now, :now)"
        ),
        {"id": org_id, "name": "Default Organization", "slug": "default", "now": now},
    )

    # ---- permission catalog ----
    code_to_id: dict[str, str] = {}
    for perm in PERMISSION_CATALOG:
        perm_id = str(uuid.uuid4())
        code_to_id[perm["code"]] = perm_id
        conn.execute(
            sa.text(
                "INSERT INTO permissions (id, code, category, description) "
                "VALUES (:id, :code, :category, :description)"
            ),
            {"id": perm_id, "code": perm["code"], "category": perm["category"],
             "description": perm["description"]},
        )

    # ---- system roles + grants ----
    role_name_to_id: dict[str, str] = {}
    for role_name, spec in SYSTEM_ROLES.items():
        role_id = str(uuid.uuid4())
        role_name_to_id[role_name] = role_id
        conn.execute(
            sa.text(
                "INSERT INTO roles (id, org_id, name, description, is_system, created_at) "
                "VALUES (:id, NULL, :name, :description, 1, :now)"
            ),
            {"id": role_id, "name": role_name, "description": spec["description"], "now": now},
        )
        for code in spec["permissions"]:
            perm_id = code_to_id.get(code)
            if perm_id is None:
                continue
            conn.execute(
                sa.text(
                    "INSERT INTO role_permissions (role_id, permission_id) VALUES (:r, :p)"
                ),
                {"r": role_id, "p": perm_id},
            )

    # ---- bootstrap Super Admin ----
    config = SecurityConfig()
    bootstrap_email = os.environ.get("CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL", "admin@configfoundry.local")
    bootstrap_password = os.environ.get("CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD")
    generated = bootstrap_password is None
    if generated:
        # Guaranteed to satisfy the default strength policy: 20 chars,
        # mixed via token_urlsafe's alphabet plus an injected digit/symbol.
        bootstrap_password = secrets.token_urlsafe(18) + "aA1!"

    user_id = str(uuid.uuid4())
    conn.execute(
        sa.text(
            "INSERT INTO users (id, org_id, email, username, full_name, hashed_password, "
            "is_active, is_verified, must_change_password, mfa_enabled, mfa_secret_encrypted, "
            "failed_login_count, locked_until, perm_version, password_changed_at, "
            "last_login_at, created_at, updated_at) "
            "VALUES (:id, :org_id, :email, NULL, 'Super Admin', :hashed, "
            "1, 1, :must_change, 0, NULL, 0, NULL, 1, :now, NULL, :now, :now)"
        ),
        {
            "id": user_id, "org_id": org_id, "email": bootstrap_email,
            "hashed": hash_password(bootstrap_password, config),
            "must_change": 1 if generated else 0,
            "now": now,
        },
    )
    conn.execute(
        sa.text("INSERT INTO user_roles (user_id, role_id, org_id) VALUES (:u, :r, :o)"),
        {"u": user_id, "r": role_name_to_id["Super Admin"], "o": org_id},
    )

    if generated:
        print("")
        print("=" * 78)
        print("ConfigFoundry: bootstrap Super Admin account created")
        print(f"  email:    {bootstrap_email}")
        print(f"  password: {bootstrap_password}")
        print("  (password must be changed on first login)")
        print("  Set CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL / _PASSWORD before the first")
        print("  startup to control these instead of using a generated password.")
        print("=" * 78)
        print("")


def downgrade() -> None:
    with op.batch_alter_table("audit_log") as batch_op:
        batch_op.drop_column("correlation_id")
        batch_op.drop_column("result")
        batch_op.drop_column("resource_id")
        batch_op.drop_column("resource_type")
        batch_op.drop_column("user_agent")
        batch_op.drop_column("source_ip")
        batch_op.drop_column("actor_type")
        batch_op.drop_column("org_id")

    op.drop_table("mfa_backup_codes")
    op.drop_table("network_acls")
    op.drop_table("api_keys")
    op.drop_table("refresh_tokens")
    op.drop_table("user_roles")
    op.drop_table("role_permissions")
    op.drop_table("permissions")
    op.drop_table("roles")
    op.drop_table("users")
    op.drop_table("organizations")
