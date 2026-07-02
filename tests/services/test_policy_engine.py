"""
Unit tests for PolicyEngine -- the Access Policy Engine's IP allow/deny
evaluation semantics (first-match-wins by priority; allowlist-mode
default-deny when at least one allow rule exists; permissive default
otherwise). See core/services/policy_engine.py for the full rationale.

Run: python3 -m pytest tests/services/test_policy_engine.py -v
"""
import os
import sys
import unittest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from core.services.policy_engine import PolicyEngine


def _rule(rule_id, rule_type, cidr, priority=100):
    return {"id": rule_id, "rule_type": rule_type, "cidr": cidr, "priority": priority}


def _make_engine(rules):
    repo = MagicMock()
    repo.list_effective.return_value = rules
    return PolicyEngine(repo), repo


class TestNoRulesConfigured(unittest.TestCase):
    def test_default_allow_when_no_rules_exist(self):
        engine, _ = _make_engine([])
        decision = engine.evaluate_ip("203.0.113.5", org_id=None)
        self.assertTrue(decision.allowed)


class TestDenyOnlyRules(unittest.TestCase):
    def test_denied_ip_is_blocked(self):
        engine, _ = _make_engine([_rule("r1", "deny", "203.0.113.0/24")])
        decision = engine.evaluate_ip("203.0.113.5", org_id=None)
        self.assertFalse(decision.allowed)

    def test_ip_outside_deny_range_is_permissively_allowed(self):
        """Only deny rules exist -- no allowlist mode, so anything not
        explicitly denied is allowed by default."""
        engine, _ = _make_engine([_rule("r1", "deny", "203.0.113.0/24")])
        decision = engine.evaluate_ip("198.51.100.5", org_id=None)
        self.assertTrue(decision.allowed)


class TestAllowlistMode(unittest.TestCase):
    def test_ip_in_allow_range_is_allowed(self):
        engine, _ = _make_engine([_rule("r1", "allow", "10.0.0.0/8")])
        decision = engine.evaluate_ip("10.0.0.5", org_id=None)
        self.assertTrue(decision.allowed)

    def test_ip_outside_allow_range_is_denied_by_default(self):
        """Presence of an allow rule switches the scope into allowlist
        mode: unmatched traffic is denied, not permissively allowed."""
        engine, _ = _make_engine([_rule("r1", "allow", "10.0.0.0/8")])
        decision = engine.evaluate_ip("203.0.113.5", org_id=None)
        self.assertFalse(decision.allowed)


class TestPriorityOrdering(unittest.TestCase):
    def test_first_match_by_priority_wins_deny_before_allow(self):
        """A narrow deny at lower priority number beats a broader allow
        at higher priority number, even though the allow rule would also
        match."""
        rules = [
            _rule("deny-one-host", "deny", "10.0.0.5/32", priority=10),
            _rule("allow-whole-subnet", "allow", "10.0.0.0/24", priority=100),
        ]
        engine, repo = _make_engine(rules)
        # list_effective is expected to already return rules sorted by
        # priority ascending -- the mock returns them in that order here.
        decision = engine.evaluate_ip("10.0.0.5", org_id=None)
        self.assertFalse(decision.allowed)
        self.assertEqual(decision.matched_rule_id, "deny-one-host")

    def test_other_hosts_in_subnet_still_allowed(self):
        rules = [
            _rule("deny-one-host", "deny", "10.0.0.5/32", priority=10),
            _rule("allow-whole-subnet", "allow", "10.0.0.0/24", priority=100),
        ]
        engine, _ = _make_engine(rules)
        decision = engine.evaluate_ip("10.0.0.6", org_id=None)
        self.assertTrue(decision.allowed)
        self.assertEqual(decision.matched_rule_id, "allow-whole-subnet")


class TestOrgScoping(unittest.TestCase):
    def test_passes_org_id_through_to_repo(self):
        engine, repo = _make_engine([])
        engine.evaluate_ip("10.0.0.1", org_id="org-42")
        repo.list_effective.assert_called_once_with("org-42")


if __name__ == "__main__":
    unittest.main()
