# Security Policy

## Supported versions

ConfigFoundry is pre-1.0 (currently in the v0.5.x **Enterprise
Preview** line — see [Roadmap](docs/roadmap.md)). Security fixes are
made against the latest release on `main`; there is no long-term
support for older minor versions at this stage.

| Version | Supported |
|---|---|
| 0.5.x   | ✅ |
| < 0.5   | ❌ |

## Reporting a vulnerability

If you find a security issue, report it privately rather than opening a
public GitHub issue — use GitHub's private security advisory feature on
this repository, or contact the maintainer directly. Include the
affected version, reproduction steps, and an impact assessment if you
have one. There is no bug bounty program at this time.

## Scope

ConfigFoundry's full security model — authentication, RBAC, the
IP-based Access Policy Engine, the audit trail, Content-Security-Policy
and other headers, and known scope boundaries (what's deliberately not
covered yet) — is documented in [docs/security.md](docs/security.md).
If you're evaluating ConfigFoundry for a regulated environment, also
see [docs/enterprise.md](docs/enterprise.md) (pre-go-live checklist)
and [docs/compliance-soc2.md](docs/compliance-soc2.md) (SOC 2 control
mapping).
