"""
Abstract repository interfaces for all ConfigFoundry persistence entities.

Each interface defines the full persistence contract for one domain aggregate,
independent of the underlying storage technology.  Concrete implementations
live in core/repositories/sqlite/.

Programming against these interfaces (rather than concrete classes) allows:
- Unit-testing services with lightweight mock/stub repositories
- Future database backend support (PostgreSQL, MySQL, SQL Server, etc.)
- Clean separation: services never know which database they are talking to

Naming convention
-----------------
Interfaces are prefixed with ``I`` to distinguish them from concrete classes
and to make dependency injection signatures self-documenting at a glance.
"""
from abc import ABC, abstractmethod
from typing import Optional


# ---------------------------------------------------------------------------
# Device
# ---------------------------------------------------------------------------

class IDeviceRepository(ABC):
    """CRUD and bulk-operations for device records."""

    @abstractmethod
    def list_all(self) -> list[dict]:
        """Return all device records ordered by insertion time (oldest first)."""
        ...

    @abstractmethod
    def get(self, device_id: str) -> Optional[dict]:
        """Return a single device by ID, or None if it does not exist."""
        ...

    @abstractmethod
    def upsert(self, device: dict) -> dict:
        """Insert or update a device.  Assigns an ID if one is not present.
        Returns the saved record (with ID populated)."""
        ...

    @abstractmethod
    def delete(self, device_id: str) -> None:
        """Delete a device by ID.  No-op if the device does not exist."""
        ...

    @abstractmethod
    def replace_all(self, devices: list[dict]) -> None:
        """Delete all existing devices and insert the provided list atomically."""
        ...

    @abstractmethod
    def merge(self, devices: list[dict]) -> None:
        """Upsert each device in the list without touching unreferenced records."""
        ...


# ---------------------------------------------------------------------------
# Bandwidth caps
# ---------------------------------------------------------------------------

class IBandwidthRepository(ABC):
    """CRUD and bulk-operations for bandwidth cap records."""

    @abstractmethod
    def list_all(self) -> list[dict]:
        ...

    @abstractmethod
    def get(self, row_id: str) -> Optional[dict]:
        ...

    @abstractmethod
    def upsert(self, row: dict) -> dict:
        ...

    @abstractmethod
    def delete(self, row_id: str) -> None:
        ...

    @abstractmethod
    def replace_all(self, rows: list[dict]) -> None:
        ...

    @abstractmethod
    def merge(self, rows: list[dict]) -> None:
        ...


# ---------------------------------------------------------------------------
# Subnets
# ---------------------------------------------------------------------------

class ISubnetRepository(ABC):
    """CRUD and bulk-operations for subnet (CIDR) records."""

    @abstractmethod
    def list_all(self) -> list[dict]:
        ...

    @abstractmethod
    def get(self, row_id: str) -> Optional[dict]:
        ...

    @abstractmethod
    def upsert(self, row: dict) -> dict:
        ...

    @abstractmethod
    def delete(self, row_id: str) -> None:
        ...

    @abstractmethod
    def replace_all(self, rows: list[dict]) -> None:
        ...

    @abstractmethod
    def merge(self, rows: list[dict]) -> None:
        ...

    @abstractmethod
    def find_for_ip(self, ip_str: str, subnets: Optional[list[dict]] = None) -> Optional[dict]:
        """Return the most-specific subnet (longest prefix) that contains ip_str,
        or None.  Accepts an optional pre-loaded subnet list to avoid a
        redundant DB read when the caller already has one."""
        ...


# ---------------------------------------------------------------------------
# Tag definitions
# ---------------------------------------------------------------------------

class ITagRepository(ABC):
    """CRUD for dynamic tag definitions."""

    @abstractmethod
    def list_all(self) -> list[dict]:
        ...

    @abstractmethod
    def get(self, tag_id: str) -> Optional[dict]:
        ...

    @abstractmethod
    def upsert(self, tag_def: dict) -> dict:
        """Insert or update a tag definition.  Assigns an ID if absent.
        Expected shape: {id?, name, scopes: [...], values: [...]}"""
        ...

    @abstractmethod
    def delete(self, tag_id: str) -> None:
        ...

    @abstractmethod
    def usage_count(self, tag_id: str) -> int:
        """Total number of records (across all scopes this tag applies to)
        that currently have a non-empty value set for this tag."""
        ...

    @abstractmethod
    def value_usage_count(self, tag_id: str, value: str) -> int:
        """How many records currently have this exact value set for this tag."""
        ...


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

class IAuditRepository(ABC):
    """Append-only audit log."""

    @abstractmethod
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
        """
        Append an audit entry.  Returns the new entry's UUID.

        The keyword-only fields were added for the auth/RBAC/policy layer
        (security events: login, logout, role change, policy violation,
        etc.) and all default to None, so every pre-existing call site
        (business-object create/update/delete) is unaffected.
        """
        ...

    @abstractmethod
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
        """Filtered search over the audit log, newest first. Used by the
        security audit UI/API (GET /api/v1/audit/security)."""
        ...

    @abstractmethod
    def list_recent(self, limit: int = 100) -> list[dict]:
        """Return the *limit* most-recent entries, newest first."""
        ...


# ---------------------------------------------------------------------------
# YAML generation history
# ---------------------------------------------------------------------------

class IHistoryRepository(ABC):
    """Append-only YAML generation history."""

    @abstractmethod
    def save(self, actor: Optional[str], summary: str, files: dict) -> str:
        """Persist a generation snapshot.  Returns the new entry's UUID."""
        ...

    @abstractmethod
    def list_recent(self, limit: int = 50) -> list[dict]:
        """Return the *limit* most-recent entries, newest first (without files blob)."""
        ...

    @abstractmethod
    def get(self, entry_id: str) -> Optional[dict]:
        """Return a single history entry including its files blob, or None."""
        ...


# ---------------------------------------------------------------------------
# Fixed lists  (Collector Region only — see storage module-level docstring)
# ---------------------------------------------------------------------------

class IListRepository(ABC):
    """Managed dropdown lists.  Only Collector Region remains a fixed list."""

    @abstractmethod
    def get_all(self) -> dict:
        """Return {list_name: [items]} for every managed list."""
        ...

    @abstractmethod
    def set_list(self, list_name: str, items: list) -> None:
        """Replace the items for the named list."""
        ...


# ---------------------------------------------------------------------------
# Meta key-value store
# ---------------------------------------------------------------------------

class IMetaRepository(ABC):
    """Small key-value store (lastSavedAt, lastSavedBy, schema_version, …)."""

    @abstractmethod
    def get_kv(self, key: str) -> Optional[str]:
        """Return the stored string value for *key*, or None."""
        ...

    @abstractmethod
    def set_kv(self, key: str, value: str) -> None:
        """Upsert a single key-value pair."""
        ...


# ---------------------------------------------------------------------------
# Organizations
# ---------------------------------------------------------------------------

class IOrganizationRepository(ABC):
    @abstractmethod
    def create(self, org: dict) -> dict: ...

    @abstractmethod
    def get(self, org_id: str) -> Optional[dict]: ...

    @abstractmethod
    def get_by_slug(self, slug: str) -> Optional[dict]: ...

    @abstractmethod
    def list_all(self) -> list[dict]: ...

    @abstractmethod
    def update(self, org_id: str, changes: dict) -> Optional[dict]: ...


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class IUserRepository(ABC):
    @abstractmethod
    def create(self, user: dict) -> dict: ...

    @abstractmethod
    def get(self, user_id: str) -> Optional[dict]: ...

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[dict]: ...

    @abstractmethod
    def list_by_org(self, org_id: str) -> list[dict]: ...

    @abstractmethod
    def update(self, user_id: str, changes: dict) -> Optional[dict]: ...

    @abstractmethod
    def delete(self, user_id: str) -> None: ...

    @abstractmethod
    def increment_failed_login(self, user_id: str) -> int:
        """Increment failed_login_count and return the new value."""
        ...

    @abstractmethod
    def reset_failed_login(self, user_id: str) -> None: ...

    @abstractmethod
    def set_lock(self, user_id: str, locked_until: Optional[float]) -> None: ...

    @abstractmethod
    def bump_perm_version(self, user_id: str) -> int:
        """Invalidate all currently-issued access tokens for this user by
        incrementing perm_version. Returns the new value."""
        ...

    @abstractmethod
    def touch_login(self, user_id: str) -> None:
        """Update last_login_at to now."""
        ...


# ---------------------------------------------------------------------------
# Roles & permissions
# ---------------------------------------------------------------------------

class IRoleRepository(ABC):
    @abstractmethod
    def create(self, role: dict) -> dict: ...

    @abstractmethod
    def get(self, role_id: str) -> Optional[dict]: ...

    @abstractmethod
    def list_for_org(self, org_id: str) -> list[dict]:
        """System roles (org_id IS NULL) plus this org's custom roles."""
        ...

    @abstractmethod
    def update(self, role_id: str, changes: dict) -> Optional[dict]: ...

    @abstractmethod
    def delete(self, role_id: str) -> None: ...

    @abstractmethod
    def set_permissions(self, role_id: str, permission_codes: list[str]) -> None: ...

    @abstractmethod
    def get_permission_codes(self, role_id: str) -> list[str]: ...

    @abstractmethod
    def assign_to_user(self, user_id: str, role_id: str, org_id: str) -> None: ...

    @abstractmethod
    def unassign_from_user(self, user_id: str, role_id: str, org_id: str) -> None: ...

    @abstractmethod
    def list_for_user(self, user_id: str, org_id: str) -> list[dict]: ...

    @abstractmethod
    def get_effective_permissions(self, user_id: str, org_id: str) -> set[str]:
        """Union of permission codes across every role the user holds in
        this org. This is the single source of truth RBAC checks call."""
        ...


class IPermissionRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[dict]: ...

    @abstractmethod
    def get_by_code(self, code: str) -> Optional[dict]: ...

    @abstractmethod
    def ensure_seeded(self, catalog: list[dict]) -> None:
        """Idempotently insert any permission codes from *catalog* that
        don't already exist."""
        ...


# ---------------------------------------------------------------------------
# Refresh tokens
# ---------------------------------------------------------------------------

class IRefreshTokenRepository(ABC):
    @abstractmethod
    def create(self, token: dict) -> dict: ...

    @abstractmethod
    def get_by_hash(self, token_hash: str) -> Optional[dict]: ...

    @abstractmethod
    def revoke(self, token_id: str) -> None: ...

    @abstractmethod
    def revoke_family(self, family_id: str) -> None:
        """Revoke every token descended from one login -- used when reuse
        of an already-rotated token is detected (possible theft)."""
        ...

    @abstractmethod
    def revoke_all_for_user(self, user_id: str) -> None: ...

    @abstractmethod
    def list_active_for_user(self, user_id: str) -> list[dict]: ...

    @abstractmethod
    def mark_replaced(self, token_id: str, replaced_by: str) -> None:
        """Revoke *token_id* and record which new token replaced it
        (rotation audit trail)."""
        ...


# ---------------------------------------------------------------------------
# API keys
# ---------------------------------------------------------------------------

class IAPIKeyRepository(ABC):
    @abstractmethod
    def create(self, api_key: dict) -> dict: ...

    @abstractmethod
    def get(self, key_id: str) -> Optional[dict]: ...

    @abstractmethod
    def get_by_hash(self, key_hash: str) -> Optional[dict]: ...

    @abstractmethod
    def list_for_org(self, org_id: str) -> list[dict]: ...

    @abstractmethod
    def revoke(self, key_id: str) -> None: ...

    @abstractmethod
    def touch_last_used(self, key_id: str, ts: float) -> None: ...


# ---------------------------------------------------------------------------
# Access Policy Engine -- network ACLs
# ---------------------------------------------------------------------------

class INetworkACLRepository(ABC):
    @abstractmethod
    def create(self, rule: dict) -> dict: ...

    @abstractmethod
    def list_effective(self, org_id: Optional[str]) -> list[dict]:
        """Enabled global rules (org_id NULL) plus this org's enabled
        rules, ordered by priority ascending (lower number evaluated
        first). Used by the policy engine at request time."""
        ...

    @abstractmethod
    def list_all_for_org(self, org_id: Optional[str]) -> list[dict]:
        """Same scoping as list_effective but includes disabled rules --
        used by the admin UI/API so disabled rules are still visible."""
        ...

    @abstractmethod
    def delete(self, rule_id: str) -> None: ...

    @abstractmethod
    def set_enabled(self, rule_id: str, enabled: bool) -> None: ...


# ---------------------------------------------------------------------------
# MFA backup codes
# ---------------------------------------------------------------------------

class IMFABackupCodeRepository(ABC):
    @abstractmethod
    def replace_all(self, user_id: str, code_hashes: list[str]) -> None:
        """Discard any existing codes and store a freshly generated set."""
        ...

    @abstractmethod
    def consume(self, user_id: str, code: str) -> bool:
        """Verify *code* against the user's unused backup codes; if valid,
        mark it used (one-time) and return True."""
        ...

    @abstractmethod
    def count_remaining(self, user_id: str) -> int: ...
