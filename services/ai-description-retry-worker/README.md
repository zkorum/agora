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

## Inspecting and repairing live descriptions

The one-off command uses `AI_DESCRIPTION_RETRY_WORKER_*` configuration, including
the primary database connection and provider settings. It scans only non-deleted,
non-importing conversations with AI labeling enabled, selecting the latest activated
opinion-group view using the API's selection rules. Closed conversations remain eligible.
All selectable variants are included when variants are enabled; otherwise only the
automatically selected candidate is included.

```bash
# From services/ai-description-retry-worker: report only (no database writes or LLM calls)
uv run python -m ai_description_retry_worker.repair --conversation QYMAA_0

# Correct confirmed wrong-language descriptions in this conversation
uv run python -m ai_description_retry_worker.repair --conversation QYMAA_0 --apply

# Bounded global scan; progress reports include a description-ID resume cursor
uv run python -m ai_description_retry_worker.repair --limit 100 --batch-size 25
uv run python -m ai_description_retry_worker.repair --after-description-id 5253 --limit 100
```

Reports are JSON lines. Ambiguous descriptions are reported as `unresolved` and are
not automatically replaced. Configured Google language detection may be used in report
mode; Bedrock generation is only used with `--apply`. Repair refuses simulation providers.
Reports use snake_case fields and include `description_id`, `lineages`, and a typed
`status`. An English description with an incorrect stored locale is reported as
`wrong_locale`; applying that repair changes the locale through a replacement row
without an LLM call. Reports and failure logs exclude the description text and raw
provider/database exception details.

For local AWS CLI login profiles, use `uv run --with 'botocore[crt]' python -m ...`
if the SDK requests the optional login-provider dependency, and refresh an expired
AWS login before using `--apply`.

An English correction is checked before replacing the lineage pointer. Replacement,
translation-work materialization, and content-update outbox events commit together.
The command rechecks current eligibility after acquiring the lineage/source locks,
using a fresh statement so a lock wait cannot preserve stale eligibility. It checks
the original pointer, text, and locale after provider calls,
retains old description rows and translations, and is safe to rerun. Checkpoints sharing
the repaired lineage see the correction; checkpoint-only descriptions are not selected.
New translations use the replacement ID and may temporarily fall back to English while
they are generated.

The scan excludes descriptions created after it started. `--limit` counts inspected
descriptions, including accepted/unresolved ones. A failed correction exits nonzero;
rerun from the beginning to revisit failures before the reported resume cursor.
