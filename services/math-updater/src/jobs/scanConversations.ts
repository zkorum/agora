import { log } from "@/app.js";
import { conversationTable } from "@/shared-backend/schema.js";
import { and, eq, or, isNull, lt, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type PgBoss from "pg-boss";

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
        // Find conversations that need updates
        const conversations = await db
            .select({
                id: conversationTable.id,
                slugId: conversationTable.slugId,
                lastMathUpdateAt: conversationTable.lastMathUpdateAt,
                mathUpdateRequestedAt: conversationTable.mathUpdateRequestedAt,
            })
            .from(conversationTable)
            .where(
                and(
                    eq(conversationTable.needsMathUpdate, true),
                    // Rate limiting: at least minTimeBetweenUpdatesMs since last update
                    or(
                        isNull(conversationTable.lastMathUpdateAt),
                        lt(
                            conversationTable.lastMathUpdateAt,
                            sql`NOW() - INTERVAL '${sql.raw(minTimeBetweenUpdatesMs.toString())} milliseconds'`,
                        ),
                    ),
                ),
            );

        log.info(
            `[Scan] Found ${conversations.length} conversation(s) needing math updates`,
        );

        // Enqueue each conversation for processing
        for (const conversation of conversations) {
            await boss.send("update-conversation-math", {
                conversationId: conversation.id,
                conversationSlugId: conversation.slugId,
                mathUpdateRequestedAt: conversation.mathUpdateRequestedAt,
            });

            log.debug(
                `[Scan] Enqueued conversation ${conversation.slugId} (id: ${conversation.id})`,
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
