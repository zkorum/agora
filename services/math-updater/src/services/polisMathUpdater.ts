/**
 * Polis math update functions
 * Extracted from services/api/src/service/polis.ts
 * Contains only functions needed for math-updater service
 */

import type {
    PolisKey,
    GenLabelSummaryOutputClusterStrict,
    GenLabelSummaryOutputClusterLoose,
} from "@/shared/types/zod.js";
import type { AxiosInstance } from "axios";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    and,
    eq,
    inArray,
    isNotNull,
    isNull,
    sql,
    type SQL,
} from "drizzle-orm";
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
    // Log raw response for debugging before parsing
    log.info(
        `[Math] Raw response from Python bridge for conversation ${conversationSlugId}:\n${JSON.stringify(response.data, null, 2)}`,
    );

    try {
        return zodMathResults.parse(response.data);
    } catch (e) {
        log.warn(
            `[Math] Received invalid/incomplete data from Python bridge for conversation ${conversationSlugId}. This usually means insufficient votes/opinions for clustering.`,
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

        // Insert cluster users (batched to avoid parameter limit)
        const members = participants.map((participant) => {
            return {
                polisContentId: polisContentId,
                polisClusterId: polisClusterId,
                userId: userIdByPolisParticipantId[participant.participant_id],
            };
        });
        if (members.length > 0) {
            const MEMBER_BATCH_SIZE = 5000; // 3 columns per row = max ~21,000 rows before hitting 65k param limit
            const memberBatches = batchArray(members, MEMBER_BATCH_SIZE);

            log.info(
                `[Math] Inserting ${members.length} cluster users in ${memberBatches.length} batches for clusterKey=${polisClusterKeyStr}`,
            );

            for (const memberBatch of memberBatches) {
                await db.insert(polisClusterUserTable).values(memberBatch);
            }
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
            const REPNESS_BATCH_SIZE = 2000; // 6 columns per row = max ~10,000 rows before hitting 65k param limit
            const repnessBatches = batchArray(repnesses, REPNESS_BATCH_SIZE);

            log.info(
                `[Math] Inserting ${repnesses.length} cluster opinions in ${repnessBatches.length} batches for clusterKey=${polisClusterKeyStr}`,
            );

            for (const repnessBatch of repnessBatches) {
                await db.insert(polisClusterOpinionTable).values(repnessBatch);
            }
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
    aiClustersLabelsAndSummaries?:
        | GenLabelSummaryOutputClusterStrict
        | GenLabelSummaryOutputClusterLoose;
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

        // Build a map for efficient O(1) lookup of statement data
        const statementDataMap = new Map(
            polisMathResults.statements_df.map((stmt) => [
                stmt.statement_id,
                {
                    priority: stmt.priority,
                    groupAwareConsensusAgree:
                        stmt["group-aware-consensus-agree"],
                    groupAwareConsensusDisagree:
                        stmt["group-aware-consensus-disagree"],
                    extremity: stmt.extremity,
                },
            ]),
        );

        if (statementDataMap.size === 0) {
            log.warn(
                `[Math] No opinion to update for polisContentId=${String(
                    polisContentId,
                )} and conversationId=${conversationId}`,
            );
        }

        // Build SQL clauses for majority opinions (not batched - these apply globally)
        // Use a single data structure to ensure probability and type stay in sync
        const majorityOpinions: Array<{
            probability: SQL;
            type: SQL;
        }> = [];

        if (polisMathResults.consensus.agree.length === 0) {
            log.info(
                `[Math] No majority agree opinions for polisContentId=${String(
                    polisContentId,
                )} and conversationId=${conversationId}`,
            );
        } else {
            for (const consensusOpinion of polisMathResults.consensus.agree) {
                majorityOpinions.push({
                    probability: sql`WHEN ${opinionTable.id} = ${consensusOpinion.tid}::int THEN ${consensusOpinion["p-success"]}::real`,
                    type: sql`WHEN ${opinionTable.id} = ${consensusOpinion.tid}::int THEN 'agree'::vote_enum_simple`,
                });
            }
        }

        if (polisMathResults.consensus.disagree.length === 0) {
            log.info(
                `[Math] No majority disagree opinions for polisContentId=${String(
                    polisContentId,
                )} and conversationId=${conversationId}`,
            );
        } else {
            for (const consensusOpinion of polisMathResults.consensus
                .disagree) {
                majorityOpinions.push({
                    probability: sql`WHEN ${opinionTable.id} = ${consensusOpinion.tid}::int THEN ${consensusOpinion["p-success"]}::real`,
                    type: sql`WHEN ${opinionTable.id} = ${consensusOpinion.tid}::int THEN 'disagree'::vote_enum_simple`,
                });
            }
        }

        // Build final SQL expressions (type-safe - no consistency check needed!)
        let setClauseMajorityProbability = {};
        let setClauseMajorityType = {};

        if (majorityOpinions.length > 0) {
            const sqlChunksProbability = [
                sql`(CASE`,
                ...majorityOpinions.map((m) => m.probability),
                sql`END)`,
            ];
            const sqlChunksType = [
                sql`(CASE`,
                ...majorityOpinions.map((m) => m.type),
                sql`END)`,
            ];

            setClauseMajorityProbability = {
                polisMajorityProbabilitySuccess: sql.join(
                    sqlChunksProbability,
                    sql.raw(" "),
                ),
            };
            setClauseMajorityType = {
                polisMajorityType: sql.join(sqlChunksType, sql.raw(" ")),
            };
        }

        // Fetch all opinion IDs for this conversation to batch the updates
        const allOpinionIds = await tx
            .select({ id: opinionTable.id })
            .from(opinionTable)
            .where(eq(opinionTable.conversationId, conversationId));

        const opinionIdList = allOpinionIds.map((op) => op.id);
        const BATCH_SIZE = 1000; // Process 1000 opinions at a time to avoid parameter limit
        const opinionIdBatches = batchArray(opinionIdList, BATCH_SIZE);

        log.info(
            `[Math] Updating ${opinionIdList.length} opinions in ${opinionIdBatches.length} batches for conversationId=${conversationId}`,
        );

        // Build cluster stats lookup maps for efficient batch processing
        // Array indexed by cluster index, containing clusterId and stats map
        const clusterStatsMapsByIndex: Array<{
            clusterId: number;
            statsMap: Map<
                number,
                { agrees: number; disagrees: number; passes: number }
            >;
        }> = [];

        const polisKeys: PolisKey[] = ["0", "1", "2", "3", "4", "5"];

        for (let i = 0; i < minNumberOfClusters; i++) {
            const polisKey = polisKeys[i];
            const polisClusterId = clusterIdsByKey[polisKey];
            const groupCommentStatsEntry = groupCommentStatsByKey[polisKey];

            if (!polisClusterId || !groupCommentStatsEntry) {
                continue;
            }

            // Build a map for this cluster: opinionId → stats
            const statsMap = new Map<
                number,
                { agrees: number; disagrees: number; passes: number }
            >();

            for (const groupCommentStats of groupCommentStatsEntry) {
                const totalVotes = groupCommentStats.ns;
                const totalAgrees = groupCommentStats.na;
                const totalDisagrees = groupCommentStats.nd;
                const totalPasses = totalVotes - totalAgrees - totalDisagrees;
                const opinionId = groupCommentStats.statement_id;

                statsMap.set(opinionId, {
                    agrees: totalAgrees,
                    disagrees: totalDisagrees,
                    passes: totalPasses,
                });
            }

            clusterStatsMapsByIndex[i] = {
                clusterId: polisClusterId,
                statsMap,
            };
        }

        // Execute batched opinion table updates
        // Build cluster CASE statements per batch to avoid SQL parameter limits
        for (const [batchIndex, batchIds] of opinionIdBatches.entries()) {
            log.info(
                `[Math] Processing batch ${batchIndex + 1}/${opinionIdBatches.length} with ${batchIds.length} opinions`,
            );

            // Build CASE statements only for opinions in this batch
            const sqlChunksPriorities: SQL[] = [sql`(CASE`];
            const sqlChunksGroupAwareConsensusAgree: SQL[] = [sql`(CASE`];
            const sqlChunksGroupAwareConsensusDisagree: SQL[] = [sql`(CASE`];
            const sqlChunksExtremities: SQL[] = [sql`(CASE`];

            for (const opinionId of batchIds) {
                const stmt = statementDataMap.get(opinionId);
                if (stmt) {
                    sqlChunksPriorities.push(
                        sql`WHEN ${opinionTable.id} = ${opinionId}::int THEN ${stmt.priority}`,
                    );
                    sqlChunksGroupAwareConsensusAgree.push(
                        sql`WHEN ${opinionTable.id} = ${opinionId}::int THEN ${stmt.groupAwareConsensusAgree}`,
                    );
                    sqlChunksGroupAwareConsensusDisagree.push(
                        sql`WHEN ${opinionTable.id} = ${opinionId}::int THEN ${stmt.groupAwareConsensusDisagree}`,
                    );
                    sqlChunksExtremities.push(
                        sql`WHEN ${opinionTable.id} = ${opinionId}::int THEN ${stmt.extremity}`,
                    );
                }
            }

            // Build cluster cache updates for this batch
            const batchClusterUpdates: Record<string, any> = {};

            for (let i = 0; i < minNumberOfClusters; i++) {
                const clusterData = clusterStatsMapsByIndex[i];
                if (!clusterData) {
                    continue;
                }

                const sqlChunksForNumAgrees: SQL[] = [sql`(CASE`];
                const sqlChunksForNumDisagrees: SQL[] = [sql`(CASE`];
                const sqlChunksForNumPasses: SQL[] = [sql`(CASE`];

                // Only include WHEN clauses for opinions in this batch
                for (const opinionId of batchIds) {
                    const stats = clusterData.statsMap.get(opinionId);
                    if (stats) {
                        sqlChunksForNumAgrees.push(
                            sql`WHEN ${opinionTable.id} = ${opinionId} THEN ${stats.agrees}`,
                        );
                        sqlChunksForNumDisagrees.push(
                            sql`WHEN ${opinionTable.id} = ${opinionId} THEN ${stats.disagrees}`,
                        );
                        sqlChunksForNumPasses.push(
                            sql`WHEN ${opinionTable.id} = ${opinionId} THEN ${stats.passes}`,
                        );
                    }
                }

                sqlChunksForNumAgrees.push(sql`ELSE 0::int END)`);
                sqlChunksForNumDisagrees.push(sql`ELSE 0::int END)`);
                sqlChunksForNumPasses.push(sql`ELSE 0::int END)`);

                batchClusterUpdates[`polisCluster${i}Id`] =
                    clusterData.clusterId;
                batchClusterUpdates[`polisCluster${i}NumAgrees`] = sql.join(
                    sqlChunksForNumAgrees,
                    sql.raw(" "),
                );
                batchClusterUpdates[`polisCluster${i}NumDisagrees`] = sql.join(
                    sqlChunksForNumDisagrees,
                    sql.raw(" "),
                );
                batchClusterUpdates[`polisCluster${i}NumPasses`] = sql.join(
                    sqlChunksForNumPasses,
                    sql.raw(" "),
                );
            }

            // Clear out cluster caches for clusters that don't exist
            for (let i = minNumberOfClusters; i < 6; i++) {
                batchClusterUpdates[`polisCluster${i}Id`] = null;
                batchClusterUpdates[`polisCluster${i}NumAgrees`] = null;
                batchClusterUpdates[`polisCluster${i}NumDisagrees`] = null;
                batchClusterUpdates[`polisCluster${i}NumPasses`] = null;
            }

            // Only proceed if we have statement data for this batch
            if (sqlChunksPriorities.length > 1) {
                sqlChunksPriorities.push(sql`ELSE polis_priority END)`);
                sqlChunksGroupAwareConsensusAgree.push(
                    sql`ELSE polis_ga_consensus_pa END)`,
                );
                sqlChunksGroupAwareConsensusDisagree.push(
                    sql`ELSE polis_ga_consensus_pd END)`,
                );
                sqlChunksExtremities.push(sql`ELSE polis_divisiveness END)`);

                const finalSqlCommentPriorities = sql.join(
                    sqlChunksPriorities,
                    sql.raw(" "),
                );
                const finalSqlGroupAwareConsensusAgree = sql.join(
                    sqlChunksGroupAwareConsensusAgree,
                    sql.raw(" "),
                );
                const finalSqlGroupAwareConsensusDisagree = sql.join(
                    sqlChunksGroupAwareConsensusDisagree,
                    sql.raw(" "),
                );
                const finalSqlCommentExtremities = sql.join(
                    sqlChunksExtremities,
                    sql.raw(" "),
                );

                await tx
                    .update(opinionTable)
                    .set({
                        polisPriority: finalSqlCommentPriorities,
                        polisGroupAwareConsensusProbabilityAgree:
                            finalSqlGroupAwareConsensusAgree,
                        polisGroupAwareConsensusProbabilityDisagree:
                            finalSqlGroupAwareConsensusDisagree,
                        polisDivisiveness: finalSqlCommentExtremities,
                        ...setClauseMajorityProbability,
                        ...setClauseMajorityType,
                        ...batchClusterUpdates,
                        updatedAt: nowZeroMs(),
                    })
                    .where(inArray(opinionTable.id, batchIds));
            } else {
                log.warn(
                    `[Math] No statement data found for batch ${batchIndex + 1}, skipping polis updates for this batch`,
                );
            }
        }

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
        log.warn(
            `[Math] Failed to get valid math results for conversation ${conversationSlugId} (insufficient data for clustering). Will retry when more votes/opinions are added.`,
        );
        log.error(
            e,
            "[Math] Detailed error from Python bridge (usually Zod validation or PCA dimensionality error):",
        );
        return; // Exit gracefully - will retry later with more data
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
        | GenLabelSummaryOutputClusterStrict
        | GenLabelSummaryOutputClusterLoose
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
