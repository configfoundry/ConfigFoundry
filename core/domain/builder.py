"""
Builds a ``MonitoringConfiguration`` from raw inventory rows.

This absorbs the vendor-neutral half of the retired
``core/logic.py::convert_to_collector_configs`` -- grouping by region,
subnet matching, tag resolution, ICMP-vs-polled classification, and
credential-completeness checks. What it deliberately does NOT do is shape
any of this into a specific platform's output format (no "instances", no
"init_config", no Datadog field names) -- that's a Platform Adapter's job,
starting from the object this function returns. See ADR-0008.
"""
import ipaddress
from types import MappingProxyType
from typing import Optional

from core.domain.helpers import (
    normalize_group_key,
    is_valid_ip,
    should_be_icmp_only,
    has_full_creds,
    parse_bw_to_bps,
    resolve_tags_for_record,
)
from core.domain.models import (
    Credentials,
    Device,
    GroupStats,
    InterfaceBandwidth,
    MonitoringConfiguration,
    ValidationSummary,
)
from core.interface_matching import registry as interface_match_registry
from core.validator import validate_inventory


def build_monitoring_configuration(
    devices: list,
    bandwidth_rows: list,
    subnets: Optional[list] = None,
    tag_defs: Optional[list] = None,
) -> MonitoringConfiguration:
    subnets = subnets or []
    tag_defs = tag_defs or []

    # Index bandwidth rows by IP for O(1) lookup per device.
    bw_by_ip: dict = {}
    for b in bandwidth_rows:
        ip = (b.get("IP") or "").strip()
        if ip:
            bw_by_ip.setdefault(ip, []).append(b)

    device_ips = set()
    groups: dict = {}            # group_key -> {"region": display name, "devices": [Device, ...]}
    group_stats: dict = {}       # group_key -> mutable counters, frozen into GroupStats at the end
    skipped_devices = 0
    invalid_ip_devices = []
    missing_region_devices = []
    missing_creds_devices = []
    used_bw_ips = set()

    for device in devices:
        ip = (device.get("IP") or "").strip()
        if not ip:
            skipped_devices += 1
            continue
        if not is_valid_ip(ip):
            invalid_ip_devices.append({"ip": ip, "device": device.get("Device", "")})
            continue
        device_ips.add(ip)

        region = (device.get("Collector Region") or "").strip()
        if not region:
            missing_region_devices.append({"ip": ip, "device": device.get("Device", "")})
            continue

        group_key = normalize_group_key(region)
        groups.setdefault(group_key, {"region": region, "devices": []})
        gs = group_stats.setdefault(group_key, {
            "snmp_count": 0, "icmp_only_count": 0, "missing_creds_count": 0,
            "bw_devices": 0, "bw_interfaces": 0,
        })

        subnet_match = None
        for s in subnets:
            cidr = (s.get("CIDR") or "").strip()
            if not cidr:
                continue
            try:
                net = ipaddress.ip_network(cidr, strict=False)
                if ipaddress.ip_address(ip) in net:
                    if subnet_match is None or net.prefixlen > ipaddress.ip_network(subnet_match["CIDR"], strict=False).prefixlen:
                        subnet_match = s
            except ValueError:
                continue

        resolved_tags = resolve_tags_for_record(device, tag_defs, subnet_match)
        forced_icmp = should_be_icmp_only(device, resolved_tags)
        full_creds = has_full_creds(device)
        device_vendor = (device.get("Device Vendor") or "").strip()
        # Resolved once per device -- this is the single call site for the
        # Interface Match Strategy registry. Every bandwidth row for this
        # device reuses the same strategy instance below. resolve() takes
        # the complete raw device record (not just the vendor string) so
        # future routing on other fields (platform, model, OS, firmware)
        # can be added inside the registry without touching this call site.
        match_strategy = interface_match_registry.resolve(device)

        credentials = None
        if forced_icmp:
            gs["icmp_only_count"] += 1
        else:
            credentials = Credentials(
                snmp_user=device.get("snmpUser", ""),
                auth_protocol=device.get("authProtocol", ""),
                auth_key=device.get("authKey", ""),
                priv_protocol=device.get("privProtocol", ""),
                priv_key=device.get("privKey", ""),
            )
            gs["snmp_count"] += 1
            if not full_creds:
                gs["missing_creds_count"] += 1
                missing_creds_devices.append({"ip": ip, "device": device.get("Device", ""), "region": region})

        interfaces = []
        bw_rows_for_ip = bw_by_ip.get(ip, [])
        if bw_rows_for_ip:
            used_bw_ips.add(ip)
            gs["bw_devices"] += 1
            for b in bw_rows_for_ip:
                gs["bw_interfaces"] += 1
                identifier = match_strategy.resolve(b.get("Interface", ""))
                interfaces.append(InterfaceBandwidth(
                    identifier=identifier,
                    capacity_bps=parse_bw_to_bps(b.get("Allocated BW", "")),
                    description=b.get("Interface_description", ""),
                    region=(b.get("Region") or "").strip() or None,
                    center=(b.get("Center") or "").strip() or None,
                    link_type=(b.get("Link Type") or "").strip() or None,
                ))

        groups[group_key]["devices"].append(Device(
            ip=ip,
            name=device.get("Device", ""),
            region=region,
            group_key=group_key,
            monitoring_mode="icmp_only" if forced_icmp else "polled",
            credentials=credentials,
            has_full_credentials=full_creds if not forced_icmp else True,
            subnet=subnet_match.get("CIDR", "") if subnet_match else None,
            tags=MappingProxyType(resolved_tags),
            interfaces=tuple(interfaces),
            raw_config_type=(device.get("Config Type") or "").strip(),
            device_vendor=device_vendor,
        ))

    orphaned_bw_ips = tuple(sorted({ip for ip in bw_by_ip if ip not in device_ips}))

    devices_by_group = MappingProxyType({
        gk: tuple(gd["devices"]) for gk, gd in groups.items()
    })
    group_regions = MappingProxyType({
        gk: gd["region"] for gk, gd in groups.items()
    })
    stats = MappingProxyType({
        gk: GroupStats(**counters) for gk, counters in group_stats.items()
    })

    findings = tuple(validate_inventory(devices, bandwidth_rows, subnets, tag_defs))
    validation = ValidationSummary(
        findings=findings,
        error_count=sum(1 for f in findings if f.get("severity") == "error"),
        warning_count=sum(1 for f in findings if f.get("severity") == "warning"),
    )

    return MonitoringConfiguration(
        devices=devices_by_group,
        group_regions=group_regions,
        stats=stats,
        validation=validation,
        skipped_devices=skipped_devices,
        invalid_ip_devices=tuple(invalid_ip_devices),
        missing_region_devices=tuple(missing_region_devices),
        missing_creds_devices=tuple(missing_creds_devices),
        orphaned_bandwidth_ips=orphaned_bw_ips,
    )
