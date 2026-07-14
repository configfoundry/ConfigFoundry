"""
Device service — business logic for device CRUD operations.

Responsibilities
----------------
- Validate IP address format before persistence (raises ValueError on failure
  so that HTTP routes can map it to a 400 response uniformly).
- Delegate persistence to IDeviceRepository.
- Write an audit log entry for every mutation via IAuditRepository.
- Remain completely ignorant of SQLite, HTTP, or response encoding.
"""
from typing import Optional

from core.domain.helpers import is_valid_ip
from core.repositories.interfaces import IDeviceRepository, IAuditRepository


class DeviceService:
    """Orchestrates device CRUD with validation and audit logging."""

    def __init__(
        self,
        device_repo: IDeviceRepository,
        audit_repo: IAuditRepository,
    ) -> None:
        self._device_repo = device_repo
        self._audit_repo = audit_repo

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def list_devices(self) -> list[dict]:
        return self._device_repo.list_all()

    def get_device(self, device_id: str) -> Optional[dict]:
        return self._device_repo.get(device_id)

    # ------------------------------------------------------------------
    # Mutations
    # ------------------------------------------------------------------

    def create_or_update(self, device: dict, actor: Optional[str]) -> dict:
        """Validate and persist a device record.

        Raises
        ------
        ValueError
            When the supplied IP address string is not a valid IP.

        Dynamic tag preservation
        ------------------------
        Editing a device must never destroy dynamic tag values ("tags",
        keyed by TagDef id -- see core/domain/helpers.py's resolve_tags_for_record)
        that the caller's edit form doesn't expose. DeviceFormDrawer, for
        example, never submits a `tags` field at all, and the repository
        layer replaces the entire stored JSON document on upsert (it does
        not merge) -- without this step, every edit through that form would
        silently wipe any tags already set on the device.

        On update (device already has an id), this loads the existing
        record and applies:
          - `tags` key absent from the incoming payload -> preserve all
            existing tags unchanged.
          - `tags` key present and non-empty -> merge onto the existing
            tags, with incoming values overwriting only matching tag ids;
            any existing tag id not mentioned in the incoming payload is
            kept.
          - `tags` key present and explicitly `{}` -> treated as an
            intentional clear (all tags removed), not "no change".

        Create (no existing id) is entirely unaffected -- there is no prior
        record to merge from, so whatever `tags` (if any) the caller
        supplied is passed through as-is, exactly like before this change.
        """
        ip = (device.get("IP") or "").strip()
        if ip and not is_valid_ip(ip):
            raise ValueError(f"'{ip}' is not a valid IP address")
        is_create = not device.get("id")

        # This lives here rather than in the repository because it's a
        # business rule about what "editing a device" is allowed to mean
        # (don't destroy data the edit didn't touch), not a persistence
        # concern -- the repository stays a dumb, entity-agnostic JSON-blob
        # store and doesn't need to know anything about tags specifically.
        if not is_create:
            existing = self._device_repo.get(device["id"])
            if existing is not None:
                existing_tags = existing.get("tags") or {}
                if "tags" in device:
                    incoming_tags = device.get("tags") or {}
                    # Non-empty incoming tags merge onto the existing base
                    # (incoming wins per tag id); an explicit {} ("clear all
                    # tags") or null both collapse to {} here and must NOT
                    # fall back to preserving existing tags.
                    device["tags"] = {**existing_tags, **incoming_tags} if incoming_tags else {}
                else:
                    # `dict(...)` copy, not a bare reference: `existing` is
                    # whatever the repository returned, and existing_tags
                    # may be the exact same dict object nested inside it.
                    # Assigning it directly into `device` would alias the
                    # two, risking a later in-place mutation of
                    # device["tags"] silently corrupting the repo's own
                    # object graph (harmless with the current repos, which
                    # always return fresh dicts from json.loads(), but not
                    # something this service should rely on).
                    device["tags"] = dict(existing_tags)

        saved = self._device_repo.upsert(device)
        self._audit_repo.log(
            actor,
            "create_device" if is_create else "update_device",
            {"id": saved["id"], "ip": saved.get("IP")},
        )
        return saved

    def delete(self, device_id: str, actor: Optional[str]) -> None:
        self._device_repo.delete(device_id)
        self._audit_repo.log(actor, "delete_device", {"id": device_id})

    def replace_all(self, devices: list[dict], actor: Optional[str]) -> None:
        self._device_repo.replace_all(devices)
        self._audit_repo.log(
            actor, "import_devices", {"count": len(devices), "mode": "replace"}
        )

    def merge(self, devices: list[dict], actor: Optional[str]) -> None:
        self._device_repo.merge(devices)
        self._audit_repo.log(
            actor, "import_devices", {"count": len(devices), "mode": "merge"}
        )
