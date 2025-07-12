import { log } from "@/app.js";
import type { PolisKey, VotingAction } from "@/shared/types/zod.js";
import type { AxiosInstance } from "axios";
import { setTimeout } from "timers/promises";
import {
    PostgresJsDatabase,
    type PostgresJsDatabase as PostgresDatabase,
} from "drizzle-orm/postgres-js";
import {
    polisClusterOpinionTable,
    polisClusterUserTable,
    polisContentTable,
    opinionTable,
    conversationTable,
} from "@/schema.js";
import { polisClusterTable } from "@/schema.js";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { nowZeroMs } from "@/shared/common/util.js";
import {
    type PolisMathAndMetadata,
    zodPolisMathAndMetadata,
    type CommentPriorities,
    type GroupAwareConsensus,
} from "@/shared/types/polis.js";
import * as llmService from "@/service/llmLabelSummary.js";
import { PgTransaction } from "drizzle-orm/pg-core";

interface PolisCreateUserProps {
    userId: string;
    axiosPolis: AxiosInstance;
    polisUserPassword: string;
    polisUserEmailLocalPart: string;
    polisUserEmailDomain: string;
}

interface PolisCreateConversationProps {
    userId: string;
    conversationSlugId: string;
    axiosPolis: AxiosInstance;
}

interface PolisCreateOpinionProps {
    userId: string;
    conversationSlugId: string;
    opinionSlugId: string;
    axiosPolis: AxiosInstance;
}

interface PolisCreateOrUpdateVoteProps {
    userId: string;
    conversationSlugId: string;
    opinionSlugId: string;
    axiosPolis: AxiosInstance;
    votingAction: VotingAction;
}

interface PolisGetMathResultsProps {
    axiosPolis: AxiosInstance;
    conversationSlugId: string;
}

export async function createUser({
    axiosPolis,
    polisUserEmailLocalPart,
    polisUserEmailDomain,
    polisUserPassword,
    userId,
}: PolisCreateUserProps) {
    log.info("Registering a new user in Polis...");
    const postCreateUserUrl = "/api/v3/auth/new";
    const body = {
        hname: userId,
        email: `${polisUserEmailLocalPart}admin+${userId}@${polisUserEmailDomain}`,
        password: polisUserPassword,
        gatekeeperTosPrivacy: true,
    };
    await axiosPolis.post(postCreateUserUrl, body, {
        headers: {
            "Content-Type": "application/json",
        },
    });
}

export async function createConversation({
    axiosPolis,
    userId,
    conversationSlugId,
}: PolisCreateConversationProps) {
    log.info("Creating a new conversation in Polis...");
    const postCreateConversationUrl = "/api/v3/conversations";
    const body = {
        is_draft: true,
        is_active: true,
        ownername: userId,
        is_mod: true,
        is_owner: true,

        topic: "dummy",
        description: "dummy",
        conversation_id: conversationSlugId,

        is_anon: false,
        is_public: true,
        is_data_open: true,
        profanity_filter: false,
        spam_filter: false,
        strict_moderation: false,
        prioritize_seed: false,
        lti_users_only: false,
        owner_sees_participation_stats: true,
        auth_needed_to_vote: false,
        auth_needed_to_write: false,
        auth_opt_fb: false,
        auth_opt_tw: false,
        auth_opt_allow_3rdparty: true,
        auth_opt_fb_computed: false,
        auth_opt_tw_computed: false,
    };
    await axiosPolis.post(postCreateConversationUrl, body, {
        headers: {
            "Content-Type": "application/json",
        },
    });
}

export async function createOpinion({
    axiosPolis,
    userId,
    conversationSlugId,
    opinionSlugId,
}: PolisCreateOpinionProps) {
    log.info("Creating a new opinion in Polis...");
    const postCreateOpinionUrl = "/api/v3/comments";
    const body = {
        txt: opinionSlugId,
        pid: "mypid",
        ownername: userId,
        conversation_id: conversationSlugId,
        vote: -1, // make opinion author automatically agrees on its own opinion. Yes -1 is agree in stock Polis...
        is_meta: false,
    };
    await axiosPolis.post(postCreateOpinionUrl, body, {
        headers: {
            "Content-Type": "application/json",
        },
    });
}

export async function createOrUpdateVote({
    axiosPolis,
    userId,
    conversationSlugId,
    opinionSlugId,
    votingAction,
}: PolisCreateOrUpdateVoteProps) {
    log.info("Creating a new vote in Polis...");
    const postCreateOrUpdateVote = "/api/v3/votes";
    const polisVote =
        votingAction === "agree" ? -1 : votingAction === "disagree" ? 1 : 0; // Yes, -1 is agree in stock Polis...
    const body = {
        lang: "en",
        weight: 0,
        vote: polisVote,
        ownername: userId,
        txt: opinionSlugId,
        pid: "mypid",
        conversation_id: conversationSlugId,
        agid: 1,
    };
    await axiosPolis.post(postCreateOrUpdateVote, body, {
        headers: {
            "Content-Type": "application/json",
        },
    });
}

async function getMathResults({
    axiosPolis,
    conversationSlugId,
}: PolisGetMathResultsProps): Promise<PolisMathAndMetadata> {
    const getMathResultsRequest = `/api/v3/participationInit?conversation_id=${conversationSlugId}`;
    const response = await axiosPolis.get(getMathResultsRequest);
    return zodPolisMathAndMetadata.parse(response.data);
}

interface DelayedPolisGetAndUpdateMathProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    conversationId: number;
    axiosPolis: AxiosInstance;
    polisDelayToFetch: number;
    awsAiLabelSummaryEnable: boolean;
    awsAiLabelSummaryRegion: string;
    awsAiLabelSummaryModelId: string;
    awsAiLabelSummaryTemperature: string;
    awsAiLabelSummaryTopP: string;
    awsAiLabelSummaryMaxTokens: string;
    awsAiLabelSummaryPrompt: string;
}

export async function delayedPolisGetAndUpdateMath({
    db,
    conversationSlugId,
    conversationId,
    axiosPolis,
    polisDelayToFetch,
    awsAiLabelSummaryEnable,
    awsAiLabelSummaryRegion,
    awsAiLabelSummaryModelId,
    awsAiLabelSummaryTemperature,
    awsAiLabelSummaryTopP,
    awsAiLabelSummaryMaxTokens,
    awsAiLabelSummaryPrompt,
}: DelayedPolisGetAndUpdateMathProps) {
    if (polisDelayToFetch === -1) {
        log.info("Get polis math results is turned off");
        return;
    }
    await setTimeout(polisDelayToFetch);
    let polisMathResults: PolisMathAndMetadata;
    try {
        polisMathResults = await getMathResults({
            axiosPolis,
            conversationSlugId,
        });
        log.info(
            `Math Results for conversation_slug_id ${conversationSlugId}: \n${JSON.stringify(polisMathResults)}`,
        );
    } catch (e) {
        log.error("Error while parsing math results from Polis:");
        log.error(e);
        return;
    }
    if (polisMathResults.pca === undefined || polisMathResults.pca === null) {
        log.warn(
            `Polis returned a null pca: ${JSON.stringify(polisMathResults)}`,
        );
        return;
    }
    const pca = polisMathResults.pca;
    const userIdByPid = polisMathResults.pidToHnames;
    const opinionSlugIdByTid = polisMathResults.tidToTxts;

    async function updateDbFromPolisData(db: PostgresDatabase) {
        const polisContentQuery = await db
            .insert(polisContentTable)
            .values({
                conversationId,
                mathTick: pca.math_tick,
                rawData: polisMathResults,
            })
            .returning({ polisContentId: polisContentTable.id });
        const polisContentId = polisContentQuery[0].polisContentId;
        const repnessEntries = Object.entries(pca.repness);
        const groupClustersEntries = Object.entries(pca["group-clusters"]);
        const baseClusters = pca["base-clusters"];
        const groupVotesEntries = Object.entries(
            pca["group-votes"], // key is cluster key, while the value is the # of agrees/disagrees for each opinions by all the people in this cluster
        );
        await db
            .update(conversationTable)
            .set({
                currentPolisContentId: polisContentId,
                updatedAt: nowZeroMs(),
            })
            .where(eq(conversationTable.id, conversationId));

        //// add comment priorities, comment-extremities (divisiveness) and group-aware-consensus with a bulk-update
        const commentPriorities: CommentPriorities | null | undefined =
            pca["comment-priorities"];
        const groupAwareConsensusAgree: GroupAwareConsensus | null | undefined =
            pca["group-aware-consensus"];
        const commentExtremities: number[] | undefined =
            pca.pca?.["comment-extremity"];
        let setClauseCommentPriority = {};
        let setClauseGroupAwareConsensusAgree = {};
        let setClauseCommentExtremities = {};
        if (
            commentPriorities === undefined ||
            commentPriorities === null ||
            Object.keys(commentPriorities).length === 0
        ) {
            log.warn(
                `No opinion priority to update for polisContentId=${String(
                    polisContentId,
                )} and conversationSlugId=${conversationSlugId}`,
            );
        } else {
            const sqlChunks: SQL[] = [];
            sqlChunks.push(sql`(CASE`);
            for (const [tid, priority] of Object.entries(commentPriorities)) {
                const opinionSlugId = opinionSlugIdByTid[tid];
                sqlChunks.push(
                    sql`WHEN ${opinionTable.slugId} = ${opinionSlugId} THEN ${priority}`,
                );
            }
            sqlChunks.push(sql`ELSE polis_priority`);
            sqlChunks.push(sql`END)`);
            const finalSqlCommentPriorities = sql.join(sqlChunks, sql.raw(" "));
            setClauseCommentPriority = {
                polisPriority: finalSqlCommentPriorities,
            };
        }
        if (
            groupAwareConsensusAgree === undefined ||
            groupAwareConsensusAgree === null ||
            Object.keys(groupAwareConsensusAgree).length === 0
        ) {
            log.warn(
                `No opinion group-aware-consensus to update for polisContentId=${String(
                    polisContentId,
                )} and conversationSlugId=${conversationSlugId}`,
            );
        } else {
            const sqlChunks: SQL[] = [];
            sqlChunks.push(sql`(CASE`);
            for (const [tid, probability] of Object.entries(
                groupAwareConsensusAgree,
            )) {
                const opinionSlugId = opinionSlugIdByTid[tid];
                sqlChunks.push(
                    sql`WHEN ${opinionTable.slugId} = ${opinionSlugId} THEN ${probability}`,
                );
            }
            sqlChunks.push(sql`ELSE polis_ga_consensus_pa`);
            sqlChunks.push(sql`END)`);
            const finalSqlGroupAwareConsensusAgree = sql.join(
                sqlChunks,
                sql.raw(" "),
            );
            setClauseGroupAwareConsensusAgree = {
                polisGroupAwareConsensusProbabilityAgree:
                    finalSqlGroupAwareConsensusAgree,
            };
        }
        if (
            commentExtremities === undefined ||
            commentExtremities.length === 0
        ) {
            log.warn(
                `No opinion comment-extremities to update for polisContentId=${String(
                    polisContentId,
                )} and conversationSlugId=${conversationSlugId}`,
            );
        } else {
            const sqlChunks: SQL[] = [];
            sqlChunks.push(sql`(CASE`);
            for (const [tid, probability] of commentExtremities.entries()) {
                const opinionSlugId = opinionSlugIdByTid[tid];
                sqlChunks.push(
                    sql`WHEN ${opinionTable.slugId} = ${opinionSlugId} THEN ${probability}`,
                );
            }
            sqlChunks.push(sql`ELSE polis_divisiveness`);
            sqlChunks.push(sql`END)`);
            const finalSqlCommentExtremities: SQL = sql.join(
                sqlChunks,
                sql.raw(" "),
            );
            setClauseCommentExtremities = {
                polisDivisiveness: finalSqlCommentExtremities,
            };
        }

        await db
            .update(opinionTable)
            .set({
                ...setClauseCommentPriority,
                ...setClauseGroupAwareConsensusAgree,
                ...setClauseCommentExtremities,
                updatedAt: nowZeroMs(),
            })
            .where(eq(opinionTable.conversationId, conversationId));
        /////

        let minNumberOfClusters = Math.min(
            repnessEntries.length,
            groupClustersEntries.length,
            groupVotesEntries.length,
        );
        log.info(
            `Received ${String(
                minNumberOfClusters,
            )} clusters for conversationSlugId = ${conversationSlugId}`,
        );
        if (minNumberOfClusters > 6) {
            log.warn(
                "Received unexpectedly large amount of clusters, ignoring those after 6",
            );
            minNumberOfClusters = 6;
        }
        if (
            repnessEntries.length !== groupClustersEntries.length &&
            repnessEntries.length !== groupVotesEntries.length
        ) {
            log.warn(
                `Number of clusters is different for each object, taking the minimum number: polis math repness has ${String(
                    repnessEntries.length,
                )} clusters while group-clusters has ${String(
                    groupClustersEntries.length,
                )} clusters and group-votes has ${String(
                    groupVotesEntries.length,
                )} clusters`,
            );
        }
        for (
            let clusterKey = 0;
            clusterKey < minNumberOfClusters;
            clusterKey++
        ) {
            const groupVotesEntry = groupVotesEntries[clusterKey];
            const groupClustersEntry = groupClustersEntries[clusterKey];
            const polisClusterExternalId = groupClustersEntry[1].id;
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
                        `Ignoring the received ${String(
                            clusterKey,
                        )}th cluster of external id ${String(
                            polisClusterExternalId,
                        )}`,
                    );
                    continue;
                }
            }
            const polisClusterQuery = await db
                .insert(polisClusterTable)
                .values({
                    polisContentId: polisContentId,
                    key: polisClusterKeyStr,
                    externalId: polisClusterExternalId,
                    // numUsers: clusterEntry[1].members.length, // WARN: members does NOT contain pid but the id defined in base-clusters: https://discordapp.com/channels/815450304421691412/1339699151419478167/1339728081975382169
                    numUsers: groupVotesEntry[1]["n-members"], // !IMPORTANT
                    mathCenter: groupClustersEntry[1].center,
                })
                .returning({ polisClusterId: polisClusterTable.id });
            const polisClusterId = polisClusterQuery[0].polisClusterId;

            const pidsById: Record<number, number[]> = {}; // to each id can correspond multiple pids
            for (const [index, id] of baseClusters.id.entries()) {
                if (index in baseClusters.members) {
                    pidsById[id] = baseClusters.members[index];
                } else {
                    log.warn(
                        `Base clusters id index (${String(
                            index,
                        )}) and id ${String(id)} does not match any base clusters members index: "baseClusters.id.length=${String(
                            baseClusters.id.length,
                        )}, baseClusters.members.length=${String(
                            baseClusters.members.length,
                        )}"}, members='${JSON.stringify(
                            baseClusters.members,
                        )}', id={${JSON.stringify(baseClusters.id)}}`,
                    );
                    pidsById[id] = [];
                }
            }
            const members = [];
            for (const member of groupClustersEntry[1].members) {
                if (!(member in pidsById)) {
                    // the members in this object are ids, not pids!
                    log.warn(
                        `The id ${String(member)} from clusterId ${String(
                            polisClusterId,
                        )} does not correspond to any pid in pidsById`,
                    );
                    continue;
                }
                const pids = pidsById[member];
                for (const pid of pids) {
                    members.push({
                        polisContentId: polisContentId,
                        polisClusterId: polisClusterId,
                        userId: userIdByPid[pid],
                    });
                }
            }
            if (members.length > 0) {
                await db.insert(polisClusterUserTable).values(members);
            } else {
                log.warn("No members to insert in polisClusterUserTable");
            }
            const repnesses = repnessEntries[clusterKey][1]
                .filter((repness) => {
                    if (!(repness.tid in opinionSlugIdByTid)) {
                        log.warn(
                            `The tid ${String(
                                repness.tid,
                            )} from clusterId ${String(
                                polisClusterId,
                            )} does not correspond to any opinionId`,
                        );
                        return false;
                    } else {
                        return true;
                    }
                })
                .map((repness) => {
                    return {
                        polisContentId: polisContentId,
                        polisClusterId: polisClusterId,
                        opinionSlugId: opinionSlugIdByTid[repness.tid],
                        agreementType: repness["repful-for"],
                        probabilityAgreement: repness["p-success"],
                        numAgreement: repness["n-success"],
                        rawRepness: repness,
                    };
                });
            if (repnesses.length > 0) {
                await db.insert(polisClusterOpinionTable).values(repnesses);
            } else {
                log.warn("No repnesses to insert in polisClusterOpinionTable");
            }

            const groupVotes = groupVotesEntry[1].votes;
            // building bulk updates for numAgrees, numDisagrees & numPasses
            const sqlChunksForNumAgrees: SQL[] = [];
            const sqlChunksForNumDisagrees: SQL[] = [];
            const sqlChunksForNumPasses: SQL[] = [];
            sqlChunksForNumAgrees.push(sql`(CASE`);
            sqlChunksForNumDisagrees.push(sql`(CASE`);
            sqlChunksForNumPasses.push(sql`(CASE`);
            for (const [tid, numVotesByCategory] of Object.entries(
                groupVotes,
            )) {
                const opinionSlugId = opinionSlugIdByTid[tid];
                const totalVotes =
                    numVotesByCategory.A +
                    numVotesByCategory.D +
                    numVotesByCategory.S;
                const numMembers = groupVotesEntry[1]["n-members"];
                if (totalVotes > numMembers) {
                    log.warn(
                        `Number of agrees, disagrees and passes for opinion slug id "${opinionSlugId}" is above the number of members belonging to the cluster "${polisClusterKeyStr}" of conversation slug id "${conversationSlugId}": ${String(
                            totalVotes,
                        )} > ${String(numMembers)}`,
                    );
                }
                sqlChunksForNumAgrees.push(
                    sql`WHEN ${opinionTable.slugId} = ${opinionSlugId} THEN ${numVotesByCategory.A}`,
                );
                sqlChunksForNumDisagrees.push(
                    sql`WHEN ${opinionTable.slugId} = ${opinionSlugId} THEN ${numVotesByCategory.D}`,
                );
                sqlChunksForNumPasses.push(
                    sql`WHEN ${opinionTable.slugId} = ${opinionSlugId} THEN ${numVotesByCategory.S}`,
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
                log.info("No cluster cache to empty");
                break;
            default:
                log.warn(
                    `There are an unexpectecly high minimum number of clusters: ${String(
                        minNumberOfClusters,
                    )}`,
                );
        }

        if (awsAiLabelSummaryEnable && minNumberOfClusters >= 2) {
            // only run the AI if there are at least 2 clusters
            try {
                await llmService.updateAiLabelsAndSummaries({
                    db: db,
                    conversationId: conversationId,
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
    }

    let doTransaction = true;
    if (db instanceof PgTransaction) {
        doTransaction = false;
    }
    if (doTransaction) {
        await db.transaction(async (tx) => {
            await updateDbFromPolisData(tx);
        });
    } else {
        await updateDbFromPolisData(db);
    }
}

interface GetClusterIdByUserAndConvProps {
    db: PostgresJsDatabase;
    userId: string;
    polisContentId: number;
}

export async function getClusterIdByUserAndConv({
    db,
    userId,
    polisContentId,
}: GetClusterIdByUserAndConvProps): Promise<number | undefined> {
    const results = await db
        .select({ polisClusterId: polisClusterUserTable.polisClusterId })
        .from(polisClusterUserTable)
        .where(
            and(
                eq(polisClusterUserTable.polisContentId, polisContentId),
                eq(polisClusterUserTable.userId, userId),
            ),
        );
    let polisClusterId;
    switch (results.length) {
        case 0:
            polisClusterId = undefined;
            break;
        case 1:
            polisClusterId = results[0].polisClusterId;
            break;
        default:
            polisClusterId = results[0].polisClusterId;
            log.warn(
                `User ${userId} in conversation polisContentId ${String(
                    polisContentId,
                )} belongs to ${String(
                    results.length,
                )} clusters instead of 0 or 1!`,
            );
            break;
    }
    return polisClusterId;
}
