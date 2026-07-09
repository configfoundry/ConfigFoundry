# Pricing Ideas

Parent: [[Product/OSS vs Enterprise|OSS vs Enterprise]]

> [!IMPORTANT]
> Speculative product-planning content. ConfigFoundry has **no pricing, billing, or license-gating code anywhere in this repository** today — it's MIT-licensed and self-hosted with no commercial layer. Nothing below should be read as a claim about actual product monetization; it's offered because the requested documentation scope asked for pricing ideas, framed explicitly as brainstorming, not a roadmap commitment.

## Possible models, if commercialization were pursued

1. **Support/SLA contracts** — the codebase already states no support SLA is offered by default (`docs/enterprise.md`); a paid support tier (response-time guarantees, upgrade assistance, a direct line for security disclosures) is the most natural first monetization step that requires zero code changes.
2. **Managed hosting** — explicitly a non-goal today (self-hosted, air-gap-first architecture points the other direction), but a "we run it for you" managed offering could exist alongside the self-hosted OSS product without changing the core architecture.
3. **Enterprise feature tier** — gating genuinely new enterprise-only capabilities (SSO/OIDC connectors, multi-tenant inventory isolation, HA) behind a license once built, while keeping the current feature set free — consistent with how the roadmap already separates "v0.7.0 Enterprise capabilities" from the core.
4. **Professional services** — deployment hardening review, air-gap bundle validation for a specific regulated environment, custom integration development (given the plugin-style `integrations/` contract already exists).

## What this deliberately rules out, per the architecture principles

A SaaS/hosted-by-default product, or any model requiring phone-home telemetry/licensing checks — both conflict directly with the air-gap-first, zero-telemetry design already in place (see [[Repository Overview#External dependencies]] and `docs/faq.md`'s explicit "no telemetry, no phone-home update check" statement).

## See also

[[Product/OSS vs Enterprise|OSS vs Enterprise]] · [[Roadmap Overview]]
