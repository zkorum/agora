import {
    opinionTable,
    conversationTable,
    voteContentTable,
    voteProofTable,
    voteTable,
    notificationTable,
    notificationOpinionVoteTable,
} from "@/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, sql, and } from "drizzle-orm";
import { httpErrors } from "@fastify/sensible";
import type { VotingAction } from "@/shared/types/zod.js";
import type { FetchUserVotesForPostSlugIdsResponse } from "@/shared/types/dto.js";
import { useCommonComment, useCommonPost } from "./common.js";
import { generateRandomSlugId } from "@/crypto.js";
import type { AxiosInstance } from "axios";
import * as polisService from "@/service/polis.js";

interface GetCommentMetadataFromCommentSlugIdProps {
    db: PostgresJsDatabase;
    commentSlugId: string;
}

interface GetCommentMetadataFromCommentSlugIdReturn {
    commentId: number;
    contentId: number;
    userId: string;
}

async function getCommentMetadataFromCommentSlugId({
    db,
    commentSlugId,
}: GetCommentMetadataFromCommentSlugIdProps): Promise<GetCommentMetadataFromCommentSlugIdReturn> {
    const response = await db
        .select({
            opinionId: opinionTable.id,
            contentId: opinionTable.currentContentId,
            userId: opinionTable.authorId,
        })
        .from(opinionTable)
        .where(eq(opinionTable.slugId, commentSlugId));
    if (response.length == 1) {
        const commentData = response[0];
        if (commentData.contentId == null) {
            throw httpErrors.notFound("Failed to locate comment content ID");
        } else {
            return {
                commentId: commentData.opinionId,
                contentId: commentData.contentId,
                userId: commentData.userId,
            };
        }
    } else {
        throw httpErrors.internalServerError(
            "Database error while fetching opinion ID from opinion slug ID",
        );
    }
}

interface CastVoteForOpinionSlugIdProps {
    db: PostgresJsDatabase;
    opinionSlugId: string;
    userId: string;
    didWrite?: string;
    proof?: string;
    votingAction: VotingAction;
    axiosPolis?: AxiosInstance;
    polisDelayToFetch: number;
}

export async function castVoteForOpinionSlugId({
    db,
    userId,
    opinionSlugId,
    didWrite,
    proof,
    votingAction,
    axiosPolis,
    polisDelayToFetch,
}: CastVoteForOpinionSlugIdProps): Promise<boolean> {
    const conversationSlugId =
        await useCommonComment().getPostSlugIdFromCommentSlugId({
            commentSlugId: opinionSlugId,
            db: db,
        });

    // Check if the post is locked
    {
        const isLocked = await useCommonPost().isPostSlugIdLocked({
            db: db,
            postSlugId: conversationSlugId,
        });

        if (isLocked) {
            return false;
        }
    }

    const postMetadata = await useCommonPost().getPostMetadataFromSlugId({
        db: db,
        conversationSlugId: conversationSlugId,
    });

    const commentData = await getCommentMetadataFromCommentSlugId({
        db: db,
        commentSlugId: opinionSlugId,
    });

    const existingVoteTableResponse = await db
        .select({
            optionChosen: voteContentTable.vote,
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
                eq(voteTable.opinionId, commentData.commentId),
            ),
        );

    let numAgreesDiff = 0;
    let numDisagreesDiff = 0;

    if (existingVoteTableResponse.length == 0) {
        // No existing vote
        if (votingAction == "cancel") {
            throw httpErrors.badRequest(
                "Cannot cancel a vote that does not exist",
            );
        } else {
            if (votingAction == "agree") {
                numAgreesDiff = 1;
            } else {
                numDisagreesDiff = 1;
            }
        }
    } else if (existingVoteTableResponse.length == 1) {
        const existingResponse = existingVoteTableResponse[0].optionChosen;
        if (existingResponse == "agree") {
            if (votingAction == "agree") {
                throw httpErrors.badRequest(
                    "User already agreed the target opinion",
                );
            } else if (votingAction == "cancel") {
                numAgreesDiff = -1;
            } else {
                numDisagreesDiff = 1;
                numAgreesDiff = -1;
            }
        } else if (existingResponse == "disagree") {
            if (votingAction == "disagree") {
                throw httpErrors.badRequest(
                    "User already disagreed the target opinion",
                );
            } else if (votingAction == "cancel") {
                numDisagreesDiff = -1;
            } else {
                numDisagreesDiff = -1;
                numAgreesDiff = 1;
            }
        } else {
            // null case meaning user cancelled
            if (votingAction == "agree") {
                numAgreesDiff = 1;
            } else {
                numDisagreesDiff = 1;
            }
        }
    } else {
        throw httpErrors.internalServerError("Database relation error");
    }

    await db.transaction(async (tx) => {
        let voteTableId = 0;

        if (existingVoteTableResponse.length == 0) {
            // There are no votes yet
            const voteTableResponse = await tx
                .insert(voteTable)
                .values({
                    authorId: userId,
                    opinionId: commentData.commentId,
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

        let voteProofTableId;
        if (didWrite !== undefined && proof !== undefined) {
            const voteProofTableResponse = await tx
                .insert(voteProofTable)
                .values({
                    type: votingAction == "cancel" ? "deletion" : "creation",
                    voteId: voteTableId,
                    authorDid: didWrite,
                    proof: proof,
                    proofVersion: 1,
                })
                .returning({ voteProofTableId: voteProofTable.id });

            voteProofTableId = voteProofTableResponse[0].voteProofTableId;
        }

        if (votingAction != "cancel") {
            const voteContentTableResponse = await tx
                .insert(voteContentTable)
                .values({
                    voteId: voteTableId,
                    voteProofId: voteProofTableId,
                    opinionContentId: commentData.contentId,
                    vote: votingAction,
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

            {
                // Create notification for the opinion owner
                if (userId !== commentData.userId) {
                    // Check if an agree/disagree notification already exist previously to the owner
                    const existanceCheckResponse = await db
                        .select({})
                        .from(notificationTable)
                        .leftJoin(
                            notificationOpinionVoteTable,
                            eq(
                                notificationOpinionVoteTable.notificationId,
                                notificationTable.id,
                            ),
                        )
                        .where(
                            and(
                                eq(notificationTable.userId, userId),
                                eq(
                                    notificationOpinionVoteTable.authorId,
                                    commentData.userId,
                                ),
                                eq(
                                    notificationOpinionVoteTable.opinionId,
                                    commentData.commentId,
                                ),
                            ),
                        );
                    if (existanceCheckResponse.length > 1) {
                        throw httpErrors.internalServerError(
                            `An unexpected number of voting notification entries had been detected: ${existanceCheckResponse.length.toString()}`,
                        );
                    } else if (existanceCheckResponse.length == 1) {
                        // do nothing because a notification was sent previously
                    } else {
                        const notificationTableResponse = await tx
                            .insert(notificationTable)
                            .values({
                                slugId: generateRandomSlugId(),
                                userId: commentData.userId,
                                notificationType: "opinion_vote",
                            })
                            .returning({
                                notificationId: notificationTable.id,
                            });

                        const notificationId =
                            notificationTableResponse[0].notificationId;

                        await tx.insert(notificationOpinionVoteTable).values({
                            notificationId: notificationId,
                            authorId: userId,
                            opinionId: commentData.commentId,
                            conversationId: postMetadata.id,
                            vote: votingAction,
                        });
                    }
                }
            }
        }

        await tx
            .update(opinionTable)
            .set({
                numAgrees: sql`${opinionTable.numAgrees} + ${numAgreesDiff}`,
                numDisagrees: sql`${opinionTable.numDisagrees} + ${numDisagreesDiff}`,
            })
            .where(eq(opinionTable.currentContentId, commentData.contentId));

        if (axiosPolis !== undefined) {
            await polisService.createOrUpdateVote({
                userId,
                conversationSlugId,
                opinionSlugId,
                votingAction,
                axiosPolis,
            });
        }
    });

    if (axiosPolis !== undefined) {
        void polisService.delayedPolisGetAndUpdateMath({
            db: db,
            conversationSlugId,
            conversationId: postMetadata.id,
            axiosPolis,
            polisDelayToFetch,
        });
    }

    return true;
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
                optionChosen: voteContentTable.vote,
                opinionSlugId: opinionTable.slugId,
            })
            .from(voteTable)
            .innerJoin(
                voteContentTable,
                eq(voteContentTable.id, voteTable.currentContentId),
            )
            .innerJoin(opinionTable, eq(opinionTable.id, voteTable.opinionId))
            .innerJoin(
                conversationTable,
                eq(opinionTable.conversationId, conversationTable.id),
            )
            .where(
                and(
                    eq(conversationTable.slugId, postSlugId),
                    eq(voteTable.authorId, userId),
                ),
            );

        userResponses.forEach((response) => {
            userVoteList.push({
                opinionSlugId: response.opinionSlugId,
                votingAction: response.optionChosen,
            });
        });
    }

    return userVoteList;
}
