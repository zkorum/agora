# Math Updater

Python worker that computes opinion-group analysis for Agora conversations.

## Overview

The math-updater consumes dirty conversation IDs from Valkey, claims due work in PostgreSQL, builds immutable input snapshots, runs `red-dwarf` locally, and persists opinion-group analysis results. It also optionally generates and translates opinion-group labels and summaries.

## Responsibilities

- Consume due conversation IDs from the `analysis:dirty` Valkey sorted set.
- Claim and lease analysis work in PostgreSQL.
- Build input snapshots from conversation opinions and votes.
- Run `red-dwarf` locally for Polis-style opinion-group analysis.
- Persist analysis results, candidates, group membership, representative opinions, and opinion metrics.
- Retry retryable failures and mark non-retryable work states.
- Recover expired running work leases.
- Optionally generate AWS Bedrock labels/summaries and Google Cloud translations.

## Configuration

Environment variables use the `MATH_UPDATER_` prefix.

| Variable | Default | Description |
|---|---|---|
| `MATH_UPDATER_CONNECTION_STRING` | Required | PostgreSQL primary DSN |
| `MATH_UPDATER_CONNECTION_STRING_READ` | Same as primary | PostgreSQL read replica DSN |
| `MATH_UPDATER_VALKEY_URL` | `valkey://localhost:6379` | Valkey connection URL |
| `MATH_UPDATER_VALKEY_POP_BATCH_SIZE` | `50` | Max Valkey items popped per cycle |
| `MATH_UPDATER_DB_CLAIM_BATCH_SIZE` | `8` | Max DB work items claimed per cycle |
| `MATH_UPDATER_DB_WRITE_BATCH_SIZE` | `10` | Max results persisted per DB batch |
| `MATH_UPDATER_MAX_COMPUTE_CONCURRENCY` | `4` | Max concurrent analysis computations |
| `MATH_UPDATER_LEASE_TTL_SECONDS` | `600` | DB work lease TTL |
| `MATH_UPDATER_HEARTBEAT_INTERVAL_SECONDS` | `30` | Lease heartbeat cadence |
| `MATH_UPDATER_WORKER_POLL_IDLE_SLEEP_SECONDS` | `0.5` | Idle sleep between poll cycles |
| `MATH_UPDATER_DEFAULT_DEBOUNCE_SECONDS` | `5` | Default dirty-work debounce |
| `MATH_UPDATER_RECONCILIATION_INTERVAL_SECONDS` | `60` | DB-to-Valkey reconciliation cadence |
| `MATH_UPDATER_RUNNING_RECOVERY_INTERVAL_SECONDS` | `60` | Expired lease recovery cadence |

AI label and summary generation is disabled by default and configured with `MATH_UPDATER_AWS_AI_LABEL_SUMMARY_*` variables. Translation is configured with `MATH_UPDATER_GOOGLE_*` variables and optional AWS Secrets Manager credentials. Translation requires AI label/summary generation to be enabled.

See `env.example` for a local template.

## Generated Artifacts

The worker uses generated Python artifacts:

- `generated_models.py` from `services/shared-backend/src/schema.ts`.
- `generated_shared_types.py` from `services/shared/src` constants.

Regenerate from the repository root:

```bash
make sync-python-artifacts
```

## Development

```bash
uv sync --extra dev
uv run python -m math_updater.worker
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

## Related Services

- [`api`](../api): creates dirty analysis work and serves analysis results.
- [`import-worker`](../import-worker): imports conversations and wakes analysis by adding to `analysis:dirty`.
- [`scoring-worker`](../scoring-worker): computes MaxDiff community rankings.
- [`shared-backend`](../shared-backend): source schema for generated SQLAlchemy models.

## License

AGPL-3.0. See [COPYING](./COPYING).

## Contributing

Contributions must comply with the [Fiduciary Licensing Agreement (FLA)](https://cla-assistant.io/zkorum/zkorum).
