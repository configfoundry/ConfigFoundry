# Future Ideas

Parent: [Roadmap Overview](Roadmap Overview.md)

## Unscheduled but plausible (from [Integrations Overview](../integrations/Integrations Overview.md)'s example list)

NetBox CMDB sync, SNMP discovery/walk-based device proposal, ServiceNow CMDB import/export, Slack notifications for generation/audit events, Grafana datasource/dashboard provisioning generation, OpenTelemetry event emission, Prometheus metrics scraping (partially folded into the v0.6.0 observability item).

## Deliberately out of scope (not "future," genuinely ruled out)

- **A built-in bug bounty / paid support program** — self-hosted, community-maintained tool, not a vendor product.
- **A hosted/SaaS version** — the entire design (offline-first, air-gap-capable, self-hosted storage) points the other direction on purpose.
- **A plugin marketplace or dynamic code loading** — every integration is expected to be a reviewed, in-repo addition; loading unreviewed third-party code at runtime conflicts with the air-gap/security posture this project targets.
- **GDPR-specific tooling** (data export/erasure endpoints, consent tracking) — the audit trail and RBAC foundation support adding this later, but SOC 2 was the primary compliance target so far; not committed to a timeline.

## See also

[Roadmap Overview](Roadmap Overview.md) · [Integrations Overview](../integrations/Integrations Overview.md) · [Long-term Vision](Long-term Vision.md)
