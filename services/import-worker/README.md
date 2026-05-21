# Import Worker

Python worker that consumes conversation import jobs from Valkey and imports Polis URLs or CSV archives into the Agora database.

## Responsibilities

- Consume import requests from `queue:imports`.
- Import remote Polis conversations via `red-dwarf`.
- Parse and validate CSV imports.
- Persist imported conversations, users, opinions, and votes.
- Update `conversation_import` status rows.
- Persist import notifications and publish fanout events to `queue:imports:events` for the API SSE bridge.
- Clean up stale imports by marking them failed.

The API remains responsible for auth, request validation, creating import rows, enqueueing jobs, and broadcasting worker events to connected clients.

## Configuration

Environment variables use the `IMPORT_WORKER_` prefix.

| Variable | Default | Description |
|---|---|---|
| `IMPORT_WORKER_CONNECTION_STRING` | Required | PostgreSQL primary DSN |
| `IMPORT_WORKER_CONNECTION_STRING_READ` | Same as primary | PostgreSQL read replica DSN |
| `IMPORT_WORKER_VALKEY_URL` | `valkey://localhost:6379` | Valkey connection URL |
| `IMPORT_WORKER_FLUSH_INTERVAL_MS` | `1000` | Poll interval |
| `IMPORT_WORKER_MAX_BATCH_SIZE` | `4` | Max queue items per flush |
| `IMPORT_WORKER_MAX_CONCURRENCY` | `2` | Max concurrent import jobs |
| `IMPORT_WORKER_STALE_THRESHOLD_MS` | `300000` | Age after which in-progress imports are marked stale |
| `IMPORT_WORKER_STALE_CLEANUP_EVERY_N_FLUSHES` | `60` | Stale cleanup cadence |

## Generated Artifacts

The worker uses generated Python artifacts:

- `generated_models.py` from `services/shared-backend/src/schema.ts`.
- `generated_shared_types.py` from `services/shared/src` constants.
- `generated_import_contracts.py` from API Zod import queue contracts.

Regenerate from the repository root:

```bash
make sync-python-artifacts
```

## Development

```bash
uv sync --extra dev
uv run python -m import_worker.worker
```

Useful checks:

```bash
uv run --extra dev ruff check
uv run --extra dev basedpyright
uv run --extra dev pytest -v
```

## Docker

```bash
make image-buildx
```

## License

AGPL-3.0. See [COPYING](./COPYING).
