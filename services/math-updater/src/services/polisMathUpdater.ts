/**
 * Polis math update functions
 * Extracted from services/api/src/service/polis.ts
 * Contains only functions needed for math-updater service
 */

import type { PolisKey } from "@/shared/types/zod.js";
import type { AxiosInstance } from "axios";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
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
import {
    generateAiLabelsAndSummaries,
    updateClustersLabelsAndSummaries,
} from "./llmService.js";
import {
    generateAllClusterTranslations,
    insertClusterTranslations,
} from "./translationService.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { log } from "@/app.js";

// Helper function for zero-millisecond timestamps
function nowZeroMs(): Date {
    const now = new Date();
    now.setMilliseconds(0);
    return now;
}

// Helper function to split an array into batches
function batchArray<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
        batches.push(array.slice(i, i + batchSize));
    }
    return batches;
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
    googleCloudCredentials?: GoogleCloudCredentials;
}

// Return type for Phase 1
interface Phase1Result {
    clustersInsightsForLlm: Record<string, ClusterInsightsWithOpinionIds>;
    polisContentId: number;
    minNumberOfClusters: number;
    clusterIdsByKey: Record<PolisKey, number>;
    groupCommentStatsByKey: Record<PolisKey, any[]>;
}

/**
 * Phase 1: Create immutable cluster structure (Transaction)
 * - Insert polisContent
 * - Insert polis clusters (get IDs via RETURNING)
 * - Insert cluster users
 * - Insert cluster opinions
 * Returns cluster IDs and data needed for Phase 2 and 3
 */
async function phase1CreateClusterStructure({
    db,
    conversationSlugId,
    conversationId,
    polisMathResults,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    conversationId: number;
    polisMathResults: MathResults;
}): Promise<Phase1Result> {
    const polisContentQuery = await db
        .insert(polisContentTable)
        .values({
            conversationId,
            rawData: polisMathResults,
        })
        .returning({ polisContentId: polisContentTable.id });
    const polisContentId = polisContentQuery[0].polisContentId;

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
    const clusterIdsByKey: Record<PolisKey, number> = {} as Record<
        PolisKey,
        number
    >;
    const groupCommentStatsByKey: Record<PolisKey, any[]> = {} as Record<
        PolisKey,
        any[]
    >;

    for (let clusterKey = 0; clusterKey < minNumberOfClusters; clusterKey++) {
        const repnessEntry = polisMathResults.repness[clusterKey];
        const groupCommentStatsEntry =
            polisMathResults.group_comment_stats[clusterKey];
        const participants = polisMathResults.participants_df.filter(
            (participant) =>
                String(participant.cluster_id) === String(clusterKey),
        );
        const polisClusterExternalId = parseInt(
            Object.keys(polisMathResults.group_comment_stats)[clusterKey],
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

        // Insert cluster and get ID
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
        clusterIdsByKey[polisClusterKeyStr] = polisClusterId;
        groupCommentStatsByKey[polisClusterKeyStr] = groupCommentStatsEntry;

        // Insert cluster users
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

        // Insert cluster opinions
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
    }

    return {
        clustersInsightsForLlm,
        polisContentId,
        minNumberOfClusters,
        clusterIdsByKey,
        groupCommentStatsByKey,
    };
}

/**
 * Phase 3: Atomic activation (Transaction)
 * Updates AI labels, translations, opinionTable with all math data, and conversationTable
 * This makes the new data "live" atomically
 */
async function phase3ActivateNewData({
    db,
    conversationId,
    polisContentId,
    polisMathResults,
    clusterIdsByKey,
    groupCommentStatsByKey,
    minNumberOfClusters,
    aiClustersLabelsAndSummaries,
    translations,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    polisContentId: number;
    polisMathResults: MathResults;
    clusterIdsByKey: Record<PolisKey, number>;
    groupCommentStatsByKey: Record<PolisKey, any[]>;
    minNumberOfClusters: number;
    aiClustersLabelsAndSummaries?: Record<
        string,
        { label: string; summary: string } | undefined
    >;
    translations?: Array<{
        polisClusterId: number;
        languageCode: string;
        aiLabel: string | null;
        aiSummary: string | null;
    }>;
}): Promise<void> {
    await db.transaction(async (tx) => {
        // Write AI labels and summaries if available
        if (aiClustersLabelsAndSummaries) {
            await updateClustersLabelsAndSummaries({
                db: tx,
                conversationId,
                polisContentId,
                aiClustersLabelsAndSummaries,
            });
        }

        // Insert translations if available
        if (translations && translations.length > 0) {
            await insertClusterTranslations({
                db: tx,
                translations,
                conversationId,
            });
        }

        // Build SQL clauses for priorities, consensus, extremities
        let setClauseCommentPriority = {};
        let setClauseGroupAwareConsensusAgree = {};
        let setClauseGroupAwareConsensusDisagree = {};
        let setClauseCommentExtremities = {};
        let setClauseMajorityProbability = {};
        let setClauseMajorityType = {};

        if (Object.keys(polisMathResults.statements_df).length !== 0) {
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

            sqlChunksPriorities.push(sql`ELSE polis_priority`);
            sqlChunksPriorities.push(sql`END)`);
            const finalSqlCommentPriorities = sql.join(
                sqlChunksPriorities,
                sql.raw(" "),
            );
            setClauseCommentPriority = {
                polisPriority: finalSqlCommentPriorities,
            };

            sqlChunksGroupAwareConsensusAgree.push(
                sql`ELSE polis_ga_consensus_pa`,
            );
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
            );
            sqlChunksGroupAwareConsensusDisagree.push(sql`END)`);
            const finalSqlGroupAwareConsensusDisagree = sql.join(
                sqlChunksGroupAwareConsensusDisagree,
                sql.raw(" "),
            );
            setClauseGroupAwareConsensusDisagree = {
                polisGroupAwareConsensusProbabilityDisagree:
                    finalSqlGroupAwareConsensusDisagree,
            };

            sqlChunksExtremities.push(sql`ELSE polis_divisiveness`);
            sqlChunksExtremities.push(sql`END)`);
            const finalSqlCommentExtremities: SQL = sql.join(
                sqlChunksExtremities,
                sql.raw(" "),
            );
            setClauseCommentExtremities = {
                polisDivisiveness: finalSqlCommentExtremities,
            };
        }

        // Build SQL clauses for majority opinions
        const sqlChunksMajorityProbability: SQL[] = [];
        const sqlChunksMajorityType: SQL[] = [];

        if (polisMathResults.consensus.agree.length > 0) {
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
        if (polisMathResults.consensus.disagree.length > 0) {
            if (sqlChunksMajorityProbability.length === 0) {
                sqlChunksMajorityProbability.push(sql`(CASE`);
            }
            if (sqlChunksMajorityType.length === 0) {
                sqlChunksMajorityType.push(sql`(CASE`);
            }
            for (const consensusOpinion of polisMathResults.consensus
                .disagree) {
                sqlChunksMajorityProbability.push(
                    sql`WHEN ${opinionTable.id} = ${consensusOpinion.tid}::int THEN ${consensusOpinion["p-success"]}::real`,
                );
                sqlChunksMajorityType.push(
                    sql`WHEN ${opinionTable.id} = ${consensusOpinion.tid}::int THEN 'disagree'::vote_enum_simple`,
                );
            }
        }

        if (sqlChunksMajorityProbability.length > 0) {
            sqlChunksMajorityProbability.push(sql`END)`);
        }
        if (sqlChunksMajorityType.length > 0) {
            sqlChunksMajorityType.push(sql`END)`);
        }
        const finalSqlMajorityProbability = sql.join(
            sqlChunksMajorityProbability,
            sql.raw(" "),
        );
        setClauseMajorityProbability = {
            polisMajorityProbabilitySuccess: finalSqlMajorityProbability,
        };
        const finalSqlMajorityType = sql.join(
            sqlChunksMajorityType,
            sql.raw(" "),
        );
        setClauseMajorityType = {
            polisMajorityType: finalSqlMajorityType,
        };

        // Build cluster cache updates
        const clusterUpdates: Record<string, any> = {};
        const polisKeys: PolisKey[] = ["0", "1", "2", "3", "4", "5"];

        for (let i = 0; i < minNumberOfClusters; i++) {
            const polisKey = polisKeys[i];
            const polisClusterId = clusterIdsByKey[polisKey];
            const groupCommentStatsEntry = groupCommentStatsByKey[polisKey];

            if (!polisClusterId || !groupCommentStatsEntry) {
                continue;
            }

            // Build SQL for this cluster
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

            clusterUpdates[`polisCluster${i}Id`] = polisClusterId;
            clusterUpdates[`polisCluster${i}NumAgrees`] = finalSqlNumAgrees;
            clusterUpdates[`polisCluster${i}NumDisagrees`] =
                finalSqlNumDisagrees;
            clusterUpdates[`polisCluster${i}NumPasses`] = finalSqlNumPasses;
        }

        // Clear out cluster caches for clusters that don't exist
        for (let i = minNumberOfClusters; i < 6; i++) {
            clusterUpdates[`polisCluster${i}Id`] = null;
            clusterUpdates[`polisCluster${i}NumAgrees`] = null;
            clusterUpdates[`polisCluster${i}NumDisagrees`] = null;
            clusterUpdates[`polisCluster${i}NumPasses`] = null;
        }

        // Execute the big opinion table update
        await tx
            .update(opinionTable)
            .set({
                ...setClauseCommentPriority,
                ...setClauseGroupAwareConsensusAgree,
                ...setClauseGroupAwareConsensusDisagree,
                ...setClauseCommentExtremities,
                ...setClauseMajorityProbability,
                ...setClauseMajorityType,
                ...clusterUpdates,
                updatedAt: nowZeroMs(),
            })
            .where(eq(opinionTable.conversationId, conversationId));

        // Update conversation table to point to new polisContent
        await tx
            .update(conversationTable)
            .set({
                currentPolisContentId: polisContentId,
                updatedAt: nowZeroMs(),
            })
            .where(eq(conversationTable.id, conversationId));
    });
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
    googleCloudCredentials,
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

    // Phase 1: Create immutable cluster structure (transactional)
    log.info(
        `[Math] Phase 1: Creating cluster structure for conversationId=${conversationId}`,
    );
    const {
        clustersInsightsForLlm,
        polisContentId,
        minNumberOfClusters,
        clusterIdsByKey,
        groupCommentStatsByKey,
    } = await db.transaction(async (tx) => {
        return await phase1CreateClusterStructure({
            db: tx,
            conversationSlugId,
            conversationId,
            polisMathResults,
        });
    });
    log.info(
        `[Math] Phase 1 complete: polisContentId=${polisContentId}, minNumberOfClusters=${minNumberOfClusters}`,
    );

    // Phase 2: External API calls (no transaction, no DB writes)
    log.info(
        `[Math] Phase 2: Calling external APIs for conversationId=${conversationId} and polisClusterId=${String(polisContentId)}`,
    );
    let aiClustersLabelsAndSummaries:
        | Record<string, { label: string; summary: string } | undefined>
        | undefined = undefined;
    let translations:
        | Array<{
              polisClusterId: number;
              languageCode: string;
              aiLabel: string | null;
              aiSummary: string | null;
          }>
        | undefined = undefined;

    if (awsAiLabelSummaryEnable) {
        if (minNumberOfClusters >= 2) {
            const conversationInsightsWithOpinionIds: ConversationInsightsWithOpinionIds =
                {
                    conversationTitle,
                    conversationBody,
                    clusters: clustersInsightsForLlm,
                };
            try {
                aiClustersLabelsAndSummaries =
                    await generateAiLabelsAndSummaries({
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
                log.info(
                    `[Math] Phase 2: AI labels generated for conversationId=${conversationId} and polisClusterId=${String(polisContentId)}`,
                );

                if (googleCloudCredentials !== undefined) {
                    try {
                        translations = await generateAllClusterTranslations({
                            googleCloudCredentials,
                            clusterIdsByKey,
                            aiClustersLabelsAndSummaries,
                            conversationId,
                        });
                        log.info(
                            `[Math] Phase 2: Translations generated for conversationId=${conversationId} and polisClusterId=${String(polisContentId)}`,
                        );
                    } catch (translationError: unknown) {
                        log.error(
                            translationError,
                            `[Math] Phase 2: Translation failed for conversationId=${conversationId} and polisClusterId=${String(polisContentId)}, continuing without translations`,
                        );
                        // Don't fail the math update if translation fails
                        translations = undefined;
                    }
                } else {
                    log.warn(
                        `[Math] Phase 2: Translations generation disabled, continuing without them for conversationId=${conversationId} and polisClusterId=${String(polisContentId)}`,
                    );
                }
            } catch (e: unknown) {
                log.error(
                    e,
                    `[Math] Phase 2: AI/Translation failed for conversationId=${conversationId} and polisClusterId=${String(polisContentId)}, continuing without AI labels`,
                );
                // Continue to Phase 3 even if AI fails - we still want to activate the math data
                aiClustersLabelsAndSummaries = undefined;
                translations = undefined;
            }
        } else {
            log.warn(
                `[Math] Phase 2 aborted for conversationId=${conversationId} and polisClusterId=${String(polisContentId)}: not enough clusters to create labels for conversationId=${conversationId}`,
            );
        }
    } else {
        log.warn(
            `[Math] Phase 2 aborted for conversationId=${conversationId} and polisClusterId=${String(polisContentId)}: LLM feature disabled `,
        );
    }
    log.info(
        `[Math] Phase 2 complete for conversationId=${conversationId} and polisClusterId=${String(polisContentId)}`,
    );

    // Phase 3: Atomic activation (transactional)
    log.info(
        `[Math] Phase 3: Activating new data for conversationId=${conversationId} and polisClusterId=${String(polisContentId)}`,
    );
    await phase3ActivateNewData({
        db,
        conversationId,
        polisContentId,
        polisMathResults,
        clusterIdsByKey,
        groupCommentStatsByKey,
        minNumberOfClusters,
        aiClustersLabelsAndSummaries,
        translations,
    });
    log.info(
        `[Math] Phase 3 complete: Data activated for conversationId=${conversationId} and polisClusterId=${String(polisContentId)}`,
    );
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
