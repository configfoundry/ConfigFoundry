"""
Datadog Platform Adapter -- the first, and currently only fully-implemented,
monitoring platform integration.
"""
from core.domain.models import MonitoringConfiguration
from core.platforms.base import GenerateResult, PlatformAdapter, PlatformInfo
from core.platforms.datadog.mapper import map_to_platform_model
from core.platforms.datadog.renderer import render


class DatadogAdapter(PlatformAdapter):
    id = "datadog"
    name = "Datadog"
    version = "1.0"
    status = "supported"

    def info(self) -> PlatformInfo:
        return PlatformInfo(
            id=self.id,
            name=self.name,
            description="Generate Datadog monitoring configuration",
            status=self.status,
            version=self.version,
            icon="datadog",
            supports_generation=True,
            supports_deployment=False,
            supports_validation=False,
            supports_verification=False,
        )

    def generate(self, config: MonitoringConfiguration) -> GenerateResult:
        platform_model = map_to_platform_model(config)
        files = render(platform_model)
        summary = (
            f"{len(config.devices)} region(s), "
            f"{config.snmp_total} SNMP / {config.icmp_total} ICMP devices"
        )
        return GenerateResult(files=files, summary=summary)
