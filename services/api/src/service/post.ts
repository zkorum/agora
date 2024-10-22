// Interact with a post
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import type { PostComment, SlugId } from "@/shared/types/zod.js";
import { commentContentTable, commentTable, masterProofTable, postContentTable, postTable, voteContentTable, voteTable } from "@/schema.js";
import { and, asc, desc, eq, gt, lt, isNull, sql } from "drizzle-orm";
import type { CreateNewPostResponse, FetchCommentsToVoteOn200 } from "@/shared/types/dto.js";
import type { HttpErrors } from "@fastify/sensible/lib/httpError.js";
import { toUnionUndefined } from "@/shared/shared.js";
import { generateRandomSlugId } from "@/crypto.js";
import { server } from "@/app.js";

interface FetchCommentsByPostIdProps {
    db: PostgresDatabase;
    postSlugId: SlugId;
    userId?: string;
    createdAt: Date | undefined;
    order: "more" | "recent";
    limit?: number;
    showHidden?: boolean;
}

interface FetchNextCommentsToVoteOn {
    db: PostgresDatabase;
    userId: string;
    postSlugId: SlugId;
    numberOfCommentsToFetch: number;
    httpErrors: HttpErrors;
}


interface CreateNewPost {
    db: PostgresDatabase;
    authorId: string;
    postTitle: string;
    postBody: string | null;
    didWrite: string;
    authHeader: string;
}

export async function fetchCommentsByPostSlugId({
    db,
    postSlugId,
    userId,
    order,
    showHidden,
    createdAt,
    limit,
}: FetchCommentsByPostIdProps): Promise<PostComment[]> {
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
            }
        });
    }
}

export async function fetchNextCommentsToVoteOn({
    db,
    userId,
    postSlugId,
    numberOfCommentsToFetch,
    httpErrors
}: FetchNextCommentsToVoteOn): Promise<FetchCommentsToVoteOn200> {
    if (numberOfCommentsToFetch > 15) {
        throw httpErrors.badRequest("The number of comments requested for voting cannot be above 15");
    }
    const results = await db
        .select({
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
        .leftJoin(
            voteTable,
            and(eq(voteTable.commentId, commentTable.id), eq(voteTable.authorId, userId))
        )
        .orderBy(sql`RANDOM()`)
        .limit(numberOfCommentsToFetch)
        .where(
            and(
                eq(commentTable.isHidden, false),
                eq(postTable.slugId, postSlugId),
                isNull(voteTable.currentContentId)
            )
        );
    return {
        assignedComments: results
    }
}

export async function createNewPost({
    db,
    postTitle,
    postBody,
    authorId,
    didWrite,
    authHeader
}: CreateNewPost): Promise<CreateNewPostResponse> {

    try {
        const postSlugId = generateRandomSlugId();

        await db.transaction(async (tx) => {

            const postInsertResponse = await tx.insert(postTable).values({
                authorId: authorId,
                slugId: postSlugId, 
                commentCount: 0,
                currentContentId: null,
                isHidden: false,
                lastReactedAt: new Date()
            }).returning({ postId: postTable.id });

            const postId = postInsertResponse[0].postId;

            const masterProofTableResponse = await tx.insert(masterProofTable).values({
                type: "creation",
                authorDid: didWrite,
                proof: authHeader,
                proofVersion: 0
            }).returning({ proofId: masterProofTable.id });

            const proofId = masterProofTableResponse[0].proofId;

            await tx.insert(postContentTable).values({
                postId: postId,
                postProofId: proofId,
                parentId: null,
                title: postTitle,
                body: postBody,
                pollId: null
            });
        });

        return {
            isSuccessful: true,
            postSlugId: postSlugId
        }

    } catch (err: unknown) {
        server.log.error(err);
        return {
            isSuccessful: false
        }
    }
}