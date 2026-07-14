# Runbook: Deployment

Parent: [Deployment Overview](../Deployment Overview.md) · [Operations](Operations.md)

## Standard deployment (new instance)

1. Choose install method — release bundle (air-gapped) or source (internet available). See [Deployment Overview](../Deployment Overview.md).
2. Set required secrets before first startup: `CONFIGFOUNDRY_AUTH_JWT_SECRET`, `CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY`, `CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL`, `CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD`. See [Secrets & Configuration](../../security/Secrets & Configuration.md).
3. Start the process once manually to confirm clean startup and capture bootstrap admin credentials if not pre-set.
4. Install as a supervised service (systemd unit — see [Production Deployment](../Production Deployment.md)).
5. Put a reverse proxy in front for TLS; set `CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES` to its exact CIDR.
6. Log in with bootstrap credentials, change password, set up additional admin accounts (never operate with a single admin account).
7. Configure roles/API keys/IP policies before inviting the rest of the team.
8. Confirm `python3 scripts/validate_airgap.py` passes if this is an air-gapped deployment.

## Routine release deployment (existing instance)

See [Upgrade & Rollback](../Upgrade & Rollback.md) for the full procedure — back up the database, apply the new release, confirm the migration summary in the startup log, spot-check core flows.

## Rollback

Restore the pre-upgrade database backup and reinstall/run the previous release's code — see [Upgrade & Rollback#Rolling back](../Upgrade & Rollback.md). Do not rely on `alembic downgrade` as the primary path.

## Post-deployment verification checklist

- [ ] `GET /openapi.json` returns `200` (basic liveness)
- [ ] `GET /api/v1/meta` returns `200` with a valid token (full-stack readiness — auth + service + DB round-trip)
- [ ] Log in with a test account succeeds
- [ ] `alembic current` matches the expected head revision for the deployed version
- [ ] Startup log shows no migration errors
- [ ] Audit log shows the expected startup/bootstrap entries

## See also

[Runbook - Monitoring & Health Checks](Runbook - Monitoring & Health Checks.md) · [Runbook - Troubleshooting](Runbook - Troubleshooting.md) · [Production Deployment](../Production Deployment.md)
