"""Unit tests for core/security/password.py -- Argon2id hashing and
password strength validation.

Run: python3 -m pytest tests/security/test_password.py -v
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from core.security.config import SecurityConfig
from core.security.password import (
    hash_password,
    needs_rehash,
    validate_password_strength,
    verify_password,
)


class TestHashAndVerify(unittest.TestCase):
    def setUp(self):
        self.config = SecurityConfig()

    def test_hash_then_verify_succeeds(self):
        h = hash_password("Correct-Horse-Battery-9!", self.config)
        self.assertTrue(verify_password("Correct-Horse-Battery-9!", h))

    def test_wrong_password_fails(self):
        h = hash_password("Correct-Horse-Battery-9!", self.config)
        self.assertFalse(verify_password("wrong-password", h))

    def test_hash_is_not_plaintext(self):
        h = hash_password("Correct-Horse-Battery-9!", self.config)
        self.assertNotIn("Correct-Horse-Battery-9!", h)
        self.assertTrue(h.startswith("$argon2id$"))

    def test_two_hashes_of_same_password_differ(self):
        """Salted -- must never produce identical output for equal input."""
        h1 = hash_password("same-password-123!", self.config)
        h2 = hash_password("same-password-123!", self.config)
        self.assertNotEqual(h1, h2)
        self.assertTrue(verify_password("same-password-123!", h1))
        self.assertTrue(verify_password("same-password-123!", h2))

    def test_verify_malformed_hash_returns_false_not_raise(self):
        self.assertFalse(verify_password("anything", "not-a-real-hash"))

    def test_needs_rehash_false_for_current_params(self):
        h = hash_password("Correct-Horse-Battery-9!", self.config)
        self.assertFalse(needs_rehash(h, self.config))

    def test_needs_rehash_true_for_weaker_params(self):
        weak_config = SecurityConfig(argon2_time_cost=1, argon2_memory_cost_kb=8192, argon2_parallelism=1)
        h = hash_password("Correct-Horse-Battery-9!", weak_config)
        strong_config = SecurityConfig(argon2_time_cost=10, argon2_memory_cost_kb=131072, argon2_parallelism=4)
        self.assertTrue(needs_rehash(h, strong_config))


class TestPasswordStrength(unittest.TestCase):
    def setUp(self):
        self.config = SecurityConfig()

    def test_valid_strong_password_passes(self):
        result = validate_password_strength("Tr0ub4dor&3-Zebra", self.config)
        self.assertTrue(result.valid, result.errors)

    def test_too_short_fails(self):
        result = validate_password_strength("Ab1!", self.config)
        self.assertFalse(result.valid)

    def test_common_password_rejected(self):
        result = validate_password_strength("password123", self.config)
        self.assertFalse(result.valid)

    def test_missing_digit_fails(self):
        result = validate_password_strength("NoDigitsHereAtAll!", self.config)
        self.assertFalse(result.valid)

    def test_missing_symbol_fails(self):
        result = validate_password_strength("NoSymbolsHere123", self.config)
        self.assertFalse(result.valid)

    def test_password_containing_email_rejected(self):
        result = validate_password_strength(
            "Pass1!-alice@example.com", self.config, user_inputs=["alice@example.com"]
        )
        self.assertFalse(result.valid)

    def test_relaxed_policy_accepts_simpler_password(self):
        relaxed = SecurityConfig(
            password_require_mixed_case=False,
            password_require_digit=False,
            password_require_symbol=False,
            password_reject_common=False,
            password_min_length=8,
        )
        result = validate_password_strength("simplepassword", relaxed)
        self.assertTrue(result.valid, result.errors)


if __name__ == "__main__":
    unittest.main()
