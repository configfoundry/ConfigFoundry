"""
Vendor-neutral inventory helper functions.

Moved here from the retired ``core/logic.py`` verbatim (unchanged behavior --
this refactor is architectural only, see ADR-0008). These are pure functions
operating on plain dicts/strings so they stay trivially unit-testable and
have no platform coupling. ``core/validator.py`` and
``core/domain/builder.py`` both depend on this module; no Platform Adapter
should need to reach into it directly since the builder already surfaces
everything a Platform Adapter needs on ``MonitoringConfiguration``.
"""
import re
import ipaddress
from typing import Optional


def normalize_group_key(region: str) -> str:
    key = re.sub(r"[^a-z0-9]+", "_", region.strip().lower())
    return key.strip("_") or "unknown"


def is_valid_ip(value: str) -> bool:
    if not value:
        return False
    try:
        ipaddress.ip_address(value.strip())
        return True
    except ValueError:
        return False


def should_be_icmp_only(device: dict, resolved_tags: Optional[dict] = None) -> bool:
    """Device Class is no longer a guaranteed fixed field -- it only
    exists once someone creates a "Device Class" tag through the Tags
    module. So this checks the *resolved* tag value by name (falling
    back to nothing if that tag doesn't exist in this deployment), plus
    the still-hardcoded Config Type field, which remains a bare device
    field rather than a tag."""
    resolved_tags = resolved_tags or {}
    cls = (resolved_tags.get("Device Class") or "").strip().lower()
    cfg = (device.get("Config Type") or "").strip().lower()
    return cls == "storage" or cfg in ("icmp", "snmp trap")


def has_full_creds(device: dict) -> bool:
    return all([
        device.get("snmpUser"), device.get("authProtocol"), device.get("authKey"),
        device.get("privProtocol"), device.get("privKey"),
    ])


def parse_bw_to_bps(value: str) -> Optional[int]:
    """Parse strings like '1 Gbps', '500 Mbps', '100kbps' into bits/sec."""
    if not value:
        return None
    m = re.match(r"^\s*([\d.]+)\s*([a-zA-Z]+)\s*$", value)
    if not m:
        return None
    num = float(m.group(1))
    unit = m.group(2).lower()
    multipliers = {
        "bps": 1, "kbps": 1_000, "mbps": 1_000_000, "gbps": 1_000_000_000,
        "kb": 1_000, "mb": 1_000_000, "gb": 1_000_000_000,
    }
    mult = multipliers.get(unit)
    if mult is None:
        return None
    return int(num * mult)


def resolve_tags_for_record(record: dict, tag_defs: list, subnet_match: Optional[dict] = None) -> dict:
    """Returns {tagName: value} for all non-empty tags on this record,
    after filling in any empty tag from a matching subnet's value (only
    for tags whose scope includes 'subnets' AND the record's own scope --
    i.e. subnet inheritance only fills gaps, never overrides an explicit
    value the record already has)."""
    own_tags = record.get("tags") or {}
    resolved = {}
    for td in tag_defs:
        tag_id = td["id"]
        value = own_tags.get(tag_id)
        if not value and subnet_match and "subnets" in td.get("scopes", []):
            value = (subnet_match.get("tags") or {}).get(tag_id)
        if value:
            resolved[td["name"]] = value
    return resolved
