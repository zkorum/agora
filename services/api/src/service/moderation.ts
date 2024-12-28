import { commentTable, moderationTable, postTable } from "@/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonComment, useCommonPost } from "./common.js";
import type {
    ModerationAction,
    ModerationProperties,
    ModerationReason,
} from "@/shared/types/zod.js";
import { eq } from "drizzle-orm";

interface ModerateByPostSlugIdProps {
    postSlugId: string;
    db: PostgresJsDatabase;
    moderationAction: ModerationAction;
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
                .update(moderationTable)
                .set({
                    moderatorId: userId,
                    moderationAction: moderationAction,
                    moderationReason: moderationReason,
                    moderationExplanation: moderationExplanation,
                })
                .where(eq(moderationTable.postId, postDetails.id));
        } else {
            await tx.insert(moderationTable).values({
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
    moderationAction: ModerationAction;
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
                .update(moderationTable)
                .set({
                    moderatorId: userId,
                    moderationAction: moderationAction,
                    moderationReason: moderationReason,
                    moderationExplanation: moderationExplanation,
                })
                .where(eq(moderationTable.commentId, commentId));
        } else {
            await tx.insert(moderationTable).values({
                commentId: commentId,
                moderatorId: userId,
                moderationAction: moderationAction,
                moderationReason: moderationReason,
                moderationExplanation: moderationExplanation,
            });
        }

        await tx
            .update(commentTable)
            .set({
                isLocked: true,
            })
            .where(eq(commentTable.id, commentId));
    });
}

interface FetchPostModerationProps {
    postSlugId: string;
    db: PostgresJsDatabase;
}

export async function fetchPostModeration({
    db,
    postSlugId,
}: FetchPostModerationProps): Promise<ModerationProperties> {
    const moderationTableResponse = await db
        .select({
            moderationAction: moderationTable.moderationAction,
            moderationReason: moderationTable.moderationReason,
            moderationExplanation: moderationTable.moderationExplanation,
        })
        .from(moderationTable)
        .innerJoin(postTable, eq(postTable.id, moderationTable.postId))
        .where(eq(postTable.slugId, postSlugId));

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

interface FetchCommentModerationProps {
    commentSlugId: string;
    db: PostgresJsDatabase;
}

export async function fetchCommentModeration({
    db,
    commentSlugId,
}: FetchCommentModerationProps): Promise<ModerationProperties> {
    const moderationTableResponse = await db
        .select({
            moderationAction: moderationTable.moderationAction,
            moderationReason: moderationTable.moderationReason,
            moderationExplanation: moderationTable.moderationExplanation,
        })
        .from(moderationTable)
        .innerJoin(commentTable, eq(commentTable.id, moderationTable.commentId))
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
