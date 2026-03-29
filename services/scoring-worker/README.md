# Scoring Worker

Background worker that runs [Tournesol's Solidago](https://github.com/tournesol-app/tournesol) algorithm to produce community rankings from MaxDiff (Best-Worst Scaling) comparisons.

## How It Works

The API writes a conversation ID into a Valkey sorted set ("dirty set") whenever a user submits a MaxDiff comparison. The worker polls that set and processes conversations in batches:

1. **ZPOPMIN** a batch of dirty conversation IDs from Valkey
2. **Batch SELECT** all active items and comparisons for those conversations
3. **Parallel Solidago** via `ThreadPoolExecutor` (CPU-bound, no DB during scoring)
4. **Batch WRITE** scores back to PostgreSQL in one transaction

Failed conversations are re-added to the dirty set with per-conversation exponential backoff. A periodic reconciliation pass catches any conversations that were missed (e.g., after a crash).

## Architecture

```
API (Fastify) ──mark_dirty──▸ Valkey sorted set
                                    │
                              ZPOPMIN batch
                                    ▼
                            ┌──────────────┐
                            │ scoring-worker│
                            │  (Python)     │
                            └──────┬───────┘
                      read replica │ primary
                            ▼      ▼
                          PostgreSQL
```

## Modules

| Module | Purpose |
|---|---|
| `worker.py` | Main loop: poll, batch, score, write |
| `config.py` | Settings via `pydantic-settings` (env vars) |
| `db.py` | SQLAlchemy queries (batch reads + writes) |
| `scoring.py` | Solidago wrapper (BWS-to-pairwise conversion, scoring) |
| `bws_conversion.py` | Best-Worst Scaling to pairwise comparison conversion |
| `entity_mapping.py` | Map slug IDs to contiguous integer indices for Solidago |
| `valkey_client.py` | Valkey sorted set operations (ZPOPMIN, mark dirty) |
| `generated_models.py` | SQLAlchemy models auto-generated from Drizzle schema |

## Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) (package manager)
- PostgreSQL (primary + optional read replica)
- Valkey (or Redis-compatible server)

## Development

```bash
# Install dependencies
uv sync --all-extras

# Run the worker
make dev

# Run tests
make test

# Lint
make lint

# Type check
make typecheck
```

## Configuration

All settings are read from environment variables with the `SCORING_WORKER_` prefix:

| Variable | Default | Description |
|---|---|---|
| `SCORING_WORKER_CONNECTION_STRING` | (required) | PostgreSQL primary DSN |
| `SCORING_WORKER_CONNECTION_STRING_READ` | same as primary | Read replica DSN |
| `SCORING_WORKER_VALKEY_URL` | `valkey://localhost:6379` | Valkey connection URL |
| `SCORING_WORKER_POLL_INTERVAL_SECONDS` | `1.0` | Seconds between polls when idle |
| `SCORING_WORKER_BATCH_SIZE` | `50` | Max conversations per poll cycle |
| `SCORING_WORKER_MAX_WORKERS` | `4` | Thread pool size for parallel scoring |
| `SCORING_WORKER_RECONCILE_INTERVAL_SECONDS` | `300` | Seconds between DB reconciliation passes |
| `SCORING_WORKER_BACKOFF_SECONDS` | `10.0` | Per-conversation retry delay after failure |

You can also place a `.env` file in the service directory.

## Docker

```bash
# Build
make image-buildx

# Run
docker run --rm \
  -e SCORING_WORKER_CONNECTION_STRING=postgres://... \
  -e SCORING_WORKER_VALKEY_URL=valkey://... \
  quay.io/zkorum/agora-scoring-worker:latest
```

## Scaling

Multiple identical workers can share the same Valkey sorted set. `ZPOPMIN` is atomic, so no coordination is needed. Monitor `ZCARD` on the dirty set for queue depth. When scaling beyond a single worker, the periodic reconciliation should move to a dedicated service to avoid redundant DB queries.

## Schema Sync

The SQLAlchemy models in `generated_models.py` are auto-generated from the Drizzle schema. To regenerate after a schema change:

```bash
cd services/shared-backend && pnpm run sync -- --target scoring-worker
```
