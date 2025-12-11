import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, desc, inArray } from "drizzle-orm";
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

export interface BufferedExport {
    userId: string;
    conversationId: number;
    conversationSlugId: string;
    timestamp: Date;
}

export interface ExportBuffer {
    add: (params: { exportRequest: BufferedExport }) => Promise<
        | {
              exportSlugId: string;
              status: "queued";
          }
        | {
              status: "cooldown_active";
              cooldownEndsAt: Date;
          }
    >;
    flush: () => Promise<void>;
    shutdown: () => Promise<void>;
    getBufferSize: () => number;
}

interface CreateExportBufferParams {
    db: PostgresJsDatabase;
    valkey?: Valkey;
    notificationSSEManager?: NotificationSSEManager;
    flushIntervalMs?: number;
    maxBatchSize?: number;
    maxTotalBatchSize?: number;
    cooldownSeconds?: number;
    exportExpiryDays?: number;
}

/**
 * Create export buffer with encapsulated state
 *
 * Architecture:
 * - In-memory mode: Fastest, but lost on restart (single instance)
 * - Valkey mode: Persistent, works across instances (production)
 *
 * Batching reduces export processing frequency and enables smart filtering:
 * - Deduplication: Only keep latest request per conversation
 * - Cooldown: Skip conversations exported recently
 * - Error isolation: Individual export failures don't affect batch
 *
 * Pattern: Closure-based immutable API (matching voteBuffer.ts)
 */
export function createExportBuffer({
    db,
    valkey = undefined,
    notificationSSEManager = undefined,
    flushIntervalMs = 1000,
    maxBatchSize = 100,
    maxTotalBatchSize = 1000,
    cooldownSeconds = 300,
    exportExpiryDays = 30,
}: CreateExportBufferParams): ExportBuffer {
    // Encapsulated mutable state (private to closure)
    const pendingExports = new Map<number, BufferedExport>(); // Key: conversationId
    let isShuttingDown = false;

    // Helper function (pure)
    const getExportKey = (conversationId: number): number => conversationId;

    /**
     * Add export request to buffer (or update existing buffered request)
     * Last write wins for requests within the same flush interval
     */
    const add = async ({
        exportRequest,
    }: {
        exportRequest: BufferedExport;
    }): Promise<
        | {
              exportSlugId: string;
              status: "queued";
          }
        | {
              status: "cooldown_active";
              cooldownEndsAt: Date;
          }
    > => {
        if (isShuttingDown) {
            throw new Error(
                "[ExportBuffer] Cannot add exports during shutdown",
            );
        }

        // Pre-validation: Check conversation exists and has opinions
        const conversation = await db
            .select({ id: conversationTable.id })
            .from(conversationTable)
            .where(
                eq(conversationTable.slugId, exportRequest.conversationSlugId),
            )
            .limit(1);

        if (conversation.length === 0) {
            throw new Error("Conversation not found");
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
            throw new Error("Cannot export conversation with no opinions");
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

        const key = getExportKey(exportRequest.conversationId);

        // In-memory: Deduplicate by conversationId (last write wins)
        const wasExisting = pendingExports.has(key);
        pendingExports.set(key, exportRequest);

        // Valkey: Add to queue (if configured)
        if (valkey !== undefined) {
            valkey
                .rpush(
                    VALKEY_QUEUE_KEYS.EXPORT_BUFFER,
                    JSON.stringify({
                        ...exportRequest,
                        exportSlugId,
                    }),
                )
                .catch((error: unknown) => {
                    log.error(
                        error,
                        "[ExportBuffer] Failed to push export to Valkey buffer",
                    );
                });
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
            exportSlugId,
            status: "queued",
        };
    };

    /**
     * Flush all buffered exports to database
     * Checks cooldown and processes exports in batch
     */
    const flush = async (): Promise<void> => {
        // Get exports from in-memory buffer
        let batch = Array.from(pendingExports.values());
        pendingExports.clear();

        // Get exports from Valkey (if configured)
        if (valkey !== undefined) {
            try {
                const valkeyExports = await valkey.lrange(
                    VALKEY_QUEUE_KEYS.EXPORT_BUFFER,
                    0,
                    -1,
                );
                await valkey.del(VALKEY_QUEUE_KEYS.EXPORT_BUFFER);

                const parsedValkeyExports = valkeyExports.map(
                    (v: string) =>
                        JSON.parse(v) as BufferedExport & {
                            exportSlugId: string;
                        },
                );

                // Merge with in-memory exports (deduplicate by conversationId, last write wins)
                const exportMap = new Map(
                    batch.map((e) => [getExportKey(e.conversationId), e]),
                );

                for (const valkeyExport of parsedValkeyExports) {
                    const key = getExportKey(valkeyExport.conversationId);
                    const existing = exportMap.get(key);
                    if (
                        !existing ||
                        new Date(valkeyExport.timestamp) >
                            new Date(existing.timestamp)
                    ) {
                        exportMap.set(key, valkeyExport);
                    }
                }

                batch = Array.from(exportMap.values());
            } catch (error: unknown) {
                log.error(
                    error,
                    "[ExportBuffer] Failed to fetch exports from Valkey",
                );
            }
        }

        // Cap total batch size to prevent system overload
        if (batch.length > maxTotalBatchSize) {
            log.warn(
                `[ExportBuffer] Batch size (${String(batch.length)}) exceeds limit (${String(maxTotalBatchSize)}), truncating`,
            );
            batch = batch.slice(0, maxTotalBatchSize);
        }

        if (batch.length === 0) {
            return;
        }

        log.info(`[ExportBuffer] Flushing ${String(batch.length)} exports`);

        // Split into sub-batches to avoid overwhelming the system
        const batches: BufferedExport[][] = [];
        for (let i = 0; i < batch.length; i += maxBatchSize) {
            batches.push(batch.slice(i, i + maxBatchSize));
        }

        log.info(
            `[ExportBuffer] Processing ${String(batch.length)} exports in ${String(batches.length)} batch(es)`,
        );

        try {
            for (const [batchIndex, exportBatch] of batches.entries()) {
                log.info(
                    `[ExportBuffer] Processing batch ${String(batchIndex + 1)}/${String(batches.length)} with ${String(exportBatch.length)} exports`,
                );

                // Check cooldown for all conversations in batch (single query)
                const conversationIds = exportBatch.map(
                    (e) => e.conversationId,
                );
                const now = nowZeroMs();
                const cooldownTime = new Date(
                    now.getTime() - cooldownSeconds * 1000,
                );

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
                const exportsToProcess: BufferedExport[] = [];
                const exportsToCancelCooldown: BufferedExport[] = [];

                for (const exportRequest of exportBatch) {
                    const lastExportTime = lastExportMap.get(
                        exportRequest.conversationId,
                    );
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
                        // Find the export record
                        const exportRecords = await db
                            .select({
                                id: conversationExportTable.id,
                                slugId: conversationExportTable.slugId,
                            })
                            .from(conversationExportTable)
                            .where(
                                and(
                                    eq(
                                        conversationExportTable.conversationId,
                                        exportRequest.conversationId,
                                    ),
                                    eq(
                                        conversationExportTable.userId,
                                        exportRequest.userId,
                                    ),
                                    eq(
                                        conversationExportTable.status,
                                        "processing",
                                    ),
                                ),
                            )
                            .orderBy(desc(conversationExportTable.createdAt))
                            .limit(1);

                        if (exportRecords.length > 0) {
                            const exportRecord = exportRecords[0];

                            // Update status to cancelled
                            await db
                                .update(conversationExportTable)
                                .set({
                                    status: "cancelled",
                                    cancellationReason: "cooldown_active",
                                    updatedAt: now,
                                })
                                .where(
                                    eq(
                                        conversationExportTable.id,
                                        exportRecord.id,
                                    ),
                                );

                            // Create notification
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
                    } catch (error: unknown) {
                        log.error(
                            `[ExportBuffer] Error cancelling export for conversation ${String(exportRequest.conversationId)}:`,
                            error,
                        );
                    }
                }

                // Process remaining exports in parallel with error isolation
                const results = await Promise.allSettled(
                    exportsToProcess.map((exportRequest) =>
                        processConversationExport({
                            db,
                            conversationId: exportRequest.conversationId,
                            conversationSlugId:
                                exportRequest.conversationSlugId,
                            userId: exportRequest.userId,
                            notificationSSEManager,
                        }),
                    ),
                );

                // Log results
                let successCount = 0;
                let failureCount = 0;

                for (const [index, result] of results.entries()) {
                    const exportRequest = exportsToProcess[index];
                    if (result.status === "fulfilled") {
                        successCount++;
                        log.info(
                            `[ExportBuffer] Successfully processed export for conversation ${String(exportRequest.conversationId)}`,
                        );
                    } else {
                        failureCount++;
                        log.error(
                            `[ExportBuffer] Failed to process export for conversation ${String(exportRequest.conversationId)}:`,
                            result.reason,
                        );
                    }
                }

                log.info(
                    `[ExportBuffer] Batch ${String(batchIndex + 1)}/${String(batches.length)} completed: ${String(successCount)} succeeded, ${String(failureCount)} failed, ${String(exportsToCancelCooldown.length)} cancelled`,
                );
            }

            log.info(
                `[ExportBuffer] Successfully flushed ${String(batch.length)} exports across ${String(batches.length)} batch(es)`,
            );
        } catch (error: unknown) {
            log.error(error, "[ExportBuffer] Failed to flush exports");

            // Re-add failed exports to buffer for retry
            const failedExportsByKey = new Map<number, BufferedExport>();

            for (const exportRequest of batch) {
                const key = getExportKey(exportRequest.conversationId);
                const existing = failedExportsByKey.get(key);

                if (
                    !existing ||
                    new Date(exportRequest.timestamp) >
                        new Date(existing.timestamp)
                ) {
                    failedExportsByKey.set(key, exportRequest);
                }
            }

            // Merge failed exports back into buffer
            for (const [key, failedExport] of failedExportsByKey) {
                const bufferedExport = pendingExports.get(key);

                if (
                    !bufferedExport ||
                    new Date(failedExport.timestamp) >
                        new Date(bufferedExport.timestamp)
                ) {
                    pendingExports.set(key, failedExport);
                }
            }

            log.info(
                `[ExportBuffer] Re-added ${String(failedExportsByKey.size)} failed exports to buffer`,
            );

            throw error;
        }
    };

    /**
     * Graceful shutdown: flush pending exports before exiting
     */
    const shutdown = async (): Promise<void> => {
        isShuttingDown = true;

        log.info("[ExportBuffer] Shutting down, flushing pending exports...");

        clearInterval(flushInterval);

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
    const flushInterval: NodeJS.Timeout = setInterval(() => {
        flush().catch((error: unknown) => {
            log.error(error, "[ExportBuffer] Flush interval error");
        });
    }, flushIntervalMs);

    // Prevent interval from keeping process alive (Node.js specific)
    flushInterval.unref();

    // Return immutable API (matching voteBuffer pattern)
    return {
        add,
        flush,
        shutdown,
        getBufferSize,
    };
}
