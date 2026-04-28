import { eq, inArray, or } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { httpErrors } from "@fastify/sensible";
import { conversationTable } from "@/shared-backend/schema.js";
import * as authUtilService from "@/service/authUtil.js";

export type ConversationViewAccessLevel = "public" | "owner";

export function getConversationOwnerFilter({
    userId,
    organizationIds,
}: {
    userId: string;
    organizationIds: number[];
}) {
    const authorFilter = eq(conversationTable.authorId, userId);
    if (organizationIds.length === 0) {
        return authorFilter;
    }

    return or(
        authorFilter,
        inArray(conversationTable.organizationId, organizationIds),
    );
}

export async function isConversationOwner({
    db,
    userId,
    authorId,
    organizationId,
}: {
    db: PostgresDatabase;
    userId: string;
    authorId: string;
    organizationId: number | null;
}): Promise<boolean> {
    if (authorId === userId) {
        return true;
    }

    if (organizationId === null) {
        return false;
    }

    return await authUtilService.isUserPartOfOrganizationById({
        db,
        userId,
        organizationId,
    });
}

export async function getConversationViewAccessLevelForConversation({
    db,
    userId,
    authorId,
    organizationId,
}: {
    db: PostgresDatabase;
    userId: string | undefined;
    authorId: string;
    organizationId: number | null;
}): Promise<ConversationViewAccessLevel> {
    if (userId === undefined) {
        return "public";
    }

    const isOwner = await isConversationOwner({
        db,
        userId,
        authorId,
        organizationId,
    });
    return isOwner ? "owner" : "public";
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

    return await getConversationViewAccessLevelForConversation({
        db,
        userId,
        authorId: conversation.authorId,
        organizationId: conversation.organizationId,
    });
}
