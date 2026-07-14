## What this changes and why

## Related issue
Closes #

## Checklist
- [ ] Tests added or updated (`make test`)
- [ ] Frontend typechecks/lints if touched (`make typecheck`, `make lint`)
- [ ] `docs/` updated in the same change if behavior changed
- [ ] If a dependency changed: offline vendor bundles regenerated and
      `python3 scripts/validate_airgap.py` passes (see
      [docs/airgap.md](../docs/deployment/airgap.md))
- [ ] If an API endpoint changed: `/docs` and `/redoc` reflect it correctly
- [ ] No hardcoded role-name checks introduced (permission codes only,
      see [docs/rbac.md](../docs/security/rbac.md))
- [ ] No new external network/CDN dependency introduced into application source
