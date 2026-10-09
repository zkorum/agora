import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { httpErrors } from "@fastify/sensible";
import {
    conversationExportRequestTable,
    conversationTable,
} from "@/shared-backend/schema.js";
import type { GetExportReadinessResponse } from "@/shared/types/dto.js";

interface GetExportReadinessForConversationParams {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
    cooldownSeconds?: number;
}

/**
 * Check if user can export a conversation.
 * Returns whether user has an active export, is in cooldown, or is ready to export.
 *
 * Three possible states:
 * - "active": User has a processing export for this conversation
 * - "cooldown": No active export, but this user recently exported (< cooldown period)
 * - "ready": No active export, no cooldown - user can export
 */
export async function getExportReadinessForConversation({
    db,
    conversationSlugId,
    userId,
    cooldownSeconds = 300,
}: GetExportReadinessForConversationParams): Promise<GetExportReadinessResponse> {
    // Readiness is a separate request: resolve conversation and export state
    // together in a fresh writer-side transaction rather than a replica snapshot.
    return await db.transaction(async (tx) => {
        const conversation = await tx
            .select({
                id: conversationTable.id,
                conversationType: conversationTable.conversationType,
            })
            .from(conversationTable)
            .where(
                and(
                    eq(conversationTable.slugId, conversationSlugId),
                    eq(conversationTable.isImporting, false),
                    isNotNull(conversationTable.currentContentId),
                ),
            )
            .limit(1);

        if (conversation.length === 0) {
            throw httpErrors.notFound("Conversation not found");
        }

        const conversationRecord = conversation[0];
        if (conversationRecord.conversationType === "ranking") {
            throw httpErrors.badRequest(
                "Conversation export is not supported for prioritization conversations",
            );
        }

        const conversationId = conversationRecord.id;

        // Resolve active and completed requests in one read so a completion
        // between two queries cannot produce contradictory readiness state.
        const recentExports = await tx
            .select({
                exportSlugId: conversationExportRequestTable.slugId,
                createdAt: conversationExportRequestTable.createdAt,
                status: conversationExportRequestTable.status,
            })
            .from(conversationExportRequestTable)
            .where(
                and(
                    eq(
                        conversationExportRequestTable.conversationId,
                        conversationId,
                    ),
                    eq(conversationExportRequestTable.userId, userId),
                    or(
                        eq(conversationExportRequestTable.status, "processing"),
                        eq(conversationExportRequestTable.status, "completed"),
                    ),
                    isNull(conversationExportRequestTable.deletedAt),
                ),
            )
            .orderBy(
                desc(eq(conversationExportRequestTable.status, "processing")),
                desc(conversationExportRequestTable.createdAt),
            )
            .limit(1);
        const latestExport = recentExports.at(0);

        if (latestExport?.status === "processing") {
            return {
                status: "active",
                exportSlugId: latestExport.exportSlugId,
                createdAt: latestExport.createdAt,
            };
        }

        const now = new Date();
        const cooldownTime = new Date(now.getTime() - cooldownSeconds * 1000);
        if (
            cooldownSeconds > 0 &&
            latestExport?.status === "completed" &&
            latestExport.createdAt > cooldownTime
        ) {
            const cooldownEndsAt = new Date(
                latestExport.createdAt.getTime() + cooldownSeconds * 1000,
            );

            return {
                status: "cooldown",
                cooldownEndsAt,
                lastExportSlugId: latestExport.exportSlugId,
            };
        }

        return {
            status: "ready",
        };
    });
}
