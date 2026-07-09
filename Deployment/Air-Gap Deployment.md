# Air-Gap Deployment

Parent: [[Deployment/Deployment Overview|Deployment Overview]] · [[Architecture Overview#Principles]]

ConfigFoundry is built for environments with **zero internet access** — banks, government, defense, healthcare, telecom, and locked-down enterprise network segments. This shaped the architecture from the start rather than being retrofitted.

## Repository vs. release artifact

| | Git repository | Release bundle (`ConfigFoundry-Offline-vX.Y.Z.zip`) |
|---|---|---|
| Contains | Source, `docs/`, `scripts/`, the small `vendor/python/` wheelhouse | Everything in the repo, plus a prebuilt `frontend/out/` and full `vendor/npm/` offline payload |
| Needs internet? | To build the frontend once (needs Node) — Python backend runs against the committed wheelhouse | No — extract and `install_offline.sh` |
| Built by | You, cloning | CI (`build-release-bundle` job) |

`frontend/out/` and `vendor/npm/{swc-binaries,node_modules.tar.gz}` are **not committed to git** (large, regenerable, would bloat every clone). `vendor/python/` **is** committed (small, tens of MB) — a bare `git clone` + `pip install --no-index --find-links vendor/python -r requirements.txt` is already a fully offline Python install.

## What "air-gapped" is verified to mean

1. No PyPI, npm registry, GitHub releases, or any CDN (jsDelivr, unpkg, Google Fonts, CDNJS, Bootstrap CDN, Font Awesome CDN, etc.) is contacted during install/build/runtime of the release bundle.
2. Every Python dependency is a pinned, checksummed wheel in `vendor/python/`.
3. Every frontend asset is bundled into the static export or self-hosted under `static/vendor/` — nothing fetched from a CDN at runtime.
4. `scripts/validate_airgap.py` scans for un-allowlisted `http(s)://` references, confirms exact version pinning (no `^`/`~`/`>=`/`latest`), verifies wheelhouse checksums, and actually runs a throwaway `pip install --no-index --find-links vendor/python` install.
5. CI's `offline-install-smoke-test` job downloads the exact bundle CI just built, firewalls the runner off from `pypi.org`/`files.pythonhosted.org`/`registry.npmjs.org` with `iptables`, then runs `install_offline.sh` — proof against the actual artifact a customer downloads, not just an assertion.

## Installing on an air-gapped machine

```bash
unzip ConfigFoundry-Offline-vX.Y.Z.zip && cd ConfigFoundry-Offline-vX.Y.Z
./install_offline.sh   # or install_offline.ps1
./run_offline.sh        # or run_offline.ps1
```

`install_offline.sh` verifies Python 3.10+, confirms `vendor/python/` has wheels, creates `.venv/` with `--no-index --find-links vendor/python`, uses the pre-built `frontend/out/` (Node not needed for a standard bundle install). Migrations run automatically on first launch.

## Updating an existing air-gapped install

```bash
./upgrade_offline.sh --db-from /path/to/current/configfoundry.db
```

Backs up the existing database (timestamped), copies it forward, re-runs the offline install against the **new** release's vendored dependencies (fresh `.venv/`, avoiding dependency drift). See [[Deployment/Upgrade & Rollback|Upgrade & Rollback]].

## Targeting a different platform

`vendor/python/` contains wheels for multiple manylinux tags per architecture (`manylinux2014`, `manylinux_2_28`, `manylinux_2_34`, x86_64 + aarch64). If `install_offline.sh` can't find a compatible wheel, run `python3 -m pip debug --verbose` and compare against `vendor/python/CHECKSUMS.sha256`.

## Regenerating the offline bundles

Needs internet access — run in CI or on a developer machine before cutting a release, never on the air-gapped target itself:

```bash
./scripts/build_python_wheelhouse.sh          # + --with-dev, --windows as needed
./scripts/build_npm_offline_vendor.sh
```

`scripts/build_release_bundle.sh` calls both automatically when their output is missing.

## Verifying compliance

```bash
python3 scripts/validate_airgap.py
```

Same script CI runs on every push, and again against the fully assembled bundle.

## Why this doesn't compromise functionality

The hard rule: never remove a feature to make air-gap easier. Every capability (Swagger/ReDoc, Excel import/export, MFA QR enrollment) works exactly as before — only the assets those features depend on are now self-hosted instead of CDN-loaded.

## See also

[[Deployment/Deployment Overview|Deployment Overview]] · [[Deployment/Upgrade & Rollback|Upgrade & Rollback]] · [[Integrations Documentation/Datadog APM|Datadog APM]] (agent-reachability caveat under air-gap)
