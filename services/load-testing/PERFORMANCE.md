# Ranking performance and quality investigations

Scenario 2 uses the existing `scripts/dev-log-runner.mjs` logging system:
Pino/Python/k6 write to stdout, `AGORA_LOAD_EVENT` marks structured events,
and the runner owns capture, rotation, retention, `latest/` links, and run IDs.
The performance observer also emits these markers. It writes its manifest,
before/after database snapshots, query plan, and report beneath the runner's
`AGORA_LOG_RUN_DIR`, in a unique `ranking-performance-<timestamp>-<pid>/` directory.

## Prepare the local environment

Use the normal local Docker PostgreSQL primary, replica, Valkey, and monitoring
services. The observer runs on the host alongside the native API, scoring worker,
and k6 processes. Node.js 22.12+ is required, matching the API/tooling runtime.
Docker-compatible Podman installations are supported. Engine info and resource
samples are normalized from their native JSON formats, and the engine is recorded
in the manifest. Podman CPU uses cumulative-counter differences between samples;
its first sample (or the first after a container restart) is unavailable rather
than reporting a lifetime average as current load.

The observer implementation is in `services/load-testing/tools/performance/`,
with the same strict TypeScript/lint checks as the load-test code. The root
`scripts/ranking-performance.mjs` is only its launcher. k6 remains API-only.

Runtime startup uses the current Node executable directly: the API's installed
`tsx` loader runs the diagnostics helper, and a one-shot Node process runs the
installed Vite build. Package-manager bootstrapping is kept out of the helper's
stdin/stdout protocol. Install service dependencies separately when needed.

To check readiness and build without creating participants:

```bash
CONVERSATION_SLUG_IDS=slug1 RANKING_STRATEGY=unanimous \
node scripts/dev-log-runner.mjs --service load-testing-solidago-preflight -- \
  node --experimental-strip-types scripts/ranking-performance.mjs check
```

The log reports each preflight stage, validates a real resource sample, and ends
with `preflight_complete` on success.

Agora-table reads use a source-only helper in
`services/api/scripts/ranking-diagnostics-probe.ts`. It reuses the API's installed
Drizzle dependencies and the canonical `shared-backend` schema. Its typed command
protocol is synced from `services/shared-backend/src/rankingDiagnosticsProtocol.ts`;
run `make sync-ts-backend` after changing that protocol. The helper is a local
subprocess owned by the observer, not a production API route or background worker.
It keeps one read-only connection per database, uses normal replica-routed `db`
selects, and explicitly selects the writer for authoritative revision/snapshot
checks. Its CPU/memory can be distinguished from the load generator in samples.

`pg_stat_statements` is also queried with Drizzle using existing PostgreSQL view
definitions scoped to diagnostics tooling. Other catalog/system statistics and
the `EXPLAIN` wrapper use SQL; application-table plan inputs are built by Drizzle.
The helper reads the API's `.env` and normal `CONNECTION_STRING` /
`CONNECTION_STRING_READ`. Optional `PERF_CONNECTION_STRING` and
`PERF_CONNECTION_STRING_READ` select separate monitoring credentials when needed.
Complete statement statistics require `pg_read_all_stats` access on both
connections; privileges are checked rather than silently reporting partial data.
Connections must match the observed local Docker database names and published
ports. Credentials and raw driver errors are excluded from the protocol and reports.

```bash
make prepare-ranking-monitoring
```

This installs the preloaded `pg_stat_statements` extension in the application
database and enables I/O/WAL timing on the primary and replica, followed by a
configuration reload. It does not reset existing query statistics. The local
PostgreSQL configuration also includes the timing settings for future starts.
For different local container names, use `PERF_POSTGRES_CONTAINER`,
`PERF_REPLICA_CONTAINER`, and `PERF_VALKEY_CONTAINER`; database connection commands
use `PERF_DATABASE` (default `agora`) and `PERF_DATABASE_USER` (default `postgres`).

Start/restart the API in its usual terminal:

```bash
API_LOG_LEVEL=info \
API_LOG_SQL_QUERIES=false \
API_RANKING_PERFORMANCE_ENABLED=true \
make dev-api
```

Start/restart the scoring worker in its usual terminal:

```bash
SCORING_WORKER_LOG_LEVEL=INFO \
SCORING_WORKER_PERFORMANCE_ENABLED=true \
make dev-scoring-worker
```

The preflight reads their existing `logging_configured` events and checks their
process IDs. Both services must be captured by the root Make targets and must
emit INFO events. Pino JSON, development pretty logs, Python logs, and k6 logs
all use the same marker extractor. Logging options are validated at startup.

API SQL templates are emitted at DEBUG only when `API_LOG_SQL_QUERIES=true`;
parameter values are never emitted. SQL logging defaults off and API level
defaults to `info`. To measure SQL logging overhead, keep **both comparison runs
at `API_LOG_LEVEL=debug`** and change only `API_LOG_SQL_QUERIES=false/true`.
Otherwise framework DEBUG messages become a second variable.

Python scoring follows the existing worker convention: `AGORA_DEV_MODE=true`
defaults to DEBUG, otherwise INFO; `SCORING_WORKER_LOG_LEVEL` overrides that.
Detailed performance events are opt-in independently of the level.

## Baseline run

Create open, unmoderated, guest BWS ranking conversations, each with at least
four active items and no required survey or ticket. Prefer 20 items for a useful
initial performance workload. Keep fixtures stable during a run.

```bash
RANKING_USERS_PER_CONVERSATION=100 \
RANKING_VUS_PER_CONVERSATION=10 \
RANKING_COMPARISONS_PER_USER=20 \
RANKING_STRATEGY=unanimous \
RANKING_SEED=baseline-1 \
make load-test-scenario2-performance CONVERSATION_SLUG_IDS=slug1,slug2,slug3
```

The target builds first and enables Prometheus remote write. It checks local
ranking fixtures, captures database baselines, runs k6, samples resources about
every five seconds, then waits up to `PERF_DRAIN_TIMEOUT_SECONDS` (default 300)
for writer revisions to catch up and the replica to expose the same snapshots.
The performance target defaults the k6 cooldown to zero, so its own freshness
observer measures the post-load catch-up period. It verifies API scores/counts against the published database snapshot before
evaluating the final ranking. `PERF_EXPLAIN=false` disables the post-run
`EXPLAIN (ANALYZE, BUFFERS)` SELECT profiles of global uncertainty and normalized
comparison fetching for the largest
tested conversation. Observer SQL has a statement timeout and a marker that
excludes it from the reported query-statistics deltas.
SELECT profiles use the diagnostics connection; interpret them alongside live
query timings because prepared-plan caching and connection settings can differ.

The ordinary `make load-test-scenario2` remains available for k6-only runs.
Its fixed cooldown and provisional `ranking_evaluated` events do not prove
that scoring or the read replica caught up.

## Sustained and arrival-rate workloads

The default `RANKING_WORKLOAD_MODE=iterations` retains the fixed participant
budget. Two additional modes use independent pools per conversation:

| Variable                                | Default      | Meaning                                                                     |
| --------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `RANKING_WORKLOAD_MODE`                 | `iterations` | `iterations`, `duration`, or `arrival-rate`                                 |
| `RANKING_DURATION_SECONDS`              | `300`        | Admission duration for duration/arrival modes                               |
| `RANKING_ARRIVAL_RATE_PER_CONVERSATION` | `2`          | New participant sessions per second, **not comparison requests per second** |
| `RANKING_VUS_PER_CONVERSATION`          | `10`         | Constant VUs, or preallocated VUs in arrival mode                           |
| `RANKING_MAX_VUS_PER_CONVERSATION`      | `100`        | Maximum VUs in arrival mode                                                 |

Duration mode maintains constant VUs. Arrival mode maintains participant arrivals
independently of response latency, subject to the VU ceiling; any dropped
iterations fail its k6 threshold. Both allow two minutes for admitted participants
to finish after admissions stop. Reports expose started/completed/failed counts;
interrupted flows cannot silently count as completed work.

```bash
RANKING_WORKLOAD_MODE=arrival-rate \
RANKING_DURATION_SECONDS=300 \
RANKING_ARRIVAL_RATE_PER_CONVERSATION=2 \
RANKING_VUS_PER_CONVERSATION=20 \
RANKING_MAX_VUS_PER_CONVERSATION=100 \
RANKING_COMPARISONS_PER_USER=20 \
make load-test-scenario2-performance CONVERSATION_SLUG_IDS=slug1
```

Increase arrivals in separate runs after checking CPU headroom and queue/revision
progress. The fixed `RANKING_USERS_PER_CONVERSATION` budget and
`RANKING_MAX_DURATION_SECONDS` apply to iterations mode. Natural ranking completion
can stop a participant before their comparison budget; compare actual saved work.

## Controlled preference strategies

`RANKING_STRATEGY` supports:

| Strategy            | Preferences and evaluation                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `cohorts` (default) | Four equally assigned seeded preference orders; global-order metrics are descriptive                     |
| `unanimous`         | All users prefer the manifest's first item, then its second, etc.                                        |
| `noisy`             | Same reference order, with seeded random task choices at `RANKING_NOISE_RATE` (default 0.1)              |
| `majority`          | Reference order versus reverse; seeded cohort assignments use `RANKING_MAJORITY_SHARE` (default 0.8)     |
| `polarized`         | Equal cohorts prefer opposite orders; there is no uniquely specified consensus order                     |
| `sparse`            | Reference order, with `RANKING_DROPOUT_RATE` (default 0.5) of users assigned a shorter comparison budget |

`RANKING_SEED` defaults to `agora-ranking-v1`. Setup freezes each conversation's
item order in an `item_manifest` event. To set the reference order explicitly:

```bash
RANKING_ITEM_ORDERS='{"slug1":["itemA","itemB","itemC","itemD"]}' \
RANKING_STRATEGY=unanimous \
make load-test-scenario2-performance CONVERSATION_SLUG_IDS=slug1
```

Each configured order must contain every active item exactly once. The default
is the order returned by the items endpoint, captured in the manifest. Preference
generation uses these logical positions, not statement text. A seed reproduces
preferences given the same candidate sets; adaptive server routing and concurrent
arrival order can still produce different histories. Each saved-comparison event
records the chosen best/worst and candidate set for inspection.

Final reports include scored-item coverage, comparable-pair count, Kendall tau-a,
pairwise agreement, tie fraction, and top-5 recovery. Top-k recovery is unavailable
when ties cross its boundary, rather than breaking ties in favor of the reference.
Missing scores are not silently counted as incorrect comparisons; coverage is
reported alongside agreement. Use fresh fixtures for known-order quality tests:
reports mark the reference as non-authoritative when preexisting comparisons
are present. Noise tests should be compared over multiple seeds and increasing
budgets, rather than requiring exact recovery in every finite sample.
Quality metrics are reported for analysis rather than imposing one hardcoded
pass/fail threshold across unanimous, noisy, and conflicting populations.

The current worker uses `SequentialMaxDiffLearning`, `AffineOvertrust`, and
`EntitywiseQrQuantile(quantile=0.5)`. Majority and polarized tests must be
interpreted using that median-like aggregation policy. A majority reference is
not an unconditional numerical oracle for sparsely observed, conflicting data.

## Reading the evidence

- `.local/logs/latest/load-testing-solidago.events.jsonl`: workload events and
  observer resource samples; `performance_report_written` identifies the report.
- `.local/logs/latest/api.events.jsonl`: opt-in request phase timings and
  five-second event-loop/CPU/memory samples.
- `.local/logs/latest/scoring-worker.events.jsonl`: per-conversation computation,
  batch timing, publication, and rejected-revision events.
- The manifest records source paths even when services and k6 have different run
  IDs. Report collection follows rotated event files and filters by run time and
  target conversations. Shared batches involving other conversations are identified
  as mixed batches rather than attributed exclusively to the tested fixtures.
- `report.json` includes per-operation/conversation p50/p95/p99, maximum revision
  gap, sampled no-progress intervals, publication/rejection counts and causes,
  final revisions, replica/API verification, and primary/replica query deltas.
- `before.json`/`after.json` separate **soft-deleted comparison rows** from
  PostgreSQL's MVCC dead-tuple estimates. Track WAL, storage, and vacuum activity
  as histories grow. Query deltas use role, top-level/nested status, and query ID;
  resets/evictions and incomplete top-500 baselines are explicitly identified.
  Per-query counter decreases are also treated as invalid deltas.

Final verification rechecks both databases after reading the API results. A new
revision or snapshot appearing during that window invalidates the freshness claim.
The sampler is passive and cannot overwrite the verifier's pinned revision state.
Late query, API, or parsing failures are recorded in the report's `diagnostics`
rather than discarding the workload summary or its original exit status.

Event input is schema-parsed and bounded by `PERF_MAX_EVENTS` (default 200,000,
maximum 1,000,000). Oversized, malformed, missing, or truncated event input is
reported as incomplete measurement. Started, terminal, and comparison event counts
are reconciled against k6 counters, and participant lifecycle IDs are checked.
The observer uses a marker capture barrier for its own stream instead of guessing
that an arbitrary sleep flushed pending log writes.

API `transaction` includes uncertainty aggregation and connection/lock waiting;
the `load` span includes concurrent reads. **Do not add overlapping spans.**
Service phase percentiles describe retained events in the run window and include
concurrent ranking requests; keep background traffic consistent between runs.
k6 summary metrics remain the authoritative client-side totals. Service-event
presence is checked separately from complete participant-event capture.
k6 HTTP timing excludes signing and client computation; separate signing,
credential/engine computation, payload-size, and total-request trends expose
generator overhead. Native `ps` CPU is approximate; API resource events use CPU
time deltas. Five-second sampling cannot establish exact per-vote queue latency.
The measured post-k6 drain begins after the configured k6 cooldown; use
`RANKING_COOLDOWN_SECONDS=0` to measure the entire post-load catch-up period.

The observer returns nonzero for k6 failure, interruption, drain timeout, sampling
failure, missing participant events, missing service instrumentation, or an
API/published-snapshot mismatch. Inspect workload exit status separately from
measurement completeness. For longer runs, size `AGORA_LOG_MAX_BYTES` and
`AGORA_LOG_MAX_FILES` so the existing runner retains the complete event window.
The default seven-day/750 MB retention policy applies to performance artifacts.

## Investigation sequence

Focused verification commands:

```bash
# Typed observer, report, strategy and event-reader tests
pnpm --dir services/load-testing test:unit
pnpm --dir services/load-testing lint
pnpm --dir services/load-testing exec tsc --noEmit
# Process-level capture/observer and teardown tests (requires k6)
node --test scripts/log-markers.test.mjs scripts/ranking-performance.test.mjs scripts/ranking-workload.test.mjs
```

1. Smoke test the instrumentation and a small unanimous fixture.
2. Establish a warm baseline with fixed hardware, logging, fixtures, and strategy.
3. Compare one hot conversation with three conversations at equal total load.
4. Increase participant arrivals until throughput plateaus, tail latency grows,
   dropped work appears, or publication freshness deteriorates.
5. Repeat with 20/50 items, larger comparison budgets, and accumulated history.
6. Mix hot and quiet conversations and different dataset sizes within a batch.
7. Repeat key points with several seeds; compare quality versus cost and coverage.

Specific hypotheses to investigate: whole-history JSONB updates,
conversation-wide JSONB uncertainty aggregation inside the save transaction,
revision-trigger hot-row contention, per-user score replacement, and queue weights
based on the last participant's history rather than total conversation cost.
Normalized history updates preserve unchanged comparisons. The worker reads one
coherent input snapshot and publishes each conversation independently. Appended
votes allow an earlier snapshot to publish and trigger follow-up work; edits,
removals, and eligibility/item changes still invalidate older computations.
`publication_completed` is emitted after each conversation's commit, with its
captured and observed revisions and status. `revision_rejected` identifies
invalidated or missing inputs; a newer revision alone is no longer a rejection.
Check both progress during load and final catch-up when evaluating freshness.
