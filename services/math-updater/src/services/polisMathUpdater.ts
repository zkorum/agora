/**
 * Polis math update functions
 * Extracted from services/api/src/service/polis.ts
 * Contains only functions needed for math-updater service
 */

import type { PolisKey } from "@/shared/types/zod.js";
import type { AxiosInstance } from "axios";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { PgTransaction } from "drizzle-orm/pg-core";
import { and, eq, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import {
    polisClusterOpinionTable,
    polisClusterUserTable,
    polisContentTable,
    opinionTable,
    conversationTable,
    voteTable,
    voteContentTable,
    userTable,
    opinionModerationTable,
    polisClusterTable,
} from "@/shared-backend/schema.js";
import type { MathResults, PolisVoteRecord } from "@/shared/types/polis.js";
import type { GetMathRequest } from "@/shared/types/dto.js";
import { zodMathResults } from "@/shared/types/polis.js";
import {
    getUserIdByPolisParticipantIds,
    getConversationContent,
} from "./polisHelpers.js";
import { updateAiLabelsAndSummaries } from "./llmService.js";
import { log } from "@/app.js";

// Helper function for zero-millisecond timestamps
function nowZeroMs(): Date {
    const now = new Date();
    now.setMilliseconds(0);
    return now;
}

// Types for LLM integration
export interface ClusterInsightsWithOpinionIds {
    agreesWith: number[];
    disagreesWith: number[];
}

export interface ConversationInsightsWithOpinionIds {
    conversationTitle: string;
    conversationBody?: string;
    clusters: Record<string, ClusterInsightsWithOpinionIds>;
}

// Interfaces
interface PolisGetMathResultsProps {
    axiosPolis: AxiosInstance;
    conversationSlugId: string;
    conversationId: number;
    votes: PolisVoteRecord[];
}

async function getMathResults({
    axiosPolis,
    conversationSlugId,
    conversationId,
    votes,
}: PolisGetMathResultsProps): Promise<MathResults> {
    const getMathResultsRequestPath = `/math`;
    const body: GetMathRequest = {
        conversation_id: conversationId,
        conversation_slug_id: conversationSlugId,
        votes: votes,
    };
    const response = await axiosPolis.post(getMathResultsRequestPath, body, {
        headers: {
            "Content-Type": "application/json",
        },
    });
    try {
        return zodMathResults.parse(response.data);
    } catch (e) {
        log.info(
            `Polis Math Data received:\n${JSON.stringify(response.data, null, 2)}`,
        );
        throw e;
    }
}

interface GetAndUpdatePolisMathProps {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    conversationId: number;
    votes: PolisVoteRecord[];
    axiosPolis: AxiosInstance;
    awsAiLabelSummaryEnable: boolean;
    awsAiLabelSummaryRegion: string;
    awsAiLabelSummaryModelId: string;
    awsAiLabelSummaryTemperature: string;
    awsAiLabelSummaryTopP: string;
    awsAiLabelSummaryMaxTokens: string;
    awsAiLabelSummaryPrompt: string;
}

interface LoadPolisMathResultsProps {
    db: PostgresJsDatabase;
    polisMathResults: MathResults;
    conversationSlugId: string;
    conversationId: number;
}

async function doLoadPolisMathResults({
    db,
    conversationSlugId,
    conversationId,
    polisMathResults,
}: LoadPolisMathResultsProps): Promise<{
    clustersInsightsForLlm: Record<string, ClusterInsightsWithOpinionIds>;
    polisContentId: number;
    minNumberOfClusters: number;
}> {
    const polisContentQuery = await db
        .insert(polisContentTable)
        .values({
            conversationId,
            rawData: polisMathResults,
        })
        .returning({ polisContentId: polisContentTable.id });
    const polisContentId = polisContentQuery[0].polisContentId;
    let setClauseCommentPriority = {};
    let setClauseGroupAwareConsensusAgree = {};
    let setClauseGroupAwareConsensusDisagree = {};
    let setClauseCommentExtremities = {};
    if (Object.keys(polisMathResults.statements_df).length === 0) {
        log.warn(
            `[Math] No opinion to update for polisContentId=${String(
                polisContentId,
            )} and conversationSlugId=${conversationSlugId}`,
        );
    } else {
        const sqlChunksPriorities: SQL[] = [];
        sqlChunksPriorities.push(sql`(CASE`);
        const sqlChunksGroupAwareConsensusAgree: SQL[] = [];
        sqlChunksGroupAwareConsensusAgree.push(sql`(CASE`);
        const sqlChunksGroupAwareConsensusDisagree: SQL[] = [];
        sqlChunksGroupAwareConsensusDisagree.push(sql`(CASE`);
        const sqlChunksExtremities: SQL[] = [];
        sqlChunksExtremities.push(sql`(CASE`);
        for (const {
            statement_id,
            priority,
            "group-aware-consensus-agree": groupAwareConsensusAgree,
            "group-aware-consensus-disagree": groupAwareConsensusDisagree,
            extremity,
        } of polisMathResults.statements_df) {
            sqlChunksPriorities.push(
                sql`WHEN ${opinionTable.id} = ${statement_id}::int THEN ${priority}`,
            );
            sqlChunksGroupAwareConsensusAgree.push(
                sql`WHEN ${opinionTable.id} = ${statement_id}::int THEN ${groupAwareConsensusAgree}`,
            );
            sqlChunksGroupAwareConsensusDisagree.push(
                sql`WHEN ${opinionTable.id} = ${statement_id}::int THEN ${groupAwareConsensusDisagree}`,
            );
            sqlChunksExtremities.push(
                sql`WHEN ${opinionTable.id} = ${statement_id}::int THEN ${extremity}`,
            );
        }

        sqlChunksPriorities.push(sql`ELSE polis_priority`); // this should not happen
        sqlChunksPriorities.push(sql`END)`);
        const finalSqlCommentPriorities = sql.join(
            sqlChunksPriorities,
            sql.raw(" "),
        );
        setClauseCommentPriority = {
            polisPriority: finalSqlCommentPriorities,
        };

        sqlChunksGroupAwareConsensusAgree.push(sql`ELSE polis_ga_consensus_pa`); // this should not happen
        sqlChunksGroupAwareConsensusAgree.push(sql`END)`);
        const finalSqlGroupAwareConsensusAgree = sql.join(
            sqlChunksGroupAwareConsensusAgree,
            sql.raw(" "),
        );
        setClauseGroupAwareConsensusAgree = {
            polisGroupAwareConsensusProbabilityAgree:
                finalSqlGroupAwareConsensusAgree,
        };

        sqlChunksGroupAwareConsensusDisagree.push(
            sql`ELSE polis_ga_consensus_pd`,
        ); // this should not happen
        sqlChunksGroupAwareConsensusDisagree.push(sql`END)`);
        const finalSqlGroupAwareConsensusDisagree = sql.join(
            sqlChunksGroupAwareConsensusDisagree,
            sql.raw(" "),
        );
        setClauseGroupAwareConsensusDisagree = {
            polisGroupAwareConsensusProbabilityDisagree:
                finalSqlGroupAwareConsensusDisagree,
        };

        sqlChunksExtremities.push(sql`ELSE polis_divisiveness`); // this should not happen
        sqlChunksExtremities.push(sql`END)`);
        const finalSqlCommentExtremities: SQL = sql.join(
            sqlChunksExtremities,
            sql.raw(" "),
        );
        setClauseCommentExtremities = {
            polisDivisiveness: finalSqlCommentExtremities,
        };
    }

    let setClauseMajorityProbability = {};
    const sqlChunksMajorityProbability: SQL[] = [];
    let setClauseMajorityType = {};
    const sqlChunksMajorityType: SQL[] = [];

    if (polisMathResults.consensus.agree.length === 0) {
        log.info(
            `[Math] No majority agree opinions for polisContentId=${String(
                polisContentId,
            )} and conversationSlugId=${conversationSlugId}`,
        );
    } else {
        sqlChunksMajorityProbability.push(sql`(CASE`);
        sqlChunksMajorityType.push(sql`(CASE`);
        for (const consensusOpinion of polisMathResults.consensus.agree) {
            sqlChunksMajorityProbability.push(
                sql`WHEN ${opinionTable.id} = ${consensusOpinion.tid}::int THEN ${consensusOpinion["p-success"]}::real`,
            );
            sqlChunksMajorityType.push(
                sql`WHEN ${opinionTable.id} = ${consensusOpinion.tid}::int THEN 'agree'::vote_enum_simple`,
            );
        }
    }
    if (polisMathResults.consensus.disagree.length === 0) {
        log.info(
            `[Math] No majority disagree opinions for polisContentId=${String(
                polisContentId,
            )} and conversationSlugId=${conversationSlugId}`,
        );
    } else {
        if (sqlChunksMajorityProbability.length === 0) {
            sqlChunksMajorityProbability.push(sql`(CASE`);
        }
        if (sqlChunksMajorityType.length === 0) {
            sqlChunksMajorityType.push(sql`(CASE`);
        }
        for (const consensusOpinion of polisMathResults.consensus.disagree) {
            sqlChunksMajorityProbability.push(
                sql`WHEN ${opinionTable.id} = ${consensusOpinion.tid}::int THEN ${consensusOpinion["p-success"]}::real`,
            );
            sqlChunksMajorityType.push(
                sql`WHEN ${opinionTable.id} = ${consensusOpinion.tid}::int THEN 'disagree'::vote_enum_simple`,
            );
        }
    }

    if (sqlChunksMajorityProbability.length > 0) {
        // no else clause, anything not part of the received data is not a majority opinion!
        sqlChunksMajorityProbability.push(sql`END)`);
    }
    if (sqlChunksMajorityType.length > 0) {
        // no else clause, anything not part of the received data is not a majority opinion!
        sqlChunksMajorityType.push(sql`END)`);
    }
    const finalSqlMajorityProbability = sql.join(
        sqlChunksMajorityProbability,
        sql.raw(" "),
    );
    setClauseMajorityProbability = {
        polisMajorityProbabilitySuccess: finalSqlMajorityProbability,
    };
    // no else clause, anything not part of the received data is not a majority opinion!
    const finalSqlMajorityType = sql.join(sqlChunksMajorityType, sql.raw(" "));
    setClauseMajorityType = {
        polisMajorityType: finalSqlMajorityType,
    };

    if (sqlChunksMajorityProbability.length !== sqlChunksMajorityType.length) {
        throw new Error(
            `[Math] Some majority opinions are not assigned to their type for polisContentId=${String(
                polisContentId,
            )} and conversationSlugId=${conversationSlugId}`,
        );
    }

    if (
        sqlChunksMajorityProbability.length === 0 &&
        sqlChunksMajorityType.length === 0
    ) {
        await db
            .update(opinionTable)
            .set({
                ...setClauseCommentPriority,
                ...setClauseGroupAwareConsensusAgree,
                ...setClauseGroupAwareConsensusDisagree,
                ...setClauseCommentExtremities,
                updatedAt: nowZeroMs(),
            })
            .where(eq(opinionTable.conversationId, conversationId));
    } else {
        await db
            .update(opinionTable)
            .set({
                ...setClauseCommentPriority,
                ...setClauseGroupAwareConsensusAgree,
                ...setClauseGroupAwareConsensusDisagree,
                ...setClauseCommentExtremities,
                ...setClauseMajorityProbability,
                ...setClauseMajorityType,
                updatedAt: nowZeroMs(),
            })
            .where(eq(opinionTable.conversationId, conversationId));
    }
    /////
    /////
    // Step 1: Filter out nulls and undefined
    // Step 2: Use Set to remove duplicates
    const groupsSeenInParticipantsDf = Array.from(
        new Set(
            polisMathResults.participants_df
                .map((participant) => participant.cluster_id)
                .filter((clusterId) => clusterId != null),
        ),
    );

    let minNumberOfClusters = Math.min(
        Object.keys(polisMathResults.repness).length,
        Object.keys(polisMathResults.group_comment_stats).length,
        groupsSeenInParticipantsDf.length,
    );
    log.info(
        `[Math] Received ${String(
            minNumberOfClusters,
        )} clusters for conversationSlugId = ${conversationSlugId}`,
    );
    if (minNumberOfClusters > 6) {
        log.warn(
            "[Math] Received unexpectedly large amount of clusters, ignoring those after 6",
        );
        minNumberOfClusters = 6;
    }
    if (
        Object.keys(polisMathResults.repness).length !==
            Object.keys(polisMathResults.group_comment_stats).length &&
        Object.keys(polisMathResults.repness).length !==
            groupsSeenInParticipantsDf.length
    ) {
        log.warn(
            `[Math] Number of clusters is different for each object, taking the minimum number: polis math repness has ${String(
                Object.keys(polisMathResults.repness).length,
            )} clusters while group_comment_stats has ${String(
                Object.keys(polisMathResults.group_comment_stats).length,
            )} clusters and participants_df has ${String(
                groupsSeenInParticipantsDf.length,
            )} clusters`,
        );
    }
    const participantIds = polisMathResults.participants_df.map(
        (p) => p.participant_id,
    );
    const userIdByPolisParticipantId = await getUserIdByPolisParticipantIds({
        db,
        polisParticipantIds: participantIds,
    });
    const clustersInsightsForLlm: Record<
        string,
        ClusterInsightsWithOpinionIds
    > = {};
    for (let clusterKey = 0; clusterKey < minNumberOfClusters; clusterKey++) {
        const repnessEntry = polisMathResults.repness[clusterKey];
        const groupCommentStatsEntry =
            polisMathResults.group_comment_stats[clusterKey];
        const participants = polisMathResults.participants_df.filter(
            (participant) =>
                String(participant.cluster_id) === String(clusterKey),
        );
        const polisClusterExternalId = parseInt(
            // TODO: do that properly instead of parsing without try catch
            Object.keys(
                // temporary work-around until
                polisMathResults.group_comment_stats,
            )[clusterKey],
        );
        let polisClusterKeyStr: PolisKey;
        switch (clusterKey) {
            case 0: {
                polisClusterKeyStr = "0";
                break;
            }
            case 1: {
                polisClusterKeyStr = "1";
                break;
            }
            case 2: {
                polisClusterKeyStr = "2";
                break;
            }
            case 3: {
                polisClusterKeyStr = "3";
                break;
            }
            case 4: {
                polisClusterKeyStr = "4";
                break;
            }
            case 5: {
                polisClusterKeyStr = "5";
                break;
            }
            default: {
                log.warn(
                    `[Math] Ignoring the received ${String(
                        clusterKey,
                    )}th cluster of external id ${String(polisClusterExternalId)}`,
                );
                continue;
            }
        }
        clustersInsightsForLlm[polisClusterKeyStr] = {
            agreesWith: [],
            disagreesWith: [],
        };
        const polisClusterQuery = await db
            .insert(polisClusterTable)
            .values({
                polisContentId: polisContentId,
                key: polisClusterKeyStr,
                externalId: polisClusterExternalId,
                numUsers: participants.length,
            })
            .returning({ polisClusterId: polisClusterTable.id });
        const polisClusterId = polisClusterQuery[0].polisClusterId;

        const members = participants.map((participant) => {
            return {
                polisContentId: polisContentId,
                polisClusterId: polisClusterId,
                userId: userIdByPolisParticipantId[participant.participant_id],
            };
        });
        if (members.length > 0) {
            await db.insert(polisClusterUserTable).values(members);
        } else {
            log.warn(
                `[Math] No members to insert in polisClusterUserTable for clusterKey=${polisClusterKeyStr}, polisClusterId=${String(polisClusterId)} and polisContentId=${String(polisContentId)}`,
            );
        }
        const repnesses = [];
        for (const repness of repnessEntry) {
            repnesses.push({
                polisContentId: polisContentId,
                polisClusterId: polisClusterId,
                opinionId: repness.tid,
                agreementType: repness["repful-for"],
                probabilityAgreement: repness["p-success"],
                numAgreement: repness["n-success"],
                rawRepness: repness,
            });
            if (repness["repful-for"] === "agree") {
                clustersInsightsForLlm[polisClusterKeyStr].agreesWith.push(
                    repness.tid,
                );
            } else {
                clustersInsightsForLlm[polisClusterKeyStr].disagreesWith.push(
                    repness.tid,
                );
            }
        }
        log.info(
            `[Repness] for conversationId='${String(
                conversationId,
            )}' and for polisContentId='${String(polisContentId)}', clustersInsightsForLlm=${JSON.stringify(clustersInsightsForLlm)}\n${repnesses.map((rep) => JSON.stringify(rep)).join(", ")}`,
        );
        if (repnesses.length > 0) {
            await db.insert(polisClusterOpinionTable).values(repnesses);
        } else {
            log.warn(
                `[Math] No repnesses to insert in polisClusterOpinionTable for conversationId='${String(
                    conversationId,
                )}' and for polisContentId='${String(polisContentId)}' for clusterKey=${polisClusterKeyStr}, polisClusterId=${String(polisClusterId)} and polisContentId=${String(polisContentId)}`,
            );
        }

        // building bulk updates for numAgrees, numDisagrees & numPasses
        const sqlChunksForNumAgrees: SQL[] = [];
        const sqlChunksForNumDisagrees: SQL[] = [];
        const sqlChunksForNumPasses: SQL[] = [];
        sqlChunksForNumAgrees.push(sql`(CASE`);
        sqlChunksForNumDisagrees.push(sql`(CASE`);
        sqlChunksForNumPasses.push(sql`(CASE`);
        for (const groupCommentStats of groupCommentStatsEntry) {
            const totalVotes = groupCommentStats.ns;
            const totalAgrees = groupCommentStats.na;
            const totalDisagrees = groupCommentStats.nd;
            const totalPasses = totalVotes - totalAgrees - totalDisagrees;
            const opinionId = groupCommentStats.statement_id;
            sqlChunksForNumAgrees.push(
                sql`WHEN ${opinionTable.id} = ${opinionId} THEN ${totalAgrees}`,
            );
            sqlChunksForNumDisagrees.push(
                sql`WHEN ${opinionTable.id} = ${opinionId} THEN ${totalDisagrees}`,
            );
            sqlChunksForNumPasses.push(
                sql`WHEN ${opinionTable.id} = ${opinionId} THEN ${totalPasses}`,
            );
        }
        switch (polisClusterKeyStr) {
            case "0": {
                sqlChunksForNumAgrees.push(sql`ELSE 0::int`);
                sqlChunksForNumDisagrees.push(sql`ELSE 0::int`);
                sqlChunksForNumPasses.push(sql`ELSE 0::int`);
                sqlChunksForNumAgrees.push(sql`END)`);
                sqlChunksForNumDisagrees.push(sql`END)`);
                sqlChunksForNumPasses.push(sql`END)`);
                const finalSqlNumAgrees: SQL = sql.join(
                    sqlChunksForNumAgrees,
                    sql.raw(" "),
                );
                const finalSqlNumDisagrees: SQL = sql.join(
                    sqlChunksForNumDisagrees,
                    sql.raw(" "),
                );
                const finalSqlNumPasses: SQL = sql.join(
                    sqlChunksForNumPasses,
                    sql.raw(" "),
                );
                await db
                    .update(opinionTable)
                    .set({
                        polisCluster0Id: polisClusterId,
                        polisCluster0NumAgrees: finalSqlNumAgrees,
                        polisCluster0NumDisagrees: finalSqlNumDisagrees,
                        polisCluster0NumPasses: finalSqlNumPasses,
                        updatedAt: nowZeroMs(),
                    })
                    .where(eq(opinionTable.conversationId, conversationId));
                // commenting out because we want every opinions to be shown the existing clusters, to simplify data presentation
                // .where(inArray(opinionTable.slugId, opinionSlugIds));
                break;
            }
            case "1": {
                sqlChunksForNumAgrees.push(sql`ELSE 0::int`);
                sqlChunksForNumDisagrees.push(sql`ELSE 0::int`);
                sqlChunksForNumPasses.push(sql`ELSE 0::int`);
                sqlChunksForNumAgrees.push(sql`END)`);
                sqlChunksForNumDisagrees.push(sql`END)`);
                sqlChunksForNumPasses.push(sql`END)`);
                const finalSqlNumAgrees: SQL = sql.join(
                    sqlChunksForNumAgrees,
                    sql.raw(" "),
                );
                const finalSqlNumDisagrees: SQL = sql.join(
                    sqlChunksForNumDisagrees,
                    sql.raw(" "),
                );
                const finalSqlNumPasses: SQL = sql.join(
                    sqlChunksForNumPasses,
                    sql.raw(" "),
                );
                await db
                    .update(opinionTable)
                    .set({
                        polisCluster1Id: polisClusterId,
                        polisCluster1NumAgrees: finalSqlNumAgrees,
                        polisCluster1NumDisagrees: finalSqlNumDisagrees,
                        polisCluster1NumPasses: finalSqlNumPasses,
                        updatedAt: nowZeroMs(),
                    })
                    .where(eq(opinionTable.conversationId, conversationId));
                // commenting out because we want every opinions to be shown the existing clusters, to simplify data presentation
                // .where(inArray(opinionTable.slugId, opinionSlugIds));
                break;
            }
            case "2": {
                sqlChunksForNumAgrees.push(sql`ELSE 0::int`);
                sqlChunksForNumDisagrees.push(sql`ELSE 0::int`);
                sqlChunksForNumPasses.push(sql`ELSE 0::int`);
                sqlChunksForNumAgrees.push(sql`END)`);
                sqlChunksForNumDisagrees.push(sql`END)`);
                sqlChunksForNumPasses.push(sql`END)`);
                const finalSqlNumAgrees: SQL = sql.join(
                    sqlChunksForNumAgrees,
                    sql.raw(" "),
                );
                const finalSqlNumDisagrees: SQL = sql.join(
                    sqlChunksForNumDisagrees,
                    sql.raw(" "),
                );
                const finalSqlNumPasses: SQL = sql.join(
                    sqlChunksForNumPasses,
                    sql.raw(" "),
                );
                await db
                    .update(opinionTable)
                    .set({
                        polisCluster2Id: polisClusterId,
                        polisCluster2NumAgrees: finalSqlNumAgrees,
                        polisCluster2NumDisagrees: finalSqlNumDisagrees,
                        polisCluster2NumPasses: finalSqlNumPasses,
                        updatedAt: nowZeroMs(),
                    })
                    .where(eq(opinionTable.conversationId, conversationId));
                // commenting out because we want every opinions to be shown the existing clusters, to simplify data presentation
                // .where(inArray(opinionTable.slugId, opinionSlugIds));
                break;
            }
            case "3": {
                sqlChunksForNumAgrees.push(sql`ELSE 0::int`);
                sqlChunksForNumDisagrees.push(sql`ELSE 0::int`);
                sqlChunksForNumPasses.push(sql`ELSE 0::int`);
                sqlChunksForNumAgrees.push(sql`END)`);
                sqlChunksForNumDisagrees.push(sql`END)`);
                sqlChunksForNumPasses.push(sql`END)`);
                const finalSqlNumAgrees: SQL = sql.join(
                    sqlChunksForNumAgrees,
                    sql.raw(" "),
                );
                const finalSqlNumDisagrees: SQL = sql.join(
                    sqlChunksForNumDisagrees,
                    sql.raw(" "),
                );
                const finalSqlNumPasses: SQL = sql.join(
                    sqlChunksForNumPasses,
                    sql.raw(" "),
                );
                await db
                    .update(opinionTable)
                    .set({
                        polisCluster3Id: polisClusterId,
                        polisCluster3NumAgrees: finalSqlNumAgrees,
                        polisCluster3NumDisagrees: finalSqlNumDisagrees,
                        polisCluster3NumPasses: finalSqlNumPasses,
                        updatedAt: nowZeroMs(),
                    })
                    .where(eq(opinionTable.conversationId, conversationId));
                // commenting out because we want every opinions to be shown the existing clusters, to simplify data presentation
                // .where(inArray(opinionTable.slugId, opinionSlugIds));
                break;
            }
            case "4": {
                sqlChunksForNumAgrees.push(sql`ELSE 0::int`);
                sqlChunksForNumDisagrees.push(sql`ELSE 0::int`);
                sqlChunksForNumPasses.push(sql`ELSE 0::int`);
                sqlChunksForNumAgrees.push(sql`END)`);
                sqlChunksForNumDisagrees.push(sql`END)`);
                sqlChunksForNumPasses.push(sql`END)`);
                const finalSqlNumAgrees: SQL = sql.join(
                    sqlChunksForNumAgrees,
                    sql.raw(" "),
                );
                const finalSqlNumDisagrees: SQL = sql.join(
                    sqlChunksForNumDisagrees,
                    sql.raw(" "),
                );
                const finalSqlNumPasses: SQL = sql.join(
                    sqlChunksForNumPasses,
                    sql.raw(" "),
                );
                await db
                    .update(opinionTable)
                    .set({
                        polisCluster4Id: polisClusterId,
                        polisCluster4NumAgrees: finalSqlNumAgrees,
                        polisCluster4NumDisagrees: finalSqlNumDisagrees,
                        polisCluster4NumPasses: finalSqlNumPasses,
                        updatedAt: nowZeroMs(),
                    })
                    .where(eq(opinionTable.conversationId, conversationId));
                // commenting out because we want every opinions to be shown the existing clusters, to simplify data presentation
                // .where(inArray(opinionTable.slugId, opinionSlugIds));
                break;
            }
            case "5": {
                sqlChunksForNumAgrees.push(sql`ELSE 0::int`);
                sqlChunksForNumDisagrees.push(sql`ELSE 0::int`);
                sqlChunksForNumPasses.push(sql`ELSE 0::int`);
                sqlChunksForNumAgrees.push(sql`END)`);
                sqlChunksForNumDisagrees.push(sql`END)`);
                sqlChunksForNumPasses.push(sql`END)`);
                const finalSqlNumAgrees: SQL = sql.join(
                    sqlChunksForNumAgrees,
                    sql.raw(" "),
                );
                const finalSqlNumDisagrees: SQL = sql.join(
                    sqlChunksForNumDisagrees,
                    sql.raw(" "),
                );
                const finalSqlNumPasses: SQL = sql.join(
                    sqlChunksForNumPasses,
                    sql.raw(" "),
                );
                await db
                    .update(opinionTable)
                    .set({
                        polisCluster5Id: polisClusterId,
                        polisCluster5NumAgrees: finalSqlNumAgrees,
                        polisCluster5NumDisagrees: finalSqlNumDisagrees,
                        polisCluster5NumPasses: finalSqlNumPasses,
                        updatedAt: nowZeroMs(),
                    })
                    .where(eq(opinionTable.conversationId, conversationId));
                // commenting out because we want every opinions to be shown the existing clusters, to simplify data presentation
                // .where(inArray(opinionTable.slugId, opinionSlugIds));
                break;
            }
        }
    }
    // remove outdated polisClusterCache from opinionTable
    switch (minNumberOfClusters) {
        case 0:
            await db
                .update(opinionTable)
                .set({
                    polisCluster0Id: null,
                    polisCluster0NumAgrees: null,
                    polisCluster0NumDisagrees: null,
                    polisCluster0NumPasses: null,
                    polisCluster1Id: null,
                    polisCluster1NumAgrees: null,
                    polisCluster1NumDisagrees: null,
                    polisCluster1NumPasses: null,
                    polisCluster2Id: null,
                    polisCluster2NumAgrees: null,
                    polisCluster2NumDisagrees: null,
                    polisCluster2NumPasses: null,
                    polisCluster3Id: null,
                    polisCluster3NumAgrees: null,
                    polisCluster3NumDisagrees: null,
                    polisCluster3NumPasses: null,
                    polisCluster4Id: null,
                    polisCluster4NumAgrees: null,
                    polisCluster4NumDisagrees: null,
                    polisCluster4NumPasses: null,
                    polisCluster5Id: null,
                    polisCluster5NumAgrees: null,
                    polisCluster5NumDisagrees: null,
                    polisCluster5NumPasses: null,
                    updatedAt: nowZeroMs(),
                })
                .where(eq(opinionTable.conversationId, conversationId));
            // commenting out because we want every opinions to be shown the existing clusters, to simplify data presentation
            // .where(inArray(opinionTable.slugId, opinionSlugIds));
            break;
        case 1:
            await db
                .update(opinionTable)
                .set({
                    polisCluster1Id: null,
                    polisCluster1NumAgrees: null,
                    polisCluster1NumDisagrees: null,
                    polisCluster1NumPasses: null,
                    polisCluster2Id: null,
                    polisCluster2NumAgrees: null,
                    polisCluster2NumDisagrees: null,
                    polisCluster2NumPasses: null,
                    polisCluster3Id: null,
                    polisCluster3NumAgrees: null,
                    polisCluster3NumDisagrees: null,
                    polisCluster3NumPasses: null,
                    polisCluster4Id: null,
                    polisCluster4NumAgrees: null,
                    polisCluster4NumDisagrees: null,
                    polisCluster4NumPasses: null,
                    polisCluster5Id: null,
                    polisCluster5NumAgrees: null,
                    polisCluster5NumDisagrees: null,
                    polisCluster5NumPasses: null,
                    updatedAt: nowZeroMs(),
                })
                .where(eq(opinionTable.conversationId, conversationId));
            // commenting out because we want every opinions to be shown the existing clusters, to simplify data presentation
            // .where(inArray(opinionTable.slugId, opinionSlugIds));
            break;
        case 2:
            await db
                .update(opinionTable)
                .set({
                    polisCluster2Id: null,
                    polisCluster2NumAgrees: null,
                    polisCluster2NumDisagrees: null,
                    polisCluster2NumPasses: null,
                    polisCluster3Id: null,
                    polisCluster3NumAgrees: null,
                    polisCluster3NumDisagrees: null,
                    polisCluster3NumPasses: null,
                    polisCluster4Id: null,
                    polisCluster4NumAgrees: null,
                    polisCluster4NumDisagrees: null,
                    polisCluster4NumPasses: null,
                    polisCluster5Id: null,
                    polisCluster5NumAgrees: null,
                    polisCluster5NumDisagrees: null,
                    polisCluster5NumPasses: null,
                    updatedAt: nowZeroMs(),
                })
                .where(eq(opinionTable.conversationId, conversationId));
            // commenting out because we want every opinions to be shown the existing clusters, to simplify data presentation
            // .where(inArray(opinionTable.slugId, opinionSlugIds));
            break;
        case 3:
            await db
                .update(opinionTable)
                .set({
                    polisCluster3Id: null,
                    polisCluster3NumAgrees: null,
                    polisCluster3NumDisagrees: null,
                    polisCluster3NumPasses: null,
                    polisCluster4Id: null,
                    polisCluster4NumAgrees: null,
                    polisCluster4NumDisagrees: null,
                    polisCluster4NumPasses: null,
                    polisCluster5Id: null,
                    polisCluster5NumAgrees: null,
                    polisCluster5NumDisagrees: null,
                    polisCluster5NumPasses: null,
                    updatedAt: nowZeroMs(),
                })
                .where(eq(opinionTable.conversationId, conversationId));
            // commenting out because we want every opinions to be shown the existing clusters, to simplify data presentation
            // .where(inArray(opinionTable.slugId, opinionSlugIds));
            break;
        case 4:
            await db
                .update(opinionTable)
                .set({
                    polisCluster4Id: null,
                    polisCluster4NumAgrees: null,
                    polisCluster4NumDisagrees: null,
                    polisCluster4NumPasses: null,
                    polisCluster5Id: null,
                    polisCluster5NumAgrees: null,
                    polisCluster5NumDisagrees: null,
                    polisCluster5NumPasses: null,
                    updatedAt: nowZeroMs(),
                })
                .where(eq(opinionTable.conversationId, conversationId));
            // commenting out because we want every opinions to be shown the existing clusters, to simplify data presentation
            // .where(inArray(opinionTable.slugId, opinionSlugIds));
            break;
        case 5:
            await db
                .update(opinionTable)
                .set({
                    polisCluster5Id: null,
                    polisCluster5NumAgrees: null,
                    polisCluster5NumDisagrees: null,
                    polisCluster5NumPasses: null,
                    updatedAt: nowZeroMs(),
                })
                .where(eq(opinionTable.conversationId, conversationId));
            // commenting out because we want every opinions to be shown the existing clusters, to simplify data presentation
            // .where(inArray(opinionTable.slugId, opinionSlugIds));
            break;
        case 6:
            log.info("[Math] No cluster cache to empty");
            break;
        default:
            log.warn(
                `[Math] There are an unexpectecly high minimum number of clusters: ${String(
                    minNumberOfClusters,
                )}`,
            );
    }

    return { clustersInsightsForLlm, polisContentId, minNumberOfClusters };
}

async function loadPolisMathResults({
    db,
    conversationSlugId,
    conversationId,
    polisMathResults,
}: LoadPolisMathResultsProps): Promise<{
    clustersInsightsForLlm: Record<string, ClusterInsightsWithOpinionIds>;
    polisContentId: number;
    minNumberOfClusters: number;
}> {
    let doTransaction = true;
    if (db instanceof PgTransaction) {
        doTransaction = false;
    }
    if (doTransaction) {
        return await db.transaction(async (tx) => {
            return await doLoadPolisMathResults({
                db: tx,
                conversationSlugId,
                conversationId,
                polisMathResults,
            });
        });
    } else {
        return await doLoadPolisMathResults({
            db: db,
            conversationSlugId,
            conversationId,
            polisMathResults,
        });
    }
}

export async function getAndUpdatePolisMath({
    db,
    conversationSlugId,
    conversationId,
    votes,
    axiosPolis,
    awsAiLabelSummaryEnable,
    awsAiLabelSummaryRegion,
    awsAiLabelSummaryModelId,
    awsAiLabelSummaryTemperature,
    awsAiLabelSummaryTopP,
    awsAiLabelSummaryMaxTokens,
    awsAiLabelSummaryPrompt,
}: GetAndUpdatePolisMathProps) {
    let polisMathResults: MathResults;
    try {
        polisMathResults = await getMathResults({
            axiosPolis,
            conversationSlugId,
            conversationId,
            votes,
        });
        log.info(
            `[Math] Math Results for conversation_slug_id ${conversationSlugId}: \n${JSON.stringify(polisMathResults)}`,
        );
    } catch (e) {
        log.error("[Math] Error while parsing math results from Polis:");
        log.error(e);
        return;
    }

    const { conversationTitle, conversationBody } =
        await getConversationContent({
            db,
            conversationId,
        });
    const { clustersInsightsForLlm, polisContentId, minNumberOfClusters } =
        await loadPolisMathResults({
            db: db,
            conversationSlugId,
            conversationId,
            polisMathResults,
        });
    if (awsAiLabelSummaryEnable && minNumberOfClusters >= 2) {
        // only run the AI if there are at least 2 clusters
        const conversationInsightsWithOpinionIds: ConversationInsightsWithOpinionIds =
            {
                conversationTitle,
                conversationBody,
                clusters: clustersInsightsForLlm,
            };
        try {
            await updateAiLabelsAndSummaries({
                db: db,
                conversationId: conversationId,
                polisContentId,
                conversationInsightsWithOpinionIds,
                awsAiLabelSummaryRegion,
                awsAiLabelSummaryModelId,
                awsAiLabelSummaryTemperature,
                awsAiLabelSummaryTopP,
                awsAiLabelSummaryMaxTokens,
                awsAiLabelSummaryPrompt,
            });
        } catch (e: unknown) {
            log.error(
                e,
                `[LLM]: Error while trying to update the AI Label and Summary for conversationSlugId=${conversationSlugId}`,
            );
        }
    }
    await db
        .update(conversationTable)
        .set({
            currentPolisContentId: polisContentId,
            updatedAt: nowZeroMs(),
        })
        .where(eq(conversationTable.id, conversationId));
}

export async function getPolisVotes({
    db,
    conversationId,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    conversationSlugId: string;
}): Promise<PolisVoteRecord[]> {
    const results = await db
        .select({
            participantId: userTable.polisParticipantId,
            statementId: opinionTable.id,
            vote: voteContentTable.vote,
        })
        .from(voteTable)
        .innerJoin(
            voteContentTable,
            eq(voteContentTable.id, voteTable.currentContentId),
        )
        .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
        .innerJoin(userTable, eq(userTable.id, voteTable.authorId))
        .leftJoin(
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, voteTable.opinionId),
        )
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                eq(userTable.isDeleted, false), // filtering out deleted users
                isNull(opinionModerationTable.id), // filtering out moderated opinions
                isNotNull(voteTable.currentContentId), // filtering out deleted votes
                isNotNull(opinionTable.currentContentId), // filtering out delted opinions
            ),
        );
    const now = nowZeroMs();
    const votes: PolisVoteRecord[] = results.map((result) => {
        return {
            participant_id: result.participantId, // TODO: support string too
            statement_id: result.statementId, // TODO: support string too
            vote:
                result.vote === "agree"
                    ? 1
                    : result.vote === "disagree"
                      ? -1
                      : 0,
            conversation_id: conversationSlugId,
            datetime: now.toISOString(),
            modified: now.getTime(),
            weight_x_32767: null,
        };
    });
    return votes;
}
