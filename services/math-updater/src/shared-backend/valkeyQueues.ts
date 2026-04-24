/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
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
     * Import buffer queue - stores CSV import requests for batch processing
     * Used by: importBuffer.ts
     * Pattern: Import requests are added here and processed every 1s
     */
    IMPORT_BUFFER: "queue:imports",

    /**
     * Scoring dirty set: conversations needing Solidago rescoring.
     * Used by: maxdiff.ts (API writes SADD), scoring-worker (SPOP to process)
     * Pattern: SET of conversationId strings. SADD deduplicates, SPOP is atomic.
     */
    SCORING_DIRTY_SOLIDAGO: "scoring:dirty:solidago",

    /**
     * UCAN replay protection - key prefix for used UCAN hashes
     * Used by: index.ts (verifyUcan)
     * Pattern: Key = prefix + SHA-256(encodedUcan), Value = issuer DID, TTL = token remaining lifetime + 5s
     */
    UCAN_USED_PREFIX: "ucan:used:",
} as const;

/**
 * Type-safe queue key access
 * Usage: const key = VALKEY_QUEUE_KEYS.VOTE_BUFFER
 */
export type ValkeyQueueKey =
    (typeof VALKEY_QUEUE_KEYS)[keyof typeof VALKEY_QUEUE_KEYS];
