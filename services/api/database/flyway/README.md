# Flyway migrations

`pnpm db:migrate` mounts this directory at `/flyway/sql`. Flyway executes
versioned migrations in numeric order, including fractional backfills such as
`V0116.2` before `V0116.10`. Keep required `.sql.conf` sidecars beside their
scripts.

See [the V0116 runbook](COORDINATED_UPGRADE.md) for the backfill sequence,
session-lock requirement, and rollout gates. Deferred SQL belongs in
[`../post_migration/`](../post_migration/), outside Flyway's recursive scan.
