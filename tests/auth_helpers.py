"""
Shared test helper: issue a valid super-admin access token directly from a
``ServiceContainer`` without going through the HTTP login flow.

Every pre-existing integration test built its ``TestClient`` against fully
open endpoints. Now that all business routers require a permission (see
api/v1/*.py), those tests need *some* authenticated identity to call
through -- this mints one deterministically from the container's own
bootstrap Super Admin user (seeded by the auth migration for every fresh
test database) rather than duplicating login logic in every test file.

Usage
-----
::

    from tests.auth_helpers import auth_headers

    client = TestClient(create_app(container=container))
    client.headers.update(auth_headers(container))
"""
from __future__ import annotations

from core.container import ServiceContainer
from core.security import jwt_tokens


def get_admin_user(container: ServiceContainer) -> dict:
    """Return the seeded bootstrap Super Admin user row for this container's
    default organization."""
    users = container.user_repo.list_by_org(container.default_org_id)
    for u in users:
        roles = container.role_repo.list_for_user(u["id"], container.default_org_id)
        if any(r["name"] == "Super Admin" for r in roles):
            return u
    raise AssertionError(
        "No bootstrap Super Admin user found -- was the auth migration applied?"
    )


def issue_admin_token(container: ServiceContainer) -> str:
    user = get_admin_user(container)
    return jwt_tokens.issue_access_token(
        user_id=user["id"],
        org_id=user["org_id"],
        perm_version=user["perm_version"],
        config=container.security_config,
    )


def auth_headers(container: ServiceContainer) -> dict:
    return {"Authorization": f"Bearer {issue_admin_token(container)}"}
