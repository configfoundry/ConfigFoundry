# Monitoring

## Liveness / readiness

ConfigFoundry does not currently expose a dedicated `/health` or
`/healthz` endpoint — this is a known gap, tracked in
[Roadmap](./roadmap.md), not a silent omission. Until it lands, use one
of these as a practical substitute:

- **`GET /openapi.json`** — cheapest option. No authentication required,
  returns quickly, and only succeeds if the FastAPI app is fully booted
  (route registration completed). Good enough for a process supervisor
  or load balancer liveness probe.
- **`GET /api/v1/meta`** (requires `meta:read`) — a stronger readiness
  signal, since it exercises the full stack: auth, the service layer,
  and a real database round-trip via `StorageProvider`.

```bash
curl -sf http://localhost:8420/openapi.json > /dev/null && echo "up" || echo "down"
```

Internally, every `StorageProvider` implements a non-raising
`health_check()` returning `HEALTHY`/`DEGRADED`/`UNHEALTHY` with a
latency measurement (see [Storage Architecture](./storage-architecture.md#storageprovider-interface))
— this is the building block a future `/health` endpoint will expose
directly; it isn't wired to an HTTP route yet.

## Logs

Structured logging is built in — see [Logging](./logging.md) for the
full reference. For log-based monitoring/alerting, set:

```bash
export CONFIGFOUNDRY_LOG_JSON=true
export CONFIGFOUNDRY_LOG_FILE=/var/log/configfoundry/app.log
```

and point your log shipper (Fluent Bit, Filebeat, Vector, or your
platform's standard agent) at that file. Every request is tagged with a
correlation ID (`CorrelationIDMiddleware`), so a single request's log
lines can be traced end-to-end even under concurrent load.

## What to alert on

Since there's no built-in metrics exporter yet (see Roadmap), monitor
at the infrastructure and log layer:

- **Process health**: is the systemd unit / supervisor process running
  and not crash-looping (`systemctl status configfoundry` /
  `journalctl -u configfoundry -f`).
- **HTTP availability**: the `/openapi.json` check above, polled by your
  external monitoring on a short interval.
- **Database health**: for PostgreSQL/MySQL/SQL Server, monitor the
  database server itself with your standard tooling; for SQLite,
  monitor disk space on the volume holding the `.db` file (SQLite fails
  hard, not gracefully degraded, when the disk fills).
- **Failed login rate**: spikes in `401`/`429` responses on
  `/api/v1/auth/login`, visible in the request log or the audit log
  (`GET /api/v1/audit/search`) — a signal for credential stuffing /
  brute-force attempts, distinct from the automatic account lockout
  (`CONFIGFOUNDRY_AUTH_LOCKOUT_THRESHOLD`) which handles individual
  accounts but won't itself alert you.
- **Certificate expiry**: if TLS is terminated at your reverse proxy
  (the standard setup — see [Deployment](./deployment.md)), monitor
  certificate expiry at that layer, not inside ConfigFoundry.

## Audit log as an operational signal

Beyond compliance, `GET /api/v1/audit/search` (requires `audit:read`) is
a practical day-to-day tool: filter by actor, date range, resource type,
or result to investigate "who changed this bandwidth cap" or "why did
this config generation fail" without needing separate application
metrics. See [RBAC](./rbac.md) for which role (Auditor, or any role with
`audit:read` granted) can query it.

## Planned

A `/health` (liveness) and `/ready` (readiness, including a live
`StorageProvider.health_check()` call) pair, plus a Prometheus-compatible
`/metrics` endpoint, are tracked in [Roadmap](./roadmap.md) rather than
promised here as already shipped.
