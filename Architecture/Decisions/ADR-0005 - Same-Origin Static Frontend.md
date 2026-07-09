# ADR-0005: Next.js Static Export Served Same-Origin by FastAPI

Parent: [[Architecture/Decisions/ADR Index|ADR Index]] · [[Frontend Documentation/Frontend Overview|Frontend Overview]]

## Context

A separate Next.js server process at runtime would mean a second process to deploy, supervise, and secure, plus CORS configuration between frontend and backend origins — extra operational surface area and a CORS attack surface that a same-origin deployment avoids entirely. Given the air-gap and "explicit over clever" principles, minimizing runtime processes and cross-origin complexity is directly in scope.

## Decision

Build the Next.js App Router frontend as a fully static export (`output: 'export'`) — no SSR, no Node.js server process at runtime. `frontend/out/` is served directly by FastAPI's `StaticFiles` mount, so frontend and API share one origin, one port, one TLS certificate. This also enables a same-origin-only Content-Security-Policy (`default-src 'self'`) with no CDN allowlisting.

## Consequences

**Positive:** no CORS configuration needed in the common single-instance case; one process to deploy and supervise; a stricter CSP is possible as a direct consequence; simpler air-gap story (no separate frontend server to vendor dependencies for at runtime, only at build time).

**Negative:** rules out server-side rendering and any Next.js feature that requires a live Node process (API routes, ISR, middleware) — the frontend is necessarily a client-rendered SPA-like static export; the one CSP relaxation (`'unsafe-inline'` on `script-src`) is forced by Next.js's App Router embedding its hydration payload inline, not eliminable within this architecture; `frontend/out/` must be rebuilt and redeployed alongside the backend — there's no independent frontend release cadence.

## Alternatives considered

A separately deployed Next.js server (SSR or standalone Node server) was implicitly rejected for the reasons above. The legacy `static/` vanilla-JS frontend was the original approach and is retained only as a fallback when `frontend/out/` doesn't exist — not a considered alternative going forward, since it predates the authentication layer entirely (see [[Features/Feature - Network Tree|Feature - Network Tree]] for the one capability trapped there as a result).

## See also

[[Frontend Documentation/Frontend Overview|Frontend Overview]] · [[Security/Security Overview#Content-Security-Policy|Security Overview § Content-Security-Policy]]
