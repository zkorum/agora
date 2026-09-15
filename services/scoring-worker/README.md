# Scoring Worker

Background worker that runs [Solidago](https://solidago.tournesol.app/) to produce community rankings from BWS (Best-Worst Scaling) comparisons.

## How It Works

When a user submits a BWS comparison, the API:

1. Upserts `maxdiff_result` JSONB and diffs normalized `maxdiff_comparison` rows under the participant's result-row lock. Appends insert only new rows; edits/removals soft-delete changed rows; retries preserve unchanged rows.
2. Marks the conversation "dirty" in a Valkey sorted set (score = comparison count, used as priority heuristic)

The worker polls that set and processes conversations in batches:

1. **ZPOPMIN** a batch of dirty conversation IDs
2. **Acquire advisory locks** so only one worker processes each conversation
3. **Batch SELECT** revisions, current items, survey-eligible comparisons, and totals from one short repeatable-read snapshot on PostgreSQL primary
4. **Parallel Solidago** via `ThreadPoolExecutor` (no DB during scoring)
5. **Recheck invalidations** under a brief configuration-row lock. New votes may follow the captured input revision; edits, removals, item changes, and eligibility changes invalidate older computations.
6. **Publish each conversation atomically**: scores, immutable item/count snapshots, checkpoints, processed revision, and SSE outbox event commit together. Invalidating one conversation does not reject the other conversations in the batch. Already-processed revisions are skipped.
7. **Prune unpublished history** while retaining the baseline, latest snapshot, and every checkpoint

Failed computations are re-added to the dirty set with the configured per-conversation retry delay. A periodic reconciliation pass (default 300s) catches any conversations missed after a crash.

`scoring_input_revision` advances for every scoring-input change.
`scoring_invalidation_revision` records the input revision of the latest change
that invalidates earlier computations. A publication may lag new votes, but must
include the last invalidating change and advance `processed_scoring_input_revision`.
If new votes arrived during computation, the worker requeues the conversation
after committing; the remaining revision gap also makes it discoverable by
reconciliation. Input snapshots are released before computation, so scoring
does not hold a long-running database transaction or block voting.

Deploy migrations `V0089` and `V0089.1` before starting the updated API and worker.
`V0089.2` repairs older double-encoded JSON score backups; new writes pass native
JSON values to SQLAlchemy. Scores themselves are unchanged by this backfill.

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
         reconciliation read │ current reads/writes
                          ▼   ▼
                        PostgreSQL
```

## Scoring Pipeline

### Native Best-Worst Learning

The live BWS worker fits each participant's observed best-worst tasks using
`SequentialMaxDiffLearning`: choose the best item from the set, then the worst
from the remaining items. It does not expand transitive inferences into synthetic
votes. The fitted per-user scores and uncertainties feed Solidago's voting-rights
and aggregation stages. The separate pairwise scoring entry point consumes
explicit `PairwiseObservation` values.

### Solidago Configuration

The pipeline (`scoring.py`) uses these parameters:

| Stage               | Implementation                                           | Key Parameters                                                    |
| ------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| Trust propagation   | Identity (pass-through)                                  | Preserves pre-set trust scores (default 1.0)                      |
| Preference learning | `SequentialMaxDiffLearning` | `prior_std_dev=7.0`, `convergence_error=1e-5`                     |
| Voting rights       | AffineOvertrust                                          | `privacy_penalty=0.5`, `min_overtrust=2.0`, `overtrust_ratio=0.1` |
| Scaling             | None                                                     |                                                                   |
| Aggregation         | EntitywiseQrQuantile                                     | `quantile=0.5` (median), `lipschitz=0.1`                          |

`ranking_score`, `ranking_score_entity.score`, and per-user `score` retain raw
model units and uncertainties. The worker also stores `display_score` for both
community and personal scores. It reuses Solidago's `Squash(score_max=1)` and
shifts the result from (-1, 1) to (0, 1). The API reads those values directly;
the frontend formats them as whole-number percentages. These express score
position on the fixed scale, not participant support. No per-conversation
min–max normalization or additional uncertainty penalty is applied.

New statistics snapshots and frozen lifecycle scores reference their immutable
`ranking_score` result, so their raw score provenance is retained.

### Deploying the fixed display scale

See [DEPLOYMENT.md](DEPLOYMENT.md) for the complete PR #1258 rollout, including
private configuration files, all migration versions, manual/container backfill
commands, replica verification, service order, and historical compatibility.

1. Pause ranking/lifecycle writes, drain the API, stop all old scoring workers,
   and apply the API's `pnpm db:migrate` through V0090.
2. From `services/scoring-worker`, run:

   ```bash
   uv sync --locked
   uv run --locked python scripts/backfill_display_scores.py
   ```

   This uses the worker's existing primary database configuration. It fills only
   missing display values in bounded batches using the native Solidago transform,
   and links current snapshots while holding their configuration-row locks.
   Raw values, votes, ranks, and scoring input revisions are preserved.
3. Verify the backfill and replica, start the updated scoring worker and API,
   and deploy/reload the rebuilt Agora frontend.

The backfill is resumable and safe to rerun. A nonzero
`current_snapshots_skipped` means those snapshots could not be linked safely and
should be investigated before completing deployment. Older checkpoints and
lifecycle snapshots without raw-score provenance retain their ranks/counts, but
show no fixed-scale score. Their original spread cannot be recovered from the
old min–max values alone; the backfill does not guess it from timestamps or ranks.

### COCM Voting Rights (partially implemented)

[COCM](https://ssrn.com/abstract=4311507) (Connection-Oriented Cluster Match) provides collusion-resistant voting by attenuating the influence of socially connected voters. The core algorithm is implemented in `src/scoring_worker/cocm_voting.py`:

```
voting_right = trust / sqrt(1 + connected_co_scorers)
```

Where `connected_co_scorers` = number of other voters on the same entity who share at least one group with this voter. This gives O(sqrt) collective influence for groups of connected voters.

**What exists:**

- `COCMVotingRights` class with friend matrix construction from group sources (`src/scoring_worker/cocm_voting.py`)
- `build_friend_matrix` using binary K function (any shared group = connected)
- Tests in `test_cocm_voting.py`

**What remains:**

- Connect the live worker to the implemented optional COCM path in `score_comparisons`. The live worker currently uses `AffineOvertrust` with uniform `trust_score=1.0`.
- Feed group source data (e.g., organization memberships, verification levels) into the pipeline
- Set per-user trust scores based on verification level (currently hardcoded to 1.0). Possible scheme: Rarimo (ZK proof of personhood) > phone OTP > email-only > guest, with configurable weights per conversation or organization

## Modules

| Module                | Purpose                                                    |
| --------------------- | ---------------------------------------------------------- |
| `worker.py`           | Main loop: poll, batch, score, write                       |
| `config.py`           | Settings via `pydantic-settings` (env vars)                |
| `db.py`               | SQLAlchemy queries (batch reads + writes)                  |
| `scoring.py`          | Native BWS and pairwise Solidago pipelines |
| `maxdiff_sequential.py` | Per-user sequential MaxDiff fitting |
| `observations.py`     | Filter native BWS tasks and map explicit pairwise observations |
| `entity_mapping.py`   | Map slug IDs to contiguous integer indices for Solidago    |
| `valkey_client.py`    | Valkey sorted set operations (ZPOPMIN, mark dirty)         |
| `generated_models.py` | SQLAlchemy models auto-generated from Drizzle schema       |

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

# Run through repository-root durable log capture
cd ../.. && make dev-scoring-worker

# Run tests
make test

# Lint
make lint

# Type check
make typecheck
```

The root `make dev-scoring-worker` target runs the worker with unbuffered Python output and writes `.local/logs/latest/scoring-worker.log`.

## Offline ranking-quality checks

```bash
uv run python scripts/evaluate_bws_quality.py --items 40 --participants 100 --seeds 0 1 2
```

This measures the production BWS learner and aggregation with fixed, seeded task
sets across unanimous, reversed, noisy, majority, polarized, and sparse cases.
It does not access the database or exercise adaptive API routing. Use the k6
strategies in `services/load-testing/PERFORMANCE.md` for end-to-end ranking
evaluation. Polarized populations have no single reference order, so their
recovery metrics are omitted. `--output <path>` saves the complete JSON report.

## Configuration

All settings are read from environment variables with the `SCORING_WORKER_` prefix:

| Variable                                    | Default                   | Description                                |
| ------------------------------------------- | ------------------------- | ------------------------------------------ |
| `SCORING_WORKER_CONNECTION_STRING`          | (required)                | PostgreSQL primary DSN                     |
| `SCORING_WORKER_CONNECTION_STRING_READ`     | same as primary           | Read replica DSN                           |
| `SCORING_WORKER_VALKEY_URL`                 | `valkey://localhost:6379` | Valkey connection URL                      |
| `SCORING_WORKER_POLL_INTERVAL_SECONDS`      | `1.0`                     | Seconds between polls when idle            |
| `SCORING_WORKER_BATCH_SIZE`                 | `50`                      | Max conversations per poll cycle           |
| `SCORING_WORKER_MAX_WORKERS`                | `4`                       | Thread pool size for parallel scoring      |
| `SCORING_WORKER_RECONCILE_INTERVAL_SECONDS` | `300`                     | Seconds between DB reconciliation passes   |
| `SCORING_WORKER_BACKOFF_SECONDS`            | `10.0`                    | Per-conversation retry delay after failure |

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

The optional GPU build enables `LBFGSUniformGBT` for the separate pairwise path
when `torch` is available. Both builds use the same native BWS learner.

## Scaling

Multiple identical workers can share the same Valkey sorted set. `ZPOPMIN` claims
queue entries; PostgreSQL advisory locks additionally prevent overlapping work
when new votes requeue a conversation already being scored. Monitor `ZCARD` on
the dirty set for queue depth. When scaling beyond a single worker, the periodic
reconciliation should move to a dedicated service to avoid redundant DB queries.

## Schema Sync

The SQLAlchemy models in `generated_models.py` are auto-generated from the Drizzle schema. To regenerate after a schema change:

```bash
# From repository root
make sync-python-artifacts
```

## License

AGPL-3.0. See [COPYING](./COPYING).
