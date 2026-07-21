import {
    opinionTable,
    opinionModerationTable,
    conversationModerationTable,
    conversationTable,
} from "@/shared-backend/schema.js";
import { scheduleConversationAnalysisRefresh } from "@/shared-backend/conversationCounters.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonComment, useCommonPost } from "./common.js";
import type {
    OpinionModerationAction,
    ConversationModerationAction,
    OpinionModerationProperties,
    ConversationModerationProperties,
    ModerationReason,
} from "@/shared/types/zod.js";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { nowZeroMs } from "@/shared/util.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import { cancelPendingOpinionTranslationWorkForOpinion } from "@/shared-backend/contentTranslationWork.js";

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
                and(
                    eq(
                        conversationModerationTable.conversationId,
                        postDetails.id,
                    ),
                    isNull(conversationModerationTable.deletedAt),
                ),
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
    isSiteModerator: boolean;
}

export async function moderateByCommentSlugId({
    commentSlugId,
    db,
    moderationReason,
    userId,
    moderationExplanation,
    moderationAction,
    isSiteModerator,
}: ModerateByCommentSlugIdProps) {
    const { getOpinionMetadataFromOpinionSlugId } = useCommonComment();
    const { opinionId, conversationId } =
        await getOpinionMetadataFromOpinionSlugId({
            db: db,
            opinionSlugId: commentSlugId,
        });

    await db.transaction(async (tx) => {
        const now = nowZeroMs();
        const moderationRows = await tx
            .select({
                id: opinionModerationTable.id,
                moderationAction: opinionModerationTable.moderationAction,
            })
            .from(opinionModerationTable)
            .where(
                and(
                    eq(opinionModerationTable.opinionId, opinionId),
                    isNull(opinionModerationTable.deletedAt),
                ),
            )
            .limit(1);

        const existingModeration = moderationRows.at(0);
        if (existingModeration !== undefined) {
            if (
                existingModeration.moderationAction === "hide" &&
                !isSiteModerator
            ) {
                throw httpErrors.forbidden(
                    "Only site moderators can modify hidden opinions",
                );
            }

            // Already moderated - just update the moderation record (no count change)
            await tx
                .update(opinionModerationTable)
                .set({
                    authorId: userId,
                    moderationAction: moderationAction,
                    moderationReason: moderationReason,
                    moderationExplanation: moderationExplanation,
                    updatedAt: now,
                })
                .where(eq(opinionModerationTable.id, existingModeration.id));
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
            await scheduleConversationAnalysisRefresh({
                db: tx,
                conversationId,
                log,
            });
        }

        if (moderationAction === "hide") {
            await cancelPendingOpinionTranslationWorkForOpinion({
                db: tx,
                opinionId,
                now,
            });
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
        .where(
            and(
                eq(conversationTable.slugId, postSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                isNull(conversationModerationTable.deletedAt),
            ),
        );

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
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, opinionTable.conversationId),
        )
        .where(
            and(
                eq(opinionTable.slugId, commentSlugId),
                isNotNull(opinionTable.currentContentId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                isNull(opinionModerationTable.deletedAt),
            ),
        );

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
        .update(conversationModerationTable)
        .set({ deletedAt: nowZeroMs(), updatedAt: nowZeroMs() })
        .where(
            and(
                eq(conversationModerationTable.conversationId, postDetails.id),
                isNull(conversationModerationTable.deletedAt),
            ),
        )
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
    isSiteModerator: boolean;
}

export async function withdrawModerationReportByCommentSlugId({
    db,
    commentSlugId,
    isSiteModerator,
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
        const moderationRows = await tx
            .select({
                id: opinionModerationTable.id,
                moderationAction: opinionModerationTable.moderationAction,
            })
            .from(opinionModerationTable)
            .where(
                and(
                    eq(opinionModerationTable.opinionId, commentId),
                    isNull(opinionModerationTable.deletedAt),
                ),
            )
            .limit(1);

        if (moderationRows.length !== 1) {
            throw httpErrors.notFound(
                "Failed to delete moderation action for opinion slug ID: " +
                    commentSlugId,
            );
        }

        const moderation = moderationRows[0];
        if (moderation.moderationAction === "hide" && !isSiteModerator) {
            throw httpErrors.forbidden(
                "Only site moderators can withdraw hidden opinions",
            );
        }

        const moderationCommentsTableResponse = await tx
            .update(opinionModerationTable)
            .set({ deletedAt: nowZeroMs(), updatedAt: nowZeroMs() })
            .where(
                and(
                    eq(opinionModerationTable.id, moderation.id),
                    isNull(opinionModerationTable.deletedAt),
                ),
            )
            .returning();

        if (moderationCommentsTableResponse.length != 1) {
            throw httpErrors.notFound(
                "Failed to delete moderation action for opinion slug ID: " +
                    commentSlugId,
            );
        }

        // Reconcile counters (automatically enqueues math update)
        // Removing moderation affects opinionCount, voteCount, and participantCount
        await scheduleConversationAnalysisRefresh({
            db: tx,
            conversationId,
            log,
        });
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
        moderationReason != null &&
        moderationCreatedAt != null &&
        moderationUpdatedAt != null
    ) {
        moderationProperties = {
            status: "moderated",
            action: moderationAction,
            explanation: moderationExplanation ?? "",
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
        moderationReason != null &&
        moderationCreatedAt != null &&
        moderationUpdatedAt != null
    ) {
        moderationProperties = {
            status: "moderated",
            action: moderationAction,
            explanation: moderationExplanation ?? "",
            reason: moderationReason,
            createdAt: moderationCreatedAt,
            updatedAt: moderationUpdatedAt,
        };
    }
    return moderationProperties;
}
