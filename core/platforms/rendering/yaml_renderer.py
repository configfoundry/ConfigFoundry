"""
YAML rendering -- thin wrapper over formats/yamldump.py.

Any Platform Adapter whose Platform Model is a set of named config dicts
that should each become a YAML file can use this directly (today: only
Datadog, but Prometheus's snmp_exporter config is also YAML, so this is
already written to be shared rather than Datadog-owned).
"""
from formats import yamldump


def render_yaml_files(files: dict) -> dict:
    """``{filename: config_dict}`` -> ``{filename: yaml_text}``."""
    return {name: yamldump.dump(config) for name, config in files.items()}
