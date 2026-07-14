from core.interface_matching.base import IF_NAME, InterfaceIdentifier, InterfaceMatchStrategy


class CiscoStrategy(InterfaceMatchStrategy):
    """Cisco IOS/IOS-XE/NX-OS interface abbreviations (GigabitEthernet/Gi,
    TenGigE/Te, FastEthernet/Fa, HundredGigE/Hu, Tunnel/Tu, Port-channel,
    ...) are matched by name/ifDescr -- SNMP ifIndex numbering on Cisco
    gear isn't stable across reloads/reconfigs the way name-based matching
    is."""

    vendor = "cisco"

    def resolve(self, interface_name: str) -> InterfaceIdentifier:
        return InterfaceIdentifier(IF_NAME, (interface_name or "").strip())
