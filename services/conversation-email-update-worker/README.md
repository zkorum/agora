# Conversation Email Update Worker

Independent TypeScript worker for durable Conversation Email Updates delivery and SES event processing.

The worker claims and materializes delivery work with Drizzle, renders localized messages, sends through SESv2, applies durable SNS inbox events, and updates delivery state. Fastify owns SNS signature verification and durable inbox insertion; this service owns inbox processing.

## Shared Source

`make sync-ts-backend` copies the canonical schema and required backend utilities from `services/shared-backend/src` into `src/shared-backend`. `make sync-all` copies universal language helpers into `src/shared`. Both directories contain generated warning headers and must not be edited directly.

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm start:dev
```

Configuration is parsed from the environment at startup. See `env.example`; sending is disabled and the kill switch is active by default.

### SES Simulator

Run a development-only provider scenario against the configured local database:

```bash
make dev-conversation-email-update-worker-scenario SCENARIO=simulated-success
```

Available scenarios are `simulated-success`, `simulated-retry-then-success`, `simulated-retry-always`, `simulated-non-retryable`, and `simulated-unknown`. The simulator requires `NODE_ENV=development`, `AGORA_DEV_MODE=true`, `CONVERSATION_EMAIL_UPDATE_PROVIDER=simulated`, and `CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED=true`; startup rejects simulated delivery in every other environment.

### Development Exercise

`src/devExercise/index.ts` is a separate, fail-closed entry point for exercising the real worker loop with a local instrumented provider. Its guard is statically imported; database, worker, and network-capable modules are dynamically imported only after every safety condition passes. It does not load `.env` or use the normal worker configuration defaults.

Every variable below is mandatory. Use a dedicated loopback PostgreSQL database, a literal loopback host, and the exact `postgresql:` protocol:

```bash
export NODE_ENV=development
export AGORA_DEV_MODE=true
export CONNECTION_STRING=postgresql://postgres:postgres@127.0.0.1:5432/agora_email_exercise_local
export CONVERSATION_EMAIL_UPDATES_ENABLED=true
export CONVERSATION_EMAIL_UPDATES_KILL_SWITCH=false
export CONVERSATION_EMAIL_UPDATE_PROVIDER=simulated
export CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED=true
export CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL=http://127.0.0.1:8080
export CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_EXPECTED_DB_NAME=agora_email_exercise_local
export CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_DATABASE_MARKER=$(openssl rand -hex 32)
export CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID=Ab12Cd34
export CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT=30
export CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_NAMESPACE=my-local-exercise
export CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO=mixed_participant_outcomes
export CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES=false

pnpm dev:exercise plan
pnpm dev:exercise initialize-database
```

The guard rejects production/staging, missing flags, non-loopback database or site URLs, database-name mismatches, read-replica variables, `DB_HOST`/`PG*`/`DATABASE_URL` alternate database configuration, every `AWS_*` variable, and all real SES region/sender/configuration-set variables. The expected database name must match `agora_email_exercise_[a-z0-9_]+`. The conversation slug must be exactly eight alphanumeric characters and the participant count must be an integer from 1 through 10,000. The database marker is a mandatory random or explicit confirmation value of at least 32 characters. The kill switch must be false except when `CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO=kill_switch`, where it must be true. Process tests prove these guards run before importing the database/worker runtime.

Supported scenarios are `success`, `owner_permanent_rejection`, `participant_retry_then_success`, `mixed_participant_outcomes`, and `kill_switch`. Participant UUIDs, usernames, unique reserved `.invalid` emails, and ordinal cohorts are deterministic within the namespace; existing project owners are never added to the participant cohort. Test messages are always accepted. Final owner copies are identified by their update tag and absent unsubscribe URL, and participant behavior is selected only by an exact fixture email match. The provider is entirely local and never constructs or calls SES. Provider reports contain hashes and counts plus exact update/recipient correlation IDs, not rendered bodies. Setting `CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES=true` stores full messages locally as mode-`0600` files.

Artifacts use exact lifecycle states `planned`, `fixture_prepared`, `fixture_attached`, `worker_running`, `awaiting_ui_action`, `observing`, `verified`, `failed`, and `cleaned`. Manifests, reports, and optional message captures are atomically written under the repository-root `.local/conversation-email-update-fixtures/` directory.

The orchestration command surface is:

```bash
pnpm dev:exercise plan
pnpm dev:exercise initialize-database
pnpm dev:exercise prepare
pnpm dev:exercise attach
pnpm dev:exercise run
pnpm dev:exercise observe
pnpm dev:exercise verify
pnpm dev:exercise cleanup
```

`initialize-database` is the only command that creates the narrowly named dev-only marker and target-reservation tables. It first verifies `current_database()` and then records the exact confirmation value from the guarded plan. Every later database command requires the same marker. The dedicated name, literal loopback URL, and marker prevent accidental production use and reject an uninitialized forwarded database. They cannot prove physical locality if an operator deliberately initializes a forwarded matching database. Cleanup deliberately retains the marker table; remove the dedicated database itself when it is no longer needed.

Before `prepare`, create and configure the target through the normal local UI. It must be an active, open Polis conversation in an active project, have current conversation content and at least one active opinion with current content, and already have the normal owner membership, capability, premium entitlement, contact, and email-update configuration needed by the UI. The fixture store does not create or modify any of those records.

`prepare` verifies `current_database()`, rejects a target with any existing participation or Conversation Email Update, atomically reserves the exact conversation for the namespace and fixture, freezes the exact project/conversation/content/opinion internal IDs plus every inserted email, composite preference, vote, and vote-content ID in the manifest, and inserts only the namespaced fixture relationships. Eligibility timestamps precede the future delivery cutoff. A competing namespace or any preexisting deterministic user, username, or email fails clearly instead of being merged. `attach` re-queries the unchanged target, validates reservation ownership, repeats target isolation, and rejects missing, duplicate, changed, or extra fixture relationships. `run` repeats the attachment validation immediately before starting the scoped worker.

Run `pnpm dev:exercise run`, use the normal local UI to send and accept a test and then start the final delivery, and press Ctrl-C only after the scenario reaches a terminal state. The exercise worker skips SNS entirely and scopes lease recovery, materialization, claims, kill-switch handling, and aggregation to updates linked exclusively to the frozen conversation. The dev-only reservation prevents another exercise namespace from seeding the target, but normal frontend writes do not honor it: do not add participation or create other updates for the target while the exercise is running. The `kill_switch` scenario starts with the guarded switch armed: the exercise runtime permits the required test and owner gate, then activates the switch as soon as the final delivery reaches the local provider so participant sends are stopped. Same-namespace commands are serialized by an owner-token lock with heartbeats and fail-closed dead-process recovery. Always stop the worker before `observe`, `verify`, or `cleanup`.

`observe` requires one correlated update and delivery, using the exact update ID recorded in provider tags when messages were emitted. `verify` compares materialized participants, owner-gate behavior, attempts, provider IDs/outcomes, terminal status, action-token counts, and the complete recipient set. `cleanup` does not require scenario verification to pass. Under a transaction-scoped advisory lock it accepts ownership only from exactly one provider-observed update ID or one update reached through fixture-recipient rows, validates the exact project, exclusive target, and second-precision preparation boundary, and removes only that update graph and the exact recorded fixture relationships. Drafts with no provider or fixture-recipient evidence are preserved; multiple or conflicting evidence fails without deletion. Cleanup releases only the exact target reservation after successful fixture cleanup. It preserves the marker, conversation, project, facilitator, entitlement, and unrelated rows. A manifest already in `cleaned` state is a no-op success.

The production TypeScript build excludes `src/devExercise`; the exercise runs only through the source-only `pnpm dev:exercise` command and is not copied into the production image output.

Run the focused safety suite with:

```bash
pnpm test:dev-exercise
pnpm test:dev-exercise:process
```

## Production Observability

Production writes one Pino JSON event per stdout/stderr line. Docker Compose's `awslogs` driver automatically sends those lines to CloudWatch Logs group `agora-prod-docker`, stream `conversation-email-update-worker`; the application does not need or use an AWS logging SDK.

Every operational event includes `service`, `event`, `environment`, `workerId`, and `outcome`. Depending on the event, records also include `durationMs`, an allowlisted `counts` object, operational `deliveryId`/`snsInboxId`, or public `attemptId`/`testAttemptId`. Errors contain only allowlisted `name`, `code`, and `category`; error messages and stacks are omitted. SQL query logs are suppressed, including development parameter values. Destination addresses, usernames, user IDs, content, links, tokens, authorization, connection strings, provider request payloads, and provider message IDs are never operational log fields.

`CONVERSATION_EMAIL_UPDATE_WORKER_HEARTBEAT_INTERVAL_MS` controls idle heartbeats and defaults to 60 seconds. It is bounded from 60 seconds through 1 hour. Normal empty polling ticks do not emit summaries; `tick_summary` appears only when work occurred, while `worker_heartbeat` provides low-frequency liveness.

Example CloudWatch Logs Insights queries:

```text
# Errors by normalized category and code
fields @timestamp, event, workerId, error.name, error.category, error.code, durationMs
| filter outcome = "failure" or level >= 50
| sort @timestamp desc
| limit 200
```

```text
# Test, participant, and owner provider outcomes
fields @timestamp, event, outcome, recipientKind, attemptId, testAttemptId, durationMs, error.code
| filter event in ["test_provider_outcome", "recipient_provider_outcome"]
| stats count(*) as attempts, pct(durationMs, 95) as p95DurationMs by event, recipientKind, outcome
```

```text
# Materialization volume and eligibility results
fields @timestamp, deliveryId, exhausted, counts.pageCandidates, counts.inserted, counts.materializedParticipants, counts.frequencyCapped, counts.ineligible
| filter event = "materialization_page"
| sort @timestamp desc
```

```text
# Heartbeat and stalled-worker investigation
fields @timestamp, workerId, event, outcome
| filter event in ["worker_started", "worker_heartbeat", "tick_summary", "worker_stopped"]
| stats max(@timestamp) as lastSeen, latest(event) as lastEvent by workerId
| sort lastSeen asc
```

```text
# Correlate one public attempt or operational delivery
fields @timestamp, event, outcome, attemptId, testAttemptId, deliveryId, error.code
| filter attemptId = "PUBLIC-ATTEMPT-UUID" or testAttemptId = "PUBLIC-TEST-ATTEMPT-UUID" or deliveryId = 12345
| sort @timestamp asc
```

## Image

```bash
pnpm image:buildx 1.0.0
pnpm image:push 1.0.0
```
