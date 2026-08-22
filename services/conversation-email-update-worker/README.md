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
export CONNECTION_STRING=postgresql://postgres:postgres@127.0.0.1:5432/agora_email_exercise
export CONVERSATION_EMAIL_UPDATES_ENABLED=true
export CONVERSATION_EMAIL_UPDATES_KILL_SWITCH=false
export CONVERSATION_EMAIL_UPDATE_PROVIDER=simulated
export CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED=true
export CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL=http://127.0.0.1:8080
export CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_EXPECTED_DB_NAME=agora_email_exercise
export CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID=Ab12Cd34
export CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT=30
export CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_NAMESPACE=my-local-exercise
export CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO=mixed_participant_outcomes
export CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES=false

pnpm dev:exercise plan
```

The guard rejects production/staging, missing flags, non-loopback database or site URLs, database-name mismatches, read-replica variables, `DB_HOST`-style configuration, every `AWS_*` variable, and SES sender/configuration-set variables. The conversation slug must be exactly eight alphanumeric characters and the participant count must be an integer from 1 through 10,000. The kill switch must be false except when `CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO=kill_switch`, where it must be true. Process tests prove these guards run before importing the database/worker runtime.

Supported scenarios are `success`, `owner_permanent_rejection`, `participant_retry_then_success`, `mixed_participant_outcomes`, and `kill_switch`. Participant UUIDs, usernames, unique reserved `.invalid` emails, and ordinal cohorts are deterministic within the namespace; existing project owners are never added to the participant cohort. Test messages are always accepted. Final owner copies are identified by their update tag and absent unsubscribe URL, and participant behavior is selected only by an exact fixture email match. The provider is entirely local and never constructs or calls SES. Provider reports contain hashes and counts plus exact update/recipient correlation IDs, not rendered bodies. Setting `CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES=true` stores full messages locally as mode-`0600` files.

Artifacts use exact lifecycle states `planned`, `fixture_prepared`, `fixture_attached`, `worker_running`, `awaiting_ui_action`, `observing`, `verified`, `failed`, and `cleaned`. Manifests, reports, and optional message captures are atomically written under the repository-root `.local/conversation-email-update-fixtures/` directory.

The orchestration command surface is:

```bash
pnpm dev:exercise plan
pnpm dev:exercise prepare
pnpm dev:exercise attach
pnpm dev:exercise run
pnpm dev:exercise observe
pnpm dev:exercise verify
pnpm dev:exercise cleanup
```

Before `prepare`, create and configure the target through the normal local UI. It must be an active, open Polis conversation in an active project, have current conversation content and at least one active opinion with current content, and already have the normal owner membership, capability, premium entitlement, contact, and email-update configuration needed by the UI. The fixture store does not create or modify any of those records.

`prepare` verifies `current_database()`, freezes the exact project/conversation/content/opinion internal IDs in the manifest, and inserts only the namespaced participant users, display languages, primary emails, enabled project/conversation preferences, votes, and vote content. Eligibility timestamps precede the future delivery cutoff. A namespace with any preexisting deterministic user, username, or email fails clearly instead of being merged. `attach` re-queries the unchanged target and validates every participant relationship and count.

Run `pnpm dev:exercise run`, use the normal local UI to send and accept a test and then start the final delivery, and press Ctrl-C only after the scenario reaches a terminal state. The `kill_switch` scenario starts with the guarded switch armed: the exercise runtime permits the required test and owner gate, then activates the switch as soon as the final delivery reaches the local provider so participant sends are stopped. Always stop the worker before `observe`, `verify`, or `cleanup`.

`observe` requires one correlated update and delivery, using the exact update ID recorded in provider tags when messages were emitted. `verify` compares materialized participants, owner-gate behavior, attempts, provider IDs/outcomes, terminal status, action-token counts, and the complete recipient set. `cleanup` runs under a transaction-scoped advisory lock, revalidates namespace ownership, and removes only the observed update graph in foreign-key reverse order followed by the fixture votes, preferences, emails, languages, and users. It preserves the conversation, project, facilitator, entitlement, and unrelated rows. Cleanup is idempotent after successful completion and refuses partial or changed fixture relationships. Stop the worker first; cleanup cannot coordinate with a running process.

Run the focused safety suite with:

```bash
pnpm test:dev-exercise
pnpm test:dev-exercise:process
```

## Image

```bash
pnpm image:buildx 1.0.0
pnpm image:push 1.0.0
```
