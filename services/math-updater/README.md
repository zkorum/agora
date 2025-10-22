# Math Updater Service

Background worker service for automatically updating Polis math calculations and AI-generated cluster insights for conversations in the Agora Citizen Network.

## Overview

The math-updater service is a background worker that periodically scans active conversations and triggers recalculation of Polis clustering mathematics. It processes voting data, computes opinion statistics, cluster assignments, and generates AI-powered cluster labels and summaries using LLM.

## Features

- **Automated Math Updates**: Periodically scans conversations and triggers Polis math recalculation
- **Job Queue Management**: Uses [pg-boss](https://github.com/timgit/pg-boss) for reliable job queue management
- **Cluster Analysis**: Processes Polis math results to generate cluster statistics and assignments
- **AI-Powered Insights**: Generates neutral, concise cluster labels and summaries using AWS Bedrock LLMs
- **Configurable Intervals**: Customizable scan intervals and update frequency
- **Graceful Shutdown**: Handles SIGTERM/SIGINT for clean service termination

## Architecture

The service consists of two main job types:

### 1. Scan Conversations Job

- Runs on a self-scheduling loop (default: every 2 seconds)
- Scans `conversation_update_queue` table for pending math updates
- Queues `update-conversation-math` jobs for eligible conversations
- **Rate limiting**: Respects 20-second minimum between updates per conversation
- **Singleton protection**: Uses pg-boss singleton keys to prevent duplicate jobs per conversation
- Uses self-scheduling pattern: each job schedules the next run after completion
- Error-resilient: continues scheduling even if scan encounters errors

### 2. Update Conversation Math Job

- **Counter reconciliation**: Recalculates accurate counters from actual database records (self-healing)
- Fetches voting data for a specific conversation
- Calls external Polis service to compute clustering mathematics
- **Batch processing**: Handles large conversations (19K+ opinions) via batching to avoid stack overflow
- Processes and stores math results (priorities, consensus, clusters, etc.)
- Optionally generates AI labels and summaries for clusters
- Updates conversation table counters and marks queue entry as processed
- **Race-condition safe**: Only marks processed if no newer update arrived during processing

## Configuration

Configuration is managed via environment variables. See `env.example` for required variables.

### Database

**Primary Database (Required):**
- `CONNECTION_STRING`: PostgreSQL connection string for primary database
  - Used by pg-boss for job queue management (writes)
  - Used for all database writes (opinion updates, counter updates, math results)

**Alternative: AWS Production Mode**
- `DB_HOST`: Primary database host (e.g., `primary.region.rds.amazonaws.com`)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name
- `AWS_SECRET_ID`: AWS Secrets Manager secret ID containing database credentials
- `AWS_SECRET_REGION`: AWS region for Secrets Manager

**Read Replica (Optional):**
- `CONNECTION_STRING_READ`: PostgreSQL connection string for read replica
  - Used for SELECT queries (fetching votes, reading conversation data)
  - Falls back to primary if not configured
- `DB_HOST_READ`: Read replica host (e.g., `replica.region.rds.amazonaws.com`)
- `DB_PORT_READ`: Read replica port (default: 5432)
- `AWS_SECRET_ID_READ`: AWS Secrets Manager secret ID for read replica credentials
- `AWS_SECRET_REGION_READ`: AWS region for read replica secrets

**Important Notes:**
- **pg-boss always uses the primary database** (via `CONNECTION_STRING` or `DB_HOST`)
  - pg-boss manages its own connection pool independently
  - The `pgboss` schema must exist on the primary database
- **Business logic queries (via `db` object) use read replica for SELECTs when configured**
  - `getPolisVotes()` reads from replica (acceptable ~1s staleness)
  - All writes (updates, inserts) automatically route to primary via `withReplicas()`
- **Replication lag**: Typically <1 second, acceptable for math updates (20s minimum rate limit)

### Polis Service

- `POLIS_BASE_URL`: Base URL for the Polis math computation service

### Math Updater Settings

- `MATH_UPDATER_SCAN_INTERVAL_MS`: How often to scan for conversations needing updates (default: 2000ms = 2 seconds, min: 2000ms)
- `MATH_UPDATER_BATCH_SIZE`: Number of jobs to fetch per batch from the queue. Also determines database connection pool size (batch size + 5) (default: 10, max: 50)
- `MATH_UPDATER_JOB_CONCURRENCY`: Number of jobs that execute concurrently within each batch. Limits concurrent heavy database operations to protect the database server (default: 3, max: 10)
- `MATH_UPDATER_MIN_TIME_BETWEEN_UPDATES_MS`: Minimum time between updates for a single conversation (default: 20000ms = 20 seconds, min: 5000ms)

### AWS Configuration (for AI labels/summaries)

- `AWS_SECRET_ID`: AWS Secrets Manager secret ID (optional, for production)
- `AWS_SECRET_REGION`: AWS region for Secrets Manager (optional)
- `AWS_AI_LABEL_SUMMARY_ENABLE`: Enable/disable AI label and summary generation (default: true)
- `AWS_AI_LABEL_SUMMARY_REGION`: AWS region for Bedrock (default: "eu-west-1")
- `AWS_AI_LABEL_SUMMARY_MODEL_ID`: Bedrock model ID (default: "mistral.mistral-large-2402-v1:0")
- `AWS_AI_LABEL_SUMMARY_TEMPERATURE`: LLM temperature (default: "0.4")
- `AWS_AI_LABEL_SUMMARY_TOP_P`: LLM top_p parameter (default: "0.8")
- `AWS_AI_LABEL_SUMMARY_MAX_TOKENS`: Maximum tokens for LLM response (default: "8192")
- `AWS_AI_LABEL_SUMMARY_PROMPT`: Custom prompt for AI label/summary generation (see config.ts for default)

## AI Label & Summary Generation

When enabled, the service uses AWS Bedrock to generate:

1. **Cluster Labels**: Short (1-2 words), neutral, agentive nouns describing each cluster's ideological position
   - Examples: "Skeptics", "Technologists", "Redistributionists", "Pragmatists"
   - Avoids policy-specific terms, geographic references, and abstract concepts
   - Professional/academic tone that reflects generality and positionality

2. **Cluster Summaries**: Concise (≤300 chars), neutral summaries of each cluster's perspective
   - Grounded in cluster's agreement/disagreement patterns
   - Reflects cluster's stance relative to conversation context
   - Covers all representative opinions without repetition

The AI prompt is carefully designed to:

- Detect sarcasm and irony
- Analyze each cluster independently
- Consider whether opinions are supported or rejected by the cluster
- Generate abstract, context-independent labels
- Produce neutral, professional summaries

## Development

### Prerequisites

- Node.js 16+
- PostgreSQL database
- Access to Polis service
- AWS credentials (if using AI features)

### Installation

```bash
pnpm install
```

### Running Locally

```bash
# Development mode with auto-reload
pnpm start:dev

# Production build
pnpm build
pnpm start
```

### Linting & Formatting

```bash
pnpm lint
pnpm format:check
pnpm format:write
```

## How It Works

1. **Initialization**: Service connects to database and initializes pg-boss job queue with **singleton policy**
   - Queue policy ensures only 1 job per conversation (created OR active) to prevent duplicate processing

2. **Loop Kickoff**: Sends initial `scan-conversations` job with singleton key to start the self-scheduling loop

3. **Conversation Scanning**: Scan job queries `conversation_update_queue` table for pending updates
   - Reads conversations where `processed_at IS NULL`
   - Respects rate limiting via `last_math_update_at` (20s minimum between updates)
   - Orders by `last_math_update_at ASC NULLS FIRST` (prioritizes never-updated and oldest)

4. **Job Queueing**: Eligible conversations are queued as `update-conversation-math` jobs
   - Each job includes captured `requestedAt` timestamp for race-condition detection
   - Uses `singletonKey: update-math-${conversationId}` per conversation
   - Dynamic `singletonSeconds` based on conversation size (15s-120s)

5. **Self-Scheduling**: After each scan, the job schedules itself to run again after `MATH_UPDATER_SCAN_INTERVAL_MS`
   - Uses `singletonKey` to prevent duplicate loops
   - Always reschedules, even if the scan encounters errors
   - Creates a continuous, reliable scanning loop

6. **Counter Reconciliation** (services/math-updater/src/conversationCounters.ts):
   - Recalculates `opinion_count`, `vote_count`, `participant_count` from actual DB records
   - Self-healing: fixes drift from soft deletes, moderation, user deletion
   - Updates `lastReactedAt` for activity tracking
   - Logs any discrepancies found

7. **Math Processing**: Worker jobs fetch votes, call Polis service, process results
   - Batches large conversations (1000 opinions per batch) to avoid stack overflow
   - Handles conversations with 100K+ votes and 19K+ opinions

8. **Database Updates**: Math results are stored in database, updating:
   - Conversation counters (opinion_count, vote_count, participant_count, lastReactedAt)
   - Opinion priorities, consensus levels, divisiveness scores
   - Cluster assignments for participants
   - Cluster statistics (agreement/disagreement counts per opinion)
   - Representative opinions for each cluster

9. **AI Enhancement**: If enabled, generates AI-powered cluster labels and summaries

10. **Queue Completion** (race-condition safe):
    - Marks queue entry as `processedAt = NOW()` only if `requestedAt` unchanged
    - If `requestedAt` changed during processing → new update arrived → this is now stale
    - Always updates `last_math_update_at` for rate limiting
    - Newer updates automatically picked up by next scan

## Database Schema

The service interacts with several database tables:

### Queue Management
- `conversation_update_queue`: Tracks pending math updates with rate limiting
  - `conversation_id` (PRIMARY KEY): Deduplicates queue entries
  - `requested_at`: When update was requested (used for race-condition detection)
  - `processed_at`: NULL = pending, NOT NULL = processed
  - `last_math_update_at`: Tracks actual processing time (enables 20s rate limiting)

### Core Data
- `conversation`: Stores conversation metadata, counters, and current math content reference
  - Counters: `opinion_count`, `vote_count`, `participant_count`, `lastReactedAt`
  - Updated by math-updater via counter reconciliation
- `opinion`: Stores opinions with math-computed statistics (priority, consensus, divisiveness)
- `vote`: Stores user votes on opinions
- `polis_content`: Stores raw Polis math results
- `polis_cluster`: Stores cluster metadata
- `polis_cluster_user`: Maps users to clusters
- `polis_cluster_opinion`: Stores representative opinions for each cluster

## Error Handling

- Database connection errors are logged and cause service shutdown
- Math computation errors are logged but don't crash the service
- AI generation errors are caught and logged, allowing math updates to complete
- Job failures are handled by pg-boss retry mechanism

## Monitoring

The service logs important events:

- Service startup and shutdown
- Job registrations and scheduling
- Conversation scans with slugIds: `[Scan] Found 3 conversation(s) needing math updates: [SIP3Kg, sfoFIQ, 15I-Jw]`
- Enqueued vs skipped conversations: `[Scan] Successfully enqueued 2 conversation(s): [sfoFIQ, 15I-Jw]`
- Counter reconciliation discrepancies: `[Counter] Fixing counters for R3NBkA: diff { opinions: -2, votes: -3 }`
- Math processing times for large conversations (113K votes: 50-85 seconds)
- AI label/summary generation
- Errors and warnings

**Key Metrics to Watch**:
- Counter drift frequency (should be occasional, not every update)
- Large conversations processing time (>60s indicates heavy load)
- Singleton job rejections (normal behavior, prevents duplicate work)
- Queue depth (pending updates in `conversation_update_queue`)

Use structured logging output to monitor service health and performance.

## License

This service is licensed under the AGPL v3 license. See [COPYING](./COPYING) for details.

## Related Services

- [`api`](../api): Main API service that triggers manual math updates
- [`python-bridge`](../python-bridge): Python bridge for Polis math computation
- [`shared-backend`](../shared-backend): Shared database schema and utilities

## Contributing

Contributions must comply with the [Fiduciary Licensing Agreement (FLA)](https://cla-assistant.io/zkorum/zkorum).
