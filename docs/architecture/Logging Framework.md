# Logging Framework

Parent: [Backend Overview](Backend Overview.md) · [Architecture Overview](Architecture Overview.md)

`core/logging/` is a self-contained structured logging framework. Every component (routes, services, repositories, middleware) logs through one root logger, `configfoundry`.

```
core/logging/
  __init__.py      Public API: configure_logging(), get_logger(), get_request_id()
  config.py        LoggingConfig dataclass (YAML / env / defaults)
  context.py       ContextVar-based request ID propagation
  factory.py       get_logger(__name__) -> configfoundry.* namespace
  formatters.py     ConfigFoundryFormatter (text) + JSONFormatter, incl. Datadog dd.trace_id/dd.span_id injection
  handlers.py      build_console_handler(), build_file_handler()
  middleware.py    CorrelationIDMiddleware + RequestLoggingMiddleware
  startup.py       log_startup_info(), log_shutdown_info()
```

## Configuration

`CONFIGFOUNDRY_LOG_*` environment variables, or a `logging:` block in the YAML config file passed via `--config`. See [Secrets & Configuration](../security/Secrets & Configuration.md) for the full variable table.

## Logger hierarchy

```
configfoundry                       <- root (handlers attached here)
├── configfoundry.http              <- RequestLoggingMiddleware
├── configfoundry.lifecycle         <- startup / shutdown
├── configfoundry.core.*
└── configfoundry.api.*
```

Always obtain a logger via `from core.logging import get_logger; logger = get_logger(__name__)` — never call `logging.getLogger()` directly, or the record won't carry the correlation ID / land under the `configfoundry` namespace.

## Correlation IDs

Every HTTP request gets a 12-character hex correlation ID, propagated via a `contextvars.ContextVar` through the full call stack (including thread-pool-executed sync handlers), taken from `X-Request-ID` if present, echoed back on every response, and injected into every log line automatically.

## Middleware order

```python
# app.py — must be in this order
app.add_middleware(RequestLoggingMiddleware)   # added first -> runs second
app.add_middleware(CorrelationIDMiddleware)    # added last -> runs first
```

Reversing this logs `[-]` instead of the real correlation ID (Starlette middleware runs in reverse-registration order).

## What's logged / never logged

`RequestLoggingMiddleware` logs method, path (no query string), status, duration, and resolved IP. **Never logged:** request body, response body, query parameters, or Authorization headers.

## Datadog log correlation

When run under `ddtrace-run` with `DD_LOGS_INJECTION=true` (see [Datadog APM](../integrations/Datadog APM.md)), `ddtrace` patches the stdlib `logging` module to set `dd.trace_id`/`dd.span_id` on each `LogRecord`; `formatters.py` includes these fields (defaulting to `"0"` when absent, so the format string never breaks running without `ddtrace-run`).

## Rotation

| Mode | Handler | Behaviour |
|---|---|---|
| `daily` (default) | `TimedRotatingFileHandler` | Rotate at midnight, keep `backup_count` files |
| `size` | `RotatingFileHandler` | Rotate at `max_bytes`, keep `backup_count` |
| `none` | `FileHandler` | No rotation (dev / short-lived jobs) |

## Testing

`configure_logging()` is not called in tests (no `server.py` entry point runs) — loggers exist but have no handlers, so records are silently discarded unless a test attaches a capturing handler. See `tests/logging/`.

## See also

[Backend Overview](Backend Overview.md) · [Runbook - Monitoring & Health Checks](../deployment/runbooks/Runbook - Monitoring & Health Checks.md) · [Datadog APM](../integrations/Datadog APM.md)
