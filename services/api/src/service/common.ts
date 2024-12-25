import {
    postContentTable,
    pollTable,
    postTable,
    organisationTable,
    userTable,
} from "@/schema.js";
import { toUnionUndefined } from "@/shared/shared.js";
import type {
    PostMetadata,
    ExtendedPostPayload,
    PollOptionWithResult,
    ExtendedPost,
} from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import { eq, desc, SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import sanitizeHtml from "sanitize-html";
import { getUserPollResponse } from "./poll.js";

export function useCommonPost() {
    interface FetchPostItemsProps {
        db: PostgresJsDatabase;
        limit: number;
        where: SQL | undefined;
        enableCompactBody: boolean;
        fetchPollResponse: boolean;
        userId?: string;
    }

    async function fetchPostItems({
        db,
        limit,
        where,
        enableCompactBody,
        fetchPollResponse,
        userId,
    }: FetchPostItemsProps): Promise<ExtendedPost[]> {
        const postItems = await db
            .select({
                title: postContentTable.title,
                body: postContentTable.body,
                option1: pollTable.option1,
                option1Response: pollTable.option1Response,
                option2: pollTable.option2,
                option2Response: pollTable.option2Response,
                option3: pollTable.option3,
                option3Response: pollTable.option3Response,
                option4: pollTable.option4,
                option4Response: pollTable.option4Response,
                option5: pollTable.option5,
                option5Response: pollTable.option5Response,
                option6: pollTable.option6,
                option6Response: pollTable.option6Response,
                // metadata
                slugId: postTable.slugId,
                isHidden: postTable.isHidden,
                isLocked: postTable.isLocked,
                createdAt: postTable.createdAt,
                updatedAt: postTable.updatedAt,
                lastReactedAt: postTable.lastReactedAt,
                commentCount: postTable.commentCount,
                authorName: userTable.username,
                authorImagePath: organisationTable.imageUrl,
            })
            .from(postTable)
            .innerJoin(
                postContentTable,
                eq(postContentTable.id, postTable.currentContentId),
            )
            .innerJoin(userTable, eq(userTable.id, postTable.authorId))
            .leftJoin(
                organisationTable,
                eq(organisationTable.id, userTable.organisationId),
            )
            .leftJoin(
                pollTable,
                eq(postContentTable.id, pollTable.postContentId),
            )
            // whereClause = and(whereClause, lt(postTable.createdAt, lastCreatedAt));
            .where(where)
            .orderBy(desc(postTable.createdAt))
            .limit(limit);

        const posts: ExtendedPost[] = [];
        postItems.forEach((postItem) => {
            if (enableCompactBody && postItem.body != null) {
                postItem.body = sanitizeHtml(postItem.body, {
                    allowedTags: ["b", "i", "strike", "u"],
                    allowedAttributes: {},
                    textFilter: function (text) {
                        // , tagName
                        return text + " ";
                    },
                });
            }

            const metadata: PostMetadata = {
                postSlugId: postItem.slugId,
                isHidden: postItem.isHidden,
                isLocked: postItem.isLocked,
                createdAt: postItem.createdAt,
                updatedAt: postItem.updatedAt,
                lastReactedAt: postItem.lastReactedAt,
                commentCount: postItem.commentCount,
                authorUsername: postItem.authorName,
                authorImagePath: toUnionUndefined(postItem.authorImagePath),
            };

            let payload: ExtendedPostPayload;
            if (
                postItem.option1 !== null &&
                postItem.option2 !== null &&
                postItem.option1Response !== null &&
                postItem.option2Response !== null
            ) {
                // hasPoll
                const pollList: PollOptionWithResult[] = [
                    {
                        optionNumber: 1,
                        optionTitle: postItem.option1,
                        numResponses: postItem.option1Response,
                    },
                    {
                        optionNumber: 2,
                        optionTitle: postItem.option2,
                        numResponses: postItem.option2Response,
                    },
                ];
                if (postItem.option3 !== null) {
                    pollList.push({
                        optionNumber: 3,
                        optionTitle: postItem.option3,
                        numResponses: postItem.option3Response ?? 0,
                    });
                }
                if (postItem.option4 !== null) {
                    pollList.push({
                        optionNumber: 4,
                        optionTitle: postItem.option4,
                        numResponses: postItem.option4Response ?? 0,
                    });
                }
                if (postItem.option5 !== null) {
                    pollList.push({
                        optionNumber: 5,
                        optionTitle: postItem.option5,
                        numResponses: postItem.option5Response ?? 0,
                    });
                }
                if (postItem.option6 !== null) {
                    pollList.push({
                        optionNumber: 6,
                        optionTitle: postItem.option6,
                        numResponses: postItem.option6Response ?? 0,
                    });
                }
                payload = {
                    title: postItem.title, // Typescript inference limitation
                    body: toUnionUndefined(postItem.body),
                    poll: pollList,
                };
            } else {
                payload = {
                    title: postItem.title,
                    body: toUnionUndefined(postItem.body),
                };
            }
            posts.push({
                metadata: metadata,
                payload: payload,
                interaction: {
                    hasVoted: false,
                    votedIndex: 0,
                },
            });
        });

        if (fetchPollResponse) {
            if (!userId) {
                throw httpErrors.internalServerError(
                    "Missing author ID for fetching poll response",
                );
            } else {
                const postSlugIdList: string[] = [];
                posts.forEach((post) => {
                    postSlugIdList.push(post.metadata.postSlugId);
                });

                const pollResponses = await getUserPollResponse({
                    db: db,
                    authorId: userId,
                    httpErrors: httpErrors,
                    postSlugIdList: postSlugIdList,
                });

                const responseMap = new Map<string, number>();
                pollResponses.forEach((response) => {
                    responseMap.set(response.postSlugId, response.optionChosen);
                });

                posts.forEach((post) => {
                    const voteIndex = responseMap.get(post.metadata.postSlugId);
                    post.interaction = {
                        hasVoted: voteIndex != undefined,
                        votedIndex: voteIndex ?? 0,
                    };
                });
            }
        }

        return posts;
    }

    interface IdAndContentId {
        id: number;
        contentId: number | null;
    }

    interface GetPostAndContentIdFromSlugIdProps {
        db: PostgresJsDatabase;
        postSlugId: string;
    }

    async function getPostAndContentIdFromSlugId({
        db,
        postSlugId,
    }: GetPostAndContentIdFromSlugIdProps): Promise<IdAndContentId> {
        const postTableResponse = await db
            .select({
                id: postTable.id,
                currentContentId: postTable.currentContentId,
            })
            .from(postTable)
            .where(eq(postTable.slugId, postSlugId));

        if (postTableResponse.length == 1) {
            return {
                contentId: postTableResponse[0].currentContentId,
                id: postTableResponse[0].id,
            };
        } else {
            throw httpErrors.notFound(
                "Post slugId does not exist, or incorrect response count from database",
            );
        }
    }

    return { fetchPostItems, getPostAndContentIdFromSlugId };
}
