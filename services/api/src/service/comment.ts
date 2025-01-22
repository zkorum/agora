import { generateRandomSlugId } from "@/crypto.js";
import {
    opinionContentTable,
    opinionTable,
    opinionProofTable,
    conversationTable,
    userTable,
    opinionModerationTable,
    userNotificationTable,
    notificationMessageNewOpinionTable,
} from "@/schema.js";
import type {
    CreateCommentResponse,
    GetOpinionBySlugIdListResponse,
} from "@/shared/types/dto.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { desc, eq, sql, and, isNull, isNotNull, ne, SQL } from "drizzle-orm";
import type { OpinionItem, SlugId } from "@/shared/types/zod.js";
import { httpErrors, type HttpErrors } from "@fastify/sensible";
import { useCommonPost } from "./common.js";
import { MAX_LENGTH_COMMENT } from "@/shared/shared.js";
import { sanitizeHtmlBody } from "@/utils/htmlSanitization.js";
import { log } from "@/app.js";
import { createCommentModerationPropertyObject } from "./moderation.js";
import { getUserMutePreferences } from "./muteUser.js";

interface GetCommentSlugIdLastCreatedAtProps {
    lastSlugId: string | undefined;
    db: PostgresJsDatabase;
}

export async function getCommentSlugIdLastCreatedAt({
    lastSlugId,
    db,
}: GetCommentSlugIdLastCreatedAtProps) {
    let lastCreatedAt = new Date();

    if (lastSlugId) {
        const selectResponse = await db
            .select({ createdAt: opinionTable.createdAt })
            .from(opinionTable)
            .where(eq(opinionTable.slugId, lastSlugId));
        if (selectResponse.length == 1) {
            lastCreatedAt = selectResponse[0].createdAt;
        } else {
            // Ignore the slug ID if it cannot be found
        }
    }

    return lastCreatedAt;
}

interface FetchCommentsByPostSlugIdProps {
    db: PostgresJsDatabase;
    postSlugId: SlugId;
    fetchTarget: "moderated" | "new" | "hidden";
    personalizationUserId?: string;
}

export async function fetchCommentsByPostSlugId({
    db,
    postSlugId,
    fetchTarget,
    personalizationUserId,
}: FetchCommentsByPostSlugIdProps): Promise<OpinionItem[]> {
    const postId = await getPostIdFromPostSlugId(db, postSlugId);

    let whereClause: SQL | undefined = eq(opinionTable.conversationId, postId);

    if (fetchTarget == "moderated") {
        whereClause = and(
            whereClause,
            ne(opinionModerationTable.moderationAction, "hide"),
            isNotNull(opinionModerationTable.id),
        );
    } else if (fetchTarget == "new") {
        whereClause = and(whereClause, isNull(opinionModerationTable.id));
    } else {
        whereClause = and(
            whereClause,
            eq(opinionModerationTable.moderationAction, "hide"),
            isNotNull(opinionModerationTable.id),
        );
    }

    const results = await db
        .select({
            // comment payload
            commentSlugId: opinionTable.slugId,
            createdAt: opinionTable.createdAt,
            updatedAt: opinionTable.updatedAt,
            comment: opinionContentTable.content,
            numLikes: opinionTable.numAgrees,
            numDislikes: opinionTable.numDisagrees,
            username: userTable.username,
            moderationAction: opinionModerationTable.moderationAction,
            moderationExplanation: opinionModerationTable.moderationExplanation,
            moderationReason: opinionModerationTable.moderationReason,
            moderationCreatedAt: opinionModerationTable.createdAt,
            moderationUpdatedAt: opinionModerationTable.updatedAt,
        })
        .from(opinionTable)
        .innerJoin(conversationTable, eq(conversationTable.id, postId))
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.id, opinionTable.currentContentId),
        )
        .leftJoin(
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, opinionTable.id),
        )
        .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .orderBy(desc(opinionTable.createdAt))
        .where(whereClause);

    let commentItemList: OpinionItem[] = [];
    results.map((commentResponse) => {
        const moderationProperties = createCommentModerationPropertyObject(
            commentResponse.moderationAction,
            commentResponse.moderationExplanation,
            commentResponse.moderationReason,
            commentResponse.moderationCreatedAt,
            commentResponse.moderationUpdatedAt,
        );

        const item: OpinionItem = {
            opinion: commentResponse.comment,
            opinionSlugId: commentResponse.commentSlugId,
            createdAt: commentResponse.createdAt,
            numDisagrees: commentResponse.numDislikes,
            numAgrees: commentResponse.numLikes,
            updatedAt: commentResponse.updatedAt,
            username: commentResponse.username,
            moderation: moderationProperties,
        };
        commentItemList.push(item);
    });

    if (personalizationUserId) {
        const mutedUserItems = await getUserMutePreferences({
            db: db,
            userId: personalizationUserId,
        });

        commentItemList = commentItemList.filter((commentItem) => {
            for (const muteItem of mutedUserItems) {
                if (muteItem.username == commentItem.username) {
                    return false;
                }
            }
            return true;
        });
    }

    return commentItemList;
}

interface FetchOpinionsByOpinionSlugIdListProps {
    db: PostgresJsDatabase;
    opinionSlugIdList: SlugId[];
}

export async function fetchOpinionsByOpinionSlugIdList({
    db,
    opinionSlugIdList,
}: FetchOpinionsByOpinionSlugIdListProps): Promise<GetOpinionBySlugIdListResponse> {
    const opinionItemList: OpinionItem[] = [];

    for (const opinionSlugId of opinionSlugIdList) {
        const results = await db
            .select({
                // comment payload
                commentSlugId: opinionTable.slugId,
                createdAt: opinionTable.createdAt,
                updatedAt: opinionTable.updatedAt,
                comment: opinionContentTable.content,
                numLikes: opinionTable.numAgrees,
                numDislikes: opinionTable.numDisagrees,
                username: userTable.username,
                moderationAction: opinionModerationTable.moderationAction,
                moderationExplanation:
                    opinionModerationTable.moderationExplanation,
                moderationReason: opinionModerationTable.moderationReason,
                moderationCreatedAt: opinionModerationTable.createdAt,
                moderationUpdatedAt: opinionModerationTable.updatedAt,
            })
            .from(opinionTable)
            .innerJoin(
                conversationTable,
                eq(conversationTable.id, opinionTable.conversationId),
            )
            .innerJoin(
                opinionContentTable,
                eq(opinionContentTable.id, opinionTable.currentContentId),
            )
            .leftJoin(
                opinionModerationTable,
                eq(opinionModerationTable.opinionId, opinionTable.id),
            )
            .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
            .orderBy(desc(opinionTable.createdAt))
            .where(eq(opinionTable.slugId, opinionSlugId));

        results.map((commentResponse) => {
            const moderationProperties = createCommentModerationPropertyObject(
                commentResponse.moderationAction,
                commentResponse.moderationExplanation,
                commentResponse.moderationReason,
                commentResponse.moderationCreatedAt,
                commentResponse.moderationUpdatedAt,
            );

            const item: OpinionItem = {
                opinion: commentResponse.comment,
                opinionSlugId: commentResponse.commentSlugId,
                createdAt: commentResponse.createdAt,
                numDisagrees: commentResponse.numDislikes,
                numAgrees: commentResponse.numLikes,
                updatedAt: commentResponse.updatedAt,
                username: commentResponse.username,
                moderation: moderationProperties,
            };
            opinionItemList.push(item);
        });
    }

    return opinionItemList;
}

async function getPostIdFromPostSlugId(
    db: PostgresJsDatabase,
    postSlugId: string,
): Promise<number> {
    const postTableResponse = await db
        .select({
            id: conversationTable.id,
        })
        .from(conversationTable)
        .where(eq(conversationTable.slugId, postSlugId));
    if (postTableResponse.length != 1) {
        throw httpErrors.notFound(
            "Failed to locate post slug ID: " + postSlugId,
        );
    }

    const postId = postTableResponse[0].id;
    return postId;
}

interface PostNewCommentProps {
    db: PostgresJsDatabase;
    commentBody: string;
    postSlugId: string;
    userId: string;
    didWrite: string;
    proof: string;
    httpErrors: HttpErrors;
}

export async function postNewOpinion({
    db,
    commentBody,
    postSlugId,
    userId,
    didWrite,
    proof,
    httpErrors,
}: PostNewCommentProps): Promise<CreateCommentResponse> {
    const isLocked = await useCommonPost().isPostSlugIdLocked({
        postSlugId: postSlugId,
        db: db,
    });

    if (isLocked) {
        return {
            success: false,
            reason: "conversation_locked",
        };
    }

    try {
        commentBody = sanitizeHtmlBody(commentBody, MAX_LENGTH_COMMENT);
    } catch (error) {
        if (error instanceof Error) {
            throw httpErrors.badRequest(error.message);
        } else {
            throw httpErrors.badRequest("Error while sanitizing request body");
        }
    }

    const {
        id: postId,
        contentId: postContentId,
        authorId: postAuthorId,
    } = await useCommonPost().getPostMetadataFromSlugId({
        db: db,
        postSlugId: postSlugId,
    });
    if (postContentId == null) {
        throw httpErrors.gone("Cannot comment on a deleted post");
    }
    const commentSlugId = generateRandomSlugId();

    await db.transaction(async (tx) => {
        const insertCommentResponse = await tx
            .insert(opinionTable)
            .values({
                slugId: commentSlugId,
                authorId: userId,
                currentContentId: null,
                conversationId: postId,
            })
            .returning({ commentId: opinionTable.id });

        const commentId = insertCommentResponse[0].commentId;

        const insertProofResponse = await tx
            .insert(opinionProofTable)
            .values({
                type: "creation",
                opinionId: commentId,
                authorDid: didWrite,
                proof: proof,
                proofVersion: 1,
            })
            .returning({ proofId: opinionProofTable.id });

        const proofId = insertProofResponse[0].proofId;

        const commentContentTableResponse = await tx
            .insert(opinionContentTable)
            .values({
                opinionProofId: proofId,
                opinionId: commentId,
                conversationContentId: postContentId,
                parentId: null,
                content: commentBody,
            })
            .returning({ commentContentTableId: opinionContentTable.id });

        const commentContentTableId =
            commentContentTableResponse[0].commentContentTableId;

        await tx
            .update(opinionTable)
            .set({
                currentContentId: commentContentTableId,
            })
            .where(eq(opinionTable.id, commentId));

        // Update the post's comment count
        await tx
            .update(conversationTable)
            .set({
                opinionCount: sql`${conversationTable.opinionCount} + 1`,
            })
            .where(eq(conversationTable.slugId, postSlugId));

        // Update the user profile's comment count
        await tx
            .update(userTable)
            .set({
                totalOpinionCount: sql`${userTable.totalOpinionCount} + 1`,
            })
            .where(eq(userTable.id, userId));

        // Create notification for the conversation owner
        const userNotificationTableResponse = await tx
            .insert(userNotificationTable)
            .values({
                userId: postAuthorId,
                notificationType: "new_opinion",
            })
            .returning({
                userNotificationId: userNotificationTable.id,
            });

        const userNotificationId =
            userNotificationTableResponse[0].userNotificationId;

        await tx.insert(notificationMessageNewOpinionTable).values({
            userNotificationId: userNotificationId,
            userId: userId,
            opinionId: commentId,
            conversationId: postId,
        });
    });

    return {
        success: true,
        opinionSlugId: commentSlugId,
    };
}

interface DeleteCommentBySlugIdProps {
    db: PostgresJsDatabase;
    opinionSlugId: string;
    userId: string;
    proof: string;
    didWrite: string;
}

export async function deleteOpinionBySlugId({
    db,
    opinionSlugId,
    userId,
    proof,
    didWrite,
}: DeleteCommentBySlugIdProps): Promise<void> {
    try {
        await db.transaction(async (tx) => {
            const updatedCommentIdResponse = await tx
                .update(opinionTable)
                .set({
                    currentContentId: null,
                })
                .where(
                    and(
                        eq(opinionTable.authorId, userId),
                        eq(opinionTable.slugId, opinionSlugId),
                    ),
                )
                .returning({
                    updateCommentId: opinionTable.id,
                    postId: opinionTable.conversationId,
                });

            if (updatedCommentIdResponse.length != 1) {
                log.error(
                    "Invalid comment table update response length: " +
                        updatedCommentIdResponse.length.toString(),
                );
                tx.rollback();
            }

            const commentId = updatedCommentIdResponse[0].updateCommentId;

            await tx.insert(opinionProofTable).values({
                type: "deletion",
                opinionId: commentId,
                authorDid: didWrite,
                proof: proof,
                proofVersion: 1,
            });

            const postId = updatedCommentIdResponse[0].postId;

            await tx
                .update(conversationTable)
                .set({
                    opinionCount: sql`${conversationTable.opinionCount} - 1`,
                })
                .where(eq(conversationTable.id, postId));
        });
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Failed to delete comment by comment ID: " + opinionSlugId,
        );
    }
}
