# Secrets & Configuration

Parent: [Security Overview](Security Overview.md) · [Deployment Overview](../deployment/Deployment Overview.md)

Configuration is layered, in increasing priority: built-in defaults -> YAML config file (`--config`) -> environment variables (highest priority, overrides both).

## Authentication & security (`CONFIGFOUNDRY_AUTH_*`)

| Variable | Default | Notes |
|---|---|---|
| `CONFIGFOUNDRY_AUTH_JWT_SECRET` | random per boot | **Set in production** — unset means every restart invalidates every session |
| `CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY` | random per boot | base64, 32 bytes. **Set in production** — unset means every restart makes existing MFA enrollments undecryptable |
| `CONFIGFOUNDRY_AUTH_ACCESS_TTL_MIN` | `15` | Access token lifetime (minutes) |
| `CONFIGFOUNDRY_AUTH_REFRESH_TTL_DAYS` | `14` | Refresh token lifetime (days) |
| `CONFIGFOUNDRY_AUTH_ARGON2_TIME_COST` | `3` | Argon2id time cost |
| `CONFIGFOUNDRY_AUTH_ARGON2_MEMORY_COST_KB` | `65536` | Argon2id memory cost |
| `CONFIGFOUNDRY_AUTH_ARGON2_PARALLELISM` | `4` | Argon2id parallelism |
| `CONFIGFOUNDRY_AUTH_PASSWORD_MIN_LENGTH` | `12` | Minimum password length |
| `CONFIGFOUNDRY_AUTH_LOCKOUT_THRESHOLD` | `5` | Failed logins before lockout |
| `CONFIGFOUNDRY_AUTH_LOCKOUT_MINUTES` | `15` | Lockout duration |
| `CONFIGFOUNDRY_AUTH_MFA_REQUIRED_ROLES` | unset | Comma-separated role names required to enroll MFA |
| `CONFIGFOUNDRY_AUTH_SESSION_IDLE_MINUTES` | `30` | Idle session timeout |
| `CONFIGFOUNDRY_AUTH_RATE_LIMIT_LOGIN` | `10/60` | `<count>/<window-seconds>` for `/auth/login`, `/auth/mfa/*` |
| `CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES` | unset | CIDRs allowed to set `X-Forwarded-For` |
| `CONFIGFOUNDRY_AUTH_CORS_ORIGINS` | unset (closed) | Allowed cross-origin origins |
| `CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL` | `admin@configfoundry.local` | First Super Admin email |
| `CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD` | random, printed once | First Super Admin password |

> [!IMPORTANT]
> Minimum production setup:
> ```bash
> export CONFIGFOUNDRY_AUTH_JWT_SECRET="$(openssl rand -base64 48)"
> export CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY="$(openssl rand -base64 32)"
> export CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL="admin@yourcompany.example"
> export CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD="$(openssl rand -base64 24)"
> export CONFIGFOUNDRY_AUTH_CORS_ORIGINS="https://configfoundry.yourcompany.example"
> ```
> Generate both secrets once, store in a secrets manager, reuse on every restart. Rotating `JWT_SECRET` deliberately logs everyone out; rotating `SECRET_ENC_KEY` makes existing MFA enrollments undecryptable — treat it as a one-way door.

## Storage (`CONFIGFOUNDRY_DB_*`)

| Variable | Field | Default |
|---|---|---|
| `CONFIGFOUNDRY_DB_PROVIDER` | `provider` | `sqlite` |
| `CONFIGFOUNDRY_DB_SQLITE_PATH` | `sqlite_path` | `db/configfoundry.db` |
| `CONFIGFOUNDRY_DB_CONNECTION_URL` | `connection_url` | — (required for non-SQLite) |
| `CONFIGFOUNDRY_DB_POOL_SIZE` | `pool_size` | `5` |
| `CONFIGFOUNDRY_DB_MAX_OVERFLOW` | `max_overflow` | `10` |
| `CONFIGFOUNDRY_DB_ECHO` | `echo` | `false` |

## Logging (`CONFIGFOUNDRY_LOG_*`)

See [Logging Framework](../architecture/Logging Framework.md) for the full table (`LEVEL`, `FILE`, `CONSOLE`, `JSON`, `ROTATION`, `BACKUP_COUNT`, `MAX_BYTES`).

## Datadog (`DD_*`)

Read from `.env` at process start by `ddtrace-run` / the frontend's `dd-trace`: `DD_SERVICE` (injected per-launcher, not in `.env`, since backend and frontend need different service names), `DD_ENV`, `DD_VERSION`, `DD_AGENT_HOST`, `DD_TRACE_AGENT_PORT`, `DD_LOGS_INJECTION`, `DD_PROFILING_ENABLED`, plus frontend-exposed `NEXT_PUBLIC_DD_CLIENT_TOKEN` / `NEXT_PUBLIC_DD_APPLICATION_ID`. See [Datadog APM](../integrations/Datadog APM.md).

## CLI flags (`server.py`)

| Flag | Default | Description |
|---|---|---|
| `--db PATH` | `db/configfoundry.db` | SQLite path shortcut |
| `--config YAML_FILE` | — | Full `AppConfig` YAML file |
| `--port PORT` | `8420` | Listen port |
| `--host HOST` | `0.0.0.0` | Listen interface |
| `--no-browser` | off | Don't auto-open a browser tab |

## See also

[Security Overview](Security Overview.md) · [Production Deployment](../deployment/Production Deployment.md) · [Database Overview](../architecture/Database Overview.md)
