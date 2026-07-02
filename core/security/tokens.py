"""
Opaque token generation and hashing.

Used for refresh tokens, API keys, and MFA backup codes -- anything that is
handed to a client once, then only ever presented back for comparison.
These are never stored in plaintext: only a SHA-256 hash of the token is
persisted, so a database leak does not expose usable credentials.

SHA-256 (not a slow KDF) is intentional here: these are high-entropy
random tokens (128+ bits), not user-chosen passwords, so there is no
offline brute-force risk that a slow hash would mitigate -- and a slow
hash would make every API-key-authenticated request needlessly expensive.
Comparison uses ``hmac.compare_digest`` for constant-time equality.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets


def generate_token(num_bytes: int = 32) -> str:
    """Return a URL-safe random token with >= num_bytes*8 bits of entropy."""
    return secrets.token_urlsafe(num_bytes)


def hash_token(token: str) -> str:
    """SHA-256 hex digest of a token, for storage/lookup."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_token(token: str, expected_hash: str) -> bool:
    """Constant-time comparison of a presented token against a stored hash."""
    return hmac.compare_digest(hash_token(token), expected_hash)


def generate_api_key(prefix: str = "cfk") -> tuple[str, str, str]:
    """
    Generate a new API key.

    Returns (full_key, visible_prefix, key_hash):
      full_key:      the value shown to the user ONCE (e.g. "cfk_live_<random>")
      visible_prefix: short prefix stored in plaintext for identification in
                       UI/logs (e.g. "cfk_live_ab12") -- never enough to
                       reconstruct the key.
      key_hash:       SHA-256 hash of full_key, stored for verification.
    """
    random_part = secrets.token_urlsafe(32)
    full_key = f"{prefix}_live_{random_part}"
    visible_prefix = full_key[: len(prefix) + 10]
    return full_key, visible_prefix, hash_token(full_key)


def generate_backup_codes(count: int = 10) -> list[str]:
    """Generate human-typeable MFA backup codes, e.g. 'a1b2-c3d4-e5f6'."""
    codes = []
    for _ in range(count):
        raw = secrets.token_hex(6)  # 12 hex chars
        codes.append(f"{raw[0:4]}-{raw[4:8]}-{raw[8:12]}")
    return codes
