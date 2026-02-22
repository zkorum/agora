# Services Directory

This directory contains all Agora services and shared code packages.

## Services

- **agora/** - Frontend Vue.js application
- **api/** - Main Fastify backend API
- **math-updater/** - Background worker for Polis math calculations
- **export-worker/** - Background worker for S3 data exports *(planned)*
- **python-bridge/** - Python service for Polis math
- **llm/** - LLM service for AI-generated summaries
- **nlp/** - NLP utilities
- **images/** - Image processing service

## Shared Code Packages

### services/shared (Universal)
Shared across **ALL** services (frontend + backend)

**Contents:** Common types, Zod schemas, DTOs, utilities

**Syncs to:** agora, api, math-updater, export-worker

**Usage:** `make sync` or `make dev-sync`

### services/shared-app-api
Shared between **frontend and API** only

**Contents:** UCAN, DID, client-side crypto, app-specific utilities

**Syncs to:** agora, api

**Usage:** `make sync-app-api` or `make dev-sync-app-api`

### services/shared-backend
Shared between **backend services** only

**Contents:** Database schema, Polis service logic, DB utilities, server-side config

**Syncs to:** api, math-updater, export-worker

**Usage:** `make sync-backend` or `make dev-sync-backend`

## Development Workflow

### When to Sync

1. **After modifying `services/shared/src/`:** Run `make sync`
2. **After modifying `services/shared-app-api/src/`:** Run `make sync-app-api`
3. **After modifying `services/shared-backend/src/`:** Run `make sync-backend`

### Watch Mode

For automatic syncing during development:
- `make dev-sync` - Watch universal shared
- `make dev-sync-app-api` - Watch app-api shared
- `make dev-sync-backend` - Watch backend shared

### Important Notes

- **Never modify synced files directly!** Always edit source files in `shared*/src/`
- Synced files contain warning comments at the top
- Synced files are in `.gitignore` for each service

## Architecture Diagram

```
services/shared (Universal Types)
    ├──> services/agora/src/shared/
    ├──> services/api/src/shared/
    ├──> services/math-updater/src/shared/
    └──> services/export-worker/src/shared/

services/shared-app-api (Frontend + API)
    ├──> services/agora/src/shared-app-api/
    └──> services/api/src/shared-app-api/

services/shared-backend (Backend Services)
    ├──> services/api/src/shared-backend/
    ├──> services/math-updater/src/shared-backend/
    └──> services/export-worker/src/shared-backend/
```
