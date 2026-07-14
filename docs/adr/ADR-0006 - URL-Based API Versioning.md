# ADR-0006: URL-Based, Router-Per-Version API Versioning

Parent: [ADR Index](ADR Index.md) · [API Versioning](../api/API Versioning.md)

## Context

The REST API will eventually need to evolve in breaking ways, but existing consumers (scripts, SNMP collectors using API keys, the frontend itself) can't be broken by an in-place change. A versioning scheme needs to be chosen before the pain of an actual breaking change forces a rushed decision.

## Decision

URL-based versioning (`/api/v1/...`) rather than header-based (`Accept: application/vnd.api+json;version=1`), with a router-per-version layout: `api/v1/` is a self-contained package; a future `api/v2/` would be a new package that re-exports unchanged v1 modules directly and only reimplements what actually changes. All versions register into a single FastAPI app (one shared OpenAPI document at `/docs`) rather than separate sub-applications.

## Consequences

**Positive:** versions are bookmarkable and curl-able with no extra headers; visible in server logs without header inspection; trivially testable with a `status_code` + path-prefix check; a v2 endpoint that doesn't change can import the v1 module directly with zero duplication.

**Negative:** the `StaticFiles` catch-all mount must always be registered after every `include_router()` call, an easy-to-violate ordering constraint with a silent failure mode (a new router registered after the mount is simply shadowed, not errored) — see [API Versioning § StaticFiles ordering rule](../api/API Versioning.md#staticfiles-ordering-rule); a single shared app means all versions share one middleware stack — true version isolation (different auth/rate-limit behavior per version) would require the documented sub-application alternative instead.

## Alternatives considered

Header-based versioning was rejected for the discoverability/testability reasons above. The sub-application isolation pattern (each version as its own `FastAPI()` mounted via `app.mount()`) was documented as a viable alternative but not adopted as the default — it trades away shared `app.state` for stricter isolation, judged not worth the added boilerplate until a real need for divergent per-version middleware appears.

## See also

[API Versioning](../api/API Versioning.md) · [Architecture Overview](../architecture/Architecture Overview.md#api-architecture)
