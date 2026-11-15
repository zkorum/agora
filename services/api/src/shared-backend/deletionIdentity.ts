/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import {
    and,
    eq,
    inArray,
    isNotNull,
    isNull,
    notExists,
    sql,
} from "drizzle-orm";
import type { PostgresTransaction } from "./db.js";
import {
    conversationParticipantTable,
    opinionGroupUserTable,
    opinionTable,
    opinionContentTable,
    rankingItemTable,
    userTable,
} from "./schema.js";
import { lockAccountConversations } from "./accountContributions.js";
import { findAccountParticipationSource } from "./accountParticipationSources.js";
import { hasUnclassifiedComparisonAccountContext } from "./comparisonRetention.js";

/** Purge-phase contract only; this neither starts purge nor removes private sources. */
export async function unlinkAccountRetainedContributions({
    db,
    userId,
    limit = 1000,
}: {
    db: PostgresTransaction;
    userId: string;
    limit?: number;
}): Promise<
    | {
          status: "blocked";
          reason:
              | "account_not_purging"
              | "private_participation_remaining"
              | "legacy_comparison_account_context"
              | "legacy_membership_without_participant";
      }
    | {
          status: "progress";
          participants: number;
          memberships: number;
          sources: number;
      }
> {
    const accounts = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(
            and(
                eq(userTable.id, userId),
                eq(userTable.isDeleted, true),
                isNotNull(userTable.purgeStartedAt),
            ),
        )
        .for("no key update");
    if (accounts.length === 0)
        return { status: "blocked", reason: "account_not_purging" };
    if (await hasUnclassifiedComparisonAccountContext(db))
        return {
            status: "blocked",
            reason: "legacy_comparison_account_context",
        };
    if ((await findAccountParticipationSource({ db, userId })) !== undefined)
        return { status: "blocked", reason: "private_participation_remaining" };
    const legacy = await db
        .select({ id: opinionGroupUserTable.id })
        .from(opinionGroupUserTable)
        .where(
            and(
                eq(opinionGroupUserTable.userId, userId),
                isNull(opinionGroupUserTable.participantId),
            ),
        )
        .limit(1);
    if (legacy.length > 0)
        return {
            status: "blocked",
            reason: "legacy_membership_without_participant",
        };
    const scope = await lockAccountConversations({ db, userId, limit });
    const scopedParticipants = db
        .select({ id: conversationParticipantTable.id })
        .from(conversationParticipantTable)
        .where(
            and(
                eq(conversationParticipantTable.userId, userId),
                inArray(conversationParticipantTable.conversationId, [
                    ...scope,
                ]),
            ),
        );

    // Clear account associations, not numerical membership rows or matrix indices.
    const memberships = await db
        .update(opinionGroupUserTable)
        .set({ userId: null })
        .where(
            inArray(
                opinionGroupUserTable.id,
                db
                    .select({ id: opinionGroupUserTable.id })
                    .from(opinionGroupUserTable)
                    .where(
                        and(
                            eq(opinionGroupUserTable.userId, userId),
                            inArray(
                                opinionGroupUserTable.participantId,
                                scopedParticipants,
                            ),
                        ),
                    )
                    .orderBy(opinionGroupUserTable.id)
                    .limit(limit),
            ),
        );
    const participants = await db
        .update(conversationParticipantTable)
        .set({ userId: null })
        .where(
            inArray(
                conversationParticipantTable.id,
                db
                    .select({ id: conversationParticipantTable.id })
                    .from(conversationParticipantTable)
                    .where(
                        and(
                            eq(conversationParticipantTable.userId, userId),
                            inArray(
                                conversationParticipantTable.conversationId,
                                [...scope],
                            ),
                            notExists(
                                db
                                    .select({ id: opinionGroupUserTable.id })
                                    .from(opinionGroupUserTable)
                                    .where(
                                        and(
                                            eq(
                                                opinionGroupUserTable.participantId,
                                                conversationParticipantTable.id,
                                            ),
                                            isNotNull(
                                                opinionGroupUserTable.userId,
                                            ),
                                        ),
                                    ),
                            ),
                        ),
                    )
                    .orderBy(conversationParticipantTable.id)
                    .limit(limit),
            ),
        );
    const opinionIds = db
        .select({ id: opinionTable.id })
        .from(opinionTable)
        .where(
            and(
                eq(opinionTable.authorId, userId),
                inArray(opinionTable.conversationId, [...scope]),
            ),
        )
        .orderBy(opinionTable.id)
        .limit(limit);
    const rankingIds = db
        .select({ id: rankingItemTable.id })
        .from(rankingItemTable)
        .where(
            and(
                eq(rankingItemTable.authorId, userId),
                inArray(rankingItemTable.conversationId, [...scope]),
            ),
        )
        .orderBy(rankingItemTable.id)
        .limit(limit);
    // Tag unknown legacy personal hiding before removing attribution. Existing
    // timestamps and project-owned seeds remain untouched under the scope locks.
    await db
        .update(opinionTable)
        .set({ accountHiddenAt: sql`clock_timestamp() AT TIME ZONE 'UTC'` })
        .where(
            and(
                inArray(opinionTable.id, opinionIds),
                eq(opinionTable.isSeed, false),
                isNull(opinionTable.accountHiddenAt),
            ),
        );
    await db
        .update(rankingItemTable)
        .set({ accountHiddenAt: sql`clock_timestamp() AT TIME ZONE 'UTC'` })
        .where(
            and(
                inArray(rankingItemTable.id, rankingIds),
                eq(rankingItemTable.isSeed, false),
                isNull(rankingItemTable.accountHiddenAt),
            ),
        );
    const opinions = await db
        .update(opinionTable)
        .set({ authorId: null })
        .where(inArray(opinionTable.id, opinionIds));
    const items = await db
        .update(rankingItemTable)
        .set({ authorId: null })
        .where(inArray(rankingItemTable.id, rankingIds));
    const versions = await db
        .update(opinionContentTable)
        .set({ editedByUserId: null })
        .where(
            inArray(
                opinionContentTable.id,
                db
                    .select({ id: opinionContentTable.id })
                    .from(opinionContentTable)
                    .innerJoin(
                        opinionTable,
                        eq(opinionTable.id, opinionContentTable.opinionId),
                    )
                    .where(
                        and(
                            eq(opinionContentTable.editedByUserId, userId),
                            inArray(opinionTable.conversationId, [...scope]),
                        ),
                    )
                    .orderBy(opinionContentTable.id)
                    .limit(limit),
            ),
        );
    return {
        status: "progress",
        participants: participants.count,
        memberships: memberships.count,
        sources: opinions.count + items.count + versions.count,
    };
}
