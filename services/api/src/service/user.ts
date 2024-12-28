import { log } from "@/app.js";
import {
    commentContentTable,
    commentTable,
    moderationCommentsTable,
    postTable,
    userTable,
} from "@/schema.js";
import type { FetchUserProfileResponse } from "@/shared/types/dto.js";
import type {
    CommentItem,
    ExtendedComment,
    ExtendedPost,
} from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import { and, eq, lt, desc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { getPostSlugIdLastCreatedAt } from "./feed.js";
import { getCommentSlugIdLastCreatedAt } from "./comment.js";
import { fetchPostBySlugId } from "./post.js";
import { createCommentModerationPropertyObject } from "./moderation.js";

interface GetUserCommentsProps {
    db: PostgresJsDatabase;
    userId: string;
    lastCommentSlugId?: string;
}

export async function getUserComments({
    db,
    userId,
    lastCommentSlugId,
}: GetUserCommentsProps): Promise<ExtendedComment[]> {
    try {
        const lastCreatedAt = await getCommentSlugIdLastCreatedAt({
            lastSlugId: lastCommentSlugId,
            db: db,
        });

        // Fetch a list of comment IDs first
        const commentResponseList = await db
            .select({
                commentSlugId: commentTable.slugId,
                createdAt: commentTable.createdAt,
                updatedAt: commentTable.updatedAt,
                comment: commentContentTable.content,
                numLikes: commentTable.numLikes,
                numDislikes: commentTable.numDislikes,
                username: userTable.username,
                postSlugId: postTable.slugId,
                moderationAction: moderationCommentsTable.moderationAction,
                moderationExplanation:
                    moderationCommentsTable.moderationExplanation,
                moderationReason: moderationCommentsTable.moderationReason,
                moderationCreatedAt: moderationCommentsTable.createdAt,
                moderationUpdatedAt: moderationCommentsTable.updatedAt,
            })
            .from(commentTable)
            .innerJoin(
                commentContentTable,
                eq(commentContentTable.id, commentTable.currentContentId),
            )
            .innerJoin(userTable, eq(userTable.id, commentTable.authorId))
            .innerJoin(postTable, eq(postTable.id, commentTable.postId))
            .leftJoin(
                moderationCommentsTable,
                eq(moderationCommentsTable.commentId, commentTable.id),
            )
            .where(
                and(
                    eq(commentTable.authorId, userId),
                    lt(commentTable.createdAt, lastCreatedAt),
                ),
            )
            .orderBy(desc(commentTable.createdAt))
            .limit(10);

        const extendedCommentList: ExtendedComment[] = [];

        for (const commentResponse of commentResponseList) {
            const moderationProperties = createCommentModerationPropertyObject(
                commentResponse.moderationAction,
                commentResponse.moderationExplanation,
                commentResponse.moderationReason,
                commentResponse.moderationCreatedAt,
                commentResponse.moderationUpdatedAt,
            );

            const commentItem: CommentItem = {
                comment: commentResponse.comment,
                commentSlugId: commentResponse.commentSlugId,
                createdAt: commentResponse.createdAt,
                numDislikes: commentResponse.numDislikes,
                numLikes: commentResponse.numLikes,
                updatedAt: commentResponse.updatedAt,
                username: commentResponse.username,
                moderation: moderationProperties,
            };

            const postItem = await fetchPostBySlugId({
                db: db,
                postSlugId: commentResponse.postSlugId,
                fetchPollResponse: false,
                userId: undefined,
            });

            const extendedCommentItem: ExtendedComment = {
                commentItem: commentItem,
                postData: postItem,
            };

            extendedCommentList.push(extendedCommentItem);
        }

        return extendedCommentList;
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while fetching user comments",
        );
    }
}

interface GetUserPostProps {
    db: PostgresJsDatabase;
    userId: string;
    lastPostSlugId?: string;
}

export async function getUserPosts({
    db,
    userId,
    lastPostSlugId,
}: GetUserPostProps): Promise<ExtendedPost[]> {
    try {
        const { fetchPostItems } = useCommonPost();

        const lastCreatedAt = await getPostSlugIdLastCreatedAt({
            lastSlugId: lastPostSlugId,
            db: db,
        });

        const whereClause = and(
            eq(postTable.authorId, userId),
            lt(postTable.createdAt, lastCreatedAt),
        );

        const posts: ExtendedPost[] = await fetchPostItems({
            db: db,
            limit: 10,
            where: whereClause,
            enableCompactBody: true,
            fetchPollResponse: true,
            userId: userId,
            removeLocked: false,
        });

        return posts;
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while fetching user posts",
        );
    }
}

interface GetUserProfileProps {
    db: PostgresJsDatabase;
    userId: string;
}

export async function getUserProfile({
    db,
    userId,
}: GetUserProfileProps): Promise<FetchUserProfileResponse> {
    try {
        const userTableResponse = await db
            .select({
                activePostCount: userTable.activePostCount,
                createdAt: userTable.createdAt,
                username: userTable.username,
                isModerator: userTable.isModerator,
            })
            .from(userTable)
            .where(eq(userTable.id, userId));

        if (userTableResponse.length == 0) {
            throw httpErrors.notFound("Failed to locate user profile");
        } else {
            return {
                activePostCount: userTableResponse[0].activePostCount,
                createdAt: userTableResponse[0].createdAt,
                username: userTableResponse[0].username,
                isModerator: userTableResponse[0].isModerator,
            };
        }
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while fetching user profile",
        );
    }
}
