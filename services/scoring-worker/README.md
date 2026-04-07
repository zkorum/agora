# Scoring Worker

Background worker that runs [Solidago](https://solidago.tournesol.app/) to produce community rankings from MaxDiff (Best-Worst Scaling) comparisons.

## How It Works

When a user submits a MaxDiff comparison, the API:
1. Writes the comparison to PostgreSQL (sync upsert to `maxdiff_result` JSONB + normalized rows in `maxdiff_comparison`)
2. Marks the conversation "dirty" in a Valkey sorted set (score = comparison count, used as priority heuristic)

The worker polls that set and processes conversations in batches:
1. **ZPOPMIN** a batch of dirty conversation IDs (atomic, safe for multi-worker)
2. **Batch SELECT** all active items and comparisons from the read replica
3. **Update counters** (participant/vote counts on the conversation)
4. **Parallel Solidago** via `ThreadPoolExecutor` (no DB during scoring)
5. **Batch WRITE** scores back to PostgreSQL primary in one transaction

Failed conversations are re-added to the dirty set with per-conversation exponential backoff. A periodic reconciliation pass (default 300s) catches any conversations missed after a crash.

## Architecture

```
API (Fastify) ──sync upsert──▸ PostgreSQL
      │
      └──mark dirty──▸ Valkey sorted set
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

## Scoring Pipeline

### BWS-to-Pairwise Conversion

Each MaxDiff vote (pick best and worst from a set of 4) is expanded into multiple pairwise orderings via **transitive closure**. For example, `best=A, worst=C, set=[A,B,C,D]` produces:
- A beats B, C, D (best beats all)
- B, D beat C (all beat worst)
- Plus any transitive inferences (if prior votes established B > D, that carries forward)

A per-user comparison matrix tracks all orderings. Typical expansion is 5-20x (e.g., 10 BWS votes produce 50-200 pairwise wins). This is implemented in `bws_conversion.py` using a Bron-Kerbosch maximal clique algorithm.

### Solidago Configuration

The pipeline (`scoring.py`) uses these parameters:

| Stage | Implementation | Key Parameters |
|---|---|---|
| Trust propagation | Identity (pass-through) | Preserves pre-set trust scores (default 1.0) |
| Preference learning | `UniformGBT` by default, `LBFGSUniformGBT` in GPU builds | `prior_std_dev=7.0`, `convergence_error=1e-5` |
| Voting rights | AffineOvertrust | `privacy_penalty=0.5`, `min_overtrust=2.0`, `overtrust_ratio=0.1` |
| Scaling | None | |
| Aggregation | EntitywiseQrQuantile | `quantile=0.5` (median), `lipschitz=0.1` |

Raw scores are normalized to [0, 1] before storage.

### COCM Voting Rights (partially implemented)

[COCM](https://ssrn.com/abstract=4311507) (Connection-Oriented Cluster Match) provides collusion-resistant voting by attenuating the influence of socially connected voters. The core algorithm is implemented in `services/python-bridge/cocm_voting.py`:

```
voting_right = trust / sqrt(1 + connected_co_scorers)
```

Where `connected_co_scorers` = number of other voters on the same entity who share at least one group with this voter. This gives O(sqrt) collective influence for groups of connected voters.

**What exists:**
- `COCMVotingRights` class with friend matrix construction from group sources (`services/python-bridge/cocm_voting.py`)
- `build_friend_matrix` using binary K function (any shared group = connected)
- Tests in `test_cocm_voting.py`

**What remains:**
- Integrate COCM into the scoring pipeline (currently uses `AffineOvertrust` with uniform `trust_score=1.0` for all users). The `cocm_voting.py` module is already in the scoring worker.
- Feed group source data (e.g., organization memberships, verification levels) into the pipeline
- Replace or compose `AffineOvertrust` with COCM-derived per-user-per-entity voting rights
- Set per-user trust scores based on verification level (currently hardcoded to 1.0). Possible scheme: Rarimo (ZK proof of personhood) > phone OTP > email-only > guest, with configurable weights per conversation or organization

## Modules

| Module | Purpose |
|---|---|
| `worker.py` | Main loop: poll, batch, score, write |
| `config.py` | Settings via `pydantic-settings` (env vars) |
| `db.py` | SQLAlchemy queries (batch reads + writes) |
| `scoring.py` | Solidago wrapper (BWS-to-pairwise, scoring, normalization) |
| `bws_conversion.py` | Transitive closure, comparison matrix, Bron-Kerbosch |
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
uv sync --extra dev

# Optional: install the GPU preference-learning stack locally
uv sync --extra dev --extra gpu

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
# Build the default CPU image
make image-buildx

# Build the optional GPU image
make image-buildx-gpu

# Run
docker run --rm \
  -e SCORING_WORKER_CONNECTION_STRING=postgres://... \
  -e SCORING_WORKER_VALKEY_URL=valkey://... \
  quay.io/zkorum/agora-scoring-worker:latest
```

`image-buildx` installs the base project and uses `UniformGBT`.
`image-buildx-gpu` installs `.[gpu]` and enables `LBFGSUniformGBT` when `torch` is available.

## Scaling

Multiple identical workers can share the same Valkey sorted set. `ZPOPMIN` is atomic, so no coordination is needed. Monitor `ZCARD` on the dirty set for queue depth. When scaling beyond a single worker, the periodic reconciliation should move to a dedicated service to avoid redundant DB queries.

## Schema Sync

The SQLAlchemy models in `generated_models.py` are auto-generated from the Drizzle schema. To regenerate after a schema change:

```bash
# From repository root
make sync-python-models
```

## License

AGPL-3.0. See [COPYING](./COPYING).
