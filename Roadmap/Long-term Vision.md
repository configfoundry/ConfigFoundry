# Long-term Vision

Parent: [[Roadmap Overview]] · [[Product/Product Vision|Product Vision]]

Beyond v1.0, the trajectory implied by the roadmap and architecture principles (rather than an explicitly stated post-1.0 plan, which doesn't exist yet in the source):

- **Deepen enterprise capabilities** already sketched for v0.7.0–v0.8.x — SSO/OIDC/LDAP, multi-tenant inventory, HA, a reviewed plugin interface — into fully production-hardened, widely-deployed capabilities rather than newly-landed ones.
- **Grow the integrations ecosystem** within the architectural contract already established ([[Integrations Documentation/Integrations Overview|Integrations Overview]]) — Datadog config push, NetBox, LDAP, SNMP discovery, and whatever else real deployments need, each self-contained and optional.
- **Stay air-gap-first as a permanent constraint**, not a phase — every future capability continues to be verified offline-capable, not just assumed to be.
- **Keep the smaller surface area as a durable advantage** — per [[Architecture Overview#Principles]], simplicity is treated as a feature, not a temporary MVP shortcut to be "fixed" later. Long-term growth should add capability without abandoning that principle.

## Open question for maintainers

Whether a genuine OSS/Enterprise commercial split (see [[Product/OSS vs Enterprise|OSS vs Enterprise]]) is ever pursued is unresolved in current project material — the architecture doesn't preclude it, but nothing in the roadmap commits to it either.

## See also

[[Roadmap Overview]] · [[Product/Product Vision|Product Vision]] · [[Executive Summary]]
