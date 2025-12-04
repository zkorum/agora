/**
 * Import Buffer Service
 *
 * Batches CSV import requests to reduce system load and improve throughput.
 * Unlike exportBuffer, this is simplified - no cooldown periods, no S3 operations.
 *
 * Flow:
 * 1. Import request comes in via POST /import-csv
 * 2. Request is added to buffer (memory + optional Valkey persistence)
 * 3. Buffer flushes every 1 second
 * 4. Each import is processed: CSV parsing → conversation creation
 * 5. Status updated to 'completed' or 'failed'
 * 6. Notification sent to user
 */

import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import type { Redis as Valkey } from "ioredis";
import { conversationImportTable } from "@/shared-backend/schema.js";
import { eq } from "drizzle-orm";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
import { log } from "@/app.js";
import type { NotificationSSEManager } from "./notificationSSE.js";
import type { VoteBuffer } from "./voteBuffer.js";

/**
 * Structure of an import request in the buffer
 */
export interface ImportRequest {
    importSlugId: string;
    userId: string;
    files: Partial<Record<string, string>>; // CSV file contents
    formData: {
        postAsOrganization?: string;
        indexConversationAt?: string;
        isLoginRequired: boolean;
        isIndexed: boolean;
        requiresEventTicket?: string;
    };
    proof: string;
    didWrite: string;
    authorId: string;
}

/**
 * Import buffer instance
 */
export interface ImportBuffer {
    /**
     * Add an import request to the buffer
     */
    addImport: (request: ImportRequest) => Promise<void>;

    /**
     * Graceful shutdown - flush all pending imports
     */
    shutdown: () => Promise<void>;
}

interface ImportBufferDependencies {
    db: PostgresDatabase;
    valkey: Valkey | undefined;
    notificationSSEManager: NotificationSSEManager;
    voteBuffer: VoteBuffer;
    flushIntervalMs: number;
    maxBatchSize: number;
}

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
        flushIntervalMs,
        maxBatchSize,
    } = deps;

    // In-memory buffer
    const pendingImports = new Map<string, ImportRequest>();

    // Flush timer
    let flushTimer: NodeJS.Timeout | undefined;

    /**
     * Process a single import request
     */
    async function processImport(request: ImportRequest): Promise<void> {
        try {
            log.info(
                `[ImportBuffer] Processing import ${request.importSlugId}`,
            );

            // Import the conversation using csvImportService
            const { processCsvImport } = await import("./csvImport.js");

            const result = await processCsvImport({
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
                requiresEventTicket: request.formData.requiresEventTicket as
                    | "devconnect-2025"
                    | undefined,
            });

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
            const { createImportNotification } = await import(
                "./conversationImport/notifications.js"
            );
            await createImportNotification({
                db,
                userId: request.userId,
                importId,
                conversationId: result.conversationId,
                type: "import_completed",
                notificationSSEManager,
            });

            log.info(
                `[ImportBuffer] Import ${request.importSlugId} completed successfully`,
            );
        } catch (error) {
            // Update import status to failed
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

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
                    errorMessage,
                    updatedAt: new Date(),
                })
                .where(
                    eq(conversationImportTable.slugId, request.importSlugId),
                );

            // Send failure notification if import record exists
            if (importRecord.length > 0) {
                const importId = importRecord[0].id;
                const { createImportNotification } = await import(
                    "./conversationImport/notifications.js"
                );
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
                `[ImportBuffer] Import ${request.importSlugId} failed`,
            );
        }
    }

    /**
     * Flush pending imports from buffer
     */
    async function flush(): Promise<void> {
        if (pendingImports.size === 0) {
            return;
        }

        log.info(
            `[ImportBuffer] Flushing ${pendingImports.size} pending imports`,
        );

        // Take up to maxBatchSize imports
        const batch = Array.from(pendingImports.values()).slice(
            0,
            maxBatchSize,
        );

        // Remove from buffer
        for (const request of batch) {
            pendingImports.delete(request.importSlugId);
        }

        // Remove from Valkey if enabled
        if (valkey !== undefined) {
            const slugIds = batch.map((r) => r.importSlugId);
            if (slugIds.length > 0) {
                await valkey.hdel(VALKEY_QUEUE_KEYS.IMPORT_BUFFER, ...slugIds);
            }
        }

        // Process imports in parallel (they're independent operations)
        await Promise.allSettled(batch.map((req) => processImport(req)));

        log.info(`[ImportBuffer] Flush completed`);
    }

    /**
     * Start the periodic flush timer
     */
    function startFlushTimer(): void {
        flushTimer = setInterval(() => {
            void flush();
        }, flushIntervalMs);
    }

    /**
     * Add an import request to the buffer
     */
    async function addImport(request: ImportRequest): Promise<void> {
        // Add to in-memory buffer
        pendingImports.set(request.importSlugId, request);

        // Persist to Valkey if enabled
        if (valkey !== undefined) {
            await valkey.hset(
                VALKEY_QUEUE_KEYS.IMPORT_BUFFER,
                request.importSlugId,
                JSON.stringify(request),
            );
        }
    }

    /**
     * Graceful shutdown - flush all pending imports
     */
    async function shutdown(): Promise<void> {
        log.info("[ImportBuffer] Shutting down...");

        // Stop the flush timer
        if (flushTimer !== undefined) {
            clearInterval(flushTimer);
            flushTimer = undefined;
        }

        // Flush remaining imports
        await flush();

        log.info("[ImportBuffer] Shutdown complete");
    }

    // Start the flush timer on creation
    startFlushTimer();

    return {
        addImport,
        shutdown,
    };
}
