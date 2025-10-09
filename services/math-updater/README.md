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
- Scans the database for conversations needing math updates
- Queues `update-conversation-math` jobs for eligible conversations
- Respects minimum time between updates to avoid excessive recalculation
- Uses self-scheduling pattern: each job schedules the next run after completion
- Error-resilient: continues scheduling even if scan encounters errors

### 2. Update Conversation Math Job

- Fetches voting data for a specific conversation
- Calls external Polis service to compute clustering mathematics
- Processes and stores math results (priorities, consensus, clusters, etc.)
- Optionally generates AI labels and summaries for clusters
- Updates database with latest math results

## Configuration

Configuration is managed via environment variables. See `env.example` for required variables.

### Database

- `CONNECTION_STRING`: PostgreSQL connection string

### Polis Service

- `POLIS_BASE_URL`: Base URL for the Polis math computation service

### Math Updater Settings

- `MATH_UPDATER_SCAN_INTERVAL_MS`: How often to scan for conversations needing updates (default: 2000ms = 2 seconds, min: 2000ms)
- `MATH_UPDATER_PROCESS_CONCURRENCY`: Number of concurrent math update jobs (default: 10, max: 50)
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

1. **Initialization**: Service connects to database and initializes pg-boss job queue
2. **Loop Kickoff**: Sends initial `scan-conversations` job with singleton key to start the self-scheduling loop
3. **Conversation Scanning**: Scan job queries database for conversations that need math updates
4. **Job Queueing**: Eligible conversations are queued as `update-conversation-math` jobs
5. **Self-Scheduling**: After each scan, the job schedules itself to run again after `MATH_UPDATER_SCAN_INTERVAL_MS`
   - Uses `singletonKey` to prevent duplicate loops
   - Always reschedules, even if the scan encounters errors
   - Creates a continuous, reliable scanning loop
6. **Math Processing**: Worker jobs fetch votes, call Polis service, process results
7. **Database Updates**: Math results are stored in database, updating:
   - Opinion priorities, consensus levels, divisiveness scores
   - Cluster assignments for participants
   - Cluster statistics (agreement/disagreement counts per opinion)
   - Representative opinions for each cluster
8. **AI Enhancement**: If enabled, generates AI-powered cluster labels and summaries
9. **Completion**: Conversation's `currentPolisContentId` is updated to point to latest math results

## Database Schema

The service interacts with several database tables:

- `conversation`: Stores conversation metadata and current math content reference
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
- Conversation scans and math updates
- AI label/summary generation
- Errors and warnings

Use structured logging output to monitor service health and performance.

## License

This service is licensed under the AGPL v3 license. See [COPYING](./COPYING) for details.

## Related Services

- [`api`](../api): Main API service that triggers manual math updates
- [`python-bridge`](../python-bridge): Python bridge for Polis math computation
- [`shared-backend`](../shared-backend): Shared database schema and utilities

## Contributing

Contributions must comply with the [Fiduciary Licensing Agreement (FLA)](https://cla-assistant.io/zkorum/zkorum).
