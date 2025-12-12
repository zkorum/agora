import { log } from "@/app.js";
import {
    conversationTable,
    conversationUpdateQueueTable,
} from "@/shared-backend/schema.js";
import { and, eq, or, isNull, lt, gt, sql } from "drizzle-orm";
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
        // New logic: Use requestedAt > lastMathUpdateAt to determine if processing is needed
        // This prevents race conditions since lastMathUpdateAt is only touched by math-updater
        const queueEntries = await db
            .select({
                conversationId: conversationUpdateQueueTable.conversationId,
                requestedAt: conversationUpdateQueueTable.requestedAt,
                slugId: conversationTable.slugId,
                voteCount: conversationTable.voteCount,
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
                    // Condition 0: Exclude conversations still being imported
                    // These have isImporting=true until all data is inserted
                    eq(conversationTable.isImporting, false),
                    // Condition 1: New data arrived since last math update
                    // (or never processed)
                    or(
                        isNull(conversationUpdateQueueTable.lastMathUpdateAt),
                        gt(
                            conversationUpdateQueueTable.requestedAt,
                            conversationUpdateQueueTable.lastMathUpdateAt,
                        ),
                    ),
                    // Condition 2: Rate limiting - at least minTimeBetweenUpdatesMs since last update
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

        // Log conversations that need updates with their slugIds
        const conversationSlugs = queueEntries.map(
            (entry) => entry.slugId || `id-${entry.conversationId}`,
        );
        log.info(
            `[Scan] Found ${queueEntries.length} conversation(s) needing math updates: [${conversationSlugs.join(", ")}]`,
        );

        // Track which conversations are actually enqueued (not rejected by singleton)
        const enqueuedConversations: string[] = [];
        const rejectedConversations: string[] = [];

        // Enqueue each conversation for processing
        for (const entry of queueEntries) {
            const conversationSlugId =
                entry.slugId || `id-${entry.conversationId}`;

            // Calculate dynamic singletonSeconds based on conversation size
            // Prevents duplicate jobs while conversation is processing
            const voteCount = entry.voteCount || 0;
            let singletonSeconds: number;
            if (voteCount < 100) {
                singletonSeconds = 15; // Small conversations: 15s
            } else if (voteCount < 10000) {
                singletonSeconds = 30; // Medium conversations: 30s
            } else if (voteCount < 100000) {
                singletonSeconds = 60; // Large conversations: 60s
            } else {
                singletonSeconds = 120; // Huge conversations: 120s
            }

            // Send job with singletonKey to prevent duplicates
            const jobId = await boss.send(
                "update-conversation-math",
                {
                    conversationId: entry.conversationId,
                    conversationSlugId: conversationSlugId,
                    requestedAt: entry.requestedAt,
                },
                {
                    // Use singletonKey to prevent duplicate jobs for the same conversation
                    // Queue has 'singleton' policy: only 1 job per singletonKey (created OR active)
                    // This prevents concurrent execution and duplicate jobs for the same conversation
                    // Multiple different conversations can still be processed in parallel
                    singletonKey: `update-math-${entry.conversationId}`,
                    // Dynamic singletonSeconds: how long to keep rejecting duplicate job submissions
                    // 15s-120s based on conversation size (prevents overwhelming Python service)
                    singletonSeconds: singletonSeconds,
                },
            );

            if (jobId) {
                enqueuedConversations.push(conversationSlugId);
                log.info(
                    `[Scan] Enqueued conversation ${conversationSlugId} (id: ${entry.conversationId}, votes: ${voteCount}, singleton: ${singletonSeconds}s, job: ${jobId})`,
                );
            } else {
                rejectedConversations.push(conversationSlugId);

                // When jobId is null, it means pg-boss rejected due to singleton constraint
                // Query the existing job to understand its state
                const singletonKey = `update-math-${entry.conversationId}`;

                try {
                    // Query pg-boss tables directly to find the blocking job
                    const result = await db.execute<{
                        state: string;
                        created_on: string;
                        started_on: string | null;
                        completed_on: string | null;
                        keep_until: string;
                    }>(sql`
                        SELECT state, created_on, started_on, completed_on, keep_until
                        FROM pgboss.job
                        WHERE name = 'update-conversation-math'
                        AND singleton_key = ${singletonKey}
                        AND keep_until > NOW()
                        ORDER BY created_on DESC
                        LIMIT 1
                    `);

                    if (result.length > 0) {
                        const job = result[0];
                        const createdAt = new Date(job.created_on);
                        const ageMs = Date.now() - createdAt.getTime();
                        const ageSeconds = (ageMs / 1000).toFixed(1);

                        let reason = "";
                        let timing = "";

                        if (job.state === "active") {
                            if (job.started_on) {
                                const startedAt = new Date(job.started_on);
                                const runningMs =
                                    Date.now() - startedAt.getTime();
                                timing = `running for ${(runningMs / 1000).toFixed(1)}s`;
                            } else {
                                timing = `marked active but started_on is null`;
                            }
                            reason = `job RUNNING (${timing})`;
                        } else if (job.state === "created") {
                            timing = `queued for ${ageSeconds}s`;
                            reason = `job QUEUED (${timing}, waiting to start)`;
                        } else if (job.state === "completed") {
                            if (job.completed_on) {
                                const completedAt = new Date(job.completed_on);
                                const completedMs =
                                    Date.now() - completedAt.getTime();
                                timing = `completed ${(completedMs / 1000).toFixed(1)}s ago`;
                            } else {
                                timing = `completed but completed_on is null`;
                            }
                            reason = `job COMPLETED (${timing}, still in ${singletonSeconds}s window)`;
                        } else {
                            reason = `job in state '${job.state}' (age: ${ageSeconds}s)`;
                        }

                        log.info(
                            `[Scan] Skipped ${conversationSlugId} - ${reason}`,
                        );
                    } else {
                        // This shouldn't happen but log it if it does
                        log.warn(
                            `[Scan] Skipped ${conversationSlugId} - singleton rejected but no matching job found in pgboss.job (singletonKey: ${singletonKey})`,
                        );
                    }
                } catch (queryError) {
                    log.error(
                        { error: queryError },
                        `[Scan] Skipped ${conversationSlugId} - singleton rejected but failed to query job state`,
                    );
                }
            }
        }

        // Summary of what was actually enqueued vs rejected
        if (enqueuedConversations.length > 0) {
            log.info(
                `[Scan] Successfully enqueued ${enqueuedConversations.length} conversation(s): [${enqueuedConversations.join(", ")}]`,
            );
        }
        if (rejectedConversations.length > 0) {
            log.info(
                `[Scan] Skipped ${rejectedConversations.length} conversation(s) due to existing singleton jobs: [${rejectedConversations.join(", ")}]`,
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
