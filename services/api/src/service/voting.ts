import {
    opinionTable,
    conversationTable,
    voteContentTable,
    voteProofTable,
    voteTable,
    notificationTable,
    notificationOpinionVoteTable,
    conversationUpdateQueueTable,
} from "@/shared-backend/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, sql, and, desc, isNotNull, SQL, inArray } from "drizzle-orm";
import { httpErrors } from "@fastify/sensible";
import type { VotingAction, VotingOption } from "@/shared/types/zod.js";
import { useCommonComment, useCommonPost } from "./common.js";
import { log } from "@/app.js";
import { insertNewVoteNotification } from "./notification.js";
import * as authUtilService from "@/service/authUtil.js";
import { PgTransaction } from "drizzle-orm/pg-core";
import type { FetchUserVotesForPostSlugIdsResponse } from "@/shared/types/dto.js";
import type { ImportPolisResults } from "@/shared/types/polis.js";
import type {
    OpinionContentIdPerOpinionId,
    OpinionIdPerStatementId,
    UserIdPerParticipantId,
} from "@/utils/dataStructure.js";
import { nowZeroMs } from "@/shared/util.js";

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
            throw httpErrors.notFound(
                "Failed to locate comment content ID while casting vote",
            );
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
    didWrite: string;
    proof: string;
    votingAction: VotingAction;
    userAgent: string;
    voteNotifMilestones: number[];
    now: Date;
}

interface CastVoteForOpinionSlugIdFromUserIdProps {
    db: PostgresJsDatabase;
    now: Date;
    opinionSlugId: string;
    didWrite: string;
    proof: string;
    votingAction: VotingAction;
    userId: string;
    voteNotifMilestones: number[];
    optionalConversationSlugId?: string;
    optionalConversationId?: number;
    optionalConversationContentId?: number | null;
}

export async function castVoteForOpinionSlugIdFromUserId({
    db,
    now,
    opinionSlugId,
    didWrite,
    proof,
    votingAction,
    userId,
    voteNotifMilestones,
    optionalConversationId,
    optionalConversationSlugId,
    optionalConversationContentId,
}: CastVoteForOpinionSlugIdFromUserIdProps): Promise<boolean> {
    let conversationId: number;
    let conversationSlugId: string;
    if (
        optionalConversationId === undefined ||
        optionalConversationSlugId === undefined
    ) {
        const {
            conversationSlugId: fetchedConversationSlugId,
            conversationId: fetchedConversationId,
        } = await useCommonComment().getOpinionMetadataFromOpinionSlugId({
            opinionSlugId: opinionSlugId,
            db: db,
        });
        conversationId = fetchedConversationId;
        conversationSlugId = fetchedConversationSlugId;
    } else {
        conversationId = optionalConversationId;
        conversationSlugId = optionalConversationSlugId;
    }

    // Check if conversation is deleted
    let conversationContentId: number | null;
    if (optionalConversationContentId === undefined) {
        const { contentId: fetchedConversationContentId } =
            await useCommonPost().getPostMetadataFromSlugId({
                db: db,
                conversationSlugId: conversationSlugId,
            });
        conversationContentId = fetchedConversationContentId;
    } else {
        conversationContentId = optionalConversationContentId;
    }
    if (conversationContentId === null) {
        throw httpErrors.gone("Cannot vote on a deleted post");
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

        // Enqueue math update (eliminates conversation table UPDATE and row lock!)
        // Math-updater will recalculate counters and update lastReactedAt (activity timestamp)
        await db
            .insert(conversationUpdateQueueTable)
            .values({
                conversationId: conversationId,
                requestedAt: now,
                processedAt: null,
            })
            .onConflictDoUpdate({
                target: conversationUpdateQueueTable.conversationId,
                set: {
                    requestedAt: now,
                    processedAt: null,
                },
            });
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

// TODO: remove when this is merged: https://github.com/drizzle-team/drizzle-orm/pull/3816
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

export async function bulkInsertVotesFromExternalPolisConvo({
    db,
    importedPolisConversation,
    opinionIdPerStatementId,
    opinionContentIdPerOpinionId,
    userIdPerParticipantId,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    importedPolisConversation: ImportPolisResults;
    opinionIdPerStatementId: OpinionIdPerStatementId;
    opinionContentIdPerOpinionId: OpinionContentIdPerOpinionId;
    userIdPerParticipantId: UserIdPerParticipantId;
    conversationSlugId: string;
}): Promise<void> {
    const votesToAdd: {
        authorId: string;
        opinionId: number;
        currentContentId: number | null;
        polisVoteId: number;
    }[] = [];
    const voteContentsToModifyBeforeAdd: {
        opinionId: number;
        opinionContentId: number;
        vote: VotingOption;
        polisVoteId: number;
    }[] = [];
    const voteContentsToAdd: {
        voteId: number;
        opinionContentId: number;
        vote: VotingOption;
    }[] = [];
    for (let i = 0; i < importedPolisConversation.votes_data.length; i++) {
        const voteData = importedPolisConversation.votes_data[i];
        const userId = userIdPerParticipantId[voteData.participant_id];
        const opinionId = opinionIdPerStatementId[voteData.statement_id];
        const opinionContentId = opinionContentIdPerOpinionId[opinionId];
        votesToAdd.push({
            authorId: userId,
            opinionId: opinionId,
            currentContentId: null,
            polisVoteId: i,
        });
        voteContentsToModifyBeforeAdd.push({
            polisVoteId: i,
            opinionId: opinionId,
            opinionContentId: opinionContentId,
            vote:
                voteData.vote === 1
                    ? "agree"
                    : voteData.vote === -1
                      ? "disagree"
                      : "pass",
        });
    }
    async function doImportVotes(db: PostgresJsDatabase): Promise<void> {
        // We assume the aren't any duplicate votes
        const CHUNK_SIZE = 10000;
        let insertVoteResponse: {
            voteId: number;
            polisVoteId: number | null;
        }[] = [];
        // TODO: remove when this is merged: https://github.com/drizzle-team/drizzle-orm/pull/3816
        if (votesToAdd.length > CHUNK_SIZE) {
            const voteChunks = chunkArray(votesToAdd, CHUNK_SIZE);
            for (const chunk of voteChunks) {
                const result = await db
                    .insert(voteTable)
                    .values(chunk)
                    .returning({
                        voteId: voteTable.id,
                        polisVoteId: voteTable.polisVoteId,
                    });

                insertVoteResponse.push(...result);
            }
        } else {
            insertVoteResponse = await db
                .insert(voteTable)
                .values(votesToAdd)
                .returning({
                    voteId: voteTable.id,
                    polisVoteId: voteTable.polisVoteId,
                });
        }

        // NOTE: Thanks to the introduction of polisVoteId, this does NOT assume that PostgreSQL and drizzle/returning preserve order
        for (const insertedVote of insertVoteResponse) {
            const voteContentToModify = voteContentsToModifyBeforeAdd.find(
                (vote) => vote.polisVoteId === insertedVote.polisVoteId,
            );
            if (voteContentToModify === undefined) {
                throw new Error(
                    `[Import] Data is out of sync while importing voteId=${String(insertedVote.voteId)}, polisVoteId=${String(insertedVote.polisVoteId)} with conversationSlugId=${conversationSlugId}`,
                );
            }
            voteContentsToAdd.push({
                voteId: insertedVote.voteId,
                opinionContentId: voteContentToModify.opinionContentId,
                vote: voteContentToModify.vote,
            });
        }
        let voteContentTableResponse: {
            voteContentTableId: number;
            voteId: number;
        }[] = [];
        // TODO: remove when this is merged: https://github.com/drizzle-team/drizzle-orm/pull/3816
        if (voteContentsToAdd.length > CHUNK_SIZE) {
            const voteChunks = chunkArray(voteContentsToAdd, CHUNK_SIZE);
            for (const chunk of voteChunks) {
                const result = await db
                    .insert(voteContentTable)
                    .values(chunk)
                    .returning({
                        voteContentTableId: voteContentTable.id,
                        voteId: voteContentTable.voteId,
                    });
                voteContentTableResponse.push(...result);
            }
            const voteContentChunks = chunkArray(
                voteContentTableResponse,
                CHUNK_SIZE,
            );

            for (const chunk of voteContentChunks) {
                const sqlChunksVoteCurrentId: SQL[] = [];
                sqlChunksVoteCurrentId.push(sql`(CASE`);

                for (const voteContentResponse of chunk) {
                    sqlChunksVoteCurrentId.push(
                        sql`WHEN ${voteTable.id} = ${voteContentResponse.voteId}::int THEN ${voteContentResponse.voteContentTableId}::int`,
                    );
                }

                sqlChunksVoteCurrentId.push(sql`ELSE current_content_id`);
                sqlChunksVoteCurrentId.push(sql`END)`);

                const finalSqlVoteCurrentContentId = sql.join(
                    sqlChunksVoteCurrentId,
                    sql.raw(" "),
                );
                const setClauseVoteCurrentContentId = {
                    currentContentId: finalSqlVoteCurrentContentId,
                };

                const voteIdsInChunk = chunk.map((v) => v.voteId);

                await db
                    .update(voteTable)
                    .set({
                        ...setClauseVoteCurrentContentId,
                        updatedAt: nowZeroMs(),
                    })
                    .where(inArray(voteTable.id, voteIdsInChunk));
            }
        } else {
            voteContentTableResponse = await db
                .insert(voteContentTable)
                .values(voteContentsToAdd)
                .returning({
                    voteContentTableId: voteContentTable.id,
                    voteId: voteContentTable.voteId,
                });
            const sqlChunksVoteCurrentId: SQL[] = [];
            sqlChunksVoteCurrentId.push(sql`(CASE`);
            for (const voteContentResponse of voteContentTableResponse) {
                sqlChunksVoteCurrentId.push(
                    sql`WHEN ${voteTable.id} = ${voteContentResponse.voteId}::int THEN ${voteContentResponse.voteContentTableId}::int`,
                );
            }
            sqlChunksVoteCurrentId.push(sql`ELSE current_content_id`);
            sqlChunksVoteCurrentId.push(sql`END)`);

            const finalSqlVoteCurrentContentId = sql.join(
                sqlChunksVoteCurrentId,
                sql.raw(" "),
            );
            const setClauseVoteCurrentContentId = {
                currentContentId: finalSqlVoteCurrentContentId,
            };
            const insertVoteIds = voteContentsToAdd.map(
                (insertedVote) => insertedVote.voteId,
            );
            await db
                .update(voteTable)
                .set({
                    ...setClauseVoteCurrentContentId,
                    updatedAt: nowZeroMs(),
                })
                .where(inArray(voteTable.id, insertVoteIds));
        }
    }

    // we don't use transactions because it's too heavy
    await doImportVotes(db);
}

export async function castVoteForOpinionSlugId({
    db,
    opinionSlugId,
    didWrite,
    proof,
    votingAction,
    userAgent,
    voteNotifMilestones,
    now,
}: CastVoteForOpinionSlugIdProps): Promise<boolean> {
    const { conversationSlugId, conversationId } =
        await useCommonComment().getOpinionMetadataFromOpinionSlugId({
            opinionSlugId: opinionSlugId,
            db: db,
        });
    const {
        isIndexed: conversationIsIndexed,
        isLoginRequired: conversationIsLoginRequired,
        contentId: conversationContentId,
    } = await useCommonPost().getPostMetadataFromSlugId({
        db: db,
        conversationSlugId: conversationSlugId,
    });
    const userId = await authUtilService.getOrRegisterUserIdFromDeviceStatus({
        db,
        didWrite,
        conversationIsIndexed,
        conversationIsLoginRequired,
        userAgent,
        now,
    });

    return await castVoteForOpinionSlugIdFromUserId({
        db,
        now,
        opinionSlugId,
        didWrite,
        proof,
        votingAction,
        userId,
        voteNotifMilestones,
        optionalConversationId: conversationId,
        optionalConversationSlugId: conversationSlugId,
        optionalConversationContentId: conversationContentId,
    });
}
