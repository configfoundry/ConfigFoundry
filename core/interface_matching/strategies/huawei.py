from core.interface_matching.base import IF_NAME, InterfaceIdentifier, InterfaceMatchStrategy


class HuaweiStrategy(InterfaceMatchStrategy):
    """Huawei VRP interface names (GigabitEthernet, XGigabitEthernet, ...)
    are matched by name/ifDescr."""

    vendor = "huawei"

    def resolve(self, interface_name: str) -> InterfaceIdentifier:
        return InterfaceIdentifier(IF_NAME, (interface_name or "").strip())
