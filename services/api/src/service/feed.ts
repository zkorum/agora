import { conversationTable } from "@/shared-backend/schema.js";
import type { FeedSortAlgorithm } from "@/shared/types/zod.js";
import type {
    SupportedDisplayLanguageCodes,
    SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import { and, eq, isNotNull } from "drizzle-orm";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { getReplicaDatabase } from "@/shared-backend/db.js";
import { useCommonPost } from "./common.js";
import { fetchConversationFeedDisplayContentBySlugId } from "./conversationFeedDisplayContent.js";
import type {
    ConversationContentFetchResponse,
    FetchFeedRequest,
    FetchFeedResponse,
    FetchFeedHeadResponse,
} from "@/shared/types/dto.js";
import {
    selectedFeedConversations,
    selectFeedCandidates,
} from "./feedSelection.js";
import { FEED_PAGE_SIZE } from "@/shared/types/dto.js";

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
        const selectResponse = await getReplicaDatabase(db)
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

interface FetchFeedPageProps {
    db: PostgresDatabase;
    viewerId: string | undefined;
    baseImageServiceUrl: string;
    request: FetchFeedRequest;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}

export async function fetchFeedPage({
    db,
    viewerId,
    baseImageServiceUrl,
    request,
    currentDisplayLanguage,
    spokenLanguages,
}: FetchFeedPageProps): Promise<FetchFeedResponse> {
    const selection = await selectFeedCandidates({
        db,
        viewerId,
        request,
        purpose: "page",
    });
    const candidates = selection.rows.slice(0, FEED_PAGE_SIZE);
    if (candidates.length === 0) {
        return request.sortAlgorithm === "new"
            ? { sortAlgorithm: "new", feedItemList: [], nextCursor: null }
            : {
                  sortAlgorithm: "following",
                  feedItemList: [],
                  nextCursor: null,
              };
    }
    const { createCompactHtmlBody, fetchPostItems } = useCommonPost();
    const postItems = await fetchPostItems({
        db: db,
        limit: FEED_PAGE_SIZE,
        where: selectedFeedConversations({
            db,
            viewerId,
            conversationIds: candidates.map((row) => row.conversationId),
        }),
        enableCompactBody: true,
        personalizedUserId: viewerId,
        baseImageServiceUrl,
        currentDisplayLanguage,
    });
    const displayContentBySlugId =
        await fetchConversationFeedDisplayContentBySlugId({
            db,
            conversationContentIds: Array.from(
                postItems.values(),
                (postItem) => postItem.conversationContentId,
            ),
            displayLanguage: currentDisplayLanguage,
            spokenLanguages,
        });
    const feedItemList = candidates.flatMap(({ slugId }) => {
        const postItem = postItems.get(slugId);
        if (postItem === undefined) return [];
        const displayContent = displayContentBySlugId.get(slugId);
        return [
            {
                conversationData: postItem.conversationData,
                ...(displayContent === undefined
                    ? {}
                    : {
                          displayContent: compactFeedDisplayContent({
                              displayContent,
                              createCompactHtmlBody,
                          }),
                      }),
            },
        ];
    });
    if (selection.sortAlgorithm === "following") {
        const last =
            selection.rows.length > FEED_PAGE_SIZE
                ? selection.rows.at(FEED_PAGE_SIZE - 1)
                : undefined;
        return {
            sortAlgorithm: "following",
            feedItemList,
            nextCursor:
                last === undefined
                    ? null
                    : {
                          conversationId: last.conversationId,
                          createdAt: last.createdAt,
                          score: last.score,
                          rankedAt: selection.rankedAt,
                      },
        };
    }
    const last =
        selection.rows.length > FEED_PAGE_SIZE ? candidates.at(-1) : undefined;
    return {
        sortAlgorithm: "new",
        feedItemList,
        nextCursor:
            last === undefined
                ? null
                : {
                      conversationId: last.conversationId,
                      createdAt: last.createdAt,
                  },
    };
}

export async function fetchFeedHead({
    db,
    viewerId,
    sortAlgorithm,
}: {
    db: PostgresDatabase;
    viewerId: string | undefined;
    sortAlgorithm: FeedSortAlgorithm;
}): Promise<FetchFeedHeadResponse> {
    const request: FetchFeedRequest =
        sortAlgorithm === "new"
            ? { sortAlgorithm: "new", cursor: null }
            : { sortAlgorithm: "following", cursor: null };
    const { rows } = await selectFeedCandidates({
        db,
        viewerId,
        request,
        purpose: "head",
    });
    return { topConversationSlugIdList: rows.map((row) => row.slugId) };
}
