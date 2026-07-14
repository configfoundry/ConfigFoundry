# Contributing

## Before you start

Read [Architecture](../architecture/architecture.md) for the design principles this
project holds to, and [Development](development.md) for how to get a
local environment running. The single rule that shapes every review:
**never remove an existing feature or reduce functionality** to make
something else cleaner — improve architecture, documentation, and
maintainability without regressing capability.

## Reporting a bug

Open an issue with: what you expected, what happened instead, exact
reproduction steps, your ConfigFoundry version, and — if relevant —
whether you're running the offline/air-gapped install path or a source
install with internet access. For security issues, see
[Security § Reporting a vulnerability](../security/security.md#reporting-a-vulnerability)
instead of a public issue.

## Proposing a change

1. Open an issue first for anything beyond a small fix — a quick
   discussion before you write code avoids rework, especially for
   anything touching the security layer, storage abstraction, or the
   air-gap guarantees.
2. Fork, branch, make your change.
3. Add or update tests — see [Development § Running the tests](development.md#running-the-tests).
   A change without a test covering it is a much harder sell in review.
4. If you touched a dependency (Python or npm), regenerate the offline
   vendor bundles and confirm `scripts/validate_airgap.py` still
   passes — see [Air-Gap Deployment](../deployment/airgap.md).
5. If you touched an API endpoint, confirm `/docs` and `/redoc` still
   reflect it correctly (they're generated from the code, so this is
   usually automatic — just check).
6. Update the relevant page(s) under `docs/` in the same change, not as
   a follow-up. Documentation drift is treated as a real defect here,
   not an afterthought.
7. Open a pull request describing what changed and why, referencing the
   issue if there is one.

## What gets prioritized in review

- Correctness and test coverage.
- Consistency with the layering rules in
  [Architecture](../architecture/architecture.md#layering-rules) — services don't
  import drivers directly, routes don't contain business logic, core
  doesn't import integrations.
- No new hardcoded role-name checks — permission codes only, see
  [RBAC](../security/rbac.md).
- No new external network dependency introduced into application
  source — CDN references, remote fonts, telemetry calls. This is
  enforced automatically by CI's `airgap-validation` job, but it's much
  cheaper to catch before you open the PR.
- Documentation kept in sync with the change.

## Style

`make typecheck` and `make lint` cover the frontend (`tsc --noEmit` and
`next lint`); there's no enforced Python formatter/linter (see
[Development § Code style](development.md#code-style) for why that's
deliberate). Match the surrounding code's style, prefer explicit code
over clever abstractions (see the architecture principles), and keep
functions small enough that a reviewer can hold the whole thing in their
head.

## Codebase-specific notes

A few non-obvious things worth knowing before you touch specific files:

- **`formats/yamldump.py`** (the YAML serializer) and **`core/aesgcm.py`**
  (SNMPv3 credential encryption) are both verified against their "real"
  counterparts (PyYAML and a standard AES-GCM implementation) with
  extensive fuzz tests during development. If you touch either file,
  re-verify against the real library before submitting — a subtle
  divergence in either one is the kind of bug that stays invisible until
  it corrupts someone's generated config or their stored credentials.
- **`static/networktree.js`** (the legacy pan/zoom Network Tree diagram)
  clamps panning and zooming so content can never drift fully out of
  view (see `clampZoomToContent`). If you work on porting this to the
  Next.js frontend (see [Roadmap](../roadmap/roadmap.md)), test with a real
  button-click zoom-in followed by selecting a large bucket — that
  combination is what originally exposed the bug this guards against.
- **Any schema change is a new Alembic migration**, never an ad-hoc
  `ALTER` in a repository or provider — see
  [Migrations § Writing a new migration](../architecture/migrations.md#writing-a-new-migration).

## Adding a new permission, provider, or integration

These are explicit extension points with existing patterns to follow:

- New permission code → [RBAC § Design rationale](../security/rbac.md#design-rationale)
- New storage provider → [Storage § Adding a new provider](../architecture/storage.md#adding-a-new-provider)
- New integration → keep it dependent on core, never the reverse, per
  [Architecture § Layering rules](../architecture/architecture.md#layering-rules)

## License

ConfigFoundry is MIT licensed — see `LICENSE` in the repository root.
By contributing, you agree your contribution is licensed under the same
terms.
