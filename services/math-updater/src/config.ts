import "dotenv/config";
import { z } from "zod";
import { sharedConfigSchema } from "./shared-backend/config.js";

/**
 * Math updater specific configuration
 */
const mathUpdaterConfigSchema = sharedConfigSchema.extend({
    // Polis Service
    POLIS_BASE_URL: z.string().url(),

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
     * Default: 20
     * Range: 1-100
     */
    MATH_UPDATER_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(20),

    /**
     * Number of jobs that execute concurrently within each batch
     * Limits concurrent heavy database operations to protect the database server
     * Should be <= MATH_UPDATER_BATCH_SIZE
     * Default: 10 (processes up to 10 different conversations simultaneously)
     * Range: 1-50
     */
    MATH_UPDATER_JOB_CONCURRENCY: z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10),

    /**
     * Minimum time between math updates for a single conversation (in milliseconds)
     * Rate limiting prevents overwhelming the Python polis math service
     * Updates requested more frequently are queued until this interval passes
     * Default: 20000ms (20 seconds)
     * Minimum: 5000ms (5 seconds)
     * Note: Large conversations (100K+ votes) take 50-85 seconds to process
     */
    MATH_UPDATER_MIN_TIME_BETWEEN_UPDATES_MS: z.coerce
        .number()
        .int()
        .min(5000)
        .default(20000),
    // for production
    AWS_SECRET_ID: z.string().optional(),
    AWS_SECRET_REGION: z.string().optional(),
    //
    AWS_AI_LABEL_SUMMARY_ENABLE: z
        .string()
        .transform((val) => {
            const normalized = val.toLowerCase();
            return normalized !== "false" && normalized !== "0";
        })
        .pipe(z.boolean())
        .default("true"),
    AWS_AI_LABEL_SUMMARY_REGION: z.string().default("eu-west-1"),
    AWS_AI_LABEL_SUMMARY_MODEL_ID: z
        .string()
        .default("mistral.mistral-large-2402-v1:0"),
    AWS_AI_LABEL_SUMMARY_TEMPERATURE: z.string().default("0.4"),
    AWS_AI_LABEL_SUMMARY_TOP_P: z.string().default("0.8"),
    AWS_AI_LABEL_SUMMARY_MAX_TOKENS: z.string().default("8192"),
    AWS_AI_LABEL_SUMMARY_PROMPT: z.string().default(
        `You are a JSON API analyzing group conversations similar to Pol.is. Output only one raw JSON object, no extra text or markdown.

Output Format:
{
  "clusters": {
    "0": { "label": "string", "summary": "string" },
    "1": { "label": "string", "summary": "string" },
    "2": { "label": "string", "summary": "string" },
    "3": { "label": "string", "summary": "string" },
    "4": { "label": "string", "summary": "string" },
    "5": { "label": "string", "summary": "string" }
  }
}
(Reference only — never include in output)

Input Format:
{
  "conversationTitle": "string",
  "conversationBody": "string (optional)",
  "clusters": {
    "0": { "agreesWith": [...], "disagreesWith": [...] },
    "1": { ... },
    "2": { ... },
    "3": { ... },
    "4": { ... },
    "5": { ... }
  }
}

Rules:
- Use conversationTitle and conversationBody as context.
- Detect sarcasm/irony; avoid literal misreadings.
- For each cluster *independently*:
    - agreesWith = opinions that most members of this specific cluster *support*.
    - disagreesWith = opinions that most members of this specific cluster *reject*.
    - Make sure to consider whether the specific cluster agrees or disagrees with the provided opinions, so as not to change the intended meaning.

Labels:
1. Length and Format:
    - 1–2 words, ≤30 chars, neutral agentive nouns (-ists, -ers, -ians)
    - Use neutral agentive nouns ending in -ists, -ers, -ians, etc.
    - Avoid policy-specific terms or geographic references.
    - Avoid abstract concepts (e.g. avoid “Concerns”)
2. Content Abstraction:
    - Focus on group positions, intellectual traditions, or philosophical approaches.
    - Overt discussion-specific context may be omitted if the context is implied by opposing clusters (e.g. use labels like “Skeptics”, “Technologists”, and “Ethicists” instead of "AI Skeptics", "AI Tool Advocates", "AI Ethicists")
    - Avoid describing specific mechanisms (e.g., avoid "Income Threshold Supporters" or “Rural Educators”).
3. Tone:
    - Aim for a professional/academic tone that reflects generality and positionality.
    - Use terms that could apply across contexts (e.g., "Pragmatists", "Skeptics").
4. Examples:
    - Good: "Redistributionists", "Decentralists", "Humanists", "Skeptics", "Technologists", "Critics", "Mutualists", "Individualists", etc.
    - Bad: "Regional Advocates", "AI Tool Users", "Naysayers", "Plastic Ban Advocates", etc.
5. Generation Process:
    a) Identify the core stance or intellectual tradition within the cluster. IMPORTANT: Remember to make sure to consider whether the specific cluster agrees or disagrees with the provided opinions, so as not to change the intended meaning.
    b) Abstract this stance into a general term using agentive suffixes.
    c) Validate that the label avoids policy specifics and geographic references.
    d) Validate that the label is either 1 or 2 words.

Summaries:
- ≤300 chars, neutral, concise
- Reflect cluster perspective and disagreements
- Grounded in cluster "agreesWith" and "disagreesWith" opinions and conversation context
- IMPORTANT: Remember to make sure to consider whether the specific cluster agrees or disagrees with the provided opinions, so as not to change the intended meaning.
- Summarize the cluster's perspective fully and precisely, covering all representative opinions of that cluster, concisely and without repetition.

Now analyze the following JSON input and generate precise, neutral labels and summaries for clusters "0"–"5" independently following the above rules.
`,
    ),
});
export const config = mathUpdaterConfigSchema.parse(process.env);

export type MathUpdaterConfig = z.infer<typeof mathUpdaterConfigSchema>;
