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
import { z } from "zod";

interface UpdateAiLabelsAndSummariesProps {
    db: PostgresJsDatabase;
    conversationId: number;
    awsAiLabelSummaryRegion: string;
    awsAiLabelSummaryModelId: string;
    awsAiLabelSummaryTemperature: string;
    awsAiLabelSummaryTopP: string;
    awsAiLabelSummaryTopK: string;
    awsAiLabelSummaryMaxTokens: string;
    awsAiLabelSummaryPrompt: string;
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
    awsAiLabelSummaryRegion,
    awsAiLabelSummaryModelId,
    awsAiLabelSummaryTemperature,
    awsAiLabelSummaryTopP,
    awsAiLabelSummaryTopK,
    awsAiLabelSummaryMaxTokens,
    awsAiLabelSummaryPrompt,
}: UpdateAiLabelsAndSummariesProps): Promise<void> {
    const conversationInsights = await getConversationInsights({
        db,
        conversationId,
    });
    const genLabelSummaryOutput = await invokeRemoteModel({
        conversationInsights,
        awsAiLabelSummaryRegion,
        awsAiLabelSummaryModelId,
        awsAiLabelSummaryTemperature,
        awsAiLabelSummaryTopP,
        awsAiLabelSummaryTopK,
        awsAiLabelSummaryMaxTokens,
        awsAiLabelSummaryPrompt,
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
        // WARN: this is not typesafe
        await db.execute(sql`
          UPDATE ${polisClusterTable} AS "pc"
          SET "ai_label" = ${aiClusterLabelAndSummary.label},
              "ai_summary" = ${aiClusterLabelAndSummary.summary}
          FROM ${polisContentTable} AS "p"
          INNER JOIN ${conversationTable} AS "c"
            ON "c"."id" = "p"."conversation_id"
          WHERE "pc"."key" = ${key}
            AND "p"."conversation_id" = ${conversationId}
            AND "p"."id" = "c"."current_polis_content_id"
            AND "pc"."polis_content_id" = "p"."id";
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
    awsAiLabelSummaryRegion: string;
    awsAiLabelSummaryModelId: string;
    awsAiLabelSummaryTemperature: string;
    awsAiLabelSummaryTopP: string;
    awsAiLabelSummaryTopK: string;
    awsAiLabelSummaryMaxTokens: string;
    awsAiLabelSummaryPrompt: string;
}

async function invokeRemoteModel({
    conversationInsights,
    awsAiLabelSummaryRegion,
    awsAiLabelSummaryModelId,
    awsAiLabelSummaryTemperature,
    awsAiLabelSummaryTopP,
    awsAiLabelSummaryTopK,
    awsAiLabelSummaryMaxTokens,
    awsAiLabelSummaryPrompt,
}: InvokeRemoteModelProps): Promise<
    GenLabelSummaryOutputStrict | GenLabelSummaryOutputLoose
> {
    const zodInvokeModelResponse = z.object({
        outputs: z
            .array(
                z.object({
                    text: z.string(),
                }),
            )
            .min(1),
    });

    const client = new BedrockRuntimeClient({
        region: awsAiLabelSummaryRegion,
    });
    const prompt = `${awsAiLabelSummaryPrompt}\n\n${JSON.stringify(
        conversationInsights,
    )}`;
    log.info(`Sending Generate Label and Summary Prompt to LLM:\n${prompt}`);
    const command = new InvokeModelCommand({
        modelId: awsAiLabelSummaryModelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
            prompt: prompt,
            temperature: awsAiLabelSummaryTemperature,
            top_p: awsAiLabelSummaryTopP,
            top_k: awsAiLabelSummaryTopK,
            max_tokens: awsAiLabelSummaryMaxTokens,
        }),
    });
    // we let this throw if any error occurs, it will be caught by the generic error handler
    const response = await client.send(command);
    const decodedResponseBody = new TextDecoder().decode(response.body);
    const responseBody: unknown = JSON.parse(decodedResponseBody);
    const typedResponseBody = zodInvokeModelResponse.safeParse(responseBody);
    if (!typedResponseBody.success) {
        throw new Error(
            `Unable to parse AWS Bedrock response: '${decodedResponseBody}'`,
            { cause: typedResponseBody.error },
        );
    }
    const modelResponseStr = typedResponseBody.data.outputs[0].text;
    const modelResponse: unknown = JSON.parse(modelResponseStr);
    // try strict first
    const resultStrict =
        zodGenLabelSummaryOutputStrict.safeParse(modelResponse);
    if (resultStrict.success) {
        return resultStrict.data;
    } else {
        log.warn(
            `Unable to parse AI Label and Summary output object using strict mode: '${modelResponseStr}'`,
        );
        log.warn(resultStrict.error);
    }
    // will throw and be caught by the generic fastify handler eventually
    const resultLoose = zodGenLabelSummaryOutputLoose.safeParse(modelResponse);
    if (!resultLoose.success) {
        throw new Error(
            `Unable to parse AI Label and Summary output object using loose mode: '${modelResponseStr}'`,
            { cause: resultLoose.error },
        );
    }
    return resultLoose.data;
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
        const newOpinionTotal = {
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
            majorityOpinions.push(newOpinionTotal);
        }
        if (
            isControversial({
                numAgrees: conversationData.numAgrees,
                numDisagrees: conversationData.numDisagrees,
                memberCount: conversationData.participantCount,
            })
        ) {
            controversialOpinions.push(newOpinionTotal);
        }

        if (
            conversationData.cluster0NumAgrees !== null &&
            conversationData.cluster0NumDisagrees !== null &&
            conversationData.cluster0NumUsers !== null
        ) {
            const newOpinionCluster0 = {
                opinionContent: conversationData.opinionContent,
                percentageAgree:
                    conversationData.cluster0NumAgrees /
                    conversationData.cluster0NumUsers,
                percentageDisagree:
                    conversationData.cluster0NumDisagrees /
                    conversationData.cluster0NumUsers,
            };
            if (
                isMajority({
                    numAgrees: conversationData.cluster0NumAgrees,
                    numDisagrees: conversationData.cluster0NumDisagrees,
                    memberCount: conversationData.cluster0NumUsers,
                })
            ) {
                if ("0" in clusters) {
                    clusters["0"].majorityOpinions.push(newOpinionCluster0);
                } else {
                    clusters["0"] = {
                        memberCount: conversationData.cluster0NumUsers,
                        majorityOpinions: [newOpinionCluster0],
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
                    clusters["0"].controversialOpinions.push(
                        newOpinionCluster0,
                    );
                } else {
                    clusters["0"] = {
                        memberCount: conversationData.cluster0NumUsers,
                        majorityOpinions: [],
                        controversialOpinions: [newOpinionCluster0],
                    };
                }
            }
        }
        if (
            conversationData.cluster1NumAgrees !== null &&
            conversationData.cluster1NumDisagrees !== null &&
            conversationData.cluster1NumUsers !== null
        ) {
            const newOpinionCluster1 = {
                opinionContent: conversationData.opinionContent,
                percentageAgree:
                    conversationData.cluster1NumAgrees /
                    conversationData.cluster1NumUsers,
                percentageDisagree:
                    conversationData.cluster1NumDisagrees /
                    conversationData.cluster1NumUsers,
            };
            if (
                isMajority({
                    numAgrees: conversationData.cluster1NumAgrees,
                    numDisagrees: conversationData.cluster1NumDisagrees,
                    memberCount: conversationData.cluster1NumUsers,
                })
            ) {
                if ("1" in clusters) {
                    clusters["1"].majorityOpinions.push(newOpinionCluster1);
                } else {
                    clusters["1"] = {
                        memberCount: conversationData.cluster1NumUsers,
                        majorityOpinions: [newOpinionCluster1],
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
                    clusters["1"].controversialOpinions.push(
                        newOpinionCluster1,
                    );
                } else {
                    clusters["1"] = {
                        memberCount: conversationData.cluster1NumUsers,
                        majorityOpinions: [],
                        controversialOpinions: [newOpinionCluster1],
                    };
                }
            }
            if (
                conversationData.cluster2NumAgrees !== null &&
                conversationData.cluster2NumDisagrees !== null &&
                conversationData.cluster2NumUsers !== null
            ) {
                const newOpinionCluster2 = {
                    opinionContent: conversationData.opinionContent,
                    percentageAgree:
                        conversationData.cluster2NumAgrees /
                        conversationData.cluster2NumUsers,
                    percentageDisagree:
                        conversationData.cluster2NumDisagrees /
                        conversationData.cluster2NumUsers,
                };
                if (
                    isMajority({
                        numAgrees: conversationData.cluster2NumAgrees,
                        numDisagrees: conversationData.cluster2NumDisagrees,
                        memberCount: conversationData.cluster2NumUsers,
                    })
                ) {
                    if ("2" in clusters) {
                        clusters["2"].majorityOpinions.push(newOpinionCluster2);
                    } else {
                        clusters["2"] = {
                            memberCount: conversationData.cluster2NumUsers,
                            majorityOpinions: [newOpinionCluster2],
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
                        clusters["2"].controversialOpinions.push(
                            newOpinionCluster2,
                        );
                    } else {
                        clusters["2"] = {
                            memberCount: conversationData.cluster2NumUsers,
                            majorityOpinions: [],
                            controversialOpinions: [newOpinionCluster2],
                        };
                    }
                }
                if (
                    conversationData.cluster3NumAgrees !== null &&
                    conversationData.cluster3NumDisagrees !== null &&
                    conversationData.cluster3NumUsers !== null
                ) {
                    const newOpinionCluster3 = {
                        opinionContent: conversationData.opinionContent,
                        percentageAgree:
                            conversationData.cluster3NumAgrees /
                            conversationData.cluster3NumUsers,
                        percentageDisagree:
                            conversationData.cluster3NumDisagrees /
                            conversationData.cluster3NumUsers,
                    };
                    if (
                        isMajority({
                            numAgrees: conversationData.cluster3NumAgrees,
                            numDisagrees: conversationData.cluster3NumDisagrees,
                            memberCount: conversationData.cluster3NumUsers,
                        })
                    ) {
                        if ("3" in clusters) {
                            clusters["3"].majorityOpinions.push(
                                newOpinionCluster3,
                            );
                        } else {
                            clusters["3"] = {
                                memberCount: conversationData.cluster3NumUsers,
                                majorityOpinions: [newOpinionCluster3],
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
                                newOpinionCluster3,
                            );
                        } else {
                            clusters["3"] = {
                                memberCount: conversationData.cluster3NumUsers,
                                majorityOpinions: [],
                                controversialOpinions: [newOpinionCluster3],
                            };
                        }
                    }
                }
                if (
                    conversationData.cluster4NumAgrees !== null &&
                    conversationData.cluster4NumDisagrees !== null &&
                    conversationData.cluster4NumUsers !== null
                ) {
                    const newOpinionCluster4 = {
                        opinionContent: conversationData.opinionContent,
                        percentageAgree:
                            conversationData.cluster4NumAgrees /
                            conversationData.cluster4NumUsers,
                        percentageDisagree:
                            conversationData.cluster4NumDisagrees /
                            conversationData.cluster4NumUsers,
                    };
                    if (
                        isMajority({
                            numAgrees: conversationData.cluster4NumAgrees,
                            numDisagrees: conversationData.cluster4NumDisagrees,
                            memberCount: conversationData.cluster4NumUsers,
                        })
                    ) {
                        if ("4" in clusters) {
                            clusters["4"].majorityOpinions.push(
                                newOpinionCluster4,
                            );
                        } else {
                            clusters["4"] = {
                                memberCount: conversationData.cluster4NumUsers,
                                majorityOpinions: [newOpinionCluster4],
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
                                newOpinionCluster4,
                            );
                        } else {
                            clusters["4"] = {
                                memberCount: conversationData.cluster4NumUsers,
                                majorityOpinions: [],
                                controversialOpinions: [newOpinionCluster4],
                            };
                        }
                    }
                }
                if (
                    conversationData.cluster5NumAgrees !== null &&
                    conversationData.cluster5NumDisagrees !== null &&
                    conversationData.cluster5NumUsers !== null
                ) {
                    const newOpinionCluster5 = {
                        opinionContent: conversationData.opinionContent,
                        percentageAgree:
                            conversationData.cluster5NumAgrees /
                            conversationData.cluster5NumUsers,
                        percentageDisagree:
                            conversationData.cluster5NumDisagrees /
                            conversationData.cluster5NumUsers,
                    };
                    if (
                        isMajority({
                            numAgrees: conversationData.cluster5NumAgrees,
                            numDisagrees: conversationData.cluster5NumDisagrees,
                            memberCount: conversationData.cluster5NumUsers,
                        })
                    ) {
                        if ("5" in clusters) {
                            clusters["5"].majorityOpinions.push(
                                newOpinionCluster5,
                            );
                        } else {
                            clusters["5"] = {
                                memberCount: conversationData.cluster5NumUsers,
                                majorityOpinions: [newOpinionCluster5],
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
                                newOpinionCluster5,
                            );
                        } else {
                            clusters["5"] = {
                                memberCount: conversationData.cluster5NumUsers,
                                majorityOpinions: [],
                                controversialOpinions: [newOpinionCluster5],
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
