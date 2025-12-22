/**
 * Export Buffer Service
 *
 * Batches conversation export requests to reduce system load and improve throughput.
 *
 * Architecture:
 * - Uses Valkey Hash for deduplication by conversationId:userId
 * - At-most-once delivery: items are popped before processing
 * - Orphaned "processing" records are cleaned up periodically via stale cleanup
 *
 * Flow:
 * 1. API creates DB record with status "processing" (source of truth)
 * 2. API adds request to Valkey hash (HSET)
 * 3. Flush interval pops items via Lua script (HSCAN + HDEL) for at-most-once
 * 4. Status updated to 'completed' or 'failed', notification sent
 * 5. If crash before completion, stale cleanup marks DB record as failed + notifies
 *
 * Why at-most-once:
 * - Exports generate S3 files - duplicate processing would waste resources
 * - User can manually retry if export fails
 * - 5-minute stale timeout ensures users get notified of failures quickly
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, desc, inArray, lt } from "drizzle-orm";
import {
    conversationExportTable,
    conversationTable,
    opinionTable,
    opinionModerationTable,
} from "@/shared-backend/schema.js";
import { log } from "@/app.js";
import { nowZeroMs } from "@/shared/util.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
import { generateRandomSlugId } from "@/crypto.js";
import { count, or, isNull, ne } from "drizzle-orm";
import { processConversationExport } from "./conversationExport/core.js";
import { createExportNotification } from "./conversationExport/notifications.js";
import type { NotificationSSEManager } from "./notificationSSE.js";
import type { RequestConversationExportResponse } from "@/shared/types/dto.js";
import { z } from "zod";
import { Script } from "@valkey/valkey-glide";
import pLimit from "p-limit";

// ============================================================================
// Zod Schemas for Valkey Data Validation
// ============================================================================

const zodBufferedExport = z.object({
    userId: z.string(),
    conversationId: z.number(),
    conversationSlugId: z.string(),
    exportSlugId: z.string(),
    timestamp: z.string(), // ISO date string from JSON
});

type BufferedExportFromValkey = z.infer<typeof zodBufferedExport>;

// ============================================================================
// Types
// ============================================================================

export interface BufferedExport {
    userId: string;
    conversationId: number;
    conversationSlugId: string;
    timestamp: Date;
}

// Re-export for external use - type derived from DTO zod schema
export type ExportAddResult = RequestConversationExportResponse;

export interface ExportBuffer {
    add: (params: { exportRequest: BufferedExport }) => Promise<ExportAddResult>;
    flush: () => Promise<void>;
    shutdown: () => Promise<void>;
    getBufferSize: () => number;
}

interface CreateExportBufferParams {
    db: PostgresJsDatabase;
    valkey: Valkey | undefined;
    notificationSSEManager: NotificationSSEManager | undefined;
    flushIntervalMs: number;
    maxBatchSize: number;
    maxConcurrency: number;
    cooldownSeconds: number;
    exportExpiryDays: number;
    staleThresholdMs: number;
    staleCleanupEveryNFlushes: number;
}

// ============================================================================
// Lua Script for atomic HSCAN + HDEL
// ============================================================================

/**
 * Lua script that atomically scans and deletes up to N entries from a hash.
 * Returns array of [field, value, field, value, ...] pairs.
 *
 * KEYS[1] = hash key
 * ARGV[1] = max count to retrieve
 *
 * Why HSCAN instead of HGETALL:
 * - HSCAN is O(1) per iteration, HGETALL is O(N) for entire hash
 * - HSCAN allows configurable batch size to limit memory usage
 * - Handles large hashes without blocking Valkey
 *
 * Why atomic HSCAN + HDEL:
 * - At-most-once delivery: items are removed before processing
 * - No duplicate processing even if flush crashes mid-way
 * - Orphaned DB records are cleaned up by stale cleanup job
 */
export const HSCAN_AND_DELETE_SCRIPT = `
local key = KEYS[1]
local max_count = tonumber(ARGV[1])

-- Scan the hash to get field-value pairs
local cursor = "0"
local result = {}
local count = 0

repeat
    local scan_result = redis.call('HSCAN', key, cursor, 'COUNT', max_count)
    cursor = scan_result[1]
    local entries = scan_result[2]

    for i = 1, #entries, 2 do
        if count >= max_count then
            break
        end
        local field = entries[i]
        local value = entries[i + 1]
        table.insert(result, field)
        table.insert(result, value)
        count = count + 1
    end
until cursor == "0" or count >= max_count

-- Delete the fields we just retrieved
local fields_to_delete = {}
for i = 1, #result, 2 do
    table.insert(fields_to_delete, result[i])
end

if #fields_to_delete > 0 then
    redis.call('HDEL', key, unpack(fields_to_delete))
end

return result
`;

// ============================================================================
// Export Buffer Implementation
// ============================================================================

/**
 * Create export buffer with encapsulated state
 *
 * Architecture:
 * - In-memory mode: Fastest, but lost on restart (single instance)
 * - Valkey mode: Persistent, works across instances (production)
 *
 * Batching reduces export processing frequency and enables smart filtering:
 * - Deduplication: Only keep latest request per conversation+user
 * - Cooldown: Skip conversations exported recently
 * - Error isolation: Individual export failures don't affect batch
 *
 * Pattern: Closure-based immutable API (matching voteBuffer.ts)
 */
export function createExportBuffer({
    db,
    valkey,
    notificationSSEManager,
    flushIntervalMs,
    maxBatchSize,
    maxConcurrency,
    cooldownSeconds,
    exportExpiryDays,
    staleThresholdMs,
    staleCleanupEveryNFlushes,
}: CreateExportBufferParams): ExportBuffer {
    // Encapsulated mutable state (private to closure)
    const pendingExports = new Map<string, BufferedExport & { exportSlugId: string }>(); // Key: conversationId:userId
    let isShuttingDown = false;
    let flushCount = 0;
    let flushTimer: NodeJS.Timeout | undefined;

    // Create concurrency limiter for parallel export processing
    const limit = pLimit(maxConcurrency);

    // Pre-compile the Lua script for reuse
    const hscanAndDeleteScript = new Script(HSCAN_AND_DELETE_SCRIPT);

    // Helper function to generate hash key
    const getExportKey = (conversationId: number, userId: string): string =>
        `${String(conversationId)}:${userId}`;

    /**
     * Try to mark an invalid Valkey item as failed in the database.
     * Attempts to extract exportSlugId from partially valid data.
     */
    async function tryMarkInvalidItemAsFailed(parsed: unknown): Promise<void> {
        const minimalSchema = z.object({
            exportSlugId: z.string(),
            userId: z.string(),
            conversationId: z.number(),
        });

        const result = minimalSchema.safeParse(parsed);
        if (!result.success) {
            log.warn(
                "[ExportBuffer] Cannot extract exportSlugId/userId from invalid item",
            );
            return;
        }

        const { exportSlugId, userId, conversationId } = result.data;

        try {
            const exportRecord = await db
                .select({ id: conversationExportTable.id })
                .from(conversationExportTable)
                .where(eq(conversationExportTable.slugId, exportSlugId))
                .limit(1);

            if (exportRecord.length === 0) {
                log.warn(
                    `[ExportBuffer] Export record not found for invalid item: ${exportSlugId}`,
                );
                return;
            }

            await db
                .update(conversationExportTable)
                .set({
                    status: "failed",
                    failureReason: "processing_error",
                    updatedAt: new Date(),
                })
                .where(eq(conversationExportTable.slugId, exportSlugId));

            await createExportNotification({
                db,
                userId,
                exportId: exportRecord[0].id,
                conversationId,
                type: "export_failed",
                notificationSSEManager,
            });

            log.info(
                `[ExportBuffer] Marked invalid export ${exportSlugId} as failed`,
            );
        } catch (error) {
            log.error(
                error,
                `[ExportBuffer] Failed to mark invalid export ${exportSlugId} as failed`,
            );
        }
    }

    /**
     * Cleanup stale exports and send notifications
     * Stale = "processing" status for longer than staleThresholdMs
     */
    async function cleanupStaleExportsWithNotifications(): Promise<void> {
        const staleTimestamp = new Date(Date.now() - staleThresholdMs);

        const staleExports = await db
            .select({
                id: conversationExportTable.id,
                slugId: conversationExportTable.slugId,
                userId: conversationExportTable.userId,
                conversationId: conversationExportTable.conversationId,
            })
            .from(conversationExportTable)
            .where(
                and(
                    eq(conversationExportTable.status, "processing"),
                    lt(conversationExportTable.updatedAt, staleTimestamp),
                ),
            );

        if (staleExports.length === 0) {
            return;
        }

        await db
            .update(conversationExportTable)
            .set({
                status: "failed",
                failureReason: "timeout",
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(conversationExportTable.status, "processing"),
                    lt(conversationExportTable.updatedAt, staleTimestamp),
                ),
            );

        log.info(
            `[ExportBuffer] Cleaned up ${String(staleExports.length)} stale exports`,
        );

        for (const staleExport of staleExports) {
            try {
                await createExportNotification({
                    db,
                    userId: staleExport.userId,
                    exportId: staleExport.id,
                    conversationId: staleExport.conversationId,
                    type: "export_failed",
                    notificationSSEManager,
                });
            } catch (notificationError) {
                log.error(
                    notificationError,
                    `[ExportBuffer] Failed to send stale notification for export ${staleExport.slugId}`,
                );
            }
        }
    }

    /**
     * Add export request to buffer (or update existing buffered request)
     * Returns success/failure with proper discriminated union
     */
    const add = async ({
        exportRequest,
    }: {
        exportRequest: BufferedExport;
    }): Promise<ExportAddResult> => {
        if (isShuttingDown) {
            throw new Error(
                "[ExportBuffer] Cannot add exports during shutdown",
            );
        }

        // Pre-validation: Check conversation exists
        const conversation = await db
            .select({ id: conversationTable.id })
            .from(conversationTable)
            .where(
                eq(conversationTable.slugId, exportRequest.conversationSlugId),
            )
            .limit(1);

        if (conversation.length === 0) {
            return { success: false, reason: "conversation_not_found" };
        }

        // Check if user already has an active export for this conversation
        const activeExport = await db
            .select({
                slugId: conversationExportTable.slugId,
                createdAt: conversationExportTable.createdAt,
            })
            .from(conversationExportTable)
            .where(
                and(
                    eq(
                        conversationExportTable.conversationId,
                        exportRequest.conversationId,
                    ),
                    eq(conversationExportTable.userId, exportRequest.userId),
                    eq(conversationExportTable.status, "processing"),
                    eq(conversationExportTable.isDeleted, false),
                ),
            )
            .orderBy(desc(conversationExportTable.createdAt))
            .limit(1);

        if (activeExport.length > 0) {
            return { success: false, reason: "active_export_in_progress" };
        }

        // Check cooldown BEFORE creating export record
        const nowTime = nowZeroMs();
        const cooldownTime = new Date(
            nowTime.getTime() - cooldownSeconds * 1000,
        );

        const lastExport = await db
            .select({ createdAt: conversationExportTable.createdAt })
            .from(conversationExportTable)
            .where(
                and(
                    eq(
                        conversationExportTable.conversationId,
                        exportRequest.conversationId,
                    ),
                    eq(conversationExportTable.status, "completed"),
                    eq(conversationExportTable.isDeleted, false),
                ),
            )
            .orderBy(desc(conversationExportTable.createdAt))
            .limit(1);

        if (lastExport.length > 0 && lastExport[0].createdAt > cooldownTime) {
            const cooldownEndsAt = new Date(
                lastExport[0].createdAt.getTime() + cooldownSeconds * 1000,
            );
            log.info(
                `[ExportBuffer] Cooldown active for conversation ${String(exportRequest.conversationId)} (ends at ${cooldownEndsAt.toISOString()})`,
            );
            return {
                success: true,
                status: "cooldown_active",
                cooldownEndsAt,
            };
        }

        // Check if conversation has any opinions (excluding moderated "move")
        const [{ count: opinionCount }] = await db
            .select({ count: count() })
            .from(opinionTable)
            .leftJoin(
                opinionModerationTable,
                eq(opinionTable.id, opinionModerationTable.opinionId),
            )
            .where(
                and(
                    eq(
                        opinionTable.conversationId,
                        exportRequest.conversationId,
                    ),
                    or(
                        isNull(opinionModerationTable.moderationAction),
                        ne(opinionModerationTable.moderationAction, "move"),
                    ),
                ),
            );

        if (opinionCount === 0) {
            return { success: false, reason: "no_opinions" };
        }

        // Create export record immediately with "processing" status
        const createdAt = new Date();
        const expiresAt = new Date(
            createdAt.getTime() + exportExpiryDays * 24 * 60 * 60 * 1000,
        );

        const exportSlugId = generateRandomSlugId();

        const [exportRecord] = await db
            .insert(conversationExportTable)
            .values({
                slugId: exportSlugId,
                conversationId: exportRequest.conversationId,
                userId: exportRequest.userId,
                status: "processing",
                expiresAt: expiresAt,
            })
            .returning({ id: conversationExportTable.id });

        // Create notification for export start
        await createExportNotification({
            db,
            userId: exportRequest.userId,
            exportId: exportRecord.id,
            conversationId: exportRequest.conversationId,
            type: "export_started",
            notificationSSEManager,
        });

        const key = getExportKey(
            exportRequest.conversationId,
            exportRequest.userId,
        );

        // In-memory: Deduplicate by conversationId:userId (last write wins)
        const wasExisting = pendingExports.has(key);
        pendingExports.set(key, { ...exportRequest, exportSlugId });

        // Valkey: Add to hash (if configured)
        if (valkey !== undefined) {
            try {
                await valkey.hset(VALKEY_QUEUE_KEYS.EXPORT_BUFFER, {
                    [key]: JSON.stringify({
                        ...exportRequest,
                        exportSlugId,
                        timestamp: exportRequest.timestamp.toISOString(),
                    }),
                });
            } catch (error) {
                log.error(
                    error,
                    "[ExportBuffer] Failed to push export to Valkey buffer",
                );
            }
        }

        // Log export addition/update
        if (wasExisting) {
            log.info(
                `[ExportBuffer] Updated buffered export for conversation ${String(exportRequest.conversationId)} (duplicate within flush window)`,
            );
        } else {
            log.info(
                `[ExportBuffer] Added export for conversation ${String(exportRequest.conversationId)} (buffer size: ${String(pendingExports.size)})`,
            );
        }

        return {
            success: true,
            status: "queued",
            exportSlugId,
        };
    };

    /**
     * Flush all buffered exports to database
     * Checks cooldown and processes exports in batch
     */
    const flush = async (): Promise<void> => {
        // Periodic stale cleanup
        flushCount++;
        if (flushCount % staleCleanupEveryNFlushes === 0) {
            try {
                await cleanupStaleExportsWithNotifications();
            } catch (error) {
                log.error(error, "[ExportBuffer] Stale cleanup failed");
            }
        }

        // Get exports from in-memory buffer
        let batch: (BufferedExport & { exportSlugId: string })[] = Array.from(
            pendingExports.values(),
        );
        pendingExports.clear();

        // Get exports from Valkey (if configured)
        if (valkey !== undefined) {
            try {
                // Use Lua script to atomically HSCAN + HDEL
                const result = await valkey.invokeScript(hscanAndDeleteScript, {
                    keys: [VALKEY_QUEUE_KEYS.EXPORT_BUFFER],
                    args: [String(maxBatchSize)],
                });

                // Result is [field, value, field, value, ...]
                if (Array.isArray(result) && result.length > 0) {
                    const valkeyExports: (BufferedExportFromValkey & { exportSlugId: string })[] = [];

                    for (let i = 1; i < result.length; i += 2) {
                        const value = result[i];
                        try {
                            // Value from Valkey hash should always be a string
                            if (typeof value !== "string") {
                                log.warn(
                                    `[ExportBuffer] Skipping non-string value from Valkey: ${typeof value}`,
                                );
                                continue;
                            }
                            const parsed: unknown = JSON.parse(value);
                            const parseResult = zodBufferedExport.safeParse(parsed);

                            if (parseResult.success) {
                                valkeyExports.push(parseResult.data);
                            } else {
                                log.warn(
                                    `[ExportBuffer] Skipping invalid Valkey item: ${parseResult.error.message}`,
                                );
                                await tryMarkInvalidItemAsFailed(parsed);
                            }
                        } catch {
                            log.warn(
                                "[ExportBuffer] Skipping malformed JSON in Valkey",
                            );
                        }
                    }

                    // Merge with in-memory exports (deduplicate by key, Valkey wins for fresher data)
                    const exportMap = new Map(
                        batch.map((e) => [
                            getExportKey(e.conversationId, e.userId),
                            e,
                        ]),
                    );

                    for (const valkeyExport of valkeyExports) {
                        const key = getExportKey(
                            valkeyExport.conversationId,
                            valkeyExport.userId,
                        );
                        const existing = exportMap.get(key);
                        const valkeyTimestamp = new Date(valkeyExport.timestamp);
                        if (
                            !existing ||
                            valkeyTimestamp > existing.timestamp
                        ) {
                            exportMap.set(key, {
                                ...valkeyExport,
                                timestamp: valkeyTimestamp,
                            });
                        }
                    }

                    batch = Array.from(exportMap.values());

                    log.info(
                        `[ExportBuffer] Popped ${String(valkeyExports.length)} items from Valkey, merged to ${String(batch.length)} total`,
                    );
                }
            } catch (error) {
                log.error(
                    error,
                    "[ExportBuffer] Failed to pop items from Valkey",
                );
            }
        }

        if (batch.length === 0) {
            return;
        }

        log.info(`[ExportBuffer] Processing ${String(batch.length)} exports`);

        // Check cooldown for all conversations in batch (single query)
        const conversationIds = batch.map((e) => e.conversationId);
        const now = nowZeroMs();
        const cooldownTime = new Date(now.getTime() - cooldownSeconds * 1000);

        const recentExports = await db
            .select({
                conversationId: conversationExportTable.conversationId,
                createdAt: conversationExportTable.createdAt,
            })
            .from(conversationExportTable)
            .where(
                and(
                    inArray(
                        conversationExportTable.conversationId,
                        conversationIds,
                    ),
                    eq(conversationExportTable.status, "completed"),
                    eq(conversationExportTable.isDeleted, false),
                ),
            )
            .orderBy(desc(conversationExportTable.createdAt));

        // Build map of conversationId -> lastExportTime
        const lastExportMap = new Map<number, Date>();
        for (const recentExport of recentExports) {
            if (!lastExportMap.has(recentExport.conversationId)) {
                lastExportMap.set(
                    recentExport.conversationId,
                    recentExport.createdAt,
                );
            }
        }

        // Filter exports based on cooldown
        const exportsToProcess: (BufferedExport & { exportSlugId: string })[] = [];
        const exportsToCancelCooldown: (BufferedExport & { exportSlugId: string })[] = [];

        for (const exportRequest of batch) {
            const lastExportTime = lastExportMap.get(exportRequest.conversationId);
            if (lastExportTime && lastExportTime > cooldownTime) {
                exportsToCancelCooldown.push(exportRequest);
                log.info(
                    `[ExportBuffer] Skipping export for conversation ${String(exportRequest.conversationId)} due to cooldown (last export: ${lastExportTime.toISOString()})`,
                );
            } else {
                exportsToProcess.push(exportRequest);
            }
        }

        // Cancel cooldown-filtered exports
        for (const exportRequest of exportsToCancelCooldown) {
            try {
                const exportRecords = await db
                    .select({
                        id: conversationExportTable.id,
                        slugId: conversationExportTable.slugId,
                    })
                    .from(conversationExportTable)
                    .where(eq(conversationExportTable.slugId, exportRequest.exportSlugId))
                    .limit(1);

                if (exportRecords.length > 0) {
                    const exportRecord = exportRecords[0];

                    await db
                        .update(conversationExportTable)
                        .set({
                            status: "cancelled",
                            cancellationReason: "cooldown_active",
                            updatedAt: now,
                        })
                        .where(eq(conversationExportTable.id, exportRecord.id));

                    await createExportNotification({
                        db,
                        userId: exportRequest.userId,
                        exportId: exportRecord.id,
                        conversationId: exportRequest.conversationId,
                        type: "export_cancelled",
                        notificationSSEManager,
                    });

                    log.info(
                        `[ExportBuffer] Cancelled export ${exportRecord.slugId} due to cooldown`,
                    );
                }
            } catch (error) {
                log.error(
                    error,
                    `[ExportBuffer] Error cancelling export for conversation ${String(exportRequest.conversationId)}`,
                );
            }
        }

        // Process remaining exports in parallel with concurrency limit
        // Each export handles its own errors internally (updates DB status, sends notification)
        const exportPromises = exportsToProcess.map((exportRequest) =>
            limit(async () => {
                try {
                    await processConversationExport({
                        db,
                        conversationId: exportRequest.conversationId,
                        conversationSlugId: exportRequest.conversationSlugId,
                        userId: exportRequest.userId,
                        notificationSSEManager,
                    });
                } catch (error) {
                    // Error already logged and handled in processConversationExport
                    log.error(
                        error,
                        `[ExportBuffer] Error processing export ${exportRequest.exportSlugId}`,
                    );
                }
            }),
        );

        await Promise.all(exportPromises);

        log.info(
            `[ExportBuffer] Flush completed: ${String(exportsToProcess.length)} processed, ${String(exportsToCancelCooldown.length)} cancelled`,
        );
    };

    /**
     * Graceful shutdown: flush pending exports before exiting
     */
    const shutdown = async (): Promise<void> => {
        isShuttingDown = true;

        log.info("[ExportBuffer] Shutting down, flushing pending exports...");

        if (flushTimer !== undefined) {
            clearInterval(flushTimer);
            flushTimer = undefined;
        }

        await flush();

        log.info("[ExportBuffer] Shutdown complete");
    };

    /**
     * Get current buffer size (for monitoring)
     */
    const getBufferSize = (): number => {
        return pendingExports.size;
    };

    // Start automatic flush interval
    flushTimer = setInterval(() => {
        flush().catch((error: unknown) => {
            log.error(error, "[ExportBuffer] Flush interval error");
        });
    }, flushIntervalMs);

    // Prevent interval from keeping process alive (Node.js specific)
    flushTimer.unref();

    // Return immutable API (matching voteBuffer pattern)
    return {
        add,
        flush,
        shutdown,
        getBufferSize,
    };
}
