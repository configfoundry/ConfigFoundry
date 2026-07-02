"""
TOTP-based multi-factor authentication (RFC 6238), via ``pyotp``.

Enrollment flow
----------------
1. ``generate_totp_secret()`` -- new random base32 secret.
2. ``provisioning_uri()`` -- otpauth:// URI for a QR code (Google
   Authenticator / Authy / 1Password compatible).
3. User scans the QR code and submits a 6-digit code to confirm enrollment
   -- verified with ``verify_totp()`` before ``User.mfa_enabled`` is set.
4. Backup codes (``core/security/tokens.py::generate_backup_codes``) are
   shown once at enrollment as a recovery path if the device is lost.

The secret itself is encrypted at rest with ``core/security/crypto.py``
before being stored -- see ``core/services/mfa_service.py``.
"""
from __future__ import annotations

import pyotp


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, account_email: str, issuer_name: str) -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=account_email, issuer_name=issuer_name
    )


def verify_totp(secret: str, code: str, *, valid_window: int = 1) -> bool:
    """Verify a 6-digit TOTP code. ``valid_window=1`` tolerates +-30s of
    clock drift between server and authenticator app."""
    code = (code or "").strip().replace(" ", "")
    if not code.isdigit() or len(code) != 6:
        return False
    return pyotp.TOTP(secret).verify(code, valid_window=valid_window)
