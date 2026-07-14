"""
Generate service — orchestrates monitoring configuration generation.

Pulls all inventory data from repositories, builds the canonical
``MonitoringConfiguration`` (vendor-neutral), hands it to the requested
Platform Adapter, persists a history snapshot, and writes an audit entry.
Returns the full result dict that the HTTP route encodes as JSON.

Architecture note (ADR-0008): this service no longer knows anything about
Datadog specifically. ``platform_id`` selects which Platform Adapter runs;
adding a new platform never requires a change here.
"""
from dataclasses import asdict
from typing import Optional

from core.domain.builder import build_monitoring_configuration
from core.platforms import registry as platform_registry
from core.platforms.base import CapabilityResult
from core.repositories.interfaces import (
    IDeviceRepository,
    IBandwidthRepository,
    ISubnetRepository,
    ITagRepository,
    IHistoryRepository,
    IMetaRepository,
    IAuditRepository,
)
from core.repositories.sqlite.base import now_iso


class GenerateService:
    """Orchestrates the full generate-and-save workflow."""

    def __init__(
        self,
        device_repo: IDeviceRepository,
        bandwidth_repo: IBandwidthRepository,
        subnet_repo: ISubnetRepository,
        tag_repo: ITagRepository,
        history_repo: IHistoryRepository,
        meta_repo: IMetaRepository,
        audit_repo: IAuditRepository,
    ) -> None:
        self._device_repo = device_repo
        self._bandwidth_repo = bandwidth_repo
        self._subnet_repo = subnet_repo
        self._tag_repo = tag_repo
        self._history_repo = history_repo
        self._meta_repo = meta_repo
        self._audit_repo = audit_repo

    def generate(self, actor: Optional[str], platform_id: str = "datadog") -> dict:
        """Run config generation for one Platform Adapter and return the
        result dict.

        Steps
        -----
        1. Load all inventory from repositories (one DB read per collection).
        2. Build the canonical MonitoringConfiguration (vendor-neutral;
           this is also where validate_inventory() runs).
        3. Hand it to the requested Platform Adapter's generate().
        4. Persist the history snapshot and update meta timestamps.
        5. Write an audit entry.
        6. Return the result to the caller.
        """
        devices = self._device_repo.list_all()
        bandwidth = self._bandwidth_repo.list_all()
        subnets = self._subnet_repo.list_all()
        tag_defs = self._tag_repo.list_all()

        config = build_monitoring_configuration(devices, bandwidth, subnets, tag_defs)

        adapter = platform_registry.get_platform(platform_id)
        if adapter is None:
            raise ValueError(f"Unknown platform: {platform_id}")

        gen_result = adapter.generate(config)
        if isinstance(gen_result, CapabilityResult):
            raise ValueError(f"Platform '{platform_id}' does not support generation yet")

        result = {
            "files": gen_result.files,
            "groupStats": {gk: asdict(gs) for gk, gs in config.stats.items()},
            "skippedDevices": config.skipped_devices,
            "invalidIpDevices": list(config.invalid_ip_devices),
            "missingRegionDevices": list(config.missing_region_devices),
            "missingCredsDevices": list(config.missing_creds_devices),
            "orphanedBwIps": list(config.orphaned_bandwidth_ips),
            "totalBwInterfaces": config.total_bw_interfaces,
            "snmpTotal": config.snmp_total,
            "icmpTotal": config.icmp_total,
            "summary": gen_result.summary,
            "findings": list(config.validation.findings),
        }

        # Persist the history snapshot.
        self._history_repo.save(actor, result["summary"], gen_result.files)

        # Update the meta timestamps that the dashboard displays.
        ts = now_iso()
        self._meta_repo.set_kv("lastSavedAt", ts)
        self._meta_repo.set_kv("lastSavedBy", actor or "unknown")

        self._audit_repo.log(actor, "generate", {"summary": result["summary"], "platform": platform_id})

        return result
