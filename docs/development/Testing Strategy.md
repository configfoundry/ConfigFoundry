# Testing Strategy

Parent: [Repository Overview](../reference/Repository Overview.md) · [Engineering Wiki](Engineering Wiki.md)

> [!NOTE]
> `tests/README.md` states "no test code exists yet" — this is **stale relative to the current codebase**. 24 test files exist across 8 subdirectories today. Flagged in [Technical Debt](Technical Debt.md) as a documentation-drift item worth fixing (the README should be updated or removed).

## Current test coverage

```
tests/
  api/          test_auth_endpoints.py, test_versioning.py
  handler/      test_validate_import.py
  logging/      test_config.py, test_context.py, test_factory.py, test_middleware.py, test_startup.py
  logic/        test_diff.py, test_validation.py
  migrations/   test_baseline.py
  platforms/    test_datadog_regression.py
  repositories/ test_sqlite_device_repository.py
  security/     test_ip.py, test_jwt_tokens.py, test_password.py, test_rate_limit.py, test_tokens.py
  services/     test_auth_service.py, test_device_service.py, test_generate_service.py, test_policy_engine.py, test_rbac_service.py
  storage/      test_factory.py, test_sqlite_provider.py
```

25 files. Strong coverage on: logging framework (5 files), security primitives (5 files), core services (5 files). `tests/platforms/test_datadog_regression.py` is a characterization test (ADR-0008) proving the Platform Adapter pipeline reproduces the retired `core/logic.py`'s output byte-for-byte. **Gaps:** no dedicated tests for `bandwidth_service`, `subnet_service`, `tag_service`, `list_service`, `export_service`, `user_service`, `role_service`, `organization_service`, `mfa_service`, `api_key_service`, `policy_service`, `history_service`, `import_service` (beyond the one `handler/test_validate_import.py`); no `repositories/` coverage beyond SQLite device; no `formats/` tests (`yamldump.py`, `xlsxwriter.py`); no frontend test suite at all (no Jest/Vitest/Playwright configured — `make typecheck`/`make lint` are the only frontend quality gates).

## Philosophy (from `tests/README.md`)

- Prefer unit tests over integration tests — most interesting logic (`core/domain/`, `core/platforms/`, `formats/yamldump.py`) is pure functions, testable without a database or server.
- Standard library first: `python3 -m unittest discover tests/` works with no extra install; `pytest` is supported as an optional alternative.
- Tests must pass offline — no network calls, no external services.
- A failing test should say exactly what contract was violated.

## Running tests

```bash
make test                              # same as CI
python -m pytest -q
python -m pytest tests/security -q
python -m pytest -k test_login -q
python3 -m unittest discover tests/    # stdlib alternative
```

## CI enforcement

`.github/workflows/ci.yml`'s `backend-tests` job runs `python -m pytest -q` on every push/PR — a red test suite blocks merge to `main`. Frontend has `frontend-typecheck` and (per the job list) a lint job, but no automated frontend test execution.

## Recommended priorities (synthesized from `tests/README.md`'s original priority list, adjusted for what's already covered)

1. **Remaining `core/services/*` files without tests** — business logic is the most critical path; each is a pure-ish unit once its repository dependency is faked/in-memory.
2. **`formats/yamldump.py` and `formats/xlsxwriter.py`** — byte-for-byte correctness of generated output directly affects the product's core value proposition.
3. **Repository coverage beyond SQLite device** — at minimum bandwidth/subnet/tag/list/history/audit repositories, using a temp SQLite file per test.
4. **A frontend test harness** — currently zero automated frontend tests exist; even a thin smoke-test layer (React Testing Library or Playwright against `make serve`) would catch regressions `tsc`/`next lint` can't.
5. **`tests/migrations/`** — expand beyond baseline to cover the auth/security migration (`0002_auth_and_security.py`) and future migrations' upgrade/downgrade pairs.

## See also

[Engineering Wiki](Engineering Wiki.md) · [Technical Debt](Technical Debt.md) · [Development Setup](../deployment/Development Setup.md)
