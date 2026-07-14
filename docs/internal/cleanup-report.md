# Documentation Cleanup Report — 2026-07-15

Final documentation quality/validation pass following the repo-wide
documentation reorganization (see
`docs/internal/archive/2026-07-15 Documentation Reorganization Report.md`
for the move itself). This report covers: duplicate-document
categorization, obsolete/archived documents, and the validation checks
requested (index reachability, orphan check, internal-doc exclusion, ADR
index completeness, hierarchy consistency). Nothing was merged or deleted
— every recommendation below is awaiting your approval.

## 1. Duplicate documents — categorized

Each pair covers overlapping ground because the reorganization merged two
independently authored documentation sets (the original `docs/` and a
root-level engineering wiki). Categorized below after reading the full
content of both files in every pair, not just size.

| # | Files | Category | Why |
|---|---|---|---|
| 1 | `architecture/architecture.md` vs `architecture/Architecture Overview.md` | **Merge** | `architecture.md` is missing the entire Monitoring Platform / Platform Adapter architecture (ADR-0008) — a materially important, currently-relevant part of the system. `Architecture Overview.md` has it, plus more comprehensive diagram/subsystem links, but is also less tightly organized. Recommend merging `architecture.md`'s crisp "Principles"/"Layering rules" structure into `Architecture Overview.md` (the more current, complete base), then retiring `architecture.md`. |
| 2 | `deployment/airgap.md` vs `deployment/Air-Gap Deployment.md` | **Archive** | `Air-Gap Deployment.md` is a faithful, shorter condensation of `airgap.md` — same section order, same facts, adds zero new information. Safe to archive; `airgap.md` alone is the complete, canonical version. |
| 3 | `deployment/deployment.md` vs `deployment/Production Deployment.md` | **Merge** | Reverse-proxy config, systemd unit, database-choice, zero-downtime, and firewall sections are near-identical between these two. But `Production Deployment.md` has two genuinely valuable sections `deployment.md` lacks entirely: a **Pre-go-live checklist** and a **Multi-tenancy caveat**. Recommend folding those two sections into `deployment.md` (or `enterprise.md`, which already covers hardening), then archiving the rest of `Production Deployment.md`. |
| 4 | `deployment/Deployment Overview.md` | **Keep as-is** (not a duplicate) | Covers genuinely different ground — CI/CD pipeline, build process, release process, rollback strategy, scaling notes, and the "no Dockerfile" clarification. None of this exists in `deployment.md`. Not part of a pair; listed here only because it was flagged by size in the original report. |
| 5 | `deployment/upgrade.md` vs `deployment/Upgrade & Rollback.md` | **Archive** | Same relationship as #2 — `Upgrade & Rollback.md` is a pure condensation with no unique content. (It also contained a broken link into `docs/internal/`, now fixed — see §4.) |
| 6 | `roadmap/roadmap.md` vs `roadmap/Roadmap Overview.md` | **Keep Both** | Not a real duplicate: `Roadmap Overview.md` is the *only* page that links to the six roadmap sub-pages (Current Sprint, Next Sprint, MVP, v1, v2 - Enterprise, Future Ideas, Long-term Vision) — it's load-bearing for navigation, not redundant with `roadmap.md`'s detailed version-by-version content. |
| 7 | `development/development.md` vs `development/Engineering Wiki.md` | **Keep Both** | Complementary, not overlapping: `development.md` covers project layout and environment setup; `Engineering Wiki.md` covers coding standards, naming conventions, branch/commit/review process. Different angles on "how to work in this codebase." |
| 8 | `security/security.md` vs `security/Security Overview.md` | **Merge** | Near-identical CSP block and threat-model paragraph (same content, reworded). But `Security Overview.md` has two valuable sections `security.md` lacks: **"Recovering from a lost admin account"** and a **"Vulnerabilities & recommendations"** table (a real, useful security-audit-style table). Recommend folding those two sections into `security.md`, then archiving the rest of `Security Overview.md`. |
| 9 | `api/api-versioning.md` vs `api/API Versioning.md` | **Archive** | `API Versioning.md` explicitly defers to the other file for detail ("see `docs/api-versioning.md` for the full code sketch") — self-declared as the summary, not a competing source. |
| 10 | `development/Engineering Wiki.md`'s sibling `internal/archive/Changelog (redundant summary...).md` | **Delete** | Opens with *"Summary of `CHANGELOG.md` at the repository root — see that file for the authoritative, full-text version."* Self-declared redundant. Already routed to `docs/internal/archive/` (not public); recommend outright deletion once you've glanced at it — distinct from the topic-overlap pairs above, which are worth a real look before deciding. |

**Category summary:** 3 Merge, 3 Archive, 2 Keep Both (one of which — #4 — was never actually a duplicate), 1 Delete.

## 2. Obsolete documents

- `docs/internal/archive/Changelog (redundant summary of root CHANGELOG.md).md` — see §1, row 10. Self-declared obsolete.
- No other document was found to be flatly obsolete (i.e., describing something no longer true) — the Merge/Archive candidates above are redundant with a better version, not incorrect.

## 3. Archived documents

Already moved to `docs/internal/archive/` during the reorganization (not part of this pass, listed here for completeness per your requested report structure):

- `Changelog (redundant summary of root CHANGELOG.md).md`
- `ConfigFoundry_UIUX_Audit_Report.md` — dated UI/UX audit (2026-07-07), point-in-time snapshot
- `Status Review - 2026-07-14.md` — dated project status snapshot
- `VUEXY_INTEGRATION_MIGRATION_MAP.md`, `VUEXY_MIGRATION_REPORT.md` — historical frontend migration reports
- `2026-07-15 Documentation Reorganization Report.md` — the move record from the prior pass
- `cleanup-report.md` (this file)

## 4. Bug found and fixed during this pass

While verifying link integrity, I traced how the in-app documentation
viewer (`/documentation`) actually renders links — not just whether the
underlying files exist — and found a real defect, now fixed:

**`frontend/src/lib/markdown.ts`'s link rewriter only matched single-level,
space-free relative links** (`foo.md`, `../foo.md`), a leftover from the
old flat `docs/*.md` layout. With the new nested categories, almost every
cross-category link (`../security/rbac.md`) and every link to a
space-containing filename (`Architecture Overview.md`, which is most of
the wiki-derived content) fell through to a broken raw href in the actual
rendered app — while still looking completely fine on GitHub, which just
follows the real file path. This was not caught by the file-existence link
checker from the prior pass, since the files themselves were never
missing — only the in-app URL computed from them was wrong.

Fixed by rewriting `rewriteHref()` to properly resolve arbitrary-depth
relative paths and arbitrary filenames against the current document's
directory. As part of the same fix, links that resolve into
`docs/internal/` or outside `docs/` entirely (e.g. `../../CHANGELOG.md`)
now render as GitHub links instead of an in-app route that would 404 —
this closes the loop on requirement #8 below generically, for any future
doc, not just the ones found this pass. Verified against the full corpus:
938 links checked, 29 correctly external, 0 broken.

Separately, 7 links across 6 public docs pointed at the internal archive's
redundant Changelog copy rather than the real root `CHANGELOG.md` — fixed
to point at the real file directly (better target now that it existed;
previously they'd have degraded to an external-but-dead link had the
archive copy been deleted per §1's recommendation).

## 5. Verification results

- **Reachable from `docs/index.md`:** 105/105 public documents (was 28/105
  before this pass — `docs/index.md` only referenced the original 28
  `docs/` pages, never the ~77 merged in from the wiki). Fixed by adding a
  "Deep dives" section to `docs/index.md` linking each category's hub page
  (`Architecture Overview`, `ADR Index`, `API Overview`, `Security
  Overview`, `Engineering Wiki`, `Deployment Overview` + `Operations`,
  `Integrations Overview`, `Roadmap Overview`, `Repository Overview`,
  `Features` index, `Glossary`) — each of which already comprehensively
  cross-links its own category, so the transitive closure now covers
  everything. Confirmed via a full BFS crawl from `docs/index.md`'s links.
- **Orphaned public documents: 0** — direct consequence of the above.
- **`docs/internal/` excluded from the documentation viewer: confirmed.**
  `frontend/src/lib/docs.ts`'s `listDocSlugs()`/`getAllDocsMeta()` skip the
  `internal` directory entirely (verified by direct execution: 0 leaked
  `internal/` slugs among 105 public slugs). Additionally, any public doc
  that *links* into `docs/internal/` now renders that link as an external
  GitHub link rather than a broken in-app route (§4) — found 17 such links
  across 11 files during this pass; all now resolve correctly one way or
  the other (6 repointed to the real `CHANGELOG.md`, the rest correctly
  degrade to GitHub links since no public equivalent exists for
  Product Vision / Executive Summary / OSS vs Enterprise / Target Users &
  Use Cases).
- **Every ADR linked from the ADR index: confirmed.** `docs/adr/ADR
  Index.md` links all eight (ADR-0001 through ADR-0008).
- **Hierarchy internally consistent:** full repo-wide re-scan — 132
  Markdown files, 318 relative links checked, 0 broken (the only matches
  flagged were literal example text like `[[wiki-links]]` inside this
  report's own prose, not real links). 0 remaining Obsidian `[[wiki-link]]`
  syntax outside of prose examples. `tsc --noEmit` and `next lint` clean on
  every touched file.

## 6. Recommendations requiring your approval

None of the following were acted on:

1. Merge pairs #1, #3, #8 from §1 (Architecture, Deployment, Security) —
   each has a clear "keeper" and a clear set of unique sections to fold in.
2. Archive pairs #2, #5, #9 from §1 (Air-Gap, Upgrade, API Versioning) —
   no unique content in the shorter file in any of the three.
3. Delete the self-declared-redundant Changelog summary in
   `docs/internal/archive/`.
4. No action needed on `Deployment Overview.md`, `Roadmap Overview.md`, or
   `Engineering Wiki.md` — confirmed genuinely complementary, not
   duplicates, despite being flagged by size in the original report.
