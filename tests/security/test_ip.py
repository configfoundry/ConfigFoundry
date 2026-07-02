"""Unit tests for core/security/ip.py -- CIDR matching and trusted-proxy
client IP resolution.

Run: python3 -m pytest tests/security/test_ip.py -v
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from core.security.ip import ip_in_any_cidr, is_valid_cidr, resolve_client_ip


class TestCidrMatching(unittest.TestCase):
    def test_ipv4_in_range(self):
        self.assertTrue(ip_in_any_cidr("10.0.0.5", ["10.0.0.0/24"]))

    def test_ipv4_outside_range(self):
        self.assertFalse(ip_in_any_cidr("10.0.1.5", ["10.0.0.0/24"]))

    def test_exact_ip_match_as_single_host(self):
        self.assertTrue(ip_in_any_cidr("192.0.2.1", ["192.0.2.1"]))
        self.assertFalse(ip_in_any_cidr("192.0.2.2", ["192.0.2.1"]))

    def test_ipv6_in_range(self):
        self.assertTrue(ip_in_any_cidr("2001:db8::1", ["2001:db8::/32"]))

    def test_multiple_cidrs_any_match(self):
        self.assertTrue(ip_in_any_cidr("172.16.5.5", ["10.0.0.0/8", "172.16.0.0/12"]))

    def test_malformed_ip_never_matches(self):
        self.assertFalse(ip_in_any_cidr("not-an-ip", ["10.0.0.0/8"]))

    def test_malformed_cidr_in_list_is_skipped_not_raised(self):
        self.assertTrue(ip_in_any_cidr("10.0.0.1", ["garbage", "10.0.0.0/8"]))

    def test_is_valid_cidr(self):
        self.assertTrue(is_valid_cidr("10.0.0.0/8"))
        self.assertTrue(is_valid_cidr("192.0.2.1"))
        self.assertFalse(is_valid_cidr("not-a-cidr"))
        self.assertFalse(is_valid_cidr("999.999.999.999"))


class TestResolveClientIp(unittest.TestCase):
    def test_untrusted_peer_ignores_forwarded_header(self):
        """An arbitrary client cannot spoof its IP via X-Forwarded-For
        unless the immediate connection came from a trusted proxy."""
        resolved = resolve_client_ip(
            direct_peer_ip="203.0.113.9",
            forwarded_for_header="1.2.3.4",
            trusted_proxies=["10.0.0.0/8"],
        )
        self.assertEqual(resolved, "203.0.113.9")

    def test_trusted_proxy_forwarded_header_honored(self):
        resolved = resolve_client_ip(
            direct_peer_ip="10.0.0.1",
            forwarded_for_header="198.51.100.7",
            trusted_proxies=["10.0.0.0/8"],
        )
        self.assertEqual(resolved, "198.51.100.7")

    def test_trusted_proxy_takes_leftmost_of_chain(self):
        resolved = resolve_client_ip(
            direct_peer_ip="10.0.0.1",
            forwarded_for_header="198.51.100.7, 10.0.0.2, 10.0.0.1",
            trusted_proxies=["10.0.0.0/8"],
        )
        self.assertEqual(resolved, "198.51.100.7")

    def test_no_trusted_proxies_configured_always_uses_direct_peer(self):
        resolved = resolve_client_ip(
            direct_peer_ip="10.0.0.1",
            forwarded_for_header="198.51.100.7",
            trusted_proxies=[],
        )
        self.assertEqual(resolved, "10.0.0.1")

    def test_trusted_proxy_with_malformed_header_falls_back(self):
        resolved = resolve_client_ip(
            direct_peer_ip="10.0.0.1",
            forwarded_for_header="not-an-ip",
            trusted_proxies=["10.0.0.0/8"],
        )
        self.assertEqual(resolved, "10.0.0.1")


if __name__ == "__main__":
    unittest.main()
