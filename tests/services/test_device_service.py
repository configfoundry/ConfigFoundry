"""
Unit tests for DeviceService.

All repository dependencies are replaced with ``unittest.mock.MagicMock``
objects, so these tests exercise only the service's own logic — input
validation, audit event selection, and return-value forwarding — without
touching SQLite at all.

Run from the repository root:
    python3 -m unittest tests/services/test_device_service.py
    python3 -m unittest discover tests/services/
"""
import os
import sys
import unittest
from unittest.mock import MagicMock, call

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from core.services.device_service import DeviceService


# ---------------------------------------------------------------------------
# Fixture helpers
# ---------------------------------------------------------------------------

def _make_service():
    """Return a DeviceService backed by mock repositories."""
    device_repo = MagicMock()
    audit_repo = MagicMock()
    service = DeviceService(device_repo=device_repo, audit_repo=audit_repo)
    return service, device_repo, audit_repo


def _device(ip="192.0.2.1", name="Router1", region="us-east", device_id=None):
    d = {"IP": ip, "Device": name, "Collector Region": region}
    if device_id is not None:
        d["id"] = device_id
    return d


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestListDevices(unittest.TestCase):
    def test_delegates_to_repo(self):
        svc, repo, _ = _make_service()
        expected = [_device()]
        repo.list_all.return_value = expected
        result = svc.list_devices()
        repo.list_all.assert_called_once_with()
        self.assertEqual(result, expected)


class TestGetDevice(unittest.TestCase):
    def test_delegates_to_repo(self):
        svc, repo, _ = _make_service()
        repo.get.return_value = _device()
        result = svc.get_device("some-id")
        repo.get.assert_called_once_with("some-id")
        self.assertIsNotNone(result)

    def test_returns_none_for_missing(self):
        svc, repo, _ = _make_service()
        repo.get.return_value = None
        self.assertIsNone(svc.get_device("ghost"))


class TestCreateOrUpdate(unittest.TestCase):
    def test_valid_device_is_upserted(self):
        svc, repo, audit = _make_service()
        device = _device()
        repo.upsert.return_value = {**device, "id": "new-id"}
        saved = svc.create_or_update(device, actor="alice")
        repo.upsert.assert_called_once_with(device)
        self.assertEqual(saved["id"], "new-id")

    def test_create_logs_create_device_action(self):
        """A device without an id should produce a create_device audit entry."""
        svc, repo, audit = _make_service()
        device = _device()  # no id — new record
        repo.upsert.return_value = {**device, "id": "gen-id"}
        svc.create_or_update(device, actor="alice")
        audit.log.assert_called_once()
        action = audit.log.call_args[0][1]
        self.assertEqual(action, "create_device")

    def test_update_logs_update_device_action(self):
        """A device with a pre-existing id should produce an update_device entry."""
        svc, repo, audit = _make_service()
        device = _device(device_id="existing-id")
        repo.get.return_value = {"id": "existing-id", "tags": {}}
        repo.upsert.return_value = device
        svc.create_or_update(device, actor="bob")
        action = audit.log.call_args[0][1]
        self.assertEqual(action, "update_device")

    def test_invalid_ip_raises_value_error(self):
        svc, repo, audit = _make_service()
        with self.assertRaises(ValueError) as ctx:
            svc.create_or_update({"IP": "not-an-ip"}, actor="alice")
        self.assertIn("not-an-ip", str(ctx.exception))
        repo.upsert.assert_not_called()
        audit.log.assert_not_called()

    def test_blank_ip_is_accepted(self):
        """A blank IP is valid at the service level — the validator catches it."""
        svc, repo, audit = _make_service()
        device = {"IP": "", "Device": "NoIP"}
        repo.upsert.return_value = {**device, "id": "x"}
        svc.create_or_update(device, actor="alice")
        repo.upsert.assert_called_once()

    def test_actor_passed_to_audit(self):
        svc, repo, audit = _make_service()
        device = _device()
        repo.upsert.return_value = {**device, "id": "y"}
        svc.create_or_update(device, actor="charlie")
        actor_arg = audit.log.call_args[0][0]
        self.assertEqual(actor_arg, "charlie")

    def test_none_actor_accepted(self):
        svc, repo, audit = _make_service()
        device = _device()
        repo.upsert.return_value = {**device, "id": "z"}
        svc.create_or_update(device, actor=None)
        audit.log.assert_called_once()


class TestTagPreservationOnUpdate(unittest.TestCase):
    """DeviceService.create_or_update must never let an edit silently wipe
    dynamic tag values the caller's payload doesn't mention (see the
    docstring on create_or_update for the full rule). All repository
    dependencies are mocked -- these tests only exercise the merge logic
    itself, not real persistence."""

    def test_create_with_no_tags_is_unaffected(self):
        """Requirement 1: create device with no tags -- repo.get must never
        be consulted on create (there is nothing to merge from)."""
        svc, repo, audit = _make_service()
        device = _device()  # no id -> create
        repo.upsert.return_value = {**device, "id": "new-id"}
        svc.create_or_update(device, actor="alice")
        repo.get.assert_not_called()
        self.assertNotIn("tags", repo.upsert.call_args[0][0])

    def test_create_with_tags_passes_through_unchanged(self):
        """Requirement 2: create device with tags -- passed straight through,
        no merge attempted (nothing exists yet to merge with)."""
        svc, repo, audit = _make_service()
        device = _device()
        device["tags"] = {"tag-a": "Router"}
        repo.upsert.return_value = {**device, "id": "new-id"}
        svc.create_or_update(device, actor="alice")
        repo.get.assert_not_called()
        upserted = repo.upsert.call_args[0][0]
        self.assertEqual(upserted["tags"], {"tag-a": "Router"})

    def test_update_without_tags_preserves_existing_tags(self):
        """Requirement 3: editing a device without sending `tags` at all
        (e.g. via DeviceFormDrawer today) must leave existing tags intact."""
        svc, repo, audit = _make_service()
        repo.get.return_value = {"id": "existing-id", "tags": {"tag-a": "Router"}}
        device = _device(device_id="existing-id")  # no "tags" key at all
        repo.upsert.return_value = device
        svc.create_or_update(device, actor="bob")
        repo.get.assert_called_once_with("existing-id")
        upserted = repo.upsert.call_args[0][0]
        self.assertEqual(upserted["tags"], {"tag-a": "Router"})

    def test_update_with_one_tag_merges_and_keeps_unrelated_tags(self):
        """Requirement 4: an incoming tag overwrites only its own tag id;
        other existing tags must be preserved untouched."""
        svc, repo, audit = _make_service()
        repo.get.return_value = {
            "id": "existing-id",
            "tags": {"tag-a": "Router", "tag-b": "us-east"},
        }
        device = _device(device_id="existing-id")
        device["tags"] = {"tag-a": "Switch"}  # only updating tag-a
        repo.upsert.return_value = device
        svc.create_or_update(device, actor="bob")
        upserted = repo.upsert.call_args[0][0]
        self.assertEqual(upserted["tags"], {"tag-a": "Switch", "tag-b": "us-east"})

    def test_update_with_explicit_empty_tags_clears_them(self):
        """Requirement 5: an explicit `"tags": {}` is a deliberate clear, not
        "no change" -- it must NOT fall back to preserving existing tags."""
        svc, repo, audit = _make_service()
        repo.get.return_value = {"id": "existing-id", "tags": {"tag-a": "Router"}}
        device = _device(device_id="existing-id")
        device["tags"] = {}
        repo.upsert.return_value = device
        svc.create_or_update(device, actor="bob")
        upserted = repo.upsert.call_args[0][0]
        self.assertEqual(upserted["tags"], {})

    def test_update_incoming_tags_null_treated_as_clear(self):
        """`"tags": null` (Python None, key present) is treated the same as
        an explicit `{}` -- both mean "caller is stating there are no tags",
        so both are a deliberate clear, not "unchanged"."""
        svc, repo, audit = _make_service()
        repo.get.return_value = {"id": "existing-id", "tags": {"tag-a": "Router"}}
        device = _device(device_id="existing-id")
        device["tags"] = None
        repo.upsert.return_value = device
        svc.create_or_update(device, actor="bob")
        upserted = repo.upsert.call_args[0][0]
        self.assertEqual(upserted["tags"], {})

    def test_update_adds_brand_new_tag_id_alongside_existing(self):
        """Requirement 2 (new tag ids): an incoming tag id that didn't exist
        on the device before is added, and pre-existing tags are kept --
        not just the "overwrite" case, but genuinely new keys too."""
        svc, repo, audit = _make_service()
        repo.get.return_value = {"id": "existing-id", "tags": {"tag-a": "Router"}}
        device = _device(device_id="existing-id")
        device["tags"] = {"tag-z": "brand-new-value"}
        repo.upsert.return_value = device
        svc.create_or_update(device, actor="bob")
        upserted = repo.upsert.call_args[0][0]
        self.assertEqual(upserted["tags"], {"tag-a": "Router", "tag-z": "brand-new-value"})

    def test_update_existing_device_with_no_tags_key_at_all(self):
        """Existing device predates the tags feature entirely (no "tags" key
        in its stored record, not even {}). Editing it without sending tags
        must not crash and should simply result in an empty tags dict."""
        svc, repo, audit = _make_service()
        repo.get.return_value = {"id": "existing-id"}  # no "tags" key
        device = _device(device_id="existing-id")
        repo.upsert.return_value = device
        svc.create_or_update(device, actor="bob")
        upserted = repo.upsert.call_args[0][0]
        self.assertEqual(upserted["tags"], {})

    def test_preserved_tags_are_not_aliased_to_repo_object(self):
        """Check 3 (code review): preserving existing tags must copy them,
        not hand back the same dict object the repository returned --
        otherwise a later in-place mutation of the upserted device's tags
        would silently corrupt whatever object graph the repository (or a
        caller holding a reference to it) still has."""
        svc, repo, audit = _make_service()
        original_tags_obj = {"tag-a": "Router"}
        repo.get.return_value = {"id": "existing-id", "tags": original_tags_obj}
        device = _device(device_id="existing-id")  # no "tags" key -> preserve
        repo.upsert.return_value = device
        svc.create_or_update(device, actor="bob")
        upserted = repo.upsert.call_args[0][0]
        self.assertIsNot(upserted["tags"], original_tags_obj)
        # Mutating the result must not affect the object the mock "repository" holds.
        upserted["tags"]["tag-a"] = "MUTATED"
        self.assertEqual(original_tags_obj["tag-a"], "Router")

    def test_create_behavior_unchanged(self):
        """Requirement 6: create path produces the exact same upsert call as
        before this change -- no tags key is injected when the caller didn't
        supply one."""
        svc, repo, audit = _make_service()
        device = _device()
        repo.upsert.return_value = {**device, "id": "new-id"}
        svc.create_or_update(device, actor="alice")
        repo.upsert.assert_called_once_with(device)

    def test_update_when_existing_record_not_found_does_not_crash(self):
        """Defensive edge case: device carries an id but the repository has
        no matching record (e.g. stale reference). There's nothing to merge
        from, so the incoming payload is passed through as given rather than
        raising."""
        svc, repo, audit = _make_service()
        repo.get.return_value = None
        device = _device(device_id="missing-id")
        repo.upsert.return_value = device
        svc.create_or_update(device, actor="bob")
        repo.get.assert_called_once_with("missing-id")
        repo.upsert.assert_called_once_with(device)


class TestDelete(unittest.TestCase):
    def test_delete_delegates_to_repo(self):
        svc, repo, audit = _make_service()
        svc.delete("some-id", actor="alice")
        repo.delete.assert_called_once_with("some-id")

    def test_delete_logs_audit_entry(self):
        svc, repo, audit = _make_service()
        svc.delete("del-id", actor="bob")
        audit.log.assert_called_once()
        action = audit.log.call_args[0][1]
        self.assertEqual(action, "delete_device")


class TestReplaceAll(unittest.TestCase):
    def test_calls_repo_replace_all(self):
        svc, repo, audit = _make_service()
        devices = [_device("192.0.2.1"), _device("192.0.2.2")]
        svc.replace_all(devices, actor="alice")
        repo.replace_all.assert_called_once_with(devices)

    def test_logs_import_audit_with_mode_replace(self):
        svc, repo, audit = _make_service()
        svc.replace_all([], actor="alice")
        details = audit.log.call_args[0][2]
        self.assertEqual(details["mode"], "replace")


class TestMerge(unittest.TestCase):
    def test_calls_repo_merge(self):
        svc, repo, audit = _make_service()
        devices = [_device()]
        svc.merge(devices, actor="alice")
        repo.merge.assert_called_once_with(devices)

    def test_logs_import_audit_with_mode_merge(self):
        svc, repo, audit = _make_service()
        svc.merge([], actor="alice")
        details = audit.log.call_args[0][2]
        self.assertEqual(details["mode"], "merge")


if __name__ == "__main__":
    unittest.main()
