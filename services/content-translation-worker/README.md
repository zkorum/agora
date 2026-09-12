# Content Translation Worker

Processes durable `content_translation_work` rows and stores translated dynamic user content.

## Execution and consistency

Each attempt has three phases:

1. **Prepare:** a short transaction checks the lease and source eligibility, reads the exact
   content revision into frozen data objects, and checks existing translations. It commits
   before generation starts.
2. **Generate:** provider calls and Chinese script conversion run without a database session.
   Typed bundles keep each source revision together with its translated fields/options.
   A separate heartbeat renews the active lease using short transactions.
3. **Publish:** a new transaction locks and checks the work lease before any output writes,
   rechecks source eligibility/revision, and atomically stores the complete bundle, completion
   status, and realtime outbox events. Errors roll back publication before failure handling.

The worker claims one execution group at a time; `BATCH_SIZE` bounds candidate scans and retry
maintenance rather than reserving a local backlog of expiring leases. Simplified and Traditional
Chinese requests share one execution lease token across their existing locale work rows. A
nonblocking PostgreSQL advisory lock coordinates only the short group-claim transaction;
it is released before preparation/generation. Each locale retains its existing API work status.
Source-script Chinese content is converted locally and its original script is preserved exactly.
Paired locale rows use the same attempt count so one locale cannot bypass the group's retry backoff.

Publication retains manual project translations and accepts historical statement revisions
referenced by activated analysis snapshots. Surveys publish a question with its matching option
revisions. Changed source data is requeued or rejected if no longer eligible. A worker that loses
its lease cannot publish results or completion events. A crash after provider execution can cause
a repeated provider call; database publication is protected by ownership and unique output keys.

This worker does not activate analysis snapshots. Analysis first-pass enrichment and snapshot
activation continue to use the separate analysis-worker pipeline.

### Lease, retry, and database settings

All settings below use the `CONTENT_TRANSLATION_WORKER_` prefix:

| Setting | Default | Purpose |
| --- | --- | --- |
| `LEASE_TTL_SECONDS` | `120` | Duration of a renewable execution lease |
| `HEARTBEAT_INTERVAL_SECONDS` | `15` | Must be shorter than the lease TTL |
| `OPERATION_TIMEOUT_SECONDS` | `180` | Generation deadline checked between provider calls and before publication |
| `GOOGLE_CLOUD_TRANSLATION_TIMEOUT_SECONDS` | `30` | Timeout for an individual provider request |
| `RETRY_INITIAL_SECONDS` | `30` | Initial automatic retry delay for eager work |
| `RETRY_MAXIMUM_SECONDS` | `900` | Maximum exponential retry delay for eager work |

Heartbeats stop at the generation deadline; an in-flight provider request remains subject to its
own timeout. Expired leases are recovered at startup and periodically. Interactive requests retain
their existing API-driven retry behavior.
Retry eligibility is evaluated against PostgreSQL time before applying the batch limit, with row
locking to keep concurrent retry scans from resetting a newer attempt. Claims and heartbeats also
use PostgreSQL time for lease expiry. Stale Valkey wakeups fall back to the durable SQL scan immediately.

The shared immutable contracts live in `models.py`; generation imports those contracts rather than
the persistence module. Source references distinguish ordinary content revisions from survey
revisions, which require their option content IDs. Logs record work ID, execution phase, and error
type without logging raw provider exception messages or persisting their potentially sensitive text.

PostgreSQL connections identify themselves as `content-translation-worker`. Defaults include a
30-second statement timeout, 5-second lock timeout, 60-second idle-transaction timeout, bounded
pool/connection waits, and TCP keepalives. Explicit connection-string options override these defaults.
These timeouts are backstops; provider execution does not hold a database transaction open.

## Configuration

Environment variables are parsed with Pydantic settings and invalid values fail startup.

Required variables for the real Google provider:

- `CONTENT_TRANSLATION_WORKER_CONNECTION_STRING` or `CONNECTION_STRING`
- `CONTENT_TRANSLATION_WORKER_TRANSLATION_PROVIDER=google`
- `CONTENT_TRANSLATION_WORKER_GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_APPLICATION_CREDENTIALS`

Optional Google model override:

- `CONTENT_TRANSLATION_WORKER_GOOGLE_CLOUD_TRANSLATION_MODEL`
- fallback alias: `GOOGLE_CLOUD_TRANSLATION_MODEL`

Allowed model values:

- `general/translation-llm` (default)
- `general/nmt`

The worker builds the full Google model path from the validated enum value:
`projects/<project-id>/locations/<location>/models/<model>`.

Local simulation:

```bash
make dev-content-translation-worker-scenario SCENARIO=simulated-success
./run_all_in_kitty_tabs.sh --simulate-workers content-translation-worker=simulated-success
```

Simulation uses `CONTENT_TRANSLATION_WORKER_TRANSLATION_PROVIDER=simulated` and never initializes Google credentials. The worker still claims durable `content_translation_work` rows and writes normal translation result rows/events.
