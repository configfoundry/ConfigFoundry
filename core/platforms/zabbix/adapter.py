"""
Zabbix Platform Adapter -- registered as "coming soon". See
core/platforms/prometheus/adapter.py for the same note; Zabbix's real
implementation will likely need an XML or JSON renderer
(core/platforms/rendering/) rather than the shared YAML one, since Zabbix
templates are typically XML/JSON -- that's exactly the kind of difference
the mapper/renderer split exists to isolate.
"""
from core.platforms.base import PlatformAdapter, PlatformInfo


class ZabbixAdapter(PlatformAdapter):
    id = "zabbix"
    name = "Zabbix"
    version = "0.0"
    status = "coming_soon"

    def info(self) -> PlatformInfo:
        return PlatformInfo(
            id=self.id,
            name=self.name,
            description="Generate Zabbix monitoring configuration",
            status=self.status,
            icon="zabbix",
        )
