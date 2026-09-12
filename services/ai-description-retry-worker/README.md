# AI Description Retry Worker

Dedicated Python service for AI-description retry/backlog work. The main `math-updater` service owns red-dwarf analysis and immediate first-pass AI description generation.

Real Bedrock calls are enabled by default through `AI_DESCRIPTION_RETRY_WORKER_AWS_AI_LABEL_SUMMARY_ENABLE=true`. Bedrock uses normal AWS credentials plus `AI_DESCRIPTION_RETRY_WORKER_AWS_AI_LABEL_SUMMARY_*` region, model, timeout, and prompt settings; there is no explicit Bedrock URL.

```bash
make dev
```

Build and push:

```bash
make image-buildx TAG=1.0.0
make image-push TAG=1.0.0
```

## Database polling and recovery

The retry worker scans durable PostgreSQL work. Materialization, claims, and lease
recovery use the primary. Claimable-work discovery can use the configured read
database; immediately after materialization it uses the primary to see the new
rows. When both DSNs match, the worker shares one connection pool.

- Idle polling backs off from `WORKER_POLL_IDLE_SLEEP_SECONDS` (default 0.5 seconds)
  to `max(5 seconds, WORKER_POLL_IDLE_SLEEP_SECONDS)`. Processing work resets this
  delay. An empty backlog therefore does not trigger full-speed polling forever.
- `DB_MATERIALIZATION_INTERVAL_SECONDS` (default 5) spaces out successful global
  materialization scans, including while processing an existing backlog.
- Database failures retry after 5, 10, 20, 40, then at most 60 seconds. A successful
  polling cycle resets this delay and logs recovery, even if no work is available.
- Database statements default to 30 seconds and idle transactions to 60 seconds,
  configured with `DB_STATEMENT_TIMEOUT_SECONDS` and
  `DB_IDLE_TRANSACTION_TIMEOUT_SECONDS`. These settings have the
  `AI_DESCRIPTION_RETRY_WORKER_` environment prefix. Bedrock calls run outside
  database sessions, so provider wait time does not consume the idle-transaction
  allowance.
- Database errors end the failed session/transaction. Retries start a new session;
  they do not replay a statement inside a failed transaction or discard durable
  requests. Active leases and retry metadata survive materialization. An obsolete
  source candidate can be replaced once its lease expires, so old work does not
  become permanently stranded outside the normal recovery scan's snapshot scope.

The [shared PostgreSQL connection policy](../shared-analysis-worker/README.md#postgresql-connections)
also sets libpq network failure-detection defaults. DSN options can override those
defaults and the server settings above; retain any existing TLS parameters when
tuning a DSN.

## Diagnosing high CPU or silent logs

At INFO level, a separate progress thread logs `Status phase=...` every 60 seconds,
including while the main thread is waiting on I/O. Phases identify primary
recovery/materialization, primary/read scans, lineage processing, idle sleep, or
database backoff. A phase's elapsed time is diagnostic, not a promise that the
database or provider is healthy. Database error logs include the phase, failed
cycle count, retry delay, SQLSTATE when available, and connection-invalidated
status without SQL parameters or driver messages.

Connections are tagged `AiDescriptionRetryWorker:primary` or
`AiDescriptionRetryWorker:read` unless the DSN specifies `application_name`.
Inspect current database activity with:

```sql
SELECT pid, application_name, state,
       clock_timestamp() - xact_start AS transaction_age,
       clock_timestamp() - state_change AS state_age,
       wait_event_type, wait_event
FROM pg_stat_activity
WHERE backend_type = 'client backend'
ORDER BY xact_start NULLS LAST;
```

`idle in transaction` differs from a healthy pooled connection in `idle`: it has
an unfinished transaction. Check the application name and timestamps before
attributing a historical RDS alert to this worker. Docker network I/O totals are
cumulative since container startup; repeated samples are needed to estimate the
current traffic rate. Container CPU and RDS CPU are separate measurements.

## Checks

```bash
uv run --extra dev pytest
uv run --extra dev ruff check
uv run --extra dev basedpyright
```

Shared database tests live in `services/shared-analysis-worker`. From that
directory, run `uv run --extra dev pytest`. To exercise the scan, transaction
rollback, and timeout/reconnection tests against a local PostgreSQL instance:

```bash
AGORA_TEST_POSTGRES_DSN=postgresql://postgres@localhost:5432/postgres \
  uv run --extra dev pytest tests/test_postgres_engine.py tests/test_ai_description_work.py \
  -k 'postgres or lineage_scan or eager_lineage_scan'
```

The materialization tests create and remove their own uniquely named schemas.
