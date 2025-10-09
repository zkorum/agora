# Shared (Universal)

Universal shared code for **ALL** Agora services (frontend + backend).

## Contents

This package contains code shared across:

- `services/agora` - Frontend app
- `services/api` - Main Fastify API
- `services/math-updater` - Polis math update worker
- `services/export-worker` - S3 export worker

## Usage

After modifying code in `services/shared/src/`, run:

```bash
make sync
```

This will copy the shared code to all services.

## What's Shared

- **Types**: Zod schemas, DTOs, Polis types
- **Utils**: Polis utilities, common utilities

## Other Shared Packages

- `services/shared-app-api`: Shared between frontend + API only (UCAN, DID, etc.)
- `services/shared-backend`: Shared between backend services only (DB schema, Polis logic, etc.)
