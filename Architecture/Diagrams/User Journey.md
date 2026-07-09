# User Journey

Parent: [[Architecture Overview]] · [[Product/Target Users & Use Cases|Target Users & Use Cases]]

## First run (operator bootstrapping an instance)

```mermaid
flowchart TD
    A["Clone/install ConfigFoundry"] --> B["python3 server.py"]
    B --> C["SQLite DB created, migrations run,<br/>Super Admin bootstrapped"]
    C --> D["Bootstrap credentials printed once to console"]
    D --> E["Open http://localhost:8420/, log in"]
    E --> F["Forced password change"]
    F --> G["Admin -> Users/Roles/API Keys/IP Policies:<br/>set up team access"]
    G --> H["Inventory: add/import devices, bandwidth caps, subnets"]
    H --> I["Manage Tags/Lists: define custom classification"]
    I --> J["Generate YAML: produce collector config per region"]
    J --> K["Hand config to monitoring/collector system"]
```

## Day-to-day operator flow

```mermaid
flowchart LR
    Login["Log in (JWT + optional MFA)"] --> Dash["Dashboard: totals, breakdowns, recent activity"]
    Dash --> Inv["Inventory: search/sort/filter devices, bandwidth, subnets"]
    Inv --> Edit["Add/edit/delete a record, or Excel import"]
    Edit --> Gen["Generate YAML for the affected Collector Region"]
    Gen --> Hist["History: review what was generated and by whom"]
    Dash --> Audit["Audit: investigate 'who changed this'"]
```

See [[Product/Target Users & Use Cases|Target Users & Use Cases]] for the personas behind this journey and [[Features/Feature - Dashboard|Feature - Dashboard]] / [[Features/Feature - Inventory Management|Feature - Inventory Management]] for the underlying features.
