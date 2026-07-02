"""Unit tests for RBACService.

Run: python3 -m pytest tests/services/test_rbac_service.py -v
"""
import os
import sys
import unittest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from core.security.permissions import PERMISSION_CODES
from core.services.rbac_service import RBACService


def _make_service():
    role_repo = MagicMock()
    user_repo = MagicMock()
    return RBACService(role_repo, user_repo), role_repo, user_repo


class TestSuperAdminBypass(unittest.TestCase):
    def test_super_admin_has_every_permission(self):
        svc, role_repo, _ = _make_service()
        role_repo.list_for_user.return_value = [
            {"id": "r1", "name": "Super Admin", "is_system": True}
        ]
        perms = svc.get_effective_permissions("u1", "o1")
        self.assertEqual(perms, set(PERMISSION_CODES))

    def test_is_super_admin_true(self):
        svc, role_repo, _ = _make_service()
        role_repo.list_for_user.return_value = [
            {"id": "r1", "name": "Super Admin", "is_system": True}
        ]
        self.assertTrue(svc.is_super_admin("u1", "o1"))

    def test_is_super_admin_false_for_other_roles(self):
        svc, role_repo, _ = _make_service()
        role_repo.list_for_user.return_value = [
            {"id": "r2", "name": "Operator", "is_system": True}
        ]
        self.assertFalse(svc.is_super_admin("u1", "o1"))


class TestNonAdminPermissions(unittest.TestCase):
    def test_delegates_to_role_repo_for_non_admin(self):
        svc, role_repo, _ = _make_service()
        role_repo.list_for_user.return_value = [
            {"id": "r2", "name": "Operator", "is_system": True}
        ]
        role_repo.get_effective_permissions.return_value = {"inventory:read", "inventory:write"}
        perms = svc.get_effective_permissions("u1", "o1")
        self.assertEqual(perms, {"inventory:read", "inventory:write"})

    def test_has_permission_true(self):
        svc, role_repo, _ = _make_service()
        role_repo.list_for_user.return_value = []
        role_repo.get_effective_permissions.return_value = {"inventory:read"}
        self.assertTrue(svc.has_permission("u1", "o1", "inventory:read"))

    def test_has_permission_false(self):
        svc, role_repo, _ = _make_service()
        role_repo.list_for_user.return_value = []
        role_repo.get_effective_permissions.return_value = {"inventory:read"}
        self.assertFalse(svc.has_permission("u1", "o1", "user:manage"))

    def test_no_roles_means_no_permissions(self):
        svc, role_repo, _ = _make_service()
        role_repo.list_for_user.return_value = []
        role_repo.get_effective_permissions.return_value = set()
        self.assertEqual(svc.get_effective_permissions("u1", "o1"), set())


class TestPrivilegedRoleCheck(unittest.TestCase):
    def test_has_any_privileged_role_true(self):
        svc, role_repo, _ = _make_service()
        role_repo.list_for_user.return_value = [{"id": "r1", "name": "Organization Admin", "is_system": True}]
        self.assertTrue(svc.has_any_privileged_role("u1", "o1", ["Super Admin", "Organization Admin"]))

    def test_has_any_privileged_role_false(self):
        svc, role_repo, _ = _make_service()
        role_repo.list_for_user.return_value = [{"id": "r1", "name": "Read Only", "is_system": True}]
        self.assertFalse(svc.has_any_privileged_role("u1", "o1", ["Super Admin", "Organization Admin"]))


if __name__ == "__main__":
    unittest.main()
