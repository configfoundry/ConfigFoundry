"""
MFA (TOTP) enrollment and verification service.

Enrollment is a two-step confirm flow (never enable MFA on a bare
"generate secret" call -- the user must prove they scanned the QR code
correctly first, or a typo'd authenticator setup would lock them out):

    1. begin_enrollment()   -> secret + otpauth:// URI for the QR code.
       Secret is NOT yet persisted.
    2. confirm_enrollment() -> caller supplies the 6-digit code the user's
       app produced; on success the secret is encrypted and stored,
       mfa_enabled flips True, and backup codes are generated and
       returned ONCE (only their hashes are persisted).

``verify_login_challenge()`` is used during login: tries the TOTP code
first, falls back to a backup code (each usable exactly once).
"""
from __future__ import annotations

from dataclasses import dataclass

from core.repositories.interfaces import IMFABackupCodeRepository, IUserRepository
from core.security import crypto, mfa, tokens
from core.security.config import SecurityConfig


@dataclass
class EnrollmentStart:
    secret: str
    provisioning_uri: str


@dataclass
class EnrollmentResult:
    backup_codes: list[str]


class MFAService:
    def __init__(
        self,
        user_repo: IUserRepository,
        backup_code_repo: IMFABackupCodeRepository,
        config: SecurityConfig,
    ) -> None:
        self._user_repo = user_repo
        self._backup_code_repo = backup_code_repo
        self._config = config

    def begin_enrollment(self, user_id: str, email: str) -> EnrollmentStart:
        secret = mfa.generate_totp_secret()
        uri = mfa.provisioning_uri(secret, email, self._config.mfa_issuer_name)
        return EnrollmentStart(secret=secret, provisioning_uri=uri)

    def confirm_enrollment(self, user_id: str, secret: str, code: str) -> EnrollmentResult:
        if not mfa.verify_totp(secret, code):
            raise ValueError("Invalid verification code")

        encrypted = crypto.encrypt_secret(self._config.secret_encryption_key, secret)
        self._user_repo.update(user_id, {"mfa_enabled": True, "mfa_secret_encrypted": encrypted})

        backup_codes = tokens.generate_backup_codes(self._config.mfa_backup_code_count)
        self._backup_code_repo.replace_all(user_id, [tokens.hash_token(c) for c in backup_codes])
        return EnrollmentResult(backup_codes=backup_codes)

    def disable(self, user_id: str) -> None:
        self._user_repo.update(user_id, {"mfa_enabled": False, "mfa_secret_encrypted": None})
        self._backup_code_repo.replace_all(user_id, [])

    def verify_login_challenge(self, user: dict, code: str) -> bool:
        if not user.get("mfa_enabled") or not user.get("mfa_secret_encrypted"):
            return False
        secret = crypto.decrypt_secret(
            self._config.secret_encryption_key, user["mfa_secret_encrypted"]
        )
        if mfa.verify_totp(secret, code):
            return True
        # Fall back to a one-time backup code (format "xxxx-xxxx-xxxx").
        return self._backup_code_repo.consume(user["id"], code)

    def remaining_backup_codes(self, user_id: str) -> int:
        return self._backup_code_repo.count_remaining(user_id)
