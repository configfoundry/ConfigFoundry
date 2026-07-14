"""
Result type and strategy interface for vendor-aware interface matching.

``InterfaceIdentifier`` is deliberately vocabulary-neutral with respect to
any monitoring platform: ``IF_INDEX``/``IF_NAME`` describe a standard SNMP
MIB-II distinction (RFC 1213 ifTable -- ifIndex vs. ifDescr/ifName), not a
Datadog/Prometheus/Zabbix concept. That's what makes it safe for
``core/domain/models.py`` to import and store directly on
``InterfaceBandwidth`` -- it stays a fact about the interface, not a
schema choice belonging to any one Platform Adapter.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass

IF_INDEX = "IF_INDEX"
IF_NAME = "IF_NAME"


@dataclass(frozen=True)
class InterfaceIdentifier:
    """How a specific interface should be identified when polling.

    identifier_type: IF_INDEX | IF_NAME
    identifier_value: the raw SNMP ifIndex (e.g. "48", or "54.200" for a
        decimal sub-interface id -- kept as a string; converting a
        sub-interface id to a number would lose information) or the raw
        interface name/ifDescr (e.g. "GigabitEthernet0/1").
    """
    identifier_type: str
    identifier_value: str


class InterfaceMatchStrategy(ABC):
    """One vendor's interface-naming convention. The only caller is
    ``core/domain/builder.py``, via ``registry.resolve(device)`` --
    Platform Adapters must never call a strategy or the registry
    directly (see ``core/interface_matching/__init__.py``)."""

    vendor: str

    @abstractmethod
    def resolve(self, interface_name: str) -> InterfaceIdentifier:
        raise NotImplementedError
