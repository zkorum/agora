# Services Directory

This directory contains all Agora services and shared code packages.

## Services

- **agora/** - Frontend Vue.js application
- **api/** - Main Fastify backend API
- **import-worker/** - Python worker for conversation imports
- **math-updater/** - Python worker for opinion-group analysis
- **scoring-worker/** - Python worker for MaxDiff rankings
- **llm/** - LLM service for AI-generated summaries
- **images/** - Image processing service

## Shared Code Packages

### services/shared (Universal)
Shared across TypeScript services.

**Contents:** Common types, Zod schemas, DTOs, utilities

**Syncs to:** agora, api, load-testing

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

## Development Workflow

### When to Sync

1. **After modifying `services/shared/src/`:** Run `make sync`
2. **After modifying `services/shared-app-api/src/`:** Run `make sync-app-api`
3. **After modifying `services/shared-backend/src/`:** Run `make sync-ts-backend` and `make sync-python-artifacts` if Python generated models or constants are affected

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
    ├──> services/python-worker-shared/src/agora_worker_shared/generated_*.py
    └──> services/scoring-worker/src/scoring_worker/generated_models.py
```
