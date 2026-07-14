import re

from core.interface_matching.base import IF_INDEX, InterfaceIdentifier, InterfaceMatchStrategy
from core.interface_matching.strategies.generic import GenericStrategy

# Matches "Ethernet48", "Eth48", "Eth 48" (existing ConfigFoundry inventories
# use the short "Eth N" form), and decimal sub-interface ids like
# "Ethernet48.100" / "Eth 54.200". Case-insensitive, optional space before
# the number. Equivalent to the retired core/domain/helpers.py::ARISTA_ETH_RE,
# generalized to also accept the unabbreviated "Ethernet" form.
_ETH_RE = re.compile(r"^Eth(?:ernet)?\s*(\d+(?:\.\d+)?)$", re.IGNORECASE)

_fallback = GenericStrategy()


class AristaStrategy(InterfaceMatchStrategy):
    """Arista EOS identifies interfaces by SNMP ifIndex -- "Ethernet48" /
    "Eth48" / "Eth 48" (optionally with a decimal sub-interface id, e.g.
    "Ethernet48.100") matches by index. Anything else falls back to
    matching by name rather than guessing."""

    vendor = "arista"

    def resolve(self, interface_name: str) -> InterfaceIdentifier:
        name = (interface_name or "").strip()
        m = _ETH_RE.match(name)
        if m:
            return InterfaceIdentifier(IF_INDEX, m.group(1))
        return _fallback.resolve(name)
