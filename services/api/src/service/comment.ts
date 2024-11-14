import { generateRandomSlugId } from "@/crypto.js";
import { commentContentTable, commentTable, commentProofTable, postTable } from "@/schema.js";
import type { CreateCommentResponse } from "@/shared/types/dto.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { desc, eq, sql } from "drizzle-orm";
import type { CommentItem, SlugId } from "@/shared/types/zod.js";
import { httpErrors, type HttpErrors } from "@fastify/sensible";
import { useCommonPost } from "./common.js";
import { MAX_LENGTH_COMMENT } from "@/shared/shared.js";
import { sanitizeHtmlBody } from "@/utils/htmlSanitization.js";

export async function fetchCommentsByPostSlugId(
    db: PostgresJsDatabase,
    postSlugId: SlugId): Promise<CommentItem[]> {

    const postId = await getPostIdFromPostSlugId(db, postSlugId);
    const results = await db
        .select({
            // comment payload
            commentSlugId: commentTable.slugId,
            createdAt: commentTable.createdAt,
            updatedAt: commentTable.updatedAt,
            comment: commentContentTable.content,
            numLikes: commentTable.numLikes,
            numDislikes: commentTable.numDislikes
        })
        .from(commentTable)
        .innerJoin(
            postTable,
            eq(postTable.id, postId)
        )
        .innerJoin(
            commentContentTable,
            eq(commentContentTable.id, commentTable.currentContentId)
        )
        .orderBy(desc(commentTable.createdAt))
        .where(
            eq(commentTable.postId, postId)
        );

    const commentItemList: CommentItem[] = [];
    results.map((commentResponse) => {
        const item: CommentItem = {
            comment: commentResponse.comment,
            commentSlugId: commentResponse.commentSlugId,
            createdAt: commentResponse.createdAt,
            numDislikes: commentResponse.numDislikes,
            numLikes: commentResponse.numLikes,
            updatedAt: commentResponse.updatedAt,
        };
        commentItemList.push(item);
    });
    return commentItemList;

    /*
    const actualLimit = limit ?? 30;
    const whereCreatedAt =
        createdAt === undefined
            ? eq(postTable.slugId, postSlugId)
            : order === "more"
                ? and(
                    eq(postTable.slugId, postSlugId),
                    gt(commentTable.createdAt, createdAt)
                )
                : and(
                    eq(postTable.slugId, postSlugId),
                    lt(commentTable.createdAt, createdAt)
                );
    if (userId === undefined) {
        const results = await db
            .selectDistinctOn([commentTable.createdAt, commentTable.id], {
                // comment payload
                commentSlugId: commentTable.slugId,
                isHidden: commentTable.isHidden,
                createdAt: commentTable.createdAt,
                updatedAt: commentTable.updatedAt,
                comment: commentContentTable.content,
                numLikes: commentTable.numLikes,
                numDislikes: commentTable.numDislikes,
            })
            .from(commentTable)
            .innerJoin(
                postTable,
                eq(postTable.id, commentTable.postId)
            )
            .innerJoin(
                commentContentTable,
                eq(commentContentTable.id, commentTable.currentContentId)
            )
            .orderBy(asc(commentTable.createdAt), desc(commentTable.id))
            .limit(actualLimit)
            .where(
                showHidden === true
                    ? whereCreatedAt
                    : and(whereCreatedAt, eq(commentTable.isHidden, false))
            );
        return results;
    } else {
        const results = await db
            .selectDistinctOn([commentTable.createdAt, commentTable.id], {
                commentSlugId: commentTable.slugId,
                isHidden: commentTable.isHidden,
                createdAt: commentTable.createdAt,
                updatedAt: commentTable.updatedAt,
                comment: commentContentTable.content,
                numLikes: commentTable.numLikes,
                numDislikes: commentTable.numDislikes,
                optionChosen: voteContentTable.optionChosen,
            })
            .from(commentTable)
            .innerJoin(
                postTable,
                eq(postTable.id, commentTable.postId)
            )
            .innerJoin(
                commentContentTable,
                eq(commentContentTable.id, commentTable.currentContentId)
            )
            .leftJoin(voteTable, and(eq(voteTable.authorId, userId), eq(voteTable.commentId, commentTable.id)))
            .leftJoin(voteContentTable, eq(voteContentTable.id, voteTable.currentContentId))
            .orderBy(asc(commentTable.createdAt), desc(commentTable.id))
            .limit(actualLimit)
            .where(
                showHidden === true
                    ? whereCreatedAt
                    : and(whereCreatedAt, eq(commentTable.isHidden, false))
            );
        return results.map((result) => {
            return {
                commentSlugId: result.commentSlugId,
                isHidden: result.isHidden,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt,
                comment: result.comment,
                numLikes: result.numLikes,
                numDislikes: result.numDislikes,
                optionChosen: toUnionUndefined(result.optionChosen),
            };
        });
    }
    */
}

async function getPostIdFromPostSlugId(
    db: PostgresJsDatabase,
    postSlugId: string): Promise<number> {

    const postTableResponse = await db
        .select({
            id: postTable.id,
        })
        .from(postTable)
        .where(eq(postTable.slugId, postSlugId));
    if (postTableResponse.length != 1) {
        throw httpErrors.notFound(
            "Failed to locate post slug ID: " + postSlugId
        );
    }

    const postId = postTableResponse[0].id;
    return postId;
}

interface PostNewCommentProps {
    db: PostgresJsDatabase,
    commentBody: string,
    postSlugId: string,
    userId: string,
    didWrite: string,
    authHeader: string,
    httpErrors: HttpErrors
}

export async function postNewComment({
    db,
    commentBody,
    postSlugId,
    userId,
    didWrite,
    authHeader,
    httpErrors }: PostNewCommentProps): Promise<CreateCommentResponse> {

    try {
        commentBody = sanitizeHtmlBody(commentBody, MAX_LENGTH_COMMENT);
    } catch (error) {
        if (error instanceof Error) {
            throw httpErrors.badRequest(error.message);
        } else {
            throw httpErrors.badRequest("Error while sanitizing request body");
        }
    }

    const { id: postId, contentId: postContentId } = await useCommonPost().getPostAndContentIdFromSlugId({
        db: db,
        postSlugId: postSlugId,
        httpErrors: httpErrors
    });
    if (postContentId == null) {
        throw httpErrors.gone("Cannot comment on a deleted post");
    }
    const commentSlugId = generateRandomSlugId();

    await db.transaction(async (tx) => {

        const insertCommentResponse = await tx.insert(commentTable).values({
            slugId: commentSlugId,
            authorId: userId,
            currentContentId: null,
            isHidden: false,
            postId: postId
        }).returning({ commentId: commentTable.id });

        const commentId = insertCommentResponse[0].commentId;

        const insertProofResponse = await tx.insert(commentProofTable).values({
            type: "creation",
            commentId: commentId,
            authorDid: didWrite,
            proof: authHeader,
            proofVersion: 1
        }).returning({ proofId: commentProofTable.id });

        const proofId = insertProofResponse[0].proofId;

        const commentContentTableResponse = await tx.insert(commentContentTable).values({
            commentProofId: proofId,
            commentId: commentId,
            postContentId: postContentId,
            parentId: null,
            content: commentBody
        }).returning({ commentContentTableId: commentContentTable.id });

        const commentContentTableId = commentContentTableResponse[0].commentContentTableId;

        await tx.update(commentTable).set({
            currentContentId: commentContentTableId,
        }).where(eq(commentTable.id, commentId));

        // Update comment count
        await db
            .update(postTable)
            .set({
                commentCount: sql`${postTable.commentCount} + 1`
            })
            .where(eq(postTable.slugId, postSlugId));

    });

    return {
        commentSlugId: commentSlugId
    };

}
