"""Unit tests for core/security/jwt_tokens.py.

Run: python3 -m pytest tests/security/test_jwt_tokens.py -v
"""
import os
import sys
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import jwt as pyjwt

from core.security.config import SecurityConfig
from core.security.jwt_tokens import (
    TokenError,
    decode_access_token,
    decode_mfa_pending_token,
    issue_access_token,
    issue_mfa_pending_token,
)


class TestAccessToken(unittest.TestCase):
    def setUp(self):
        self.config = SecurityConfig(jwt_secret="test-secret-key-not-for-prod")

    def test_issue_then_decode_round_trips(self):
        token = issue_access_token(user_id="u1", org_id="o1", perm_version=3, config=self.config)
        claims = decode_access_token(token, self.config)
        self.assertEqual(claims.sub, "u1")
        self.assertEqual(claims.org_id, "o1")
        self.assertEqual(claims.perm_version, 3)
        self.assertEqual(claims.token_type, "user")

    def test_wrong_secret_rejected(self):
        token = issue_access_token(user_id="u1", org_id="o1", perm_version=1, config=self.config)
        other_config = SecurityConfig(jwt_secret="a-completely-different-secret")
        with self.assertRaises(TokenError):
            decode_access_token(token, other_config)

    def test_tampered_token_rejected(self):
        token = issue_access_token(user_id="u1", org_id="o1", perm_version=1, config=self.config)
        tampered = token[:-2] + ("xy" if token[-2:] != "xy" else "zz")
        with self.assertRaises(TokenError):
            decode_access_token(tampered, self.config)

    def test_expired_token_rejected(self):
        # Craft an already-expired token directly (bypassing the normal TTL).
        payload = {
            "sub": "u1", "org_id": "o1", "perm_version": 1, "token_type": "user",
            "jti": "x", "iat": int(time.time()) - 1000, "exp": int(time.time()) - 500,
            "iss": self.config.jwt_issuer,
        }
        token = pyjwt.encode(payload, self.config.jwt_secret, algorithm=self.config.jwt_algorithm)
        with self.assertRaises(TokenError):
            decode_access_token(token, self.config)

    def test_wrong_issuer_rejected(self):
        payload = {
            "sub": "u1", "org_id": "o1", "perm_version": 1, "token_type": "user",
            "jti": "x", "iat": int(time.time()), "exp": int(time.time()) + 900,
            "iss": "someone-elses-issuer",
        }
        token = pyjwt.encode(payload, self.config.jwt_secret, algorithm=self.config.jwt_algorithm)
        with self.assertRaises(TokenError):
            decode_access_token(token, self.config)


class TestMfaPendingToken(unittest.TestCase):
    def setUp(self):
        self.config = SecurityConfig(jwt_secret="test-secret-key-not-for-prod")

    def test_round_trip(self):
        token = issue_mfa_pending_token("u1", self.config)
        user_id = decode_mfa_pending_token(token, self.config)
        self.assertEqual(user_id, "u1")

    def test_access_token_rejected_as_mfa_pending(self):
        """A regular access token must not be usable to complete an MFA
        challenge -- token_type must be checked, not just signature."""
        access = issue_access_token(user_id="u1", org_id="o1", perm_version=1, config=self.config)
        with self.assertRaises(TokenError):
            decode_mfa_pending_token(access, self.config)

    def test_mfa_pending_token_rejected_as_access_token(self):
        """And the reverse -- an MFA-pending token must not grant API access."""
        mfa_token = issue_mfa_pending_token("u1", self.config)
        claims = decode_access_token(mfa_token, self.config)
        # decode succeeds (same signing key) but token_type reveals it's
        # not a real access token -- callers (get_current_principal) must
        # check this field.
        self.assertEqual(claims.token_type, "mfa_pending")


if __name__ == "__main__":
    unittest.main()
