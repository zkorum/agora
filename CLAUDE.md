# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## External Repository References

When the user mentions needing to understand an external library or repository, **first check if it's cloned locally** in the `external/` directory at the repository root before fetching from GitHub or using web search.

**Important**: The repository root is where CLAUDE.md is located. Claude's working directory may be a subdirectory (e.g., `services/agora/`), so use paths relative to the repository root or use `../../external/` to navigate up from subdirectories.

**Pattern**: External repos are sometimes cloned into `external/` at repository root for analysis. This directory is gitignored.

**Workflow**:
1. First, check if a directory with the repository name exists in `external/` at repository root (e.g., `../../external/vite-plugin-validate-env/` from `services/agora/`)
2. If found, read the relevant files directly from the local clone
3. If not found, fall back to WebSearch or WebFetch from GitHub

**Example**: If analyzing how `vite-plugin-validate-env` works from within `services/agora/`, check `../../external/vite-plugin-validate-env/` first.

## Documentation Convention

When creating investigation documents, technical analysis files, reference documentation, or any temporary files, use the `CLAUDE_` prefix for all filenames (e.g., `CLAUDE_TIMEOUT_CONFIGURATION.md`, `CLAUDE_DATABASE_OPTIMIZATION.md`).

**When in doubt, use the `CLAUDE_` prefix.**

Exception: Only omit the `CLAUDE_` prefix when the user explicitly requests a specific filename or when creating files that should be integrated into the main documentation (e.g., user-requested README updates, official project documentation).

## Project Overview

Agora Citizen Network is a privacy-preserving social platform using zero-knowledge proofs and bridging-based ranking algorithms. The monorepo contains a Vue.js/Quasar frontend, Fastify backend, background worker, and Python clustering service.

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
- `.env.dev` - Development configuration (automatically loaded by `yarn dev`)
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

# Backend API (Fastify)
make dev-api

# Math updater worker (background jobs)
make dev-math-updater

# Python bridge (clustering service)
make dev-polis
```

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
# Frontend
cd services/agora && yarn lint && yarn test

# Backend API
cd services/api && pnpm lint && pnpm test

# Math updater
cd services/math-updater && pnpm lint && pnpm test
```

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
- Add singleton pattern with 60s deduplication window
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
  - Services: `agora` (frontend), `api` (backend), `math-updater` (worker), `python-bridge` (clustering)
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

### Docker Images

```bash
# Build images for each service
cd services/agora && yarn image:build
cd services/api && pnpm image:build
cd services/math-updater && pnpm image:build
```

## Architecture

### Service Communication

```
Frontend (Vue/Quasar) → OpenAPI Client → API (Fastify)
                                           ↓
                                    PostgreSQL (primary + read replica)
                                           ↑
Math-updater (pg-boss jobs) ←──────────────┘
       ↓
Python-bridge (Flask/reddwarf clustering)
```

### Services

- **agora** (`services/agora/`): Vue 3 + Quasar frontend with Pinia state management
- **api** (`services/api/`): Fastify backend with Drizzle ORM, handles auth/conversations/voting
- **math-updater** (`services/math-updater/`): Background worker using pg-boss for clustering updates and AI label generation
- **python-bridge** (`services/python-bridge/`): Flask service wrapping reddwarf clustering algorithms
- **shared**, **shared-app-api**, **shared-backend**: Shared TypeScript code synced via rsync

### Shared Code Strategy

Shared code is distributed via **rsync** (not npm linking) because Drizzle ORM requires direct file access:

- `services/shared/` → synced to all services (types, utilities)
- `services/shared-app-api/` → synced to frontend + API (UCAN, auth)
- `services/shared-backend/` → synced to API + math-updater (database schema, translations)

Files generated from shared directories have warning comments at the top. Always edit source files in `services/shared*/src/`, never the synced copies.

### Database Layer

- **ORM**: Drizzle with TypeScript schema in `services/shared-backend/src/schema.ts`
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

### Background Jobs (pg-boss)

Math-updater uses PostgreSQL-based job queue:

- **Job types**: `scan-conversations`, `update-conversation-math`
- **Singleton pattern**: Jobs deduplicated with `singletonSeconds`
- **Known issue**: Early queue locking prevents duplicate job bug (see `services/math-updater/src/index.ts`)

### Authentication

- **UCAN (User Controlled Authorization Network)**: Capability-based auth with signed requests
- **Rarimo integration**: Zero-knowledge proof for anonymous human verification
- **Phone OTP**: Twilio-based phone verification fallback

Authorization headers built via `buildAuthorizationHeader(encodedUcan)` in frontend API wrappers.

## Key Files

- `services/api/src/index.ts`: Main backend entry point, route registration
- `services/shared-backend/src/schema.ts`: Database schema (all tables)
- `services/shared-backend/src/db.ts`: Database connection with read replica routing
- `services/agora/src/stores/`: Pinia state management
- `services/agora/src/utils/api/`: Frontend API wrapper layer
- `services/math-updater/src/index.ts`: Background job worker
- `Makefile`: Build orchestration and dev commands

## Code Quality Principles

### Favor Static Type Safety Over Defensive Programming

This codebase prioritizes **strong static type safety** using TypeScript to eliminate entire classes of bugs at compile time, rather than relying on runtime defensive checks.

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
    flushIntervalMs = 1000,
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

### Logging Guidelines

**Important:** Do NOT use `log.debug()` in this codebase. Always use `log.info()`, `log.warn()`, or `log.error()` instead.

**Rationale:**
- Debug logs are rarely checked in production and add noise
- Info-level logs are always visible and provide better traceability
- Simpler to grep/filter logs when there are fewer log levels in use

**Examples:**
```typescript
// GOOD
log.info(`[Math Updater] Processing conversation ${conversationSlugId}`);
log.warn(`[Scanner] Skipped conversation due to rate limiting`);
log.error(error, `[API] Failed to create opinion`);

// BAD - Never use log.debug
log.debug(`Processing started`); // ❌ Don't use this
```

## Important Patterns

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

1. Edit `services/shared-backend/src/schema.ts` to add table definition
2. Run `cd services/shared-backend && pnpm run sync` to distribute changes
3. Run `cd services/api && pnpm db:generate` to create migration
4. Review generated SQL in `services/api/drizzle/`
5. Run `pnpm db:migrate` to apply migration
6. Import new table in service code: `import { newTable } from '@/shared-backend/schema'`

### Working with Shared Code

1. Edit source files in `services/shared*/src/`
2. Run `make sync` (or `make dev-sync` for auto-watch)
3. Generated files include `/** WARNING: GENERATED FROM ... **/` comments
4. Never directly edit synced files - changes will be overwritten

### Running Tests for a Specific Module

```bash
# Frontend component tests
cd services/agora && yarn test

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
- `POLIS_BASE_URL` - Python-bridge service URL
- `MATH_UPDATER_BATCH_SIZE` - Concurrent conversation processing
- Translation API keys for AI label generation

## Prerequisites

- Node.js 20+ (frontend uses 22/24)
- pnpm (backend services)
- yarn (frontend)
- Python 3.11+ (python-bridge)
- Docker (for Flyway migrations and production builds)
- watchman (for file watching during development)
- rsync, make, jq, sed (build tools)
