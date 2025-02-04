import { log } from "@/app.js";
import type { ClusterMetadata, VotingAction } from "@/shared/types/zod.js";
import type { AxiosInstance } from "axios";
import { setTimeout } from "timers/promises";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    polisClusterOpinionTable,
    polisClusterUserTable,
    polisContentTable,
    opinionTable,
    conversationTable,
} from "@/schema.js";
import { polisClusterTable } from "@/schema.js";
import { and, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
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

        const minNumberOfClusters =
            repnessEntries.length > groupClustersEntries.length
                ? groupClustersEntries.length
                : repnessEntries.length;
        if (repnessEntries.length !== groupClustersEntries.length) {
            log.warn(
                `polis math repness has ${String(
                    repnessEntries.length,
                )} clusters while group-clusters has ${String(
                    groupClustersEntries.length,
                )} clusters`,
            );
        }
        for (let index = 0; index < minNumberOfClusters; index++) {
            const clusterEntry = groupClustersEntries[index];
            const polisClusterQuery = await tx
                .insert(polisClusterTable)
                .values({
                    polisContentId: polisContentId,
                    key: clusterEntry[0],
                    index: index,
                    mathCenter: clusterEntry[1].center,
                })
                .returning({ polisClusterId: polisClusterTable.id });
            const polisClusterId = polisClusterQuery[0].polisClusterId;

            for (const member of clusterEntry[1].members) {
                if (!(member in userIdByPid)) {
                    log.warn(
                        `The pid ${String(member)} from clusterId ${String(
                            polisClusterId,
                        )} does not correspond to any userId`,
                    );
                } else {
                    await tx.insert(polisClusterUserTable).values({
                        polisContentId: polisContentId,
                        polisClusterId: polisClusterId,
                        userId: userIdByPid[member],
                    });
                }
            }

            const repnessEntry = repnessEntries[index];
            for (const repness of repnessEntry[1]) {
                if (!(repness.tid in opinionSlugIdByTid)) {
                    log.warn(
                        `The tid ${String(repness.tid)} from clusterId ${String(
                            polisClusterId,
                        )} does not correspond to any opinionId`,
                    );
                } else {
                    await tx.insert(polisClusterOpinionTable).values({
                        polisClusterId: polisClusterId,
                        opinionSlugId: opinionSlugIdByTid[repness.tid],
                        agreementType: repness["repful-for"],
                        percentageAgreement: repness["p-success"],
                        numAgreement: repness["n-success"],
                        rawRepness: repness,
                    });
                }
            }
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
            polisClusterIndex: polisClusterTable.index,
            polisClusterAiLabel: polisClusterTable.aiLabel,
            polisClusterAiSummary: polisClusterTable.aiSummary,
        })
        .from(conversationTable)
        .leftJoin(
            polisContentTable,
            eq(polisContentTable.id, conversationTable.currentPolisContentId),
        )
        .leftJoin(
            polisClusterTable,
            and(
                eq(polisClusterTable.polisContentId, polisContentTable.id),
                isNotNull(polisClusterTable.key),
                isNotNull(polisClusterTable.index),
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                isNotNull(polisClusterTable.key),
                isNotNull(polisClusterTable.index),
            ),
        );
    const clusters: ClusterMetadata[] = [];
    for (const result of results) {
        if (
            result.polisClusterIndex !== null && // this should not be necessary for typescript to get the types, because of the isNotNull above but drizzle is !$*@#*jdk
            result.polisClusterKey !== null
        ) {
            clusters.push({
                index: result.polisClusterIndex,
                key: result.polisClusterKey,
                aiLabel: toUnionUndefined(result.polisClusterAiLabel),
                aiSummary: toUnionUndefined(result.polisClusterAiSummary),
            });
        }
    }
    return {
        clusters: clusters,
    };
}
