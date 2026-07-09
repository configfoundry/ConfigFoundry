# Deployment Overview

Parent: [[Repository Overview]] · [[Architecture Overview]]

## Topology

Single process (FastAPI + static frontend export, same origin) backed by one database. No built-in load balancer, message queue, or worker pool — intended as one instance per team/environment, behind a reverse proxy for TLS termination. See [[Architecture/Diagrams/Deployment Diagram|Deployment Diagram]].

## No container image

> [!NOTE]
> There is **no `Dockerfile`** anywhere in this repository. Deployment today is a bare-metal/VM process under a supervisor (systemd) or the air-gapped installer scripts — not a container image. If containerization is desired, it would need to be built as new project infrastructure. See [[Development/Technical Debt|Technical Debt]].

## Three ways to get ConfigFoundry running

| Method | Use case | Detail |
|---|---|---|
| Release bundle (`ConfigFoundry-Offline-vX.Y.Z.zip`) | Offline/air-gapped target | [[Deployment/Air-Gap Deployment\|Air-Gap Deployment]] |
| From source, with internet access | Local development, contributing | [[Deployment/Development Setup\|Development Setup]] |
| Offline install from a source checkout | Python-only offline install using the committed `vendor/python/` wheelhouse | [[Deployment/Air-Gap Deployment\|Air-Gap Deployment]] |

## Environment variables

Full reference: [[Security/Secrets & Configuration|Secrets & Configuration]].

## CI/CD

`.github/workflows/ci.yml` runs on every push to `main` and every PR:

1. **Repository hygiene** — fails if any tracked file exceeds 40 MB.
2. **Backend tests** — `pip install -r requirements.txt -r requirements-dev.txt && python -m pytest -q`.
3. **Frontend typecheck** — `tsc --noEmit`.
4. **Frontend lint** — `next lint`.
5. **Air-gap validation** — `scripts/validate_airgap.py`.
6. **Offline-install smoke test** — downloads the just-built release bundle, firewalls the runner off from PyPI/npm registries with `iptables`, then runs `install_offline.sh` from inside the extracted bundle. A pass proves the actual downloadable artifact is structurally incapable of reaching those hosts.
7. **Build release bundle** (`build-release-bundle` job) — on tag pushes, builds and attaches `ConfigFoundry-Offline-vX.Y.Z.zip` to the GitHub Release.

No deployment automation beyond bundle publishing — actually rolling out a new version to a running instance is a manual step (see [[Deployment/Upgrade & Rollback|Upgrade & Rollback]]).

## Build process

- **Backend:** no build step.
- **Frontend:** `make build` (self-healing against a known Next.js SWC/lockfile bug — retries once with a clean `node_modules`/lockfile if that specific failure signature is detected).
- **Release bundle:** `scripts/build_release_bundle.sh` — assembles source + prebuilt frontend + vendored Python/npm dependencies into one zip, running full `validate_airgap.py` against the staged contents before zipping (a release that would fail air-gap validation is never produced).

## Release process

See [[Development/Engineering Wiki#Versioning|Engineering Wiki § Versioning]] and [[Roadmap Overview]]. Short version: semantic versioning, `frontend/package.json` is the source of truth, a release is cut when a coherent set of changes lands on `main` and passes CI (no fixed cadence), publishing is a single `git tag vX.Y.Z && git push origin vX.Y.Z`.

## Rollback

No `alembic downgrade` is recommended as the primary rollback path — restoring the pre-upgrade database file backup is simpler and doesn't depend on every migration having a correct, tested `downgrade()`. See [[Deployment/Upgrade & Rollback|Upgrade & Rollback]].

## Scaling

Vertical scaling (bigger single instance) is the supported path today. Horizontal scaling requires PostgreSQL (not validated for SQLite) and accepts per-instance rate limiting until a Redis-backed limiter exists (v0.8.x). See [[Roadmap Overview]] and [[Security/Security Overview#Rate limiting|Security Overview § Rate limiting]].

## Monitoring

See [[Operations/Runbook - Monitoring & Health Checks|Runbook - Monitoring & Health Checks]].

## See also

[[Deployment/Development Setup|Development Setup]] · [[Deployment/Production Deployment|Production Deployment]] · [[Deployment/Air-Gap Deployment|Air-Gap Deployment]] · [[Deployment/Upgrade & Rollback|Upgrade & Rollback]]
