from core.interface_matching.base import IF_NAME, InterfaceIdentifier, InterfaceMatchStrategy


class GenericStrategy(InterfaceMatchStrategy):
    """Fallback for unrecognized or unconfigured vendors. Always matches
    by name -- never guesses at an ifIndex it has no basis for, and never
    raises, so an unknown ``device_vendor`` can never break generation."""

    vendor = "generic"

    def resolve(self, interface_name: str) -> InterfaceIdentifier:
        return InterfaceIdentifier(IF_NAME, (interface_name or "").strip())
