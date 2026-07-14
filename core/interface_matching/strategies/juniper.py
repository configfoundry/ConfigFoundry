from core.interface_matching.base import IF_NAME, InterfaceIdentifier, InterfaceMatchStrategy


class JuniperStrategy(InterfaceMatchStrategy):
    """Juniper Junos interface names (ge-, xe-, et-, ...) are matched by
    name/ifDescr."""

    vendor = "juniper"

    def resolve(self, interface_name: str) -> InterfaceIdentifier:
        return InterfaceIdentifier(IF_NAME, (interface_name or "").strip())
