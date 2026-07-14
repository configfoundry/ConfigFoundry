"""
Prometheus Platform Adapter -- registered as "coming soon". No mapper,
model, or renderer exist yet; this class exists only so the platform shows
up in GET /platforms with a disabled card. Building the real integration
means adding mapper.py/models.py/renderer.py alongside this file and
overriding generate() -- no changes anywhere else (ADR-0008).
"""
from core.platforms.base import PlatformAdapter, PlatformInfo


class PrometheusAdapter(PlatformAdapter):
    id = "prometheus"
    name = "Prometheus"
    version = "0.0"
    status = "coming_soon"

    def info(self) -> PlatformInfo:
        return PlatformInfo(
            id=self.id,
            name=self.name,
            description="Generate Prometheus monitoring configuration",
            status=self.status,
            icon="prometheus",
        )
