# Target Users & Use Cases

Parent: [Product Vision](Product Vision.md)

## Primary personas

| Persona | Needs | Primary features |
|---|---|---|
| **Network operator / NetOps engineer** | Add/edit device inventory day-to-day, generate collector config, trust that it reflects reality | [Inventory Management](../../reference/features/Feature - Inventory Management.md), [YAML Config Generation](../../reference/features/Feature - YAML Config Generation.md) |
| **Team/department lead (Organization Admin)** | Manage who has access, review activity, keep the team's data organized | [RBAC & Access Management](../../reference/features/Feature - RBAC & Access Management.md), [Audit Log & History](../../reference/features/Feature - Audit Log & History.md) |
| **Security/compliance reviewer (Auditor role)** | Read-only visibility plus audit trail access, nothing more | [Audit Log & History](../../reference/features/Feature - Audit Log & History.md), [SOC 2 Compliance Mapping](../../security/SOC 2 Compliance Mapping.md) |
| **Platform operator (Super Admin)** | Stand up and maintain the instance itself, across every organization | [Production Deployment](../../deployment/Production Deployment.md), [Air-Gap Deployment](../../deployment/Air-Gap Deployment.md) |
| **Automation / SNMP collector (service account)** | Machine-to-machine API access without a human login | [API Keys](../../reference/features/Feature - API Keys.md) |
| **Stakeholder needing visibility (Read Only role)** | See current state, generate nothing, change nothing | [Dashboard](../../reference/features/Feature - Dashboard.md) |

## Target environments

Explicitly built for **regulated and locked-down environments**: banks, government, defense, healthcare, telecom — anywhere the deployment network segment cannot or will not reach the public internet, and where an auditor will ask "how does this enforce access control and log security events."

## Core use cases

1. **Stand up a shared inventory** replacing a team's spreadsheet, with real multi-user access and validation.
2. **Generate SNMP/ICMP collector configuration** on demand, grouped by Collector Region, always derived from current data.
3. **Enforce least-privilege access** across a team via role-based permissions, without hardcoding role checks into the application.
4. **Deploy with zero internet access**, verified rather than assumed.
5. **Produce an audit trail** sufficient to answer "who changed this, and when" for both business data and security events.

## Journey

See [User Journey](../../architecture/User Journey.md) for the concrete first-run and day-to-day flowcharts.

## See also

[Product Vision](Product Vision.md) · [Competitive Advantages](Competitive Advantages.md)
