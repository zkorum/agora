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
make dev-conversation-email-update-worker
# Equivalent explicit scenario:
make dev-conversation-email-update-worker-scenario SCENARIO=simulated-success
```

The normal `make dev-conversation-email-update-worker` and service-local `make dev` commands default to `simulated-success`; they never select SES. Available explicit scenarios are `simulated-success`, `simulated-retry-then-success`, `simulated-retry-always`, `simulated-non-retryable`, and `simulated-unknown`. The simulator requires `NODE_ENV=development`, `AGORA_DEV_MODE=true`, `CONVERSATION_EMAIL_UPDATE_PROVIDER=simulated`, and `CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED=true`; startup rejects simulated delivery in every other environment.

### Development Exercise

`src/devExercise/index.ts` is a separate, fail-closed entry point for exercising the real worker loop with a local instrumented provider. Its guard is statically imported; database, worker, and network-capable modules are dynamically imported only after every safety condition passes. The launcher loads only `.env.dev-exercise`, supplies local-safe exercise defaults, and starts the guarded entry point with a sanitized environment. It does not load the normal `.env` or use the normal worker configuration defaults.

The exercise is not a single test command. It deliberately separates fixture creation, safety checks, worker execution, observation, verification, and cleanup so a failure cannot silently modify the wrong database or be mistaken for a successful delivery.

| Command               | Purpose                                                                                                                                                      | Evidence produced                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `plan`                | Freezes the scenario, target slug, participant count, deterministic identities, and database marker before any database write.                               | Creates `<namespace>.manifest.json` in the local artifact directory.                                          |
| `initialize-database` | Confirms the narrowly named loopback database and installs only the exercise marker and target-reservation tables. It does not run application migrations.   | Prints the confirmed database name.                                                                           |
| `prepare`             | Validates the untouched target and inserts deterministic participant users, `.invalid` emails, preferences, and votes.                                       | Updates the manifest with every inserted relationship.                                                        |
| `attach`              | Re-reads the target and fixture and fails if anything changed after preparation.                                                                             | Transitions the manifest to `fixture_attached`.                                                               |
| `run`                 | Starts the real conversation-scoped worker with the local instrumented provider while the facilitator sends the test and final update through the normal UI. | Logs delivery status changes, stops automatically at a terminal status, and writes `<namespace>.report.json`. |
| `observe`             | Correlates the provider report with the exact update, delivery, recipients, attempts, and tokens in PostgreSQL.                                              | Adds the database observation and prints delivery/count summaries.                                            |
| `verify`              | Compares the provider and database evidence with the selected scenario's exact expected outcome.                                                             | Prints pass/fail and writes the final report.                                                                 |
| `cleanup`             | Removes only exercise-owned update and participant rows after ownership checks.                                                                              | Marks the manifest `cleaned`; preserves the target and report artifacts.                                      |

Before creating a plan:

1. Create a dedicated local database named `agora_email_exercise_*` and apply all normal application migrations.
2. Run the API against that same database with `CONVERSATION_EMAIL_UPDATES_ENABLED=true`, `CONVERSATION_EMAIL_UPDATES_KILL_SWITCH=false`, and no read-replica connection.
3. Run Agora at `http://127.0.0.1:3200`.
4. Bootstrap a site administrator, then use the administrator UI to grant the facilitator the Email Updates entitlement and organization-member capability.
5. Create the target through the normal UI. It must be an active, open Polis conversation in an active listed project, have current conversation content and at least one active opinion with current content, and have no votes, participants, or previous Email Update.
6. Record the generated eight-character conversation slug for the environment below.

Create the ignored exercise environment once. It contains only the connection, persistent safety marker, and target conversation slug because all other local exercise settings have safe defaults:

```bash
cp env.dev-exercise.example .env.dev-exercise
openssl rand -hex 32 # Paste this once as the marker; it must remain unchanged.
# Edit .env.dev-exercise with the real password, marker, and generated slug.

pnpm dev:exercise plan
pnpm dev:exercise initialize-database
pnpm dev:exercise prepare
pnpm dev:exercise attach
pnpm dev:exercise run
pnpm dev:exercise observe
pnpm dev:exercise verify
pnpm dev:exercise cleanup
```

The launcher defaults to database name `agora_email_exercise_local`, site URL `http://127.0.0.1:3200`, 30 participants, namespace `my-local-exercise`, scenario `success`, and body capture disabled. Optional overrides are documented in `env.dev-exercise.example`; selecting `kill_switch` automatically arms the kill switch. From the repository root, `make dev-conversation-email-update-worker-exercise COMMAND=plan` is equivalent to `pnpm dev:exercise plan` in this directory.

Run each command only after the previous command reports its result and next action. During `run`, open `/email-updates/?conversationSlugId=<generated-slug>`, send exactly one test, wait for provider acceptance, then send the unchanged final update. The worker logs each delivery status transition and exits automatically when the delivery reaches its scenario-specific terminal status. `observe` and `verify` then provide the authoritative result; a terminal UI status alone is not considered a passing exercise.

The launcher allowlists only exercise configuration, so inherited database, PostgreSQL, AWS, and SES variables cannot reach the exercise process. The guard independently rejects production/staging, missing flags, non-loopback database or site URLs, database-name mismatches, read-replica variables, `DB_HOST`/`PG*`/`DATABASE_URL` alternate database configuration, every `AWS_*` variable, and all real SES region/sender/configuration-set variables. The expected database name must match `agora_email_exercise_[a-z0-9_]+`. The conversation slug must be exactly eight alphanumeric characters and the participant count must be an integer from 1 through 10,000. `mixed_participant_outcomes` requires at least three participants so every outcome cohort exists. The database marker is a mandatory random or explicit confirmation value of at least 32 characters. The kill switch must be false except when `CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO=kill_switch`, where it must be true. Process tests prove these guards run before importing the database/worker runtime.

Supported scenarios are `success`, `owner_permanent_rejection`, `participant_retry_then_success`, `mixed_participant_outcomes`, and `kill_switch`. Participant UUIDs, usernames, unique reserved `.invalid` emails, and ordinal cohorts are deterministic within the namespace; existing project owners are never added to the participant cohort. Test messages are always accepted. Final owner copies are identified by their update tag and absent unsubscribe URL, and participant behavior is selected only by an exact fixture email match. The provider is entirely local and never constructs or calls SES. Provider reports contain hashes and counts plus exact update/recipient correlation IDs, not rendered bodies. Setting `CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES=true` stores full messages locally as mode-`0600` files.

Artifacts use exact lifecycle states `planned`, `fixture_prepared`, `fixture_attached`, `worker_running`, `awaiting_ui_action`, `observing`, `verified`, `failed`, and `cleaned`. Manifests, reports, and optional message captures are atomically written under the repository-root `.local/conversation-email-update-fixtures/` directory.

`initialize-database` is the only command that creates the narrowly named dev-only marker and target-reservation tables. It first verifies `current_database()` and then records the exact confirmation value from the guarded plan. Every later database command requires the same marker. The dedicated name, literal loopback URL, and marker prevent accidental production use and reject an uninitialized forwarded database. They cannot prove physical locality if an operator deliberately initializes a forwarded matching database. Cleanup deliberately retains the marker table; remove the dedicated database itself when it is no longer needed.

Before `prepare`, the target must already have the normal owner membership, capability, premium entitlement, contact, and email-update configuration needed by the UI. The fixture store does not create or modify any of those records.

`prepare` verifies `current_database()`, rejects a target with any existing participation or Conversation Email Update, atomically reserves the exact conversation for the namespace and fixture, freezes the exact project/conversation/content/opinion internal IDs plus every inserted email, composite preference, vote, and vote-content ID in the manifest, and inserts only the namespaced fixture relationships. Eligibility timestamps precede the future delivery cutoff. A competing namespace or any preexisting deterministic user, username, or email fails clearly instead of being merged. `attach` re-queries the unchanged target, validates reservation ownership, repeats target isolation, and rejects missing, duplicate, changed, or extra fixture relationships. `run` repeats the attachment validation immediately before starting the scoped worker.

Run `pnpm dev:exercise run`, use the normal local UI to send and accept a test and then start the final delivery. The exercise worker skips SNS entirely and scopes lease recovery, materialization, claims, kill-switch handling, and aggregation to updates linked exclusively to the frozen conversation. It stops automatically after observing a terminal delivery. Ctrl-C remains available for aborting a stuck or mistaken run, but an abort marks the exercise failed and exits nonzero; run `cleanup` rather than `observe` afterward. The dev-only reservation prevents another exercise namespace from seeding the target, but normal frontend writes do not honor it: do not add participation or create other updates for the target while the exercise is running. The `kill_switch` scenario starts with the guarded switch armed: the exercise runtime permits the required test and owner gate, then activates the switch as soon as the final delivery reaches the local provider so participant sends are stopped. Same-namespace commands are serialized by an owner-token lock with heartbeats and fail-closed dead-process recovery. Always stop the worker before `observe`, `verify`, or `cleanup`.

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
