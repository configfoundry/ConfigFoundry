"""
Platform Adapters -- the only place vendor-specific (monitoring-platform-
specific) logic is allowed to live in ConfigFoundry.

Each subpackage is one monitoring platform (``datadog/``, ``prometheus/``,
``zabbix/``, ...) and owns its full implementation: mapping from
``MonitoringConfiguration`` to a platform-specific model, rendering that
model to output, and (in the future) deploy/verify/import/rollback.

Core architectural principle (ADR-0008): adding a new monitoring platform
must require only (1) creating a new Platform Adapter package here and
(2) registering it in ``registry.py``. No changes to ``core/domain/``,
``core/validator.py``, API contracts, or any other platform's package.
If adding a platform ever requires touching an existing platform's code,
that's a signal the architecture needs reconsidering, not a one-off
exception.
"""
