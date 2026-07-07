import {
    conversationTable,
    conversationViewSnapshotTable,
} from "@/shared-backend/schema.js";
import type {
    ExtendedConversationPerSlugId,
    FeedSortAlgorithm,
} from "@/shared/types/zod.js";
import { and, desc, eq, isNotNull, SQL } from "drizzle-orm";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { getConversationEngagementScore } from "./recommendationSystem.js";
import type { FetchFeedResponse } from "@/shared/types/dto.js";

interface GetPostSlugIdLastCursorProps {
    lastSlugId: string | undefined;
    db: PostgresDatabase;
}

export interface PostCursor {
    conversationId: number;
    createdAt: Date;
}

export async function getPostSlugIdLastCursor({
    lastSlugId,
    db,
}: GetPostSlugIdLastCursorProps): Promise<PostCursor | undefined> {
    let lastCursor;

    if (lastSlugId) {
        const selectResponse = await db
            .select({
                conversationId: conversationTable.id,
                createdAt: conversationTable.createdAt,
            })
            .from(conversationTable)
            .where(
                and(
                    eq(conversationTable.slugId, lastSlugId),
                    eq(conversationTable.isImporting, false),
                    isNotNull(conversationTable.currentContentId),
                ),
            );
        if (selectResponse.length == 1) {
            lastCursor = selectResponse[0];
        } else {
            // Ignore the slug ID if it cannot be found
        }
    }

    return lastCursor;
}

interface FetchFeedProps {
    db: PostgresDatabase;
    personalizationUserId?: string;
    baseImageServiceUrl: string;
    sortAlgorithm: FeedSortAlgorithm;
}

export async function fetchFeed({
    db,
    personalizationUserId,
    baseImageServiceUrl,
    sortAlgorithm,
}: FetchFeedProps): Promise<FetchFeedResponse> {
    const targetFetchLimit = 1000;

    // Exclude conversations that are still importing (isImporting=true)
    const whereClause: SQL | undefined = and(
        eq(conversationTable.isIndexed, true),
        eq(conversationTable.isImporting, false),
        isNotNull(conversationTable.currentContentId),
    );

    const { fetchPostItems } = useCommonPost();

    const conversations: ExtendedConversationPerSlugId = await fetchPostItems({
        db: db,
        limit: targetFetchLimit,
        where: whereClause,
        enableCompactBody: true,
        personalizedUserId: personalizationUserId,
        excludeLockedPosts: true,
        removeMutedAuthors: true,
        baseImageServiceUrl,
        sortAlgorithm,
    });

    const topSlugIdList = Array.from(conversations.keys()).slice(
        0,
        Math.min(10, conversations.size),
    );

    return {
        conversationDataList: Array.from(conversations.values()),
        topConversationSlugIdList: topSlugIdList,
    };
}

interface GetTopEngagementSlugIdsProps {
    db: PostgresDatabase;
}

export async function getTopEngagementSlugIds({
    db,
}: GetTopEngagementSlugIdsProps): Promise<string[]> {
    const conversationRows = await db
        .select({
            slugId: conversationTable.slugId,
            createdAt: conversationTable.createdAt,
            lastReactedAt: conversationTable.lastReactedAt,
            opinionCount: conversationViewSnapshotTable.opinionCount,
            voteCount: conversationViewSnapshotTable.voteCount,
            participantCount: conversationViewSnapshotTable.participantCount,
        })
        .from(conversationTable)
        .innerJoin(
            conversationViewSnapshotTable,
            eq(
                conversationViewSnapshotTable.conversationId,
                conversationTable.id,
            ),
        )
        .where(
            and(
                eq(conversationTable.isIndexed, true),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                isNotNull(conversationViewSnapshotTable.activatedAt),
            ),
        )
        .orderBy(
            conversationTable.id,
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        );

    const conversationsBySlugId = new Map<
        string,
        (typeof conversationRows)[number]
    >();
    for (const row of conversationRows) {
        if (!conversationsBySlugId.has(row.slugId)) {
            conversationsBySlugId.set(row.slugId, row);
        }
    }
    const conversations = Array.from(conversationsBySlugId.values());

    conversations.sort((a, b) => {
        const scoreA = getConversationEngagementScore(a);
        const scoreB = getConversationEngagementScore(b);
        return scoreB - scoreA;
    });

    return conversations.slice(0, 10).map((c) => c.slugId);
}
