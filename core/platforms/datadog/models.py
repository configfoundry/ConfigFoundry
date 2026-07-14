"""
Datadog Platform Model -- the intermediate representation between the
canonical ``MonitoringConfiguration`` and rendered output. Lives entirely
inside this package; nothing outside ``core/platforms/datadog/`` should
import it. Field names here (``init_config``, ``instances``, ``snmpUser``,
...) are Datadog SNMP-check config concepts and have no business existing
on the canonical model.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class DatadogPlatformModel:
    files: dict   # filename ("region.yaml") -> {"init_config": {}, "instances": [...]}
