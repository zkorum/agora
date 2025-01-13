import {
    conversationContentTable,
    pollTable,
    conversationTable,
    organisationTable,
    userTable,
    opinionTable,
    conversationModerationTable,
} from "@/schema.js";
import { toUnionUndefined } from "@/shared/shared.js";
import type {
    ConversationMetadata,
    ExtendedConversationPayload,
    PollOptionWithResult,
    ExtendedConversation,
} from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import { eq, desc, SQL, and } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import sanitizeHtml from "sanitize-html";
import { getUserPollResponse } from "./poll.js";
import { createPostModerationPropertyObject } from "./moderation.js";
import { getUserMutePreferences } from "./muteUser.js";

export function useCommonUser() {
    interface GetUserIdFromUsernameProps {
        db: PostgresJsDatabase;
        username: string;
    }

    async function getUserIdFromUsername({
        db,
        username,
    }: GetUserIdFromUsernameProps) {
        const userTableResponse = await db
            .select({ userId: userTable.id })
            .from(userTable)
            .where(eq(userTable.username, username));

        if (userTableResponse.length == 1) {
            return userTableResponse[0].userId;
        } else {
            throw httpErrors.notFound(
                "Failed to locate user by username: " + username,
            );
        }
    }

    return { getUserIdFromUsername };
}

export function useCommonPost() {
    interface IsPostSlugIdLockedProps {
        db: PostgresJsDatabase;
        postSlugId: string;
    }

    async function isPostSlugIdLocked({
        db,
        postSlugId,
    }: IsPostSlugIdLockedProps) {
        const { getPostAndContentIdFromSlugId } = useCommonPost();
        const postDetails = await getPostAndContentIdFromSlugId({
            db: db,
            postSlugId: postSlugId,
        });

        const moderationPostsTableResponse = await db
            .select({
                moderationAction: conversationModerationTable.moderationAction,
            })
            .from(conversationModerationTable)
            .where(
                and(
                    eq(
                        conversationModerationTable.conversationId,
                        postDetails.id,
                    ),
                    eq(conversationModerationTable.moderationAction, "lock"),
                ),
            );

        if (moderationPostsTableResponse.length == 1) {
            return true;
        } else {
            return false;
        }
    }

    interface FetchPostItemsProps {
        db: PostgresJsDatabase;
        limit: number;
        where: SQL | undefined;
        enableCompactBody: boolean;
        personalizationUserId?: string;
        excludeLockedPosts: boolean;
        removeMutedAuthors: boolean;
    }

    async function fetchPostItems({
        db,
        limit,
        where,
        enableCompactBody,
        personalizationUserId,
        excludeLockedPosts,
        removeMutedAuthors,
    }: FetchPostItemsProps): Promise<ExtendedConversation[]> {
        const postItems = await db
            .select({
                title: conversationContentTable.title,
                body: conversationContentTable.body,
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
                slugId: conversationTable.slugId,
                createdAt: conversationTable.createdAt,
                updatedAt: conversationTable.updatedAt,
                lastReactedAt: conversationTable.lastReactedAt,
                opinionCount: conversationTable.opinionCount,
                authorName: userTable.username,
                // moderation
                moderationAction: conversationModerationTable.moderationAction,
                moderationExplanation:
                    conversationModerationTable.moderationExplanation,
                moderationReason: conversationModerationTable.moderationReason,
                moderationCreatedAt: conversationModerationTable.createdAt,
                moderationUpdatedAt: conversationModerationTable.updatedAt,
            })
            .from(conversationTable)
            .innerJoin(
                conversationContentTable,
                eq(
                    conversationContentTable.id,
                    conversationTable.currentContentId,
                ),
            )
            .innerJoin(userTable, eq(userTable.id, conversationTable.authorId))
            .leftJoin(
                conversationModerationTable,
                eq(
                    conversationModerationTable.conversationId,
                    conversationTable.id,
                ),
            )
            .leftJoin(
                organisationTable,
                eq(organisationTable.id, userTable.organisationId),
            )
            .leftJoin(
                pollTable,
                eq(
                    conversationContentTable.id,
                    pollTable.conversationContentId,
                ),
            )
            // whereClause = and(whereClause, lt(postTable.createdAt, lastCreatedAt));
            .where(where)
            .orderBy(desc(conversationTable.createdAt))
            .limit(limit);

        let extendedPostList: ExtendedConversation[] = [];
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

            const moderationProperties = createPostModerationPropertyObject(
                postItem.moderationAction,
                postItem.moderationExplanation,
                postItem.moderationReason,
                postItem.moderationCreatedAt,
                postItem.moderationUpdatedAt,
            );

            const metadata: ConversationMetadata = {
                conversationSlugId: postItem.slugId,
                moderation: moderationProperties,
                createdAt: postItem.createdAt,
                updatedAt: postItem.updatedAt,
                lastReactedAt: postItem.lastReactedAt,
                opinionCount: postItem.opinionCount,
                authorUsername: postItem.authorName,
            };

            let payload: ExtendedConversationPayload;
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

            if (excludeLockedPosts && postItem.moderationAction == "lock") {
                // Skip
            } else {
                extendedPostList.push({
                    metadata: metadata,
                    payload: payload,
                    interaction: {
                        hasVoted: false,
                        votedIndex: 0,
                    },
                });
            }
        });

        if (personalizationUserId) {
            // Annotate return list with poll response
            {
                const pollResponseMap = new Map<string, number>();

                const postSlugIdList: string[] = [];
                extendedPostList.forEach((post) => {
                    postSlugIdList.push(post.metadata.conversationSlugId);
                });

                const pollResponses = await getUserPollResponse({
                    db: db,
                    authorId: personalizationUserId,
                    httpErrors: httpErrors,
                    postSlugIdList: postSlugIdList,
                });

                pollResponses.forEach((response) => {
                    pollResponseMap.set(
                        response.conversationSlugId,
                        response.optionChosen,
                    );
                });

                extendedPostList.forEach((post) => {
                    const voteIndex = pollResponseMap.get(
                        post.metadata.conversationSlugId,
                    );
                    post.interaction = {
                        hasVoted: voteIndex != undefined,
                        votedIndex: voteIndex ?? 0,
                    };
                });
            }

            // Remove muted users from the list
            if (removeMutedAuthors) {
                const mutedUserItems = await getUserMutePreferences({
                    db: db,
                    userId: personalizationUserId,
                });
                extendedPostList = extendedPostList.filter((postItem) => {
                    for (const muteItem of mutedUserItems) {
                        if (
                            muteItem.username ==
                            postItem.metadata.authorUsername
                        ) {
                            return false;
                        }
                    }
                    return true;
                });
            }
        }

        return extendedPostList;
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
                id: conversationTable.id,
                currentContentId: conversationTable.currentContentId,
            })
            .from(conversationTable)
            .where(eq(conversationTable.slugId, postSlugId));

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

    return {
        fetchPostItems,
        getPostAndContentIdFromSlugId,
        isPostSlugIdLocked,
    };
}

export function useCommonComment() {
    interface GetCommentIdFromCommentSlugIdProps {
        db: PostgresJsDatabase;
        commentSlugId: string;
    }

    async function getCommentIdFromCommentSlugId({
        db,
        commentSlugId,
    }: GetCommentIdFromCommentSlugIdProps) {
        const commentTableResponse = await db
            .select({
                commentId: opinionTable.id,
            })
            .from(opinionTable)
            .where(eq(opinionTable.slugId, commentSlugId));

        if (commentTableResponse.length != 1) {
            throw httpErrors.notFound(
                "Failed to locate comment ID from comment slug ID: " +
                    commentSlugId,
            );
        }

        return commentTableResponse[0].commentId;
    }

    interface GetPostIdFromCommentSlugIdProps {
        db: PostgresJsDatabase;
        commentSlugId: string;
    }

    async function getPostSlugIdFromCommentSlugId({
        db,
        commentSlugId,
    }: GetPostIdFromCommentSlugIdProps) {
        const commentTableResponse = await db
            .select({
                postSlugId: conversationTable.slugId,
            })
            .from(opinionTable)
            .innerJoin(
                conversationTable,
                eq(conversationTable.id, opinionTable.conversationId),
            )
            .where(eq(opinionTable.slugId, commentSlugId));

        if (commentTableResponse.length != 1) {
            throw httpErrors.internalServerError(
                "Failed to locate post slug ID from comment slug ID: " +
                    commentSlugId,
            );
        }

        return commentTableResponse[0].postSlugId;
    }

    return { getPostSlugIdFromCommentSlugId, getCommentIdFromCommentSlugId };
}
