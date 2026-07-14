# Feature: In-App Documentation Portal

Parent: [Repository Overview](../Repository Overview.md) · [Frontend Overview](../../architecture/Frontend Overview.md)

## Purpose

Serve the `docs/` markdown set inside the running app at `/documentation`, fully static and working offline, distinct from FastAPI's own auto-generated Swagger UI (`/docs`) and ReDoc (`/redoc`).

## Business value

Keeps documentation accessible in air-gapped deployments where no external wiki/Confluence/GitHub is reachable, and keeps it versioned alongside the code it describes.

## Current implementation

Search, breadcrumbs, prev/next navigation, dark/light theme (shared preference with the main app), table of contents, Mermaid diagram rendering via a small self-hosted bundle (no CDN — consistent with the air-gap requirement).

## Files involved

- Frontend: `frontend/src/app/documentation/[slug]/`, `frontend/src/components/docs/{DocsShell,DocsContent,DocsSearch,KeyboardShortcutsModal}.tsx`, `frontend/src/lib/{docs.ts,markdown.ts}`
- Content source: `docs/*.md` (also the primary source for much of this vault — see [Repository Overview](../Repository Overview.md))

## User flow

Any page -> Documentation link -> browse/search `docs/` content in-app, without leaving the deployed instance or needing internet access.

## Dependencies

The `docs/` folder itself as content source; no backend API dependency (fully static).

## Known limitations

Per `frontend/VUEXY_MIGRATION_REPORT.md`, this module was explicitly out of scope for the Vuexy visual migration — it remains on its pre-migration styling, a visual (not functional) inconsistency with the rest of the app.

## Future improvements

Migrate to the same Vuexy shell as the rest of the app for visual consistency, once greenlit.

## See also

[Frontend Overview](../../architecture/Frontend Overview.md) · [Engineering Wiki](../../development/Engineering Wiki.md)
