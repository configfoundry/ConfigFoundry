"""Unit tests for core/security/rate_limit.py.

Run: python3 -m pytest tests/security/test_rate_limit.py -v
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from core.security.rate_limit import RateLimiter


class TestRateLimiter(unittest.TestCase):
    def setUp(self):
        self.limiter = RateLimiter()

    def test_allows_up_to_limit(self):
        for _ in range(5):
            self.assertTrue(self.limiter.check("k1", limit=5, window_seconds=60))

    def test_rejects_over_limit(self):
        for _ in range(5):
            self.limiter.check("k1", limit=5, window_seconds=60)
        self.assertFalse(self.limiter.check("k1", limit=5, window_seconds=60))

    def test_keys_are_independent(self):
        for _ in range(5):
            self.limiter.check("k1", limit=5, window_seconds=60)
        # A different key has its own budget.
        self.assertTrue(self.limiter.check("k2", limit=5, window_seconds=60))

    def test_reset_clears_key(self):
        for _ in range(5):
            self.limiter.check("k1", limit=5, window_seconds=60)
        self.limiter.reset("k1")
        self.assertTrue(self.limiter.check("k1", limit=5, window_seconds=60))

    def test_remaining_decreases_with_use(self):
        self.assertEqual(self.limiter.remaining("k1", limit=5, window_seconds=60), 5)
        self.limiter.check("k1", limit=5, window_seconds=60)
        self.assertEqual(self.limiter.remaining("k1", limit=5, window_seconds=60), 4)


if __name__ == "__main__":
    unittest.main()
