# Shared (Universal)

Universal shared TypeScript code for Agora frontend and TypeScript backend services.

## Contents

This package contains code shared across:

- `services/agora` - Frontend app
- `services/api` - Main Fastify API
- `services/load-testing` - Load-testing client

Python services consume generated artifacts derived from shared TypeScript sources instead of synced TypeScript files.

## Usage

After modifying code in `services/shared/src/`, run:

```bash
make sync
```

This will copy the shared code to TypeScript services.

## What's Shared

- **Types**: Zod schemas, DTOs, Polis types
- **Utils**: Polis utilities, common utilities

## Other Shared Packages

- `services/shared-app-api`: Shared between frontend + API only (UCAN, DID, etc.)
- `services/shared-backend`: Shared directly with TypeScript backend services and used to generate Python worker artifacts
