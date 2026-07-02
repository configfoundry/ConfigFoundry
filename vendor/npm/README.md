# vendor/npm/ — offline frontend build inputs (generated, not committed)

This directory lets `frontend/` be rebuilt (`npm run build` / `make build`)
with **zero npm registry access**. See `docs/airgap.md` for the full
picture; this file documents what belongs here and how it's produced.

**Nothing under `vendor/npm/` except this README is committed to git.**
The actual binaries are large (hundreds of MB across platforms) and are
one of the two things (alongside the prebuilt `frontend/out/`) that keep
this repository itself lightweight — see
[docs/release-process.md](../../docs/release-process.md) and
[docs/airgap.md](../../docs/airgap.md#repository-vs-release-artifact)
for the split between "what's in git" and "what's in an offline release
bundle." CI regenerates this directory from scratch (with internet
access) every time it builds a release bundle; a developer can do the
same locally with `scripts/build_npm_offline_vendor.sh` before running
`scripts/build_release_bundle.sh`.

## Contents (once generated)

- `swc-binaries/<platform>/` — the native Next.js compiler
  (`@next/swc-<platform>`) for each target platform, fetched via `npm pack`
  (which, unlike `npm install`, can download a package for a platform
  other than the one running the command). Vendored by default:
  - `linux-x64-gnu` — the dominant enterprise Linux server architecture
  - `linux-arm64-gnu` — the other common enterprise Linux server architecture
  - `darwin-arm64` — Apple Silicon (development machines)

  Not vendored by default: `linux-*-musl` (Alpine), `darwin-x64` (Intel
  Mac), `win32-x64-msvc`. Add any of these by re-running
  `scripts/build_npm_offline_vendor.sh` after adding the platform to its
  `TARGET_PLATFORMS` list.

- `node_modules.tar.gz` — a full `npm ci` of `frontend/`, tarred. Built by
  `scripts/build_npm_offline_vendor.sh`, which runs `npm ci`, tars the
  result here, and writes `CHECKSUMS.sha256`. This is the one step in the
  whole offline pipeline that needs a real (non-sandboxed) machine with
  npm registry access and enough time for a full `npm ci` — which is
  exactly what CI is for (see `.github/workflows/*.yml`).

## Why `next` is pinned to an exact version

`frontend/package.json` pins `"next": "14.2.33"` (not a `^14.2.0` range).
`next@14.2.34` and `next@14.2.35` were published upstream without a
matching `@next/swc-<platform>` binary release, which is what caused the
"Found lockfile missing swc dependencies, patching..." crash this project
hit repeatedly before this pin was added. Don't widen this range without
first confirming every `@next/swc-<platform>` package your target
platforms need actually exists at the new version
(`npm view "@next/swc-linux-x64-gnu@<version>" version`).

## Using this at install/build time

`scripts/build_release_bundle.sh` (which powers CI's release job):
1. Calls `scripts/build_npm_offline_vendor.sh` to (re)populate this
   directory if it isn't already present and internet access is
   available.
2. Builds `frontend/out/` fresh.
3. Packages both the built frontend and this directory's contents into
   the release bundle.

`install_offline.sh` / `upgrade_offline.sh`, on the **target** (offline)
machine:
1. Use the prebuilt `frontend/out/` shipped in the release bundle — this
   is the normal path, and it needs neither Node.js nor this directory
   at all.
2. Only if `frontend/out/` is missing (e.g. you're working from a bare
   source checkout instead of a release bundle) and you want to rebuild
   the frontend offline: extract `node_modules.tar.gz`, detect the
   current machine's platform, copy in the matching
   `swc-binaries/<platform>/`, then run `npm run build` -- with
   node_modules fully populated and the matching native binary present,
   this makes no network requests.

If neither `node_modules.tar.gz` nor an already-populated
`frontend/node_modules/` is present, the install falls back to a clear
error rather than silently trying (and failing) to reach the npm
registry — see the "no matching offline package" message in
`install_offline.sh`.
