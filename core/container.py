"""
Dependency injection container for ConfigFoundry.

``ServiceContainer`` is the single place where the active ``StorageProvider``
is wired to repositories, and repositories are wired to services.

v0.5 Storage Abstraction changes
---------------------------------
* The container no longer creates a SQLAlchemy engine directly.
* Instead it delegates to ``StorageFactory.create(config.database)`` to
  obtain the correct ``StorageProvider`` for the configured backend.
* All eight repositories receive the provider (not the engine) via
  constructor injection.
* The public interface is identical to the pre-abstraction version so
  ``core/storage.py``, tests, and ``app.py`` require no changes.

Backward compatibility
-----------------------
Passing a plain ``db_path`` string still works::

    container = ServiceContainer(db_path="/path/to/configfoundry.db")

This is equivalent to::

    config = AppConfig.for_sqlite("/path/to/configfoundry.db")
    container = ServiceContainer(config=config)

Usage (in app.py / tests)::

    container = ServiceContainer(config=AppConfig.from_yaml("config.yaml"))
    container = ServiceContainer(db_path="db/configfoundry.db")   # compat
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import Engine

from core.storage.config import AppConfig
from core.storage.factory import StorageFactory
from core.storage.provider import StorageProvider

# --- SQLAlchemy repository implementations ---
from core.repositories.sqlalchemy.device import SQLAlchemyDeviceRepository
from core.repositories.sqlalchemy.bandwidth import SQLAlchemyBandwidthRepository
from core.repositories.sqlalchemy.subnet import SQLAlchemySubnetRepository
from core.repositories.sqlalchemy.tag import SQLAlchemyTagRepository
from core.repositories.sqlalchemy.audit import SQLAlchemyAuditRepository
from core.repositories.sqlalchemy.history import SQLAlchemyHistoryRepository
from core.repositories.sqlalchemy.list import SQLAlchemyListRepository
from core.repositories.sqlalchemy.meta import SQLAlchemyMetaRepository
from core.repositories.sqlalchemy.organization import SQLAlchemyOrganizationRepository
from core.repositories.sqlalchemy.user import SQLAlchemyUserRepository
from core.repositories.sqlalchemy.role import SQLAlchemyRoleRepository
from core.repositories.sqlalchemy.permission import SQLAlchemyPermissionRepository
from core.repositories.sqlalchemy.refresh_token import SQLAlchemyRefreshTokenRepository
from core.repositories.sqlalchemy.api_key import SQLAlchemyAPIKeyRepository
from core.repositories.sqlalchemy.network_acl import SQLAlchemyNetworkACLRepository
from core.repositories.sqlalchemy.mfa_backup_code import SQLAlchemyMFABackupCodeRepository

# --- Services (unchanged) ---
from core.services.device_service import DeviceService
from core.services.bandwidth_service import BandwidthService
from core.services.subnet_service import SubnetService
from core.services.tag_service import TagService
from core.services.list_service import ListService
from core.services.generate_service import GenerateService
from core.services.export_service import ExportService
from core.services.import_service import ImportService
from core.services.audit_service import AuditService
from core.services.history_service import HistoryService
from core.services.meta_service import MetaService

# --- Auth / RBAC / policy services ---
from core.services.auth_service import AuthService
from core.services.mfa_service import MFAService
from core.services.rbac_service import RBACService
from core.services.api_key_service import APIKeyService
from core.services.policy_engine import PolicyEngine
from core.services.policy_service import PolicyService
from core.services.user_service import UserService
from core.services.role_service import RoleService
from core.services.organization_service import OrganizationService
from core.security.permissions import PERMISSION_CATALOG


class ServiceContainer:
    """
    Constructs and owns all repositories and services for one database.

    Attributes are intentionally public so the HTTP layer can access them
    as ``container.<service_name>`` or ``container.<repo_name>``.

    Parameters
    ----------
    db_path:
        Backward-compatible shortcut: creates a SQLite provider from this
        path.  Mutually exclusive with *config* and *provider*.
    config:
        Full ``AppConfig``.  The factory selects the correct provider from
        ``config.database.provider``.  Mutually exclusive with *db_path*
        and *provider*.
    provider:
        An already-constructed and initialised ``StorageProvider``.
        Use this in tests or when you need direct control over the provider.
        Mutually exclusive with *db_path* and *config*.
    """

    def __init__(
        self,
        db_path: Optional[str] = None,
        *,
        config: Optional[AppConfig] = None,
        provider: Optional[StorageProvider] = None,
    ) -> None:
        # ------------------------------------------------------------------
        # Resolve the security configuration (JWT secret, password policy,
        # rate limits, etc.). Falls back to environment variables when no
        # full AppConfig is supplied, same convention as the db_path
        # shortcut above for database config.
        # ------------------------------------------------------------------
        from core.security.config import SecurityConfig
        from core.security.rate_limit import RateLimiter

        self.security_config: SecurityConfig = (
            config.security if config is not None else SecurityConfig.from_env()
        )

        # One rate limiter PER CONTAINER, not a process-wide singleton --
        # otherwise unrelated ServiceContainer instances in the same
        # process (e.g. every test that builds its own app) would share
        # and exhaust the same request buckets.
        self.rate_limiter = RateLimiter()

        # ------------------------------------------------------------------
        # Resolve the storage provider
        # ------------------------------------------------------------------
        _given = sum(x is not None for x in (db_path, config, provider))
        if _given == 0:
            raise ValueError(
                "ServiceContainer requires one of: db_path, config, or provider."
            )
        if _given > 1:
            raise ValueError(
                "ServiceContainer accepts only one of: db_path, config, or provider."
            )

        if provider is not None:
            # Caller supplies a ready-made provider (tests / advanced usage).
            self._provider: StorageProvider = provider
        elif config is not None:
            self._provider = StorageFactory.create(config.database)
            self._provider.initialize()
        else:
            # Backward-compatible path: db_path string → SQLite provider.
            self._provider = StorageFactory.create(
                AppConfig.for_sqlite(db_path).database
            )
            self._provider.initialize()

        # ------------------------------------------------------------------
        # Backward-compat accessors
        # ------------------------------------------------------------------
        # Tests and legacy code may read container._engine.
        # Delegate to the provider rather than storing a direct reference.

        # ------------------------------------------------------------------
        # Repositories  (all receive the provider, not the engine)
        # ------------------------------------------------------------------
        self.device_repo = SQLAlchemyDeviceRepository(self._provider)
        self.bandwidth_repo = SQLAlchemyBandwidthRepository(self._provider)
        self.subnet_repo = SQLAlchemySubnetRepository(self._provider)
        self.tag_repo = SQLAlchemyTagRepository(self._provider)
        self.audit_repo = SQLAlchemyAuditRepository(self._provider)
        self.history_repo = SQLAlchemyHistoryRepository(self._provider)
        self.list_repo = SQLAlchemyListRepository(self._provider)
        self.meta_repo = SQLAlchemyMetaRepository(self._provider)

        # --- Auth / RBAC / policy repositories ---
        self.organization_repo = SQLAlchemyOrganizationRepository(self._provider)
        self.user_repo = SQLAlchemyUserRepository(self._provider)
        self.role_repo = SQLAlchemyRoleRepository(self._provider)
        self.permission_repo = SQLAlchemyPermissionRepository(self._provider)
        self.refresh_token_repo = SQLAlchemyRefreshTokenRepository(self._provider)
        self.api_key_repo = SQLAlchemyAPIKeyRepository(self._provider)
        self.network_acl_repo = SQLAlchemyNetworkACLRepository(self._provider)
        self.mfa_backup_code_repo = SQLAlchemyMFABackupCodeRepository(self._provider)

        # Self-healing permission catalog: if a future release adds a new
        # permission code, it is inserted here on next startup rather than
        # requiring a data migration for every new permission.
        self.permission_repo.ensure_seeded(PERMISSION_CATALOG)

        # ------------------------------------------------------------------
        # Services  (repositories injected via constructors — unchanged)
        # ------------------------------------------------------------------
        self.audit_service = AuditService(self.audit_repo)

        self.device_service = DeviceService(self.device_repo, self.audit_repo)
        self.bandwidth_service = BandwidthService(self.bandwidth_repo, self.audit_repo)
        self.subnet_service = SubnetService(self.subnet_repo, self.audit_repo)

        self.tag_service = TagService(self.tag_repo, self.audit_repo)

        self.list_service = ListService(
            self.list_repo, self.device_repo, self.audit_repo
        )

        self.generate_service = GenerateService(
            self.device_repo,
            self.bandwidth_repo,
            self.subnet_repo,
            self.tag_repo,
            self.history_repo,
            self.meta_repo,
            self.audit_repo,
        )

        self.export_service = ExportService(
            self.device_repo,
            self.bandwidth_repo,
            self.subnet_repo,
            self.tag_repo,
        )

        self.import_service = ImportService(
            self.device_service,
            self.bandwidth_service,
            self.subnet_service,
            self.device_repo,
            self.bandwidth_repo,
            self.subnet_repo,
            self.tag_repo,
        )

        self.history_service = HistoryService(self.history_repo)

        self.meta_service = MetaService(
            self.device_repo,
            self.bandwidth_repo,
            self.subnet_repo,
            self.meta_repo,
        )

        # ------------------------------------------------------------------
        # Auth / RBAC / policy services
        # ------------------------------------------------------------------
        self.rbac_service = RBACService(self.role_repo, self.user_repo)
        self.auth_service = AuthService(
            self.user_repo, self.refresh_token_repo, self.audit_repo, self.security_config,
        )
        self.mfa_service = MFAService(
            self.user_repo, self.mfa_backup_code_repo, self.security_config
        )
        self.api_key_service = APIKeyService(self.api_key_repo, self.audit_repo)
        self.policy_engine = PolicyEngine(self.network_acl_repo)
        self.policy_service = PolicyService(self.network_acl_repo, self.audit_repo)
        self.user_service = UserService(self.user_repo, self.role_repo, self.audit_repo)
        self.role_service = RoleService(self.role_repo, self.permission_repo, self.audit_repo)
        self.organization_service = OrganizationService(self.organization_repo, self.audit_repo)

        # Convenience accessor: the single-tenant "default" org that seeds
        # into every fresh database (see docs/authentication.md). Routes
        # that haven't been made multi-tenant-aware yet scope to this.
        default_org = self.organization_service.get_default_org()
        self.default_org_id: Optional[str] = default_org["id"] if default_org else None

    # ------------------------------------------------------------------
    # Backward-compatibility properties
    # ------------------------------------------------------------------

    @property
    def _engine(self) -> Engine:
        """
        Expose the underlying SQLAlchemy engine.

        Kept for backward compatibility with tests that access
        ``container._engine`` directly (e.g. to inspect raw DB rows).
        New code should use ``container._provider.get_engine()`` instead.
        """
        return self._provider.get_engine()

    @property
    def _conn(self):
        """
        Legacy stub — always returns None.

        The raw sqlite3 connection is no longer held by the container.
        Tests that previously accessed ``container._conn`` have been updated
        to use ``container._engine``.  This property prevents AttributeError
        on any remaining call sites.
        """
        return None
