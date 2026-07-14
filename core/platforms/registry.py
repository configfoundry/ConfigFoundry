"""
Platform Registry -- the single place where Platform Adapters are wired up.

Adding a new platform means adding one import + one line to
``_ADAPTERS`` below. Nothing else in this file, or anywhere in
``core/domain/`` or ``api/``, needs to change (ADR-0008).
"""
from typing import Optional

from core.platforms.base import PlatformAdapter, PlatformInfo
from core.platforms.datadog.adapter import DatadogAdapter
from core.platforms.prometheus.adapter import PrometheusAdapter
from core.platforms.zabbix.adapter import ZabbixAdapter

# Ordered so the frontend's card grid has a stable, deliberate order
# (supported platforms first) without needing its own sort logic.
_ADAPTERS: "list[PlatformAdapter]" = [
    DatadogAdapter(),
    PrometheusAdapter(),
    ZabbixAdapter(),
]

_BY_ID: "dict[str, PlatformAdapter]" = {a.id: a for a in _ADAPTERS}


def list_platforms() -> "list[PlatformInfo]":
    return [a.info() for a in _ADAPTERS]


def get_platform(platform_id: str) -> Optional[PlatformAdapter]:
    return _BY_ID.get(platform_id)
