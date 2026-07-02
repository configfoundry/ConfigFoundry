"""
Security configuration for ConfigFoundry's authentication & RBAC layer.

Mirrors the pattern used by ``core/storage/config.py`` (``DatabaseConfig``)
and ``core/logging/config.py`` (``LoggingConfig``): a plain dataclass with
``from_dict()`` / ``from_env()`` constructors, wired into ``AppConfig``.

Loading priority (highest wins)
---------------------------------
1. Explicit constructor kwargs / ``from_dict()``
2. Environment variables (``CONFIGFOUNDRY_AUTH_*``)
3. YAML configuration file (``security:`` section)
4. Built-in defaults

Environment variables
---------------------
``CONFIGFOUNDRY_AUTH_JWT_SECRET``            -- HMAC signing secret (HS256).
                                                 REQUIRED in production; a
                                                 random one is generated at
                                                 startup for dev/test with a
                                                 loud warning.
``CONFIGFOUNDRY_AUTH_ACCESS_TTL_MIN``        -- access token lifetime, minutes (default 15)
``CONFIGFOUNDRY_AUTH_REFRESH_TTL_DAYS``      -- refresh token lifetime, days (default 14)
``CONFIGFOUNDRY_AUTH_ARGON2_TIME_COST``      -- Argon2id time cost (default 3)
``CONFIGFOUNDRY_AUTH_ARGON2_MEMORY_COST_KB`` -- Argon2id memory cost in KiB (default 65536 = 64 MiB)
``CONFIGFOUNDRY_AUTH_ARGON2_PARALLELISM``    -- Argon2id parallelism (default 4)
``CONFIGFOUNDRY_AUTH_PASSWORD_MIN_LENGTH``   -- minimum password length (default 12)
``CONFIGFOUNDRY_AUTH_LOCKOUT_THRESHOLD``     -- failed attempts before lockout (default 5)
``CONFIGFOUNDRY_AUTH_LOCKOUT_MINUTES``       -- lockout duration, minutes (default 15)
``CONFIGFOUNDRY_AUTH_MFA_REQUIRED_ROLES``    -- comma-separated role names that must enroll MFA
``CONFIGFOUNDRY_AUTH_SESSION_IDLE_MINUTES``  -- idle session timeout (default 30)
``CONFIGFOUNDRY_AUTH_RATE_LIMIT_LOGIN``      -- "<count>/<seconds>" for /auth/login (default "10/60")
``CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES``       -- comma-separated CIDRs allowed to set X-Forwarded-For
``CONFIGFOUNDRY_AUTH_CORS_ORIGINS``          -- comma-separated allowed origins ("*" for dev)
``CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY``        -- base64, 32 raw bytes, for encrypting MFA seeds at
                                                 rest. Generated at startup for dev/test if unset
                                                 (values become unreadable across restarts --
                                                 production MUST set this explicitly).
``CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL``       -- email for the initial Super Admin (migration seed)
``CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD``    -- password for the initial Super Admin. If unset, a
                                                 random one is generated and printed once at startup.
"""
from __future__ import annotations

import base64
import os
import secrets
from dataclasses import dataclass, field
from typing import Optional


def _split_csv(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass
class SecurityConfig:
    """
    All configuration for authentication, tokens, password policy, MFA,
    rate limiting, and network access control.

    Nothing here is hardcoded into application logic -- every value is a
    field on this dataclass so it can be overridden per deployment.
    """

    # ------------------------------------------------------------------
    # JWT / tokens
    # ------------------------------------------------------------------
    jwt_secret: str = field(default_factory=lambda: secrets.token_urlsafe(48))
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "configfoundry"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 14

    # ------------------------------------------------------------------
    # Password policy (NIST 800-63B-aligned: length over complexity rules,
    # no forced periodic rotation, but adaptive hashing + lockout).
    # ------------------------------------------------------------------
    argon2_time_cost: int = 3
    argon2_memory_cost_kb: int = 65536
    argon2_parallelism: int = 4
    password_min_length: int = 12
    password_max_length: int = 256
    password_require_mixed_case: bool = True
    password_require_digit: bool = True
    password_require_symbol: bool = True
    password_reject_common: bool = True

    # ------------------------------------------------------------------
    # Account lockout / brute-force protection
    # ------------------------------------------------------------------
    lockout_threshold: int = 5
    lockout_duration_minutes: int = 15

    # ------------------------------------------------------------------
    # MFA
    # ------------------------------------------------------------------
    mfa_issuer_name: str = "ConfigFoundry"
    mfa_required_roles: list[str] = field(
        default_factory=lambda: ["Super Admin", "Organization Admin"]
    )
    mfa_backup_code_count: int = 10

    # ------------------------------------------------------------------
    # Sessions
    # ------------------------------------------------------------------
    session_idle_timeout_minutes: int = 30
    max_active_sessions_per_user: int = 10

    # ------------------------------------------------------------------
    # Rate limiting -- "<count>/<window_seconds>"
    # ------------------------------------------------------------------
    rate_limit_login: str = "10/60"
    rate_limit_default: str = "300/60"

    # ------------------------------------------------------------------
    # Network access policy
    # ------------------------------------------------------------------
    trusted_proxies: list[str] = field(default_factory=list)
    cors_allowed_origins: list[str] = field(default_factory=lambda: [])

    # ------------------------------------------------------------------
    # At-rest secret encryption (MFA seeds) -- 32 raw bytes, base64-encoded
    # in config/env. Distinct from the JWT secret and from core/aesgcm.py.
    # ------------------------------------------------------------------
    secret_encryption_key: bytes = field(
        default_factory=lambda: secrets.token_bytes(32)
    )

    # ------------------------------------------------------------------
    # Bootstrap super admin (used once by the auth migration)
    # ------------------------------------------------------------------
    bootstrap_admin_email: Optional[str] = None
    bootstrap_admin_password: Optional[str] = None

    # ------------------------------------------------------------------
    # Request hygiene
    # ------------------------------------------------------------------
    max_request_body_bytes: int = 10 * 1024 * 1024  # 10 MiB

    # ------------------------------------------------------------------
    # Factory class-methods
    # ------------------------------------------------------------------

    @classmethod
    def from_dict(cls, data: dict) -> "SecurityConfig":
        known = set(cls.__dataclass_fields__)
        filtered = {k: v for k, v in data.items() if k in known}
        if isinstance(filtered.get("secret_encryption_key"), str):
            filtered["secret_encryption_key"] = base64.b64decode(
                filtered["secret_encryption_key"]
            )
        return cls(**filtered)

    @classmethod
    def from_env(cls) -> "SecurityConfig":
        kwargs: dict = {}
        jwt_secret_explicit = "CONFIGFOUNDRY_AUTH_JWT_SECRET" in os.environ
        enc_key_explicit = "CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY" in os.environ

        if v := os.environ.get("CONFIGFOUNDRY_AUTH_JWT_SECRET"):
            kwargs["jwt_secret"] = v
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_ACCESS_TTL_MIN"):
            kwargs["access_token_ttl_minutes"] = int(v)
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_REFRESH_TTL_DAYS"):
            kwargs["refresh_token_ttl_days"] = int(v)
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_ARGON2_TIME_COST"):
            kwargs["argon2_time_cost"] = int(v)
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_ARGON2_MEMORY_COST_KB"):
            kwargs["argon2_memory_cost_kb"] = int(v)
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_ARGON2_PARALLELISM"):
            kwargs["argon2_parallelism"] = int(v)
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_PASSWORD_MIN_LENGTH"):
            kwargs["password_min_length"] = int(v)
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_LOCKOUT_THRESHOLD"):
            kwargs["lockout_threshold"] = int(v)
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_LOCKOUT_MINUTES"):
            kwargs["lockout_duration_minutes"] = int(v)
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_MFA_REQUIRED_ROLES"):
            kwargs["mfa_required_roles"] = _split_csv(v)
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_SESSION_IDLE_MINUTES"):
            kwargs["session_idle_timeout_minutes"] = int(v)
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_RATE_LIMIT_LOGIN"):
            kwargs["rate_limit_login"] = v
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES"):
            kwargs["trusted_proxies"] = _split_csv(v)
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_CORS_ORIGINS"):
            kwargs["cors_allowed_origins"] = _split_csv(v)
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY"):
            kwargs["secret_encryption_key"] = base64.b64decode(v)
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL"):
            kwargs["bootstrap_admin_email"] = v
        if v := os.environ.get("CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD"):
            kwargs["bootstrap_admin_password"] = v

        instance = cls(**kwargs)
        # Non-field flags (not part of the dataclass contract) so callers
        # can warn loudly at startup when running with generated-not-set
        # secrets -- tokens/encrypted MFA seeds won't survive a restart.
        instance.jwt_secret_is_generated = not jwt_secret_explicit
        instance.secret_key_is_generated = not enc_key_explicit
        return instance

    def parse_rate_limit(self, spec: str) -> tuple[int, int]:
        """Parse "<count>/<window_seconds>" -> (count, window_seconds)."""
        count_s, window_s = spec.split("/")
        return int(count_s), int(window_s)


# Default flags for instances built via the plain constructor / from_dict()
# (only from_env() can determine whether a secret was explicitly supplied).
SecurityConfig.jwt_secret_is_generated = True
SecurityConfig.secret_key_is_generated = True
