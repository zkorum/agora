# Services Directory

This directory contains all Agora services and shared code packages.

## Services

- **agora/** - Frontend Vue.js application
- **api/** - Main Fastify backend API
- **import-worker/** - Python worker for conversation imports
- **math-updater/** - Python worker for opinion-group analysis
- **ai-description-retry-worker/** - Python worker for AI label/summary retry and backlog work
- **description-translation-retry-worker/** - Python worker for label/summary translation retry and backlog work
- **analysis-worker-shared/** - Shared Python package for analysis and description worker code and generated artifacts
- **scoring-worker/** - Python worker for MaxDiff rankings
- **llm/** - LLM service for AI-generated summaries
- **images/** - Image processing service

## Shared Code Packages

### services/shared (Universal)
Shared across TypeScript services and used as a source for generated Python artifacts.

**Contents:** Common types, Zod schemas, DTOs, constants, utilities

**Syncs to:** agora, api, load-testing. Selected constants and schemas are also converted into Python generated files by `make sync-python-artifacts`.

**Usage:** `make sync` or `make dev-sync`

### services/shared-app-api
Shared between **frontend and API** only

**Contents:** UCAN, DID, client-side crypto, app-specific utilities

**Syncs to:** agora, api

**Usage:** `make sync-app-api` or `make dev-sync-app-api`

### services/shared-backend
Shared directly between TypeScript backend services. Python workers consume generated artifacts instead of synced TypeScript source.

**Contents:** Database schema, DB utilities, server-side config

**Syncs to:** api

**Usage:** `make sync-ts-backend` or `make dev-sync-ts-backend`

### services/analysis-worker-shared
Shared Python package consumed by analysis and description Python workers.

**Contents:** Generated SQLAlchemy models for analysis workers, generated shared constants/types, Valkey queue helpers, retry-state helpers, AI provider helpers, and red-dwarf analysis glue

**Used by:** math-updater, ai-description-retry-worker, description-translation-retry-worker

**Usage:** edit source Python code directly in `services/analysis-worker-shared/src/`; regenerate `generated_*.py` with `make sync-python-artifacts` after relevant `services/shared` or `services/shared-backend` changes

## Development Workflow

### When to Sync

1. **After modifying `services/shared/src/`:** Run `make sync`
2. **After modifying `services/shared-app-api/src/`:** Run `make sync-app-api`
3. **After modifying `services/shared-backend/src/`:** Run `make sync-ts-backend` and `make sync-python-artifacts` if Python generated models are affected
4. **After modifying analysis-worker-shared Python logic:** Edit `services/analysis-worker-shared/src/` directly, then run the affected worker checks

### Watch Mode

For automatic syncing during development:
- `make dev-sync` - Watch universal shared
- `make dev-sync-app-api` - Watch app-api shared
- `make dev-sync-ts-backend` - Watch TypeScript backend shared

### Important Notes

- **Never modify synced files directly!** Always edit source files in `shared*/src/`
- Synced files contain warning comments at the top
- Synced files are in `.gitignore` for each service

## Architecture Diagram

```
services/shared (Universal Types)
    ├──> services/agora/src/shared/
    ├──> services/api/src/shared/
    └──> services/load-testing/src/shared/

services/shared-app-api (Frontend + API)
    ├──> services/agora/src/shared-app-api/
    └──> services/api/src/shared-app-api/

services/shared-backend (Backend Services)
    └──> services/api/src/shared-backend/

services/shared-backend + services/shared generated artifacts
    ├──> services/import-worker/src/import_worker/generated_*.py
    ├──> services/analysis-worker-shared/src/agora_analysis_worker_shared/generated_*.py
    └──> services/scoring-worker/src/scoring_worker/generated_models.py

services/analysis-worker-shared (analysis Python worker library)
    ├──> services/math-updater
    ├──> services/ai-description-retry-worker
    └──> services/description-translation-retry-worker
```
