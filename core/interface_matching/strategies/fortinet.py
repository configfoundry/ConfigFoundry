from core.interface_matching.base import IF_NAME, InterfaceIdentifier, InterfaceMatchStrategy


class FortinetStrategy(InterfaceMatchStrategy):
    """FortiOS interface names (port1, port2, ...) are matched by
    name/ifDescr."""

    vendor = "fortinet"

    def resolve(self, interface_name: str) -> InterfaceIdentifier:
        return InterfaceIdentifier(IF_NAME, (interface_name or "").strip())
