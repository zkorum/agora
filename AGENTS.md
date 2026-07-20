# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## External Repository References

When the user mentions needing to understand an external library or repository, **first check if it's cloned locally** in the `external/` directory at the repository root before fetching from GitHub or using web search.

**Important**: The repository root is where AGENTS.md is located. An agent's working directory may be a subdirectory (e.g., `services/agora/`), so use paths relative to the repository root or use `../../external/` to navigate up from subdirectories.

**Pattern**: External repos are sometimes cloned into `external/` at repository root for analysis. This directory is gitignored.

**Workflow**:

1. First, check if a directory with the repository name exists in `external/` at repository root (e.g., `../../external/vite-plugin-validate-env/` from `services/agora/`)
2. If found, read the relevant files directly from the local clone
3. If not found, fall back to WebSearch or WebFetch from GitHub

**Example**: If analyzing how `vite-plugin-validate-env` works from within `services/agora/`, check `../../external/vite-plugin-validate-env/` first.

## Project Overview

Agora Citizen Network is a privacy-preserving social platform using zero-knowledge proofs and bridging-based ranking algorithms. The monorepo contains:

- **`services/app`** (SvelteKit) - Landing page
- **`services/agora`** (Vue/Quasar) - Main frontend application
- **`services/api`** (Fastify) - Backend API
- **`services/import-worker`** (Python) - Conversation import worker
- **`services/math-updater`** (Python) - Opinion-group analysis worker
- **`services/scoring-worker`** (Python) - Solidago scoring worker for MaxDiff rankings

### Why SvelteKit for the Landing Page?

`services/app` is the landing page, built with SvelteKit for these reasons:

- **Better first paint**: SSR + CSR hydration for faster initial load
- **Per-route flexibility**: Configure prerendering, SSR, or CSR per route
- **Smaller bundles**: Svelte compiles away - no runtime framework overhead
- **Clean slate**: Tailwind CSS v4 + Bits UI (headless components)
- **Future-ready**: Easy path to native apps via Tauri if needed
- **Agent-friendly**: Simple file-based routing, explicit data flow - easy for AI coding agents

The landing page is embedded in the app (not a separate static site) because features like "Explore Conversations" will need database access via SSR.

### UX Philosophy: Native-Like Experience

The main frontend (`services/agora`) is a web app that should **feel like a native mobile app**. Every interaction should feel instant and responsive:

- **Instant page loads**: Use caching (TanStack Query), optimistic updates, and preloaded data so page transitions feel immediate. Show skeleton loaders or spinners only when data genuinely isn't available yet.
- **SPA navigation everywhere**: Never cause full page reloads. Use `SpaLink` (not plain `<a>`, `<RouterLink>`, or `<button>`) for all internal navigation links. See the "SpaLink for Internal Navigation" section under Important Patterns.
- **KeepAlive for scroll preservation**: Pages wrapped in `<KeepAlive>` preserve scroll position and component state when navigating back. Don't reset state unnecessarily on re-activation.
- **Background data refresh**: Refresh stale data silently in the background. Don't show loading states when cached data is available — show the cache immediately, refresh behind the scenes.
- **No jank**: Avoid layout shifts, flash of empty content, or unnecessary re-renders. Use skeleton placeholders or `PageLoadingSpinner` to hold space while content loads.

### Terminology: Comment / Opinion / Statement

The codebase uses `comment` and `opinion` interchangeably in variable names, database columns, and API endpoints for historical reasons. **Conceptually, comment = opinion = statement.** They all refer to the same thing: a user-submitted proposition that others vote on.

**In code:** Keep existing `comment`/`opinion` naming as-is. In doubt, use `opinion` for new code.

**In user-facing text (UI labels, translations):**

- English: **"statement"**
- French: **"proposition"**
- Other languages: use the idiomatic equivalent (not a literal translation)

**Exceptions — these are different concepts:**

- **"Opinion Group"**: refers to a cluster of users with similar voting patterns. Keep as-is.
- **"Thanks for your comments!"**: in the context of user reports/feedback, "comment" means the user's free-text input, not a statement in a conversation.

## Environment Variables (Frontend)

The frontend (`services/agora`) uses a comprehensive environment variable validation system:

- **Single source of truth**: `services/agora/src/utils/processEnv.ts` (zod schema)
- **TypeScript types**: Auto-derived in `services/agora/src/env.d.ts` using `z.infer<typeof envSchema>`
- **Build-time validation**: Custom Vite plugin in `quasar.config.ts` runs `validateEnv()` during build
- **Env object generation**: `quasar.config.ts` generates `env` object from schema keys (line 247-249)
- **Runtime access**: `processEnv` export casts `import.meta.env` to `ProcessEnv` type for typed access
- **Production safety**: Enforces rules like dev-only variables must not be set in production (allows staging with `VITE_STAGING=true`)

The build **fails immediately** if required variables are missing or validation fails.

**Environment file structure:**

- `.env.dev` - Development configuration (automatically loaded by `pnpm dev`)
- `.env.staging` - Staging configuration (must include `VITE_STAGING=true`)
- `.env.production` - Production configuration (must include `VITE_STAGING=false`)

**Build process:** The build scripts use `env-cmd` to load environment variables from the appropriate file before building. This approach is used because:

- Quasar has no built-in support for staging environments (only dev/production)
- `env-cmd` is consistent with Docker environments
- It ensures all variables (including `VITE_STAGING`) are available when `quasar.config.ts` evaluates

For details, see [services/agora/README.md](services/agora/README.md#environment-variables).

## Development Commands

### Running Services

```bash
# Frontend (Vue/Quasar)
make dev-app

# Landing page (SvelteKit)
make dev-landing

# Backend API (Fastify)
make dev-api

# Math updater worker (opinion-group analysis)
make dev-math-updater

# Import worker (conversation imports)
make dev-import-worker

# Scoring worker (Solidago MaxDiff rankings)
make dev-scoring-worker
```

### Development Logs

Root `make dev-*` targets are wrapped by `scripts/dev-log-runner.mjs`. Before asking the user for terminal output, inspect durable logs directly:

```bash
make logs
make logs-tail service=api
rg "error|failed|exception" .local/logs/latest/api.log
```

Log layout:

- `.local/logs/runs/<run-id>/<service>.log` contains the full captured stdout/stderr for that run.
- `.local/logs/latest/<service>.log` is the latest symlink for quick agent inspection.
- `.local/logs/latest/<service>.events.jsonl` contains semantic load-testing events from `AGORA_LOAD_EVENT` markers.
- `.local/logs/latest/<service>-browser.jsonl` contains frontend browser console/runtime/navigation events from `AGORA_BROWSER_EVENT` markers.
- `.local/logs/latest/<service>.summary.json` contains k6 summaries when a load test exports one.

Use direct `rg`/Read access for log investigation; there is intentionally no `make logs-grep` wrapper. The runner rotates logs at 25 MB per file, keeps 5 rotated files, removes old runs after 7 days, and caps `.local/logs/runs` at 750 MB by default. Environment overrides are `AGORA_LOG_DIR`, `AGORA_LOG_RUN_ID`, `AGORA_LOG_MAX_BYTES`, `AGORA_LOG_MAX_FILES`, `AGORA_LOG_RETENTION_DAYS`, and `AGORA_LOG_MAX_TOTAL_BYTES`.

`run_all_in_kitty_tabs.sh` exports one shared `AGORA_LOG_RUN_ID` before launching tabs, so backend, frontend, OpenAPI, sync, and Python worker logs from the same launch are grouped together. Raw targets such as `make dev-api-raw` and direct commands such as `pnpm dev` or `uv run ...` do not use durable capture unless explicitly run through the log runner.

### Code Generation & Syncing

```bash
# Generate frontend API client from OpenAPI spec
make generate

# Sync shared code to all services
make sync

# Watch and auto-sync shared code during development
make dev-sync

# Watch and auto-generate API client on OpenAPI changes
make dev-generate
```

### Testing & Linting

```bash
# Frontend (Vue/Quasar)
cd services/agora && pnpm lint:fix && pnpm test

# Landing page (SvelteKit)
cd services/app && pnpm lint:fix       # ESLint (strictTypeChecked) + Prettier, auto-fix
cd services/app && pnpm check          # Type checking
cd services/app && pnpm test:unit      # Vitest (logic tests)
cd services/app && pnpm test:e2e       # Playwright (E2E tests)

# Backend API
cd services/api && pnpm lint && pnpm test

# Math updater
cd services/math-updater && pnpm lint && pnpm test

# Scoring worker
cd services/scoring-worker && make test && make lint && make typecheck
```

When the user explicitly asks for `lint:fix`, run only that service's `lint:fix` command unless they also ask for `lint`, typechecking, tests, or broader verification.

### Git Commits

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) standard.

**Commit message format:**

```
<type>(<optional scope>): <description>

[optional body - be exhaustive here]

[optional footer(s)]
```

**Common types:**

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates, etc.

**Examples:**

```bash
# Simple commit
git commit -m "feat(api): add AI-powered translation for cluster labels"

# Commit with exhaustive body
git commit -m "fix(math-updater): prevent duplicate job processing via early queue locking

The math-updater was experiencing race conditions where multiple instances
would process the same conversation simultaneously. This was caused by jobs
being enqueued before the queue lock was established.

Changes:
- Move queue initialization before job scheduling
- Add singleton pattern with dynamic deduplication windows (2s-28s based on conversation size)
- Implement early lock acquisition in job handler
- Add comprehensive logging for queue state transitions

This ensures only one worker processes a conversation at a time, preventing
duplicate updates and database contention.

Deploy: math-updater"
```

**Guidelines:**

- Keep the subject line under 50 characters (hard limit: 72 characters)
  - Git and GitHub truncate titles longer than ~72 characters with "..."
  - Aim for 50 characters to ensure full visibility in all tools
  - If the title is too long, move specific details to the body
  - Good: `fix(frontend): prevent seed opinion page flash`
  - Bad: `fix(frontend): prevent flash of empty seed opinion page during conversation creation`
- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize the first letter after the colon
- No period at the end of the subject line
- Be exhaustive in the body: explain what changed, why it changed, and any important implementation details
- Use the body to provide context that reviewers and future maintainers will need
- Reference issue numbers, design decisions, or related PRs in the body or footer
- **ALWAYS include a deployment footer** listing which services need to be redeployed:
  - Format: `Deploy: <service1>, <service2>, ...`
  - Services: `app` (landing page), `agora` (main frontend), `api` (backend), `import-worker` (conversation imports), `math-updater` (opinion-group analysis), `scoring-worker` (Solidago rankings)
  - Example: `Deploy: agora, api` or `Deploy: none` (for docs-only changes)
- Do NOT mention AI assistants or tools in commit messages (e.g., "Claude", "AI-generated", "with assistance from")
  - This restriction applies ONLY to commit messages - code comments can mention tools/AI if helpful for context

**Before committing:**

1. **Review all staged changes** with `git status` and `git diff --staged`
2. **Verify nothing is staged by mistake** (secrets, debug code, unrelated changes, etc.)
3. **Check for poor quality comments**:
   - Remove redundant comments that state the obvious (e.g., `// Set variable to true` above `flag = true`)
   - Remove outdated or incorrect comments
   - Remove commented-out code unless there's a specific reason to keep it
   - Ensure remaining comments explain "why" not "what"
4. **If suspicious files are found**, report them to the user and abort the commit
5. **Wait for user confirmation** before proceeding with the commit

### Database Operations

```bash
cd services/api

# Generate migration from Drizzle schema changes
pnpm db:generate

# Run migrations (requires Docker + Flyway)
pnpm db:migrate

# Undo last migration
pnpm db:undo
```

### Migration Authoring Rules

- For schema changes, edit only `services/api/src/shared-backend/schema.ts` and use `pnpm db:*` commands to generate/apply migrations. Do not manually edit generated Drizzle SQL files or Flyway SQL files for normal schema changes.
- If a migration command is interactive or destructive, such as dropping/regenerating migrations, ask the user to run it or explicitly approve it first.
- Creating Flyway SQL by hand is allowed for data backfills only. Backfill means changing existing data, not changing schema structure.
- Hand-written Flyway SQL is also allowed for database features not representable in `schema.ts`, such as PostgreSQL functions/triggers/NOTIFY behavior.
- If generated SQL fails because of ordering or tool limitations, prefer adding or moving generated migration files before editing SQL contents. Edit generated SQL only when necessary to make the migration valid.

### Docker Images

```bash
# Build images for each service
cd services/agora && pnpm image:build
cd services/api && pnpm image:build
cd services/math-updater && pnpm image:build
```

## Architecture

### Service Communication

```
Frontend (Vue/Quasar) → OpenAPI Client → API (Fastify)
                                           ↓
                                    PostgreSQL (primary + read replica)
                                           ↑              ↑
API → Valkey import queue → Import-worker ─┘              │
API → Valkey analysis dirty set → Math-updater ───────────┤
API → Valkey scoring dirty set → Scoring-worker ──────────┘
```

### Services

- **app** (`services/app/`): SvelteKit landing page (Svelte 5, Bits UI, Tailwind CSS v4)
- **agora** (`services/agora/`): Vue 3 + Quasar main frontend with Pinia state management
- **api** (`services/api/`): Fastify backend with Drizzle ORM, handles auth/conversations/voting
- **import-worker** (`services/import-worker/`): Python worker for Polis URL and CSV conversation imports
- **math-updater** (`services/math-updater/`): Python worker for opinion-group analysis and AI label generation
- **scoring-worker** (`services/scoring-worker/`): Python worker running Solidago algorithm for MaxDiff community rankings via Valkey dirty set
- **shared**, **shared-app-api**, **shared-backend**: Shared TypeScript code synced via rsync and source schemas for generated Python artifacts

### Shared Code Strategy

Shared code is distributed via **rsync** (not npm linking) because Drizzle ORM requires direct file access:

- `services/shared/` → synced to TypeScript services and used for generated Python constants
- `services/shared-app-api/` → synced to frontend + API (UCAN, auth)
- `services/api/src/shared-backend/schema.ts` → source schema for API and generated Python SQLAlchemy models

Files generated from shared directories have warning comments at the top. Always edit source files in `services/shared*/src/`, never the synced copies.

### Database Layer

- **ORM**: Drizzle with TypeScript schema in `services/api/src/shared-backend/schema.ts`
- **Read replicas**: Automatic routing via `withReplicas()` - SELECTs use replica, writes use primary
- **Migrations**: Flyway-based versioned migrations in `services/api/database/flyway/`
- **Connection**: Supports both direct connection strings and AWS Secrets Manager

### OpenAPI-First API Development

1. Backend defines routes with Zod schemas + Swagger decorators
2. Fastify generates `services/api/openapi-zkorum.json`
3. OpenAPI generator creates TypeScript client in `services/agora/src/api/`
4. Frontend imports typed client functions

When adding API endpoints:

- Define Zod schema for request/response
- Add Swagger decorator to route
- Run `make generate` to update frontend client
- Never manually edit generated API client code

### REST API Design: POST-Only Pattern

This codebase uses a **POST-only API pattern** similar to JSON-RPC but with free-form endpoint naming. This is NOT a traditional RESTful API.

**Rules:**

1. **ALL endpoints use POST** - Never use GET, PUT, PATCH, or DELETE HTTP methods
2. **Request data goes in the body** - Never use URL parameters or query strings for data
3. **Soft-delete only** - All "delete" operations are soft-deletes (set `deletedAt` timestamp), never hard-deletes

**Why POST-only:**

- ✅ **Consistent authentication**: UCAN tokens work reliably in POST request bodies/headers
- ✅ **No URL length limits**: Complex queries with many parameters work without issues
- ✅ **Simpler caching control**: No accidental browser/CDN caching of sensitive data
- ✅ **Uniform request handling**: All requests follow the same pattern

**Exception:** Server-Sent Events (SSE) endpoints MUST use GET (protocol requirement). Example: `/api/v1/notification/stream`

**Example endpoint patterns:**

```typescript
// ✅ GOOD: POST with body parameters
server.route({
  method: "POST",
  url: `/api/${apiVersion}/conversation/export/status`,
  schema: {
    body: Dto.getConversationExportStatusRequest, // { exportSlugId: string }
    response: { 200: Dto.getConversationExportStatusResponse },
  },
  handler: async (request) => {
    const { exportSlugId } = request.body;
    // ...
  },
});

// ✅ GOOD: "Delete" operation uses POST + soft-delete
server.route({
  method: "POST",
  url: `/api/${apiVersion}/conversation/export/delete`,
  schema: {
    body: Dto.deleteConversationExportRequest, // { exportSlugId: string }
  },
  handler: async (request) => {
    // Sets deletedAt, does NOT remove from database
    await softDeleteExport({ exportSlugId: request.body.exportSlugId });
  },
});

// ❌ BAD: GET with URL parameters
server.route({
  method: "GET",
  url: `/api/${apiVersion}/conversation/export/status/:exportSlugId`,
  // ...
});

// ❌ BAD: DELETE method
server.route({
  method: "DELETE",
  url: `/api/${apiVersion}/conversation/export/:exportSlugId`,
  // ...
});
```

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

## Key Files

- `services/app/src/routes/`: SvelteKit pages and layouts (landing page)
- `services/app/src/lib/logic/`: Pure TypeScript functions with colocated tests
- `services/app/src/lib/components/`: Reusable Svelte components
- `services/app/vite.config.ts`: Vite plugins (Tailwind, SvelteKit)
- `services/app/svelte.config.js`: SvelteKit adapter configuration
- `services/api/src/index.ts`: Main backend entry point, route registration
- `services/api/src/shared-backend/schema.ts`: Database schema (all tables)
- `services/api/src/shared-backend/db.ts`: Database connection with read replica routing
- `services/agora/src/stores/`: Pinia state management
- `services/agora/src/utils/api/`: Frontend API wrapper layer
- `services/math-updater/src/index.ts`: Background job worker
- `Makefile`: Build orchestration and dev commands

## Code Quality Principles

### Explain Rule Exceptions

If you intentionally deviate from any guidance in this file, say so and explain why. Do not silently make exceptions to these rules.

### Browser Compatibility and Polyfills

Do not add hand-written compatibility polyfills or monkey-patch standard JavaScript or web-platform globals and prototypes to emulate missing APIs. First-party runtime APIs must either be natively supported by the frontend's declared modern browser contract or be supplied centrally through maintained compatibility tooling. Refactor the application code when an unsupported API is not worth carrying as part of that contract. A targeted workaround for a confirmed platform bug must be narrowly scoped and document why centralized compatibility tooling cannot address it.

Handle compatibility required by bundled third-party dependencies centrally through the frontend build configuration and maintained compatibility libraries, not through local shims. Syntax and module-format compatibility belong in the build pipeline. When changing the support floor or compatibility tooling, update the shared browser targets, JavaScript and CSS processing, production-build verification, and documented support matrix together.

Prefer idiomatic modern APIs when the centralized build already supplies their compatibility support. Do not replace APIs such as `Array.prototype.at()` with compatibility-only helpers when bundled third-party code already requires the same polyfill, because that adds application complexity without reducing the shipped payload. Inspect the generated bundle before refactoring modern syntax for compatibility or bundle-size reasons.

### Avoid Unsafe TypeScript Escape Hatches

Avoid `as` type assertions, `!` non-null assertions, `@ts-ignore`, `@ts-expect-error`, and `eslint-disable` / `eslint-ignore` directives. Write typesafe code instead.

- **Instead of `as`**: Narrow types with type guards, discriminated unions, or `satisfies`. If the type system can't prove it, restructure the code so it can.
- **Instead of `!`**: Use explicit null checks, optional chaining, or refactor to eliminate the nullable path.
- **Instead of `@ts-ignore` / `@ts-expect-error`**: Fix the underlying type error.
- **Instead of `eslint-disable`**: Fix the lint violation. If a rule is genuinely wrong for this codebase, disable it in the ESLint config, not inline.

**When escape hatches ARE acceptable** (rare):

- Working around a confirmed TypeScript compiler bug (with a comment linking to the issue)

**Untyped third-party libraries**: Use `zod.parse()` or `zod.safeParse()` to validate and parse untyped data into typed values (see "Parse, Don't Validate" below). Do not use `as` to cast untyped results.

### Favor Static Type Safety Over Defensive Programming

This codebase prioritizes **strong static type safety** using TypeScript to eliminate entire classes of bugs at compile time, rather than relying on runtime defensive checks.

Before throwing for an internal invariant, first try to redesign the type, schema, or API so the invalid state is unrepresentable. Runtime errors are still appropriate at external boundaries, impossible-to-type legacy integrations, and genuinely exceptional failures, but prefer type-safe input shapes, discriminated unions, branded/parsed values, and DB/API constraints over internal `throw` guards whenever feasible.

Push type-safety and invariants as low as practical. Prefer DB-level constraints for data invariants when they are expressible cleanly, then API/schema validation for cross-row or cross-table invariants that are awkward in SQL, then TypeScript types for in-process guarantees. Avoid relying on application-level runtime checks when the database can prevent invalid persisted state directly.

**Preferred approach:**

```typescript
// GOOD: Use type-safe data structures that make invalid states unrepresentable
const majorityOpinions: Array<{
  probability: SQL;
  type: SQL;
}> = [];

// Both fields are guaranteed to exist together
for (const opinion of majorityOpinions) {
  // TypeScript ensures probability and type are always in sync
  use(opinion.probability, opinion.type);
}
```

**Avoid:**

```typescript
// AVOID: Separate arrays that can get out of sync + runtime consistency check
const probabilities: SQL[] = [];
const types: SQL[] = [];

// Manual defensive check needed at runtime
if (probabilities.length !== types.length) {
  throw new Error("Arrays out of sync!");
}
```

**Guidelines:**

- **Design data structures** that enforce invariants at the type level
- **Use discriminated unions** instead of boolean flags + null checks
- **Leverage TypeScript's type system** (mapped types, conditional types, `as const`)
- **Prefer readonly/immutable types** where possible to prevent accidental mutations
- **Use Zod schemas** for runtime validation at system boundaries (API requests, external data)
- **Avoid runtime assertions** for invariants that can be enforced by types

**Examples in this codebase:**

- Math-updater uses type-safe `majorityOpinions` array instead of parallel arrays (see `services/math-updater/src/services/polisMathUpdater.ts:425`)
- Drizzle ORM schema provides compile-time guarantees for database operations
- Zod schemas validate external data at API boundaries while internal code uses strong types

**When defensive programming IS appropriate:**

- External system boundaries (user input, third-party APIs)
- Data from untyped sources (raw SQL, environment variables)
- Legacy code integration where types cannot be guaranteed

### Avoid Replica-Lag Read-After-Write Bugs

The API uses read replicas for ordinary reads, so code that writes data and then immediately reads it back through the normal `db` handle can observe stale state. Prefer designs that avoid the follow-up read entirely:

- Use `.returning()` from inserts/updates for IDs, timestamps, and updated fields
- Build downstream DTOs, queue payloads, notifications, and cache seeds from values already known in the request, transaction, or returned rows
- If a follow-up read is genuinely needed, perform it inside the same write transaction or otherwise ensure it uses a fresh writer-side view
- Do not add primary-read fallbacks as the first solution; use them only when the data cannot reasonably be carried forward or rebuilt from known values

Example: after creating a notification row, prefer broadcasting the SSE payload from the inserted row plus known conversation/opinion data rather than inserting and then rereading the notification through a replica-routed query.

### Prefer `async`/`await` Over `.then()` Chains

Always use `async`/`await` for asynchronous code. Do not use `.then()` or `.catch()` chains. This makes control flow easier to follow, error handling more consistent, and avoids nesting.

```typescript
// ✅ GOOD: async/await
async function loadData(): Promise<void> {
  const response = await fetchData();
  const parsed = processResponse(response);
  await saveResult(parsed);
}

// ❌ BAD: .then() chains
function loadData(): void {
  fetchData()
    .then((response) => processResponse(response))
    .then((parsed) => saveResult(parsed));
}
```

### Parse, Don't Validate

Follow the ["Parse, Don't Validate"](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/) principle: use parsing to transform untyped data into typed data, rather than validating and then casting.

**Preferred approach:**

```typescript
// ✅ GOOD: Parse with Zod, get typed result
const zodFilesSchema = z.record(z.string(), z.string());

function processImport(rawFiles: unknown): void {
  const files = zodFilesSchema.parse(rawFiles); // throws if invalid
  // `files` is now typed as Record<string, string>
  useFiles(files);
}
```

**Avoid:**

```typescript
// ❌ BAD: Validate then cast - loses type safety guarantee
function processImport(files: Partial<Record<string, string>>): void {
  if (!validateFiles(files)) {
    throw new Error("Invalid files");
  }
  // Cast is unsafe - validation logic could diverge from type
  useFiles(files as Record<string, string>);
}
```

**Key principle:** Parsing returns a new value with a more precise type. Validation returns a boolean and requires unsafe casting. Parsing makes invalid states unrepresentable in the type system.

### Use Parsed DTOs as Downstream Types

When an API endpoint has a shared Zod DTO schema with important type-level invariants, parse or safe-parse the request/response at the boundary and consider passing the parsed value downstream. This is especially important for `z.discriminatedUnion()` or other correlated/special shapes that can be weakened or flattened by OpenAPI-generated client types. Do not recreate a parallel TypeScript interface or duplicate those invariants in service/composable props.

Do not apply this mechanically to every DTO. For simple flat request/response shapes where generated OpenAPI types preserve the useful structure, normal explicit parameter objects are fine.

Be careful when changing DTO shapes used by the OpenAPI generator: generated API client types can be temporarily out of sync with the source Zod schemas until `make generate` has run, and some Zod semantics may not round-trip perfectly through OpenAPI. When editing these paths, check both the source DTO schema and generated client/shared copies before relying on either type.

**Preferred approach:**

```typescript
const request = Dto.createNewConversationRequest.parse({
  conversationTitle,
  conversationType: "ranking",
  rankingMode: "maxdiff",
  // ...other fields
});

await createNewPost({ db, request });
```

Then downstream code should accept the parsed DTO type:

```typescript
async function createNewPost({
  db,
  request,
}: {
  db: PostgresDatabase;
  request: CreateNewConversationRequest;
}) {
  if (request.conversationType === "ranking") {
    // TypeScript knows request.rankingMode exists here.
    useRankingMode(request.rankingMode);
  }
}
```

**Avoid:**

```typescript
interface CreateNewPostProps {
  conversationType: ConversationType;
  rankingMode?: RankingMode;
}

if (conversationType === "ranking" && rankingMode === undefined) {
  throw new Error("Missing ranking mode");
}
```

Use `z.discriminatedUnion()` in the DTO schema when fields are correlated, such as `conversationType: "ranking"` requiring `rankingMode`. This makes invalid combinations unrepresentable after parsing and lets TypeScript narrow correctly throughout downstream code.

### Functional Programming Style: Closure Pattern (Zustand-style)

**Preferred Pattern**: Closure-based state encapsulation with immutable API

When implementing stateful services (buffers, caches, managers), use the **Zustand-style closure pattern** instead of classes or mutable parameters:

```typescript
// ✅ GOOD: Closure pattern (Zustand-style)
export interface VoteBuffer {
  add: (vote: BufferedVote) => void;
  flush: () => Promise<void>;
  shutdown: () => Promise<void>;
}

export function createVoteBuffer(db: PostgresJsDatabase): VoteBuffer {
  // Encapsulated mutable state (private to closure)
  let pendingVotes = new Map<string, BufferedVote>();
  let isShuttingDown = false;

  const add = (vote: BufferedVote): void => {
    // Mutate internal state, never external parameters
    pendingVotes.set(getKey(vote), vote);
  };

  // Return immutable API
  return { add, flush, shutdown };
}
```

**Why this pattern:**

- ✅ **Encapsulation**: State is private, cannot be accessed from outside
- ✅ **Immutable API**: Exposed functions never mutate external parameters
- ✅ **No side effects**: Pure functional interface from caller's perspective
- ✅ **Simple**: No `this`, no `new`, no class boilerplate
- ✅ **Testable**: Easy to mock, no hidden dependencies

**Avoid these alternatives:**

```typescript
// ❌ BAD: Class with mutable state (verbose, `this` confusion)
export class VoteBuffer {
  private pendingVotes = new Map();

  public add(vote: BufferedVote): void {
    this.pendingVotes.set(getKey(vote), vote); // `this` required
  }
}

// ❌ BAD: Mutable parameter pattern (breaks referential transparency)
export function addVote(state: VoteBufferState, vote: BufferedVote): void {
  state.pendingVotes.set(getKey(vote), vote); // Mutates external parameter!
}
```

**When to use each pattern:**

- **Closure pattern** (Zustand-style): Stateful services with long lifecycle (buffers, caches, managers)
- **Pure functions**: Stateless utilities, transformations, calculations
- **Class**: Only when OOP is required for interface compatibility (e.g., extending framework classes)

### Function Parameters: Always Use Object Parameters

**Rule**: ALL functions with 2+ parameters MUST use object parameters (named parameters) instead of positional parameters.

**Why:**

- ✅ **Self-documenting**: Call site shows parameter names
- ✅ **Prevents errors**: Can't mix up parameter order
- ✅ **Easy to extend**: Add optional parameters without breaking calls
- ✅ **TypeScript autocomplete**: Better IDE support

**Pattern:**

```typescript
// ✅ GOOD: Object parameters (named parameters)
interface CreateVoteBufferParams {
  db: PostgresJsDatabase;
  redis?: Redis;
  flushIntervalMs?: number;
}

export function createVoteBuffer({
  db,
  redis = undefined,
  flushIntervalMs = 1000,
}: CreateVoteBufferParams): VoteBuffer {
  // ...
}

// Call site is clear
const buffer = createVoteBuffer({ db, redis, flushIntervalMs: 1000 });
```

```typescript
// ❌ BAD: Positional parameters (easy to mix up)
export function createVoteBuffer(
  db: PostgresJsDatabase,
  redis: Redis | undefined = undefined,
  flushIntervalMs = 1000
): VoteBuffer {
  // ...
}

// Call site unclear - what is 1000?
const buffer = createVoteBuffer(db, redis, 1000);
```

**Exception**: Single parameter functions can use direct parameter:

```typescript
// OK for single parameter
export function getUserById(userId: string): User {
  // ...
}
```

### Avoid `!important` in CSS/SCSS

Do not use `!important` in CSS or SCSS. It makes styles hard to override and debug. Instead, use more specific selectors or restructure the CSS to achieve the desired specificity.

### RTL (Right-to-Left) Language Support

The frontend supports RTL languages (Arabic, Persian, Hebrew). `postcss-rtlcss` automatically flips most directional CSS properties, but some things require manual attention.

**Rules for new code:**

- **Use CSS logical properties** instead of physical directional properties:
  - `padding-inline-start` / `padding-inline-end` instead of `padding-left` / `padding-right`
  - `margin-inline-start` / `margin-inline-end` instead of `margin-left` / `margin-right`
  - `inset-inline-start` / `inset-inline-end` instead of `left` / `right`
  - `text-align: start` / `text-align: end` instead of `text-align: left` / `text-align: right`
  - `border-inline-start` / `border-inline-end` instead of `border-left` / `border-right`
- **Use `flex-start` / `flex-end`** instead of `left` / `right` for `justify-content` (the latter are not valid flexbox values)
- **Never hardcode directional icons** (e.g., `mdi-chevron-right`). Use a computed property that checks `$q.lang.rtl` to flip the icon direction
- **Inline `:style` bindings** with `left`/`right` positioning must be made RTL-aware manually — `postcss-rtlcss` cannot process inline styles
- **Quasar's `$q.lang.rtl`** is the source of truth for RTL state in components. Quasar language packs are loaded in `src/boot/i18n.ts` to enable this

**What `postcss-rtlcss` handles automatically (no manual fix needed):**

- `text-align: left` → `text-align: right` under `[dir="rtl"]`
- `padding-left` / `margin-left` / `border-left` → flipped equivalents
- `left` / `right` in positioned elements (including `transform: translateX`)

**Test RTL** by switching display language to Persian/Arabic/Hebrew in Settings > Language.

### Props Drilling Over Inject/Provide (Vue)

In Vue components, prefer **explicit props drilling** over `inject`/`provide` for passing data through the component tree. All drilled props must be **required** (not optional) and **typesafe**.

**Why:**

- Explicit data flow is easier to trace and debug
- TypeScript catches missing props at compile time
- No hidden dependencies or magic string keys

**Rules:**

- Use required props with explicit types — never optional props for data that must exist
- Thread props through every intermediate component in the chain
- Convert nullable upstream data to a concrete type at the source (e.g., `organization?.name ?? ""`)

### Vue Props: Prefer Required Nullable Props

For Vue component props, prefer required `prop: T | undefined` over optional `prop?: T`. Optional props can hide typos because a mistyped binding may simply omit the intended prop. A required prop whose value may be `undefined` forces every caller to wire the prop by name while still representing absent data. Callers should pass `some-value-or-undefined` explicitly, not rely on omitted props, when absence is part of the component contract.

### Undefined Over Null in App Code

Prefer `undefined` for absent optional values in frontend and backend application code. In backend service/DAO mappers, normalize database `null` values with `toUnionUndefined()` when the internal or frontend-facing shape represents absence. DTOs sent to the frontend should use `undefined` or omit absent optional fields unless the DTO contract intentionally requires `null`. Use `null` where it is required by the database schema, external APIs, or existing DTO contracts, and convert explicitly at those boundaries.

### Logging Guidelines

Prefer `log.info()`, `log.warn()`, or `log.error()` for production-relevant events.

`log.debug()` is allowed in Python workers for dev-only or high-frequency diagnostics. Python workers default to `DEBUG` when `AGORA_DEV_MODE=true`, default to `INFO` otherwise, and support worker-specific `*_LOG_LEVEL` overrides.

API and frontend should get the same explicit log-level mechanism later. Until then, keep API/frontend logs production-oriented.

**Examples:**

```typescript
// GOOD
log.info(`[Math Updater] Processing conversation ${conversationSlugId}`);
log.warn(`[Scanner] Skipped conversation due to rate limiting`);
log.error(error, `[API] Failed to create opinion`);
```

## Important Patterns

### SpaLink for Internal Navigation

**Always use `SpaLink`** for internal navigation links in `services/agora`. Never use plain `<a>`, `<RouterLink>`, or `<button>` for navigation.

**Why `SpaLink` and not `<button>` or `<RouterLink>`:**

- Renders a real `<a href>` for accessibility, SEO, right-click "Open in new tab", and middle-click/Ctrl+click support
- Fixes a Vue 3.5 event delegation bug (`vuejs/core#11765`) that races with the browser's native `<a href>` link following, causing intermittent full page reloads. `SpaLink` + a global capture-phase interceptor (`boot/spaLinkInterceptor.ts`) eliminate the race.

**Two modes** (controlled by the `deferred` prop):

- **Default** (`deferred=false`): The interceptor handles `e.preventDefault()` + `router.push()`. Use for: feed cards, profile statements, notifications, banners — any link where the interceptor can handle navigation.
- **Deferred** (`deferred=true`): The interceptor only does `e.preventDefault()`. The component handles navigation itself. Use for: analysis/comment tabs that need custom history management (`canGoBackToComment`, `router.back()`) which would conflict with the interceptor's `router.push()`.

**Files:**

- `services/agora/src/components/ui-library/SpaLink.vue` — the component
- `services/agora/src/boot/spaLinkInterceptor.ts` — the global interceptor

**References:**

- Vue 3.5 event delegation: https://github.com/vuejs/core/pull/11765
- RouterLink reload bug: https://github.com/vuejs/router/issues/846

### Testing Frontend Components

The frontend has a dedicated component testing page at `/dev/component-testing` for manually testing UI components:

**Location**: `services/agora/src/pages/dev/component-testing.vue`

**How to add a test component**:

1. Create test component in `services/agora/src/pages/dev/test-components/YourComponentTest.vue`
2. Create translations file `YourComponentTest.i18n.ts` with test descriptions
3. Import and add to `component-testing.vue`

**Pattern**: Test components provide a button that triggers the component/dialog to open. The actual dialog is typically mounted globally (e.g., in `App.vue`), and the test just calls the store action to open it.

**Example**: See `PreferencesDialogTest.vue` or `EmbeddedBrowserWarningTest.vue`

### Adding a New API Endpoint

1. Define Zod schema in `services/api/src/` (or reuse from shared)
2. Add route with schema in `services/api/src/index.ts`
3. Implement handler calling service layer function
4. Run `make generate` to update frontend client
5. Use generated client in frontend: `const { fetchData } = useBackendXApi()`

### Adding a Database Table

1. Edit `services/api/src/shared-backend/schema.ts` to add table definition
2. Run `cd services/api && pnpm db:generate` to create migration
3. Review generated SQL in `services/api/drizzle/`
4. Run `pnpm db:migrate` to apply migration
5. Import new table in service code: `import { newTable } from '@/shared-backend/schema'`

### Working with Shared Code

1. Edit source files in `services/shared*/src/`
2. Run `make sync` (or `make dev-sync` for auto-watch)
3. Generated files include `/** WARNING: GENERATED FROM ... **/` comments
4. Never directly edit synced files - changes will be overwritten

### Scoring Worker Schema Codegen

The scoring worker's SQLAlchemy models (`services/scoring-worker/src/scoring_worker/generated_models.py`) are auto-generated from `services/api/src/shared-backend/schema.ts`. **Never hand-write table definitions in the Python code.**

To add a table to the scoring worker:

1. Add `/** @service scoring-worker */` JSDoc comment above the table definition in `schema.ts`
2. Run `make sync-python-artifacts` to regenerate `generated_models.py`
3. Import the model from `scoring_worker.generated_models`

### Running Tests for a Specific Module

```bash
# Frontend component tests
cd services/agora && pnpm test

# Backend service tests
cd services/api && pnpm test

# Math updater tests
cd services/math-updater && pnpm test
```

## Environment Configuration

Each service uses environment variables:

- `.env` - Local development defaults
- `.env.staging` - Staging environment
- `.env.production` - Production environment

Key variables:

- `CONNECTION_STRING` / `CONNECTION_STRING_READ` - Database connections
- `AWS_SECRET_ID_*` - AWS Secrets Manager credentials
- `*_VALKEY_URL` - Valkey connection for worker queues
- `MATH_UPDATER_MAX_COMPUTE_CONCURRENCY` - Concurrent analysis processing
- Translation API keys for AI label generation

## SvelteKit Frontend (`services/app`)

**See [`services/app/README.md`](services/app/README.md) for complete coding guidelines.**

### Tech Stack

- **Framework**: SvelteKit with Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`)
- **UI Library**: Bits UI (headless components) - **always use `$ui/` wrappers, never import directly**
- **Styling**: Tailwind CSS v4 (CSS-first, `@import "tailwindcss"`)
- **Testing**: Vitest + @testing-library/svelte for components, Playwright for E2E

### Key Rules

- **Path aliases**: `$ui`, `$components`, `$logic`, `$state` (configured in `svelte.config.js`)
- **No barrel files** (`index.ts` re-exports) - breaks tree-shaking
- **No cross-app imports** - only import from own app folder or `shared/`
- **Component Hierarchy**: Routes → Components → UI (keep routes simple)
- **SSR Safety**: Don't use module-level `$state()` for user data

### Icons

Icons use **Iconify via Tailwind CSS v4** (`@iconify/tailwind4` plugin). Never use inline SVGs for standard icons — use the `icon-[collection--name]` class pattern instead.

**Available collections**: `lucide` (UI icons), `simple-icons` (brand logos)

**Usage**: `<span class="icon-[lucide--menu] h-6 w-6"></span>`

**Applying the brand gradient to icons**: Use the `gradient-primary` Tailwind utility class alongside the icon class. The iconify plugin renders icons as CSS masks, so the gradient background shows through the icon shape:

```svelte
<span class="icon-[lucide--menu] h-6 w-6 gradient-primary"></span>
```

**Gradient utilities** (defined in `app.css`): `gradient-primary` (purple→blue with hover), `gradient-secondary` (light purple→blue), `gradient-chip` (nav chip style), `gradient-border` / `gradient-border-light`

**Icon wrapper components** are in `$ui/shared/icons/` for social/external link icons (e.g., `icon-link-github.svelte`).

### Development

```bash
make dev-landing                    # Start dev server
cd services/app && pnpm lint        # Lint
cd services/app && pnpm check       # Type check
cd services/app && pnpm test:unit   # Vitest
cd services/app && pnpm test:e2e    # Playwright
```

## Prerequisites

- Node.js 20+ (frontend uses 22/24)
- pnpm (all services)
- Python 3.13+ (Python workers)
- [uv](https://docs.astral.sh/uv/) (Python worker package manager)
- Docker (for Flyway migrations and production builds)
- Valkey or Redis-compatible server (workers)
- watchman (for file watching during development)
- rsync, make, jq, sed (build tools)
