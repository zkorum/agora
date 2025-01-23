import {
    opinionTable,
    conversationTable,
    voteContentTable,
    voteProofTable,
    voteTable,
    userNotificationTable,
    notificationMessageOpinionAgreementTable,
} from "@/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, sql, and } from "drizzle-orm";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import type { VotingAction } from "@/shared/types/zod.js";
import type { FetchUserVotesForPostSlugIdsResponse } from "@/shared/types/dto.js";
import { useCommonComment, useCommonPost } from "./common.js";

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

interface CastVoteForCommentSlugIdProps {
    db: PostgresJsDatabase;
    commentSlugId: string;
    userId: string;
    didWrite: string;
    proof: string;
    votingAction: VotingAction;
}

export async function castVoteForCommentSlugId({
    db,
    userId,
    commentSlugId,
    didWrite,
    proof,
    votingAction,
}: CastVoteForCommentSlugIdProps): Promise<boolean> {
    const postSlugId = await useCommonComment().getPostSlugIdFromCommentSlugId({
        commentSlugId: commentSlugId,
        db: db,
    });

    // Check if the post is locked
    {
        const isLocked = await useCommonPost().isPostSlugIdLocked({
            db: db,
            postSlugId: postSlugId,
        });

        if (isLocked) {
            return false;
        }
    }

    const postMetadata = await useCommonPost().getPostMetadataFromSlugId({
        db: db,
        postSlugId: postSlugId,
    });

    const commentData = await getCommentMetadataFromCommentSlugId({
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

    try {
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

            const voteProofTableId = voteProofTableResponse[0].voteProofTableId;

            if (votingAction != "cancel") {
                const voteContentTableResponse = await tx
                    .insert(voteContentTable)
                    .values({
                        voteId: voteTableId,
                        voteProofId: voteProofTableId,
                        opinionContentId: commentData.contentId,
                        optionChosen:
                            votingAction == "agree" ? "agree" : "disagree",
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
                        const userNotificationTableResponse = await tx
                            .insert(userNotificationTable)
                            .values({
                                userId: commentData.userId,
                                notificationType: "opinion_agreement",
                            })
                            .returning({
                                userNotificationId: userNotificationTable.id,
                            });

                        const userNotificationId =
                            userNotificationTableResponse[0].userNotificationId;

                        await tx
                            .insert(notificationMessageOpinionAgreementTable)
                            .values({
                                userNotificationId: userNotificationId,
                                userId: userId,
                                opinionId: commentData.commentId,
                                conversationId: postMetadata.id,
                                isAgree: votingAction == "agree" ? true : false,
                            });
                    }
                }
            }

            await tx
                .update(opinionTable)
                .set({
                    numAgrees: sql`${opinionTable.numAgrees} + ${numAgreesDiff}`,
                    numDisagrees: sql`${opinionTable.numDisagrees} + ${numDisagreesDiff}`,
                })
                .where(
                    eq(opinionTable.currentContentId, commentData.contentId),
                );
        });
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while casting new vote",
        );
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
                optionChosen: voteContentTable.optionChosen,
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
