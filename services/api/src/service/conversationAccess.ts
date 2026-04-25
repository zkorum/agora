import { eq } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { httpErrors } from "@fastify/sensible";
import { conversationTable } from "@/shared-backend/schema.js";
import * as authUtilService from "@/service/authUtil.js";

export type ConversationViewAccessLevel = "public" | "owner";

export async function getConversationViewAccessLevel({
    db,
    conversationId,
    userId,
}: {
    db: PostgresDatabase;
    conversationId: number;
    userId: string | undefined;
}): Promise<ConversationViewAccessLevel> {
    if (userId === undefined) {
        return "public";
    }

    const conversationRows = await db
        .select({
            authorId: conversationTable.authorId,
            organizationId: conversationTable.organizationId,
        })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId))
        .limit(1);
    if (conversationRows.length === 0) {
        throw httpErrors.notFound("Conversation not found");
    }
    const conversation = conversationRows[0];

    if (conversation.authorId === userId) {
        return "owner";
    }

    if (conversation.organizationId !== null) {
        const isOrganizationMember =
            await authUtilService.isUserPartOfOrganizationById({
                db,
                userId,
                organizationId: conversation.organizationId,
            });
        if (isOrganizationMember) {
            return "owner";
        }
    }

    return "public";
}
