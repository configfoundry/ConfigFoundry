"""
At-rest encryption for security-critical secrets (MFA/TOTP seeds).

Deliberately uses the ``cryptography`` package's AESGCM implementation --
audited, hardware-accelerated where available, constant-time -- rather than
``core/aesgcm.py``. That module's own docstring says it is "NOT constant-
time and should not be treated as hardened against timing side-channels";
it exists so the device-credential path has zero pip dependencies, which is
an acceptable trade-off for SNMP community strings but not for the keys
that gate account access.

Output format matches ``core/aesgcm.py`` for consistency across the
codebase: base64( iv(12) || ciphertext || tag(16) ).
"""
from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def encrypt_secret(key: bytes, plaintext: str, aad: bytes = b"") -> str:
    """Encrypt *plaintext* with AES-256-GCM under *key* (32 bytes).
    Returns a base64 string safe to store in a TEXT column."""
    if len(key) != 32:
        raise ValueError("encryption key must be 32 bytes (AES-256)")
    aesgcm = AESGCM(key)
    iv = os.urandom(12)
    ct = aesgcm.encrypt(iv, plaintext.encode("utf-8"), aad or None)
    return base64.b64encode(iv + ct).decode("ascii")


def decrypt_secret(key: bytes, blob_b64: str, aad: bytes = b"") -> str:
    """Decrypt a value produced by ``encrypt_secret``. Raises
    ``cryptography.exceptions.InvalidTag`` on tamper or wrong key."""
    if len(key) != 32:
        raise ValueError("encryption key must be 32 bytes (AES-256)")
    raw = base64.b64decode(blob_b64)
    iv, ct = raw[:12], raw[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ct, aad or None).decode("utf-8")
