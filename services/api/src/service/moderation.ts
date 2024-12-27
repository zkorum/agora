import {
    commentTable,
    moderationCommentsTable,
    moderationPostsTable,
    postTable,
} from "@/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonComment, useCommonPost } from "./common.js";
import type {
    ModerationActionComments,
    ModerationActionPosts,
    ModerationPropertiesPosts,
    ModerationReason,
    zodModerationPropertiesComments,
} from "@/shared/types/zod.js";
import { eq } from "drizzle-orm";
import { nowZeroMs } from "@/shared/common/util.js";

interface ModerateByPostSlugIdProps {
    postSlugId: string;
    db: PostgresJsDatabase;
    moderationAction: ModerationActionPosts;
    moderationReason: ModerationReason;
    moderationExplanation: string;
    userId: string;
}

export async function moderateByPostSlugId({
    postSlugId,
    db,
    moderationReason,
    userId,
    moderationExplanation,
    moderationAction,
}: ModerateByPostSlugIdProps) {
    const { getPostAndContentIdFromSlugId } = useCommonPost();
    const postDetails = await getPostAndContentIdFromSlugId({
        db: db,
        postSlugId: postSlugId,
    });

    const moderationStatus = await fetchPostModeration({
        db: db,
        postSlugId: postSlugId,
    });

    await db.transaction(async (tx) => {
        if (moderationStatus.isModerated) {
            await tx
                .update(moderationPostsTable)
                .set({
                    moderatorId: userId,
                    moderationAction: moderationAction,
                    moderationReason: moderationReason,
                    moderationExplanation: moderationExplanation,
                })
                .where(eq(moderationPostsTable.postId, postDetails.id));
        } else {
            await tx.insert(moderationPostsTable).values({
                postId: postDetails.id,
                moderatorId: userId,
                moderationAction: moderationAction,
                moderationReason: moderationReason,
                moderationExplanation: moderationExplanation,
            });
        }

        await tx
            .update(postTable)
            .set({
                isLocked: true,
            })
            .where(eq(postTable.id, postDetails.id));
    });
}

interface moderateByCommentSlugIdProps {
    commentSlugId: string;
    db: PostgresJsDatabase;
    moderationAction: ModerationActionComments;
    moderationReason: ModerationReason;
    moderationExplanation: string;
    userId: string;
}

export async function moderateByCommentSlugId({
    commentSlugId,
    db,
    moderationReason,
    userId,
    moderationExplanation,
    moderationAction,
}: moderateByCommentSlugIdProps) {
    const { getCommentIdFromCommentSlugId } = useCommonComment();
    const commentId = await getCommentIdFromCommentSlugId({
        db: db,
        commentSlugId: commentSlugId,
    });

    const moderationStatus = await fetchCommentModeration({
        db: db,
        commentSlugId: commentSlugId,
    });

    await db.transaction(async (tx) => {
        if (moderationStatus.isModerated) {
            await tx
                .update(moderationCommentsTable)
                .set({
                    moderatorId: userId,
                    moderationAction: moderationAction,
                    moderationReason: moderationReason,
                    moderationExplanation: moderationExplanation,
                    updatedAt: nowZeroMs(),
                })
                .where(eq(moderationCommentsTable.commentId, commentId));
        } else {
            await tx.insert(moderationCommentsTable).values({
                commentId: commentId,
                moderatorId: userId,
                moderationAction: moderationAction,
                moderationReason: moderationReason,
                moderationExplanation: moderationExplanation,
            });
        }

        if (moderationAction == "lock") {
            await tx
                .update(commentTable)
                .set({
                    isLocked: true,
                })
                .where(eq(commentTable.id, commentId));
        }

        if (moderationAction == "hide") {
            await tx
                .update(commentTable)
                .set({
                    isHidden: true,
                })
                .where(eq(commentTable.id, commentId));
        }
    });
}

interface FetchPostModerationProps {
    postSlugId: string;
    db: PostgresJsDatabase;
}

export async function fetchPostModeration({
    db,
    postSlugId,
}: FetchPostModerationProps): Promise<ModerationPropertiesPosts> {
    const moderationPostsTableResponse = await db
        .select({
            moderationAction: moderationPostsTable.moderationAction,
            moderationReason: moderationPostsTable.moderationReason,
            moderationExplanation: moderationPostsTable.moderationExplanation,
            moderationCreatedAt: moderationPostsTable.createdAt,
            moderationUpdatedAt: moderationPostsTable.updatedAt,
        })
        .from(moderationPostsTable)
        .innerJoin(postTable, eq(postTable.id, moderationPostsTable.postId))
        .where(eq(postTable.slugId, postSlugId));

    if (moderationPostsTableResponse.length != 1) {
        return {
            isModerated: false,
            moderationAction: undefined,
            moderationExplanation: undefined,
            moderationReason: undefined,
            createdAt: undefined,
            updatedAt: undefined,
        };
    } else {
        const response = moderationPostsTableResponse[0];
        return {
            isModerated: true,
            moderationAction: response.moderationAction,
            moderationExplanation: response.moderationExplanation ?? undefined,
            moderationReason: response.moderationReason,
            createdAt: response.moderationCreatedAt,
            updatedAt: response.moderationUpdatedAt,
        };
    }
}

interface FetchCommentModerationProps {
    commentSlugId: string;
    db: PostgresJsDatabase;
}

export async function fetchCommentModeration({
    db,
    commentSlugId,
}: FetchCommentModerationProps): Promise<zodModerationPropertiesComments> {
    const moderationTableResponse = await db
        .select({
            moderationAction: moderationCommentsTable.moderationAction,
            moderationReason: moderationCommentsTable.moderationReason,
            moderationExplanation:
                moderationCommentsTable.moderationExplanation,
        })
        .from(moderationCommentsTable)
        .innerJoin(
            commentTable,
            eq(commentTable.id, moderationCommentsTable.commentId),
        )
        .where(eq(commentTable.slugId, commentSlugId));

    if (moderationTableResponse.length != 1) {
        return {
            isModerated: false,
            moderationAction: undefined,
            moderationExplanation: undefined,
            moderationReason: undefined,
        };
    } else {
        const response = moderationTableResponse[0];
        return {
            isModerated: true,
            moderationAction: response.moderationAction,
            moderationExplanation: response.moderationExplanation ?? undefined,
            moderationReason: response.moderationReason,
        };
    }
}
