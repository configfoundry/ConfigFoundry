# Runbook: Monitoring & Health Checks

Parent: [[Architecture Overview#Monitoring]] · [[Operations]]

## Liveness / readiness

> [!NOTE]
> No dedicated `/health` or `/healthz` endpoint exists yet — tracked for v0.6.0 in [[Roadmap Overview]], not a silent omission.

Practical substitutes today:

| Check | Command | What it proves |
|---|---|---|
| Cheapest liveness | `curl -sf http://localhost:8420/openapi.json > /dev/null && echo up \|\| echo down` | FastAPI app fully booted (route registration complete). No auth required. |
| Stronger readiness | `GET /api/v1/meta` (requires `meta:read`) | Exercises the full stack: auth, service layer, real DB round-trip via `StorageProvider` |

Internally, every `StorageProvider` implements a non-raising `health_check()` returning `HEALTHY`/`DEGRADED`/`UNHEALTHY` with latency — the building block a future `/health` endpoint will expose directly.

## What to alert on

- **Process health:** `systemctl status configfoundry` / `journalctl -u configfoundry -f` — is it running, is it crash-looping.
- **HTTP availability:** poll the `/openapi.json` check above on a short interval from external monitoring.
- **Database health:** for PostgreSQL/MySQL/SQL Server, monitor the DB server with standard tooling; for SQLite, monitor disk space on the volume holding the `.db` file (SQLite fails hard, not gracefully, when disk fills).
- **Failed login rate:** spikes in `401`/`429` on `/api/v1/auth/login` (request log or `GET /api/v1/audit/search`) — signals credential stuffing, distinct from the automatic per-account lockout.
- **Certificate expiry:** monitored at the reverse-proxy layer, not inside ConfigFoundry.

## Logs

```bash
export CONFIGFOUNDRY_LOG_JSON=true
export CONFIGFOUNDRY_LOG_FILE=/var/log/configfoundry/app.log
```

Point a log shipper (Fluent Bit, Filebeat, Vector, platform-standard agent) at that file. Every request carries a correlation ID — see [[Backend/Logging Framework|Logging Framework]].

## Datadog APM

If `DD_AGENT_HOST` is configured, traces/logs/profiles flow to the local Datadog Agent — see [[Integrations Documentation/Datadog APM|Datadog APM]] for setup and what's (and isn't) sent.

## Audit log as an operational signal

Beyond compliance, `GET /api/v1/audit/search` (`audit:read`) is a practical day-to-day debugging tool: filter by actor, date range, resource type, or result to investigate "who changed this" or "why did this generation fail" without separate application metrics.

## Planned (not yet built)

A `/health` (liveness) and `/ready` (readiness, live `StorageProvider.health_check()` call) pair, plus a Prometheus-compatible `/metrics` endpoint — v0.6.0.

## See also

[[Backend/Logging Framework|Logging Framework]] · [[Integrations Documentation/Datadog APM|Datadog APM]] · [[Operations/Runbook - Troubleshooting|Runbook - Troubleshooting]]
