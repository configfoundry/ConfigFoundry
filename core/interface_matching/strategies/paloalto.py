from core.interface_matching.base import IF_NAME, InterfaceIdentifier, InterfaceMatchStrategy


class PaloAltoStrategy(InterfaceMatchStrategy):
    """PAN-OS interface names (ethernet1/1, ...) are matched by
    name/ifDescr."""

    vendor = "palo alto"

    def resolve(self, interface_name: str) -> InterfaceIdentifier:
        return InterfaceIdentifier(IF_NAME, (interface_name or "").strip())
