import { log } from "@/app.js";
import type {
    ClusterMetadata,
    PolisKey,
    VotingAction,
} from "@/shared/types/zod.js";
import type { AxiosInstance } from "axios";
import { setTimeout } from "timers/promises";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    polisClusterOpinionTable,
    polisClusterUserTable,
    polisContentTable,
    opinionTable,
    conversationTable,
    participantTable,
} from "@/schema.js";
import { polisClusterTable } from "@/schema.js";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { nowZeroMs } from "@/shared/common/util.js";
import {
    type PolisMathAndMetadata,
    zodPolisMathAndMetadata,
    type CommentPriorities,
} from "@/shared/types/polis.js";
import type { GetPolisClustersInfoResponse } from "@/shared/types/dto.js";
import { toUnionUndefined } from "@/shared/shared.js";

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
}

export async function delayedPolisGetAndUpdateMath({
    db,
    conversationSlugId,
    conversationId,
    axiosPolis,
    polisDelayToFetch,
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
    } catch (e) {
        log.error("Error while parsing math results from Polis:");
        log.error(e);
        return;
    }
    await db.transaction(async (tx) => {
        const polisContentQuery = await tx
            .insert(polisContentTable)
            .values({
                conversationId,
                mathTick: polisMathResults.pca.math_tick,
                rawData: polisMathResults,
            })
            .returning({ polisContentId: polisContentTable.id });
        const userIdByPid = polisMathResults.pidToHnames;
        const opinionSlugIdByTid = polisMathResults.tidToTxts;
        const polisContentId = polisContentQuery[0].polisContentId;
        const repnessEntries = Object.entries(polisMathResults.pca.repness);
        const groupClustersEntries = Object.entries(
            polisMathResults.pca["group-clusters"],
        );
        const groupVotesEntries = Object.entries(
            polisMathResults.pca["group-votes"], // key is cluster key, while the value is the # of agrees/disagrees for each opinions by all the people in this cluster
        );
        await tx
            .update(conversationTable)
            .set({
                currentPolisContentId: polisContentId,
                updatedAt: nowZeroMs(),
            })
            .where(eq(conversationTable.id, conversationId));

        //// add comment priorities with a bulk-update
        const commentPriorities: CommentPriorities =
            polisMathResults.pca["comment-priorities"];
        // You have to be sure that inputs array is not empty
        const tids = Object.keys(commentPriorities);
        if (tids.length === 0) {
            log.warn(
                `No opinion priority to update for polisContentId=${String(
                    polisContentId,
                )}`,
            );
        } else {
            const opinionSlugIds = tids.map((tid) => opinionSlugIdByTid[tid]);
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
            const finalSql: SQL = sql.join(sqlChunks, sql.raw(" "));
            await tx
                .update(opinionTable)
                .set({ polisPriority: finalSql, updatedAt: nowZeroMs() })
                .where(inArray(opinionTable.slugId, opinionSlugIds));
        }
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
                `polis math repness has ${String(
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
            const clusterEntry = groupClustersEntries[clusterKey];
            const polisClusterExternalId = clusterEntry[1].id;
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
            const polisClusterQuery = await tx
                .insert(polisClusterTable)
                .values({
                    polisContentId: polisContentId,
                    key: polisClusterKeyStr,
                    externalId: polisClusterExternalId,
                    numUsers: clusterEntry[1].members.length,
                    mathCenter: clusterEntry[1].center,
                })
                .returning({ polisClusterId: polisClusterTable.id });
            const polisClusterId = polisClusterQuery[0].polisClusterId;

            const members = clusterEntry[1].members
                .filter((member) => {
                    if (!(member in userIdByPid)) {
                        log.warn(
                            `The pid ${String(member)} from clusterId ${String(
                                polisClusterId,
                            )} does not correspond to any userId`,
                        );
                        return false;
                    } else {
                        return true;
                    }
                })
                .map((member) => {
                    return {
                        polisContentId: polisContentId,
                        polisClusterId: polisClusterId,
                        userId: userIdByPid[member],
                    };
                });
            if (members.length > 0) {
                await tx.insert(polisClusterUserTable).values(members);
            } else {
                log.warn("No members to insert in polisClusterUserTable");
            }
            for (const member of members) {
                tx.update(participantTable)
                    .set({
                        polisClusterId: polisClusterId,
                    })
                    .where(
                        and(
                            eq(participantTable.userId, member.userId),
                            eq(participantTable.conversationId, conversationId),
                        ),
                    );
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
                        polisClusterId: polisClusterId,
                        opinionSlugId: opinionSlugIdByTid[repness.tid],
                        agreementType: repness["repful-for"],
                        percentageAgreement: repness["p-success"],
                        numAgreement: repness["n-success"],
                        rawRepness: repness,
                    };
                });
            if (repnesses.length > 0) {
                await tx.insert(polisClusterOpinionTable).values(repnesses);
            } else {
                log.warn("No repnesses to insert in polisClusterOpinionTable");
            }

            const groupVotes = groupVotesEntries[clusterKey][1].votes;
            // building bulk updates for numAgrees & num Disagrees
            const sqlChunksForNumAgrees: SQL[] = [];
            const sqlChunksForNumDisagrees: SQL[] = [];
            sqlChunksForNumAgrees.push(sql`(CASE`);
            sqlChunksForNumDisagrees.push(sql`(CASE`);
            const opinionSlugIds = Object.keys(groupVotes).map(
                (tid) => opinionSlugIdByTid[tid],
            );
            for (const [tid, numVotesByCategory] of Object.entries(
                groupVotes,
            )) {
                const opinionSlugId = opinionSlugIdByTid[tid];
                sqlChunksForNumAgrees.push(
                    sql`WHEN ${opinionTable.slugId} = ${opinionSlugId} THEN ${numVotesByCategory.A}`,
                );
                sqlChunksForNumDisagrees.push(
                    sql`WHEN ${opinionTable.slugId} = ${opinionSlugId} THEN ${numVotesByCategory.D}`,
                );
            }
            switch (polisClusterKeyStr) {
                case "0": {
                    sqlChunksForNumAgrees.push(
                        sql`ELSE ${opinionTable.polisCluster0NumAgrees}`,
                    );
                    sqlChunksForNumDisagrees.push(
                        sql`ELSE ${opinionTable.polisCluster0NumDisagrees}`,
                    );
                    sqlChunksForNumAgrees.push(sql`END)`);
                    sqlChunksForNumDisagrees.push(sql`END)`);
                    const finalSqlNumAgrees: SQL = sql.join(
                        sqlChunksForNumAgrees,
                        sql.raw(" "),
                    );
                    const finalSqlNumDisagrees: SQL = sql.join(
                        sqlChunksForNumDisagrees,
                        sql.raw(" "),
                    );
                    await tx
                        .update(opinionTable)
                        .set({
                            polisCluster0Id: polisClusterId,
                            polisCluster0NumAgrees: finalSqlNumAgrees,
                            polisCluster0NumDisagrees: finalSqlNumDisagrees,
                            updatedAt: nowZeroMs(),
                        })
                        .where(inArray(opinionTable.slugId, opinionSlugIds));
                    break;
                }
                case "1": {
                    sqlChunksForNumAgrees.push(
                        sql`ELSE ${opinionTable.polisCluster1NumAgrees}`,
                    );
                    sqlChunksForNumDisagrees.push(
                        sql`ELSE ${opinionTable.polisCluster1NumDisagrees}`,
                    );
                    sqlChunksForNumAgrees.push(sql`END)`);
                    sqlChunksForNumDisagrees.push(sql`END)`);
                    const finalSqlNumAgrees: SQL = sql.join(
                        sqlChunksForNumAgrees,
                        sql.raw(" "),
                    );
                    const finalSqlNumDisagrees: SQL = sql.join(
                        sqlChunksForNumDisagrees,
                        sql.raw(" "),
                    );
                    await tx
                        .update(opinionTable)
                        .set({
                            polisCluster1Id: polisClusterId,
                            polisCluster1NumAgrees: finalSqlNumAgrees,
                            polisCluster1NumDisagrees: finalSqlNumDisagrees,
                            updatedAt: nowZeroMs(),
                        })
                        .where(inArray(opinionTable.slugId, opinionSlugIds));
                    break;
                }
                case "2": {
                    sqlChunksForNumAgrees.push(
                        sql`ELSE ${opinionTable.polisCluster2NumAgrees}`,
                    );
                    sqlChunksForNumDisagrees.push(
                        sql`ELSE ${opinionTable.polisCluster2NumDisagrees}`,
                    );
                    sqlChunksForNumAgrees.push(sql`END)`);
                    sqlChunksForNumDisagrees.push(sql`END)`);
                    const finalSqlNumAgrees: SQL = sql.join(
                        sqlChunksForNumAgrees,
                        sql.raw(" "),
                    );
                    const finalSqlNumDisagrees: SQL = sql.join(
                        sqlChunksForNumDisagrees,
                        sql.raw(" "),
                    );
                    await tx
                        .update(opinionTable)
                        .set({
                            polisCluster2Id: polisClusterId,
                            polisCluster2NumAgrees: finalSqlNumAgrees,
                            polisCluster2NumDisagrees: finalSqlNumDisagrees,
                            updatedAt: nowZeroMs(),
                        })
                        .where(inArray(opinionTable.slugId, opinionSlugIds));
                    break;
                }
                case "3": {
                    sqlChunksForNumAgrees.push(
                        sql`ELSE ${opinionTable.polisCluster3NumAgrees}`,
                    );
                    sqlChunksForNumDisagrees.push(
                        sql`ELSE ${opinionTable.polisCluster3NumDisagrees}`,
                    );
                    sqlChunksForNumAgrees.push(sql`END)`);
                    sqlChunksForNumDisagrees.push(sql`END)`);
                    const finalSqlNumAgrees: SQL = sql.join(
                        sqlChunksForNumAgrees,
                        sql.raw(" "),
                    );
                    const finalSqlNumDisagrees: SQL = sql.join(
                        sqlChunksForNumDisagrees,
                        sql.raw(" "),
                    );
                    await tx
                        .update(opinionTable)
                        .set({
                            polisCluster3Id: polisClusterId,
                            polisCluster3NumAgrees: finalSqlNumAgrees,
                            polisCluster3NumDisagrees: finalSqlNumDisagrees,
                            updatedAt: nowZeroMs(),
                        })
                        .where(inArray(opinionTable.slugId, opinionSlugIds));
                    break;
                }
                case "4": {
                    sqlChunksForNumAgrees.push(
                        sql`ELSE ${opinionTable.polisCluster4NumAgrees}`,
                    );
                    sqlChunksForNumDisagrees.push(
                        sql`ELSE ${opinionTable.polisCluster4NumDisagrees}`,
                    );
                    sqlChunksForNumAgrees.push(sql`END)`);
                    sqlChunksForNumDisagrees.push(sql`END)`);
                    const finalSqlNumAgrees: SQL = sql.join(
                        sqlChunksForNumAgrees,
                        sql.raw(" "),
                    );
                    const finalSqlNumDisagrees: SQL = sql.join(
                        sqlChunksForNumDisagrees,
                        sql.raw(" "),
                    );
                    await tx
                        .update(opinionTable)
                        .set({
                            polisCluster4Id: polisClusterId,
                            polisCluster4NumAgrees: finalSqlNumAgrees,
                            polisCluster4NumDisagrees: finalSqlNumDisagrees,
                            updatedAt: nowZeroMs(),
                        })
                        .where(inArray(opinionTable.slugId, opinionSlugIds));
                    break;
                }
                case "5": {
                    sqlChunksForNumAgrees.push(
                        sql`ELSE ${opinionTable.polisCluster5NumAgrees}`,
                    );
                    sqlChunksForNumDisagrees.push(
                        sql`ELSE ${opinionTable.polisCluster5NumDisagrees}`,
                    );
                    sqlChunksForNumAgrees.push(sql`END)`);
                    sqlChunksForNumDisagrees.push(sql`END)`);
                    const finalSqlNumAgrees: SQL = sql.join(
                        sqlChunksForNumAgrees,
                        sql.raw(" "),
                    );
                    const finalSqlNumDisagrees: SQL = sql.join(
                        sqlChunksForNumDisagrees,
                        sql.raw(" "),
                    );
                    await tx
                        .update(opinionTable)
                        .set({
                            polisCluster5Id: polisClusterId,
                            polisCluster5NumAgrees: finalSqlNumAgrees,
                            polisCluster5NumDisagrees: finalSqlNumDisagrees,
                            updatedAt: nowZeroMs(),
                        })
                        .where(inArray(opinionTable.slugId, opinionSlugIds));
                    break;
                }
            }
        }
        // remove outdated polisClusterCache from opinionTable
        const opinionSlugIds = Object.values(opinionSlugIdByTid);
        switch (minNumberOfClusters) {
            case 0:
                await tx
                    .update(opinionTable)
                    .set({
                        polisCluster0Id: null,
                        polisCluster0NumAgrees: null,
                        polisCluster0NumDisagrees: null,
                        polisCluster1Id: null,
                        polisCluster1NumAgrees: null,
                        polisCluster1NumDisagrees: null,
                        polisCluster2Id: null,
                        polisCluster2NumAgrees: null,
                        polisCluster2NumDisagrees: null,
                        polisCluster3Id: null,
                        polisCluster3NumAgrees: null,
                        polisCluster3NumDisagrees: null,
                        polisCluster4Id: null,
                        polisCluster4NumAgrees: null,
                        polisCluster4NumDisagrees: null,
                        polisCluster5Id: null,
                        polisCluster5NumAgrees: null,
                        polisCluster5NumDisagrees: null,
                        updatedAt: nowZeroMs(),
                    })
                    .where(inArray(opinionTable.slugId, opinionSlugIds));
                break;
            case 1:
                await tx
                    .update(opinionTable)
                    .set({
                        polisCluster1Id: null,
                        polisCluster1NumAgrees: null,
                        polisCluster1NumDisagrees: null,
                        polisCluster2Id: null,
                        polisCluster2NumAgrees: null,
                        polisCluster2NumDisagrees: null,
                        polisCluster3Id: null,
                        polisCluster3NumAgrees: null,
                        polisCluster3NumDisagrees: null,
                        polisCluster4Id: null,
                        polisCluster4NumAgrees: null,
                        polisCluster4NumDisagrees: null,
                        polisCluster5Id: null,
                        polisCluster5NumAgrees: null,
                        polisCluster5NumDisagrees: null,
                        updatedAt: nowZeroMs(),
                    })
                    .where(inArray(opinionTable.slugId, opinionSlugIds));
                break;
            case 2:
                await tx
                    .update(opinionTable)
                    .set({
                        polisCluster2Id: null,
                        polisCluster2NumAgrees: null,
                        polisCluster2NumDisagrees: null,
                        polisCluster3Id: null,
                        polisCluster3NumAgrees: null,
                        polisCluster3NumDisagrees: null,
                        polisCluster4Id: null,
                        polisCluster4NumAgrees: null,
                        polisCluster4NumDisagrees: null,
                        polisCluster5Id: null,
                        polisCluster5NumAgrees: null,
                        polisCluster5NumDisagrees: null,
                        updatedAt: nowZeroMs(),
                    })
                    .where(inArray(opinionTable.slugId, opinionSlugIds));
                break;
            case 3:
                await tx
                    .update(opinionTable)
                    .set({
                        polisCluster3Id: null,
                        polisCluster3NumAgrees: null,
                        polisCluster3NumDisagrees: null,
                        polisCluster4Id: null,
                        polisCluster4NumAgrees: null,
                        polisCluster4NumDisagrees: null,
                        polisCluster5Id: null,
                        polisCluster5NumAgrees: null,
                        polisCluster5NumDisagrees: null,
                        updatedAt: nowZeroMs(),
                    })
                    .where(inArray(opinionTable.slugId, opinionSlugIds));
                break;
            case 4:
                await tx
                    .update(opinionTable)
                    .set({
                        polisCluster4Id: null,
                        polisCluster4NumAgrees: null,
                        polisCluster4NumDisagrees: null,
                        polisCluster5Id: null,
                        polisCluster5NumAgrees: null,
                        polisCluster5NumDisagrees: null,
                        updatedAt: nowZeroMs(),
                    })
                    .where(inArray(opinionTable.slugId, opinionSlugIds));
                break;
            case 5:
                await tx
                    .update(opinionTable)
                    .set({
                        polisCluster5Id: null,
                        polisCluster5NumAgrees: null,
                        polisCluster5NumDisagrees: null,
                        updatedAt: nowZeroMs(),
                    })
                    .where(inArray(opinionTable.slugId, opinionSlugIds));
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
    });
}

interface GetPolisClustersInfoProps {
    db: PostgresDatabase;
    conversationSlugId: string;
}

export async function getPolisClustersInfo({
    db,
    conversationSlugId,
}: GetPolisClustersInfoProps): Promise<GetPolisClustersInfoResponse> {
    const results = await db
        .select({
            polisClusterKey: polisClusterTable.key,
            polisClusterAiLabel: polisClusterTable.aiLabel,
            polisClusterAiSummary: polisClusterTable.aiSummary,
            polisClusterNumUsers: polisClusterTable.numUsers,
        })
        .from(conversationTable)
        .innerJoin(
            polisContentTable,
            eq(polisContentTable.id, conversationTable.currentPolisContentId),
        )
        .innerJoin(
            polisClusterTable,
            eq(polisClusterTable.polisContentId, polisContentTable.id),
        )
        .where(eq(conversationTable.slugId, conversationSlugId));
    const clusters: ClusterMetadata[] = [];
    for (const result of results) {
        clusters.push({
            key: result.polisClusterKey,
            aiLabel: toUnionUndefined(result.polisClusterAiLabel),
            aiSummary: toUnionUndefined(result.polisClusterAiSummary),
            numUsers: result.polisClusterNumUsers,
        });
    }
    return {
        clusters: clusters,
    };
}
