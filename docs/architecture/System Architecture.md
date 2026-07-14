# System Architecture

Parent: [Architecture Overview](Architecture Overview.md)

```mermaid
flowchart TD
    subgraph Client
        Browser["Browser<br/>Next.js static export"]
    end

    subgraph ConfigFoundry["ConfigFoundry process (single FastAPI app)"]
        MW["Middleware chain<br/>TrustedProxy -> AccessPolicy -> RateLimit -> SecurityHeaders -> CORS -> CorrelationID -> RequestLogging"]
        Routes["api/v1/* routers<br/>auth, users, roles, api-keys, policies,<br/>devices, bandwidth, subnets, tags, lists,<br/>generate, history, export, audit, meta"]
        Business["Business services<br/>core/services/*"]
        SecuritySvc["Security services<br/>auth, rbac, mfa, api_key, policy_engine"]
        Repo["Repository layer<br/>core/repositories/sqlalchemy/*"]
    end

    subgraph Storage
        Provider["StorageProvider (ABC)"]
        SQLite[("SQLite — default, fully implemented")]
        PG[("PostgreSQL — scaffold")]
        MySQL[("MySQL — scaffold")]
        MSSQL[("SQL Server — scaffold")]
    end

    Browser -->|HTTPS| MW --> Routes
    Routes --> Business
    Routes --> SecuritySvc
    Business --> Repo
    SecuritySvc --> Repo
    Repo --> Provider
    Provider --> SQLite
    Provider -.-> PG
    Provider -.-> MySQL
    Provider -.-> MSSQL
```

See [Database Overview](Database Overview.md) for the storage provider detail and [Security Overview](../security/Security Overview.md) for the security services.
