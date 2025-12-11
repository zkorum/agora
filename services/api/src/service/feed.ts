import { conversationTable } from "@/shared-backend/schema.js";
import type {
    ExtendedConversationPerSlugId,
    FeedSortAlgorithm,
} from "@/shared/types/zod.js";
import { and, eq, SQL } from "drizzle-orm";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import type { FetchFeedResponse } from "@/shared/types/dto.js";

interface GetPostSlugIdLastCreatedAtProps {
    lastSlugId: string | undefined;
    db: PostgresDatabase;
}

export async function getPostSlugIdLastCreatedAt({
    lastSlugId,
    db,
}: GetPostSlugIdLastCreatedAtProps): Promise<Date | undefined> {
    let lastCreatedAt;

    if (lastSlugId) {
        const selectResponse = await db
            .select({ createdAt: conversationTable.createdAt })
            .from(conversationTable)
            .where(eq(conversationTable.slugId, lastSlugId));
        if (selectResponse.length == 1) {
            lastCreatedAt = selectResponse[0].createdAt;
        } else {
            // Ignore the slug ID if it cannot be found
        }
    }

    return lastCreatedAt;
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
