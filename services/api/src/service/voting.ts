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
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { nowZeroMs } from "@/shared/util.js";
import type {
    OpinionContentIdPerOpinionId,
    OpinionIdPerStatementId,
    UserIdPerParticipantId,
} from "@/utils/dataStructure.js";
import { and, eq, inArray, isNotNull, sql, SQL } from "drizzle-orm";
import { buildVoteSourceQuery } from "./voteQueries.js";
import type { VoteBufferInput } from "./voteBufferTypes.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonComment } from "./common.js";
import { isUserInSelectedOpinionGroup } from "./opinionGroupAnalysis.js";
import { checkConversationParticipation } from "./participationGate.js";
import type { VoteBuffer } from "./voteBuffer.js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";

interface CastVoteForOpinionSlugIdProps {
    db: PostgresJsDatabase;
    voteBuffer: VoteBuffer;
    opinionSlugId: string;
    didWrite: string;
    votingAction: VotingAction;
    userAgent: string;
    now: Date;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
    returnIsUserClustered?: boolean;
    sourceVersion: string;
    clientAction?: VoteBufferInput["clientAction"];
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
    const uniquePostSlugIds = Array.from(new Set(postSlugIdList));
    if (uniquePostSlugIds.length === 0) {
        return [];
    }

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
                inArray(conversationTable.slugId, uniquePostSlugIds),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                isNotNull(opinionTable.currentContentId),
                eq(voteTable.authorId, userId),
            ),
        );

    return userResponses.map((response) => ({
        opinionSlugId: response.opinionSlugId,
        votingAction: response.optionChosen,
    }));
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
        // Reduced chunk size to 1000 to prevent blocking the event loop during large imports
        const CHUNK_SIZE = 1000;
        // Small delay between chunks to allow other requests to be processed
        const yieldToEventLoop = (): Promise<void> =>
            new Promise((resolve) => setTimeout(resolve, 5));
        let insertVoteResponse: {
            voteId: number;
            polisVoteId: number | null;
        }[] = [];
        // TODO: remove when this is merged: https://github.com/drizzle-team/drizzle-orm/pull/3816
        if (votesToAdd.length > CHUNK_SIZE) {
            const voteChunks = chunkArray(votesToAdd, CHUNK_SIZE);
            for (const chunk of voteChunks) {
                await yieldToEventLoop();
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
        const voteContentMap = new Map(
            voteContentsToModifyBeforeAdd.map((v) => [v.polisVoteId, v]),
        );
        for (const insertedVote of insertVoteResponse) {
            const voteContentToModify = voteContentMap.get(
                insertedVote.polisVoteId ?? -1,
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
                await yieldToEventLoop();
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
                await yieldToEventLoop();
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

interface CheckUserIsClusteredProps {
    db: PostgresJsDatabase;
    userId: string;
    conversationId: number;
}

async function checkUserIsClustered({
    db,
    userId,
    conversationId,
}: CheckUserIsClusteredProps): Promise<boolean> {
    return await isUserInSelectedOpinionGroup({
        db,
        userId,
        conversationId,
    });
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
    votingAction,
    userAgent,
    now,
    currentDisplayLanguage,
    returnIsUserClustered,
    sourceVersion,
    clientAction,
}: CastVoteForOpinionSlugIdProps): Promise<CastVoteResponse> {
    const { conversationSlugId, conversationId } =
        await useCommonComment().getOpinionMetadataFromOpinionSlugId({
            opinionSlugId: opinionSlugId,
            db: db,
        });
    const participationCheck = await checkConversationParticipation({
        db: db,
        conversationSlugId,
        didWrite,
        userAgent,
        now,
        currentDisplayLanguage,
    });
    if (!participationCheck.success) {
        return participationCheck;
    }

    const contentRows = await buildVoteSourceQuery({
        db: getPrimaryDatabase(db),
        opinionSlugId,
        participantId: participationCheck.participantId,
    });
    const content = contentRows.at(0);
    if (content?.isClosed)
        return {
            success: false,
            reason: "conversation_closed",
            participationStatus: {
                status: "blocked",
                reason: "conversation_closed",
            },
        };
    if (
        content === undefined ||
        (votingAction !== "cancel" && sourceVersion !== content.sourceVersion)
    )
        return { success: false, reason: "statement_changed" };

    const admission = await voteBuffer.add({
        vote: {
            userId: participationCheck.participantId,
            opinionId: content.commentId,
            opinionContentId: content.contentId,
            conversationId,
            vote: votingAction,
            timestamp: now,
            scope: {
                epoch: content.epoch,
                minimumSequence:
                    content.previousEpoch === content.epoch
                        ? (content.sequence ?? 0)
                        : 0,
            },
            clientAction,
        },
    });
    if (admission === "conversation_closed")
        return {
            success: false,
            reason: "conversation_closed",
            participationStatus: {
                status: "blocked",
                reason: "conversation_closed",
            },
        };

    // Only run clustering check if frontend requests it
    let userIsClustered: boolean | undefined;
    if (returnIsUserClustered) {
        userIsClustered = await checkUserIsClustered({
            db,
            userId: participationCheck.participantId,
            conversationId,
        });
    }

    return { success: true, userIsClustered };
}
