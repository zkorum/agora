import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    conversationParticipantTable,
    qvAllocationTable,
    qvResponseTable,
    qvResponseCommandTable,
    qvResponseVersionTable,
    rankingItemContentTable,
    rankingItemTable,
    userTable,
} from "@/shared-backend/schema.js";
import { currentRankingItemSourceCondition } from "@/shared-backend/opinionEligibility.js";

export function buildQvCommandReceiptQuery({
    db,
    responseId,
    commandId,
}: {
    db: PostgresJsDatabase;
    responseId: string;
    commandId: string;
}) {
    return db
        .select({
            requestHash: qvResponseCommandTable.requestHash,
            resultRevision: qvResponseCommandTable.resultRevision,
            resultVersionId: qvResponseCommandTable.resultVersionId,
        })
        .from(qvResponseCommandTable)
        .where(
            and(
                eq(qvResponseCommandTable.responseId, responseId),
                eq(qvResponseCommandTable.commandId, commandId),
                isNull(qvResponseCommandTable.deletedAt),
            ),
        );
}

export function buildQvAllocationItemsQuery({
    db,
    conversationId,
    itemSlugs,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    itemSlugs: readonly string[];
}) {
    return db
        .select({
            id: rankingItemTable.id,
            slugId: rankingItemTable.slugId,
            contentId: rankingItemContentTable.id,
            sourceVersion: rankingItemContentTable.publicId,
            position: rankingItemTable.position,
        })
        .from(rankingItemTable)
        .leftJoin(userTable, eq(userTable.id, rankingItemTable.authorId))
        .innerJoin(
            rankingItemContentTable,
            eq(rankingItemContentTable.id, rankingItemTable.currentContentId),
        )
        .where(
            and(
                eq(rankingItemTable.conversationId, conversationId),
                inArray(rankingItemTable.slugId, [...itemSlugs]),
                currentRankingItemSourceCondition(),
            ),
        );
}

export function buildQvOwnerResponseQuery({
    db,
    userId,
    conversationId,
}: {
    db: PostgresJsDatabase;
    userId: string;
    conversationId: number;
}) {
    return db
        .select({
            revision: qvResponseTable.revision,
            versionId: qvResponseTable.currentVersionId,
        })
        .from(conversationParticipantTable)
        .innerJoin(
            qvResponseTable,
            eq(qvResponseTable.participantId, conversationParticipantTable.id),
        )
        .where(
            and(
                eq(conversationParticipantTable.userId, userId),
                eq(conversationParticipantTable.conversationId, conversationId),
                isNull(qvResponseTable.deletedAt),
                isNull(qvResponseTable.accountHiddenAt),
            ),
        );
}

export function buildQvSavedAllocationsQuery({
    db,
    versionId,
}: {
    db: PostgresJsDatabase;
    versionId: string;
}) {
    return db
        .select({
            savedAt: qvResponseVersionTable.createdAt,
            creditsSpent: qvResponseVersionTable.creditsSpent,
            itemId: rankingItemTable.slugId,
            sourceVersion: rankingItemContentTable.publicId,
            votes: qvAllocationTable.votes,
        })
        .from(qvResponseVersionTable)
        .innerJoin(
            qvAllocationTable,
            eq(qvAllocationTable.versionId, qvResponseVersionTable.id),
        )
        .innerJoin(
            rankingItemTable,
            eq(rankingItemTable.id, qvAllocationTable.itemId),
        )
        .innerJoin(
            rankingItemContentTable,
            eq(rankingItemContentTable.id, qvAllocationTable.contentId),
        )
        .where(
            and(
                eq(qvResponseVersionTable.id, versionId),
                isNull(qvResponseVersionTable.deletedAt),
                isNull(qvAllocationTable.deletedAt),
            ),
        )
        .orderBy(asc(rankingItemTable.position), asc(rankingItemTable.id));
}

/** QV has no comparison lifecycle, external source or scoring joins. */
export function buildQvStatementSourcesQuery({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}) {
    return db
        .select({
            itemSlugId: rankingItemTable.slugId,
            contentId: rankingItemContentTable.id,
            publicId: rankingItemContentTable.publicId,
            title: rankingItemContentTable.title,
            bodyHtml: rankingItemContentTable.body,
            sourceLanguageCode: rankingItemContentTable.sourceLanguageCode,
            sourceRawLanguageCode:
                rankingItemContentTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                rankingItemContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                rankingItemContentTable.sourceLanguageConfidence,
        })
        .from(rankingItemTable)
        .leftJoin(userTable, eq(userTable.id, rankingItemTable.authorId))
        .innerJoin(
            rankingItemContentTable,
            eq(rankingItemContentTable.id, rankingItemTable.currentContentId),
        )
        .where(
            and(
                eq(rankingItemTable.conversationId, conversationId),
                currentRankingItemSourceCondition(),
            ),
        )
        .orderBy(asc(rankingItemTable.position), asc(rankingItemTable.id));
}
