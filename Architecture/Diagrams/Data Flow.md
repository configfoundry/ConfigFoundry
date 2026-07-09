# Data Flow

Parent: [[Architecture Overview]]

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

```mermaid
flowchart LR
    User["User"] -->|"POST /api/v1/generate"| Route["generate.py"]
    Route --> Svc["GenerateService"]
    Svc -->|reads| Devices[("devices")]
    Svc -->|reads| Bandwidth[("bandwidth_caps")]
    Svc -->|reads| Subnets[("subnets")]
    Svc -->|reads| Tags[("tag_defs")]
    Svc -->|"applies subnet-based tag inheritance"| Logic["core/logic.py:<br/>convert_to_collector_configs"]
    Logic -->|"per Collector Region"| YAML["formats/yamldump.py"]
    YAML --> Response["YAML config (response body)"]
    Svc -->|"records"| History[("yaml_history table")]
    Response --> User
```

`POST /api/v1/generate` never writes the generated YAML to disk — it returns it in the response and records that a generation happened (with actor and timestamp) in `history`, so config drift stays reviewable via `GET /api/v1/history`. See [[Features/Feature - YAML Config Generation|Feature - YAML Config Generation]].

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
