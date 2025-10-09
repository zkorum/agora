# Shared Backend

Shared code for backend services (API, workers).

## Contents

This package contains code shared between:

- `services/api` - Main Fastify API
- `services/math-updater` - Polis math update worker
- `services/export-worker` - S3 export worker

## Usage

After modifying code in `services/shared-backend/src/`, run:

```bash
make sync-backend
```

This will copy the shared code to all backend services.

## What's Shared

- Database schema (`schema.ts`)
- Database connection utilities
- Common types and utilities
- Logging configuration
