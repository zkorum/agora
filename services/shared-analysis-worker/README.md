# Analysis Worker Shared

Shared Python package for Agora analysis and description workers.

This package contains DB models, generated shared constants, Valkey queue helpers, retry state logic, AI description/translation provider helpers, and red-dwarf analysis glue used by `math-updater`, `ai-description-retry-worker`, and `description-translation-retry-worker`.

Python workers share code in two ways:

- Reusable Python implementation lives here under `src/agora_analysis_worker_shared/` and is imported as the editable `agora-shared-analysis-worker` package by worker services.
- Generated files under `src/agora_analysis_worker_shared/generated_*.py` are produced from TypeScript sources in `services/shared` and `services/shared-backend/src/schema.ts`.

Do not hand-edit generated files. Edit the TypeScript source schema/types or the reusable Python implementation, depending on what needs to change.

Generated artifacts are synced here from the repository root:

```bash
make sync-python-artifacts
```

Useful checks:

```bash
uv run --extra dev ruff check
uv run --extra dev basedpyright
uv run --extra dev pytest -v
```

## PostgreSQL connections

`postgres_engine.py` supplies the shared psycopg connection policy used by the
math updater and both description retry workers. PostgreSQL URL schemes
`postgres://`, `postgresql://`, and `postgresql+psycopg://` use psycopg 3. URL
normalization preserves credentials and TLS parameters.

Defaults (explicit DSN query parameters take precedence):

| libpq parameter | Default | Purpose |
| --- | --- | --- |
| `connect_timeout` | 10 seconds | Connection establishment, per host |
| `keepalives` | 1 | Enable TCP keepalives |
| `keepalives_idle` | 15 seconds | Idle time before probing |
| `keepalives_interval` | 5 seconds | Interval between probes |
| `keepalives_count` | 3 | Unanswered probes before failure |
| `tcp_user_timeout` | 30000 milliseconds | Bound unacknowledged TCP data on supported systems |

Pool checkout waits at most 10 seconds for a slot. `pool_pre_ping` checks pooled
connections before reuse, while the network settings help detect a dead peer
during a ping, query, or rollback. These are distinct controls, not an absolute
wall-clock deadline for a whole transaction: DNS, multiple hosts, OS support, and
a live TCP peer with an unresponsive database can affect observed durations.

Ready engines set `application_name` from the worker log prefix and database role.
Callers can opt into statement and idle-transaction timeouts; the AI description
retry worker does so. Existing DSN `options` are preserved and applied after these
defaults. The math updater and translation retry worker retain their existing
server-side timeout policy.

Because this package is baked into worker images, connection-policy changes take
effect when each consuming service is rebuilt and redeployed.

## License

AGPL-3.0. See [COPYING](./COPYING).
