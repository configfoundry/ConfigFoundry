"""
Permission catalog and default system-role grants.

This is the ONE place permission codes are defined. Route handlers depend
on a permission CODE via ``require_permission("inventory:write")`` -- they
never check a role name directly, so which roles grant which permissions
is entirely data-driven (see ``ROLE_PERMISSION_DEFAULTS`` below, applied
once at migration time and editable afterward through the Roles admin UI).

Permission codes are ``<resource>:<action>`` strings, grouped by category
for the admin UI. Adding a new permission is: add an entry here, run
``ensure_seeded()`` (already called from the migration and from
``ServiceContainer`` startup so it self-heals if a new code is added in a
later release), then reference it from a route.
"""
from __future__ import annotations

PERMISSION_CATALOG: list[dict] = [
    # Inventory (devices, bandwidth caps, subnets, tags, managed lists)
    {"code": "inventory:read", "category": "Inventory", "description": "View devices, bandwidth caps, subnets, tags, and lists"},
    {"code": "inventory:write", "category": "Inventory", "description": "Create, edit, delete, and import inventory records"},

    # Device profiles / YAML generation ("Deployment Execute")
    {"code": "profile:read", "category": "Deployment", "description": "View generated YAML config output and history"},
    {"code": "profile:write", "category": "Deployment", "description": "Modify config-generation inputs"},
    {"code": "deployment:execute", "category": "Deployment", "description": "Run YAML config generation"},

    # Data export
    {"code": "export:read", "category": "Deployment", "description": "Export inventory data to Excel"},

    # System / settings
    {"code": "settings:modify", "category": "System", "description": "Change application-wide settings"},
    {"code": "meta:read", "category": "System", "description": "View inventory metadata and statistics"},

    # User & access management
    {"code": "user:read", "category": "Access Management", "description": "View user accounts"},
    {"code": "user:manage", "category": "Access Management", "description": "Create, edit, deactivate, and assign roles to users"},
    {"code": "role:read", "category": "Access Management", "description": "View roles and their permissions"},
    {"code": "role:manage", "category": "Access Management", "description": "Create, edit, and delete roles; change permission grants"},
    {"code": "api:manage", "category": "Access Management", "description": "Create, rotate, and revoke API keys"},
    {"code": "policy:manage", "category": "Access Management", "description": "Manage IP allow/deny lists and access policies"},
    {"code": "organization:manage", "category": "Access Management", "description": "Manage organization settings (multi-tenant)"},

    # Audit
    {"code": "audit:read", "category": "Audit", "description": "View the audit log (business + security events)"},
]

PERMISSION_CODES = {p["code"] for p in PERMISSION_CATALOG}


# ---------------------------------------------------------------------------
# System roles and their default permission grants.
#
# These are seed data, applied once by the auth migration. They are NOT
# hardcoded into authorization checks -- an org admin can freely edit a
# role's permissions afterward (except "Super Admin", which always holds
# every permission by definition and is not editable through the UI).
# ---------------------------------------------------------------------------

SYSTEM_ROLES: dict[str, dict] = {
    "Super Admin": {
        "description": "Full access to every organization, every permission. Not org-scoped.",
        "permissions": sorted(PERMISSION_CODES),  # everything, always in sync with the catalog
    },
    "Organization Admin": {
        "description": "Full access within one organization: manage users, roles, API keys, policies, and all inventory.",
        "permissions": [
            "inventory:read", "inventory:write",
            "profile:read", "profile:write", "deployment:execute",
            "export:read", "settings:modify", "meta:read",
            "user:read", "user:manage", "role:read", "role:manage",
            "api:manage", "policy:manage", "audit:read",
        ],
    },
    "Operator": {
        "description": "Day-to-day work: edit inventory, generate configs, export data. No user/role/policy management.",
        "permissions": [
            "inventory:read", "inventory:write",
            "profile:read", "profile:write", "deployment:execute",
            "export:read", "meta:read",
        ],
    },
    "Read Only": {
        "description": "View everything, change nothing.",
        "permissions": ["inventory:read", "profile:read", "export:read", "meta:read"],
    },
    "Auditor": {
        "description": "Read-only access plus the audit log -- for compliance/security review without operational access.",
        "permissions": ["inventory:read", "profile:read", "meta:read", "audit:read"],
    },
}
