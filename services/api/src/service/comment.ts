import { generateRandomSlugId } from "@/crypto.js";
import {
    commentContentTable,
    commentTable,
    commentProofTable,
    postTable,
    userTable,
} from "@/schema.js";
import type { CreateCommentResponse } from "@/shared/types/dto.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { desc, eq, sql, and } from "drizzle-orm";
import type { CommentItem, SlugId } from "@/shared/types/zod.js";
import { httpErrors, type HttpErrors } from "@fastify/sensible";
import { useCommonPost } from "./common.js";
import { MAX_LENGTH_COMMENT } from "@/shared/shared.js";
import { sanitizeHtmlBody } from "@/utils/htmlSanitization.js";
import { log } from "@/app.js";

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
            .select({ createdAt: commentTable.createdAt })
            .from(commentTable)
            .where(eq(commentTable.slugId, lastSlugId));
        if (selectResponse.length == 1) {
            lastCreatedAt = selectResponse[0].createdAt;
        } else {
            // Ignore the slug ID if it cannot be found
        }
    }

    return lastCreatedAt;
}

export async function fetchCommentsByPostSlugId(
    db: PostgresJsDatabase,
    postSlugId: SlugId,
): Promise<CommentItem[]> {
    const postId = await getPostIdFromPostSlugId(db, postSlugId);
    const results = await db
        .select({
            // comment payload
            commentSlugId: commentTable.slugId,
            createdAt: commentTable.createdAt,
            updatedAt: commentTable.updatedAt,
            comment: commentContentTable.content,
            numLikes: commentTable.numLikes,
            numDislikes: commentTable.numDislikes,
            username: userTable.username,
        })
        .from(commentTable)
        .innerJoin(postTable, eq(postTable.id, postId))
        .innerJoin(
            commentContentTable,
            eq(commentContentTable.id, commentTable.currentContentId),
        )
        .innerJoin(userTable, eq(userTable.id, commentTable.authorId))
        .orderBy(desc(commentTable.createdAt))
        .where(eq(commentTable.postId, postId));

    const commentItemList: CommentItem[] = [];
    results.map((commentResponse) => {
        const item: CommentItem = {
            comment: commentResponse.comment,
            commentSlugId: commentResponse.commentSlugId,
            createdAt: commentResponse.createdAt,
            numDislikes: commentResponse.numDislikes,
            numLikes: commentResponse.numLikes,
            updatedAt: commentResponse.updatedAt,
            username: commentResponse.username,
        };
        commentItemList.push(item);
    });
    return commentItemList;
}

async function getPostIdFromPostSlugId(
    db: PostgresJsDatabase,
    postSlugId: string,
): Promise<number> {
    const postTableResponse = await db
        .select({
            id: postTable.id,
        })
        .from(postTable)
        .where(eq(postTable.slugId, postSlugId));
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
    authHeader: string;
    httpErrors: HttpErrors;
}

export async function postNewComment({
    db,
    commentBody,
    postSlugId,
    userId,
    didWrite,
    authHeader,
    httpErrors,
}: PostNewCommentProps): Promise<CreateCommentResponse> {
    await useCommonPost().throwIfPostSlugIdIsLocked({
        postSlugId: postSlugId,
        db: db,
    });

    try {
        commentBody = sanitizeHtmlBody(commentBody, MAX_LENGTH_COMMENT);
    } catch (error) {
        if (error instanceof Error) {
            throw httpErrors.badRequest(error.message);
        } else {
            throw httpErrors.badRequest("Error while sanitizing request body");
        }
    }

    const { id: postId, contentId: postContentId } =
        await useCommonPost().getPostAndContentIdFromSlugId({
            db: db,
            postSlugId: postSlugId,
        });
    if (postContentId == null) {
        throw httpErrors.gone("Cannot comment on a deleted post");
    }
    const commentSlugId = generateRandomSlugId();

    await db.transaction(async (tx) => {
        const insertCommentResponse = await tx
            .insert(commentTable)
            .values({
                slugId: commentSlugId,
                authorId: userId,
                currentContentId: null,
                isHidden: false,
                postId: postId,
            })
            .returning({ commentId: commentTable.id });

        const commentId = insertCommentResponse[0].commentId;

        const insertProofResponse = await tx
            .insert(commentProofTable)
            .values({
                type: "creation",
                commentId: commentId,
                authorDid: didWrite,
                proof: authHeader,
                proofVersion: 1,
            })
            .returning({ proofId: commentProofTable.id });

        const proofId = insertProofResponse[0].proofId;

        const commentContentTableResponse = await tx
            .insert(commentContentTable)
            .values({
                commentProofId: proofId,
                commentId: commentId,
                postContentId: postContentId,
                parentId: null,
                content: commentBody,
            })
            .returning({ commentContentTableId: commentContentTable.id });

        const commentContentTableId =
            commentContentTableResponse[0].commentContentTableId;

        await tx
            .update(commentTable)
            .set({
                currentContentId: commentContentTableId,
            })
            .where(eq(commentTable.id, commentId));

        // Update the post's comment count
        await tx
            .update(postTable)
            .set({
                commentCount: sql`${postTable.commentCount} + 1`,
            })
            .where(eq(postTable.slugId, postSlugId));

        // Update the user profile's comment count
        await tx
            .update(userTable)
            .set({
                totalCommentCount: sql`${userTable.totalCommentCount} + 1`,
            })
            .where(eq(userTable.id, userId));
    });

    return {
        commentSlugId: commentSlugId,
    };
}

interface DeleteCommentBySlugIdProps {
    db: PostgresJsDatabase;
    commentSlugId: string;
    userId: string;
    authHeader: string;
    didWrite: string;
}

export async function deleteCommentBySlugId({
    db,
    commentSlugId,
    userId,
    authHeader,
    didWrite,
}: DeleteCommentBySlugIdProps): Promise<void> {
    try {
        await db.transaction(async (tx) => {
            const updatedCommentIdResponse = await tx
                .update(commentTable)
                .set({
                    currentContentId: null,
                })
                .where(
                    and(
                        eq(commentTable.authorId, userId),
                        eq(commentTable.slugId, commentSlugId),
                    ),
                )
                .returning({
                    updateCommentId: commentTable.id,
                    postId: commentTable.postId,
                });

            if (updatedCommentIdResponse.length != 1) {
                log.error(
                    "Invalid comment table update response length: " +
                        updatedCommentIdResponse.length.toString(),
                );
                tx.rollback();
            }

            const commentId = updatedCommentIdResponse[0].updateCommentId;

            await tx.insert(commentProofTable).values({
                type: "deletion",
                commentId: commentId,
                authorDid: didWrite,
                proof: authHeader,
                proofVersion: 1,
            });

            const postId = updatedCommentIdResponse[0].postId;

            await tx
                .update(postTable)
                .set({
                    commentCount: sql`${postTable.commentCount} - 1`,
                })
                .where(eq(postTable.id, postId));
        });
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Failed to delete comment by comment ID: " + commentSlugId,
        );
    }
}
