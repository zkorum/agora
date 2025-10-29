import {
    opinionTable,
    opinionModerationTable,
    conversationModerationTable,
    conversationTable,
} from "@/shared-backend/schema.js";
import { reconcileConversationCounters } from "@/shared-backend/conversationCounters.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonComment, useCommonPost } from "./common.js";
import type {
    OpinionModerationAction,
    ConversationModerationAction,
    OpinionModerationProperties,
    ConversationModerationProperties,
    ModerationReason,
} from "@/shared/types/zod.js";
import { eq } from "drizzle-orm";
import { nowZeroMs } from "@/shared/util.js";
import { httpErrors } from "@fastify/sensible";

interface ModerateByPostSlugIdProps {
    postSlugId: string;
    db: PostgresJsDatabase;
    moderationAction: ConversationModerationAction;
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
    const { getPostMetadataFromSlugId } = useCommonPost();
    const postDetails = await getPostMetadataFromSlugId({
        db: db,
        conversationSlugId: postSlugId,
    });

    const moderationStatus = await fetchModerationReportByPostSlugId({
        db: db,
        postSlugId: postSlugId,
    });

    if (moderationStatus.status == "moderated") {
        await db
            .update(conversationModerationTable)
            .set({
                authorId: userId,
                moderationAction: moderationAction,
                moderationReason: moderationReason,
                moderationExplanation: moderationExplanation,
                updatedAt: nowZeroMs(),
            })
            .where(
                eq(conversationModerationTable.conversationId, postDetails.id),
            );
    } else {
        await db.insert(conversationModerationTable).values({
            conversationId: postDetails.id,
            authorId: userId,
            moderationAction: moderationAction,
            moderationReason: moderationReason,
            moderationExplanation: moderationExplanation,
        });
    }
}

interface ModerateByCommentSlugIdProps {
    commentSlugId: string;
    db: PostgresJsDatabase;
    moderationAction: OpinionModerationAction;
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
}: ModerateByCommentSlugIdProps) {
    const { getOpinionMetadataFromOpinionSlugId } = useCommonComment();
    const { opinionId } = await getOpinionMetadataFromOpinionSlugId({
        db: db,
        opinionSlugId: commentSlugId,
    });

    const moderationStatus = await fetchModerationReportByCommentSlugId({
        db: db,
        commentSlugId: commentSlugId,
    });
    const { conversationId } = await getOpinionMetadataFromOpinionSlugId({
        db,
        opinionSlugId: commentSlugId,
    });

    await db.transaction(async (tx) => {
        if (moderationStatus.status == "moderated") {
            // Already moderated - just update the moderation record (no count change)
            await tx
                .update(opinionModerationTable)
                .set({
                    authorId: userId,
                    moderationAction: moderationAction,
                    moderationReason: moderationReason,
                    moderationExplanation: moderationExplanation,
                    updatedAt: nowZeroMs(),
                })
                .where(eq(opinionModerationTable.opinionId, opinionId));
        } else {
            // New moderation - insert record
            await tx.insert(opinionModerationTable).values({
                opinionId: opinionId,
                authorId: userId,
                moderationAction: moderationAction,
                moderationReason: moderationReason,
                moderationExplanation: moderationExplanation,
            });

            // Reconcile counters (automatically enqueues math update)
            // Moderation affects opinionCount, voteCount, and participantCount
            await reconcileConversationCounters({ db: tx, conversationId });
        }
    });
}

interface FetchModerationReportByPostSlugIdProps {
    postSlugId: string;
    db: PostgresJsDatabase;
}

export async function fetchModerationReportByPostSlugId({
    db,
    postSlugId,
}: FetchModerationReportByPostSlugIdProps): Promise<ConversationModerationProperties> {
    const moderationPostsTableResponse = await db
        .select({
            moderationAction: conversationModerationTable.moderationAction,
            moderationReason: conversationModerationTable.moderationReason,
            moderationExplanation:
                conversationModerationTable.moderationExplanation,
            moderationCreatedAt: conversationModerationTable.createdAt,
            moderationUpdatedAt: conversationModerationTable.updatedAt,
        })
        .from(conversationModerationTable)
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationModerationTable.conversationId,
            ),
        )
        .where(eq(conversationTable.slugId, postSlugId));

    if (moderationPostsTableResponse.length != 1) {
        return {
            status: "unmoderated",
        };
    } else {
        const response = moderationPostsTableResponse[0];
        return {
            status: "moderated",
            action: response.moderationAction,
            explanation: response.moderationExplanation ?? "",
            reason: response.moderationReason,
            createdAt: response.moderationCreatedAt,
            updatedAt: response.moderationUpdatedAt,
        };
    }
}

interface FetchModerationReportByCommentSlugIdProps {
    commentSlugId: string;
    db: PostgresJsDatabase;
}

export async function fetchModerationReportByCommentSlugId({
    db,
    commentSlugId,
}: FetchModerationReportByCommentSlugIdProps): Promise<OpinionModerationProperties> {
    const moderationTableResponse = await db
        .select({
            moderationAction: opinionModerationTable.moderationAction,
            moderationReason: opinionModerationTable.moderationReason,
            moderationExplanation: opinionModerationTable.moderationExplanation,
            moderationCreatedAt: opinionModerationTable.createdAt,
            moderationUpdatedAt: opinionModerationTable.updatedAt,
        })
        .from(opinionModerationTable)
        .innerJoin(
            opinionTable,
            eq(opinionTable.id, opinionModerationTable.opinionId),
        )
        .where(eq(opinionTable.slugId, commentSlugId));

    if (moderationTableResponse.length != 1) {
        return {
            status: "unmoderated",
        };
    } else {
        const response = moderationTableResponse[0];
        return {
            status: "moderated",
            action: response.moderationAction,
            explanation: response.moderationExplanation ?? "",
            reason: response.moderationReason,
            createdAt: response.moderationCreatedAt,
            updatedAt: response.moderationUpdatedAt,
        };
    }
}

interface WithdrawModerationReportByPostSlugIdProps {
    postSlugId: string;
    db: PostgresJsDatabase;
}

export async function withdrawModerationReportByPostSlugId({
    db,
    postSlugId,
}: WithdrawModerationReportByPostSlugIdProps) {
    const { getPostMetadataFromSlugId } = useCommonPost();
    const postDetails = await getPostMetadataFromSlugId({
        db: db,
        conversationSlugId: postSlugId,
    });

    const moderationPostTableResponse = await db
        .delete(conversationModerationTable)
        .where(eq(conversationModerationTable.conversationId, postDetails.id))
        .returning();

    if (moderationPostTableResponse.length != 1) {
        throw httpErrors.notFound(
            "Failed to delete report for post slug ID: " + postSlugId,
        );
    }
}

interface WithdrawModerationReportByCommentSlugIdProps {
    commentSlugId: string;
    db: PostgresJsDatabase;
}

export async function withdrawModerationReportByCommentSlugId({
    db,
    commentSlugId,
}: WithdrawModerationReportByCommentSlugIdProps) {
    const { getCommentIdFromCommentSlugId } = useCommonComment();
    const commentId = await getCommentIdFromCommentSlugId({
        db: db,
        commentSlugId: commentSlugId,
    });

    const { getOpinionMetadataFromOpinionSlugId } = useCommonComment();
    const { conversationId } = await getOpinionMetadataFromOpinionSlugId({
        db,
        opinionSlugId: commentSlugId,
    });

    await db.transaction(async (tx) => {
        const moderationCommentsTableResponse = await tx
            .delete(opinionModerationTable)
            .where(eq(opinionModerationTable.opinionId, commentId))
            .returning();

        if (moderationCommentsTableResponse.length != 1) {
            throw httpErrors.notFound(
                "Failed to delete moderation action for opinion slug ID: " +
                    commentSlugId,
            );
        }

        // Reconcile counters (automatically enqueues math update)
        // Removing moderation affects opinionCount, voteCount, and participantCount
        await reconcileConversationCounters({ db: tx, conversationId });
    });
}

export function createPostModerationPropertyObject(
    moderationAction: ConversationModerationAction | null,
    moderationExplanation: string | null,
    moderationReason: ModerationReason | null,
    moderationCreatedAt: Date | null,
    moderationUpdatedAt: Date | null,
) {
    let moderationProperties: ConversationModerationProperties = {
        status: "unmoderated",
    };

    if (
        moderationAction != null &&
        moderationExplanation != null &&
        moderationReason != null &&
        moderationCreatedAt != null &&
        moderationUpdatedAt != null
    ) {
        moderationProperties = {
            status: "moderated",
            action: moderationAction,
            explanation: moderationExplanation,
            reason: moderationReason,
            createdAt: moderationCreatedAt,
            updatedAt: moderationUpdatedAt,
        };
    }
    return moderationProperties;
}

export function createCommentModerationPropertyObject(
    moderationAction: OpinionModerationAction | null,
    moderationExplanation: string | null,
    moderationReason: ModerationReason | null,
    moderationCreatedAt: Date | null,
    moderationUpdatedAt: Date | null,
) {
    let moderationProperties: OpinionModerationProperties = {
        status: "unmoderated",
    };

    if (
        moderationAction != null &&
        moderationExplanation != null &&
        moderationReason != null &&
        moderationCreatedAt != null &&
        moderationUpdatedAt != null
    ) {
        moderationProperties = {
            status: "moderated",
            action: moderationAction,
            explanation: moderationExplanation,
            reason: moderationReason,
            createdAt: moderationCreatedAt,
            updatedAt: moderationUpdatedAt,
        };
    }
    return moderationProperties;
}
