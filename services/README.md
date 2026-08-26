# Services Directory

This directory contains all Agora services and shared code packages.

## Services

- **agora/** - Frontend Vue.js application
- **app/** - Public SvelteKit landing page
- **api/** - Main Fastify backend API
- **conversation-email-update-worker/** - TypeScript worker for Conversation Email Updates delivery and SES events
- **import-worker/** - Python worker for conversation imports
- **math-updater/** - Python worker for opinion-group analysis
- **ai-description-retry-worker/** - Python worker for AI label/summary retry and backlog work
- **description-translation-retry-worker/** - Python worker for label/summary translation retry and backlog work
- **content-translation-worker/** - Python worker for dynamic user-content translation work
- **shared-analysis-worker/** - Shared Python package for analysis and description worker code and generated artifacts
- **scoring-worker/** - Python worker for MaxDiff rankings
- **x-analyzer/** - X/Twitter reply and quote-tweet analyzer
- **llm/** - LLM service for AI-generated summaries
- **load-testing/** - k6 load-testing scenarios and monitoring support

## Shared Code Packages

### services/shared (Universal)
Shared across TypeScript services and used as a source for generated Python artifacts.

**Contents:** Common types, Zod schemas, DTOs, constants, utilities

**Syncs to:** agora, api, conversation-email-update-worker, load-testing. Selected constants and schemas are also converted into Python generated files by `make sync-python-artifacts`.

**Usage:** `make sync` or `make dev-sync`

### services/shared-app-api
Shared between **frontend and API** only

**Contents:** UCAN, DID, client-side crypto, app-specific utilities

**Syncs to:** agora, api

**Usage:** `make sync-app-api` or `make dev-sync-app-api`

### services/shared-backend
Canonical TypeScript backend source and database schema.

**Contents:** Drizzle schema, database/config/logging utilities, backend queue helpers, and SNS ingress parsing

**Syncs to:** the complete tree is copied to API; a dependency-filtered subset including the complete schema is copied to conversation-email-update-worker. Python models are generated directly from the canonical schema.

**Usage:** `make sync-ts-backend` or `make dev-sync-ts-backend`

### services/shared-analysis-worker
Shared Python package consumed by analysis and description Python workers.

**Contents:** Generated SQLAlchemy models for analysis workers, generated shared constants/types, Valkey queue helpers, retry-state helpers, AI provider helpers, and red-dwarf analysis glue

**Used by:** math-updater, ai-description-retry-worker, description-translation-retry-worker

**Usage:** edit source Python code directly in `services/shared-analysis-worker/src/`; regenerate `generated_*.py` with `make sync-python-artifacts` after relevant `services/shared` or canonical shared-backend schema/type changes

## Development Workflow

### When to Sync

1. **After modifying `services/shared/src/`:** Run `make sync`
2. **After modifying `services/shared-app-api/src/`:** Run `make sync-app-api`
3. **After modifying `services/shared-backend/src/`:** Run `make sync-ts-backend`
4. **After modifying `services/shared-backend/src/schema.ts`:** Run `make sync-python-artifacts` if Python generated models are affected
5. **After modifying shared-analysis-worker Python logic:** Edit `services/shared-analysis-worker/src/` directly, then run the affected worker checks

### Watch Mode

For automatic syncing during development:
- `make dev-sync` - Watch universal shared
- `make dev-sync-app-api` - Watch app-api shared
- `make dev-sync-ts-backend` - Watch canonical backend shared source

### Important Notes

- **Never modify synced files directly!** Always edit source files in `shared*/src/`
- Synced files contain warning comments at the top
- Treat synced consumer files as generated even when they are committed for builds or review

## Architecture Diagram

```
services/shared (Universal Types)
    ├──> services/agora/src/shared/
    ├──> services/api/src/shared/
    ├──> services/conversation-email-update-worker/src/shared/
    └──> services/load-testing/src/shared/

services/shared-app-api (Frontend + API)
    ├──> services/agora/src/shared-app-api/
    └──> services/api/src/shared-app-api/

services/shared-backend/src/
    ├──> services/api/src/shared-backend/
    ├──> services/conversation-email-update-worker/src/shared-backend/
    └──> Python model generation from services/shared-backend/src/schema.ts

services/shared-backend/src/schema.ts + services/shared generated artifacts
    ├──> services/import-worker/src/import_worker/generated_*.py
    ├──> services/content-translation-worker/src/content_translation_worker/generated_*.py
    ├──> services/shared-analysis-worker/src/agora_analysis_worker_shared/generated_*.py
    └──> services/scoring-worker/src/scoring_worker/generated_models.py

services/shared-analysis-worker (analysis Python worker library)
    ├──> services/math-updater
    ├──> services/ai-description-retry-worker
    └──> services/description-translation-retry-worker
```
