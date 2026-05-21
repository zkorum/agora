# Shared Backend

Shared TypeScript backend code and source schema for generated Python worker artifacts.

## Contents

This package contains TypeScript code synced directly to:

- `services/api` - Main Fastify API

It is also the source for generated SQLAlchemy models used by Python workers:

- `services/import-worker`
- `services/math-updater`
- `services/scoring-worker`

## Usage

After modifying code in `services/shared-backend/src/`, run:

```bash
make sync-ts-backend
```

This copies the shared TypeScript code to TypeScript backend services. To regenerate Python worker artifacts after schema or shared type changes, run:

```bash
make sync-python-artifacts
```

## What's Shared

- Database schema (`schema.ts`)
- Database connection utilities
- Common types and utilities
- Logging configuration
