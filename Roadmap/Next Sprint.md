# Next Sprint — v0.6.0

Parent: [[Roadmap Overview]]

## Datadog integration (business-logic)

An export/forwarder pushing generated collector config directly to the Datadog API — kept strictly optional per [[Architecture Overview#Principles|the architecture principles]] (core never depends on an integration, only the reverse). Distinct from the APM instrumentation already shipped — see [[Integrations Documentation/Datadog APM|Datadog APM]].

## Configuration validation (Inventory Validation Engine)

Stronger cross-field validation at import/edit time — e.g. detecting a device referencing a subnet that doesn't exist, or a bandwidth cap on a device with no matching interface — beyond today's per-field format checks. See [[Features/Feature - Dynamic Tags#Known limitations|Feature - Dynamic Tags § Known limitations]] for the related "no tag-level validation yet" gap.

## Inventory improvements

An Inventory Health Dashboard (stale entries, validation warnings, coverage gaps at a glance); duplicate detection at import time (same IP, similar hostname); device templates for common device types; YAML diff/change review between two generations (`history` already records *that* a generation happened; this adds *what changed*).

## MIB management

Import and browse vendor MIB files so SNMP OIDs resolve to human-readable names in the UI instead of raw numeric OIDs.

## Operational observability

A `/health`/`/ready` endpoint pair and a Prometheus-compatible `/metrics` endpoint, replacing the current `/openapi.json`-as-liveness-check workaround. See [[Operations/Runbook - Monitoring & Health Checks|Runbook - Monitoring & Health Checks]].

## See also

[[Roadmap Overview]] · [[Roadmap/Current Sprint|Current Sprint]] · [[Roadmap/v2 - Enterprise|v2 - Enterprise]]
