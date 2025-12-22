/**
 * Import Buffer Service
 *
 * Batches CSV/URL import requests to reduce system load and improve throughput.
 *
 * Architecture:
 * - Uses Valkey List for FIFO queue (rpush to add, lpopCount to consume)
 * - At-most-once delivery: items are popped before processing
 * - Orphaned "processing" records are cleaned up periodically via stale cleanup
 *
 * Flow:
 * 1. API creates DB record with status "processing" (source of truth)
 * 2. API pushes request to Valkey list
 * 3. Flush interval pops items (at-most-once) and processes them
 * 4. Status updated to 'completed' or 'failed', notification sent
 * 5. If crash before completion, stale cleanup marks DB record as failed + notifies
 *
 * Why at-most-once:
 * - Imports create conversations - duplicate processing would create duplicate data
 * - User can manually retry if import fails
 * - 5-minute stale timeout ensures users get notified of failures quickly
 */

import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { conversationImportTable } from "@/shared-backend/schema.js";
import { eq, and, lt } from "drizzle-orm";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
import { log } from "@/app.js";
import type { NotificationSSEManager } from "./notificationSSE.js";
import type { VoteBuffer } from "./voteBuffer.js";
import type { AxiosInstance } from "axios";
import pLimit from "p-limit";
import { processCsvImport, zodCsvFiles, type CsvFiles } from "./csvImport.js";
import { processUrlImport } from "./urlImport.js";
import { createImportNotification } from "./conversationImport/notifications.js";
import { zodEventSlug, type EventSlug } from "@/shared/types/zod.js";
import { z } from "zod";

// ============================================================================
// Zod Schemas for Valkey Data Validation
// ============================================================================

const zodImportFormData = z.object({
    postAsOrganization: z.string().optional(),
    indexConversationAt: z.string().optional(),
    isLoginRequired: z.boolean(),
    isIndexed: z.boolean(),
    requiresEventTicket: zodEventSlug.optional(),
});

const zodImportRequestBase = z.object({
    importSlugId: z.string(),
    userId: z.string(),
    formData: zodImportFormData,
    proof: z.string(),
    didWrite: z.string(),
    authorId: z.string(),
});

const zodCsvImportRequest = zodImportRequestBase.extend({
    type: z.literal("csv"),
    files: zodCsvFiles,
});

const zodUrlImportRequest = zodImportRequestBase.extend({
    type: z.literal("url"),
    polisUrl: z.string(),
});

// Exported for testing
export const zodImportRequest = z.discriminatedUnion("type", [
    zodCsvImportRequest,
    zodUrlImportRequest,
]);

// ============================================================================
// Types
// ============================================================================

/**
 * Common fields for all import requests
 */
interface ImportRequestBase {
    importSlugId: string;
    userId: string;
    formData: {
        postAsOrganization?: string;
        indexConversationAt?: string;
        isLoginRequired: boolean;
        isIndexed: boolean;
        requiresEventTicket?: EventSlug;
    };
    proof: string;
    didWrite: string;
    authorId: string;
}

/**
 * CSV import request - files are stored directly
 */
export interface CsvImportRequest extends ImportRequestBase {
    type: "csv";
    files: CsvFiles;
}

/**
 * URL import request - Polis URL to fetch from
 */
export interface UrlImportRequest extends ImportRequestBase {
    type: "url";
    polisUrl: string;
}

/**
 * Discriminated union for import requests
 */
export type ImportRequest = CsvImportRequest | UrlImportRequest;

/**
 * Import buffer instance
 */
export interface ImportBuffer {
    addImport: (request: ImportRequest) => Promise<void>;
    flush: () => Promise<void>;
    shutdown: () => Promise<void>;
}

interface ImportBufferDependencies {
    db: PostgresDatabase;
    valkey: Valkey | undefined;
    notificationSSEManager: NotificationSSEManager;
    voteBuffer: VoteBuffer;
    axiosPolis: AxiosInstance | undefined;
    flushIntervalMs: number;
    maxBatchSize: number;
    maxConcurrency: number;
    staleThresholdMs: number;
    staleCleanupEveryNFlushes: number;
}

// ============================================================================
// Import Buffer Implementation
// ============================================================================

/**
 * Create an import buffer instance
 */
export function createImportBuffer(
    deps: ImportBufferDependencies,
): ImportBuffer {
    const {
        db,
        valkey,
        notificationSSEManager,
        voteBuffer,
        axiosPolis,
        flushIntervalMs,
        maxBatchSize,
        maxConcurrency,
        staleThresholdMs,
        staleCleanupEveryNFlushes,
    } = deps;

    // Create concurrency limiter for parallel import processing
    const limit = pLimit(maxConcurrency);

    // Flush counter for periodic stale cleanup
    let flushCount = 0;

    // Flush timer
    let flushTimer: NodeJS.Timeout | undefined;
    let isShuttingDown = false;

    // In-memory queue for when Valkey is not configured
    const inMemoryQueue: ImportRequest[] = [];

    /**
     * Process a single import request (CSV or URL)
     */
    async function processImport(request: ImportRequest): Promise<void> {
        try {
            log.info(
                `[ImportBuffer] Processing ${request.type} import ${request.importSlugId}`,
            );

            let result: { conversationId: number };

            if (request.type === "csv") {
                result = await processCsvImport({
                    db,
                    voteBuffer,
                    files: request.files,
                    proof: request.proof,
                    didWrite: request.didWrite,
                    authorId: request.authorId,
                    postAsOrganization: request.formData.postAsOrganization,
                    indexConversationAt: request.formData.indexConversationAt,
                    isLoginRequired: request.formData.isLoginRequired,
                    isIndexed: request.formData.isIndexed,
                    requiresEventTicket: request.formData.requiresEventTicket,
                });
            } else {
                if (axiosPolis === undefined) {
                    throw new Error(
                        "Polis API connection not configured for URL imports",
                    );
                }

                result = await processUrlImport({
                    db,
                    voteBuffer,
                    axiosPolis,
                    polisUrl: request.polisUrl,
                    proof: request.proof,
                    didWrite: request.didWrite,
                    authorId: request.authorId,
                    postAsOrganization: request.formData.postAsOrganization,
                    indexConversationAt: request.formData.indexConversationAt,
                    isLoginRequired: request.formData.isLoginRequired,
                    isIndexed: request.formData.isIndexed,
                    requiresEventTicket: request.formData.requiresEventTicket,
                });
            }

            // Get the import record to get the import ID
            const importRecord = await db
                .select({
                    id: conversationImportTable.id,
                })
                .from(conversationImportTable)
                .where(eq(conversationImportTable.slugId, request.importSlugId))
                .limit(1);

            if (importRecord.length === 0) {
                throw new Error(
                    `Import record not found for ${request.importSlugId}`,
                );
            }

            const importId = importRecord[0].id;

            // Update import status to completed
            await db
                .update(conversationImportTable)
                .set({
                    status: "completed",
                    conversationId: result.conversationId,
                    updatedAt: new Date(),
                })
                .where(
                    eq(conversationImportTable.slugId, request.importSlugId),
                );

            // Send notification
            await createImportNotification({
                db,
                userId: request.userId,
                importId,
                conversationId: result.conversationId,
                type: "import_completed",
                notificationSSEManager,
            });

            log.info(
                `[ImportBuffer] ${request.type} import ${request.importSlugId} completed successfully`,
            );
        } catch (error) {
            log.error(
                error,
                `[ImportBuffer] Import ${request.importSlugId} failed`,
            );

            // Get the import record to get the import ID
            const importRecord = await db
                .select({
                    id: conversationImportTable.id,
                })
                .from(conversationImportTable)
                .where(eq(conversationImportTable.slugId, request.importSlugId))
                .limit(1);

            await db
                .update(conversationImportTable)
                .set({
                    status: "failed",
                    failureReason: "processing_error",
                    updatedAt: new Date(),
                })
                .where(
                    eq(conversationImportTable.slugId, request.importSlugId),
                );

            // Send failure notification if import record exists
            if (importRecord.length > 0) {
                const importId = importRecord[0].id;
                await createImportNotification({
                    db,
                    userId: request.userId,
                    importId,
                    conversationId: null,
                    type: "import_failed",
                    notificationSSEManager,
                });
            }

            log.error(
                error,
                `[ImportBuffer] ${request.type} import ${request.importSlugId} failed`,
            );
        }
    }

    // Minimal schema to extract just the fields needed for failure notification
    const zodMinimalImportRequest = z.object({
        importSlugId: z.string(),
        userId: z.string(),
    });

    /**
     * Try to mark an invalid Valkey item as failed in the database.
     * Attempts to extract importSlugId and userId from partially valid data.
     * If extraction fails, does nothing (stale cleanup will catch it eventually).
     */
    async function tryMarkInvalidItemAsFailed(parsed: unknown): Promise<void> {
        const result = zodMinimalImportRequest.safeParse(parsed);
        if (!result.success) {
            // Cannot extract required fields - stale cleanup will handle it
            log.warn(
                "[ImportBuffer] Cannot extract importSlugId/userId from invalid item",
            );
            return;
        }

        const { importSlugId, userId } = result.data;

        try {
            // Get the import record
            const importRecord = await db
                .select({
                    id: conversationImportTable.id,
                })
                .from(conversationImportTable)
                .where(eq(conversationImportTable.slugId, importSlugId))
                .limit(1);

            if (importRecord.length === 0) {
                log.warn(
                    `[ImportBuffer] Import record not found for invalid item: ${importSlugId}`,
                );
                return;
            }

            // Mark as failed
            await db
                .update(conversationImportTable)
                .set({
                    status: "failed",
                    failureReason: "invalid_data_format",
                    updatedAt: new Date(),
                })
                .where(eq(conversationImportTable.slugId, importSlugId));

            // Send notification
            await createImportNotification({
                db,
                userId,
                importId: importRecord[0].id,
                conversationId: null,
                type: "import_failed",
                notificationSSEManager,
            });

            log.info(
                `[ImportBuffer] Marked invalid import ${importSlugId} as failed`,
            );
        } catch (error) {
            log.error(
                error,
                `[ImportBuffer] Failed to mark invalid import ${importSlugId} as failed`,
            );
        }
    }

    /**
     * Cleanup stale imports and send notifications
     * Stale = "processing" status for longer than staleThresholdMs
     */
    async function cleanupStaleImportsWithNotifications(): Promise<void> {
        const staleTimestamp = new Date(Date.now() - staleThresholdMs);

        // Get stale imports first (for notifications)
        const staleImports = await db
            .select({
                id: conversationImportTable.id,
                slugId: conversationImportTable.slugId,
                userId: conversationImportTable.userId,
            })
            .from(conversationImportTable)
            .where(
                and(
                    eq(conversationImportTable.status, "processing"),
                    lt(conversationImportTable.updatedAt, staleTimestamp),
                ),
            );

        if (staleImports.length === 0) {
            return;
        }

        // Mark as failed
        await db
            .update(conversationImportTable)
            .set({
                status: "failed",
                failureReason: "timeout",
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(conversationImportTable.status, "processing"),
                    lt(conversationImportTable.updatedAt, staleTimestamp),
                ),
            );

        log.info(
            `[ImportBuffer] Cleaned up ${String(staleImports.length)} stale imports`,
        );

        // Send notifications
        for (const staleImport of staleImports) {
            try {
                await createImportNotification({
                    db,
                    userId: staleImport.userId,
                    importId: staleImport.id,
                    conversationId: null,
                    type: "import_failed",
                    notificationSSEManager,
                });
            } catch (notificationError) {
                log.error(
                    notificationError,
                    `[ImportBuffer] Failed to send stale notification for import ${staleImport.slugId}`,
                );
            }
        }
    }

    /**
     * Flush pending imports from buffer
     */
    async function flush(): Promise<void> {
        // Periodic stale cleanup
        flushCount++;
        if (flushCount % staleCleanupEveryNFlushes === 0) {
            try {
                await cleanupStaleImportsWithNotifications();
            } catch (error) {
                log.error(error, "[ImportBuffer] Stale cleanup failed");
            }
        }

        // Pop items from queue (at-most-once: remove before processing)
        const batch: ImportRequest[] = [];

        if (valkey !== undefined) {
            // Use Valkey queue
            try {
                // lpopCount returns up to maxBatchSize elements atomically
                const items = await valkey.lpopCount(
                    VALKEY_QUEUE_KEYS.IMPORT_BUFFER,
                    maxBatchSize,
                );

                if (items !== null && items.length > 0) {
                    for (const item of items) {
                        try {
                            const parsed: unknown = JSON.parse(String(item));
                            const result = zodImportRequest.safeParse(parsed);

                            if (result.success) {
                                batch.push(result.data);
                            } else {
                                log.warn(
                                    `[ImportBuffer] Skipping invalid Valkey item: ${result.error.message}`,
                                );
                                // Try to extract importSlugId to mark as failed
                                await tryMarkInvalidItemAsFailed(parsed);
                            }
                        } catch {
                            log.warn(
                                `[ImportBuffer] Skipping malformed JSON in Valkey`,
                            );
                            // Cannot extract importSlugId from malformed JSON
                            // Stale cleanup will eventually catch the orphaned DB record
                        }
                    }

                    log.info(
                        `[ImportBuffer] Popped ${String(items.length)} items from Valkey, ${String(batch.length)} valid`,
                    );
                }
            } catch (error) {
                log.error(
                    error,
                    "[ImportBuffer] Failed to pop items from Valkey",
                );
            }
        } else {
            // Use in-memory queue (not crash-safe)
            const itemCount = Math.min(inMemoryQueue.length, maxBatchSize);
            if (itemCount > 0) {
                batch.push(...inMemoryQueue.splice(0, itemCount));
                log.info(
                    `[ImportBuffer] Popped ${String(itemCount)} items from in-memory queue`,
                );
            }
        }

        if (batch.length === 0) {
            return;
        }

        log.info(`[ImportBuffer] Processing ${String(batch.length)} imports`);

        // Process imports in parallel with concurrency limit
        const importPromises = batch.map((request) =>
            limit(async () => {
                try {
                    await processImport(request);
                } catch (error) {
                    log.error(
                        error,
                        `[ImportBuffer] Error processing import ${request.importSlugId}`,
                    );
                }
            }),
        );

        await Promise.all(importPromises);

        log.info(`[ImportBuffer] Flush completed`);
    }

    /**
     * Add an import request to the buffer
     */
    async function addImport(request: ImportRequest): Promise<void> {
        if (isShuttingDown) {
            throw new Error(
                "[ImportBuffer] Cannot add imports during shutdown",
            );
        }

        // Push to Valkey list (FIFO queue) or in-memory queue
        if (valkey !== undefined) {
            await valkey.rpush(VALKEY_QUEUE_KEYS.IMPORT_BUFFER, [
                JSON.stringify(request),
            ]);
            log.info(
                `[ImportBuffer] Added ${request.type} import ${request.importSlugId} to Valkey queue`,
            );
        } else {
            // Use in-memory queue as fallback (not crash-safe)
            inMemoryQueue.push(request);
            log.info(
                `[ImportBuffer] Added ${request.type} import ${request.importSlugId} to in-memory queue`,
            );
        }
    }

    /**
     * Graceful shutdown - flush all pending imports
     */
    async function shutdown(): Promise<void> {
        isShuttingDown = true;
        log.info("[ImportBuffer] Shutting down...");

        // Stop the flush timer
        if (flushTimer !== undefined) {
            clearInterval(flushTimer);
            flushTimer = undefined;
        }

        // Final flush
        await flush();

        log.info("[ImportBuffer] Shutdown complete");
    }

    // Start the flush timer
    flushTimer = setInterval(() => {
        void flush();
    }, flushIntervalMs);

    // Prevent interval from keeping process alive
    flushTimer.unref();

    return {
        addImport,
        flush,
        shutdown,
    };
}
