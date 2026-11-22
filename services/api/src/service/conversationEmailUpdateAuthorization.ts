import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    conversationEmailUpdateTable,
    conversationEmailUpdateTestAttemptTable,
    userTable,
} from "@/shared-backend/schema.js";
import { getOrganizationIdsWithCapability } from "./organizationAuthorization.js";

export interface ConversationEmailUpdateActor {
    userId: string;
    organizationIds: readonly number[];
}

export async function getOwnedEmailUpdateReviewId({
    db,
    userId,
    updateId,
}: {
    db: PostgresJsDatabase;
    userId: string;
    updateId: string;
}): Promise<number | undefined> {
    const row = (
        await getPrimaryDatabase(db)
            .select({ id: conversationEmailUpdateTable.id })
            .from(conversationEmailUpdateTable)
            .innerJoin(
                userTable,
                and(
                    eq(
                        userTable.id,
                        conversationEmailUpdateTable.createdByUserId,
                    ),
                    eq(userTable.isDeleted, false),
                ),
            )
            .where(
                and(
                    eq(conversationEmailUpdateTable.publicId, updateId),
                    eq(conversationEmailUpdateTable.createdByUserId, userId),
                ),
            )
            .limit(1)
    ).at(0);
    return row?.id;
}

export async function getOwnedEmailUpdateTestId({
    db,
    userId,
    testAttemptId,
}: {
    db: PostgresJsDatabase;
    userId: string;
    testAttemptId: string;
}): Promise<number | undefined> {
    const row = (
        await getPrimaryDatabase(db)
            .select({ id: conversationEmailUpdateTestAttemptTable.id })
            .from(conversationEmailUpdateTestAttemptTable)
            .innerJoin(
                userTable,
                and(
                    eq(
                        userTable.id,
                        conversationEmailUpdateTestAttemptTable.requestedByUserId,
                    ),
                    eq(userTable.isDeleted, false),
                ),
            )
            .where(
                and(
                    eq(
                        conversationEmailUpdateTestAttemptTable.publicId,
                        testAttemptId,
                    ),
                    eq(
                        conversationEmailUpdateTestAttemptTable.requestedByUserId,
                        userId,
                    ),
                ),
            )
            .limit(1)
    ).at(0);
    return row?.id;
}

export async function getConversationEmailUpdateActor({
    db,
    userId,
}: {
    db: PostgresJsDatabase;
    userId: string;
}): Promise<ConversationEmailUpdateActor> {
    return {
        userId,
        organizationIds: await getOrganizationIdsWithCapability({
            db,
            userId,
            capability: "conversation_email_update",
        }),
    };
}
