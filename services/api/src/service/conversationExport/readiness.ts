import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { and, desc, eq } from "drizzle-orm";
import { httpErrors } from "@fastify/sensible";
import {
    conversationExportTable,
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
 * - "cooldown": No active export, but someone recently exported (< cooldown period)
 * - "ready": No active export, no cooldown - user can export
 */
export async function getExportReadinessForConversation({
    db,
    conversationSlugId,
    userId,
    cooldownSeconds = 300, // 5 minutes default (matching exportBuffer)
}: GetExportReadinessForConversationParams): Promise<GetExportReadinessResponse> {
    // Find conversation ID from slug
    const conversation = await db
        .select({ id: conversationTable.id })
        .from(conversationTable)
        .where(eq(conversationTable.slugId, conversationSlugId))
        .limit(1);

    if (conversation.length === 0) {
        throw httpErrors.notFound("Conversation not found");
    }

    const conversationId = conversation[0].id;

    // Step 1: Check for active (processing) export for this user+conversation
    const activeExportList = await db
        .select({
            exportSlugId: conversationExportTable.slugId,
            createdAt: conversationExportTable.createdAt,
        })
        .from(conversationExportTable)
        .where(
            and(
                eq(conversationExportTable.conversationId, conversationId),
                eq(conversationExportTable.userId, userId),
                eq(conversationExportTable.status, "processing"),
                eq(conversationExportTable.isDeleted, false),
            ),
        )
        .orderBy(desc(conversationExportTable.createdAt))
        .limit(1);

    if (activeExportList.length > 0) {
        return {
            status: "active",
            exportSlugId: activeExportList[0].exportSlugId,
            createdAt: activeExportList[0].createdAt,
        };
    }

    // Step 2: Check for recent completed exports (cooldown check)
    // Note: Cooldown is based on ANY user's exports of this conversation
    const now = new Date();
    const cooldownTime = new Date(now.getTime() - cooldownSeconds * 1000);

    const recentExportList = await db
        .select({
            exportSlugId: conversationExportTable.slugId,
            createdAt: conversationExportTable.createdAt,
        })
        .from(conversationExportTable)
        .where(
            and(
                eq(conversationExportTable.conversationId, conversationId),
                eq(conversationExportTable.status, "completed"),
                eq(conversationExportTable.isDeleted, false),
            ),
        )
        .orderBy(desc(conversationExportTable.createdAt))
        .limit(1);

    if (
        recentExportList.length > 0 &&
        recentExportList[0].createdAt > cooldownTime
    ) {
        const cooldownEndsAt = new Date(
            recentExportList[0].createdAt.getTime() + cooldownSeconds * 1000,
        );

        return {
            status: "cooldown",
            cooldownEndsAt,
            lastExportSlugId: recentExportList[0].exportSlugId,
        };
    }

    // Step 3: No active export, no cooldown - ready to export
    return {
        status: "ready",
    };
}
