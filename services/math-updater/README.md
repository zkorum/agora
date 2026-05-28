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

| Variable                                         | Default                   | Description                          |
| ------------------------------------------------ | ------------------------- | ------------------------------------ |
| `MATH_UPDATER_CONNECTION_STRING`                 | Required                  | PostgreSQL primary DSN               |
| `MATH_UPDATER_CONNECTION_STRING_READ`            | Same as primary           | PostgreSQL read replica DSN          |
| `MATH_UPDATER_VALKEY_URL`                        | `valkey://localhost:6379` | Valkey connection URL                |
| `MATH_UPDATER_VALKEY_POP_BATCH_SIZE`             | `50`                      | Max Valkey items popped per cycle    |
| `MATH_UPDATER_DB_CLAIM_BATCH_SIZE`               | `8`                       | Max DB work items claimed per cycle  |
| `MATH_UPDATER_DB_WRITE_BATCH_SIZE`               | `10`                      | Max results persisted per DB batch   |
| `MATH_UPDATER_MAX_COMPUTE_CONCURRENCY`           | `4`                       | Max concurrent analysis computations |
| `MATH_UPDATER_LEASE_TTL_SECONDS`                 | `120`                     | DB work lease TTL                    |
| `MATH_UPDATER_HEARTBEAT_INTERVAL_SECONDS`        | `30`                      | Lease heartbeat cadence              |
| `MATH_UPDATER_WORKER_POLL_IDLE_SLEEP_SECONDS`    | `0.5`                     | Idle sleep between poll cycles       |
| `MATH_UPDATER_DEFAULT_DEBOUNCE_SECONDS`          | `5`                       | Default dirty-work debounce          |
| `MATH_UPDATER_RECONCILIATION_INTERVAL_SECONDS`   | `60`                      | DB-to-Valkey reconciliation cadence  |
| `MATH_UPDATER_RUNNING_RECOVERY_INTERVAL_SECONDS` | `60`                      | Expired lease recovery cadence       |

AI label and summary generation is disabled by default and configured with `MATH_UPDATER_AWS_AI_LABEL_SUMMARY_*` variables. Translation is configured with `MATH_UPDATER_AWS_DESCRIPTION_TRANSLATION_*`, `MATH_UPDATER_GOOGLE_*`, and optional AWS Secrets Manager credential variables. Translation requires AI label/summary generation to be enabled.

### Dev-only AI simulation

The worker can simulate AI description and translation providers for load-testing retry, fallback, and first-pass behavior without calling Bedrock or Google. This is dev-only. Config validation refuses to start the process unless `AGORA_DEV_MODE=true` is present.

The repository dev Make targets set `AGORA_DEV_MODE=true` automatically. Plain `uv run ...` does not imply dev mode.

Example:

```bash
AGORA_DEV_MODE=true
MATH_UPDATER_AWS_AI_LABEL_SUMMARY_ENABLE=false
MATH_UPDATER_AWS_DESCRIPTION_TRANSLATION_ENABLE=false
MATH_UPDATER_SIMULATION_PROVIDERS_ENABLE=true
MATH_UPDATER_AI_DESCRIPTION_SIMULATION_MODE=retryable_error_then_success
MATH_UPDATER_DESCRIPTION_TRANSLATION_SIMULATION_MODE=success
MATH_UPDATER_SIMULATION_RETRYABLE_FAILURE_ATTEMPTS=1
```

Simulation modes are `off`, `success`, `retryable_error`, `retryable_error_then_success`, and `non_retryable_error`.

Logs use the `[SimulationProvider]` prefix and also emit `AGORA_LOAD_EVENT` JSON markers. When services are launched through the root Make targets, marker payloads are written to files such as `.local/logs/latest/math-updater.events.jsonl`, `.local/logs/latest/ai-description-retry-worker.events.jsonl`, and `.local/logs/latest/description-translation-retry-worker.events.jsonl`.

Useful checks:

```bash
rg "SimulationProvider|first_pass|retry" .local/logs/latest/math-updater.log
rg '"action":"ai-generate"|"action":"translation"|"action":"retry-scheduled"' .local/logs/latest/*.events.jsonl
```

See `env.example` for a local template.

## Generated Artifacts

Shared worker code uses generated Python artifacts:

- `services/python-worker-shared/src/agora_worker_shared/generated_models.py` from `services/shared-backend/src/schema.ts`.
- `services/python-worker-shared/src/agora_worker_shared/generated_shared_types.py` from `services/shared/src` constants.

Regenerate from the repository root:

```bash
make sync-python-artifacts
```

## Development

```bash
uv sync --extra dev
uv run python -m math_updater.worker
```

Prefer the repository-root target when you want durable logs:

```bash
make dev-math-updater
```

The root target runs the worker with unbuffered Python output and writes `.local/logs/latest/math-updater.log`.

## Shutdown

The container runs under `tini` and handles `SIGTERM` by finishing the in-flight batch before exiting. During that drain period, active analysis leases keep heartbeating; successful completion clears the lease normally. Docker deployments should provide a stop grace period long enough for the current batch to finish. The production Compose template sets `stop_grace_period: 10m` for the worker containers.

The dedicated [`ai-description-retry-worker`](../ai-description-retry-worker) and [`description-translation-retry-worker`](../description-translation-retry-worker) services process retry/backlog queues. This service owns red-dwarf analysis and immediate first-pass AI description/translation work.

Useful checks:

```bash
uv run --extra dev ruff check
uv run --extra dev basedpyright
```

## Docker

```bash
make image-buildx TAG=2.0.4
make image-push TAG=2.0.4
```

Retry workers are built and deployed as separate services/images.

## Related Services

- [`api`](../api): creates dirty analysis work and serves analysis results.
- [`import-worker`](../import-worker): imports conversations and wakes analysis by adding to `analysis:dirty`.
- [`scoring-worker`](../scoring-worker): computes MaxDiff community rankings.
- [`shared-backend`](../shared-backend): source schema for generated SQLAlchemy models.

## License

AGPL-3.0. See [COPYING](./COPYING).

## Contributing

Contributions must comply with the [Fiduciary Licensing Agreement (FLA)](https://cla-assistant.io/zkorum/zkorum).
