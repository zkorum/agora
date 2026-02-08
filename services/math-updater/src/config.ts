import "dotenv/config";
import { z } from "zod";
import { sharedConfigSchema } from "./shared-backend/config.js";

/**
 * Math updater specific configuration
 */
const mathUpdaterConfigSchema = sharedConfigSchema.extend({
    // Polis Service
    POLIS_BASE_URL: z.string().url(),

    // Infrastructure Configuration
    /**
     * Total vCPUs available to the system (used to auto-calculate concurrency settings)
     * Examples: t3.medium=2, t3.xlarge=4, t3.2xlarge=8
     * Default: 2 (conservative for small instances)
     */
    TOTAL_VCPUS: z.coerce.number().int().min(1).max(128).default(2),

    // Math Updater Settings

    /**
     * How often to scan conversation_update_queue for pending updates (in milliseconds)
     * Default: 2000ms (2 seconds)
     * Minimum: 2000ms
     */
    MATH_UPDATER_SCAN_INTERVAL_MS: z.coerce
        .number()
        .int()
        .min(2000)
        .default(2000),

    /**
     * Maximum number of jobs to fetch per batch from pg-boss queue
     * Also determines database connection pool size (batch size + 5)
     *
     * Auto-calculated from TOTAL_VCPUS if not explicitly set:
     *   2 vCPUs → batch_size=5
     *   4 vCPUs → batch_size=10
     *   8 vCPUs → batch_size=20
     *
     * Range: 1-100
     */
    MATH_UPDATER_BATCH_SIZE: z.coerce.number().int().min(1).max(100).optional(),

    /**
     * Number of jobs that execute concurrently within each batch
     * Limits concurrent requests to Python bridge (polis service)
     * Should match number of Gunicorn workers in polis service
     * Should be <= MATH_UPDATER_BATCH_SIZE
     *
     * Auto-calculated from TOTAL_VCPUS if not explicitly set:
     *   Concurrency = TOTAL_VCPUS (match polis worker count)
     *
     * Range: 1-50
     */
    MATH_UPDATER_JOB_CONCURRENCY: z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .optional(),

    /**
     * Minimum time between math updates for a single conversation (in milliseconds)
     * Rate limiting prevents overwhelming the Python polis math service
     * Updates requested more frequently are queued until this interval passes
     * Default: 2000ms (2 seconds) - aggressive for real-time updates
     * Minimum: 2000ms (2 seconds)
     * Note: Large conversations (100K+ votes) take 50-85 seconds to process
     */
    MATH_UPDATER_MIN_TIME_BETWEEN_UPDATES_MS: z.coerce
        .number()
        .int()
        .min(2000)
        .default(2000),
    // for production
    AWS_SECRET_ID: z.string().optional(),
    AWS_SECRET_REGION: z.string().optional(),
    //
    AWS_AI_LABEL_SUMMARY_ENABLE: z
        .string()
        .default("true")
        .transform((val) => {
            const normalized = val.toLowerCase();
            return normalized !== "false" && normalized !== "0";
        })
        .pipe(z.boolean()),
    AWS_AI_LABEL_SUMMARY_REGION: z.string().default("us-east-1"),
    AWS_AI_LABEL_SUMMARY_MODEL_ID: z
        .string()
        .default("mistral.mistral-large-3-675b-instruct"),
    AWS_AI_LABEL_SUMMARY_TEMPERATURE: z.string().default("0.15"),
    AWS_AI_LABEL_SUMMARY_TOP_P: z.string().default("0.9"),
    AWS_AI_LABEL_SUMMARY_MAX_TOKENS: z.string().default("8192"),
    AWS_AI_LABEL_SUMMARY_PROMPT: z.string().default(
        `You are analyzing opinion clusters from a group conversation. Output only raw JSON, no extra text or markdown.

## Output Format
{
  "clusters": {
    "0": {
      "reasoning": "Step-by-step analysis of what this cluster supports and rejects, then derive the label",
      "label": "1-2 word neutral label (-ists, -ers, -ians)",
      "summary": "≤300 chars describing cluster's perspective"
    },
    "1": { "reasoning": "...", "label": "...", "summary": "..." },
    "2": { "reasoning": "...", "label": "...", "summary": "..." },
    "3": { "reasoning": "...", "label": "...", "summary": "..." },
    "4": { "reasoning": "...", "label": "...", "summary": "..." },
    "5": { "reasoning": "...", "label": "...", "summary": "..." }
  }
}

## Input Format
{
  "conversationTitle": "string",
  "conversationBody": "string (optional)",
  "clusters": {
    "0": { "agreesWith": [...], "disagreesWith": [...] },
    ...
  }
}

## Reasoning Steps (MUST follow in the reasoning field)
For each cluster:
1. List what opinions are in agreesWith - these are opinions the cluster SUPPORTS
2. List what opinions are in disagreesWith - these are opinions the cluster REJECTS/OPPOSES
3. Interpret: "Since they reject [X], they believe [opposite of X]"
4. Derive the label from the interpretation
5. Write summary based on what they support AND what they reject

## Example
Input cluster "0":
  "agreesWith": [],
  "disagreesWith": ["Technology always improves society", "Innovation is always beneficial"]

Correct reasoning and output:
{
  "reasoning": "agreesWith is empty, so no explicit support. disagreesWith contains 'Technology always improves society' and 'Innovation is always beneficial'. Since they REJECT these pro-technology statements, this cluster is skeptical of uncritical tech optimism.",
  "label": "Skeptics",
  "summary": "This cluster rejects the notion that technology and innovation always improve society or provide benefits."
}

WRONG (do not do this):
{
  "reasoning": "They believe technology improves society",
  "label": "Technologists",
  "summary": "This cluster believes technology always improves society."
}
The above is WRONG because "Technology always improves society" is in disagreesWith, meaning they REJECT it, not believe it.

## Label Guidelines
- 1-2 words, ≤30 chars, neutral agentive nouns (-ists, -ers, -ians)
- Focus on intellectual traditions or philosophical approaches
- Avoid policy-specific terms or geographic references
- Good: "Redistributionists", "Decentralists", "Humanists", "Skeptics", "Technologists", "Critics"
- Bad: "Regional Advocates", "AI Tool Users", "Naysayers", "Plastic Ban Advocates"

## Summary Guidelines
- ≤300 chars, neutral, concise
- Grounded in what the cluster SUPPORTS (agreesWith) and REJECTS (disagreesWith)
- Must accurately reflect the cluster's perspective based on reasoning

Generate labels and summaries for all clusters in the input, using the reasoning field to show your analysis.
`,
    ),
});

// Parse base config
const parsedConfig = mathUpdaterConfigSchema.parse(process.env);

// Auto-calculate concurrency settings from TOTAL_VCPUS if not explicitly provided
const totalVcpus = parsedConfig.TOTAL_VCPUS;

// Job concurrency: How many concurrent requests to send to Python-bridge
// We can send slightly more than available workers because:
// 1. Gunicorn queues excess requests (backlog=2048)
// 2. As soon as a worker finishes, queued request starts immediately (no gap)
// 3. Improves throughput without overwhelming the service
//
// Formula: workers + small buffer (1-2 extra requests)
// Examples:
//   2 vCPUs → concurrency = 3 (2 workers + 1 buffer)
//   4 vCPUs → concurrency = 5 (4 workers + 1 buffer)
//   8 vCPUs → concurrency = 10 (8 workers + 2 buffer)
const jobConcurrency = parsedConfig.MATH_UPDATER_JOB_CONCURRENCY ??
    (totalVcpus + Math.min(2, Math.ceil(totalVcpus * 0.25)));

// Batch size: How many jobs to fetch from pg-boss queue at once
// Should be larger than concurrency to keep pipeline full
// Formula: 2x concurrency, ensures we always have work ready
// Examples:
//   concurrency=3 → batch=6
//   concurrency=5 → batch=10
//   concurrency=10 → batch=20
const batchSize = parsedConfig.MATH_UPDATER_BATCH_SIZE ?? (jobConcurrency * 2);

export const config = {
    ...parsedConfig,
    MATH_UPDATER_JOB_CONCURRENCY: jobConcurrency,
    MATH_UPDATER_BATCH_SIZE: batchSize,
};

export type MathUpdaterConfig = z.infer<typeof mathUpdaterConfigSchema>;
