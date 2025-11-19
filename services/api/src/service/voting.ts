import * as authUtilService from "@/service/authUtil.js";
import * as zupassService from "@/service/zupass.js";
import {
    conversationTable,
    opinionTable,
    voteContentTable,
    voteTable,
} from "@/shared-backend/schema.js";
import type {
    FetchUserVotesForPostSlugIdsResponse,
    CastVoteResponse,
} from "@/shared/types/dto.js";
import type { ImportPolisResults } from "@/shared/types/polis.js";
import type { VotingAction, VotingOption } from "@/shared/types/zod.js";
import { nowZeroMs } from "@/shared/util.js";
import type {
    OpinionContentIdPerOpinionId,
    OpinionIdPerStatementId,
    UserIdPerParticipantId,
} from "@/utils/dataStructure.js";
import { httpErrors } from "@fastify/sensible";
import { and, eq, inArray, sql, SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonComment, useCommonPost } from "./common.js";
import type { VoteBuffer } from "./voteBuffer.js";

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
    voteBuffer: VoteBuffer;
    opinionSlugId: string;
    didWrite: string;
    proof: string;
    votingAction: VotingAction;
    userAgent: string;
    now: Date;
}

interface CastVoteForOpinionSlugIdFromUserIdProps {
    db: PostgresJsDatabase;
    voteBuffer: VoteBuffer;
    now: Date;
    opinionSlugId: string;
    didWrite: string;
    proof: string;
    votingAction: VotingAction;
    userId: string;
    optionalConversationSlugId?: string;
    optionalConversationId?: number;
    optionalConversationContentId?: number | null;
}

/**
 * Cast vote using buffered processing when userId is already known
 *
 * Used for seed votes and account deletion where userId is already available.
 * Adds vote to buffer for batched processing (flushes every 1 second).
 */
export async function castVoteForOpinionSlugIdFromUserId({
    db,
    voteBuffer,
    now,
    opinionSlugId,
    didWrite,
    proof,
    votingAction,
    userId,
    optionalConversationId,
    optionalConversationSlugId,
    optionalConversationContentId,
}: CastVoteForOpinionSlugIdFromUserIdProps): Promise<boolean> {
    // Get conversation metadata if not provided
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

    // Check if post is locked
    const isLocked = await useCommonPost().isPostSlugIdLocked({
        db: db,
        postSlugId: conversationSlugId,
    });

    if (isLocked) {
        return false;
    }

    // Get opinion metadata (commentId and contentId)
    const commentData = await getCommentMetadataFromCommentSlugId({
        db: db,
        commentSlugId: opinionSlugId,
    });

    // Add to buffer (returns immediately, vote writes happen in 1 second)
    voteBuffer.add({
        vote: {
            userId: userId,
            opinionId: commentData.commentId,
            opinionContentId: commentData.contentId,
            conversationId: conversationId,
            vote: votingAction,
            didWrite: didWrite,
            proof: proof,
            timestamp: now,
        },
    });

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

/**
 * Cast vote using buffered processing (batched writes)
 *
 * This function validates the vote, gets userId, then adds it to the VoteBuffer
 * instead of writing directly to the database. The buffer flushes
 * votes every 1 second, reducing opinion UPDATE contention by 90-95%.
 *
 * Returns immediately after validation (does not wait for DB write).
 */
export async function castVoteForOpinionSlugId({
    db,
    voteBuffer,
    opinionSlugId,
    didWrite,
    proof,
    votingAction,
    userAgent,
    now,
}: CastVoteForOpinionSlugIdProps): Promise<CastVoteResponse> {
    const { conversationSlugId, conversationId } =
        await useCommonComment().getOpinionMetadataFromOpinionSlugId({
            opinionSlugId: opinionSlugId,
            db: db,
        });
    const {
        isLoginRequired: conversationIsLoginRequired,
        contentId: conversationContentId,
        requiresEventTicket,
    } = await useCommonPost().getPostMetadataFromSlugId({
        db: db,
        conversationSlugId: conversationSlugId,
    });
    const userId = await authUtilService.getOrRegisterUserIdFromDeviceStatus({
        db,
        didWrite,
        conversationIsLoginRequired,
        userAgent,
        now,
    });

    // Check event ticket gating
    if (requiresEventTicket !== null) {
        const hasTicket = await zupassService.hasEventTicket({
            db,
            userId,
            eventSlug: requiresEventTicket,
        });
        if (!hasTicket) {
            return {
                success: false,
                reason: "event_ticket_required",
            };
        }
    }

    await castVoteForOpinionSlugIdFromUserId({
        db,
        voteBuffer,
        now,
        opinionSlugId,
        didWrite,
        proof,
        votingAction,
        userId,
        optionalConversationId: conversationId,
        optionalConversationSlugId: conversationSlugId,
        optionalConversationContentId: conversationContentId,
    });

    return { success: true };
}
