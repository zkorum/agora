/**
 * Job handler for updating math for a single conversation
 */

import { log } from "@/app.js";
import { config } from "@/config.js";
import { conversationTable, conversationUpdateQueueTable } from "@/shared-backend/schema.js";
import {
    getPolisVotes,
    getAndUpdatePolisMath,
} from "@/services/polisMathUpdater.js";
import { recalculateAndUpdateConversationCounters } from "@/conversationCounters.js";
import { eq, and, sql } from "drizzle-orm";
import type PgBoss from "pg-boss";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AxiosInstance } from "axios";
import { nowZeroMs } from "@/shared/util.js";

export interface UpdateConversationMathData {
    conversationId: number;
    conversationSlugId: string;
    requestedAt: Date | string; // Date object or ISO string (pg-boss serializes Dates to strings)
}

export async function updateConversationMathHandler(
    job: PgBoss.Job<UpdateConversationMathData>,
    db: PostgresJsDatabase,
    axiosPolis: AxiosInstance,
): Promise<void> {
    const { conversationId, conversationSlugId, requestedAt } =
        job.data;

    // Convert requestedAt from ISO string to Date if needed
    // (pg-boss serializes Date objects to strings)
    const requestedAtDate = typeof requestedAt === 'string'
        ? new Date(requestedAt)
        : requestedAt;

    log.info(
        `[Math Updater] Starting math update for conversation ${conversationSlugId} (id: ${conversationId})`,
    );

    try {
        // STEP 1: Recalculate and fix counters before processing math
        // This ensures counters are accurate and eliminates the need for expensive
        // count queries in the API endpoints (opinion creation, vote casting)
        log.info(
            `[Math Updater] Recalculating counters for conversation ${conversationSlugId}`,
        );
        await recalculateAndUpdateConversationCounters(
            db,
            conversationId,
            conversationSlugId,
            (message, data) => log.info(data, message),
        );

        // STEP 2: Get votes for the conversation
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
        });

        // Always update lastMathUpdateAt since math was successfully calculated
        const now = nowZeroMs();
        await db
            .update(conversationUpdateQueueTable)
            .set({
                lastMathUpdateAt: now,
            })
            .where(eq(conversationUpdateQueueTable.conversationId, conversationId));

        // Mark queue entry as processed
        // RACE-CONDITION SAFE: Only mark as processed if requestedAt hasn't changed
        // If requestedAt changed, it means a new update was requested while we were processing
        const updateResult = await db
            .update(conversationUpdateQueueTable)
            .set({
                processedAt: now,
            })
            .where(
                and(
                    eq(conversationUpdateQueueTable.conversationId, conversationId),
                    eq(conversationUpdateQueueTable.requestedAt, requestedAtDate),
                ),
            )
            .returning({ conversationId: conversationUpdateQueueTable.conversationId });

        if (updateResult.length === 0) {
            log.info(
                `[Math Updater] Queue entry for conversation ${conversationSlugId} was updated during processing (new request arrived) - will be picked up in next scan`,
            );
        } else {
            log.debug(
                `[Math Updater] Marked queue entry as processed for conversation ${conversationSlugId}`,
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
        throw error; // Re-throw to let pg-boss handle retry logic
    }
}
