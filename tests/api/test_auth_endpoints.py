"""
Integration tests for the /api/v1/auth, /users, /roles, /api-keys endpoints
-- exercised through a real TestClient + real (temp file) SQLite database,
matching the style of tests/api/test_versioning.py.

Run: python3 -m pytest tests/api/test_auth_endpoints.py -v
"""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from fastapi.testclient import TestClient

from app import create_app

_BOOTSTRAP_EMAIL = "admin@configfoundry.local"
_BOOTSTRAP_PASSWORD = "Sup3r-Secret-Bootstrap-Pass1!"


def _make_client():
    os.environ["CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL"] = _BOOTSTRAP_EMAIL
    os.environ["CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD"] = _BOOTSTRAP_PASSWORD
    tmpdir = tempfile.mkdtemp()
    db_path = os.path.join(tmpdir, "auth_endpoints_test.db")
    app = create_app(db_path=db_path, static_dir=os.path.join(tmpdir, "_no_static_"))
    return TestClient(app, raise_server_exceptions=False)


def _login(client):
    r = client.post("/api/v1/auth/login", json={"email": _BOOTSTRAP_EMAIL, "password": _BOOTSTRAP_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()


class TestLoginFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = _make_client()

    def test_login_with_correct_credentials_succeeds(self):
        body = _login(self.client)
        self.assertIn("access_token", body)
        self.assertIn("refresh_token", body)
        self.assertEqual(body["token_type"], "bearer")

    def test_login_with_wrong_password_returns_401(self):
        r = self.client.post(
            "/api/v1/auth/login", json={"email": _BOOTSTRAP_EMAIL, "password": "wrong-password"}
        )
        self.assertEqual(r.status_code, 401)

    def test_login_with_malformed_email_returns_422(self):
        r = self.client.post(
            "/api/v1/auth/login", json={"email": "not-an-email", "password": "x"}
        )
        self.assertEqual(r.status_code, 422)

    def test_me_without_token_returns_401(self):
        r = self.client.get("/api/v1/auth/me")
        self.assertEqual(r.status_code, 401)

    def test_me_with_valid_token_returns_super_admin(self):
        tokens = _login(self.client)
        r = self.client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["email"], _BOOTSTRAP_EMAIL)
        self.assertIn("user:manage", body["permissions"])

    def test_me_with_garbage_token_returns_401(self):
        r = self.client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
        self.assertEqual(r.status_code, 401)


class TestTokenLifecycle(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = _make_client()

    def test_refresh_returns_new_tokens(self):
        tokens = _login(self.client)
        r = self.client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
        self.assertEqual(r.status_code, 200)
        self.assertNotEqual(r.json()["refresh_token"], tokens["refresh_token"])

    def test_reusing_rotated_refresh_token_fails(self):
        tokens = _login(self.client)
        r1 = self.client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
        self.assertEqual(r1.status_code, 200)
        # The original refresh_token has now been rotated away -- reusing
        # it must fail (theft-detection semantics).
        r2 = self.client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
        self.assertEqual(r2.status_code, 401)

    def test_logout_revokes_refresh_token(self):
        tokens = _login(self.client)
        r = self.client.post("/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]})
        self.assertEqual(r.status_code, 200)
        r2 = self.client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
        self.assertEqual(r2.status_code, 401)


class TestRBACEnforcement(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = _make_client()
        cls.admin_tokens = _login(cls.client)
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_tokens['access_token']}"}

    def test_admin_can_list_users(self):
        r = self.client.get("/api/v1/users", headers=self.admin_headers)
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(len(r.json()["users"]), 1)

    def test_admin_can_create_user_with_no_default_permissions(self):
        r = self.client.post(
            "/api/v1/users",
            json={"email": "bob@example.com", "password": "Zx9!Quiver-Falcon", "full_name": "Bob"},
            headers=self.admin_headers,
        )
        self.assertEqual(r.status_code, 200, r.text)
        new_user_id = r.json()["user"]["id"]

        # Log in as the new user and confirm zero permissions by default.
        r2 = self.client.post(
            "/api/v1/auth/login", json={"email": "bob@example.com", "password": "Zx9!Quiver-Falcon"}
        )
        self.assertEqual(r2.status_code, 200)
        bob_headers = {"Authorization": f"Bearer {r2.json()['access_token']}"}

        r3 = self.client.get("/api/v1/auth/me", headers=bob_headers)
        self.assertEqual(r3.json()["permissions"], [])

        # Bob cannot list users (lacks user:read).
        r4 = self.client.get("/api/v1/users", headers=bob_headers)
        self.assertEqual(r4.status_code, 403)

        # Admin assigns Bob the "Read Only" role; now inventory:read works.
        roles = self.client.get("/api/v1/roles", headers=self.admin_headers).json()["roles"]
        read_only_role = next(r for r in roles if r["name"] == "Read Only")
        r5 = self.client.post(
            f"/api/v1/users/{new_user_id}/roles",
            json={"role_id": read_only_role["id"]},
            headers=self.admin_headers,
        )
        self.assertEqual(r5.status_code, 200)

        # Bob's OLD access token is now stale (perm_version bumped) --
        # must re-login to see the new permission.
        r6 = self.client.post(
            "/api/v1/auth/login", json={"email": "bob@example.com", "password": "Zx9!Quiver-Falcon"}
        )
        bob_headers2 = {"Authorization": f"Bearer {r6.json()['access_token']}"}
        r7 = self.client.get("/api/v1/devices", headers=bob_headers2)
        self.assertEqual(r7.status_code, 200)

    def test_stale_token_after_role_change_is_rejected(self):
        r = self.client.post(
            "/api/v1/users",
            json={"email": "carol@example.com", "password": "Carol-Strong-Pass1!"},
            headers=self.admin_headers,
        )
        user_id = r.json()["user"]["id"]
        login = self.client.post(
            "/api/v1/auth/login", json={"email": "carol@example.com", "password": "Carol-Strong-Pass1!"}
        ).json()
        old_headers = {"Authorization": f"Bearer {login['access_token']}"}

        # Deactivating the account bumps perm_version -- the already-issued
        # token must stop working immediately, not at natural expiry.
        r2 = self.client.delete(f"/api/v1/users/{user_id}", headers=self.admin_headers)
        self.assertEqual(r2.status_code, 200)

        r3 = self.client.get("/api/v1/auth/me", headers=old_headers)
        self.assertEqual(r3.status_code, 401)


class TestAPIKeyAuth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = _make_client()
        tokens = _login(cls.client)
        cls.admin_headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    def test_created_key_can_authenticate_scoped_requests(self):
        r = self.client.post(
            "/api/v1/api-keys",
            json={"name": "ci-bot", "permissions": ["inventory:read"]},
            headers=self.admin_headers,
        )
        self.assertEqual(r.status_code, 200, r.text)
        api_key = r.json()["api_key"]

        # Has inventory:read -> can list devices.
        r2 = self.client.get("/api/v1/devices", headers={"Authorization": f"Bearer {api_key}"})
        self.assertEqual(r2.status_code, 200)

        # Lacks user:read -> cannot list users.
        r3 = self.client.get("/api/v1/users", headers={"Authorization": f"Bearer {api_key}"})
        self.assertEqual(r3.status_code, 403)

    def test_revoked_key_is_rejected(self):
        r = self.client.post(
            "/api/v1/api-keys",
            json={"name": "throwaway", "permissions": ["inventory:read"]},
            headers=self.admin_headers,
        )
        key_id = r.json()["id"]
        api_key = r.json()["api_key"]

        r2 = self.client.delete(f"/api/v1/api-keys/{key_id}", headers=self.admin_headers)
        self.assertEqual(r2.status_code, 200)

        r3 = self.client.get("/api/v1/devices", headers={"Authorization": f"Bearer {api_key}"})
        self.assertEqual(r3.status_code, 401)

    def test_ip_restricted_key_rejects_disallowed_ip(self):
        r = self.client.post(
            "/api/v1/api-keys",
            json={
                "name": "ip-locked", "permissions": ["inventory:read"],
                "allowed_ips": ["198.51.100.0/24"],
            },
            headers=self.admin_headers,
        )
        api_key = r.json()["api_key"]
        # TestClient's default source IP is "testclient" -> not a valid IP,
        # so it won't be inside 198.51.100.0/24 -> request must be denied.
        r2 = self.client.get("/api/v1/devices", headers={"Authorization": f"Bearer {api_key}"})
        self.assertEqual(r2.status_code, 401)


if __name__ == "__main__":
    unittest.main()
