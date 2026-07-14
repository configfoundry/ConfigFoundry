# db/

Default location for ConfigFoundry's SQLite database. This file exists so
the directory itself is tracked in git — a fresh clone needs `db/` to
already exist, since SQLite does not create parent directories on its own.

## Default database

`configfoundry.db` is created here automatically the first time
`server.py` starts with no `--db` flag, and every pending migration is
applied before the server starts serving requests:

```bash
python3 server.py
# opens db/configfoundry.db
```

## Using a custom path

Point `--db` at any writable file path — a shared network drive, a
container volume, a different local path:

```bash
python3 server.py --db /mnt/shared/configfoundry.db
```

The database file does not need to exist beforehand, as long as its
parent directory does.

## Schema

The schema is defined and evolved entirely through Alembic migrations in
`alembic/versions/`, applied automatically at startup. Never modify the
database by hand — add a new migration instead. See
[Migrations](../docs/architecture/migrations.md).

## Backups

See [Storage § Backups](../docs/architecture/storage.md#backups).

## Git

Everything under `db/` except this README is excluded from version
control (see `.gitignore`) — the `.db`, `.db-wal`, and `.db-shm` files
are runtime artifacts, not source.
