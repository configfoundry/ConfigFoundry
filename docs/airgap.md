# Air-Gap Deployment Guide

ConfigFoundry is built to run in environments with **zero internet
access** — banks, government, defense, healthcare, telecom, and any
Fortune 500 network segment where the machine running ConfigFoundry
cannot and will not reach the public internet. This page explains why
that constraint shaped the architecture, exactly what "zero internet
access" is verified to mean, how to install and update under it, and how
to regenerate the offline bundles when you need to bump a dependency.

> [!IMPORTANT]
> Read [Repository vs. release artifact](#repository-vs-release-artifact)
> below before you go looking for a prebuilt frontend or vendored npm
> packages in a plain `git clone` — they're not there on purpose, and
> that's not a regression.

## Why air-gap support exists

Most web frameworks assume `pip install` and `npm install` can always
reach a package registry, and many quietly assume a CDN is reachable too
(Google Fonts, jsDelivr, unpkg, Bootstrap CDN — FastAPI's own default
`/docs` page is CDN-backed out of the box). That assumption breaks
completely inside a network with no route to the internet, which is the
normal operating environment for a lot of the infrastructure ConfigFoundry
is meant to sit in front of. Rather than bolt on an offline mode later,
every dependency is vendored and pinned, and every static asset is
self-hosted, at the point a release is built.

## Repository vs. release artifact

These are two different things, deliberately kept separate so the git
repository stays a normal-sized source checkout:

| | Git repository (`git clone`) | Release bundle (`ConfigFoundry-Offline-vX.Y.Z.zip`) |
|---|---|---|
| Contains | Source code, `docs/`, `scripts/`, the small `vendor/python/` wheelhouse | Everything in the repo, **plus** a prebuilt `frontend/out/` and the full `vendor/npm/` offline payload |
| Size | A normal source checkout | Tens of MB, all platforms' offline dependencies included |
| Needs internet to use? | To build the frontend once (`make build`, needs Node) — Python alone is enough to run the backend against the committed wheelhouse | **No.** Extract and run `install_offline.sh` — no Node, no internet, nothing else needed |
| Who's it for | Contributors, anyone building from source | Anyone deploying to an air-gapped or offline machine |
| Built by | You, cloning the repo | CI (`build-release-bundle` job, `scripts/build_release_bundle.sh`), which has internet access precisely so the *result* doesn't need any |

Concretely: `frontend/out/` (the built static export) and
`vendor/npm/swc-binaries/` + `vendor/npm/node_modules.tar.gz` (the native
compiler binaries and a full `npm ci` snapshot) are **not committed to
git** — see `frontend/.gitignore` and the root `.gitignore`. They are
large, fully regenerable from source, and would otherwise make every
clone of this repository download hundreds of MB it doesn't need for
day-to-day source work. `vendor/python/` is the one exception: it's
small (tens of MB) and is kept committed on purpose, so a bare `git
clone` plus `pip install --no-index --find-links vendor/python -r
requirements.txt` is *already* a fully offline Python install — see
[Release Process](./release-process.md) for how the bundle is assembled
and [Development](./development.md) for building the frontend from a
plain source checkout.

## What "air-gapped" is verified to mean

Concretely, and checked automatically (not just asserted):

1. **No PyPI, npm registry, GitHub releases, jsDelivr, unpkg, Google
   Fonts, CDNJS, Cloudflare CDN, Microsoft CDN, Bootstrap CDN, Font
   Awesome CDN, or any other external HTTP endpoint** is contacted
   during install, build, or runtime *of the release bundle*. (Building
   the release bundle itself, or building the frontend from a bare
   source checkout, does need internet — see the table above.)
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
5. CI's `offline-install-smoke-test` job goes one step further: it
   downloads the exact release bundle CI just built, verifies its
   checksum, extracts it, firewalls the runner off from `pypi.org`,
   `files.pythonhosted.org`, and `registry.npmjs.org` with `iptables`
   *before* running `install_offline.sh` from inside the extracted
   bundle, so a passing run is proof the actual artifact a customer
   would download is structurally incapable of reaching those hosts,
   not just that it didn't happen to try.

## Installing on an air-gapped machine

Extract `ConfigFoundry-Offline-vX.Y.Z.zip` (see
[Release Process](./release-process.md) for where to get one), then:

::: tabs
@tab Linux / macOS
```bash
./install_offline.sh
```
@tab Windows (PowerShell)
```powershell
.\install_offline.ps1
```
:::

What it does, step by step:

1. Verifies Python 3.10+ is on `PATH`.
2. Confirms `vendor/python/` exists and has wheels (fails fast with a
   clear message if you're on a copy of the repo that's missing them —
   this isn't a valid offline bundle without them).
3. Creates `.venv/` and runs
   `pip install --no-index --find-links vendor/python -r requirements.txt`.
   `--no-index` isn't just a preference here — it makes pip structurally
   unable to reach PyPI even if the network happened to be open.
4. Uses the pre-built `frontend/out/` static export shipped in the
   bundle (the normal case — **Node.js is not needed at all** for a
   standard install from a release bundle). If it's missing (e.g. you're
   installing from a bare source checkout rather than a release bundle)
   and Node is available, it attempts an offline rebuild using
   `vendor/npm/node_modules.tar.gz` and the platform-matched native
   compiler under `vendor/npm/swc-binaries/`.
5. Prints a friendly success message with the next command to run.

Then start it:

::: tabs
@tab Linux / macOS
```bash
./run_offline.sh
```
@tab Windows (PowerShell)
```powershell
.\run_offline.ps1
```
:::

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

> [!NOTE]
> If your platform genuinely isn't covered, regenerate the wheelhouse
> (see below) on a machine with internet access and matching target
> architecture, then rebuild the release bundle — see
> [Release Process](./release-process.md).

## Regenerating the offline bundles

You need internet access for this step — it's meant to run in CI (see
`build-release-bundle` in `.github/workflows/ci.yml`) or on a developer
machine before cutting a release, never on the air-gapped target itself.
In practice `scripts/build_release_bundle.sh` calls both of the scripts
below automatically when their output is missing, so you rarely need to
run them by hand — this section is for when you specifically need to
regenerate just one.

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
`--no-index` install into a throwaway venv before finishing. Its output
**is committed to git** (see
[Repository vs. release artifact](#repository-vs-release-artifact)
above) — commit the updated `vendor/python/` after running this.

**Node/npm vendor artifacts:**

```bash
./scripts/build_npm_offline_vendor.sh
```

Runs `npm ci` for the local platform, then `npm pack` for each target
platform's `@next/swc-*` native compiler package, tars the result into
`vendor/npm/node_modules.tar.gz`, and writes checksums. See
`vendor/npm/README.md` for exactly what's vendored per platform. Its
output is **not** committed to git — it's regenerated fresh by CI (or by
a developer with internet access) every time a release bundle is built.

## Verifying compliance yourself

```bash
python3 scripts/validate_airgap.py
```

Prints a pass/fail line per check category and an overall summary. This
is the same script CI runs on every push (`airgap-validation` job) and
again against the fully assembled bundle
(`build-release-bundle` job) — see
[.github/workflows/ci.yml](../.github/workflows/ci.yml).

## Why this doesn't compromise functionality

The one hard rule going into this work was: never remove a feature to
make air-gap easier. Every existing capability — Swagger/ReDoc API docs,
Excel import/export, MFA QR enrollment — still works exactly as before;
the only change is that the assets those features depend on are now
served from the same origin instead of a CDN. See
[Security](./security.md) for how the CSP was tightened to same-origin
only, which this self-hosting made possible.
