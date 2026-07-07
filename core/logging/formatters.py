"""
Log formatters for the ConfigFoundry logging framework.

Two formatters are provided:

``ConfigFoundryFormatter``
    Human-readable text format.  Suitable for console output and plain-text
    log files.  Default for all environments.

``JSONFormatter``
    Structured JSON — one object per line.  Suitable for log-aggregation
    systems (Elasticsearch, Loki, CloudWatch, Datadog).  Enable with
    ``logging.json_format: true`` in the YAML config.

Both formatters inject the current ``request_id`` from the ContextVar so
every record produced during an HTTP request carries the same correlation ID.

Datadog trace/log correlation
------------------------------
When the process is started with ``ddtrace-run`` (see server.py / Makefile)
and ``DD_LOGS_INJECTION=true`` is set, ddtrace patches the stdlib ``logging``
module to attach ``dd.trace_id``/``dd.span_id``/``dd.service``/``dd.env``/
``dd.version`` attributes to every ``LogRecord``. Those attributes only show
up in output if the format string/payload references them, so both
formatters below include them (defaulting to ``"0"``/``"-"`` outside a
trace, matching Datadog's documented convention) -- this is configuration
only, not manual span/trace creation.

Adding a new formatter
-----------------------
Subclass ``logging.Formatter`` and inject ``record.request_id`` in
``format()``.  Register the new class in ``core/logging/handlers.py``'s
``_make_formatter()`` helper and expose a config flag in ``LoggingConfig``.
"""
from __future__ import annotations

import json
import logging

from core.logging.context import get_request_id

# ---------------------------------------------------------------------------
# Format strings
# ---------------------------------------------------------------------------

#: Column widths chosen to align typical values in a terminal.
#: dd.* fields are injected by ddtrace (DD_LOGS_INJECTION=true) when running
#: under ddtrace-run; they default to "0" via LogRecord.__dict__.get() when
#: absent (e.g. running without ddtrace-run) so this format string never
#: raises a KeyError either way.
TEXT_FORMAT = (
    "%(asctime)s "
    "%(levelname)-8s "
    "%(name)-42s "
    "[%(request_id)s] "
    "[dd.trace_id=%(dd.trace_id)s dd.span_id=%(dd.span_id)s] "
    "%(message)s"
)
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


# ---------------------------------------------------------------------------
# Text formatter
# ---------------------------------------------------------------------------

class ConfigFoundryFormatter(logging.Formatter):
    """
    Human-readable log formatter that injects ``request_id``.

    The ``request_id`` attribute is read from the ContextVar at format time,
    so it automatically reflects the current HTTP request's correlation ID
    without any changes to call sites.

    Example output::

        2024-01-15 10:30:45 INFO     configfoundry.http              [a3f8c2d1e5b4] GET /api/v1/devices → 200 (12.3ms) ip=127.0.0.1
        2024-01-15 10:30:45 ERROR    configfoundry.app               [a3f8c2d1e5b4] Unhandled ValueError on POST /api/v1/devices
    """

    def format(self, record: logging.LogRecord) -> str:
        # Inject request_id into the record so the format string can use it.
        record.request_id = get_request_id()
        # ddtrace (DD_LOGS_INJECTION=true) sets dd.trace_id/dd.span_id on the
        # record when running under ddtrace-run. When it isn't (plain
        # `python3 server.py`, or `pytest`), fall back to "0" -- otherwise
        # the format string below would raise KeyError on every log call.
        record.__dict__.setdefault("dd.trace_id", "0")
        record.__dict__.setdefault("dd.span_id", "0")
        return super().format(record)


# ---------------------------------------------------------------------------
# JSON formatter (future-ready)
# ---------------------------------------------------------------------------

class JSONFormatter(logging.Formatter):
    """
    Structured JSON log formatter.

    Each log record is emitted as a single JSON object on one line,
    making it directly ingestible by log-aggregation systems.

    Fields emitted
    --------------
    ts          ISO-8601 timestamp
    level       Log level name (INFO, ERROR, …)
    logger      Logger name (e.g. ``configfoundry.http``)
    module      Python module name
    line        Line number
    request_id  Correlation ID from ContextVar (``"-"`` outside requests)
    message     Formatted log message
    exc         Exception info (only present when exc_info is set)
    dd.trace_id / dd.span_id
                Injected by ddtrace when running under ddtrace-run with
                DD_LOGS_INJECTION=true; "0" otherwise (see module docstring).
    """

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "ts": self.formatTime(record, self.datefmt or DATE_FORMAT),
            "level": record.levelname,
            "logger": record.name,
            "module": record.module,
            "line": record.lineno,
            "request_id": get_request_id(),
            "dd.trace_id": record.__dict__.get("dd.trace_id", "0"),
            "dd.span_id": record.__dict__.get("dd.span_id", "0"),
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)
