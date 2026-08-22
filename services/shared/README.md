# Shared (Universal)

Universal shared TypeScript code for Agora frontend and TypeScript backend services.

## Contents

This package contains code shared across:

- `services/agora` - Frontend app
- `services/api` - Main Fastify API
- `services/conversation-email-update-worker` - Conversation Email Updates worker
- `services/load-testing` - Load-testing client

Python services consume generated artifacts derived from shared TypeScript sources instead of synced TypeScript files.

## Usage

After modifying code in `services/shared/src/`, run:

```bash
make sync
```

This will copy the shared code to TypeScript services. If shared constants or schemas are used by Python workers, also run `make sync-python-artifacts` from the repository root.

## What's Shared

- **Types**: Zod schemas, DTOs, conversation-analysis types
- **Utils**: conversation utilities, common utilities

## Other Shared Packages

- `services/shared-app-api`: Shared between frontend + API only (UCAN, DID, etc.)
- `services/shared-backend`: Canonical backend utilities and schema synced to API and explicit TypeScript workers and used to generate Python worker artifacts
- `services/shared-analysis-worker`: Shared Python package used by analysis and description workers; receives generated artifacts from `services/shared` and API schema sources
