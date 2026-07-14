"""
Datadog Platform Adapter -- official schema conformance tests.

Supersedes the earlier byte-identical-to-pre-refactor proof that lived in
this file: that proof was for the ADR-0008 architectural refactor (Inventory
-> Validation -> MonitoringConfiguration -> Platform Adapter -> Platform
Model -> Renderer -> Output), which was explicitly required to change
NOTHING about Datadog's actual output. This follow-up work intentionally
changes Datadog's output shape to conform to the official Datadog SNMP
integration schema (ip_address/user/snmp_version/in_speed/out_speed/tags),
so the old byte-identical assertions are obsolete by design, not by
accident -- see core/platforms/datadog/mapper.py's module docstring for
the full field-by-field mapping rationale.

Only core/platforms/datadog/ and two small, additive, backward-compatible
domain model fields changed (InterfaceBandwidth.region/center/link_type,
Device.raw_config_type) -- core/validator.py, models/inventory.py, and
every other Platform Adapter are untouched. tests/logic/* (validator) and
tests/services/test_generate_service.py (unaffected by field renames,
since they only assert on structural things like "files are YAML strings")
still pass unchanged -- see the full suite run in this same change.

Run:
    python3 -m unittest tests.platforms.test_datadog_regression -v
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from core.domain.builder import build_monitoring_configuration
from core.platforms.datadog.adapter import DatadogAdapter
from core.platforms.datadog.mapper import map_to_platform_model

POLLED_DEVICE = {
    'IP': '192.0.2.1', 'Device': 'core-sw-1', 'Collector Region': 'US East',
    'Config Type': '', 'Device Vendor': 'Arista',
    'snmpUser': 'admin', 'authProtocol': 'SHA', 'authKey': 'authkey1',
    'privProtocol': 'AES', 'privKey': 'privkey1',
    'tags': {'class': 'router', 'cc': 'US', 'cat': 'core', 'typ': 'switch',
              'opreg': 'Americas', 'geo': '40.7,-74.0', 'reg': 'NorthEast', 'ctr': 'NYC-DC1'},
}
ICMP_DEVICE = {
    'IP': '198.51.100.5', 'Device': 'storage-1', 'Collector Region': 'EU West',
    'Config Type': 'ICMP', 'Device Vendor': '', 'tags': {},
}
SUBNETS = [
    {'CIDR': '192.0.2.0/24', 'tags': {}},
]
BANDWIDTH = [
    {'IP': '192.0.2.1', 'Interface': 'Eth 3', 'Allocated BW': '1 Gbps',
     'Interface_description': 'uplink', 'Region': 'AMER', 'Center': 'NYC1', 'Link Type': 'MPLS'},
]
TAG_DEFS = [
    {'id': 'class', 'name': 'Device Class', 'scopes': ['devices']},
    {'id': 'cc', 'name': 'Country Code', 'scopes': ['devices']},
    {'id': 'cat', 'name': 'Device Category', 'scopes': ['devices']},
    {'id': 'typ', 'name': 'Device Type', 'scopes': ['devices']},
    {'id': 'opreg', 'name': 'Operating Region', 'scopes': ['devices']},
    {'id': 'geo', 'name': 'Geolocation', 'scopes': ['devices']},
    {'id': 'reg', 'name': 'Region', 'scopes': ['devices']},
    {'id': 'ctr', 'name': 'Center', 'scopes': ['devices']},
]


def _build(devices, bandwidth=None, tag_defs=None, subnets=None):
    config = build_monitoring_configuration(devices, bandwidth or [], subnets or [], tag_defs or [])
    model = map_to_platform_model(config)
    # Exactly one region in these fixtures -> exactly one file.
    return next(iter(model.files.values()))


class TestPolledDeviceSchema(unittest.TestCase):
    """SNMP-polled device, all 12 device tags configured."""

    def setUp(self):
        self.instance = _build([POLLED_DEVICE], BANDWIDTH, TAG_DEFS)['instances'][0]

    def test_ip_address_key_used(self):
        self.assertEqual(self.instance['ip_address'], '192.0.2.1')
        self.assertNotIn('ip', self.instance)

    def test_user_key_used(self):
        self.assertEqual(self.instance['user'], 'admin')
        self.assertNotIn('snmpUser', self.instance)

    def test_snmp_version_emitted(self):
        self.assertEqual(self.instance['snmp_version'], 3)

    def test_auth_priv_fields_preserved(self):
        self.assertEqual(self.instance['authProtocol'], 'SHA')
        self.assertEqual(self.instance['authKey'], 'authkey1')
        self.assertEqual(self.instance['privProtocol'], 'AES')
        self.assertEqual(self.instance['privKey'], 'privkey1')

    def test_all_twelve_device_tags_present_when_configured(self):
        tags = self.instance['tags']
        expected = {
            'collector_region:US East',
            'operating_region:Americas',
            'device_class:router',
            'geolocation:40.7,-74.0',
            'region:NorthEast',
            'center:NYC-DC1',
            'device_category:core',
            'device_type:switch',
            'device_name:core-sw-1',
            'ip_address:192.0.2.1',
            'country_code:US',
        }
        self.assertTrue(expected.issubset(set(tags)))
        # config_type omitted -- raw Config Type was blank for this device.
        self.assertFalse(any(t.startswith('config_type:') for t in tags))

    def test_device_tags_are_ordered(self):
        order = ['collector_region', 'operating_region', 'geolocation', 'region',
                  'center', 'device_class', 'device_category', 'device_type',
                  'device_name', 'ip_address', 'country_code']
        keys_present = [t.split(':', 1)[0] for t in self.instance['tags']]
        self.assertEqual(keys_present, order)

    def test_interface_configs_use_in_speed_out_speed(self):
        iface = self.instance['interface_configs'][0]
        self.assertEqual(iface['in_speed'], 1_000_000_000)
        self.assertEqual(iface['out_speed'], 1_000_000_000)
        self.assertNotIn('allocated_bw_bps', iface)

    def test_interface_tags(self):
        iface_tags = self.instance['interface_configs'][0]['tags']
        self.assertEqual(
            iface_tags,
            ['region:AMER', 'center:NYC1', 'link_type:MPLS', 'interface_description:uplink'],
        )

    def test_interface_no_bare_description_key(self):
        self.assertNotIn('interface_description', self.instance['interface_configs'][0])


class TestIcmpDeviceSchema(unittest.TestCase):
    """ICMP-only device: no SNMP fields, config_type populated from raw value."""

    def setUp(self):
        self.instance = _build([ICMP_DEVICE])['instances'][0]

    def test_no_snmp_fields(self):
        for key in ('user', 'snmp_version', 'authProtocol', 'authKey', 'privProtocol', 'privKey'):
            self.assertNotIn(key, self.instance)

    def test_network_address_and_mode_preserved(self):
        self.assertEqual(self.instance['network_address'], '198.51.100.5/32')
        self.assertEqual(self.instance['mode'], 'icmp')

    def test_config_type_tag_from_raw_value(self):
        self.assertIn('config_type:ICMP', self.instance['tags'])

    def test_unconfigured_tags_omitted_not_blank(self):
        for t in self.instance['tags']:
            key, _, value = t.partition(':')
            self.assertTrue(value, f"tag {t!r} should not have an empty value")


class TestFormatAlignment(unittest.TestCase):
    """Format-alignment pass: key order, dropped subnet, omitted-when-empty
    interface tags, integer match_value for index matches."""

    def setUp(self):
        self.instance = _build([POLLED_DEVICE], BANDWIDTH, TAG_DEFS)['instances'][0]

    def test_top_level_key_order(self):
        expected = ['ip_address', 'snmp_version', 'user', 'authProtocol', 'authKey',
                     'privProtocol', 'privKey', 'device', 'tags', 'interface_configs']
        self.assertEqual(list(self.instance.keys()), expected)

    def test_icmp_key_order(self):
        instance = _build([ICMP_DEVICE])['instances'][0]
        expected = ['ip_address', 'device', 'network_address', 'mode', 'tags']
        self.assertEqual(list(instance.keys()), expected)

    def test_subnet_never_emitted(self):
        self.assertNotIn('subnet', self.instance)
        self.assertNotIn('subnet', _build([ICMP_DEVICE])['instances'][0])

    def test_device_key_omitted_when_name_blank(self):
        blank_name_device = {**ICMP_DEVICE, 'Device': ''}
        instance = _build([blank_name_device])['instances'][0]
        self.assertNotIn('device', instance)

    def test_index_match_value_is_int(self):
        iface = self.instance['interface_configs'][0]
        self.assertEqual(iface['match_value'], 3)
        self.assertIsInstance(iface['match_value'], int)

    def test_name_match_value_stays_string(self):
        bw = [{'IP': '192.0.2.1', 'Interface': 'GigabitEthernet0/1', 'Allocated BW': '10 Mbps'}]
        iface = _build([POLLED_DEVICE], bw, TAG_DEFS)['instances'][0]['interface_configs'][0]
        self.assertEqual(iface['match_value'], 'GigabitEthernet0/1')
        self.assertIsInstance(iface['match_value'], str)

    def test_decimal_subinterface_index_stays_string(self):
        bw = [{'IP': '192.0.2.1', 'Interface': 'Eth 54.200', 'Allocated BW': '10 Mbps'}]
        iface = _build([POLLED_DEVICE], bw, TAG_DEFS)['instances'][0]['interface_configs'][0]
        self.assertEqual(iface['match_value'], '54.200')

    def test_interface_tags_key_omitted_when_no_tags_configured(self):
        bw = [{'IP': '192.0.2.1', 'Interface': 'Eth 3', 'Allocated BW': '1 Gbps'}]
        iface = _build([POLLED_DEVICE], bw, TAG_DEFS)['instances'][0]['interface_configs'][0]
        self.assertNotIn('tags', iface)


class TestSubnetDeviceTag(unittest.TestCase):
    """subnet:<CIDR> is appended as a 13th device tag when a Subnets-table
    CIDR match is found, and omitted (not emitted blank) otherwise."""

    def test_subnet_tag_present_on_match(self):
        instance = _build([POLLED_DEVICE], BANDWIDTH, TAG_DEFS, SUBNETS)['instances'][0]
        self.assertIn('subnet:192.0.2.0/24', instance['tags'])

    def test_subnet_tag_omitted_without_match(self):
        instance = _build([POLLED_DEVICE], BANDWIDTH, TAG_DEFS)['instances'][0]
        self.assertFalse(any(t.startswith('subnet:') for t in instance['tags']))


class TestInterfaceMatchStrategy(unittest.TestCase):
    """Vendor-aware interface matching, resolved once by
    core/domain/builder.py via the Interface Match Strategy registry, then
    translated (not re-derived) by the Datadog mapper. Exercises the full
    pipeline end-to-end rather than the registry/strategies in isolation
    (see tests/interface_matching/ for unit-level coverage)."""

    def _iface(self, device_vendor, interface_name):
        device = {**POLLED_DEVICE, 'Device Vendor': device_vendor}
        bw = [{'IP': '192.0.2.1', 'Interface': interface_name, 'Allocated BW': '1 Gbps'}]
        return _build([device], bw, TAG_DEFS)['instances'][0]['interface_configs'][0]

    def test_arista_matches_by_index(self):
        iface = self._iface('Arista', 'Ethernet48')
        self.assertEqual(iface['match_field'], 'index')
        self.assertEqual(iface['match_value'], 48)

    def test_cisco_matches_by_name(self):
        iface = self._iface('Cisco', 'GigabitEthernet0/1')
        self.assertEqual(iface['match_field'], 'name')
        self.assertEqual(iface['match_value'], 'GigabitEthernet0/1')

    def test_cisco_alias_resolves_to_cisco_strategy(self):
        # Cisco vs. "Cisco IOS-XE" behave identically -- both are name-match.
        self.assertEqual(self._iface('Cisco', 'Te1/1'), self._iface('Cisco IOS-XE', 'Te1/1'))

    def test_arista_alias_resolves_to_arista_strategy(self):
        self.assertEqual(self._iface('Arista', 'Ethernet1'), self._iface('Arista EOS', 'Ethernet1'))

    def test_unknown_vendor_falls_back_to_generic_name_match(self):
        iface = self._iface('SomeVendorNoOneHasHeardOf', 'weird0')
        self.assertEqual(iface['match_field'], 'name')
        self.assertEqual(iface['match_value'], 'weird0')

    def test_blank_vendor_falls_back_to_generic_name_match(self):
        iface = self._iface('', 'Ethernet48')
        # No vendor -> Generic strategy -> name match, even though
        # "Ethernet48" would have index-matched under Arista.
        self.assertEqual(iface['match_field'], 'name')
        self.assertEqual(iface['match_value'], 'Ethernet48')


class TestDatadogAdapterEndToEnd(unittest.TestCase):
    """Same fixtures through the full adapter (mapper + renderer), proving
    the YAML actually renders (not just the pre-render dict)."""

    def test_generate_produces_valid_yaml_text(self):
        config = build_monitoring_configuration([POLLED_DEVICE, ICMP_DEVICE], BANDWIDTH, [], TAG_DEFS)
        result = DatadogAdapter().generate(config)
        self.assertEqual(len(result.files), 2)
        for text in result.files.values():
            self.assertIsInstance(text, str)
            self.assertIn('tags:', text)


if __name__ == "__main__":
    unittest.main()
