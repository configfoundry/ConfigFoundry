# ADR-0003: Air-Gap-First Architecture

Parent: [ADR Index](ADR Index.md) · [Air-Gap Deployment](../deployment/Air-Gap Deployment.md)

## Context

Most web frameworks quietly assume `pip install`/`npm install` can always reach a registry, and that a CDN is reachable for fonts/JS/CSS (FastAPI's own default `/docs` page is CDN-backed out of the box). That assumption breaks completely inside the networks ConfigFoundry targets — banks, government, defense, healthcare, telecom segments with no route to the internet at all.

## Decision

Rather than bolt on an offline mode later, every dependency is vendored and pinned at release-build time, and every static asset is self-hosted, verified automatically rather than merely asserted:

- Python dependencies vendored as checksummed wheels in `vendor/python/` (committed to git — small enough).
- npm dependencies and the prebuilt frontend vendored only inside release bundles (large, regenerable, kept out of `git clone`).
- Swagger UI and ReDoc served from self-hosted JS/CSS (`static/vendor/docs/`) instead of FastAPI's CDN-backed defaults.
- `scripts/validate_airgap.py` scans for un-allowlisted external URLs and performs a real `--no-index` install test.
- CI firewalls a runner off from PyPI/npm/GitHub with `iptables` before proving the release bundle installs successfully — a passing run is proof against the actual downloadable artifact, not an assertion.

## Consequences

**Positive:** the project can be deployed and trusted in the most locked-down environments without exception-request friction; the same-origin-only requirement this forces also produces a stricter, more defensible Content-Security-Policy as a side effect (see [Security Overview § Content-Security-Policy](../security/Security Overview.md#content-security-policy)).

**Negative:** every new dependency (Python or npm) requires a wheelhouse/vendor-bundle regeneration step before release, adding release-process overhead; the repository maintains two vendor bundle types with different commit policies (`vendor/python/` committed, `vendor/npm/` not), which is a subtlety new contributors must learn (`docs/development.md` covers it, but it's a real onboarding cost — see [Development Setup](../deployment/Development Setup.md)).

## Alternatives considered

Treating offline support as an optional deployment mode added later (rather than architecture from day one) was implicitly rejected — CDN dependencies (fonts, Swagger UI assets) tend to be scattered throughout a codebase once introduced, making a later retrofit far more invasive than designing for it upfront.

## See also

[Air-Gap Deployment](../deployment/Air-Gap Deployment.md) · [Security Overview § Content-Security-Policy](../security/Security Overview.md#content-security-policy)
