"""
Access Policy Engine -- evaluated BEFORE authentication (see the request
pipeline diagram in docs/authentication.md). Independent of the
authentication module so new policy types can be added without touching
login/token logic at all.

IP allow/deny evaluation semantics
------------------------------------
Rules are evaluated in ascending ``priority`` order (lower number first).
The FIRST rule whose CIDR contains the request IP wins -- its rule_type
(allow/deny) is the decision, full stop. This is standard firewall-style
"first match wins" behaviour: administrators express precedence entirely
through the priority number, e.g. put a narrow deny for one bad actor at
priority 10 ahead of a broad allow for its /16 at priority 100.

If NO rule matches the request IP:
  * If the effective rule set contains at least one ``allow`` rule, the
    scope is in "allowlist mode" -- the presence of an allow rule signals
    intent to restrict access to that list, so anything not explicitly
    allowed is denied by default.
  * Otherwise (only deny rules exist, or no rules at all), the default is
    permissive: allow. This matches the common case for a self-hosted
    internal tool with no configured IP restrictions at all.

Time-based access (maintenance windows / business hours)
-----------------------------------------------------------
Scaffolded but NOT enforced in this pass -- see ``evaluate_time_window``.
Flagged clearly in docs/authentication.md as a documented gap rather than
silently absent.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from core.repositories.interfaces import INetworkACLRepository
from core.security.ip import ip_in_any_cidr


@dataclass
class PolicyDecision:
    allowed: bool
    reason: str
    matched_rule_id: Optional[str] = None


class PolicyEngine:
    def __init__(self, network_acl_repo: INetworkACLRepository) -> None:
        self._acl_repo = network_acl_repo

    def evaluate_ip(self, client_ip: str, org_id: Optional[str]) -> PolicyDecision:
        rules = self._acl_repo.list_effective(org_id)

        for rule in rules:
            if ip_in_any_cidr(client_ip, [rule["cidr"]]):
                allowed = rule["rule_type"] == "allow"
                return PolicyDecision(
                    allowed=allowed,
                    reason=f"matched {rule['rule_type']} rule for {rule['cidr']}",
                    matched_rule_id=rule["id"],
                )

        has_allow_rule = any(r["rule_type"] == "allow" for r in rules)
        if has_allow_rule:
            return PolicyDecision(
                allowed=False,
                reason="allowlist mode active and IP matched no allow rule",
            )
        return PolicyDecision(allowed=True, reason="no matching rule; default allow")

    def evaluate_time_window(self, org_id: Optional[str]) -> PolicyDecision:
        """Placeholder -- always allows. Extension point for maintenance-
        window / business-hours policies (SecurityPolicy config exists in
        SecurityConfig for this; not wired to a decision yet)."""
        return PolicyDecision(allowed=True, reason="time-window policy not enforced")

    def evaluate(self, client_ip: str, org_id: Optional[str]) -> PolicyDecision:
        ip_decision = self.evaluate_ip(client_ip, org_id)
        if not ip_decision.allowed:
            return ip_decision
        return self.evaluate_time_window(org_id)
