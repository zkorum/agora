/**
 * Job handler for updating math for a single conversation
 */

import { log } from "@/app.js";
import { config } from "@/config.js";
import { conversationTable } from "@/shared-backend/schema.js";
import {
    getPolisVotes,
    getAndUpdatePolisMath,
} from "@/services/polisMathUpdater.js";
import { eq, and } from "drizzle-orm";
import type PgBoss from "pg-boss";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AxiosInstance } from "axios";

export interface UpdateConversationMathData {
    conversationId: number;
    conversationSlugId: string;
    mathUpdateRequestedAt: string | null; // Will be an ISO string after pg-boss serialization
}

export async function updateConversationMathHandler(
    job: PgBoss.Job<UpdateConversationMathData>,
    db: PostgresJsDatabase,
    axiosPolis: AxiosInstance,
): Promise<void> {
    const { conversationId, conversationSlugId, mathUpdateRequestedAt } =
        job.data;

    // Convert mathUpdateRequestedAt from ISO string to Date if present
    // (pg-boss serializes Date objects to strings)
    const mathUpdateRequestedAtDate = mathUpdateRequestedAt
        ? new Date(mathUpdateRequestedAt)
        : null;

    log.info(
        `[Math Updater] Starting math update for conversation ${conversationSlugId} (id: ${conversationId})`,
    );

    try {
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
        });

        // Clear the needsMathUpdate flag only if mathUpdateRequestedAt hasn't changed
        // This prevents race conditions where new votes arrive during processing
        const updateConditions = [eq(conversationTable.id, conversationId)];

        // If mathUpdateRequestedAt was set when we started, only clear if it hasn't changed
        if (mathUpdateRequestedAtDate !== null) {
            updateConditions.push(
                eq(
                    conversationTable.mathUpdateRequestedAt,
                    mathUpdateRequestedAtDate,
                ),
            );
        }

        await db
            .update(conversationTable)
            .set({
                lastMathUpdateAt: new Date(),
            })
            .where(eq(conversationTable.id, conversationId));
        await db
            .update(conversationTable)
            .set({
                needsMathUpdate: false,
            })
            .where(and(...updateConditions));

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
