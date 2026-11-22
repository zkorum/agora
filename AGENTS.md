# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project overview

Agora Citizen Network is a privacy-preserving social platform using zero-knowledge proofs and bridging-based ranking.

| Service | Responsibility |
| --- | --- |
| `services/agora` | Main Vue/Quasar frontend |
| `services/app` | SvelteKit app and landing page |
| `services/api` | Fastify API for auth, conversations, and voting |
| `services/conversation-email-update-worker` | Conversation Email Updates delivery and SES events |
| `services/import-worker` | Polis URL and CSV imports |
| `services/math-updater` | Opinion-group analysis and AI descriptions |
| `services/scoring-worker` | Solidago MaxDiff rankings |

The Vue app calls Fastify through the generated OpenAPI client. The API and workers share PostgreSQL, with Valkey used for import jobs and analysis and scoring wakeups.

Read the relevant service README for setup and implementation details. For external library or repository research, check the gitignored `external/<repo>/` under the repository root before fetching from GitHub or searching the web.

## Domain language and glossary

Read [`GLOSSARY.md`](GLOSSARY.md) before introducing or changing domain terminology.
Its entries distinguish canonical code names, existing/historical names and
product/i18n wording. It is the source of truth for agreed meanings and naming,
not an implementation plan. Use the project-local `domain-modeling` skill in
`.agents/skills/domain-modeling/` when resolving terminology with the user.

- Before proposing terminology or a naming refactor, inspect actual definitions,
  callers, schema/DTO relationships and UI usage. Explain current and historical
  meanings; do not ask the user to choose names based only on intuition.
- Use canonical code names for new domain identifiers, types, components, props,
  filenames, mock data, stories and flow-specific i18n keys across both frontends
  and backend. Translated message values use the agreed product wording, with
  idiomatic equivalents in other languages.
- Interpret names by their documented concept and flow, not by word matching.
  Different labels can designate one entity; the same UI label can designate
  different entities. Unrelated uses, such as code/feedback comments or an
  activity log, are not domain aliases.
- Name identifiers for the entity and scope they actually identify: a global
  user ID is `userId`, not a conversation-participant ID. Qualify local participant
  identifiers at mixed-scope boundaries; product roles such as participant or
  facilitator do not change the underlying global identity.
- Naming refactors need source evidence and an explicit scope. Do not treat every
  historical spelling as a defect or replace accurate mathematical/upstream
  terminology. Keep temporary cleanup priorities in the local refactor inventory,
  not in glossary definitions.
- When already working on historical code, small, directly related naming
  improvements toward the canonical terms are allowed when they improve clarity
  and affected callers/tests can be updated safely. Do not make unrelated
  historical cleanup a prerequisite for normal work. Aggressive, broad or
  repository-wide renaming requires an explicit request.
- Update the glossary when an agreed decision changes a term's meaning or
  distinguishes it from another concept. Keep definitions short. Put detailed
  behavior, eligibility and retention rules, and edge cases in the owning
  policy or design document—not in the glossary. Keep source inventories,
  proposed renames and implementation sequencing out of it. No
  terminology-specific lint rule is required.
- A glossary update does not authorize bulk renaming of existing code, database
  structures, API contracts, generated code or published URLs. Apply changes only
  in deliberately scoped refactors; do not introduce parallel domain models
  merely to match UI wording.

If the local, gitignored `AGENTS_NAMING_REFACTOR.md` exists, consult it when
planning the naming-only cleanup. It is a scoped implementation inventory, not a
second glossary or authorization to execute a refactor.

## Development

Use the root `make dev-*` targets. The entry points are `dev-app` for Quasar, `dev-landing` for SvelteKit, `dev-api`, `dev-conversation-email-update-worker`, `dev-import-worker`, `dev-math-updater`, and `dev-scoring-worker`.

See each service README for environment setup. In Quasar, `services/agora/src/utils/processEnv.ts` is the Zod source of truth and exports `processEnv` for typed runtime access. `services/agora/src/env.d.ts` derives the type and `quasar.config.ts` derives exposed keys. Its Vite plugin fails the build when required variables are missing or invalid. `env-cmd` loads `.env.dev` for `pnpm dev` and the staging or production file before Quasar evaluates its config. Staging requires `VITE_STAGING=true` and permits staging-only use of dev variables. Production requires `VITE_STAGING=false` and disallows dev-only variables. See [Quasar environment variables](services/agora/README.md#environment-variables).

### Development logs

Inspect durable logs before requesting terminal output. Use `make logs`, `make logs-tail service=api`, or `rg` directly on `.local/logs/latest/<service>.log`. Full logs live in `.local/logs/runs/<run-id>/<service>.log`. Latest sidecars are `<service>.events.jsonl` for `AGORA_LOAD_EVENT`, `<service>-browser.jsonl` for `AGORA_BROWSER_EVENT`, and `<service>.summary.json` for exported k6 results.

`scripts/dev-log-runner.mjs` wraps the root dev targets. `run_all_in_kitty_tabs.sh` shares one `AGORA_LOG_RUN_ID` across its tabs. Raw targets and direct service commands need an explicit wrapper for durable capture. The runner defaults to 25 MB per log, five rotated files, seven days of retention, and a 750 MB total cap. Override with `AGORA_LOG_DIR`, `AGORA_LOG_RUN_ID`, `AGORA_LOG_MAX_BYTES`, `AGORA_LOG_MAX_FILES`, `AGORA_LOG_RETENTION_DAYS`, or `AGORA_LOG_MAX_TOTAL_BYTES`.

### Testing and linting

Run these from the applicable service directory. See the README or package scripts for targeted commands.

| Service | Commands |
| --- | --- |
| `agora` | `pnpm lint:fix`, `pnpm test` (see test lifecycle below) |
| `app` | `pnpm lint:fix`, `pnpm check`, `pnpm test:unit`, `pnpm test:e2e` |
| `api`, `math-updater` | `pnpm lint`, `pnpm test` |
| `conversation-email-update-worker` | `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` |
| `scoring-worker` | `make test`, `make lint`, `make typecheck` |

When explicitly asked for `lint:fix`, run only that service's `lint:fix` unless the user requests broader verification.

### Test lifecycle

**Verify locally; retain tests deliberately.** Use existing checks or write
temporary tests and probes with synthetic data. Prefer `.local/` or a session
temporary directory, and leave scratch files out of the final diff.

Kept tests, fixtures, and helpers are maintained source code. Keep them only
when they protect important behavior not already covered. Test outcomes, not
implementation details, and don't copy production logic into expectations.
Prefer pure functions for domain decisions when the separation also makes the
production code clearer. Don't remove an existing test without understanding
what it protects. Use the [test-lifecycle skill](.agents/skills/test-lifecycle/SKILL.md)
when adding or auditing tests, or refactoring for testability.

**For now:** The legacy Vue/Quasar suite in `services/agora` has known test debt.
Skip it in general test audits and cleanup unless explicitly requested. Still
verify relevant changes to the Vue app.

### Git commits

- Follow [Conventional Commits](https://www.conventionalcommits.org/). Aim for under 50 characters in the subject, with a hard limit of 72. Use a lowercase imperative description and omit the final period.
- Explain the changes, motivation, important implementation details, and relevant issue or PR references in the body. Always include `Deploy: <service1>, <service2>, ...` or `Deploy: none` as applicable. Keep references to AI assistants and tools out of commit messages.
- Before committing, review `git status` and `git diff --staged`. Check for unrelated changes, secrets, and debug code. Remove redundant or stale comments and unnecessary commented-out code. Use comments to explain why a choice was made. Report suspicious staged files and abort the commit. Wait for user confirmation before committing.

## Database and generated code

Ordinary API and worker row removal must use soft deletion (set `deletedAt`) or non-destructive updates/upserts. `make check-soft-deletes` enforces this in CI, API lint, and scoring-worker lint. The planned dedicated `services/deletion-worker/` is the intended hard-purge exception. See [the deletion plan](AGENTS_DELETION_SERVICE_PLAN.md), section 6.5.1, for scoring tombstones and eligibility and coordination rules. Other exceptions are tests, guarded production-excluded development cleanup, and exact hash-pinned historical destructive migrations. The separately approved, hash-pinned `V0115.1__retire_zupass.sql` may permanently remove only retired event-ticket premium entitlements. Ticket/nullifier records and other application rows remain outside its scope.

### Shared code and schema generation

- Edit canonical source under `services/shared*/src/`. `make sync` copies shared TypeScript via rsync, and `make dev-sync` watches it. Generated copies have warning comments and must never be edited directly. `shared-app-api` is shared by the API and frontend for UCAN and auth. `shared-backend` goes to the API and selected TypeScript workers.
- Edit the canonical schema at `services/shared-backend/src/schema.ts`, run `make sync-ts-backend`, then run `pnpm db:generate` in `services/api` and review the generated SQL in `services/api/drizzle/`. Versioned Flyway migrations live in `services/api/database/flyway/`. API commands `pnpm db:migrate` and `pnpm db:undo` use Flyway and Docker.
- Python models and constants are generated from shared sources. For a table used by the scoring worker, add `/** @service scoring-worker */` on the canonical schema table and run `make sync-python-artifacts`. Import the SQLAlchemy model from `scoring_worker.generated_models`. Never hand-write scoring-worker table definitions.

### Migration authoring

- For schema changes, edit only `services/shared-backend/src/schema.ts`, run `make sync-ts-backend`, and use the API's `pnpm db:*` commands to generate/apply migrations. Do not manually edit generated API/worker copies, Drizzle SQL files, or Flyway SQL files for normal schema changes.
- If a migration command is interactive or destructive, such as dropping/regenerating migrations, ask the user to run it or explicitly approve it first.
- Hand-written Flyway SQL is allowed for data backfills that change existing rows, and for database features that `schema.ts` cannot represent, such as PostgreSQL functions, triggers, and `NOTIFY`. Use schema generation for representable schema changes.
- If generated SQL fails because of ordering or tool limitations, prefer adding or moving generated migration files before editing SQL contents. Edit generated SQL only when necessary to make the migration valid.

### Local tooling

Useful prerequisites include Node.js 20+ (frontends use 22/24), pnpm, Python 3.13+ with uv, Docker, Valkey or Redis, watchman, rsync, make, jq, and sed. Run `pnpm image:build` in the service directory where provided.

### Database queries and routing

The database supports direct connection strings and AWS Secrets Manager. See the service README for its connection and Valkey settings.

- Use schema-backed Drizzle queries for application-table reads and writes. Use Drizzle helpers for schema predicates too, including partial-index predicates and check constraints. When no helper exists for a PostgreSQL expression such as `clock_timestamp()` or a filtered aggregate, keep the `sql` fragment small, use it inside a typed Drizzle query over a real schema table, map the result to its runtime type, and explain why it is needed. Do not fabricate a `VALUES` or `SELECT 1` source. Model missing rows explicitly without inventing a fallback value such as an application clock for a missing policy row.
- Choose routing at service boundaries with the central accessors in `services/shared-backend/src/db.ts`. Drizzle v1's default handle uses the primary. Opt in to `getReplicaDatabase(db)` for ordinary display reads and accept `ReplicaDatabase` in query-only helpers that preserve the caller's reader. The accessor preserves an explicit primary or transaction. Do not recreate automatic SELECT routing.
- Keep writes, transactions, row-locking SELECTs, all CTEs, raw execution, freshness-sensitive reads, and authorization/admission decisions requiring current state on `getPrimaryDatabase(db)` or the current transaction. An outer SELECT can contain a writable CTE. `ReplicaDatabase` omits CTE builders, writes, transactions, and raw execution. Lint guards against replica row locks and direct `$replica` access. SQL fragments can still call functions with side effects, so review their behavior before routing to a replica.
- For read-after-write, prefer `.returning()` and build DTOs, queue payloads, notifications, or cache data from known values. If a follow-up read is necessary, use the same transaction or a fresh primary-side view. Reserve primary fallbacks for data that cannot be carried forward or rebuilt.

### API Controller and Service Layers

Use a Spring-inspired layered boundary. [`API controllers`](GLOSSARY.md#api-controller)
handle HTTP input, request authentication, service calls, and HTTP output.
`services/api/src/index.ts` wires dependencies and registers routes; it is not
the place for application logic. Controllers and route handlers must not query
the database directly, whether through Drizzle or raw SQL. Put application
rules, data-backed authorization, reads, writes, transactions, and side-effect
coordination in the [`API service` layer](GLOSSARY.md#api-service). Wiring a
database handle into a service at startup is not a database query.

Design [`API DTOs`](GLOSSARY.md#api-dto) for the endpoint and its callers, not
as copies of the database schema. A service may accept a parsed request DTO and
return a route-specific response DTO directly. Do not add a parallel service
type or a controller mapping solely to keep DTOs out of the service.

Services may use typed Drizzle queries directly. Do not add a DAO or repository
layer by default; extract a storage helper when it removes meaningful
duplication or owns a substantial persistence concern.

### HTTP and OpenAPI

Use POST for API endpoints and put request data in the body. Do not use URL path parameters or query strings for request data. SSE requires GET, for example `/api/v1/notification/stream`. Deletion endpoints follow the soft-deletion policy above.

Define Zod request/response schemas, register the route with its Swagger metadata in `services/api/src/index.ts`, and have its handler call the service layer. Run `make generate` (or use `make dev-generate` to watch) to regenerate the frontend OpenAPI client. Fastify emits `services/api/openapi-zkorum.json`, and the generated client lives in `services/agora/src/api/`. Use typed frontend wrappers in `services/agora/src/utils/api/` and never edit the generated client by hand.

### Background Jobs and Queues

Do not use pg-boss. Older docs may mention it, but it is not part of the current target architecture.

Current queue patterns:

- **Import queue**: API pushes import requests to Valkey list `queue:imports` with `RPUSH`; `services/import-worker` consumes batches with `LPOP`. Delivery is at-most-once, and `conversation_import` remains the user-facing source of truth. Import-worker pushes notification events to `queue:imports:events` for API SSE fanout.
- **Opinion-group analysis queue**: API/shared-backend scheduling and import-worker add dirty conversations to Valkey sorted set `analysis:dirty` with `ZADD`; `services/math-updater` consumes with `ZPOPMIN`, requeues on retryable failures or shutdown, and uses Postgres analysis work-state rows with leases for durable computation/AI-description work coordination.
- **Solidago scoring queue**: API marks conversations dirty in Valkey sorted set `scoring:dirty:solidago`; `services/scoring-worker` consumes with `ZPOPMIN` lightest-first and re-adds items on retryable failures or shutdown.
- **AI description and translation retries**: Python workers use Postgres work tables with `lease_owner`, `lease_token`, and `lease_expires_at`; workers claim rows with database leases, heartbeat active leases, recover expired leases, and retry according to persisted work state.

For new durable background work, prefer a Postgres table that is both the job source of truth and result/progress record, with explicit status, retry metadata, and lease/claim fields. Valkey is appropriate for dirty-set wakeups, rate limits, and ephemeral buffers, but correctness should not depend on a lossy queue unless a durable database row is the source of truth.

### Authentication

- **UCAN (User Controlled Authorization Network)**: Capability-based auth with signed requests
- **Rarimo integration**: Zero-knowledge proof for anonymous human verification
- **Phone OTP**: Twilio-based phone verification fallback

Authorization headers built via `buildAuthorizationHeader(encodedUcan)` in frontend API wrappers.

## Code quality

Explain any intentional exception to this guidance.

### TypeScript

- Prefer types and constraints that make invalid states unrepresentable. Enforce expressible data invariants in the database, use API/schema validation for constraints awkward in SQL, and use TypeScript for in-process guarantees. Prefer discriminated unions and readonly data where practical. Reserve runtime guards for external boundaries, untyped or legacy integrations, and exceptional failures.
- Avoid type assertions (`as`), non-null assertions (`!`), `@ts-ignore`, `@ts-expect-error`, and inline ESLint suppression. Use narrowing, the right data structures, and `satisfies`. A confirmed compiler bug may need a documented workaround with an issue link. Fix inappropriate lint rules in configuration.
- Parse untyped input with Zod and use the typed result. For DTOs with correlated fields, use schemas such as `z.discriminatedUnion()` and pass parsed values downstream instead of recreating parallel interfaces or runtime checks. Plain parameter objects are fine for flat DTOs. Check both the source schema and regenerated shared/client copies, since OpenAPI may lose some Zod semantics.
- Use `async`/`await` instead of `.then()` or `.catch()` chains. Use an object parameter for functions with two or more inputs.
- Use pure functions for stateless work. Encapsulate stateful services (buffers, caches, managers) in closures that mutate only private state and expose an immutable API. Use classes only when interface compatibility requires them.
- Prefer `undefined` for absence in application code. Normalize database `null` through `toUnionUndefined()` in service mappers when the consuming shape represents absence. Omit absent optional fields or use `undefined` in frontend-facing DTOs. Preserve `null` where database, external, or DTO contracts require it and convert explicitly at boundaries.

### Browser compatibility

Use APIs supported by the declared browser contract or by maintained, centralized compatibility tooling. Keep third-party syntax, module-format, and runtime compatibility in the build pipeline. Avoid handwritten polyfills and patching globals or prototypes. For a confirmed platform bug, scope the workaround narrowly and explain why centralized tooling is insufficient.

When changing the support floor or tooling, update the shared browser targets, JS and CSS processing, production-build verification, and support matrix together. Prefer idiomatic APIs already supported by the centralized build. Inspect the bundle before changing modern syntax or APIs for compatibility or size.

### Logging

Prefer `log.info()`, `log.warn()`, or `log.error()` for production-relevant events.

`log.debug()` is allowed in Python workers for dev-only or high-frequency diagnostics. Python workers default to `DEBUG` when `AGORA_DEV_MODE=true`, default to `INFO` otherwise, and support worker-specific `*_LOG_LEVEL` overrides.

API uses `API_LOG_LEVEL` (default `info`). Database-query diagnostic events require both
`API_LOG_SQL_QUERIES=true` and DEBUG logging; only parameter counts are logged,
not SQL statements or parameter values. TypeScript backend logging uses the
shared privacy projections described in `services/shared-backend/LOGGING.md`.
Ranking performance events are opt-in with `API_RANKING_PERFORMANCE_ENABLED=true`
and `SCORING_WORKER_PERFORMANCE_ENABLED=true`, and use the existing
`AGORA_LOAD_EVENT`/dev-log-runner capture system. See
`services/load-testing/PERFORMANCE.md`. Keep routine logs production-oriented;
the frontend still awaits a centralized log-level mechanism.

**Required pattern for new TypeScript backend logs:**

- Use the configured privacy-aware logger; do not create unrestricted Pino instances or bypass it with `console`/stdout.
- In the API, use `logApiError` for new error events. Use schema-derived structured events in the Conversation Email Updates worker.
- Put approved counts, timings, and necessary pseudonymous IDs in structured fields. Keep messages source-controlled and registered in `services/api/src/logging/messages.ts`; never interpolate user/provider data into messages.
- Extend the event/metadata schemas deliberately when adding useful context. Unknown fields are omitted and unapproved messages become generic; do not rely on them reaching the logs.
- Never log credentials, OTPs, bodies, raw URLs, SQL, or raw provider response/configuration data, including through child bindings. Preserve the privacy hooks on child loggers and verify changes against emitted-log tests. See [the shared logging guide](services/shared-backend/LOGGING.md).

## Frontend

Avoid `!important` in CSS/SCSS. Adjust selectors or structure to get the needed specificity.

### Vue/Quasar (`services/agora`)

- Keep navigation instant with TanStack Query caching, optimistic updates, and preloading. Show cached data immediately and refresh in the background. Use skeletons or `PageLoadingSpinner` when data is unavailable. Preserve scroll and component state across `KeepAlive` activation.
- Always use [SpaLink](services/agora/src/components/ui-library/SpaLink.vue) for internal navigation in place of plain anchors, `RouterLink`, or buttons. It renders a native link and uses a [capture-phase interceptor](services/agora/src/boot/spaLinkInterceptor.ts) to avoid full reloads. By default the interceptor prevents native navigation and calls `router.push()`. With `deferred`, the interceptor only prevents native navigation and the component handles routing, such as using `router.back()` for analysis/comment tab history.
- Pass data through explicit, required, typed props instead of `provide`/`inject`. Normalize nullable upstream data at the source when a concrete value is required. For props where absence is part of the contract, use required `prop: T | undefined` and wire it explicitly at every call site.
- Use CSS logical properties, `text-align: start/end`, and flex alignment values such as `flex-start/end`. `postcss-rtlcss` flips stylesheet directions. Use Quasar's `$q.lang.rtl` for directional icons and inline positioning; locale packs are configured in `src/boot/i18n.ts`. Verify with Arabic, Persian, or Hebrew in Settings → Language.
- For manual component checks, use `/dev/component-testing`. Add a component and its `.i18n.ts` in `services/agora/src/pages/dev/test-components/` and register it in `component-testing.vue`. Follow `PreferencesDialogTest.vue` for opening globally mounted dialogs via a store action.

### SvelteKit (`services/app`)

Read the [Svelte app README](services/app/README.md) before changes. It covers routes, SSR, design system, testing, and scripts. For optional Storybook previews or story-authoring guidance, follow the [OpenCode MCP workflow](services/app/README.md#opencode-mcp-integration). Restore the server's disabled state afterward and stop Storybook only if you started it.

- Use Svelte 5 runes and keep routes thin with the Routes → Components → UI hierarchy. Use `$ui`, `$components`, `$logic`, and `$state` aliases. Use explicit module extensions with native `#lib/*` package imports. Avoid barrel re-exports and keep imports within the app or its approved shared code. Never keep user data in module-level `$state()`.
- Style new components and stories with Tailwind v4 utilities and shared design tokens. Do not add scoped `<style>`, inline style strings, or static style directives. Bind runtime sizes or percentages to CSS custom properties consumed by utilities. Compose `$ui/` wrappers for interactive controls. Import Bits UI primitives only inside the corresponding wrappers.
- Use Iconify's `icon-[collection--name]` classes for standard icons and reserve inline SVGs for other artwork. Use `lucide` for UI and `simple-icons` for brands. Apply `gradient-primary` for the brand gradient and use existing wrappers in `$ui/shared/icons/` for social/external links. The [Tailwind utilities in app.css](services/app/src/app.css) also include `gradient-secondary`, `gradient-chip`, `gradient-border`, and `gradient-border-light`.
- Use Vitest for logic and state, Storybook for the actual shared components, and Playwright for keyboard, focus, layout, and routed flows. Avoid a separate DOM/component test stack.
