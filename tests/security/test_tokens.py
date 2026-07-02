"""Unit tests for core/security/tokens.py -- opaque token generation/hashing
and API key / backup code helpers.

Run: python3 -m pytest tests/security/test_tokens.py -v
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from core.security.tokens import (
    generate_api_key,
    generate_backup_codes,
    generate_token,
    hash_token,
    verify_token,
)


class TestOpaqueTokens(unittest.TestCase):
    def test_generate_token_is_unique(self):
        self.assertNotEqual(generate_token(), generate_token())

    def test_hash_then_verify_succeeds(self):
        t = generate_token()
        self.assertTrue(verify_token(t, hash_token(t)))

    def test_wrong_token_fails_verify(self):
        t = generate_token()
        self.assertFalse(verify_token("not-the-token", hash_token(t)))

    def test_hash_is_deterministic(self):
        """Unlike password hashing, token hashing must be deterministic
        (no per-call salt) since lookups happen by hash equality."""
        t = generate_token()
        self.assertEqual(hash_token(t), hash_token(t))


class TestAPIKeys(unittest.TestCase):
    def test_full_key_has_expected_prefix(self):
        full_key, prefix, key_hash = generate_api_key()
        self.assertTrue(full_key.startswith("cfk_live_"))
        self.assertTrue(prefix.startswith("cfk_live_"))

    def test_prefix_shorter_than_full_key(self):
        full_key, prefix, _ = generate_api_key()
        self.assertLess(len(prefix), len(full_key))

    def test_hash_matches_full_key(self):
        full_key, _, key_hash = generate_api_key()
        self.assertEqual(hash_token(full_key), key_hash)

    def test_keys_are_unique(self):
        k1, _, _ = generate_api_key()
        k2, _, _ = generate_api_key()
        self.assertNotEqual(k1, k2)


class TestBackupCodes(unittest.TestCase):
    def test_generates_requested_count(self):
        codes = generate_backup_codes(10)
        self.assertEqual(len(codes), 10)

    def test_codes_are_unique(self):
        codes = generate_backup_codes(20)
        self.assertEqual(len(set(codes)), 20)

    def test_code_format(self):
        codes = generate_backup_codes(5)
        for c in codes:
            parts = c.split("-")
            self.assertEqual(len(parts), 3)
            for p in parts:
                self.assertEqual(len(p), 4)


if __name__ == "__main__":
    unittest.main()
