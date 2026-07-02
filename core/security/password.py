"""
Password hashing and strength validation.

Hashing uses Argon2id (via the ``argon2-cffi`` package) -- the algorithm
OWASP's Password Storage Cheat Sheet recommends as the first choice when
available. Parameters (time cost, memory cost, parallelism) are read from
``SecurityConfig`` so they can be tuned per deployment without a code
change, and are embedded in the resulting hash string so past hashes stay
verifiable even after parameters change (argon2-cffi's ``PasswordHasher``
handles this transparently, including a ``needs_rehash`` check that lets
callers upgrade a user's hash on next successful login).

Strength validation follows NIST SP 800-63B guidance: prioritise length
over complexity rules and check against a small common-password blocklist,
rather than mandating "must contain a symbol" style rules that push users
toward predictable substitutions. Complexity checks are still offered
(configurable) since some compliance auditors expect to see them.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHash, VerifyMismatchError

from core.security.config import SecurityConfig

# A small blocklist of extremely common passwords / obvious patterns.
# Not exhaustive (a full breached-password corpus is out of scope for a
# self-hosted tool with no external dependency budget for that); this is a
# baseline guard against the most obvious weak choices.
_COMMON_PASSWORDS = {
    "password", "password1", "password123", "12345678", "123456789",
    "qwerty123", "letmein", "welcome1", "admin1234", "changeme",
    "iloveyou", "monkey123", "dragon123", "football1", "trustno1",
}


def _build_hasher(config: SecurityConfig) -> PasswordHasher:
    return PasswordHasher(
        time_cost=config.argon2_time_cost,
        memory_cost=config.argon2_memory_cost_kb,
        parallelism=config.argon2_parallelism,
    )


def hash_password(plain: str, config: SecurityConfig) -> str:
    """Hash a plaintext password with Argon2id. Returns an encoded hash
    string (includes algorithm, version, and parameters -- safe to store
    directly in the database)."""
    return _build_hasher(config).hash(plain)


def verify_password(plain: str, encoded_hash: str) -> bool:
    """Verify a plaintext password against a stored Argon2id hash.
    Returns False on mismatch OR on a malformed/legacy hash -- never
    raises, so callers can treat this as a plain boolean check."""
    try:
        PasswordHasher().verify(encoded_hash, plain)
        return True
    except (VerifyMismatchError, InvalidHash):
        return False


def needs_rehash(encoded_hash: str, config: SecurityConfig) -> bool:
    """True if the stored hash was created with weaker-than-current
    parameters and should be re-hashed on next successful login."""
    try:
        return _build_hasher(config).check_needs_rehash(encoded_hash)
    except InvalidHash:
        return True


@dataclass
class PasswordCheckResult:
    valid: bool
    errors: list[str] = field(default_factory=list)


def validate_password_strength(
    plain: str,
    config: SecurityConfig,
    *,
    user_inputs: list[str] | None = None,
) -> PasswordCheckResult:
    """
    Validate a candidate password against the configured policy.

    Parameters
    ----------
    plain:
        Candidate plaintext password.
    config:
        Source of policy thresholds (min length, complexity flags, etc.).
    user_inputs:
        Values the password must not contain case-insensitively (e.g. the
        user's email local-part, username, full name) -- guards against
        "Password-John123" style choices tied to the account itself.
    """
    errors: list[str] = []

    if len(plain) < config.password_min_length:
        errors.append(
            f"Password must be at least {config.password_min_length} characters."
        )
    if len(plain) > config.password_max_length:
        errors.append(
            f"Password must be at most {config.password_max_length} characters."
        )
    if config.password_require_mixed_case:
        if not re.search(r"[a-z]", plain) or not re.search(r"[A-Z]", plain):
            errors.append("Password must contain both upper- and lower-case letters.")
    if config.password_require_digit and not re.search(r"\d", plain):
        errors.append("Password must contain at least one digit.")
    if config.password_require_symbol and not re.search(r"[^\w\s]", plain):
        errors.append("Password must contain at least one symbol.")
    if config.password_reject_common and plain.lower() in _COMMON_PASSWORDS:
        errors.append("This password is too common. Choose something less predictable.")

    for needle in (user_inputs or []):
        needle = (needle or "").strip().lower()
        if len(needle) >= 3 and needle in plain.lower():
            errors.append("Password must not contain your name, email, or username.")
            break

    return PasswordCheckResult(valid=not errors, errors=errors)
