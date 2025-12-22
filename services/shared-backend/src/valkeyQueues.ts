/**
 * Centralized Valkey queue key definitions
 *
 * All queue names are defined here for type safety and consistency.
 * This prevents typos and makes queue management easier.
 */

export const VALKEY_QUEUE_KEYS = {
    /**
     * Vote buffer index - sorted set for ordering votes by timestamp
     * Used by: voteBuffer.ts
     * Pattern: Member = userId:opinionId, Score = timestamp
     */
    VOTE_BUFFER_INDEX: "queue:votes:index",

    /**
     * Vote buffer data - hash storing full vote JSON data
     * Used by: voteBuffer.ts
     * Pattern: Field = userId:opinionId, Value = JSON vote data
     */
    VOTE_BUFFER_DATA: "queue:votes:data",

    /**
     * Export buffer queue - stores export requests for batch processing
     * Used by: exportBuffer.ts
     * Pattern: Export requests are added here and processed every 1s
     */
    EXPORT_BUFFER: "queue:exports",

    /**
     * Import buffer queue - stores CSV import requests for batch processing
     * Used by: importBuffer.ts
     * Pattern: Import requests are added here and processed every 1s
     */
    IMPORT_BUFFER: "queue:imports",
} as const;

/**
 * Type-safe queue key access
 * Usage: const key = VALKEY_QUEUE_KEYS.VOTE_BUFFER
 */
export type ValkeyQueueKey =
    (typeof VALKEY_QUEUE_KEYS)[keyof typeof VALKEY_QUEUE_KEYS];
