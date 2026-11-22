# Credit voting worker

Python owns the current QV **participant count**, independently of calculation
state, and processes generation-scoped closed-result work. Source/schema preparation
is implemented; migration generation/application and deployment remain gated.

## Development

Create `.env` with a **writer** connection:

```dotenv
CREDIT_VOTING_WORKER_CONNECTION_STRING=postgresql://postgres:postgres@localhost:5432/agora
CREDIT_VOTING_WORKER_POLL_INTERVAL_SECONDS=1
CREDIT_VOTING_WORKER_RECONCILE_SECONDS=60
CREDIT_VOTING_WORKER_MIN_STATS_REFRESH_SECONDS=1
CREDIT_VOTING_WORKER_STATEMENT_TIMEOUT_SECONDS=30
CREDIT_VOTING_WORKER_CALCULATION_LEASE_SECONDS=120
```

Once dependencies are provisioned, run `python -m credit_voting_worker` in the service environment
(or `make dev-credit-voting-worker` from the root).

- `make sync-python-models` regenerates SQLAlchemy models from the canonical
  TypeScript schema and rule constants from the shared QV utility, without
  generating/applying database migrations.
- `uv run --extra dev pytest` runs tests, including disposable PostgreSQL tests.
- `uv run --extra dev ruff check .` and `uv run --extra dev basedpyright` check code.

## Guarantees

- Accepted mutations append transactionally to `qv_stats_refresh`; no hot counter
  row update or ballot aggregation in participant Saves. Duplicate command receipts
  do not enqueue another refresh.
- A repeatable-read transaction locks one statistics row with `SKIP LOCKED`, counts
  eligible current nonempty responses and marks visible refresh signals processed.
  The initial refresh publishes even zero; later unchanged counts only advance the
  reconciliation timestamp/ACK, without incrementing revision or emitting an event.
  Changed counts and their outbox event commit atomically with the ACK.
  These SQL-only tasks use transaction locks, not long-lived computation leases.
- The running worker coalesces repeated refreshes behind a per-conversation minimum
  interval (one second by default). Signals remain pending until the next complete
  refresh; a sustained burst cannot trigger an aggregate per individual Save.
- Account-deleted/hidden, detached, withdrawn and retired responses do not count.
  Required surveys use the shared numerical-input eligibility validator; optional
  surveys do not gate participation. Survey reads are bounded in participant batches.
- Startup discovery drains bounded batches, then runs at reconciliation cadence,
  not before every refresh. Periodic reconciliation
  repairs absent wakeups, including source changes outside the normal API paths.
  Notifications are not required for correctness.
- A crashed worker releases its lock; a database outage leaves signals pending and
  uses capped, jittered backoff outside transactions. No fixed attempt budget.
- A failed conversation refresh rolls back its count/event/ACK, then persists a
  30-second `retry_after` cooldown without delaying healthy conversations. Its
  signals stay pending; a successful concurrent refresh is not overwritten by
  the cooldown write. Database-wide outages still use process-wide backoff.
- Live statistics publish no scores or aggregate vote/credit/ballot/allocation
  counters. Their SSE contains count/revision only, never private inputs or lifecycle
  state. A separate calculation event carries generation/state, not scores or ballots.
- Live counts may lag accepted participation. A result's participant count comes
  from its own saved capture, not this projection.

## Closed calculations

- API close stops writes, advances a lifecycle generation and inserts one durable
  `qv_calculation` job. It does not copy ballots or create a close-time manifest.
  Workers poll PostgreSQL; no notification delivery is required for correctness.
- A separate bounded calculation thread claims current closed work using row locks,
  tokens and database-time leases. Live-statistics processing runs independently.
  Unexpected calculation-thread failures stop statistics too and fail the process
  after resource cleanup, allowing supervision to restart the complete worker.
- Repeatable-read capture copies the eligible nonempty saved responses, exact
  statement content and rule/algorithm provenance. Snapshot-local ballot indices
  have no account, participant, response or version foreign keys. Capture commits
  completely before computation; retries reuse its saved pointer, never recapture.
- Capture checks each original ballot's rules and full quadratic spending before
  projecting currently available allocations. An unavailable item/version or a
  retired allocation removes only that allocation, without redistributing credits,
  changing surviving signed votes or rewriting the saved ballot. A fully excluded
  ballot does not count as a captured participant. Invalid original provenance
  still fails rather than being hidden by projection.
- Capture and SQL tally stages continuously lock the job row and renew the lease
  before releasing that lock. A standalone heartbeat would block on that same row;
  the transaction lock is the stronger active-stage ownership fence. Expired claims
  are recovered only when unlocked. Shutdown interrupts between capture batches.
- Tally sums signed vote units, keeps positive/absolute-negative totals and per-item
  participant counts, includes untouched zeroes and uses competition ranks 1, 1, 3.
- Publication locks lifecycle before work, verifies generation/claim/lease using
  database wall time, and atomically writes all result rows, current pointer,
  finalization state and outbox event. Failed publication cannot expose a partial set.
- Reopen advances generation without waiting for bulk capture, hides old results
  and keeps working responses. Re-close captures new eligible inputs and replaces
  the current reference only after completion. Old/pending evidence may coexist;
  no history API or two-physical-version guarantee is provided.
- Transient failures schedule capped, jittered backoff and release the calculation
  slot. There is no small retry budget or public Retry action. Invalid persisted
  input/provenance fails explicitly without publishing an incomplete result.
- Ordinary account changes after capture do not change evidence or results; deletion
  before the capture snapshot may exclude a participant. Parent deletion revokes
  reads/publication. Future physical cleanup must coordinate job locks/leases and
  retain the current result-owned graph; it is not implemented here.

Processed wakeups are operational cleanup candidates, not result history. Their
physical removal and parent-deletion cleanup belong to the separate deletion
service. Migration generation/application and rollout remain explicitly gated.
