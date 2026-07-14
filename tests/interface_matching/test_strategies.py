"""
Per-vendor Interface Match Strategy behavior.

Run:
    python3 -m unittest tests.interface_matching.test_strategies -v
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from core.interface_matching.base import IF_INDEX, IF_NAME
from core.interface_matching.strategies.arista import AristaStrategy
from core.interface_matching.strategies.cisco import CiscoStrategy
from core.interface_matching.strategies.fortinet import FortinetStrategy
from core.interface_matching.strategies.generic import GenericStrategy
from core.interface_matching.strategies.huawei import HuaweiStrategy
from core.interface_matching.strategies.juniper import JuniperStrategy
from core.interface_matching.strategies.paloalto import PaloAltoStrategy


class TestAristaStrategy(unittest.TestCase):
    def setUp(self):
        self.strategy = AristaStrategy()

    def test_ethernet_form_matches_by_index(self):
        result = self.strategy.resolve('Ethernet48')
        self.assertEqual(result.identifier_type, IF_INDEX)
        self.assertEqual(result.identifier_value, '48')

    def test_short_eth_form_matches_by_index(self):
        result = self.strategy.resolve('Eth 3')
        self.assertEqual(result.identifier_type, IF_INDEX)
        self.assertEqual(result.identifier_value, '3')

    def test_decimal_subinterface_stays_string(self):
        result = self.strategy.resolve('Eth 54.200')
        self.assertEqual(result.identifier_type, IF_INDEX)
        self.assertEqual(result.identifier_value, '54.200')

    def test_non_ethernet_name_falls_back_to_name_match(self):
        result = self.strategy.resolve('Management1')
        self.assertEqual(result.identifier_type, IF_NAME)
        self.assertEqual(result.identifier_value, 'Management1')


class TestCiscoStrategy(unittest.TestCase):
    def test_matches_by_name(self):
        for name in ('GigabitEthernet0/1', 'Te1/1', 'Fa0/0', 'Hu0/0/0/1', 'Tu5', 'Port-channel1'):
            with self.subTest(name=name):
                result = CiscoStrategy().resolve(name)
                self.assertEqual(result.identifier_type, IF_NAME)
                self.assertEqual(result.identifier_value, name)


class TestJuniperStrategy(unittest.TestCase):
    def test_matches_by_name(self):
        result = JuniperStrategy().resolve('ge-0/0/1')
        self.assertEqual(result.identifier_type, IF_NAME)
        self.assertEqual(result.identifier_value, 'ge-0/0/1')


class TestHuaweiStrategy(unittest.TestCase):
    def test_matches_by_name(self):
        result = HuaweiStrategy().resolve('GigabitEthernet1/0/1')
        self.assertEqual(result.identifier_type, IF_NAME)
        self.assertEqual(result.identifier_value, 'GigabitEthernet1/0/1')


class TestFortinetStrategy(unittest.TestCase):
    def test_matches_by_name(self):
        result = FortinetStrategy().resolve('port1')
        self.assertEqual(result.identifier_type, IF_NAME)
        self.assertEqual(result.identifier_value, 'port1')


class TestPaloAltoStrategy(unittest.TestCase):
    def test_matches_by_name(self):
        result = PaloAltoStrategy().resolve('ethernet1/1')
        self.assertEqual(result.identifier_type, IF_NAME)
        self.assertEqual(result.identifier_value, 'ethernet1/1')


class TestGenericStrategy(unittest.TestCase):
    def test_matches_by_name(self):
        result = GenericStrategy().resolve('weird0')
        self.assertEqual(result.identifier_type, IF_NAME)
        self.assertEqual(result.identifier_value, 'weird0')

    def test_blank_name_stays_blank(self):
        result = GenericStrategy().resolve('')
        self.assertEqual(result.identifier_value, '')

    def test_strips_whitespace(self):
        result = GenericStrategy().resolve('  port5  ')
        self.assertEqual(result.identifier_value, 'port5')


if __name__ == "__main__":
    unittest.main()
