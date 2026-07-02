"""Admin-facing CRUD for IP allow/deny rules. The evaluation-time logic
(deciding allow/deny for a given request) lives in
``core/services/policy_engine.py`` -- kept separate so policy authoring
(this file) and policy enforcement don't share mutable state or get
tangled together as the engine grows more rule types."""
from __future__ import annotations

from core.repositories.interfaces import IAuditRepository, INetworkACLRepository
from core.security.ip import is_valid_cidr
from core.services.auth_service import RequestContext


class PolicyServiceError(Exception):
    pass


class PolicyService:
    def __init__(self, acl_repo: INetworkACLRepository, audit_repo: IAuditRepository) -> None:
        self._acl_repo = acl_repo
        self._audit_repo = audit_repo

    def list_for_org(self, org_id: str) -> list[dict]:
        return self._acl_repo.list_all_for_org(org_id)

    def create_rule(
        self, *, org_id, rule_type: str, cidr: str, description: str, priority: int,
        actor_id: str, ctx: RequestContext,
    ) -> dict:
        if rule_type not in ("allow", "deny"):
            raise PolicyServiceError("rule_type must be 'allow' or 'deny'")
        if not is_valid_cidr(cidr):
            raise PolicyServiceError(f"'{cidr}' is not a valid CIDR or IP address")

        rule = self._acl_repo.create(
            {
                "org_id": org_id, "rule_type": rule_type, "cidr": cidr,
                "description": description, "priority": priority, "created_by": actor_id,
            }
        )
        self._audit_repo.log(
            actor_id, "policy.rule_created", {"rule_type": rule_type, "cidr": cidr},
            org_id=org_id, actor_type="user", source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="network_acl", resource_id=rule["id"], result="success",
            correlation_id=ctx.correlation_id,
        )
        return rule

    def delete_rule(self, rule_id: str, actor_id: str, ctx: RequestContext) -> None:
        self._acl_repo.delete(rule_id)
        self._audit_repo.log(
            actor_id, "policy.rule_deleted", {"rule_id": rule_id},
            actor_type="user", source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="network_acl", resource_id=rule_id, result="success",
            correlation_id=ctx.correlation_id,
        )

    def set_enabled(self, rule_id: str, enabled: bool, actor_id: str, ctx: RequestContext) -> None:
        self._acl_repo.set_enabled(rule_id, enabled)
        self._audit_repo.log(
            actor_id, "policy.rule_toggled", {"rule_id": rule_id, "enabled": enabled},
            actor_type="user", source_ip=ctx.source_ip, user_agent=ctx.user_agent,
            resource_type="network_acl", resource_id=rule_id, result="success",
            correlation_id=ctx.correlation_id,
        )
