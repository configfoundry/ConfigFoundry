# Glossary

Parent: [[Repository Overview]]

| Term | Definition |
|---|---|
| **Collector Region** | The one fixed, mandatory tag concept in ConfigFoundry — Generate YAML groups output files by it. See [[Features/Feature - Dynamic Tags\|Feature - Dynamic Tags]]. |
| **Principal** | The resolved identity of an authenticated caller (from a JWT or API key), returned by `get_current_principal()`. See [[Security/Authentication\|Authentication]]. |
| **perm_version** | An integer on each `UserModel` row, embedded in every access token, bumped on role change/forced logout/password change/deactivation to invalidate outstanding tokens immediately. See [[Security/Authorization & RBAC#Immediate revocation without a token blacklist\|Authorization & RBAC § Immediate revocation]]. |
| **StorageProvider** | The ABC that decouples the application from any specific database driver. See [[Backend/Storage Abstraction\|Storage Abstraction]]. |
| **ServiceContainer** | The single dependency-injection root (`core/container.py`) wiring every repository and service. |
| **Access Policy Engine** | The IP-based allow/deny authorization layer that runs before authentication. See [[Security/Access Policy Engine\|Access Policy Engine]]. |
| **NetworkACL** | A single IP allow/deny rule record managed by the Access Policy Engine. |
| **Permission code** | A `<resource>:<action>` string (e.g. `inventory:write`) — the unit of authorization; routes never check role names directly. See [[Security/RBAC Permission Catalog\|RBAC Permission Catalog]]. |
| **System role** | One of the five roles seeded automatically (Super Admin, Organization Admin, Operator, Read Only, Auditor). |
| **Custom role** | Any role an organization defines itself via `POST /api/v1/roles`, with any combination of permission codes. |
| **Refresh token family** | The set of refresh tokens descended from one original login; reuse of an already-rotated token revokes the whole family. See [[Security/Authentication#Mechanisms\|Authentication § Mechanisms]]. |
| **Correlation ID** | A 12-character hex ID assigned per request, propagated through logs and the `X-Request-ID` header. See [[Backend/Logging Framework\|Logging Framework]]. |
| **Air-gap** | Zero internet/network access at the deployment target. See [[Deployment/Air-Gap Deployment\|Air-Gap Deployment]]. |
| **Release bundle** | `ConfigFoundry-Offline-vX.Y.Z.zip` — the self-contained, fully offline-installable artifact built by CI, distinct from the source-only git repository. |
| **Vendored dependency** | A pinned, checksummed copy of a third-party package bundled into the repository/release so no package registry needs to be reachable at install time. |
| **Wheelhouse** | `vendor/python/` — the committed collection of pinned Python wheels enabling `pip install --no-index`. |
| **Scaffold provider** | A `StorageProvider` implementation (PostgreSQL, MySQL, SQL Server) that is interface-complete but whose `initialize()` raises `NotImplementedError` — not yet production-usable. |
| **Subnet-based tag inheritance** | Tagging a subnet by CIDR once; any device whose IP falls inside inherits the tag. See [[Features/Feature - Dynamic Tags\|Feature - Dynamic Tags]]. |
| **Config generation** | `POST /api/v1/generate` — producing collector YAML from current inventory. See [[Features/Feature - YAML Config Generation\|Feature - YAML Config Generation]]. |
| **Audit trail / audit log** | The write-once record of every security-relevant event and business mutation. See [[Features/Feature - Audit Log & History\|Feature - Audit Log & History]]. |
| **Vuexy** | The MUI-based design system/theme the current Next.js frontend is built on; also the name of the in-progress frontend migration. See [[Frontend Documentation/Frontend Overview\|Frontend Overview]]. |
| **ddtrace / Datadog APM** | Automatic tracing/profiling/log-correlation instrumentation of the backend and frontend processes. See [[Integrations Documentation/Datadog APM\|Datadog APM]]. |
| **ADR** | Architecture Decision Record — see [[Architecture/Decisions/ADR Index\|ADR Index]]. |

## See also

[[Repository Overview]] · [[Architecture Overview]] · [[Security/Security Overview|Security Overview]]
