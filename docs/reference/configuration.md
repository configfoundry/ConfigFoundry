# Configuration Reference

ConfigFoundry is configured through three layers, in increasing priority:

1. **Built-in defaults** — safe enough to run, not necessarily what you
   want in production (e.g. an auto-generated JWT secret that changes on
   every restart, which invalidates all sessions — fine for a laptop demo,
   wrong for anything long-lived).
2. **A YAML config file**, passed via `--config`.
3. **Environment variables**, which override both.

```bash
python3 server.py --config /etc/configfoundry/config.yaml
python3 server.py --db /path/to/configfoundry.db   # shortcut for SQLite-only
```

## Storage

| Setting | Env var | Default | Notes |
|---|---|---|---|
| Provider | (in YAML `database.provider`) | `sqlite` | `sqlite`, `postgresql`, `mysql`, `sqlserver` — see [Storage](../architecture/storage.md) |
| SQLite path | `--db` flag or YAML `database.sqlite_path` | `db/configfoundry.db` | |
| Connection URL | YAML `database.connection_url` | — | Required for non-SQLite providers |
| Pool size | YAML `database.pool_size` | provider default | |

## Authentication & security (`CONFIGFOUNDRY_AUTH_*`)

All of these come from `core/security/config.py::SecurityConfig`. Every
one has a safe default; the ones marked **set this in production** are
the only ones you need to think about before going live.

| Env var | Default | Description |
|---|---|---|
| `CONFIGFOUNDRY_AUTH_JWT_SECRET` | random, regenerated each boot | HMAC signing secret for access tokens. **Set this in production** — an unset secret means every restart invalidates every session. |
| `CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY` | random, regenerated each boot | Base64-encoded 32-byte AES-256-GCM key encrypting MFA seeds at rest. **Set this in production** — an unset key means every restart makes existing users' MFA enrollment undecryptable, forcing re-enrollment. |
| `CONFIGFOUNDRY_AUTH_ACCESS_TTL_MIN` | `15` | Access token lifetime, minutes |
| `CONFIGFOUNDRY_AUTH_REFRESH_TTL_DAYS` | `14` | Refresh token lifetime, days |
| `CONFIGFOUNDRY_AUTH_ARGON2_TIME_COST` | `3` | Argon2id time cost |
| `CONFIGFOUNDRY_AUTH_ARGON2_MEMORY_COST_KB` | `65536` (64 MiB) | Argon2id memory cost |
| `CONFIGFOUNDRY_AUTH_ARGON2_PARALLELISM` | `4` | Argon2id parallelism |
| `CONFIGFOUNDRY_AUTH_PASSWORD_MIN_LENGTH` | `12` | Minimum password length |
| `CONFIGFOUNDRY_AUTH_LOCKOUT_THRESHOLD` | `5` | Failed logins before account lockout |
| `CONFIGFOUNDRY_AUTH_LOCKOUT_MINUTES` | `15` | Lockout duration |
| `CONFIGFOUNDRY_AUTH_MFA_REQUIRED_ROLES` | unset | Comma-separated role names that must enroll MFA |
| `CONFIGFOUNDRY_AUTH_SESSION_IDLE_MINUTES` | `30` | Idle session timeout |
| `CONFIGFOUNDRY_AUTH_RATE_LIMIT_LOGIN` | `10/60` | `<count>/<window-seconds>` for `/auth/login` and `/auth/mfa/*` |
| `CONFIGFOUNDRY_AUTH_TRUSTED_PROXIES` | unset | Comma-separated CIDRs allowed to set `X-Forwarded-For` — see [Deployment](../deployment/deployment.md) |
| `CONFIGFOUNDRY_AUTH_CORS_ORIGINS` | unset (no cross-origin access) | Comma-separated allowed origins |
| `CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL` | `admin@configfoundry.local` | Initial Super Admin email (applied once, at first migration) |
| `CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD` | randomly generated, printed once | Initial Super Admin password |

> [!IMPORTANT]
> **Set this in production**, at minimum:
>
> ```bash
> export CONFIGFOUNDRY_AUTH_JWT_SECRET="$(openssl rand -base64 48)"
> export CONFIGFOUNDRY_AUTH_SECRET_ENC_KEY="$(openssl rand -base64 32)"
> export CONFIGFOUNDRY_AUTH_BOOTSTRAP_EMAIL="admin@yourcompany.example"
> export CONFIGFOUNDRY_AUTH_BOOTSTRAP_PASSWORD="$(openssl rand -base64 24)"
> export CONFIGFOUNDRY_AUTH_CORS_ORIGINS="https://configfoundry.yourcompany.example"
> ```

> [!CAUTION]
> Generate both secrets once, store them in your secrets manager, and
> reuse the same values on every restart — rotating `JWT_SECRET`
> deliberately logs everyone out (sometimes exactly what you want, e.g.
> after a suspected compromise); rotating `SECRET_ENC_KEY` makes existing
> MFA enrollments undecryptable, so treat it as a one-way door.

## Logging

See [Logging](../architecture/logging.md) for the full `LoggingConfig` reference
(log level, file rotation, JSON vs. human-readable format).

## CLI flags (`server.py`)

| Flag | Default | Description |
|---|---|---|
| `--db PATH` | `db/configfoundry.db` | SQLite path shortcut (overrides `--config`'s `sqlite_path` if both given) |
| `--config YAML_FILE` | — | Full `AppConfig` YAML file |
| `--port PORT` | `8420` | Listen port |
| `--host HOST` | `0.0.0.0` | Listen interface |
| `--no-browser` | off | Don't auto-open a browser tab on startup |

## YAML config file shape

```yaml
database:
  provider: postgresql
  connection_url: "postgresql://configfoundry:${DB_PASSWORD}@db.internal:5432/configfoundry"
  pool_size: 10

logging:
  level: INFO
  format: json
  file: /var/log/configfoundry/app.log

security:
  # Any CONFIGFOUNDRY_AUTH_* field can also be set here, in snake_case,
  # without the prefix -- environment variables still take priority.
  jwt_secret: "${JWT_SECRET}"          # ${VAR} is expanded from the process environment
  access_ttl_min: 15
```

See `core/storage/config.py::AppConfig.from_yaml` for the authoritative
schema — every `AppConfig` field is settable this way.
