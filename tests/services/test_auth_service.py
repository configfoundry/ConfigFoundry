"""
Unit tests for AuthService.

Repository dependencies are MagicMocks (matching the convention in
test_device_service.py); password hashing is real (core.security.password)
so login logic is exercised genuinely rather than through a mocked
verify_password.

Run:
    python3 -m pytest tests/services/test_auth_service.py -v
"""
import os
import sys
import time
import unittest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from core.security.config import SecurityConfig
from core.security.password import hash_password
from core.services.auth_service import (
    AccountLockedError,
    AuthError,
    AuthService,
    MFARequiredError,
    RequestContext,
)


def _config():
    return SecurityConfig(jwt_secret="test-secret", lockout_threshold=3, lockout_duration_minutes=15)


def _make_service(config=None):
    user_repo = MagicMock()
    refresh_repo = MagicMock()
    audit_repo = MagicMock()
    config = config or _config()
    service = AuthService(user_repo, refresh_repo, audit_repo, config)
    return service, user_repo, refresh_repo, audit_repo, config


def _user(password="Correct-Horse-9!", config=None, **overrides):
    base = {
        "id": "u1", "org_id": "o1", "email": "alice@example.com",
        "hashed_password": hash_password(password, config or _config()),
        "is_active": True, "mfa_enabled": False, "mfa_secret_encrypted": None,
        "locked_until": None, "failed_login_count": 0, "perm_version": 1,
        "full_name": "Alice", "must_change_password": False,
    }
    base.update(overrides)
    return base


class TestLogin(unittest.TestCase):
    def test_successful_login_returns_tokens(self):
        svc, user_repo, refresh_repo, audit_repo, config = _make_service()
        user_repo.get_by_email.return_value = _user(config=config)
        pair = svc.login("alice@example.com", "Correct-Horse-9!", RequestContext())
        self.assertTrue(pair.access_token)
        self.assertTrue(pair.refresh_token)
        refresh_repo.create.assert_called_once()
        user_repo.touch_login.assert_called_once_with("u1")

    def test_unknown_email_raises_generic_error(self):
        svc, user_repo, *_ = _make_service()
        user_repo.get_by_email.return_value = None
        with self.assertRaises(AuthError):
            svc.login("nobody@example.com", "whatever", RequestContext())

    def test_wrong_password_raises_generic_error_and_increments_counter(self):
        svc, user_repo, _, audit_repo, config = _make_service()
        user_repo.get_by_email.return_value = _user(config=config)
        user_repo.increment_failed_login.return_value = 1
        with self.assertRaises(AuthError):
            svc.login("alice@example.com", "wrong-password", RequestContext())
        user_repo.increment_failed_login.assert_called_once_with("u1")

    def test_unknown_user_and_wrong_password_produce_same_error_message(self):
        """User enumeration protection: both failure modes must look
        identical to the caller."""
        svc, user_repo, *_ = _make_service()

        user_repo.get_by_email.return_value = None
        try:
            svc.login("nobody@example.com", "x", RequestContext())
            self.fail("expected AuthError")
        except AuthError as e:
            msg_unknown_user = str(e)

        user_repo.get_by_email.return_value = _user()
        user_repo.increment_failed_login.return_value = 1
        try:
            svc.login("alice@example.com", "wrong", RequestContext())
            self.fail("expected AuthError")
        except AuthError as e:
            msg_wrong_password = str(e)

        self.assertEqual(msg_unknown_user, msg_wrong_password)

    def test_locked_account_raises_account_locked(self):
        svc, user_repo, *_ = _make_service()
        user_repo.get_by_email.return_value = _user(locked_until=time.time() + 900)
        with self.assertRaises(AccountLockedError):
            svc.login("alice@example.com", "Correct-Horse-9!", RequestContext())

    def test_threshold_failures_trigger_lock(self):
        svc, user_repo, _, audit_repo, config = _make_service()
        user_repo.get_by_email.return_value = _user(config=config)
        user_repo.increment_failed_login.return_value = config.lockout_threshold
        with self.assertRaises(AuthError):
            svc.login("alice@example.com", "wrong-password", RequestContext())
        user_repo.set_lock.assert_called_once()

    def test_mfa_enabled_raises_mfa_required_instead_of_returning_tokens(self):
        svc, user_repo, refresh_repo, *_ = _make_service()
        config = _config()
        user_repo.get_by_email.return_value = _user(config=config, mfa_enabled=True)
        with self.assertRaises(MFARequiredError) as ctx:
            svc.login("alice@example.com", "Correct-Horse-9!", RequestContext())
        self.assertTrue(ctx.exception.mfa_token)
        refresh_repo.create.assert_not_called()

    def test_inactive_user_login_fails(self):
        svc, user_repo, *_ = _make_service()
        user_repo.get_by_email.return_value = _user(is_active=False)
        user_repo.increment_failed_login.return_value = 1
        with self.assertRaises(AuthError):
            svc.login("alice@example.com", "Correct-Horse-9!", RequestContext())


class TestRefresh(unittest.TestCase):
    def test_valid_refresh_rotates_token(self):
        svc, user_repo, refresh_repo, _, config = _make_service()
        user_repo.get_by_email.return_value = _user(config=config)
        pair = svc.login("alice@example.com", "Correct-Horse-9!", RequestContext())

        stored_token = refresh_repo.create.call_args[0][0]
        refresh_repo.get_by_hash.return_value = {
            "id": "rt1", "user_id": "u1", "family_id": stored_token["family_id"],
            "revoked_at": None, "expires_at": time.time() + 1000,
        }
        user_repo.get.return_value = _user(config=config)

        new_pair = svc.refresh(pair.refresh_token, RequestContext())
        self.assertNotEqual(new_pair.refresh_token, pair.refresh_token)
        refresh_repo.mark_replaced.assert_called_once()

    def test_reused_revoked_token_revokes_whole_family(self):
        svc, user_repo, refresh_repo, audit_repo, config = _make_service()
        refresh_repo.get_by_hash.return_value = {
            "id": "rt1", "user_id": "u1", "family_id": "fam1",
            "revoked_at": time.time() - 10, "expires_at": time.time() + 1000,
        }
        with self.assertRaises(AuthError):
            svc.refresh("some-old-token", RequestContext())
        refresh_repo.revoke_family.assert_called_once_with("fam1")

    def test_unknown_refresh_token_rejected(self):
        svc, user_repo, refresh_repo, *_ = _make_service()
        refresh_repo.get_by_hash.return_value = None
        with self.assertRaises(AuthError):
            svc.refresh("not-a-real-token", RequestContext())

    def test_expired_refresh_token_rejected(self):
        svc, user_repo, refresh_repo, *_ = _make_service()
        refresh_repo.get_by_hash.return_value = {
            "id": "rt1", "user_id": "u1", "family_id": "fam1",
            "revoked_at": None, "expires_at": time.time() - 10,
        }
        with self.assertRaises(AuthError):
            svc.refresh("expired-token", RequestContext())


class TestChangePassword(unittest.TestCase):
    def test_wrong_old_password_rejected(self):
        svc, user_repo, *_ = _make_service()
        config = _config()
        user_repo.get.return_value = _user(config=config)
        with self.assertRaises(AuthError):
            svc.change_password("u1", "wrong-old-password", "New-Strong-Pass1!", RequestContext())

    def test_weak_new_password_rejected(self):
        svc, user_repo, *_ = _make_service()
        config = _config()
        user_repo.get.return_value = _user(config=config)
        with self.assertRaises(AuthError):
            svc.change_password("u1", "Correct-Horse-9!", "weak", RequestContext())

    def test_successful_change_revokes_all_sessions(self):
        svc, user_repo, refresh_repo, _, config = _make_service()
        user_repo.get.return_value = _user(config=config)
        svc.change_password("u1", "Correct-Horse-9!", "New-Strong-Pass1!", RequestContext())
        refresh_repo.revoke_all_for_user.assert_called_once_with("u1")
        user_repo.bump_perm_version.assert_called_once_with("u1")


class TestLogout(unittest.TestCase):
    def test_logout_revokes_single_token(self):
        svc, user_repo, refresh_repo, *_ = _make_service()
        refresh_repo.get_by_hash.return_value = {"id": "rt1", "user_id": "u1"}
        svc.logout("some-token", RequestContext())
        refresh_repo.revoke.assert_called_once_with("rt1")

    def test_logout_all_revokes_everything_and_bumps_perm_version(self):
        svc, user_repo, refresh_repo, *_ = _make_service()
        svc.logout_all("u1", RequestContext())
        refresh_repo.revoke_all_for_user.assert_called_once_with("u1")
        user_repo.bump_perm_version.assert_called_once_with("u1")


if __name__ == "__main__":
    unittest.main()
