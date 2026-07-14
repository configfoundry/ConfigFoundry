"""
Shared renderers -- turn a Platform Model's per-file config dicts into
output text. Kept separate from ``formats/yamldump.py`` (which stays a
general-purpose, dependency-free serializer also used by Excel export)
and separate from any one platform's mapper, so a future platform whose
output format differs (Zabbix templates are typically XML/JSON, not YAML)
can add its own renderer here without touching the YAML one or any
mapper. See ADR-0008, "Rendering" section.
"""
