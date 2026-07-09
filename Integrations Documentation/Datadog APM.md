# Datadog APM

Parent: [[Integrations Documentation/Integrations Overview|Integrations Overview]] · [[Operations/Runbook - Monitoring & Health Checks|Runbook - Monitoring & Health Checks]]

Unlike everything else under [[Integrations Documentation/Integrations Overview|Integrations Overview]], this one is **actually implemented** — it's observability instrumentation of ConfigFoundry itself, not a business-logic integration that reads/writes inventory data.

## What it does

- **Backend:** `ddtrace` (pinned `4.10.7` in `requirements.txt`) auto-instruments FastAPI/Starlette, SQLAlchemy, httpx/requests, and the stdlib `logging` module at process start via `ddtrace-run` — zero manual span code anywhere in the application.
- **Frontend:** `dd-trace` (Node package) is loaded via `NODE_OPTIONS="--require dd-trace/init"` in `frontend/package.json`'s `dev`/`start` scripts.
- **Log correlation:** with `DD_LOGS_INJECTION=true`, ddtrace patches stdlib `logging` to set `dd.trace_id`/`dd.span_id` on every `LogRecord`; `core/logging/formatters.py` includes these fields (defaulting to `"0"` when absent, so logs remain valid without ddtrace running).
- **Profiling:** Datadog Continuous Profiler, enabled purely via `DD_PROFILING_ENABLED` — no code changes.

## Configuration

All via environment variables, loaded from the shared root `.env` by `Makefile` (`-include .env`) and `run_offline.sh`:

| Variable | Purpose |
|---|---|
| `DD_ENV` | Environment tag (dev/staging/prod) |
| `DD_VERSION` | Version tag |
| `DD_AGENT_HOST` | Datadog Agent hostname |
| `DD_TRACE_AGENT_PORT` | Datadog Agent trace-intake port |
| `DD_LOGS_INJECTION` | Inject trace/span IDs into log records |
| `DD_PROFILING_ENABLED` | Enable the Continuous Profiler |
| `DD_SERVICE` | **Not** in `.env` — injected per-launcher (`configfoundry-api` for backend via `Makefile`/`run_offline.sh`, a separate name for the frontend via `frontend/package.json`) so one shared `.env` can't leak the wrong service name into the other process |
| `NEXT_PUBLIC_DD_CLIENT_TOKEN`, `NEXT_PUBLIC_DD_APPLICATION_ID` | Frontend RUM/browser monitoring, if used |

## How it's invoked

```makefile
dev-backend:
	DD_SERVICE=configfoundry-api ddtrace-run python3 server.py

serve: build
	DD_SERVICE=configfoundry-api ddtrace-run python3 server.py
```

`run_offline.sh` invokes the same way: `exec .venv/bin/ddtrace-run .venv/bin/python3 server.py "$@"`.

## Authentication

None from ConfigFoundry's side — the Datadog Agent (`DD_AGENT_HOST`) is assumed to be reachable on the local network/host; ConfigFoundry never talks to Datadog's cloud API directly, only to a local agent. No Datadog API key appears in this codebase.

## Data exchanged

Traces (HTTP spans, SQL query spans, outbound HTTP spans), logs (correlated via trace/span ID injection), and profiler samples (CPU/memory). No inventory business data is sent to Datadog by this instrumentation — it's infrastructure/APM telemetry only.

## Failure scenarios

If `DD_AGENT_HOST` is unset or unreachable, `ddtrace-run` degrades gracefully — the wrapped process still starts and serves requests; spans are simply dropped rather than the app crashing. This is standard `ddtrace` behavior, not custom-coded in this repository.

## Air-gap interaction

> [!NOTE]
> Because ConfigFoundry's air-gap validation (`scripts/validate_airgap.py`) checks for unreachable external HTTP endpoints, a Datadog Agent must be reachable on the *local* network (not the public internet) for this instrumentation to function in an air-gapped deployment — or it should be left disabled (`DD_AGENT_HOST` unset) entirely. See [[Deployment/Air-Gap Deployment|Air-Gap Deployment]].

## Monitoring

This *is* part of ConfigFoundry's monitoring story — see [[Operations/Runbook - Monitoring & Health Checks|Runbook - Monitoring & Health Checks]] for how it complements the (currently missing) `/health`/`/metrics` endpoints.

## See also

[[Integrations Documentation/Integrations Overview|Integrations Overview]] · [[Backend/Logging Framework|Logging Framework]] · [[Deployment/Air-Gap Deployment|Air-Gap Deployment]]
