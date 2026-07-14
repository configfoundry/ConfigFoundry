# Feature: Dynamic Tags

Parent: [Feature - Inventory Management](Feature - Inventory Management.md)

## Purpose

User-defined classification (Region, Environment, Device Class, or anything invented) instead of hardcoded fields, applicable across Devices, Bandwidth, and Subnets from one shared value list.

## Business value

Teams don't share the same taxonomy needs — hardcoding fields forces awkward workarounds. Dynamic tags let each deployment define its own classification without a code change, and subnet-based inheritance removes the tedium of tagging every device individually.

## Current implementation

- **Collector Region** is the one fixed, mandatory concept — what config generation groups output files by.
- Everything else is created on demand via **Manage Tags**; each tag's value list (alongside Collector Region's) lives on **Manage Lists**.
- A tag can apply to Devices, Bandwidth, and Subnets simultaneously, sharing one value list.
- Tags render as real columns in every table (header = tag name), not packed into a generic "Tags" blob.
- **Subnet-based inheritance:** tag a subnet once by CIDR; any device whose IP falls inside inherits the tag for any value it doesn't set itself, and the matched subnet is written into generated YAML (`subnet: 10.1.1.0/24`) for traceability.
- Deleting an in-use tag/value/Collector Region warns with the affected record count first; deleting a tag definition never deletes the records that used it, only the reference.

## Files involved

- Backend: `api/v1/tags.py`, `api/v1/lists.py`, `core/services/tag_service.py`, `core/services/list_service.py`, `models/inventory.py::TagDefModel`/`ListModel`
- Frontend: tag columns rendered inline within `modules/inventory/{DevicesView,BandwidthView,SubnetsView}.tsx`; tag/list management views (see `(app)/inventory/templates` or equivalent management screens)

## User flow

Manage Tags -> create a tag, choose which sections it applies to -> Manage Lists -> define its value list -> tag renders as a column everywhere it applies -> optionally tag a subnet by CIDR for inheritance.

## Data flow

Tag references are stored inside the JSON `data` blob on the tagged record (device/bandwidth/subnet), resolved and merged with inherited subnet tags in the service layer at read/generation time — not as SQL joins. See [Database Overview](../../architecture/Database Overview.md).

## Dependencies

[Feature - Inventory Management](Feature - Inventory Management.md), [Feature - YAML Config Generation](Feature - YAML Config Generation.md) (subnet match is written into generated YAML).

## Known limitations

No tag-level validation rules exist yet in `core/validator.py` — the frontend Validation page shows this as an honest "Not yet available" disabled section rather than fabricating checks (per `frontend/VUEXY_MIGRATION_REPORT.md`).

## Future improvements

Deeper cross-field validation as part of the v0.6.0 Inventory Validation Engine — see [Roadmap Overview](../../roadmap/Roadmap Overview.md).

## See also

[Feature - Inventory Management](Feature - Inventory Management.md) · [Tags & Lists Endpoints](../../api/Tags & Lists Endpoints.md)
