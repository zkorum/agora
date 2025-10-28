# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agora Citizen Network is a privacy-preserving social platform using zero-knowledge proofs and bridging-based ranking algorithms. The monorepo contains a Vue.js/Quasar frontend, Fastify backend, background worker, and Python clustering service.

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
duplicate updates and database contention."
```

**Guidelines:**
- Keep the subject line concise (50-72 characters)
- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize the first letter after the colon
- No period at the end of the subject line
- **Be exhaustive in the body**: explain what changed, why it changed, and any important implementation details
- Use the body to provide context that reviewers and future maintainers will need
- Reference issue numbers, design decisions, or related PRs in the body or footer
- **Do NOT mention AI assistants or tools** (e.g., "Claude", "AI-generated") in commit messages

**Before committing:**
1. **Review all staged changes** with `git status` and `git diff --staged`
2. **Verify nothing is staged by mistake** (secrets, debug code, unrelated changes, etc.)
3. **If suspicious files are found**, report them to the user and abort the commit
4. **Wait for user confirmation** before proceeding with the commit

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
