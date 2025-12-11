/**
 * Centralized Valkey queue key definitions
 *
 * All queue names are defined here for type safety and consistency.
 * This prevents typos and makes queue management easier.
 */

export const VALKEY_QUEUE_KEYS = {
    /**
     * Vote buffer queue - stores buffered votes for batch processing
     * Used by: voteBuffer.ts
     * Pattern: User votes are added here and flushed every 1s
     */
    VOTE_BUFFER: "queue:votes",

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
