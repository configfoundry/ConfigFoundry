# Component Relationships

Parent: [Architecture Overview](Architecture Overview.md)

```mermaid
flowchart TB
    subgraph API["api/v1/ (routers)"]
        direction LR
        A1[auth.py] --- A2[users.py] --- A3[roles.py] --- A4[api_keys.py] --- A5[policies.py]
        A6[devices.py] --- A7[bandwidth.py] --- A8[subnets.py] --- A9[tags.py] --- A10[lists.py]
        A11[generate.py] --- A12[history.py] --- A13[export.py] --- A14[audit.py] --- A15[meta.py] --- A16[platforms.py]
    end

    subgraph Services["core/services/"]
        direction LR
        S1[auth_service] --- S2[rbac_service] --- S3[mfa_service] --- S4[api_key_service] --- S5[policy_service / policy_engine]
        S6[device_service] --- S7[bandwidth_service] --- S8[subnet_service] --- S9[tag_service] --- S10[list_service]
        S11[generate_service] --- S12[history_service] --- S13[export_service] --- S14[audit_service] --- S15[meta_service]
        S16[user_service] --- S17[role_service] --- S18[organization_service] --- S19[import_service]
    end

    subgraph Repos["core/repositories/sqlalchemy/"]
        direction LR
        R1[user] --- R2[role] --- R3[permission] --- R4[api_key] --- R5[network_acl] --- R6[refresh_token] --- R7[mfa_backup_code] --- R8[organization]
        R9[device] --- R10[bandwidth] --- R11[subnet] --- R12[tag] --- R13[list] --- R14[history] --- R15[audit] --- R16[meta]
    end

    API --> Services --> Repos
    Repos --> Storage[("StorageProvider")]

    Models["models/auth.py, models/inventory.py<br/>(SQLAlchemy ORM)"] -.defines schema for.-> Repos
    Schemas["schemas/auth.py, schemas/common.py<br/>(Pydantic)"] -.validates I/O for.-> API
```

Core dependency rule (see [Architecture Overview](Architecture Overview.md#principles)): `api/` depends on `core/`; `core/` never depends on `api/`, `integrations/`, or `frontend/`. See [Backend Overview](Backend Overview.md) for what lives in each `core/` subpackage.
