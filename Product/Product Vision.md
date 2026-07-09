# Product Vision

Parent: [[Repository Overview]] · [[Roadmap Overview]]

## Vision statement

A shared, self-hosted source of truth for network device inventory that generates monitoring collector configuration on demand — built so it can run anywhere, including networks with zero internet access, and secure enough for regulated environments to trust it with production access control.

## Why this exists

Network teams commonly track device inventory in a spreadsheet and hand-roll monitoring config from it. That breaks down at team scale: multiple people editing their own copy, no validation, no audit trail, and generated config drifting from whatever the spreadsheet actually says by the time anyone notices. ConfigFoundry replaces the spreadsheet with one shared web server the whole team points a browser at.

## What "done" looks like (v1.0 criteria)

Per [[Roadmap Overview]]: a stable API (no breaking `/api/v1/` changes for a full release cycle), a stable database schema (migrations only, no manual intervention), a stable, twice-proven installer and upgrade path (not just fresh installs), real production deployments running it, and community feedback incorporated from a beta cycle. Not a fixed date — a checklist.

## Product pillars

1. **Single source of truth** — one dataset, multi-user, always current.
2. **Config generation, not config storage** — YAML is always derived from live inventory, never hand-maintained separately.
3. **Enterprise-grade security by default** — Argon2id, JWT + MFA, permission-code RBAC, IP policy, full audit trail, not bolted on later.
4. **Air-gap-first** — zero internet access is a first-class deployment target, verified in CI, not an afterthought.
5. **Explicit over clever** — a smaller, more auditable surface area, valued over abstraction for its own sake.

## Non-goals (deliberate)

- Not a CMDB — no asset lifecycle, ownership, or warranty tracking.
- Not a SaaS/hosted product — self-hosted only, by design.
- Not a plugin marketplace — every integration is a reviewed, in-repo addition.

See [[Repository Overview#Business problem solved]] and [[Features/Feature - Inventory Management#Known limitations|Feature - Inventory Management § Known limitations]] for the full "what this deliberately isn't."

## See also

[[Product/Target Users & Use Cases|Target Users & Use Cases]] · [[Product/OSS vs Enterprise|OSS vs Enterprise]] · [[Roadmap Overview]] · [[Executive Summary]]
