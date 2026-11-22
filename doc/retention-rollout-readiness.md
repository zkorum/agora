# Comparison retention: read-only audit and online rollout plan

Status: source-only operational tooling/design. No migration, production audit,
backfill, classification or cleanup has been executed. Generating/applying the
application migrations still requires explicit approval. This document does not
authorize a hard-deletion worker or removal of historical evidence.

## Run the audit deliberately

From `services/api`:

```sh
pnpm audit:retention --help
# Supply this environment variable through the approved secret mechanism.
# There is deliberately no .env or CONNECTION_STRING fallback.
pnpm audit:retention > retention-readiness.json
```

`RETENTION_AUDIT_DATABASE_URL` must identify the explicitly selected PostgreSQL
database, preferably using a dedicated role with SELECT privileges only. The tool
does not import/bootstrap the API, install extensions, run ANALYZE/EXPLAIN ANALYZE,
change application settings or acquire row/advisory/write locks.

Safety defaults:

| Option                   | Default                 | Maximum    |
| ------------------------ | ----------------------- | ---------- |
| `--row-limit`            | 1,000 matches per check | 10,000     |
| `--statement-timeout-ms` | 2,000 ms                | 30,000 ms  |
| `--lock-timeout-ms`      | 250 ms                  | 1,000 ms   |
| `--max-duration-ms`      | 30,000 ms               | 300,000 ms |

Queries run sequentially on one connection in separate short, server-enforced
read-only transactions, pinned to `pg_catalog, public`; other application schemas
are not supported by this tool. The time budget stops starting new reads; it is not a
hard process deadline covering connection setup/teardown. Each statement is also
limited to the remaining budget. No long-lived cross-check MVCC snapshot is held.

**Read-only is not cost-free or lock-free.** SELECT takes relation read locks, and
finding no matches can still scan a large relation despite LIMIT. Short statement
and lock timeouts bound individual attempts. Begin with the defaults, schedule off
peak, and stop if database I/O, latency or replication lag rises. Do not increase
timeouts merely to force a green report. A replica is useful for initial sizing;
the report identifies replica/primary and server version, but replica lag makes it
unsuitable for final writer-side rollout decisions.

The report contains source-controlled table/column/expected-object names,
aggregate counts and estimated storage only. It never emits account/response IDs,
slugs, titles, trust JSON, SQL, provider errors, database names or connection URLs.
CLI JSON is an operational report, not a bypass of the backend event logger.

## Interpret the report

- Relation row estimates are PostgreSQL statistics, potentially stale; an unknown
  estimate is omitted, not changed to zero. `totalBytes` is a decimal string to
  avoid rounding large byte counts through JavaScript numbers. Sizes include
  indexes/TOAST and must not be summed as a precise migration-space forecast.
- A check fetches at most `row-limit + 1` matches. `exact: true` means the reported
  count is exact for that individual read; `exact: false` means **at least** that
  many matches, not a full total or a random sample.
- Timeout, permission failure, budget exhaustion, absent columns and a schema
  changing during the audit are **unavailable**, never zero/success. Older
  `maxdiff_*` relation sizes are reported if present, and their unclassified
  presence makes the audit incomplete even if an estimate says zero; no invented
  historical ORM mappings or assumptions about their contents are used. A missing capture table
  means existing retained statistics/current scores lack this evidence, not that
  there were no results. Partially installed capture columns are schema gaps.
- `blocked`: at least one observed data blocker. `incomplete`: required checks or
  source-schema/index/trigger presence checks are unavailable/incomplete.
  `no_detected_data_blockers` is **not** a migration-safety or release certificate.
  Reads are independent and can observe different moments under concurrent work.
- Exit codes: 0 = no detected blockers, 2 = observed blocker, 3 = incomplete,
  1 = invalid configuration or unhandled setup/teardown failure. Connection/query
  failures during reads are incomplete, not zero blockers. Expected blocked/incomplete runs
  still emit a JSON report; preserve it even when the process exits nonzero.

Checks distinguish unclassified non-null legacy trust context, unfinished
comparison closes, retained statistics/current scores without sealed inputs,
unsealed captures, sealed unbound captures, and linked sources on purging accounts.
The last two are informational: unbound captures may be in active computation and
are **not** permission to delete anything. Cleanup must acquire the scoring advisory
lock and recheck publication roots. Unclassified trust context is a global unlink
quarantine, including accounts with no surviving response. Classify/review it; do
not clear blobs automatically or infer missing historical inputs from current
sessions. SQL NULL and JSON null are absent context.

The catalog inventory flags invalid/not-ready indexes, NOT VALID constraints, and
missing expected new indexes/triggers. Trigger presence is not definition/hash
verification. Constraint validation, populated-data upgrade compatibility, permissions,
application-version compatibility and realistic concurrency/load verification are
independent gates.

## Online migration strategy — review before generating SQL

There is no promise of literally zero locking: PostgreSQL metadata changes need
brief locks, and even concurrent index builds have wait/resource costs. The goal
is to keep API traffic flowing, avoid long lock queues/table rewrites, and make
expensive phases resumable and separately observable.

1. **Measure first.** Audit an explicitly chosen staging copy/replica, then obtain
   an approved writer-side read when appropriate. Review table/index/TOAST sizes,
   write rate, long transactions, disk/WAL headroom, replica lag and invalid indexes.
   Estimates alone do not choose batch sizes or prove an operation is inexpensive.
   Rehearse the upgrade against a representative populated database, not only an
   empty disposable schema.
2. **Generate from canonical source only, after approval.** Use the repository's
   `schema.ts` → sync → `pnpm db:generate` workflow. Review generated Drizzle/Flyway
   SQL for rewrites, validation scans, index builds, FK checks and lock ordering.
   The generated migration is not automatically safe to deploy unchanged at scale.
   Prefer splitting/reordering generated operations into reviewed phases; if the
   generator cannot express required online DDL, obtain approval for narrowly
   necessary SQL edits and explain the tool limitation. Do not hand-author a
   replacement schema migration in this preparation.
3. **Expand with brief, retryable DDL.** New empty `ranking_input_*` tables can be
   built before traffic uses them. Add nullable markers without volatile defaults;
   dropping the source account-link NOT NULL constraint should not require a heap
   rewrite, but still needs a metadata lock. Do not bundle these short operations
   behind a long backfill/index scan in one transaction. Set a short lock timeout
   per phase; back off/reschedule rather than leaving an ALTER waiting in front of
   normal traffic. Account for partition/version-specific behavior during rehearsal.
4. **Build large existing-table indexes online.** For large or busy existing tables,
   plan `CREATE INDEX CONCURRENTLY` separately from transactional DDL. Flyway needs
   a separately reviewed nontransactional migration configuration for those files;
   do not disable transactions globally. Composite unique indexes needed by new FKs
   can be built concurrently and attached as constraints with a brief lock where
   PostgreSQL supports it. New empty tables usually do not need concurrent builds.
   Monitor I/O/WAL/replica lag and long-transaction waits. An interrupted concurrent
   build can leave an invalid index: inspect and approve its repair; blindly using
   IF NOT EXISTS is not recovery. No automatic index dropping is included here.
5. **Separate constraint installation from validation.** Where supported, install
   existing-table foreign keys/checks as NOT VALID with brief locks, then VALIDATE
   separately after data readiness, outside a backfill transaction. Validation
   scans are not free and may conflict with other maintenance, though they normally
   permit ordinary reads/writes. Do not try NOT VALID on UNIQUE/PRIMARY KEY, and do
   not silently rely on it for NOT NULL. The final audit intentionally remains
   incomplete while required validations/index builds are unfinished.
6. **Backfill only approved, reconstructible facts.** If any upgrade step needs a
   large data change, use a separately approved resumable keyset-batched job, short
   commits, a fixed high-water mark where appropriate, idempotent predicates,
   progress tracking and adaptive throttling based on production latency/WAL/lag.
   Never put an unbounded UPDATE in a long schema transaction. Historical numerical
   input reconstruction and trust-context erasure are **not** approved backfills.
   Missing evidence stays an explicit blocker until a product/legal decision.
7. **Coordinate writer cutover.** Keep old/new schema compatibility explicit.
   Drain old scoring workers before enabling the new seal-required capture contract;
   an old writer cannot satisfy it. Stop new claims, finish/requeue existing work,
   install the reviewed guards and start the compatible worker. This is a bounded
   worker handoff, not an API-wide maintenance window. Deploy nullable-source-safe
   API readers before any caller can detach source links. Do not install guards
   into a live incompatible writer path as a substitute for coordination.
8. **Enable separately.** Validate constraints/indexes, verify trigger definitions,
   rerun the audit, perform authenticated browser/concurrency tests, and observe
   real workload behavior. Keep account-purge callers disabled while any legacy
   evidence/context gate remains unresolved. Enabling physical deletion or the
   deletion worker requires a separate decision and implementation.

Large-table index builds, validation and any approved data backfill are therefore
not one blocking deploy transaction. Exact phase boundaries/timeouts must be chosen
from the audit and populated-data rehearsal, not guessed from source alone.

## Tool verification

The audit's 18 tests and 12 comparison-retention regression tests pass (30 total),
along with API typechecking, scoped lint and the soft-delete policy check. Tests
use disposable databases and cover the standalone CLI, capped counts, missing
schema, confidentiality of output, read-only enforcement, timeouts/lock contention,
budget exhaustion, and retrying a read after timeout. No production/staging database
was audited, and these tests do not establish a safe production migration duration.
