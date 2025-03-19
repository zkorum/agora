import {
    conversationContentTable,
    conversationTable,
    opinionContentTable,
    opinionTable,
    polisClusterTable,
    polisContentTable,
} from "@/schema.js";
import { isControversial, isMajority } from "@/shared/conversationLogic.js";
import { toUnionUndefined } from "@/shared/shared.js";
import { isSqlControversial, isSqlMajority } from "@/utils/sqlLogic.js";
import { eq, and, or, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
    zodGenLabelSummaryOutputStrict,
    type GenLabelSummaryOutputLoose,
    type GenLabelSummaryOutputStrict,
    zodGenLabelSummaryOutputLoose,
    type GenLabelSummaryOutputClusterLoose,
    type GenLabelSummaryOutputClusterStrict,
} from "@/shared/types/zod.js";
import { log } from "@/app.js";

interface UpdateAiLabelsAndSummariesProps {
    db: PostgresJsDatabase;
    conversationId: number;
    awsAiLabelSummaryPromptArn: string | undefined;
    awsAiLabelSummaryPromptRegion: string;
    awsAiLabelSummaryPromptVariable: string;
}

interface OpinionInsight {
    opinionContent: string;
    percentageAgree: number | null;
    percentageDisagree: number | null;
}

interface ClusterInsights {
    memberCount: number;
    majorityOpinions: OpinionInsight[];
    controversialOpinions: OpinionInsight[];
}

interface ConversationInsights {
    conversationTitle: string;
    conversationBody?: string;
    participantCount: number;
    majorityOpinions: OpinionInsight[];
    controversialOpinions: OpinionInsight[];
    clusters: Record<string, ClusterInsights>;
}

export async function updateAiLabelsAndSummaries({
    db,
    conversationId,
    awsAiLabelSummaryPromptArn,
    awsAiLabelSummaryPromptRegion,
    awsAiLabelSummaryPromptVariable,
}: UpdateAiLabelsAndSummariesProps): Promise<void> {
    if (awsAiLabelSummaryPromptArn === undefined) {
        log.warn(
            "Skipping updating AI Summaries and Labels because AWS Prompt ARN was not submitted",
        );
        return;
    }
    const conversationInsights = await getConversationInsights({
        db,
        conversationId,
    });
    const genLabelSummaryOutput = await invokeRemoteModel({
        conversationInsights,
        awsAiLabelSummaryPromptArn,
        awsAiLabelSummaryPromptRegion,
        awsAiLabelSummaryPromptVariable,
    });
    await doUpdateAiLabelsAndSummaries({
        db,
        conversationId,
        genLabelSummaryOutput,
    });
    // update DB with LLM value
}

interface DoUpdateAiLabelsAndSummariesProps {
    db: PostgresJsDatabase;
    conversationId: number;
    genLabelSummaryOutput:
        | GenLabelSummaryOutputStrict
        | GenLabelSummaryOutputLoose;
}

async function doUpdateAiLabelsAndSummaries({
    db,
    conversationId,
    genLabelSummaryOutput,
}: DoUpdateAiLabelsAndSummariesProps): Promise<void> {
    await updateConversationSummary({
        db,
        conversationId,
        summary: genLabelSummaryOutput.summary,
    });
    await updateClustersLabelsAndSummaries({
        db,
        conversationId,
        aiClustersLabelsAndSummaries: genLabelSummaryOutput.clusters,
    });
}

interface UpdateClustersLabelsAndSummariesProps {
    db: PostgresJsDatabase;
    conversationId: number;
    aiClustersLabelsAndSummaries:
        | GenLabelSummaryOutputClusterStrict
        | GenLabelSummaryOutputClusterLoose;
}

async function updateClustersLabelsAndSummaries({
    db,
    conversationId,
    aiClustersLabelsAndSummaries,
}: UpdateClustersLabelsAndSummariesProps): Promise<void> {
    for (const key of Object.keys(
        aiClustersLabelsAndSummaries,
    ) as (keyof typeof aiClustersLabelsAndSummaries)[] /* necessary otherwise the fine-grained type of `key` is lost */) {
        const aiClusterLabelAndSummary = aiClustersLabelsAndSummaries[key];
        if (aiClusterLabelAndSummary === undefined) {
            continue;
        }
        // we use raw sql because update ... from with multiple join doesn't work properly in drizzle
        await db.execute(sql`
          UPDATE ${polisClusterTable}
          SET ${polisClusterTable.aiLabel} = ${aiClusterLabelAndSummary.label},
              ${polisClusterTable.aiSummary} = ${aiClusterLabelAndSummary.summary}
          FROM ${polisContentTable}
          INNER JOIN ${conversationTable}
            ON ${conversationTable.id} = ${polisContentTable.conversationId}
          WHERE ${polisClusterTable.key} = ${key}
            AND ${polisContentTable.conversationId} = ${conversationId}
            AND ${polisContentTable.id} = ${conversationTable.currentPolisContentId}
            AND ${polisClusterTable.polisContentId} = ${polisContentTable.id};
        `);
    }
}

interface UpdateConversationSummaryProps {
    db: PostgresJsDatabase;
    conversationId: number;
    summary: string;
}

async function updateConversationSummary({
    db,
    conversationId,
    summary,
}: UpdateConversationSummaryProps): Promise<void> {
    await db
        .update(polisContentTable)
        .set({
            aiSummary: summary,
        })
        .from(conversationTable)
        .where(
            and(
                eq(
                    conversationTable.currentPolisContentId,
                    polisContentTable.id,
                ),
                eq(conversationTable.id, polisContentTable.conversationId),
                eq(polisContentTable.conversationId, conversationId),
            ),
        );
}

interface InvokeRemoteModelProps {
    conversationInsights: ConversationInsights;
    awsAiLabelSummaryPromptArn: string;
    awsAiLabelSummaryPromptRegion: string;
    awsAiLabelSummaryPromptVariable: string;
}

async function invokeRemoteModel({
    conversationInsights,
    awsAiLabelSummaryPromptArn,
    awsAiLabelSummaryPromptRegion,
    awsAiLabelSummaryPromptVariable,
}: InvokeRemoteModelProps): Promise<
    GenLabelSummaryOutputStrict | GenLabelSummaryOutputLoose
> {
    const client = new BedrockRuntimeClient({
        region: awsAiLabelSummaryPromptRegion,
    });
    const command = new InvokeModelCommand({
        modelId: awsAiLabelSummaryPromptArn,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
            promptVariables: {
                [awsAiLabelSummaryPromptVariable]: conversationInsights,
            },
        }),
    });
    // we let this throw if any error occurs, it will be caught by the generic error handler
    const response = await client.send(command);
    const decodedResponseBody = new TextDecoder().decode(response.body);
    const responseBody: unknown = JSON.parse(decodedResponseBody);
    // try strict first
    const resultStrict = zodGenLabelSummaryOutputStrict.safeParse(responseBody);
    if (resultStrict.success) {
        return resultStrict.data;
    } else {
        log.warn(
            "Unable to parse AI Label and Summary output object using strict mode:",
        );
        log.warn(resultStrict.error);
    }
    // will throw and be caught by the generic fastify handler eventually
    return zodGenLabelSummaryOutputLoose.parse(responseBody);
}

interface GetConversationInsightsProps {
    db: PostgresJsDatabase;
    conversationId: number;
}

async function getConversationInsights({
    db,
    conversationId,
}: GetConversationInsightsProps): Promise<ConversationInsights> {
    const conversationDataResults = await db
        .select({
            conversationTitle: conversationContentTable.title,
            participantCount: conversationTable.participantCount,
            conversationBody: conversationContentTable.body,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .where(eq(conversationTable.id, conversationId));
    if (conversationDataResults.length === 0) {
        throw new Error(
            "Conversation requested for creation of AI labels and summaries was not found",
        );
    }
    const { conversationTitle, conversationBody, participantCount } =
        conversationDataResults[0];
    const coreOpinions = await getCoreOpinions({
        db,
        conversationId,
    });
    return {
        conversationTitle,
        conversationBody: toUnionUndefined(conversationBody),
        participantCount,
        ...coreOpinions,
    };
}

interface CoreOpinions {
    majorityOpinions: OpinionInsight[];
    controversialOpinions: OpinionInsight[];
    clusters: Record<string, ClusterInsights>;
}

interface GetCoreOpinionsProps {
    db: PostgresJsDatabase;
    conversationId: number;
}

async function getCoreOpinions({
    db,
    conversationId,
}: GetCoreOpinionsProps): Promise<CoreOpinions> {
    const polisClusterTableAlias0 = alias(polisClusterTable, "cluster_0 ");
    const polisClusterTableAlias1 = alias(polisClusterTable, "cluster_1 ");
    const polisClusterTableAlias2 = alias(polisClusterTable, "cluster_2 ");
    const polisClusterTableAlias3 = alias(polisClusterTable, "cluster_3 ");
    const polisClusterTableAlias4 = alias(polisClusterTable, "cluster_4 ");
    const polisClusterTableAlias5 = alias(polisClusterTable, "cluster_5 ");

    const conversationDataResults = await db
        .select({
            opinionContent: opinionContentTable.content,
            participantCount: conversationTable.participantCount,
            numAgrees: opinionTable.numAgrees,
            numDisagrees: opinionTable.numDisagrees,
            cluster0NumUsers: polisClusterTableAlias0.numUsers,
            cluster0NumAgrees: opinionTable.polisCluster0NumAgrees,
            cluster0NumDisagrees: opinionTable.polisCluster0NumDisagrees,
            cluster1NumUsers: polisClusterTableAlias1.numUsers,
            cluster1NumAgrees: opinionTable.polisCluster1NumAgrees,
            cluster1NumDisagrees: opinionTable.polisCluster1NumDisagrees,
            cluster2NumUsers: polisClusterTableAlias2.numUsers,
            cluster2NumAgrees: opinionTable.polisCluster2NumAgrees,
            cluster2NumDisagrees: opinionTable.polisCluster2NumDisagrees,
            cluster3NumUsers: polisClusterTableAlias3.numUsers,
            cluster3NumAgrees: opinionTable.polisCluster3NumAgrees,
            cluster3NumDisagrees: opinionTable.polisCluster3NumDisagrees,
            cluster4NumUsers: polisClusterTableAlias4.numUsers,
            cluster4NumAgrees: opinionTable.polisCluster4NumAgrees,
            cluster4NumDisagrees: opinionTable.polisCluster4NumDisagrees,
            cluster5NumUsers: polisClusterTableAlias5.numUsers,
            cluster5NumAgrees: opinionTable.polisCluster5NumAgrees,
            cluster5NumDisagrees: opinionTable.polisCluster5NumDisagrees,
            conversationBody: conversationContentTable.body,
        })
        .from(opinionTable)
        .innerJoin(
            conversationTable,
            eq(opinionTable.conversationId, conversationTable.id),
        )
        .innerJoin(
            conversationContentTable,
            eq(conversationTable.currentContentId, conversationContentTable.id),
        )
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.opinionId, opinionTable.id),
        )
        .leftJoin(
            polisContentTable,
            eq(polisContentTable.id, conversationTable.currentPolisContentId),
        )
        .leftJoin(
            polisClusterTableAlias0,
            and(
                eq(
                    polisClusterTableAlias0.polisContentId,
                    polisContentTable.id,
                ),
                eq(polisClusterTableAlias0.key, "0"),
            ),
        )
        .leftJoin(
            polisClusterTableAlias1,
            and(
                eq(
                    polisClusterTableAlias1.polisContentId,
                    polisContentTable.id,
                ),
                eq(polisClusterTableAlias1.key, "1"),
            ),
        )
        .leftJoin(
            polisClusterTableAlias2,
            and(
                eq(
                    polisClusterTableAlias2.polisContentId,
                    polisContentTable.id,
                ),
                eq(polisClusterTableAlias2.key, "2"),
            ),
        )
        .leftJoin(
            polisClusterTableAlias3,
            and(
                eq(
                    polisClusterTableAlias3.polisContentId,
                    polisContentTable.id,
                ),
                eq(polisClusterTableAlias3.key, "3"),
            ),
        )
        .leftJoin(
            polisClusterTableAlias4,
            and(
                eq(
                    polisClusterTableAlias4.polisContentId,
                    polisContentTable.id,
                ),
                eq(polisClusterTableAlias4.key, "4"),
            ),
        )
        .leftJoin(
            polisClusterTableAlias5,
            and(
                eq(
                    polisClusterTableAlias5.polisContentId,
                    polisContentTable.id,
                ),
                eq(polisClusterTableAlias5.key, "5"),
            ),
        )
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                isNotNull(opinionTable.currentContentId),
                or(
                    // total
                    isSqlMajority({
                        numAgreesColumn: opinionTable.numAgrees,
                        numDisagreesColumn: opinionTable.numDisagrees,
                        memberCountColumn: conversationTable.participantCount,
                    }),
                    isSqlControversial({
                        numAgreesColumn: opinionTable.numAgrees,
                        memberCountColumn: conversationTable.participantCount,
                        numDisagreesColumn: opinionTable.numDisagrees,
                    }),
                    // 0
                    isSqlMajority({
                        numAgreesColumn: opinionTable.polisCluster0NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster0NumDisagrees,
                        memberCountColumn: polisClusterTableAlias0.numUsers,
                    }),
                    isSqlControversial({
                        numAgreesColumn: opinionTable.polisCluster0NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster0NumDisagrees,
                        memberCountColumn: polisClusterTableAlias0.numUsers,
                    }),
                    // 1
                    isSqlMajority({
                        numAgreesColumn: opinionTable.polisCluster1NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster1NumDisagrees,
                        memberCountColumn: polisClusterTableAlias1.numUsers,
                    }),
                    isSqlControversial({
                        numAgreesColumn: opinionTable.polisCluster1NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster1NumDisagrees,
                        memberCountColumn: polisClusterTableAlias1.numUsers,
                    }),
                    // 2
                    isSqlMajority({
                        numAgreesColumn: opinionTable.polisCluster2NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster2NumDisagrees,
                        memberCountColumn: polisClusterTableAlias2.numUsers,
                    }),
                    isSqlControversial({
                        numAgreesColumn: opinionTable.polisCluster2NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster2NumDisagrees,
                        memberCountColumn: polisClusterTableAlias2.numUsers,
                    }),
                    // 3
                    isSqlMajority({
                        numAgreesColumn: opinionTable.polisCluster3NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster3NumDisagrees,
                        memberCountColumn: polisClusterTableAlias3.numUsers,
                    }),
                    isSqlControversial({
                        numAgreesColumn: opinionTable.polisCluster3NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster3NumDisagrees,
                        memberCountColumn: polisClusterTableAlias3.numUsers,
                    }),
                    // 4
                    isSqlMajority({
                        numAgreesColumn: opinionTable.polisCluster4NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster4NumDisagrees,
                        memberCountColumn: polisClusterTableAlias4.numUsers,
                    }),
                    isSqlControversial({
                        numAgreesColumn: opinionTable.polisCluster4NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster4NumDisagrees,
                        memberCountColumn: polisClusterTableAlias4.numUsers,
                    }),
                    // 5
                    isSqlMajority({
                        numAgreesColumn: opinionTable.polisCluster5NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster5NumDisagrees,
                        memberCountColumn: polisClusterTableAlias5.numUsers,
                    }),
                    isSqlControversial({
                        numAgreesColumn: opinionTable.polisCluster5NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster5NumDisagrees,
                        memberCountColumn: polisClusterTableAlias5.numUsers,
                    }),
                ),
            ),
        );

    const majorityOpinions: OpinionInsight[] = [];
    const controversialOpinions: OpinionInsight[] = [];
    const clusters: Record<string, ClusterInsights> = {};
    for (const conversationData of conversationDataResults) {
        const newOpinion = {
            opinionContent: conversationData.opinionContent,
            percentageAgree:
                conversationData.numAgrees / conversationData.participantCount,
            percentageDisagree:
                conversationData.numDisagrees /
                conversationData.participantCount,
        };
        if (
            isMajority({
                numAgrees: conversationData.numAgrees,
                memberCount: conversationData.participantCount,
                numDisagrees: conversationData.numDisagrees,
            })
        ) {
            majorityOpinions.push(newOpinion);
        }
        if (
            isControversial({
                numAgrees: conversationData.numAgrees,
                numDisagrees: conversationData.numDisagrees,
                memberCount: conversationData.participantCount,
            })
        ) {
            controversialOpinions.push(newOpinion);
        }

        if (
            conversationData.cluster0NumAgrees !== null &&
            conversationData.cluster0NumDisagrees !== null &&
            conversationData.cluster0NumUsers !== null
        ) {
            if (
                isMajority({
                    numAgrees: conversationData.cluster0NumAgrees,
                    numDisagrees: conversationData.cluster0NumDisagrees,
                    memberCount: conversationData.cluster0NumUsers,
                })
            ) {
                if ("0" in clusters) {
                    clusters["0"].majorityOpinions.push(newOpinion);
                } else {
                    clusters["0"] = {
                        memberCount: conversationData.cluster0NumUsers,
                        majorityOpinions: [newOpinion],
                        controversialOpinions: [],
                    };
                }
            }
            if (
                isControversial({
                    numAgrees: conversationData.cluster0NumAgrees,
                    numDisagrees: conversationData.cluster0NumDisagrees,
                    memberCount: conversationData.cluster0NumUsers,
                })
            ) {
                if ("0" in clusters) {
                    clusters["0"].controversialOpinions.push(newOpinion);
                } else {
                    clusters["0"] = {
                        memberCount: conversationData.cluster0NumUsers,
                        majorityOpinions: [],
                        controversialOpinions: [newOpinion],
                    };
                }
            }
        }
        if (
            conversationData.cluster1NumAgrees !== null &&
            conversationData.cluster1NumDisagrees !== null &&
            conversationData.cluster1NumUsers !== null
        ) {
            if (
                isMajority({
                    numAgrees: conversationData.cluster1NumAgrees,
                    numDisagrees: conversationData.cluster1NumDisagrees,
                    memberCount: conversationData.cluster1NumUsers,
                })
            ) {
                if ("1" in clusters) {
                    clusters["1"].majorityOpinions.push(newOpinion);
                } else {
                    clusters["1"] = {
                        memberCount: conversationData.cluster1NumUsers,
                        majorityOpinions: [newOpinion],
                        controversialOpinions: [],
                    };
                }
            }
            if (
                isControversial({
                    numAgrees: conversationData.cluster1NumAgrees,
                    numDisagrees: conversationData.cluster1NumDisagrees,
                    memberCount: conversationData.cluster1NumUsers,
                })
            ) {
                if ("1" in clusters) {
                    clusters["1"].controversialOpinions.push(newOpinion);
                } else {
                    clusters["1"] = {
                        memberCount: conversationData.cluster1NumUsers,
                        majorityOpinions: [],
                        controversialOpinions: [newOpinion],
                    };
                }
            }
            if (
                conversationData.cluster2NumAgrees !== null &&
                conversationData.cluster2NumDisagrees !== null &&
                conversationData.cluster2NumUsers !== null
            ) {
                if (
                    isMajority({
                        numAgrees: conversationData.cluster2NumAgrees,
                        numDisagrees: conversationData.cluster2NumDisagrees,
                        memberCount: conversationData.cluster2NumUsers,
                    })
                ) {
                    if ("2" in clusters) {
                        clusters["2"].majorityOpinions.push(newOpinion);
                    } else {
                        clusters["2"] = {
                            memberCount: conversationData.cluster2NumUsers,
                            majorityOpinions: [newOpinion],
                            controversialOpinions: [],
                        };
                    }
                }
                if (
                    isControversial({
                        numAgrees: conversationData.cluster2NumAgrees,
                        numDisagrees: conversationData.cluster2NumDisagrees,
                        memberCount: conversationData.cluster2NumUsers,
                    })
                ) {
                    if ("2" in clusters) {
                        clusters["2"].controversialOpinions.push(newOpinion);
                    } else {
                        clusters["2"] = {
                            memberCount: conversationData.cluster2NumUsers,
                            majorityOpinions: [],
                            controversialOpinions: [newOpinion],
                        };
                    }
                }
                if (
                    conversationData.cluster3NumAgrees !== null &&
                    conversationData.cluster3NumDisagrees !== null &&
                    conversationData.cluster3NumUsers !== null
                ) {
                    if (
                        isMajority({
                            numAgrees: conversationData.cluster3NumAgrees,
                            numDisagrees: conversationData.cluster3NumDisagrees,
                            memberCount: conversationData.cluster3NumUsers,
                        })
                    ) {
                        if ("3" in clusters) {
                            clusters["3"].majorityOpinions.push(newOpinion);
                        } else {
                            clusters["3"] = {
                                memberCount: conversationData.cluster3NumUsers,
                                majorityOpinions: [newOpinion],
                                controversialOpinions: [],
                            };
                        }
                    }
                    if (
                        isControversial({
                            numAgrees: conversationData.cluster3NumAgrees,
                            numDisagrees: conversationData.cluster3NumDisagrees,
                            memberCount: conversationData.cluster3NumUsers,
                        })
                    ) {
                        if ("3" in clusters) {
                            clusters["3"].controversialOpinions.push(
                                newOpinion,
                            );
                        } else {
                            clusters["3"] = {
                                memberCount: conversationData.cluster3NumUsers,
                                majorityOpinions: [],
                                controversialOpinions: [newOpinion],
                            };
                        }
                    }
                }
                if (
                    conversationData.cluster4NumAgrees !== null &&
                    conversationData.cluster4NumDisagrees !== null &&
                    conversationData.cluster4NumUsers !== null
                ) {
                    if (
                        isMajority({
                            numAgrees: conversationData.cluster4NumAgrees,
                            numDisagrees: conversationData.cluster4NumDisagrees,
                            memberCount: conversationData.cluster4NumUsers,
                        })
                    ) {
                        if ("4" in clusters) {
                            clusters["4"].majorityOpinions.push(newOpinion);
                        } else {
                            clusters["4"] = {
                                memberCount: conversationData.cluster4NumUsers,
                                majorityOpinions: [newOpinion],
                                controversialOpinions: [],
                            };
                        }
                    }
                    if (
                        isControversial({
                            numAgrees: conversationData.cluster4NumAgrees,
                            numDisagrees: conversationData.cluster4NumDisagrees,
                            memberCount: conversationData.cluster4NumUsers,
                        })
                    ) {
                        if ("4" in clusters) {
                            clusters["4"].controversialOpinions.push(
                                newOpinion,
                            );
                        } else {
                            clusters["4"] = {
                                memberCount: conversationData.cluster4NumUsers,
                                majorityOpinions: [],
                                controversialOpinions: [newOpinion],
                            };
                        }
                    }
                }
                if (
                    conversationData.cluster5NumAgrees !== null &&
                    conversationData.cluster5NumDisagrees !== null &&
                    conversationData.cluster5NumUsers !== null
                ) {
                    if (
                        isMajority({
                            numAgrees: conversationData.cluster5NumAgrees,
                            numDisagrees: conversationData.cluster5NumDisagrees,
                            memberCount: conversationData.cluster5NumUsers,
                        })
                    ) {
                        if ("5" in clusters) {
                            clusters["5"].majorityOpinions.push(newOpinion);
                        } else {
                            clusters["5"] = {
                                memberCount: conversationData.cluster5NumUsers,
                                majorityOpinions: [newOpinion],
                                controversialOpinions: [],
                            };
                        }
                    }
                    if (
                        isControversial({
                            numAgrees: conversationData.cluster5NumAgrees,
                            numDisagrees: conversationData.cluster5NumDisagrees,
                            memberCount: conversationData.cluster5NumUsers,
                        })
                    ) {
                        if ("5" in clusters) {
                            clusters["5"].controversialOpinions.push(
                                newOpinion,
                            );
                        } else {
                            clusters["5"] = {
                                memberCount: conversationData.cluster5NumUsers,
                                majorityOpinions: [],
                                controversialOpinions: [newOpinion],
                            };
                        }
                    }
                }
            }
        }
    }
    return {
        majorityOpinions,
        controversialOpinions,
        clusters,
    };
}
