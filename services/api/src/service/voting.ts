import {
    commentTable,
    postTable,
    voteContentTable,
    voteProofTable,
    voteTable,
} from "@/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, sql, and } from "drizzle-orm";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import type { VotingAction } from "@/shared/types/zod.js";
import type { FetchUserVotesForPostSlugIdsResponse } from "@/shared/types/dto.js";
import { useCommonComment, useCommonPost } from "./common.js";

interface GetCommentIdAndContentIdFromCommentSlugIdProps {
    db: PostgresJsDatabase;
    commentSlugId: string;
}

interface GetCommentIdAndContentIdFromCommentSlugIdReturn {
    commentId: number;
    contentId: number;
}

async function getCommentIdAndContentIdFromCommentSlugId({
    db,
    commentSlugId,
}: GetCommentIdAndContentIdFromCommentSlugIdProps): Promise<GetCommentIdAndContentIdFromCommentSlugIdReturn> {
    const response = await db
        .select({
            commentId: commentTable.id,
            contentId: commentTable.currentContentId,
        })
        .from(commentTable)
        .where(eq(commentTable.slugId, commentSlugId));
    if (response.length == 1) {
        const commentData = response[0];
        if (commentData.contentId == null) {
            throw httpErrors.notFound("Failed to locate comment content ID");
        } else {
            return {
                commentId: commentData.commentId,
                contentId: commentData.contentId,
            };
        }
    } else {
        throw httpErrors.internalServerError(
            "Database error while fetching comment ID from comment slug ID",
        );
    }
}

interface CastVoteForCommentSlugIdProps {
    db: PostgresJsDatabase;
    commentSlugId: string;
    userId: string;
    didWrite: string;
    authHeader: string;
    votingAction: VotingAction;
}

export async function castVoteForCommentSlugId({
    db,
    userId,
    commentSlugId,
    didWrite,
    authHeader,
    votingAction,
}: CastVoteForCommentSlugIdProps) {
    {
        const postSlugId =
            await useCommonComment().getPostSlugIdFromCommentSlugId({
                commentSlugId: commentSlugId,
                db: db,
            });

        await useCommonPost().throwIfPostSlugIdIsLocked({
            db: db,
            postSlugId: postSlugId,
        });
    }

    const commentData = await getCommentIdAndContentIdFromCommentSlugId({
        db: db,
        commentSlugId: commentSlugId,
    });

    const existingVoteTableResponse = await db
        .select({
            optionChosen: voteContentTable.optionChosen,
            voteTableId: voteTable.id,
        })
        .from(voteTable)
        .leftJoin(
            voteContentTable,
            eq(voteContentTable.id, voteTable.currentContentId),
        )
        .where(
            and(
                eq(voteTable.authorId, userId),
                eq(voteTable.commentId, commentData.commentId),
            ),
        );

    let numLikesDiff = 0;
    let numDislikesDiff = 0;

    if (existingVoteTableResponse.length == 0) {
        // No existing vote
        if (votingAction == "cancel") {
            throw httpErrors.badRequest(
                "Cannot cancel a vote that does not exist",
            );
        } else {
            if (votingAction == "like") {
                numLikesDiff = 1;
            } else {
                numDislikesDiff = 1;
            }
        }
    } else if (existingVoteTableResponse.length == 1) {
        const existingResponse = existingVoteTableResponse[0].optionChosen;
        if (existingResponse == "like") {
            if (votingAction == "like") {
                throw httpErrors.badRequest(
                    "User already liked the target comment",
                );
            } else if (votingAction == "cancel") {
                numLikesDiff = -1;
            } else {
                numDislikesDiff = 1;
                numLikesDiff = -1;
            }
        } else if (existingResponse == "dislike") {
            if (votingAction == "dislike") {
                throw httpErrors.badRequest(
                    "User already disliked the target comment",
                );
            } else if (votingAction == "cancel") {
                numDislikesDiff = -1;
            } else {
                numDislikesDiff = -1;
                numLikesDiff = 1;
            }
        } else {
            // null case meaning user cancelled
            if (votingAction == "like") {
                numLikesDiff = 1;
            } else {
                numDislikesDiff = 1;
            }
        }
    } else {
        throw httpErrors.internalServerError("Database relation error");
    }

    try {
        await db.transaction(async (tx) => {
            let voteTableId = 0;

            if (existingVoteTableResponse.length == 0) {
                // There are no votes yet
                const voteTableResponse = await tx
                    .insert(voteTable)
                    .values({
                        authorId: userId,
                        commentId: commentData.commentId,
                        currentContentId: null,
                    })
                    .returning({ voteTableId: voteTable.id });
                voteTableId = voteTableResponse[0].voteTableId;
            } else {
                if (votingAction == "cancel") {
                    await tx
                        .update(voteTable)
                        .set({
                            currentContentId: null,
                        })
                        .where(
                            eq(
                                voteTable.id,
                                existingVoteTableResponse[0].voteTableId,
                            ),
                        );
                }

                voteTableId = existingVoteTableResponse[0].voteTableId;
            }

            const voteProofTableResponse = await tx
                .insert(voteProofTable)
                .values({
                    type: votingAction == "cancel" ? "deletion" : "creation",
                    voteId: voteTableId,
                    authorDid: didWrite,
                    proof: authHeader,
                    proofVersion: 1,
                })
                .returning({ voteProofTableId: voteProofTable.id });

            const voteProofTableId = voteProofTableResponse[0].voteProofTableId;

            if (votingAction != "cancel") {
                const voteContentTableResponse = await tx
                    .insert(voteContentTable)
                    .values({
                        voteId: voteTableId,
                        voteProofId: voteProofTableId,
                        commentContentId: commentData.contentId,
                        optionChosen:
                            votingAction == "like" ? "like" : "dislike",
                    })
                    .returning({ voteContentTableId: voteContentTable.id });

                const voteContentTableId =
                    voteContentTableResponse[0].voteContentTableId;

                await tx
                    .update(voteTable)
                    .set({
                        currentContentId: voteContentTableId,
                    })
                    .where(eq(voteTable.id, voteTableId));
            }

            await tx
                .update(commentTable)
                .set({
                    numLikes: sql`${commentTable.numLikes} + ${numLikesDiff}`,
                    numDislikes: sql`${commentTable.numDislikes} + ${numDislikesDiff}`,
                })
                .where(
                    eq(commentTable.currentContentId, commentData.contentId),
                );
        });
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while casting new vote",
        );
    }
}

interface GetUserVotesForPostSlugIdsProps {
    db: PostgresJsDatabase;
    postSlugIdList: string[];
    userId: string;
}

export async function getUserVotesForPostSlugIds({
    db,
    postSlugIdList,
    userId,
}: GetUserVotesForPostSlugIdsProps): Promise<FetchUserVotesForPostSlugIdsResponse> {
    const userVoteList: FetchUserVotesForPostSlugIdsResponse = [];

    for (const postSlugId of postSlugIdList) {
        const userResponses = await db
            .select({
                optionChosen: voteContentTable.optionChosen,
                commentSlugId: commentTable.slugId,
            })
            .from(voteTable)
            .innerJoin(
                voteContentTable,
                eq(voteContentTable.id, voteTable.currentContentId),
            )
            .innerJoin(commentTable, eq(commentTable.id, voteTable.commentId))
            .innerJoin(postTable, eq(commentTable.postId, postTable.id))
            .where(
                and(
                    eq(postTable.slugId, postSlugId),
                    eq(voteTable.authorId, userId),
                ),
            );

        userResponses.forEach((response) => {
            userVoteList.push({
                commentSlugId: response.commentSlugId,
                votingAction: response.optionChosen,
            });
        });
    }

    return userVoteList;
}
