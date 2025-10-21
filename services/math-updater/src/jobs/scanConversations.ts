import { log } from "@/app.js";
import {
    conversationTable,
    conversationUpdateQueueTable,
} from "@/shared-backend/schema.js";
import { and, eq, or, isNull, lt } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { nowZeroMs } from "@/shared/util.js";
import PgBoss from "pg-boss";

export const SCAN_CONVERSATIONS_SINGLETON_KEY = "scan-conversations-loop";

export interface ScanConversationsJobData {
    minTimeBetweenUpdatesMs: number;
    scanIntervalMs: number;
}

/**
 * Scan database for conversations that need math updates
 * and enqueue them for processing
 */
export async function scanConversationsJob(
    job: PgBoss.JobWithMetadata<ScanConversationsJobData>,
    db: PostgresJsDatabase,
    boss: PgBoss,
): Promise<void> {
    const { minTimeBetweenUpdatesMs, scanIntervalMs } = job.data;

    // Validate job data - reject malformed jobs from old versions
    if (!scanIntervalMs || !minTimeBetweenUpdatesMs) {
        log.warn(
            `[Scan] Skipping malformed job (job id: ${job.id}): missing scanIntervalMs or minTimeBetweenUpdatesMs`,
        );
        return; // Don't reschedule malformed jobs
    }

    log.info(
        `[Scan] Starting conversation scan... (job id: ${job.id}, singletonKey: ${job.singletonKey || "none"}, data: ${JSON.stringify(job.data)})`,
    );

    try {
        // Calculate cutoff time for rate limiting
        const now = nowZeroMs();
        const cutoffTime = new Date(now);
        cutoffTime.setMilliseconds(
            cutoffTime.getMilliseconds() - minTimeBetweenUpdatesMs,
        );

        // Find conversations that need updates from the queue table
        const queueEntries = await db
            .select({
                conversationId: conversationUpdateQueueTable.conversationId,
                requestedAt: conversationUpdateQueueTable.requestedAt,
            })
            .from(conversationUpdateQueueTable)
            .innerJoin(
                conversationTable,
                eq(
                    conversationUpdateQueueTable.conversationId,
                    conversationTable.id,
                ),
            )
            .where(
                and(
                    isNull(conversationUpdateQueueTable.processedAt),
                    // Rate limiting: at least minTimeBetweenUpdatesMs since last math update
                    // If never updated (NULL), allow immediate update
                    or(
                        isNull(conversationUpdateQueueTable.lastMathUpdateAt),
                        lt(
                            conversationUpdateQueueTable.lastMathUpdateAt,
                            cutoffTime,
                        ),
                    ),
                ),
            );

        log.info(
            `[Scan] Found ${queueEntries.length} conversation(s) needing math updates`,
        );

        // Enqueue each conversation for processing
        for (const entry of queueEntries) {
            // Get conversation slug for logging
            const convResult = await db
                .select({ slugId: conversationTable.slugId })
                .from(conversationTable)
                .where(eq(conversationTable.id, entry.conversationId));

            const conversationSlugId =
                convResult[0]?.slugId || `id-${entry.conversationId}`;

            await boss.send(
                "update-conversation-math",
                {
                    conversationId: entry.conversationId,
                    conversationSlugId: conversationSlugId,
                    requestedAt: entry.requestedAt, // Pass captured requestedAt for race-condition-safe update
                },
                {
                    // Use singletonKey to prevent duplicate jobs for the same conversation
                    // Queue uses 'singleton' policy: only 1 job per singletonKey (created OR active)
                    // This prevents any concurrent execution or duplicate jobs for the same conversation
                    // Multiple different conversations can still be processed in parallel
                    singletonKey: `update-math-${entry.conversationId}`,
                    // Rate limiting is handled by the scan query (minTimeBetweenUpdatesMs)
                },
            );

            log.debug(
                `[Scan] Enqueued conversation ${conversationSlugId} (id: ${entry.conversationId})`,
            );
        }

        log.info("[Scan] Scan complete");
    } catch (error) {
        log.error({ error }, "[Scan] Error during conversation scan");
        // Don't throw - we'll reschedule in finally block
    } finally {
        // Always reschedule next scan, even if there was an error
        // This ensures the scan loop continues
        try {
            const delaySeconds = scanIntervalMs / 1000;
            log.info(
                `[Scan] Rescheduling next scan: scanIntervalMs=${scanIntervalMs}, delaySeconds=${delaySeconds}`,
            );
            await boss.send(
                "scan-conversations",
                {
                    minTimeBetweenUpdatesMs,
                    scanIntervalMs,
                },
                {
                    startAfter: delaySeconds, // Convert ms to seconds for pg-boss
                    singletonKey: SCAN_CONVERSATIONS_SINGLETON_KEY, // Prevent duplicate loops
                },
            );
            log.info(
                `[Scan] Scheduled next scan in ${scanIntervalMs}ms (${delaySeconds}s)`,
            );
        } catch (scheduleError) {
            log.error(
                { error: scheduleError },
                "[Scan] Failed to schedule next scan - loop may be broken!",
            );
        }
    }
}
