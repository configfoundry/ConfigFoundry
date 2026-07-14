"""
Maps a ``MonitoringConfiguration`` into a ``DatadogPlatformModel``, conforming
to the official Datadog SNMP integration config schema.

This is a Datadog-only concern -- ``core/domain/`` stays completely
vendor-neutral; nothing here changes what the canonical model looks like
beyond the two small, additive fields (``InterfaceBandwidth.region/center/
link_type``, ``Device.raw_config_type``) added alongside this work because
Datadog's schema needs facts the canonical model wasn't carrying yet (see
their docstrings in core/domain/models.py for why those specific additions
were judged vendor-neutral, not Datadog-specific).

Field mapping from the previous (pre-schema-conformance) output:
    ip              -> ip_address
    snmpUser        -> user
    (new)           -> snmp_version (always 3 -- this integration only ever
                       reads SNMPv3 credential fields, see
                       core/domain/helpers.py::has_full_creds)
    authProtocol/authKey/privProtocol/privKey -> unchanged (preserved as-is)
    allocated_bw_bps -> in_speed AND out_speed (both set to the same value --
                       BandwidthRow only ever captured one "Allocated BW"
                       figure, not separate inbound/outbound, and the
                       inventory model is intentionally not being changed
                       to add that distinction here)
    interface_description (bare key) -> folded into an interface "tags" list
    device "tags" (arbitrary resolved Tags-module dict) -> replaced by a
        fixed, ordered 12-key "tags" list matching Datadog's own expected
        tag vocabulary (see _DEVICE_TAG_SOURCES below); values Datadog
        expects that aren't derivable from a canonical field are looked up
        by display name in the resolved Tags-module data and simply omitted
        (not emitted with an empty value) when not configured for a device.

Format-alignment pass (matching an existing real Datadog config sample):
    Key order per instance: ip_address, snmp_version, user, authProtocol,
        authKey, privProtocol, privKey, device (only if non-blank),
        network_address/mode (ICMP only), tags, interface_configs. This is
        pure dict-insertion-order control in _map_device -- formats/
        yamldump.py already renders dicts with sort_keys=False, so
        insertion order IS output order; no renderer change needed for this.
    "subnet" dropped -- not part of the official schema, wasn't in the
        reference sample, and isn't in the key-order list above.
    "tags" key on an interface_configs entry is omitted entirely (not `[]`)
        when that interface has no populated tags, matching the same
        "omit rather than emit empty" rule already applied to individual
        tag values.
    index-matched interfaces (Arista "Eth N") render match_value as a bare
        YAML integer (e.g. `match_value: 48`) rather than a quoted string,
        matching the sample -- only when the raw value is a clean integer
        string; a decimal sub-interface id (e.g. "54.200") is left as a
        string since it can't become an int without losing information.
    Deliberately NOT changed: authKey/privKey still render as `''` (quoted
        empty string) rather than a bare blank scalar when a device has no
        credentials configured. The reference sample shows those blank,
        but that wasn't called out as one of the explicit formatting rules
        and may simply reflect redacted values in that sample -- flagging
        this rather than guessing; can be revisited if it's actually wanted.

Interface matching (vendor-aware, added after the format-alignment pass):
    Which SNMP field identifies an interface (ifIndex vs. ifDescr/name) now
    depends on the *monitored device's* vendor, not just an Arista-only
    regex. That decision is resolved exactly once, in
    core/domain/builder.py, via the Interface Match Strategy registry
    (core/interface_matching/) -- NOT here. By the time this module sees an
    InterfaceBandwidth, its `.identifier` (an IF_INDEX/IF_NAME +
    value pair -- vendor-neutral SNMP MIB-II vocabulary, not Datadog's)
    is already fully resolved. `_translate_identifier()` below does pure
    translation of that canonical identifier into Datadog's own
    match_field/match_value vocabulary ("index"/"name") -- no vendor
    detection, no regexes, nothing Arista/Cisco/Juniper-specific lives in
    this file.

Subnet device tag (added alongside interface matching):
    Datadog's SNMP integration also accepts a "subnet" tag identifying
    which subnet a device belongs to. Sourced from the canonical
    Device.subnet field (already populated by core/domain/builder.py from
    a Subnets-table CIDR match) and omitted entirely when no match was
    found, same "omit rather than emit empty" rule as every other tag here.
"""
from core.domain.models import Device, InterfaceBandwidth, MonitoringConfiguration
from core.interface_matching.base import IF_INDEX
from core.platforms.datadog.models import DatadogPlatformModel

# This integration only ever populates SNMPv3 credential fields
# (authProtocol/authKey/privProtocol/privKey) -- there is no v1/v2c
# community-string path anywhere in the inventory schema -- so the SNMP
# version Datadog should use is always 3 for polled (non-ICMP) devices.
_SNMP_VERSION = 3

# Ordered device-level tag keys Datadog's SNMP integration expects.
# `None` as the source means "read directly off the canonical Device
# object"; a string means "look up a Tags-module tag with this exact
# display name" (via device.tags, already vendor-neutral and already
# populated by core/domain/builder.py -- no domain model change needed
# for these).
_DEVICE_TAG_SOURCES = [
    ("collector_region", None),
    ("operating_region", "Operating Region"),
    ("config_type", None),
    ("geolocation", "Geolocation"),
    ("region", "Region"),
    ("center", "Center"),
    ("device_class", "Device Class"),
    ("device_category", "Device Category"),
    ("device_type", "Device Type"),
    ("device_name", None),
    ("ip_address", None),
    ("country_code", "Country Code"),
    # 13th tag, added alongside vendor-aware interface matching -- not part
    # of the original 12-tag spec, so it's appended after rather than
    # interleaved, keeping the original order intact for anything that
    # already depends on it (e.g. test_device_tags_are_ordered).
    ("subnet", None),
]

# Values sourced directly from canonical Device fields, keyed the same as
# the "None-sourced" entries above.
_DIRECT_DEVICE_TAG_FIELDS = {
    "collector_region": lambda d: d.region,
    "config_type": lambda d: d.raw_config_type,
    "device_name": lambda d: d.name,
    "ip_address": lambda d: d.ip,
    "subnet": lambda d: d.subnet,
}


def _device_tags(device: Device) -> list:
    """Fixed, ordered "key:value" tag list. Omits any tag whose value is
    blank/unconfigured rather than emitting "key:" with nothing after --
    Datadog's own tag conventions don't expect empty-valued tags."""
    tags = []
    for key, tag_name in _DEVICE_TAG_SOURCES:
        if tag_name is None:
            value = _DIRECT_DEVICE_TAG_FIELDS[key](device)
        else:
            value = device.tags.get(tag_name)
        if value:
            tags.append(f"{key}:{value}")
    return tags


def _interface_tags(iface: InterfaceBandwidth) -> list:
    """Same "key:value" convention as _device_tags, for the four
    interface-level tags Datadog expects on each interface_configs entry."""
    tags = []
    if iface.region:
        tags.append(f"region:{iface.region}")
    if iface.center:
        tags.append(f"center:{iface.center}")
    if iface.link_type:
        tags.append(f"link_type:{iface.link_type}")
    if iface.description:
        tags.append(f"interface_description:{iface.description}")
    return tags


def _translate_identifier(iface: InterfaceBandwidth) -> dict:
    """Pure translation of the canonical InterfaceIdentifier (IF_INDEX/
    IF_NAME, resolved once upstream by core/domain/builder.py via the
    Interface Match Strategy registry) into Datadog's own match_field/
    match_value vocabulary. No vendor logic lives here -- this function
    only knows Datadog's two field names, nothing about Arista/Cisco/etc.

    Datadog renders an index match's value as a bare integer (e.g. `48`),
    not a quoted string -- but only when it's a clean whole number. A
    decimal sub-interface id (e.g. Arista "Eth 54.200" -> "54.200") stays
    a string; turning that into a float/int would lose the sub-interface
    distinction that's the whole point of match_value."""
    identifier = iface.identifier
    if identifier.identifier_type == IF_INDEX:
        value = identifier.identifier_value
        return {
            "match_field": "index",
            "match_value": int(value) if value.isdigit() else value,
        }
    return {"match_field": "name", "match_value": identifier.identifier_value}


def _map_interface(iface: InterfaceBandwidth) -> dict:
    entry: dict = {
        **_translate_identifier(iface),
        "in_speed": iface.capacity_bps,
        "out_speed": iface.capacity_bps,
    }
    tags = _interface_tags(iface)
    if tags:
        entry["tags"] = tags
    return entry


def _map_device(device: Device) -> dict:
    entry: dict = {"ip_address": device.ip}

    if device.monitoring_mode == "icmp_only":
        if device.name:
            entry["device"] = device.name
        entry["network_address"] = f"{device.ip}/32"
        entry["mode"] = "icmp"
    else:
        creds = device.credentials
        entry["snmp_version"] = _SNMP_VERSION
        entry["user"] = creds.snmp_user if creds else ""
        entry["authProtocol"] = creds.auth_protocol if creds else ""
        entry["authKey"] = creds.auth_key if creds else ""
        entry["privProtocol"] = creds.priv_protocol if creds else ""
        entry["privKey"] = creds.priv_key if creds else ""
        if device.name:
            entry["device"] = device.name

    device_tags = _device_tags(device)
    if device_tags:
        entry["tags"] = device_tags

    if device.interfaces:
        entry["interface_configs"] = [_map_interface(iface) for iface in device.interfaces]

    return entry


def map_to_platform_model(config: MonitoringConfiguration) -> DatadogPlatformModel:
    files: dict = {}
    for group_key, devices in config.devices.items():
        files[f"{group_key}.yaml"] = {
            "init_config": {},
            "instances": [_map_device(d) for d in devices],
        }
    return DatadogPlatformModel(files=files)
