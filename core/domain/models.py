"""
Canonical domain model -- ``MonitoringConfiguration`` and its parts.

This replaces the earlier "CanonicalInventory" naming: the root object
represents the *complete* monitoring configuration, not just a device list.
It is the single object every Platform Adapter reads from (see
``core/platforms/base.py``). Per ADR-0008, it must never contain
vendor-specific (monitoring-platform-specific) concepts -- e.g. no
"Datadog instance", no "init_config" -- and Platform Adapters must never
mutate it. All dataclasses here are frozen; ``devices``/``variables``/
``metadata`` are exposed as read-only mappings (``MappingProxyType``) and
list-like fields are tuples, so accidental mutation from within a Platform
Adapter fails loudly instead of silently corrupting shared state.

If a platform needs additional calculated fields beyond what's here, those
belong on its own Platform Model (e.g. ``core/platforms/datadog/models.py``),
never bolted onto this object.
"""
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Mapping, Optional

from core.interface_matching.base import InterfaceIdentifier


@dataclass(frozen=True)
class Credentials:
    """SNMPv3 credentials. SNMP is a protocol, not a monitoring platform,
    so this is vendor-neutral -- every Platform Adapter that polls via
    SNMP (Datadog, Prometheus's snmp_exporter, Zabbix) consumes the same
    shape."""
    snmp_user: str
    auth_protocol: str
    auth_key: str
    priv_protocol: str
    priv_key: str


@dataclass(frozen=True)
class InterfaceBandwidth:
    # How this interface is identified for polling (IF_INDEX/IF_NAME +
    # value), resolved exactly once by core/domain/builder.py via the
    # Interface Match Strategy registry (core/interface_matching/), based
    # on the owning Device's device_vendor. This replaces the earlier
    # match_field/match_value fields: those were Datadog's own vocabulary
    # ("index"/"name") baked into the canonical model, which stopped being
    # accurate once interface matching became vendor-aware and shared
    # across Platform Adapters. IF_INDEX/IF_NAME are standard SNMP MIB-II
    # (RFC 1213 ifTable) terms, not any one platform's schema, so storing
    # an InterfaceIdentifier here (defined in core/interface_matching/,
    # imported above) does not reintroduce a vendor-specific concept --
    # see that module's docstring. Platform Adapters only ever translate
    # this into their own field names (e.g. Datadog's match_field/
    # match_value); they never resolve it themselves.
    identifier: InterfaceIdentifier
    capacity_bps: Optional[int]
    description: str
    # Added for Datadog schema conformance (a Platform Adapter concern),
    # but these three are plain, vendor-neutral facts about the interface
    # itself (which region/center/link-type a bandwidth allocation belongs
    # to) -- not Datadog terminology -- so they live here rather than in
    # a Datadog-only side-channel. Sourced verbatim from BandwidthRow's
    # existing Region/Center/Link Type fields, which were already being
    # read but previously discarded. Optional/backward-compatible: every
    # existing call site that doesn't pass these still works unchanged.
    region: Optional[str] = None
    center: Optional[str] = None
    link_type: Optional[str] = None


@dataclass(frozen=True)
class Device:
    ip: str
    name: str
    region: str                   # display name, e.g. "US East"
    group_key: str                # normalized, e.g. "us_east"
    monitoring_mode: str          # "icmp_only" | "polled"
    credentials: Optional[Credentials]
    has_full_credentials: bool
    subnet: Optional[str]
    tags: Mapping[str, str]
    interfaces: tuple            # tuple[InterfaceBandwidth, ...]
    # Verbatim inventory "Config Type" value (e.g. "ICMP", "SNMP Trap", "").
    # should_be_icmp_only() already reads this raw field to compute
    # monitoring_mode above, but previously discarded the string itself.
    # Preserved here, unreduced, for Platform Adapters that need the
    # original value rather than just the collapsed icmp/polled split --
    # same rationale as InterfaceBandwidth's region/center/link_type above.
    raw_config_type: str = ""
    # Verbatim inventory "Device Vendor" value (e.g. "Cisco", "Arista EOS",
    # ""). Read by core/domain/builder.py to pick an Interface Match
    # Strategy for this device's bandwidth rows; preserved here too so
    # Platform Adapters can use it for their own purposes if ever needed,
    # though none currently do (interface matching is fully resolved by
    # the time a Platform Adapter sees this object).
    device_vendor: str = ""


@dataclass(frozen=True)
class GroupStats:
    snmp_count: int
    icmp_only_count: int
    missing_creds_count: int
    bw_devices: int
    bw_interfaces: int


@dataclass(frozen=True)
class ValidationSummary:
    """Wraps core/validator.py's output. validate_inventory() itself stays
    a separate, already-vendor-neutral engine -- this is just where its
    result is attached onto the canonical object so every consumer (API
    route, every Platform Adapter) reads findings from one place."""
    findings: tuple               # tuple[dict, ...] -- validator.py's Finding shape, unchanged
    error_count: int
    warning_count: int


@dataclass(frozen=True)
class MonitoringConfiguration:
    """Canonical, immutable source of truth for a generation run.

    Devices are grouped by ``group_key`` (normalized Collector Region)
    because every current and foreseeable platform wants one output unit
    per region -- this is an inventory/topology concept, not a platform
    one. ``skipped_devices`` / ``invalid_ip_devices`` / etc. are inventory
    quality facts that hold regardless of which platform is later chosen,
    so they're computed once here rather than recomputed per adapter.

    Fields marked (reserved) are extension points intentionally left
    unpopulated in this release -- see class docstring, ADR-0008 point 3.
    """
    devices: Mapping[str, tuple]              # group_key -> tuple[Device, ...]
    group_regions: Mapping[str, str]           # group_key -> display region name
    stats: Mapping[str, GroupStats]            # group_key -> GroupStats
    validation: ValidationSummary
    skipped_devices: int
    invalid_ip_devices: tuple                  # tuple[dict, ...] {"ip", "device"}
    missing_region_devices: tuple              # tuple[dict, ...] {"ip", "device"}
    missing_creds_devices: tuple                # tuple[dict, ...] {"ip", "device", "region"}
    orphaned_bandwidth_ips: tuple               # tuple[str, ...]

    # Reserved extension points -- Templates module has no backend yet;
    # Variables/Profiles have no UI yet. Declared now so the object's
    # shape doesn't have to break again when those land.
    templates: tuple = field(default_factory=tuple)
    variables: Mapping = field(default_factory=lambda: MappingProxyType({}))
    profiles: tuple = field(default_factory=tuple)
    metadata: Mapping = field(default_factory=lambda: MappingProxyType({}))

    # ------------------------------------------------------------------
    # Derived, read-only convenience totals -- computed from stats rather
    # than stored twice.
    # ------------------------------------------------------------------
    @property
    def snmp_total(self) -> int:
        return sum(g.snmp_count for g in self.stats.values())

    @property
    def icmp_total(self) -> int:
        return sum(g.icmp_only_count for g in self.stats.values())

    @property
    def total_bw_interfaces(self) -> int:
        return sum(g.bw_interfaces for g in self.stats.values())
