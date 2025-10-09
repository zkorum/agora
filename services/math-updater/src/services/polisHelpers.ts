/**
 * Helper functions for Polis math calculations
 * Extracted from services/api/src/service/user.ts and post.ts
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import {
    conversationTable,
    conversationContentTable,
    userTable,
} from "@/shared-backend/schema.js";

/**
 * Get conversation title and body
 */
export async function getConversationContent({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<{ conversationTitle: string; conversationBody?: string }> {
    const results = await db
        .select({
            conversationTitle: conversationContentTable.title,
            conversationBody: conversationContentTable.body,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .where(eq(conversationTable.id, conversationId));

    if (results.length === 0) {
        throw new Error(`Conversation id ${conversationId} cannot be found`);
    }

    return {
        conversationTitle: results[0].conversationTitle,
        conversationBody: results[0].conversationBody ?? undefined,
    };
}

/**
 * Map polis participant IDs to user IDs
 */
export async function getUserIdByPolisParticipantIds({
    db,
    polisParticipantIds,
}: {
    db: PostgresJsDatabase;
    polisParticipantIds: number[];
}): Promise<Record<number, string>> {
    const results = await db
        .select({
            userId: userTable.id,
            polisParticipantId: userTable.polisParticipantId,
        })
        .from(userTable)
        .where(inArray(userTable.polisParticipantId, polisParticipantIds));

    const userIdMap: Record<number, string> = {};
    for (const row of results) {
        userIdMap[row.polisParticipantId] = row.userId;
    }

    return userIdMap;
}
