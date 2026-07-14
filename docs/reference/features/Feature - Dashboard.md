# Feature: Dashboard

Parent: [Repository Overview](../Repository Overview.md) · [User Journey](../../architecture/User Journey.md)

## Purpose

At-a-glance operational view: inventory totals, breakdowns, generation status, recent activity.

## Business value

Gives operators a single landing page to assess system state without navigating into each section individually.

## Current implementation

Inventory totals with icon-bearing stat cards; breakdowns by Collector Region and any custom tag (correctly accounting for subnet-inherited values, not just directly-stored ones); configuration/generation status; a recent-activity feed. Dark/light mode toggle, remembered per browser, applied before paint (no flash of wrong theme).

## Files involved

- Frontend: `frontend/src/modules/dashboard/{DashboardView,DashboardKpiRow,InventoryOverview,InventorySummary,ConfigurationStatus,ConfigurationsGenerated,DeviceHealth,InventoryHealthPanel,ValidationHealth,RecentActivity,RecentExports,RecentImports,QuickActions,DashboardOnboarding}.tsx`
- Backend: `api/v1/meta.py`, `core/services/meta_service.py` (statistics), plus reads across device/bandwidth/subnet/history services

## User flow

Log in -> land on Dashboard -> stat cards and breakdowns summarize current state -> Quick Actions link into Inventory/Generate/Admin.

## Data flow

Aggregates reads across `core/services/meta_service.py` and the inventory services; no dedicated dashboard-specific backend aggregation endpoint beyond `GET /api/v1/meta` — verify whether per-widget data (Recent Activity, Configuration Status) has dedicated endpoints or is derived client-side from existing list endpoints.

## Dependencies

[Feature - Inventory Management](Feature - Inventory Management.md), [Feature - Audit Log & History](Feature - Audit Log & History.md) (Recent Activity).

## Known limitations

Per `frontend/VUEXY_MIGRATION_REPORT.md`: **Recent Imports** on the Dashboard has no server-side audit trail for imports specifically, so it's shown as an honest empty state rather than fabricated data. This is a real backend gap, not a frontend bug.

## Future improvements

A dedicated import audit trail to back the Recent Imports widget honestly. See [Technical Debt](../../development/Technical Debt.md).

## See also

[Feature - Audit Log & History](Feature - Audit Log & History.md) · [Frontend Overview](../../architecture/Frontend Overview.md)
