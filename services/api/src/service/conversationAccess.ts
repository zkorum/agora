import { eq } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { httpErrors } from "@fastify/sensible";
import { conversationTable } from "@/shared-backend/schema.js";
import { hasProjectCapability } from "@/service/projectAccess.js";

export type ConversationViewAccessLevel = "public" | "owner";

export async function getConversationViewAccessLevelForConversation({
    db,
    userId,
    projectId,
}: {
    db: PostgresDatabase;
    userId: string | undefined;
    projectId: number;
}): Promise<ConversationViewAccessLevel> {
    if (userId === undefined) {
        return "public";
    }

    const canUpdateConversation = await hasProjectCapability({
        db,
        userId,
        projectId,
        capability: "conversation_update",
    });
    return canUpdateConversation ? "owner" : "public";
}

export async function getConversationViewAccessLevel({
    db,
    conversationId,
    userId,
}: {
    db: PostgresDatabase;
    conversationId: number;
    userId: string | undefined;
}): Promise<ConversationViewAccessLevel> {
    const conversationRows = await db
        .select({
            projectId: conversationTable.projectId,
        })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId))
        .limit(1);
    if (conversationRows.length === 0) {
        throw httpErrors.notFound("Conversation not found");
    }
    const conversation = conversationRows[0];

    return await getConversationViewAccessLevelForConversation({
        db,
        userId,
        projectId: conversation.projectId,
    });
}
