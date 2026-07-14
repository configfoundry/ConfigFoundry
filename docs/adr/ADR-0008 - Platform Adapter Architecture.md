# ADR-0008: Platform Adapter Architecture

Parent: [ADR Index](ADR Index.md) · [Architecture Overview](../architecture/Architecture Overview.md#monitoring-platform-architecture)

## Context

ConfigFoundry's inventory model, validation engine, and repository layer were already vendor-neutral, but the generation path was not: `core/logic.py::convert_to_collector_configs` walked the inventory *and* shaped the output into Datadog's specific config format (`init_config`/`instances`, `snmpUser`/`authProtocol`/..., `interface_configs`) in a single function, and `POST /api/v1/generate` had no concept of "which platform" — it only ever produced Datadog output. This made ConfigFoundry, in practice if not in name, a Datadog configuration generator with a generic-looking inventory bolted on. Adding a second monitoring platform (Prometheus, Zabbix, or anything else) would have meant either duplicating that function or threading conditionals through it — both violate the "Core never imports integrations" principle this codebase otherwise holds to everywhere else.

## Decision

ConfigFoundry is a vendor-neutral **Monitoring Configuration Platform**. Datadog is the first supported monitoring platform, not a privileged one. Generation now follows a fixed pipeline:

```
Inventory -> Validation -> MonitoringConfiguration -> Platform Adapter -> Platform Model -> Renderer -> Output
```

**`MonitoringConfiguration`** (`core/domain/models.py`) replaces the informal "canonical inventory" concept as the root object. It is immutable (frozen dataclasses, read-only mappings) and represents the complete monitoring configuration for a generation run — not just a device list: devices (with embedded credentials), validation results, plus reserved extension points (`templates`, `variables`, `profiles`, `metadata`) for capability that doesn't exist yet but shouldn't require another breaking model change to add later. It is built by `core/domain/builder.py::build_monitoring_configuration()`, which absorbs the vendor-neutral half of the old `convert_to_collector_configs` (grouping by region, subnet matching, tag resolution, ICMP-vs-polled classification, credential-completeness checks) and also runs `core/validator.py::validate_inventory()`, attaching its findings onto the object. Pure helper functions (`is_valid_ip`, `has_full_creds`, `should_be_icmp_only`, `parse_bw_to_bps`, `interface_match`, `resolve_tags_for_record`) moved to `core/domain/helpers.py`, unchanged, since both the builder and the validator depend on them. Note that "vendor" here means monitoring *platform*; `interface_match`'s Arista `Eth N` handling is about the monitored device's vendor and is legitimately shared by every Platform Adapter.

**`PlatformAdapter`** (`core/platforms/base.py`) replaces the earlier informal "Exporter" idea as the abstraction every monitoring platform implements — the word "Exporter" does not appear anywhere in user-facing UI copy or in the new abstraction's name. Each platform owns a self-contained package under `core/platforms/<platform>/` (`datadog/`, `prometheus/`, `zabbix/`) holding its adapter, mapper, platform model, and renderer; nothing outside that package may contain logic specific to that platform. Only `generate()` does real work this release. `validate()` / `deploy()` / `verify()` / `import_config()` / `rollback()` are part of the interface now — so the contract's shape doesn't change when a future release implements them — but default to returning a `CapabilityResult(implemented=False)` rather than raising or being absent. (Python reserves the builtin `NotImplemented` for operator overloading, not as a general sentinel, so `CapabilityResult` is the idiomatic equivalent here, matching `core/validator.py`'s own "plain data, no side effects" `Finding` pattern.)

**Mapping is separated from rendering.** A Platform Adapter first maps `MonitoringConfiguration` into its own Platform Model (`core/platforms/<platform>/models.py` — still structured data, still vendor-specific: Datadog's is literally the `{init_config, instances}` shape). A Renderer (`core/platforms/rendering/`, or a platform-owned one) then turns that into final output text. `core/platforms/datadog/renderer.py` delegates to a shared `render_yaml_files()` rather than owning YAML logic outright, since Prometheus's `snmp_exporter` config is also YAML — the shared renderer is deliberately not Datadog-owned. This split exists so a future deployment API, or an alternate output format for an existing platform, is a new renderer, not a change to mapping logic.

**Platform Registry** (`core/platforms/registry.py`) is the single wiring point — a list of adapter instances plus `list_platforms()` / `get_platform(id)`. `GET /api/v1/platforms` reads it directly:

```json
[
  { "id": "datadog", "name": "Datadog", "description": "...", "status": "supported", "version": "1.0", "icon": "datadog", "supportsGeneration": true, "supportsDeployment": false, "supportsValidation": false, "supportsVerification": false },
  { "id": "prometheus", "name": "Prometheus", "status": "coming_soon", "icon": "prometheus" },
  { "id": "zabbix", "name": "Zabbix", "status": "coming_soon", "icon": "zabbix" }
]
```

The frontend's Monitoring Platforms hub (`frontend/src/modules/platforms/PlatformsView.tsx`, mounted at `/configuration/generate`) renders one card per entry from this endpoint — nothing is hardcoded, so registering a platform is enough to make its card appear. Official brand logos (Datadog/Prometheus/Zabbix, from `@iconify-json/logos`) are bundled locally at build time (`frontend/scripts/generate-logos-icon-bundle.mjs` -> `src/iconify-bundle/logos-icons.json`), never fetched from a live CDN, consistent with [ADR-0003](ADR-0003 - Air-Gap-First Architecture.md). Selecting a `supported` platform navigates to that platform's workflow (Datadog's existing `GenerateView`, moved unchanged to `/configuration/generate/datadog`); `coming_soon` platforms render as visible, disabled cards.

**Core architectural principle:** adding a new monitoring platform must require only (1) a new Platform Adapter package and (2) one line registering it in the Platform Registry — never a change to `core/domain/`, `core/validator.py`, the API contract, or any other platform's package. If adding a platform ever requires touching existing code outside its own package, that is a signal this architecture needs reconsidering, not a one-off exception.

## Consequences

**Positive:** Prometheus and Zabbix can go from "coming soon" cards to real integrations by adding a package and a registry line, with zero risk to Datadog or to Inventory/Validation. `GET /api/v1/platforms` means the frontend never hardcodes a platform list. The mapping/rendering split means a future output format (e.g. Zabbix's typically XML/JSON templates) or a future deployment API doesn't touch existing mapping code. `MonitoringConfiguration`'s reserved fields (`templates`, `variables`, `profiles`, `metadata`) mean those modules can land later without another root-object migration.

**Negative:** one more layer of indirection between "load inventory" and "get YAML" than the old single-function version — reading the full path now means following `builder.py` -> `adapter.py` -> `mapper.py` -> `renderer.py` instead of one file. `MonitoringConfiguration`'s immutability is shallow (frozen dataclasses, `MappingProxyType` on top-level dict fields) rather than deep — nested `tags` dicts are not individually frozen — judged sufficient for this codebase's needs rather than importing a deep-freeze dependency.

## Backward compatibility

This refactor is architectural only; behavior is unchanged. `POST /api/v1/generate`'s body gained an optional `platform` field defaulting to `"datadog"`, so every existing caller that doesn't send it keeps working unchanged. The response shape (`files`, `groupStats`, `skippedDevices`, `invalidIpDevices`, `missingRegionDevices`, `missingCredsDevices`, `orphanedBwIps`, `totalBwInterfaces`, `snmpTotal`, `icmpTotal`, `summary`, `findings`) is identical. No database schema changed (`models/inventory.py`'s JSON-blob tables were already vendor-neutral). The `yaml_history` table and its contract are untouched, so History and the Diff Viewer need no changes. Datadog's rendered YAML output is byte-for-byte identical to the pre-refactor implementation — proven by `tests/platforms/test_datadog_regression.py`, a characterization test built from output captured against the retired `core/logic.py::convert_to_collector_configs` before it was removed.

## Alternatives considered

Keeping "Exporter" as the abstraction's name (as first proposed) was rejected in favor of "Platform Adapter" — "Exporter" reads as a Prometheus-specific term (`*_exporter` binaries) and would have been one more vocabulary inconsistency in an API that also talks about "generation." Naming the canonical root object `CanonicalInventory` was rejected in favor of `MonitoringConfiguration` since inventory is only one part of what the object represents (it also carries validation results and reserved room for credentials/templates/variables/profiles). Renaming the sidebar's "Infrastructure" group to "Inventory" and merging "Generated Files"/"Export History" into a single "History" entry were both considered as part of the same pass but deferred — the Generate leaf rename was in scope for this release; the broader navigation IA change was not.

## See also

[Architecture Overview](../architecture/Architecture Overview.md#monitoring-platform-architecture) · [ADR-0003](ADR-0003 - Air-Gap-First Architecture.md) · [Feature - YAML Config Generation](../reference/features/Feature - YAML Config Generation.md)
