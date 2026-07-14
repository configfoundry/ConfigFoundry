# Data Flow

Parent: [Architecture Overview](Architecture Overview.md)

## Inventory write path

```mermaid
flowchart LR
    User["User (browser)"] -->|"POST /api/v1/devices"| Route["devices.py route"]
    Route -->|"validated DeviceIn schema"| Svc["DeviceService"]
    Svc -->|"business validation<br/>(IP/CIDR format, required fields)"| Svc
    Svc --> Repo["SQLAlchemyDeviceRepository"]
    Repo -->|"INSERT/UPDATE"| DB[("devices table<br/>id / data(JSON) / updated_at")]
    Svc -.->|"audit entry"| Audit[("audit_log")]
    Svc -->|"DeviceOut schema"| Route --> User
```

## Config generation path

Vendor-neutral through `MonitoringConfiguration`; only the last two steps are platform-specific (ADR-0008):

```mermaid
flowchart LR
    User["User"] -->|"POST /api/v1/generate<br/>{_actor, platform}"| Route["generate.py"]
    Route --> Svc["GenerateService"]
    Svc -->|reads| Devices[("devices")]
    Svc -->|reads| Bandwidth[("bandwidth_caps")]
    Svc -->|reads| Subnets[("subnets")]
    Svc -->|reads| Tags[("tag_defs")]
    Svc -->|"applies subnet-based tag inheritance,<br/>runs validate_inventory()"| Builder["core/domain/builder.py:<br/>build_monitoring_configuration"]
    Builder --> Canonical["MonitoringConfiguration<br/>(vendor-neutral, immutable)"]
    Canonical -->|"registry.get_platform(platform_id)"| Adapter["Platform Adapter<br/>e.g. DatadogAdapter.generate()"]
    Adapter -->|"map_to_platform_model()"| Model["Platform Model"]
    Model -->|"render()"| YAML["Renderer (formats/yamldump.py)"]
    YAML --> Response["Output (response body)"]
    Svc -->|"records"| History[("yaml_history table")]
    Response --> User
```

`POST /api/v1/generate` never writes the generated output to disk — it returns it in the response and records that a generation happened (with actor, timestamp, and platform id) in `history`, so config drift stays reviewable via `GET /api/v1/history`. `GET /api/v1/platforms` reads the Platform Registry directly (no request body, no DB read) to list available platforms for the frontend's Monitoring Platforms hub. See [Feature - YAML Config Generation](../reference/features/Feature - YAML Config Generation.md) and [ADR-0008](../adr/ADR-0008 - Platform Adapter Architecture.md).

## Excel import path

```mermaid
flowchart LR
    User["User"] -->|"upload .xlsx"| Validate["POST /devices/validate-import<br/>dry-run, no writes"]
    Validate -->|"per-row errors"| User
    User -->|"confirms"| Import["POST /devices/import<br/>merge or replace mode"]
    Import --> Svc["ImportService"]
    Svc -->|"skips invalid rows,<br/>reports count"| Repo["Device/Bandwidth/Subnet repository"]
    Repo --> DB[("inventory tables")]
```
