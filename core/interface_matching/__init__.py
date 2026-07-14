"""
Interface Match Strategy -- vendor-aware interface identification.

Answers one domain question: "given this device's vendor and a raw
interface name from the Bandwidth table, how should this interface be
identified for polling?" That's an inventory/domain concern, not a
monitoring-platform one -- Datadog, Prometheus, and Zabbix would all need
the same answer, so it's resolved exactly once, in
``core/domain/builder.py``, while constructing ``MonitoringConfiguration``
(see ``registry.resolve(device)``). Platform Adapters never import from
this package; they only read the resolved ``InterfaceIdentifier`` off
``InterfaceBandwidth.identifier`` and translate it into their own schema.

``registry.resolve()`` takes the complete per-device record rather than a
bare vendor string, specifically so future routing decisions (device
platform, model, OS, firmware version, ...) can be added inside the
registry later without changing this call site -- see registry.py.

See ``base.py`` for the ``InterfaceIdentifier`` result type and the
``InterfaceMatchStrategy`` interface, ``registry.py`` for vendor/alias
lookup, and ``strategies/`` for one module per vendor.
"""
