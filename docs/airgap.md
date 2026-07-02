# Air-Gap Deployment Guide

ConfigFoundry is built to run in environments with **zero internet
access** — banks, government, defense, healthcare, telecom, and any
Fortune 500 network segment where the machine running ConfigFoundry
cannot and will not reach the public internet. This page explains why
that constraint shaped the architecture, exactly what "zero internet
access" is verified to mean, how to install and update under it, and how
to regenerate the offline bundles when you need to bump a dependency.

## Why air-gap support exists

Most web frameworks assume `pip install` and `npm install` can always
reach a package registry, and many quietly assume a CDN is reachable too
(Google Fonts, jsDelivr, unpkg, Bootstrap CDN — FastAPI's own default
`/docs` page is CDN-backed out of the box). That assumption breaks
completely inside a network with no route to the internet, which is the
normal operating environment for a lot of the infrastructure ConfigFoundry
is meant to sit in front of. Rather than bolt on an offline mode later,
every dependency here is vendored and pinned, and every static asset is
self-hosted.

## What "air-gapped" is verified to mean

Concretely, and checked automatically (not just asserted):

1. **No PyPI, npm registry, GitHub releases, jsDelivr, unpkg, Google
   Fonts, CDNJS, Cloudflare CDN, Microsoft CDN, Bootstrap CDN, Font
   Awesome CDN, or any other external HTTP endpoint** is contacted
   during install, build, or runtime.
2. Every Python dependency is vendored as a pinned wheel in
   `vendor/python/` with a SHA-256 checksum manifest.
3. Every frontend JS/CSS/font/icon asset is bundled into the Next.js
   static export or self-hosted under `static/vendor/` — none are
   fetched from a CDN at runtime (this is also what fixed the earlier
   CSP/blank-page issues — see [Security](./security.md)).
4. `scripts/validate_airgap.py` scans the entire source tree for
   un-allowlisted `http://`/`https://` references, confirms
   `requirements.txt`/`requirements-dev.txt`/`frontend/package.json` are
   pinned to exact versions (no `^`, `~`, `>=`, `latest`), verifies the
   wheelhouse checksums, and — the check that can't be faked — actually
   runs `pip install --no-index --find-links vendor/python` into a
   throwaway virtualenv.
5. CI's `offline-install-smoke-test` job goes one step further:
   it firewalls the runner off from `pypi.org` and
   `files.pythonhosted.org` with `iptables` *before* running
   `install_offline.sh`, so a passing run is proof the install path is
   structurally incapable of reaching those hosts, not just that it
   didn't happen to try.

## Installing on an air-gapped machine

```bash
./install_offline.sh      # Linux/macOS
.\install_offline.ps1     # Windows PowerShell
```

What it does, step by step:

1. Verifies Python 3.10+ is on `PATH`.
2. Confirms `vendor/python/` exists and has wheels (fails fast with a
   clear message if you're on a copy of the repo that's missing them —
   this isn't a valid offline bundle without them).
3. Creates `.venv/` and runs
   `pip install --no-index --find-links vendor/python -r requirements.txt`.
   `--no-index` isn't just a preference here — it makes pip structurally
   unable to reach PyPI even if the network happened to be open.
4. Uses the pre-built `frontend/out/` static export if present (the
   normal case — it ships in the release bundle, so **Node.js is not
   needed at all** for a standard install). If it's missing and Node is
   available, it attempts an offline rebuild using
   `vendor/npm/node_modules.tar.gz` and the platform-matched native
   compiler under `vendor/npm/swc-binaries/`.
5. Prints a friendly success message with the next command to run.

Then start it:

```bash
./run_offline.sh          # or .\run_offline.ps1
```

Database migrations run automatically on first launch — there's no
separate offline migration step.

## Updating an existing air-gapped install

```bash
./upgrade_offline.sh --db-from /path/to/current/configfoundry.db
```

This backs up the existing database (timestamped,
`db/configfoundry.db.pre-upgrade-<timestamp>.bak`), copies it forward,
re-runs `install_offline.sh` against the new release's vendored
dependencies, and reminds you that migrations apply automatically on
next start. See [Upgrade Guide](./upgrade.md) for the general upgrade
process (version compatibility, rollback) and
[Release Process](./release-process.md) for what's inside a release
bundle.

## Targeting a different platform

`vendor/python/` contains wheels for multiple manylinux tags per
architecture (`manylinux2014`, `manylinux_2_28`, `manylinux_2_34` for
both `x86_64` and `aarch64`) because different upstream packages publish
under different tags. If `install_offline.sh` fails to find a compatible
wheel for your exact machine, run:

```bash
python3 -m pip debug --verbose   # lists this machine's compatible tags
```

and compare against the filenames in `vendor/python/CHECKSUMS.sha256`.
If your platform genuinely isn't covered, regenerate the wheelhouse (see
below) on a machine with internet access and matching target
architecture, then copy `vendor/python/` over.

## Regenerating the offline bundles

You need internet access for this step — it's meant to run in CI or on
a developer machine before cutting a release, never on the air-gapped
target itself.

**Python wheelhouse:**

```bash
./scripts/build_python_wheelhouse.sh                       # default: linux x86_64 + aarch64
./scripts/build_python_wheelhouse.sh --with-dev             # + requirements-dev.txt
./scripts/build_python_wheelhouse.sh --windows               # + win_amd64 wheels
```

Downloads each dependency individually (`--no-deps`, then resolved
separately) rather than as one batch, because pip's batch resolution is
all-or-nothing — a single package needing a different manylinux tag can
silently prevent the whole batch from downloading anything. Regenerates
`vendor/python/CHECKSUMS.sha256` and verifies the result with a real
`--no-index` install into a throwaway venv before finishing.

**Node/npm vendor artifacts:**

```bash
./scripts/build_npm_offline_vendor.sh
```

Runs `npm ci` for the local platform, then `npm pack` for each target
platform's `@next/swc-*` native compiler package, tars the result into
`vendor/npm/node_modules.tar.gz`, and writes checksums. See
`vendor/npm/README.md` for the current state of what's vendored per
platform — this is the one piece of the offline story where completing
a full `node_modules.tar.gz` requires running the script end-to-end on a
normal (non-sandboxed) machine, since it involves a full `npm ci` that
can take longer than a constrained CI step allows. In practice this
rarely matters day-to-day: **the release bundle ships the pre-built
`frontend/out/` static export**, so an air-gapped install only needs the
npm vendor artifacts if you're intentionally rebuilding the frontend
from source offline.

## Verifying compliance yourself

```bash
python3 scripts/validate_airgap.py
```

Prints a pass/fail line per check category and an overall summary. This
is the same script CI runs on every push (`airgap-validation` job) — see
[.github/workflows/ci.yml](../.github/workflows/ci.yml).

## Why this doesn't compromise functionality

The one hard rule going into this work was: never remove a feature to
make air-gap easier. Every existing capability — Swagger/ReDoc API docs,
Excel import/export, MFA QR enrollment — still works exactly as before;
the only change is that the assets those features depend on are now
served from the same origin instead of a CDN. See
[Security](./security.md) for how the CSP was tightened to same-origin
only, which this self-hosting made possible.
