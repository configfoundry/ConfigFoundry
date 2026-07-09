# Target Users & Use Cases

Parent: [[Product/Product Vision|Product Vision]]

## Primary personas

| Persona | Needs | Primary features |
|---|---|---|
| **Network operator / NetOps engineer** | Add/edit device inventory day-to-day, generate collector config, trust that it reflects reality | [[Features/Feature - Inventory Management\|Inventory Management]], [[Features/Feature - YAML Config Generation\|YAML Config Generation]] |
| **Team/department lead (Organization Admin)** | Manage who has access, review activity, keep the team's data organized | [[Features/Feature - RBAC & Access Management\|RBAC & Access Management]], [[Features/Feature - Audit Log & History\|Audit Log & History]] |
| **Security/compliance reviewer (Auditor role)** | Read-only visibility plus audit trail access, nothing more | [[Features/Feature - Audit Log & History\|Audit Log & History]], [[Security/SOC 2 Compliance Mapping\|SOC 2 Compliance Mapping]] |
| **Platform operator (Super Admin)** | Stand up and maintain the instance itself, across every organization | [[Deployment/Production Deployment\|Production Deployment]], [[Deployment/Air-Gap Deployment\|Air-Gap Deployment]] |
| **Automation / SNMP collector (service account)** | Machine-to-machine API access without a human login | [[Features/Feature - API Keys\|API Keys]] |
| **Stakeholder needing visibility (Read Only role)** | See current state, generate nothing, change nothing | [[Features/Feature - Dashboard\|Dashboard]] |

## Target environments

Explicitly built for **regulated and locked-down environments**: banks, government, defense, healthcare, telecom — anywhere the deployment network segment cannot or will not reach the public internet, and where an auditor will ask "how does this enforce access control and log security events."

## Core use cases

1. **Stand up a shared inventory** replacing a team's spreadsheet, with real multi-user access and validation.
2. **Generate SNMP/ICMP collector configuration** on demand, grouped by Collector Region, always derived from current data.
3. **Enforce least-privilege access** across a team via role-based permissions, without hardcoding role checks into the application.
4. **Deploy with zero internet access**, verified rather than assumed.
5. **Produce an audit trail** sufficient to answer "who changed this, and when" for both business data and security events.

## Journey

See [[Architecture/Diagrams/User Journey|User Journey]] for the concrete first-run and day-to-day flowcharts.

## See also

[[Product/Product Vision|Product Vision]] · [[Product/Competitive Advantages|Competitive Advantages]]
