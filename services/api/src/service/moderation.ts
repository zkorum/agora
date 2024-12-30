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
    ModerationPropertiesComments,
    ModerationPropertiesPosts,
    ModerationReason,
} from "@/shared/types/zod.js";
import { eq } from "drizzle-orm";
import { nowZeroMs } from "@/shared/common/util.js";
import { httpErrors } from "@fastify/sensible";

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

    if (moderationStatus.moderationStatus == "moderated") {
        await db
            .update(moderationPostsTable)
            .set({
                moderatorId: userId,
                moderationAction: moderationAction,
                moderationReason: moderationReason,
                moderationExplanation: moderationExplanation,
                updatedAt: nowZeroMs(),
            })
            .where(eq(moderationPostsTable.postId, postDetails.id));
    } else {
        await db.insert(moderationPostsTable).values({
            postId: postDetails.id,
            moderatorId: userId,
            moderationAction: moderationAction,
            moderationReason: moderationReason,
            moderationExplanation: moderationExplanation,
        });
    }
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
        if (moderationStatus.moderationStatus == "moderated") {
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
            moderationStatus: "unmoderated",
        };
    } else {
        const response = moderationPostsTableResponse[0];
        return {
            moderationStatus: "moderated",
            moderationAction: response.moderationAction,
            moderationExplanation: response.moderationExplanation ?? "",
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
}: FetchCommentModerationProps): Promise<ModerationPropertiesComments> {
    const moderationTableResponse = await db
        .select({
            moderationAction: moderationCommentsTable.moderationAction,
            moderationReason: moderationCommentsTable.moderationReason,
            moderationExplanation:
                moderationCommentsTable.moderationExplanation,
            moderationCreatedAt: moderationCommentsTable.createdAt,
            moderationUpdatedAt: moderationCommentsTable.updatedAt,
        })
        .from(moderationCommentsTable)
        .innerJoin(
            commentTable,
            eq(commentTable.id, moderationCommentsTable.commentId),
        )
        .where(eq(commentTable.slugId, commentSlugId));

    if (moderationTableResponse.length != 1) {
        return {
            moderationStatus: "unmoderated",
        };
    } else {
        const response = moderationTableResponse[0];
        return {
            moderationStatus: "moderated",
            moderationAction: response.moderationAction,
            moderationExplanation: response.moderationExplanation ?? "",
            moderationReason: response.moderationReason,
            createdAt: response.moderationCreatedAt,
            updatedAt: response.moderationUpdatedAt,
        };
    }
}

interface ModerationCancelPostReportProps {
    postSlugId: string;
    db: PostgresJsDatabase;
}

export async function moderationCancelPostReport({
    db,
    postSlugId,
}: ModerationCancelPostReportProps) {
    const { getPostAndContentIdFromSlugId } = useCommonPost();
    const postDetails = await getPostAndContentIdFromSlugId({
        db: db,
        postSlugId: postSlugId,
    });

    const moderationPostTableResponse = await db
        .delete(moderationPostsTable)
        .where(eq(moderationPostsTable.postId, postDetails.id))
        .returning();

    if (moderationPostTableResponse.length != 1) {
        throw httpErrors.notFound(
            "Failed to delete report for post slug ID: " + postSlugId,
        );
    }
}

interface ModerationCancelCommentReportProps {
    commentSlugId: string;
    db: PostgresJsDatabase;
}

export async function moderationCancelCommentReport({
    db,
    commentSlugId,
}: ModerationCancelCommentReportProps) {
    const { getCommentIdFromCommentSlugId } = useCommonComment();
    const commentId = await getCommentIdFromCommentSlugId({
        db: db,
        commentSlugId: commentSlugId,
    });

    const moderationCommentsTableResponse = await db
        .delete(moderationCommentsTable)
        .where(eq(moderationCommentsTable.commentId, commentId))
        .returning();

    if (moderationCommentsTableResponse.length != 1) {
        throw httpErrors.notFound(
            "Failed to delete report for comment slug ID: " + commentSlugId,
        );
    }
}

export function createPostModerationPropertyObject(
    moderationAction: ModerationActionPosts | null,
    moderationExplanation: string | null,
    moderationReason: ModerationReason | null,
    moderationCreatedAt: Date | null,
    moderationUpdatedAt: Date | null,
) {
    let moderationProperties: ModerationPropertiesPosts = {
        moderationStatus: "unmoderated",
    };

    if (
        moderationAction != null &&
        moderationExplanation != null &&
        moderationReason != null &&
        moderationCreatedAt != null &&
        moderationUpdatedAt != null
    ) {
        moderationProperties = {
            moderationStatus: "moderated",
            moderationAction: moderationAction,
            moderationExplanation: moderationExplanation,
            moderationReason: moderationReason,
            createdAt: moderationCreatedAt,
            updatedAt: moderationUpdatedAt,
        };
    }
    return moderationProperties;
}

export function createCommentModerationPropertyObject(
    moderationAction: ModerationActionComments | null,
    moderationExplanation: string | null,
    moderationReason: ModerationReason | null,
    moderationCreatedAt: Date | null,
    moderationUpdatedAt: Date | null,
) {
    let moderationProperties: ModerationPropertiesComments = {
        moderationStatus: "unmoderated",
    };

    if (
        moderationAction != null &&
        moderationExplanation != null &&
        moderationReason != null &&
        moderationCreatedAt != null &&
        moderationUpdatedAt != null
    ) {
        moderationProperties = {
            moderationStatus: "moderated",
            moderationAction: moderationAction,
            moderationExplanation: moderationExplanation,
            moderationReason: moderationReason,
            createdAt: moderationCreatedAt,
            updatedAt: moderationUpdatedAt,
        };
    }
    return moderationProperties;
}
