# API Versioning

Parent: [API Overview](API Overview.md) · [Architecture Overview](../architecture/Architecture Overview.md)

URL-based versioning: all endpoints under `/api/v1/`. Future versions (`/api/v2/`, ...) can be added alongside without removing or changing existing routes.

## Design decisions

- **URL versioning, not header versioning** — bookmarkable, curl-able, visible in logs.
- **Router-per-version, not branch-per-version** — each version is a self-contained package (`api/v1/`, future `api/v2/`); shared infrastructure (`api/dependencies.py`, `core/services/`, `core/repositories/`) is version-agnostic.
- **Single FastAPI app** — all versions share one OpenAPI document at `/docs`.

## Adding v2

1. Create `api/v2/__init__.py`, `api/v2/router.py`, and only the modules that actually change in v2.
2. Re-export unchanged v1 modules directly into the v2 router.
3. Register in `app.py`: `app.include_router(v2_router, prefix="/api")` — **before** the `StaticFiles` mount, which must always come last (it's a catch-all and would shadow any router registered after it).
4. Add `openapi_tags` entries for new v2 endpoints.
5. Add `tests/api/test_v2.py` verifying both versions respond correctly and both appear in the OpenAPI spec.

## Versioning rules

| Rule | Rationale |
|---|---|
| Never modify a shipped version's router | Clients depend on stable paths |
| Business logic lives in `core/services/`, not routers | Routers translate HTTP <-> service calls; services are version-agnostic |
| Schemas live in `schemas/` | v2 can add new Pydantic models without touching v1 |
| Keep the old version alive >= one release cycle | Give clients time to migrate |

## Alternative: sub-application isolation

For strict version isolation (separate middleware/auth/rate-limit stacks), each version can be mounted as its own `FastAPI` sub-application via `app.mount()` instead of `include_router()`. Trade-off: `app.state` isn't shared, more boilerplate. Not used today — the single-app approach is the current default; see `docs/api-versioning.md` for the full code sketch.

## See also

[API Overview](API Overview.md) · [Architecture Overview](../architecture/Architecture Overview.md#api-architecture)
