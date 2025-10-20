# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agora Citizen Network is a social platform designed to strengthen democratic discourse using bridging-based ranking algorithms and zero-knowledge proof (ZKP) cryptography. The platform uses Polis clustering mathematics to highlight content appreciated across political viewpoints while preserving diversity of opinions.

This is a TypeScript/JavaScript monorepo containing a Vue.js frontend (Quasar), Fastify backend API, PostgreSQL database, background worker services, and Python bridge for data science operations.

## Repository Structure

### Core Services

- **services/agora**: Quasar (Vue.js) frontend application
- **services/api**: Fastify backend API with PostgreSQL database
- **services/math-updater**: Background worker that periodically updates Polis clustering mathematics and generates AI-powered cluster insights
- **services/python-bridge**: Flask application bridging Node.js backend to Python data science libraries (reddwarf for clustering)

### Shared Code Libraries

The monorepo uses a unique **rsync-based code sharing approach** rather than npm packages:

- **services/shared**: Universal code shared across ALL services (frontend + backend)
- **services/shared-app-api**: Code shared between frontend (agora) and API only (UCAN, DID logic)
- **services/shared-backend**: Backend-specific code shared between API and worker services (database schema via Drizzle ORM, Polis logic)

After modifying shared code, you MUST run the appropriate sync command:
```bash
make sync           # Sync services/shared to all services
make sync-app-api   # Sync services/shared-app-api
make sync-backend   # Sync services/shared-backend
```

For auto-syncing during development:
```bash
make dev-sync        # Watch and auto-sync services/shared
make dev-sync-app-api
make dev-sync-backend
```

## Development Commands

### Running Services

```bash
# Frontend (Quasar dev server)
make dev-app
# Or: cd services/agora && yarn dev

# Backend API (Fastify with hot reload)
make dev-api
# Or: cd services/api && pnpm start:dev

# Python Bridge (Flask)
make dev-polis
# Or: cd services/python-bridge && source .venv/bin/activate && flask --app main run

# Math Updater Worker
make dev-math-updater
# Or: cd services/math-updater && pnpm start:dev
```

### OpenAPI Code Generation

The backend generates `openapi-zkorum.json`, which is used to generate the frontend API client:

```bash
make generate                 # Generate frontend client from OpenAPI spec
make dev-generate            # Watch and auto-generate on OpenAPI changes
```

### Testing

```bash
# API tests (uses Vitest)
cd services/api && pnpm test

# Frontend (no tests currently configured)
cd services/agora && yarn test
```

### Linting and Formatting

```bash
# API
cd services/api
pnpm lint
pnpm format:write    # Format files
pnpm format:check    # Check formatting

# Frontend
cd services/agora
yarn lint
yarn format:write
yarn format:check
```

## Database Management

The API uses **Drizzle ORM** for schema definition and **Flyway** for migrations.

### Database Schema

The database schema is defined in `services/shared-backend/src/schema.ts` and shared across backend services via rsync.

### Running Migrations

1. Start PostgreSQL:
```bash
cd services/api
docker compose up -d
```

2. Access pgAdmin at `http://localhost:5050` (credentials in `docker-compose.yml`)

3. Generate migration from Drizzle schema:
```bash
cd services/api
pnpm run db:generate
```
**Important**: This command uses a custom script to rename migration files to Flyway's naming convention.

4. Review generated `.sql` files in `services/api/database/flyway/` before migrating

5. Run migration:
```bash
pnpm run db:migrate
```

### Other Database Commands

```bash
cd services/api
pnpm run db:drop      # Drop migration
pnpm run db:undo      # Undo last migration
pnpm run db:clean     # Clean database
```

### Configuration

Create `.env` and `database/flyway/flyway.conf` files based on:
- `services/api/env.example`
- `services/api/database/flyway/flyway.conf.example`

Ensure `CONNECTION_STRING` in `.env` matches `flyway.password` in `flyway.conf` and Docker Compose settings.

## Architecture Notes

### Authentication & Authorization

- Uses **UCAN (User Controlled Authorization Networks)** for authorization tokens
- Each HTTP request validates UCAN tokens with capability checks
- Device-based authentication with session management
- Phone-based OTP authentication (Twilio) with optional ZK-passport verification (Rarimo)
- DIDs (Decentralized Identifiers) identify devices

### Polis Integration

The platform integrates Polis clustering algorithms:

1. **Vote/Opinion Data Collection**: Users vote on opinions (agree/disagree/pass)
2. **Math Computation**: `python-bridge` service runs clustering algorithms via reddwarf
3. **Math Updates**: `math-updater` worker periodically:
   - Scans conversations needing updates
   - Calls Python bridge to compute Polis mathematics
   - Stores results in `polis_content`, `polis_cluster`, `polis_cluster_user`, `polis_cluster_opinion` tables
   - Optionally generates AI labels/summaries for clusters using AWS Bedrock LLMs
4. **Presentation**: API serves computed clusters, priorities, consensus levels to frontend

### Key Database Tables

- `user`: User accounts with username and stats
- `conversation`: Main conversation posts with Polis content references
- `opinion`: User opinions on conversations with Polis-computed statistics
- `vote`: User votes on opinions (agree/disagree/pass)
- `polis_content`: Snapshots of Polis math results for a conversation at a point in time
- `polis_cluster`: Cluster metadata (labels, summaries, user counts)
- `polis_cluster_user`: User-to-cluster assignments
- `polis_cluster_opinion`: Representative opinions for each cluster
- `notification`: User notifications (opinion votes, new opinions)

### Frontend-Backend Type Sharing

1. Backend generates OpenAPI spec from Zod schemas
2. Frontend client is auto-generated from OpenAPI using `openapi-generator-cli`
3. Shared types live in `services/shared-app-api` (synced via rsync)

### Background Workers

- **math-updater**: Self-scheduling job queue (pg-boss) that scans for conversations needing math updates every 2 seconds
- Job concurrency and batch size are configurable to protect database

## Python Bridge Setup

The Python bridge requires Python 3.11+:

```bash
cd services/python-bridge

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install .

# If dependencies change in pyproject.toml:
pip install --force-reinstall --no-cache-dir .

# Run the service
flask --app main run
```

## Frontend Setup

The frontend requires Node.js (v20+, v22, or v24) and Yarn:

```bash
cd services/agora

# Install dependencies
yarn

# Prepare for IDE work (generate types, etc.)
yarn prepare

# Create .env from example
cp env.example .env

# Configure VITE_DEV_AUTHORIZED_PHONES in .env for local login

# Start dev server
yarn dev
```

### Frontend Build

```bash
# Standard build
yarn build

# Environment-specific builds
yarn build:staging
yarn build:production

# Capacitor builds (mobile)
yarn build:ios
yarn build:android
```

## Important Development Practices

### Shared Code Workflow

1. Modify code in `services/shared*` directories
2. Run appropriate `make sync*` command to copy changes to consuming services
3. For development, run `make dev-sync*` in separate terminal for auto-syncing

### Database Schema Changes

1. Modify `services/shared-backend/src/schema.ts`
2. Run `make sync-backend` to sync to API and workers
3. Generate migration: `cd services/api && pnpm run db:generate`
4. Review generated SQL files
5. Apply migration: `pnpm run db:migrate`

### Adding API Endpoints

1. Define request/response schemas using Zod in `services/api/src/shared/types/dto.ts`
2. Add endpoint handler in `services/api/src/index.ts`
3. Service logic goes in `services/api/src/service/`
4. OpenAPI spec auto-generates in dev mode
5. Frontend client auto-regenerates if `make dev-generate` is running

### Testing Locally with Mobile

For testing the frontend with mobile devices on local network:

```bash
cd services/api
MODE=capacitor pnpm start:dev
```

This binds API to `192.168.1.96` instead of `localhost`.

## Environment Variables

Each service has an `env.example` file. Key configurations:

### API (`services/api/.env`)
- `CONNECTION_STRING`: PostgreSQL connection
- `POLIS_BASE_URL`: Python bridge URL (optional)
- `TWILIO_*`: SMS OTP configuration
- `AWS_*`: For AI label/summary generation
- `NOSTR_*`: For proof broadcasting

### Frontend (`services/agora/.env`)
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_DEV_AUTHORIZED_PHONES`: Comma-separated phone numbers for dev login

### Math Updater (`services/math-updater/.env`)
- `CONNECTION_STRING`: PostgreSQL connection
- `POLIS_BASE_URL`: Python bridge URL
- `MATH_UPDATER_SCAN_INTERVAL_MS`: Scan frequency (default: 2000ms)
- `MATH_UPDATER_BATCH_SIZE`: Job batch size (default: 10)
- `MATH_UPDATER_JOB_CONCURRENCY`: Concurrent jobs (default: 3)
- `AWS_AI_LABEL_SUMMARY_*`: LLM configuration for cluster labels/summaries

## Docker Images

Build Docker images for services:

```bash
# API
cd services/api
docker build -t agora-api .
# Or for multi-arch:
docker buildx build --platform linux/amd64 -t agora-api --load .

# Frontend
cd services/agora
docker build -f Dockerfile.production -t agora-app .
# Or for staging:
docker build -f Dockerfile.staging -t agora-app-staging .

# Math Updater
cd services/math-updater
docker build -t agora-math-updater .

# Python Bridge
cd services/python-bridge
docker build -t agora-python-bridge .
```

## Prerequisites

Install these tools before development:

- **rsync**: For shared code syncing
- **make**: For Makefile commands
- **jq**: For JSON processing in scripts
- **sed**, **bash**: For script utilities
- **pnpm**: For API and worker package management
- **yarn**: For frontend package management
- **watchman**: For auto-syncing and auto-generation
- **docker**: For PostgreSQL and containerization
- **Python 3.11+**: For python-bridge service
- **Node.js** (v20, v22, or v24): For all Node.js services

## Additional Notes

- The project uses **Drizzle ORM** (not Prisma or TypeORM) for database access
- **Flyway** is used for database migrations (not Drizzle's built-in migrator)
- API uses **Fastify** (not Express)
- Frontend uses **Quasar** framework with Vue 3 and Composition API
- **pg-boss** is used for job queue management in math-updater
- The project integrates with **Rarimo** for ZK-proof passport verification
- Proofs can optionally be broadcast to **Nostr** relays
- **AWS Bedrock** is used for LLM-powered cluster label and summary generation
