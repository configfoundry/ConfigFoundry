# OSS vs Enterprise

Parent: [Product Vision](Product Vision.md)

> [!NOTE]
> ConfigFoundry ships as **one open-source codebase** (MIT-licensed per `LICENSE`) with no separate paid tier, license gate, or feature flag distinguishing an "Enterprise" build from a "Community" build in the source today. This page frames the feature set along an OSS/Enterprise-style axis for planning purposes — it does not describe an existing commercial split.

## Enterprise-caliber capabilities already present

Everything in this list ships in the single codebase, no license key required:

- Argon2id + JWT + rotating refresh tokens + TOTP MFA + API keys
- Permission-code RBAC (five system roles + unlimited custom roles)
- IP-based Access Policy Engine
- Full audit trail
- Air-gap-capable deployment, verified in CI
- SOC 2 control mapping ([SOC 2 Compliance Mapping](../../security/SOC 2 Compliance Mapping.md))
- Multi-tenant-ready security layer (organizations, scoped roles/keys/policies)

See [Production Deployment § Pre-go-live checklist](../../deployment/Production Deployment.md#pre-go-live-checklist) for what "enterprise deployment" means operationally today.

## What a genuine Enterprise tier might differentiate on, if one were built

Speculative — not implemented, offered for product-planning purposes only:

| Candidate Enterprise feature | Current status |
|---|---|
| SSO / OIDC / LDAP | Not built (v0.7.0 roadmap) |
| Multi-tenant inventory isolation (not just security-layer) | Not built (v0.7.0 roadmap) |
| SQL Server as a production-validated backend | Scaffolded only |
| High availability / multi-instance | Not validated (v0.8.x roadmap) |
| Formal support SLA | Explicitly stated as not offered — self-hosted, community-maintained, per `docs/enterprise.md` |
| Audit log retention/export tooling | Not built (v0.7.0 roadmap) |

## What stays OSS/core regardless of any future split

Per [Architecture Overview](../../architecture/Architecture Overview.md#principles): the inventory model, generation pipeline, and storage abstraction are core and would remain fully functional and free regardless of any commercial layering — "core owns the inventory model," "integrations are optional," "core never imports integrations."

## See also

[Competitive Advantages](Competitive Advantages.md) · [Pricing Ideas](Pricing Ideas.md) · [Roadmap Overview](../../roadmap/Roadmap Overview.md)
