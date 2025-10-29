/**
 * Job handler for updating math for a single conversation
 */

import { log } from "@/app.js";
import { config } from "@/config.js";
import {
    getAndUpdatePolisMath,
    getPolisVotes,
} from "@/services/polisMathUpdater.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { conversationUpdateQueueTable } from "@/shared-backend/schema.js";
import { reconcileConversationCounters } from "@/shared-backend/conversationCounters.js";
import { nowZeroMs } from "@/shared/util.js";
import { AxiosInstance } from "axios";
import { and, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type PgBoss from "pg-boss";

export interface UpdateConversationMathData {
    conversationId: number;
    conversationSlugId: string;
    requestedAt: Date | string; // Date object or ISO string (pg-boss serializes Dates to strings)
}

/**
 * PRODUCTION ISSUE OBSERVED (2025-10-22):
 *
 * We observed duplicate math calculations for the same conversation happening within seconds
 * of each other, despite using pg-boss singleton with singletonSeconds: 30.
 *
 * Raw data from pgboss.job table for conversation 143 (ZL2QqQ):
 *
 * Job 1:
 * - id: bd4346a1-ec55-4c51-b8e3-a850304d688c
 * - name: update-conversation-math
 * - data: {"requestedAt": "2025-10-22T18:18:52.000Z", "conversationId": 143, "conversationSlugId": "ZL2QqQ"}
 * - state: completed
 * - singleton_key: update-math-143
 * - singleton_on: 2025-10-22 18:19:00.000
 * - created_on: 2025-10-22 20:18:53.419 +0200 (18:18:53 UTC)
 * - started_on: 2025-10-22 20:18:53.419 +0200
 * - completed_on: 2025-10-22 20:18:55.411 +0200
 * - policy: singleton
 *
 * Job 2:
 * - id: 88a40812-55c9-4421-b133-00ec888beaa0
 * - name: update-conversation-math
 * - data: {"requestedAt": "2025-10-22T18:18:52.000Z", "conversationId": 143, "conversationSlugId": "ZL2QqQ"}
 * - state: completed
 * - singleton_key: update-math-143
 * - singleton_on: 2025-10-22 18:19:00.000
 * - created_on: 2025-10-22 20:19:01.423 +0200 (18:19:01 UTC)
 * - started_on: 2025-10-22 20:19:03.218 +0200
 * - completed_on: 2025-10-22 20:19:10.674 +0200
 * - policy: singleton
 *
 * Analysis:
 * - Both jobs have SAME singleton_key: "update-math-143"
 * - Both jobs have SAME singleton_on: 18:19:00 (rounded to same time slot!)
 * - Job 1: created at 18:18:53, singleton_on at 18:19:00 (only 7 seconds of protection!)
 * - Job 2: created at 18:19:01, singleton_on at 18:19:00 (already expired!)
 * - Expected: Job 1 singleton should last until 18:19:23 (created + 30 seconds)
 * - Actual: singleton_on was rounded to 18:19:00 for both jobs
 *
 * Environment:
 * - pg-boss version: 11.1.1
 * - Queue policy: singleton
 * - singletonSeconds parameter: 30 (passed in boss.send options)
 * - TOTAL_VCPUS: 2
 * - Batch size: 6
 * - Job concurrency: 3
 *
 * Root cause appears to be queue-level policy: "singleton" interfering with per-job
 * singletonSeconds parameter, causing singleton_on to be rounded/truncated to fixed
 * time slots rather than calculating created_on + singletonSeconds.
 *
 * WORKAROUND IMPLEMENTED:
 * Instead of relying solely on pg-boss singleton mechanism, we now lock the queue entry
 * immediately at job start by setting processedAt. This prevents the scanner from
 * re-enqueueing the conversation while it's being processed, even if:
 * 1. The pg-boss singleton mechanism fails
 * 2. New votes arrive during processing (which reset processedAt in the queue)
 *
 * The scanner checks `WHERE processedAt IS NULL`, so by setting processedAt immediately,
 * we prevent duplicate job creation at the application level.
 */
export async function updateConversationMathHandler(
    job: PgBoss.Job<UpdateConversationMathData>,
    db: PostgresJsDatabase,
    axiosPolis: AxiosInstance,
    googleCloudCredentials?: GoogleCloudCredentials,
): Promise<void> {
    const { conversationId, conversationSlugId, requestedAt } = job.data;

    // Convert requestedAt from ISO string to Date if needed
    // (pg-boss serializes Date objects to strings)
    const requestedAtDate =
        typeof requestedAt === "string" ? new Date(requestedAt) : requestedAt;

    log.info(
        `[Math Updater] Starting math update for conversation ${conversationSlugId} (id: ${conversationId})`,
    );

    try {
        // Lock by setting lastMathUpdateAt immediately
        // This makes requestedAt <= lastMathUpdateAt, preventing scanner from re-enqueueing
        // Since lastMathUpdateAt is only touched by math-updater (not API), this prevents race conditions
        const now = nowZeroMs();
        await db
            .update(conversationUpdateQueueTable)
            .set({
                lastMathUpdateAt: now, // Lock! Makes requestedAt <= lastMathUpdateAt
            })
            .where(
                eq(conversationUpdateQueueTable.conversationId, conversationId),
            );

        log.info(
            `[Math Updater] Locked queue entry for conversation ${conversationSlugId} by setting lastMathUpdateAt`,
        );

        // Reconcile conversation counters (safety net)
        // This ensures opinionCount, voteCount, and participantCount are accurate
        // before calculating math, in case of any drift from real-time updates
        await reconcileConversationCounters({ db, conversationId });

        log.info(
            `[Math Updater] Reconciled conversation counters for conversation ${conversationSlugId}`,
        );

        // Get votes for the conversation
        const votes = await getPolisVotes({
            db,
            conversationId,
            conversationSlugId,
        });

        log.info(
            `[Math Updater] Retrieved ${votes.length} votes for conversation ${conversationSlugId}`,
        );

        // Update math results
        await getAndUpdatePolisMath({
            db,
            conversationId,
            conversationSlugId,
            votes: votes,
            axiosPolis: axiosPolis,
            awsAiLabelSummaryEnable: config.AWS_AI_LABEL_SUMMARY_ENABLE,
            awsAiLabelSummaryRegion: config.AWS_AI_LABEL_SUMMARY_REGION,
            awsAiLabelSummaryModelId: config.AWS_AI_LABEL_SUMMARY_MODEL_ID,
            awsAiLabelSummaryTemperature:
                config.AWS_AI_LABEL_SUMMARY_TEMPERATURE,
            awsAiLabelSummaryTopP: config.AWS_AI_LABEL_SUMMARY_TOP_P,
            awsAiLabelSummaryMaxTokens: config.AWS_AI_LABEL_SUMMARY_MAX_TOKENS,
            awsAiLabelSummaryPrompt: config.AWS_AI_LABEL_SUMMARY_PROMPT,
            googleCloudCredentials,
        });

        // Set processedAt ONLY if requestedAt didn't change during processing
        // This confirms we processed the exact data that was requested
        // If requestedAt changed, new data arrived and needs another processing cycle
        const completionTime = nowZeroMs();
        const processedResult = await db
            .update(conversationUpdateQueueTable)
            .set({
                processedAt: completionTime,
            })
            .where(
                and(
                    eq(
                        conversationUpdateQueueTable.conversationId,
                        conversationId,
                    ),
                    eq(
                        conversationUpdateQueueTable.requestedAt,
                        requestedAtDate,
                    ), // Must match!
                ),
            );

        if (processedResult.length > 0) {
            log.info(
                `[Math Updater] Marked as processed for conversation ${conversationSlugId} (requestedAt unchanged)`,
            );
        } else {
            log.info(
                `[Math Updater] New data arrived during processing for conversation ${conversationSlugId} - will be picked up in next cycle`,
            );
        }

        log.info(
            `[Math Updater] Successfully updated math for conversation ${conversationSlugId}`,
        );
    } catch (error) {
        log.error(
            error,
            `[Math Updater] Error updating math for conversation ${conversationSlugId}`,
        );

        // Check if there's a newer update request waiting
        // If so, don't retry this job - let it fail and move to the fresh one
        // If not, retry this job to ensure the calculation completes
        try {
            const queueEntry = await db
                .select({
                    requestedAt: conversationUpdateQueueTable.requestedAt,
                })
                .from(conversationUpdateQueueTable)
                .where(
                    eq(
                        conversationUpdateQueueTable.conversationId,
                        conversationId,
                    ),
                )
                .limit(1);

            if (queueEntry.length > 0) {
                const currentRequestedAt = queueEntry[0].requestedAt;
                const currentRequestedAtTime = new Date(
                    currentRequestedAt,
                ).getTime();
                const jobRequestedAtTime = requestedAtDate.getTime();

                if (currentRequestedAtTime > jobRequestedAtTime) {
                    // A newer update request exists - don't retry this stale job
                    log.info(
                        `[Math Updater] Newer update request exists for conversation ${conversationSlugId}, skipping retry of stale job`,
                    );
                    // Don't throw - let the job complete with failure status
                    // The newer job will be picked up by the scanner
                    return;
                }
            }
        } catch (checkError) {
            log.warn(
                checkError,
                `[Math Updater] Failed to check for newer update request for conversation ${conversationSlugId}`,
            );
        }

        // No newer request exists, or check failed - retry this job
        throw error;
    }
}
