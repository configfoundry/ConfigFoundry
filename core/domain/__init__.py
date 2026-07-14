"""
Vendor-neutral domain layer.

Everything under ``core/domain/`` (helpers, models, the builder) must never
import from, or know about, any specific monitoring platform. This is the
canonical layer described in Architecture Overview's pipeline:

    Inventory -> Validation -> MonitoringConfiguration -> Platform Adapter
    -> Platform Model -> Renderer -> Output

Only code under ``core/platforms/<platform>/`` may contain vendor-specific
(monitoring-platform-specific) logic. Note "vendor" here means monitoring
*platform* (Datadog, Prometheus, Zabbix, ...), not network-equipment vendor
(Arista, Cisco, ...) -- interface-naming conventions like Arista's "Eth N"
are properties of the device being monitored, not the platform doing the
monitoring, so that logic lives in ``core/domain/helpers.py`` and is shared
by every Platform Adapter.
"""
