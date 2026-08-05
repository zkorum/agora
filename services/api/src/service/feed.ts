import { conversationTable } from "@/shared-backend/schema.js";
import type { FeedSortAlgorithm } from "@/shared/types/zod.js";
import type {
    SupportedDisplayLanguageCodes,
    SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import { and, eq, isNotNull, SQL } from "drizzle-orm";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { fetchConversationFeedDisplayContentBySlugId } from "./conversationFeedDisplayContent.js";
import { getConversationEngagementScore } from "./recommendationSystem.js";
import type {
    ConversationContentFetchResponse,
    FetchFeedResponse,
} from "@/shared/types/dto.js";
import { fetchConversationDisplayCountsByConversationId } from "./conversationDisplayCounts.js";

function compactFeedDisplayContent({
    displayContent,
    createCompactHtmlBody,
}: {
    displayContent: ConversationContentFetchResponse;
    createCompactHtmlBody: (htmlString: string) => string;
}): ConversationContentFetchResponse {
    if (
        displayContent.status !== "available" ||
        displayContent.content.body === undefined
    ) {
        return displayContent;
    }
    return {
        ...displayContent,
        content: {
            ...displayContent.content,
            body: createCompactHtmlBody(displayContent.content.body),
        },
    };
}

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
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
    includeDisplayContent: boolean;
}

export async function fetchFeed({
    db,
    personalizationUserId,
    baseImageServiceUrl,
    sortAlgorithm,
    currentDisplayLanguage,
    spokenLanguages,
    includeDisplayContent,
}: FetchFeedProps): Promise<FetchFeedResponse> {
    const targetFetchLimit = 1000;

    // Exclude conversations that are still importing (isImporting=true)
    const whereClause: SQL | undefined = and(
        eq(conversationTable.isIndexed, true),
        eq(conversationTable.isImporting, false),
        isNotNull(conversationTable.currentContentId),
    );

    const { createCompactHtmlBody, fetchPostItems } = useCommonPost();

    const postItems = await fetchPostItems({
        db: db,
        limit: targetFetchLimit,
        where: whereClause,
        enableCompactBody: true,
        personalizedUserId: personalizationUserId,
        excludeLockedPosts: true,
        removeMutedAuthors: true,
        baseImageServiceUrl,
        sortAlgorithm,
        currentDisplayLanguage,
    });

    const topSlugIdList = Array.from(postItems.keys()).slice(
        0,
        Math.min(10, postItems.size),
    );
    const displayContentBySlugId = includeDisplayContent
        ? await fetchConversationFeedDisplayContentBySlugId({
              db,
              conversationContentIds: Array.from(
                  postItems.values(),
                  (postItem) => postItem.conversationContentId,
              ),
              displayLanguage: currentDisplayLanguage,
              spokenLanguages,
          })
        : new Map<string, ConversationContentFetchResponse>();
    const feedItemList = Array.from(
        postItems,
        ([conversationSlugId, postItem]) => {
            const displayContent =
                displayContentBySlugId.get(conversationSlugId);
            return {
                conversationData: postItem.conversationData,
                ...(displayContent === undefined
                    ? {}
                    : {
                          displayContent: compactFeedDisplayContent({
                              displayContent,
                              createCompactHtmlBody,
                          }),
                      }),
            };
        },
    );

    return {
        feedItemList,
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
            conversationId: conversationTable.id,
            slugId: conversationTable.slugId,
            createdAt: conversationTable.createdAt,
            lastReactedAt: conversationTable.lastReactedAt,
        })
        .from(conversationTable)
        .where(
            and(
                eq(conversationTable.isIndexed, true),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
            ),
        );
    const countsByConversationId =
        await fetchConversationDisplayCountsByConversationId({
            db,
            conversationIds: conversationRows.map((row) => row.conversationId),
        });
    const conversations = conversationRows.flatMap((row) => {
        const counts = countsByConversationId.get(row.conversationId);
        return counts === undefined
            ? []
            : [
                  {
                      ...row,
                      opinionCount: counts.opinionCount,
                      voteCount: counts.voteCount,
                      participantCount: counts.participantCount,
                  },
              ];
    });

    conversations.sort((a, b) => {
        const scoreA = getConversationEngagementScore(a);
        const scoreB = getConversationEngagementScore(b);
        return scoreB - scoreA;
    });

    return conversations.slice(0, 10).map((c) => c.slugId);
}
