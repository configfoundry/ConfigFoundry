"""
Interface Match Strategy Registry.

Single call site: ``core/domain/builder.py`` calls ``resolve(device)``
exactly once per device, while constructing ``MonitoringConfiguration``.
Platform Adapters never import this module -- see
``core/interface_matching/__init__.py``.

Public API note: ``resolve()`` takes the complete per-device record, not
just a vendor string. Today it only reads ``device_vendor`` internally,
but this leaves room to route on additional fields later -- e.g.
``device_platform``, ``device_model``, ``operating_system``,
``firmware_version`` -- without changing any call site or breaking
callers already written against this signature.

Adding a new vendor requires exactly two changes, both in this file:
    1. Write ``strategies/<vendor>.py`` (subclass ``InterfaceMatchStrategy``).
    2. Add one line to ``_STRATEGIES`` below, plus any aliases to
       ``_ALIASES``.
No Platform Adapter changes are ever required.
"""
from core.interface_matching.base import InterfaceMatchStrategy
from core.interface_matching.strategies.arista import AristaStrategy
from core.interface_matching.strategies.cisco import CiscoStrategy
from core.interface_matching.strategies.fortinet import FortinetStrategy
from core.interface_matching.strategies.generic import GenericStrategy
from core.interface_matching.strategies.huawei import HuaweiStrategy
from core.interface_matching.strategies.juniper import JuniperStrategy
from core.interface_matching.strategies.paloalto import PaloAltoStrategy

_GENERIC = GenericStrategy()

# Canonical vendor key (lowercase) -> strategy instance.
_STRATEGIES: dict = {
    "cisco": CiscoStrategy(),
    "arista": AristaStrategy(),
    "juniper": JuniperStrategy(),
    "huawei": HuaweiStrategy(),
    "fortinet": FortinetStrategy(),
    "palo alto": PaloAltoStrategy(),
}

# Alias (lowercase) -> canonical vendor key. Every value here must exist
# in _STRATEGIES.
_ALIASES: dict = {
    "cisco ios": "cisco",
    "cisco ios-xe": "cisco",
    "cisco ios xe": "cisco",
    "cisco nx-os": "cisco",
    "cisco nxos": "cisco",
    "arista eos": "arista",
    "juniper junos": "juniper",
    "junos": "juniper",
    "huawei vrp": "huawei",
    "fortios": "fortinet",
    "paloalto": "palo alto",
    "palo alto networks": "palo alto",
    "pan-os": "palo alto",
    "panos": "palo alto",
}


def resolve(device) -> InterfaceMatchStrategy:
    """Public entry point. Takes the complete per-device record (the same
    raw inventory dict already in scope in core/domain/builder.py's device
    loop) rather than a bare vendor string -- see the module docstring for
    why. Only ``device.get("Device Vendor")`` is consulted today.

    Case-insensitive, alias-aware vendor lookup. Blank or unrecognized
    vendor -> GenericStrategy -- generation must never fail because of an
    unknown device vendor."""
    vendor = (device or {}).get("Device Vendor") or ""
    key = vendor.strip().lower()
    key = _ALIASES.get(key, key)
    return _STRATEGIES.get(key, _GENERIC)
