# vendor/npm/ — offline frontend build inputs

This directory lets `frontend/` be rebuilt (`npm run build` / `make build`)
with **zero npm registry access**. See `docs/airgap.md` for the full
picture; this file just documents what's actually in here.

## Contents

- `swc-binaries/<platform>/` — the native Next.js compiler
  (`@next/swc-<platform>`) for each target platform, fetched via `npm pack`
  (which, unlike `npm install`, can download a package for a platform
  other than the one running the command). Currently vendored:
  - `linux-x64-gnu` — the dominant enterprise Linux server architecture
  - `linux-arm64-gnu` — the other common enterprise Linux server architecture
  - `darwin-arm64` — Apple Silicon (development machines)

  Not vendored by default: `linux-*-musl` (Alpine), `darwin-x64` (Intel
  Mac), `win32-x64-msvc`. Add any of these by re-running
  `scripts/build_npm_offline_vendor.sh` after adding the platform to its
  `TARGET_PLATFORMS` list (they're already listed there, just commented
  out of the default vendor set to keep this directory a reasonable size).

- `node_modules.tar.gz` — **not yet generated as of this writing.** A full
  `npm ci` for this project consistently takes longer than automated CI
  sandboxes here tend to allow in one step, so this file is the one
  documented manual step left: on any normal (non-sandboxed) machine with
  npm registry access, run:

  ```
  scripts/build_npm_offline_vendor.sh
  ```

  which runs `npm ci` in `frontend/`, tars the result into
  `node_modules.tar.gz` here, and writes `package-lock.json.snapshot` +
  appends to `CHECKSUMS.sha256`. This is a one-time step per dependency
  bump, same as the Python wheelhouse.

## Why `next` is pinned to an exact version

`frontend/package.json` pins `"next": "14.2.33"` (not a `^14.2.0` range).
`next@14.2.34` and `next@14.2.35` were published upstream without a
matching `@next/swc-<platform>` binary release, which is what caused the
"Found lockfile missing swc dependencies, patching..." crash this project
hit repeatedly before this pin was added. Don't widen this range without
first confirming every `@next/swc-<platform>` package your target
platforms need actually exists at the new version
(`npm view "@next/swc-linux-x64-gnu@<version>" version`).

## Using this at install time

`install_offline.sh` / `upgrade_offline.sh`:
1. Extract `node_modules.tar.gz` into `frontend/node_modules/` if present.
2. Detect the current machine's platform (`node -p "process.platform + '-' + process.arch"`).
3. If `frontend/node_modules/next/node_modules/@next/swc-<platform>` is
   missing or doesn't match, copy the right `swc-binaries/<platform>/` in.
4. Run `npm run build` — with node_modules fully populated and the
   matching native binary present, this makes no network requests.

If neither `node_modules.tar.gz` nor the currently-installed
`frontend/node_modules/` already has what's needed, the install falls
back to a clear error rather than silently trying (and failing) to reach
the npm registry -- see the "no matching offline package" message in
`install_offline.sh`.
