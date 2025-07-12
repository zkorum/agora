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
import { eq, sql, and, desc, isNotNull } from "drizzle-orm";
import { httpErrors } from "@fastify/sensible";
import type { VotingAction } from "@/shared/types/zod.js";
import type { FetchUserVotesForPostSlugIdsResponse } from "@/shared/types/dto.js";
import { useCommonComment, useCommonPost } from "./common.js";
import type { AxiosInstance } from "axios";
import * as polisService from "@/service/polis.js";
import { log } from "@/app.js";
import { insertNewVoteNotification } from "./notification.js";
import * as authUtilService from "@/service/authUtil.js";
import { PgTransaction } from "drizzle-orm/pg-core";

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

interface ImportNewVoteProps {
    db: PostgresJsDatabase;
    conversationId: number;
    conversationSlugId: string;
    opinionSlugId: string;
    opinionId: number;
    externalCommentId: string; // from imported polis system
    externalUserId: string; // from imported polis system
    opinionContentId: number;
    userId: string;
    votingAction: VotingAction;
    axiosPolis: AxiosInstance;
}

export async function importNewVote({
    db,
    conversationId,
    conversationSlugId,
    userId,
    opinionId,
    externalCommentId,
    externalUserId,
    opinionContentId,
    opinionSlugId,
    votingAction,
    axiosPolis,
}: ImportNewVoteProps) {
    log.info(
        `Casting vote for user ${externalUserId} and comment ${externalCommentId}`,
    );

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
                eq(voteTable.opinionId, opinionId),
            ),
        );

    let numAgreesDiff = 0;
    let numDisagreesDiff = 0;
    let numPassesDiff = 0;

    if (existingVoteTableResponse.length == 0) {
        // No existing vote
        if (votingAction == "cancel") {
            throw httpErrors.badRequest(
                "Cannot cancel a vote that does not exist",
            );
        } else {
            if (votingAction == "agree") {
                numAgreesDiff = 1;
            } else if (votingAction == "disagree") {
                numDisagreesDiff = 1;
            } else {
                numPassesDiff = 1;
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
            } else if (votingAction == "disagree") {
                numDisagreesDiff = 1;
                numAgreesDiff = -1;
            } else {
                numPassesDiff = 1;
                numAgreesDiff = -1;
            }
        } else if (existingResponse == "disagree") {
            if (votingAction == "disagree") {
                throw httpErrors.badRequest(
                    "User already disagreed the target opinion",
                );
            } else if (votingAction == "cancel") {
                numDisagreesDiff = -1;
            } else if (votingAction == "agree") {
                numDisagreesDiff = -1;
                numAgreesDiff = 1;
            } else {
                numDisagreesDiff = -1;
                numPassesDiff = 1;
            }
        } else if (existingResponse == "pass") {
            if (votingAction == "pass") {
                throw httpErrors.badRequest(
                    "User already passed on the target opinion",
                );
            } else if (votingAction == "cancel") {
                numPassesDiff = -1;
            } else if (votingAction == "agree") {
                numPassesDiff = -1;
                numAgreesDiff = 1;
            } else {
                numPassesDiff = -1;
                numDisagreesDiff = 1;
            }
        } else {
            // null case meaning user cancelled
            if (votingAction == "agree") {
                numAgreesDiff = 1;
            } else if (votingAction == "disagree") {
                numDisagreesDiff = 1;
            } else if (votingAction == "pass") {
                numPassesDiff = 1;
            }
        }
    } else {
        throw httpErrors.internalServerError("Database relation error");
    }

    let voteTableId = 0;

    if (existingVoteTableResponse.length == 0) {
        // There are no votes yet
        const voteTableResponse = await db
            .insert(voteTable)
            .values({
                authorId: userId,
                opinionId: opinionId,
                currentContentId: null,
            })
            .returning({ voteTableId: voteTable.id });
        voteTableId = voteTableResponse[0].voteTableId;
    } else {
        if (votingAction == "cancel") {
            await db
                .update(voteTable)
                .set({
                    currentContentId: null,
                })
                .where(
                    eq(voteTable.id, existingVoteTableResponse[0].voteTableId),
                );
        }

        voteTableId = existingVoteTableResponse[0].voteTableId;
    }

    if (votingAction != "cancel") {
        const voteContentTableResponse = await db
            .insert(voteContentTable)
            .values({
                voteId: voteTableId,
                opinionContentId: opinionContentId,
                vote: votingAction,
            })
            .returning({ voteContentTableId: voteContentTable.id });

        const voteContentTableId =
            voteContentTableResponse[0].voteContentTableId;

        await db
            .update(voteTable)
            .set({
                currentContentId: voteContentTableId,
            })
            .where(eq(voteTable.id, voteTableId));
    }

    await db
        .update(opinionTable)
        .set({
            numAgrees: sql`${opinionTable.numAgrees} + ${numAgreesDiff}`,
            numDisagrees: sql`${opinionTable.numDisagrees} + ${numDisagreesDiff}`,
            numPasses: sql`${opinionTable.numPasses} + ${numPassesDiff}`,
        })
        .where(eq(opinionTable.currentContentId, opinionContentId));

    const {
        voteCount: participantVoteCountBeforeAction,
        opinionCount: participantOpinionCountBeforeAction,
    } = await useCommonComment().getCountsForParticipant({
        db: db,
        conversationId,
        userId,
    });

    if (votingAction === "cancel") {
        // NOTE: could have been done with a subquery but drizzle !#?! with subqueries
        const participantVoteCountAfterDeletion =
            participantVoteCountBeforeAction - 1;
        /* <= to account for potential sync errors though it should not happen with db transactions... */
        const isParticipantDeleted =
            participantVoteCountAfterDeletion <= 0 &&
            participantOpinionCountBeforeAction <= 0;
        if (isParticipantDeleted) {
            await db
                .update(conversationTable)
                .set({
                    voteCount: sql`${conversationTable.voteCount} - 1`,
                    participantCount: sql`${conversationTable.participantCount} - 1`,
                })
                .where(eq(conversationTable.id, conversationId));
        } else {
            await db
                .update(conversationTable)
                .set({
                    voteCount: sql`${conversationTable.voteCount} - 1`,
                })
                .where(eq(conversationTable.id, conversationId));
        }
    } else {
        if (
            participantVoteCountBeforeAction === 0 &&
            participantOpinionCountBeforeAction === 0
        ) {
            // new participant!
            await db
                .update(conversationTable)
                .set({
                    voteCount: sql`${conversationTable.voteCount} + 1`,
                    participantCount: sql`${conversationTable.participantCount} + 1`,
                })
                .where(eq(conversationTable.slugId, conversationSlugId));
        } else {
            // existing participant!
            await db
                .update(conversationTable)
                .set({
                    voteCount: sql`${conversationTable.voteCount} + 1`,
                })
                .where(eq(conversationTable.slugId, conversationSlugId));
        }
    }

    try {
        await polisService.createOrUpdateVote({
            userId,
            conversationSlugId,
            opinionSlugId,
            votingAction,
            axiosPolis,
        });
    } catch (e) {
        log.error(e);
        log.warn("Error while importing vote to Polis--continuing");
    }
}

interface CastVoteForOpinionSlugIdProps {
    db: PostgresJsDatabase;
    opinionSlugId: string;
    didWrite: string;
    proof: string;
    votingAction: VotingAction;
    userAgent: string;
    axiosPolis?: AxiosInstance;
    polisUserEmailDomain: string;
    polisUserEmailLocalPart: string;
    polisUserPassword: string;
    polisDelayToFetch: number;
    voteNotifMilestones: number[];
    awsAiLabelSummaryEnable: boolean;
    awsAiLabelSummaryRegion: string;
    awsAiLabelSummaryModelId: string;
    awsAiLabelSummaryTemperature: string;
    awsAiLabelSummaryTopP: string;
    awsAiLabelSummaryMaxTokens: string;
    awsAiLabelSummaryPrompt: string;
    now: Date;
}

export async function castVoteForOpinionSlugId({
    db,
    opinionSlugId,
    didWrite,
    proof,
    votingAction,
    userAgent,
    axiosPolis,
    polisUserEmailDomain,
    polisUserEmailLocalPart,
    polisUserPassword,
    polisDelayToFetch,
    voteNotifMilestones,
    awsAiLabelSummaryEnable,
    awsAiLabelSummaryRegion,
    awsAiLabelSummaryModelId,
    awsAiLabelSummaryTemperature,
    awsAiLabelSummaryTopP,
    awsAiLabelSummaryMaxTokens,
    awsAiLabelSummaryPrompt,
    now,
}: CastVoteForOpinionSlugIdProps): Promise<boolean> {
    const { conversationSlugId, conversationId } =
        await useCommonComment().getOpinionMetadataFromOpinionSlugId({
            opinionSlugId: opinionSlugId,
            db: db,
        });

    // "update through cache" recalculate existing counts before taking into account new vote
    const {
        isIndexed: conversationIsIndexed,
        isLoginRequired: conversationIsLoginRequired,
        contentId: conversationContentId,
        participantCount: conversationParticipantCount,
        voteCount: conversationVoteCount,
    } = await useCommonPost().getPostMetadataFromSlugId({
        db: db,
        conversationSlugId: conversationSlugId,
        useCache: false,
    });
    if (conversationContentId == null) {
        throw httpErrors.gone("Cannot comment on a deleted post");
    }

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

    const userId = await authUtilService.getOrRegisterUserIdFromDeviceStatus({
        db,
        didWrite,
        conversationIsIndexed,
        conversationIsLoginRequired,
        userAgent,
        axiosPolis,
        polisUserEmailDomain,
        polisUserEmailLocalPart,
        polisUserPassword,
        now,
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
    let numPassesDiff = 0;

    if (existingVoteTableResponse.length == 0) {
        // No existing vote
        if (votingAction == "cancel") {
            throw httpErrors.badRequest(
                "Cannot cancel a vote that does not exist",
            );
        } else {
            if (votingAction == "agree") {
                numAgreesDiff = 1;
            } else if (votingAction == "disagree") {
                numDisagreesDiff = 1;
            } else {
                numPassesDiff = 1;
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
            } else if (votingAction == "disagree") {
                numDisagreesDiff = 1;
                numAgreesDiff = -1;
            } else {
                numPassesDiff = 1;
                numAgreesDiff = -1;
            }
        } else if (existingResponse == "disagree") {
            if (votingAction == "disagree") {
                throw httpErrors.badRequest(
                    "User already disagreed the target opinion",
                );
            } else if (votingAction == "cancel") {
                numDisagreesDiff = -1;
            } else if (votingAction == "agree") {
                numDisagreesDiff = -1;
                numAgreesDiff = 1;
            } else {
                numDisagreesDiff = -1;
                numPassesDiff = 1;
            }
        } else if (existingResponse == "pass") {
            if (votingAction == "pass") {
                throw httpErrors.badRequest(
                    "User already passed on the target opinion",
                );
            } else if (votingAction == "cancel") {
                numPassesDiff = -1;
            } else if (votingAction == "agree") {
                numPassesDiff = -1;
                numAgreesDiff = 1;
            } else {
                numPassesDiff = -1;
                numDisagreesDiff = 1;
            }
        } else {
            // null case meaning user cancelled
            if (votingAction == "agree") {
                numAgreesDiff = 1;
            } else if (votingAction == "disagree") {
                numDisagreesDiff = 1;
            } else if (votingAction == "pass") {
                numPassesDiff = 1;
            }
        }
    } else {
        throw httpErrors.internalServerError("Database relation error");
    }

    // update conversation counts
    // "update through cache" recalculate existing counts before taking into account new vote
    // both values are 0 if the user is a new participant!
    // IMPORTANT to select this BEFORE inserting vote
    const { voteCount: participantVoteCountBeforeAction } =
        await useCommonComment().getCountsForParticipant({
            db: db,
            conversationId,
            userId,
            useCache: false,
        });

    async function doUpdateCastVote(db: PostgresJsDatabase): Promise<void> {
        let voteTableId = 0;

        if (existingVoteTableResponse.length == 0) {
            // There are no votes yet
            const voteTableResponse = await db
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
                await db
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

        const voteProofTableResponse = await db
            .insert(voteProofTable)
            .values({
                type: votingAction == "cancel" ? "deletion" : "creation",
                voteId: voteTableId,
                authorDid: didWrite,
                proof: proof,
                proofVersion: 1,
            })
            .returning({ voteProofTableId: voteProofTable.id });

        if (votingAction === "cancel") {
            // NOTE: could have been done with a subquery but drizzle !#?! with subqueries
            const participantVoteCountAfterDeletion =
                participantVoteCountBeforeAction - 1;
            /* <= to account for potential sync errors though it should not happen with db transactions... */
            const isParticipantDeleted = participantVoteCountAfterDeletion <= 0;
            if (isParticipantDeleted) {
                await db
                    .update(conversationTable)
                    .set({
                        voteCount: conversationVoteCount - 1,
                        participantCount: conversationParticipantCount - 1,
                    })
                    .where(eq(conversationTable.id, conversationId));
            } else {
                await db
                    .update(conversationTable)
                    .set({
                        voteCount: conversationVoteCount - 1,
                        participantCount: conversationParticipantCount,
                    })
                    .where(eq(conversationTable.id, conversationId));
            }
        } else {
            if (participantVoteCountBeforeAction === 0) {
                // new participant!
                await db
                    .update(conversationTable)
                    .set({
                        voteCount: conversationVoteCount + 1,
                        participantCount: conversationParticipantCount + 1,
                    })
                    .where(eq(conversationTable.slugId, conversationSlugId));
            } else {
                // existing participant!
                await db
                    .update(conversationTable)
                    .set({
                        voteCount: conversationVoteCount + 1,
                        participantCount: conversationParticipantCount,
                    })
                    .where(eq(conversationTable.slugId, conversationSlugId));
            }
        }

        const voteProofTableId = voteProofTableResponse[0].voteProofTableId;

        const updateOpinionResponse = await db
            .update(opinionTable)
            .set({
                numAgrees: sql`${opinionTable.numAgrees} + ${numAgreesDiff}`,
                numDisagrees: sql`${opinionTable.numDisagrees} + ${numDisagreesDiff}`,
                numPasses: sql`${opinionTable.numPasses} + ${numPassesDiff}`,
            })
            .where(eq(opinionTable.id, commentData.commentId))
            .returning({
                numAgrees: opinionTable.numAgrees,
                numDisagrees: opinionTable.numDisagrees,
                numPasses: opinionTable.numPasses,
            });

        if (votingAction != "cancel") {
            const voteContentTableResponse = await db
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

            await db
                .update(voteTable)
                .set({
                    currentContentId: voteContentTableId,
                })
                .where(eq(voteTable.id, voteTableId));

            // Create notification for the opinion owner
            if (userId !== commentData.userId) {
                // Check if a vote notification already exist
                const existingVoteNotifications = await db
                    .select({
                        numVotes: notificationOpinionVoteTable.numVotes,
                    })
                    .from(notificationTable)
                    .innerJoin(
                        notificationOpinionVoteTable,
                        eq(
                            notificationOpinionVoteTable.notificationId,
                            notificationTable.id,
                        ),
                    )
                    .where(
                        and(
                            eq(notificationTable.userId, commentData.userId),
                            eq(
                                notificationOpinionVoteTable.opinionId,
                                commentData.commentId,
                            ),
                        ),
                    )
                    .orderBy(desc(notificationOpinionVoteTable.numVotes));
                if (existingVoteNotifications.length === 0) {
                    await insertNewVoteNotification({
                        db: db,
                        userId: commentData.userId,
                        opinionId: commentData.commentId,
                        conversationId: conversationId,
                        numVotes: 1,
                    });
                } else {
                    // identify whether the author of the opinion has voted on his own opinion or not
                    const selectAuthorVoteResponse = await db
                        .select()
                        .from(voteTable)
                        .where(
                            and(
                                eq(voteTable.opinionId, commentData.commentId),
                                eq(voteTable.authorId, commentData.userId),
                                isNotNull(voteTable.currentContentId), // vote was not canceled
                            ),
                        );
                    const authorHasVotedOnHisOwnOpinion =
                        selectAuthorVoteResponse.length !== 0;
                    const authorVoteCountOnHisOwnOpinion =
                        authorHasVotedOnHisOwnOpinion ? 1 : 0;
                    const newNumVotes = Math.max(
                        updateOpinionResponse[0].numAgrees +
                            updateOpinionResponse[0].numDisagrees -
                            authorVoteCountOnHisOwnOpinion,
                        1,
                    ); // we don't want to count the own author's vote in the notification!
                    const existingNotificationNumVotes =
                        existingVoteNotifications[0].numVotes;
                    if (existingNotificationNumVotes >= newNumVotes) {
                        // could happen when people have canceled votes
                        // do nothing
                        log.debug(
                            `Not adding a new notification to opinionId ${String(
                                commentData.commentId,
                            )} because existingNotificationNumVotes=${String(
                                existingNotificationNumVotes,
                            )} >= newVoteCount=${String(newNumVotes)}`,
                        );
                    } else if (voteNotifMilestones.includes(newNumVotes)) {
                        await insertNewVoteNotification({
                            db: db,
                            userId: commentData.userId,
                            opinionId: commentData.commentId,
                            conversationId: conversationId,
                            numVotes: newNumVotes,
                        });
                    } else {
                        log.debug(
                            `New vote not in milestone, skipping notification`,
                        );
                    }
                }
            }
        }

        // TODO: delete vote from external Polis system on cancel!
        if (axiosPolis !== undefined) {
            await polisService.createOrUpdateVote({
                userId,
                conversationSlugId,
                opinionSlugId,
                votingAction,
                axiosPolis,
            });
        }
    }

    let doTransaction = true;
    if (db instanceof PgTransaction) {
        doTransaction = false;
    }
    if (doTransaction) {
        await db.transaction(async (tx) => {
            await doUpdateCastVote(tx);
        });
    } else {
        await doUpdateCastVote(db);
    }

    if (axiosPolis !== undefined) {
        polisService
            .delayedPolisGetAndUpdateMath({
                db: db,
                conversationSlugId,
                conversationId: conversationId,
                axiosPolis,
                polisDelayToFetch,
                awsAiLabelSummaryEnable,
                awsAiLabelSummaryRegion,
                awsAiLabelSummaryModelId,
                awsAiLabelSummaryTemperature,
                awsAiLabelSummaryTopP,
                awsAiLabelSummaryMaxTokens,
                awsAiLabelSummaryPrompt,
            })
            .catch((e: unknown) => {
                log.error(e);
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
