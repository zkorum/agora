import {
    postContentTable,
    pollTable,
    postTable,
    organisationTable,
    userTable,
    commentTable,
    moderationPostsTable,
} from "@/schema.js";
import { toUnionUndefined } from "@/shared/shared.js";
import type {
    PostMetadata,
    ExtendedPostPayload,
    PollOptionWithResult,
    ExtendedPost,
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
                moderationAction: moderationPostsTable.moderationAction,
            })
            .from(moderationPostsTable)
            .where(
                and(
                    eq(moderationPostsTable.postId, postDetails.id),
                    eq(moderationPostsTable.moderationAction, "lock"),
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
    }

    async function fetchPostItems({
        db,
        limit,
        where,
        enableCompactBody,
        personalizationUserId,
        excludeLockedPosts,
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
                createdAt: postTable.createdAt,
                updatedAt: postTable.updatedAt,
                lastReactedAt: postTable.lastReactedAt,
                commentCount: postTable.commentCount,
                authorName: userTable.username,
                // moderation
                moderationAction: moderationPostsTable.moderationAction,
                moderationExplanation:
                    moderationPostsTable.moderationExplanation,
                moderationReason: moderationPostsTable.moderationReason,
                moderationCreatedAt: moderationPostsTable.createdAt,
                moderationUpdatedAt: moderationPostsTable.updatedAt,
            })
            .from(postTable)
            .innerJoin(
                postContentTable,
                eq(postContentTable.id, postTable.currentContentId),
            )
            .innerJoin(userTable, eq(userTable.id, postTable.authorId))
            .leftJoin(
                moderationPostsTable,
                eq(moderationPostsTable.postId, postTable.id),
            )
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

        let extendedPostList: ExtendedPost[] = [];
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

            const metadata: PostMetadata = {
                postSlugId: postItem.slugId,
                moderation: moderationProperties,
                createdAt: postItem.createdAt,
                updatedAt: postItem.updatedAt,
                lastReactedAt: postItem.lastReactedAt,
                commentCount: postItem.commentCount,
                authorUsername: postItem.authorName,
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
                    postSlugIdList.push(post.metadata.postSlugId);
                });

                const pollResponses = await getUserPollResponse({
                    db: db,
                    authorId: personalizationUserId,
                    httpErrors: httpErrors,
                    postSlugIdList: postSlugIdList,
                });

                pollResponses.forEach((response) => {
                    pollResponseMap.set(
                        response.postSlugId,
                        response.optionChosen,
                    );
                });

                extendedPostList.forEach((post) => {
                    const voteIndex = pollResponseMap.get(
                        post.metadata.postSlugId,
                    );
                    post.interaction = {
                        hasVoted: voteIndex != undefined,
                        votedIndex: voteIndex ?? 0,
                    };
                });
            }

            // Remove muted users from the list
            {
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
                commentId: commentTable.id,
            })
            .from(commentTable)
            .where(eq(commentTable.slugId, commentSlugId));

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
                postSlugId: postTable.slugId,
            })
            .from(commentTable)
            .innerJoin(postTable, eq(postTable.id, commentTable.postId))
            .where(eq(commentTable.slugId, commentSlugId));

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
