"""
core/interface_matching/registry.py -- vendor + alias lookup.

resolve() takes the complete per-device record (a plain dict, mirroring
what core/domain/builder.py already has in scope), not a bare vendor
string -- see registry.py's module docstring for why. These tests build
minimal ``{"Device Vendor": ...}`` dicts as stand-ins for that record.

Run:
    python3 -m unittest tests.interface_matching.test_registry -v
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from core.interface_matching import registry
from core.interface_matching.strategies.arista import AristaStrategy
from core.interface_matching.strategies.cisco import CiscoStrategy
from core.interface_matching.strategies.fortinet import FortinetStrategy
from core.interface_matching.strategies.generic import GenericStrategy
from core.interface_matching.strategies.huawei import HuaweiStrategy
from core.interface_matching.strategies.juniper import JuniperStrategy
from core.interface_matching.strategies.paloalto import PaloAltoStrategy


def _device(vendor):
    return {"Device Vendor": vendor}


class TestCanonicalVendorLookup(unittest.TestCase):
    def test_exact_vendor_names(self):
        self.assertIsInstance(registry.resolve(_device('Cisco')), CiscoStrategy)
        self.assertIsInstance(registry.resolve(_device('Arista')), AristaStrategy)
        self.assertIsInstance(registry.resolve(_device('Juniper')), JuniperStrategy)
        self.assertIsInstance(registry.resolve(_device('Huawei')), HuaweiStrategy)
        self.assertIsInstance(registry.resolve(_device('Fortinet')), FortinetStrategy)
        self.assertIsInstance(registry.resolve(_device('Palo Alto')), PaloAltoStrategy)

    def test_case_insensitive(self):
        self.assertIsInstance(registry.resolve(_device('CISCO')), CiscoStrategy)
        self.assertIsInstance(registry.resolve(_device('arista')), AristaStrategy)
        self.assertIsInstance(registry.resolve(_device('  Cisco  ')), CiscoStrategy)


class TestAliasResolution(unittest.TestCase):
    def test_cisco_aliases(self):
        for alias in ('Cisco IOS', 'Cisco IOS-XE', 'Cisco NX-OS'):
            with self.subTest(alias=alias):
                self.assertIsInstance(registry.resolve(_device(alias)), CiscoStrategy)

    def test_arista_aliases(self):
        self.assertIsInstance(registry.resolve(_device('Arista EOS')), AristaStrategy)

    def test_palo_alto_aliases(self):
        for alias in ('PaloAlto', 'Palo Alto Networks', 'PAN-OS'):
            with self.subTest(alias=alias):
                self.assertIsInstance(registry.resolve(_device(alias)), PaloAltoStrategy)


class TestUnknownVendorFallback(unittest.TestCase):
    def test_unrecognized_vendor_returns_generic(self):
        self.assertIsInstance(registry.resolve(_device('SomeVendorNoOneHasHeardOf')), GenericStrategy)

    def test_blank_vendor_returns_generic(self):
        self.assertIsInstance(registry.resolve(_device('')), GenericStrategy)

    def test_missing_vendor_key_returns_generic(self):
        self.assertIsInstance(registry.resolve({}), GenericStrategy)

    def test_none_device_returns_generic(self):
        self.assertIsInstance(registry.resolve(None), GenericStrategy)

    def test_never_raises(self):
        # Generation must never fail because of an unknown vendor.
        try:
            registry.resolve(_device('completely made up vendor string'))
        except Exception as exc:  # noqa: BLE001
            self.fail(f"registry.resolve() raised {exc!r} for an unknown vendor")


class TestPublicApiAcceptsFullDeviceRecord(unittest.TestCase):
    """resolve() must ignore unrelated keys on the device record -- proof
    that the signature is genuinely "accepts the complete device object",
    not secretly still just a vendor string in disguise."""

    def test_extra_fields_are_ignored(self):
        device = {
            "IP": "192.0.2.1", "Device": "core-sw-1", "Device Vendor": "Cisco",
            "Config Type": "", "snmpUser": "admin",
        }
        self.assertIsInstance(registry.resolve(device), CiscoStrategy)


if __name__ == "__main__":
    unittest.main()
