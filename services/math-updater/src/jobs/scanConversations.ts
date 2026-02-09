import { log } from "@/app.js";
import {
    conversationTable,
    conversationUpdateQueueTable,
} from "@/shared-backend/schema.js";
import { and, eq, or, isNull, lt, gt, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { nowZeroMs } from "@/shared/util.js";
import PgBoss from "pg-boss";

// Threshold for detecting stale jobs
// If a job is in CREATED state (queued) for longer than this, it's considered stuck
const STALE_QUEUED_JOB_THRESHOLD_MS = 10000; // 10 seconds

/**
 * Scan database for conversations that need math updates
 * and enqueue them for processing.
 *
 * Called on a fixed interval from index.ts via setInterval.
 * If this function throws, the caller catches it and retries on the next interval.
 */
export async function scanConversations({
    db,
    boss,
    minTimeBetweenUpdatesMs,
}: {
    db: PostgresJsDatabase;
    boss: PgBoss;
    minTimeBetweenUpdatesMs: number;
}): Promise<void> {
    const scanStartTime = Date.now();

    log.info(
        `[Scan] Starting conversation scan (minTimeBetweenUpdatesMs: ${minTimeBetweenUpdatesMs})`,
    );

    // Calculate cutoff time for rate limiting
    const now = nowZeroMs();
    const cutoffTime = new Date(now);
    cutoffTime.setMilliseconds(
        cutoffTime.getMilliseconds() - minTimeBetweenUpdatesMs,
    );

    // Find conversations that need updates from the queue table
    // Use requestedAt > lastMathUpdateAt to determine if processing is needed
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
        if (voteCount < 1000) {
            singletonSeconds = 2; // Small conversations (< 1K votes): 2s
        } else if (voteCount < 1000000) {
            singletonSeconds = 8; // Medium conversations (1K-1M votes): 8s
        } else {
            singletonSeconds = 28; // Huge conversations (1M+ votes): 28s
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
                // 2s-28s based on conversation size (prevents overwhelming Python service)
                singletonSeconds: singletonSeconds,
            },
        );

        if (jobId) {
            enqueuedConversations.push(conversationSlugId);
            log.info(
                `[Scan] Enqueued conversation ${conversationSlugId} (id: ${entry.conversationId}, votes: ${voteCount}, singleton: ${singletonSeconds}s, job: ${jobId})`,
            );
        } else {
            // When jobId is null, it means pg-boss rejected due to singleton constraint
            // Query the existing job to understand its state
            const singletonKey = `update-math-${entry.conversationId}`;

            try {
                // Query pg-boss tables directly to find the blocking job
                const result = await db.execute<{
                    id: string;
                    state: string;
                    created_on: string;
                    started_on: string | null;
                    completed_on: string | null;
                    keep_until: string;
                }>(sql`
                    SELECT id, state, created_on, started_on, completed_on, keep_until
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
                    let isStale = false;

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

                        // Check if job is stale (queued too long)
                        if (ageMs > STALE_QUEUED_JOB_THRESHOLD_MS) {
                            // Check if any jobs are actively processing
                            const activeCountResult = await db.execute<{
                                count: string;
                            }>(sql`
                                SELECT COUNT(*) as count
                                FROM pgboss.job
                                WHERE name = 'update-conversation-math'
                                AND state = 'active'
                            `);

                            const activeCount = parseInt(
                                activeCountResult[0]?.count || "0",
                            );

                            if (activeCount === 0) {
                                // No jobs processing + job stuck = worker problem
                                isStale = true;
                                log.warn(
                                    `[Scan] Detected stuck job for ${conversationSlugId} (age: ${ageSeconds}s, state: ${job.state}, active jobs: 0)`,
                                );

                                // Delete stale job
                                await db.execute(sql`
                                    DELETE FROM pgboss.job
                                    WHERE id = ${job.id}
                                `);

                                log.warn(
                                    `[Scan] Deleted stuck job ${job.id} for ${conversationSlugId}`,
                                );

                                // Retry enqueuing immediately
                                const retryJobId = await boss.send(
                                    "update-conversation-math",
                                    {
                                        conversationId:
                                            entry.conversationId,
                                        conversationSlugId:
                                            conversationSlugId,
                                        requestedAt: entry.requestedAt,
                                    },
                                    {
                                        singletonKey: `update-math-${entry.conversationId}`,
                                        singletonSeconds: singletonSeconds,
                                    },
                                );

                                if (retryJobId) {
                                    enqueuedConversations.push(
                                        conversationSlugId,
                                    );
                                    log.info(
                                        `[Scan] Re-enqueued ${conversationSlugId} after cleanup (new job: ${retryJobId})`,
                                    );
                                } else {
                                    log.error(
                                        `[Scan] Failed to re-enqueue ${conversationSlugId} after cleanup`,
                                    );
                                }
                            } else {
                                log.info(
                                    `[Scan] Skipped ${conversationSlugId} - job queued but ${activeCount} job(s) actively processing (healthy)`,
                                );
                            }
                        }
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

                    if (!isStale) {
                        rejectedConversations.push(conversationSlugId);
                        log.info(
                            `[Scan] Skipped ${conversationSlugId} - ${reason}`,
                        );
                    }
                } else {
                    // This shouldn't happen but log it if it does
                    rejectedConversations.push(conversationSlugId);
                    log.warn(
                        `[Scan] Skipped ${conversationSlugId} - singleton rejected but no matching job found in pgboss.job (singletonKey: ${singletonKey})`,
                    );
                }
            } catch (queryError) {
                rejectedConversations.push(conversationSlugId);
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

    const scanDurationMs = Date.now() - scanStartTime;
    log.info(
        `[Scan] Scan completed in ${scanDurationMs}ms (found: ${queueEntries.length}, enqueued: ${enqueuedConversations.length}, skipped: ${rejectedConversations.length})`,
    );
}
