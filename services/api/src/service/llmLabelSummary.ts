import { log } from "@/app.js";
import {
    conversationContentTable,
    conversationTable,
    opinionContentTable,
    opinionTable,
    // polisClusterOpinionTable,
    polisClusterTable,
    polisContentTable,
} from "@/schema.js";
import {
    isControversial,
    isGroupAwareConsensusAgree,
    isMajorityAgree,
    isMajorityDisagree,
    // isRepresentativeAgree,
    // isRepresentativeDisagree,
} from "@/shared/conversationLogic.js";
import { toUnionUndefined } from "@/shared/shared.js";
import {
    zodGenLabelSummaryOutputLoose,
    zodGenLabelSummaryOutputStrict,
    type GenLabelSummaryOutputClusterLoose,
    type GenLabelSummaryOutputClusterStrict,
    type GenLabelSummaryOutputLoose,
    type GenLabelSummaryOutputStrict,
} from "@/shared/types/zod.js";
import { parseLlmOutputJson } from "@/utils/llmParse.js";
import {
    isSqlWhereControversial,
    isSqlWhereGroupAwareConsensusAgree,
    isSqlWhereMajority,
    // isSqlWhereRepresentative,
} from "@/utils/sqlLogic.js";
import {
    BedrockRuntimeClient,
    ConverseCommand,
    type Message,
} from "@aws-sdk/client-bedrock-runtime";
import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { type JSONObject } from "extract-first-json";

interface UpdateAiLabelsAndSummariesProps {
    db: PostgresJsDatabase;
    conversationId: number;
    awsAiLabelSummaryRegion: string;
    awsAiLabelSummaryModelId: string;
    awsAiLabelSummaryTemperature: string;
    awsAiLabelSummaryTopP: string;
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
    majorityAgreeOpinions: OpinionInsight[];
    majorityDisagreeOpinions: OpinionInsight[];
    controversialOpinions: OpinionInsight[];
    representativeAgreeOpinions: OpinionInsight[];
    representativeDisagreeOpinions: OpinionInsight[];
}

interface ClusterInsightsWithoutRepresentatives {
    memberCount: number;
    majorityAgreeOpinions: OpinionInsight[];
    majorityDisagreeOpinions: OpinionInsight[];
    controversialOpinions: OpinionInsight[];
}

interface ConversationInsights {
    conversationTitle: string;
    conversationBody?: string;
    participantCount: number;
    majorityAgreeOpinions: OpinionInsight[];
    majorityDisagreeOpinions: OpinionInsight[];
    controversialOpinions: OpinionInsight[];
    groupAwareConsensusAgreeOpinions: OpinionInsight[];
    clusters: Record<string, ClusterInsights>;
}

// temporary patch because otherwise the prompt is larget than max context
interface ConversationInsightsWithoutRepresentatives {
    conversationTitle: string;
    conversationBody?: string;
    participantCount: number;
    majorityAgreeOpinions: OpinionInsight[];
    majorityDisagreeOpinions: OpinionInsight[];
    controversialOpinions: OpinionInsight[];
    groupAwareConsensusAgreeOpinions: OpinionInsight[];
    clusters: Record<string, ClusterInsightsWithoutRepresentatives>;
}

export async function updateAiLabelsAndSummaries({
    db,
    conversationId,
    awsAiLabelSummaryRegion,
    awsAiLabelSummaryModelId,
    awsAiLabelSummaryTemperature,
    awsAiLabelSummaryTopP,
    awsAiLabelSummaryMaxTokens,
    awsAiLabelSummaryPrompt,
}: UpdateAiLabelsAndSummariesProps): Promise<void> {
    const conversationInsights = await getConversationInsights({
        db,
        conversationId,
    });
    const genLabelSummaryOutput = await invokeRemoteModel({
        conversationId,
        conversationInsights,
        awsAiLabelSummaryRegion,
        awsAiLabelSummaryModelId,
        awsAiLabelSummaryTemperature,
        awsAiLabelSummaryTopP,
        awsAiLabelSummaryMaxTokens,
        awsAiLabelSummaryPrompt,
    });
    log.info(
        `[LLM] Received Label and Summary Prompt results for conversation ${String(
            conversationId,
        )}: ${JSON.stringify(genLabelSummaryOutput)}`,
    );
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
    conversationId: number;
    conversationInsights: ConversationInsights;
    awsAiLabelSummaryRegion: string;
    awsAiLabelSummaryModelId: string;
    awsAiLabelSummaryTemperature: string;
    awsAiLabelSummaryTopP: string;
    awsAiLabelSummaryMaxTokens: string;
    awsAiLabelSummaryPrompt: string;
}

async function invokeRemoteModel({
    conversationId,
    conversationInsights,
    awsAiLabelSummaryRegion,
    awsAiLabelSummaryModelId,
    awsAiLabelSummaryTemperature,
    awsAiLabelSummaryTopP,
    awsAiLabelSummaryMaxTokens,
    awsAiLabelSummaryPrompt,
}: InvokeRemoteModelProps): Promise<
    GenLabelSummaryOutputStrict | GenLabelSummaryOutputLoose
> {
    const clustersWithoutRepresentatives: Record<
        string,
        ClusterInsightsWithoutRepresentatives
    > = {};

    for (const [key, cluster] of Object.entries(
        conversationInsights.clusters,
    )) {
        clustersWithoutRepresentatives[key] = {
            memberCount: cluster.memberCount,
            majorityAgreeOpinions: cluster.majorityAgreeOpinions,
            majorityDisagreeOpinions: cluster.majorityDisagreeOpinions,
            controversialOpinions: cluster.controversialOpinions,
        };
    }
    const transformedConversationInsights: ConversationInsightsWithoutRepresentatives =
        {
            ...conversationInsights,
            clusters: clustersWithoutRepresentatives,
        };
    const userPrompt = JSON.stringify(transformedConversationInsights);
    const conversation: Message[] = [
        {
            role: "user",
            content: [{ text: userPrompt }],
        },
    ];
    const command = new ConverseCommand({
        modelId: awsAiLabelSummaryModelId,
        system: [{ text: JSON.stringify(awsAiLabelSummaryPrompt) }],
        messages: conversation,
        inferenceConfig: {
            maxTokens: Number(awsAiLabelSummaryMaxTokens),
            temperature: Number(awsAiLabelSummaryTemperature),
            topP: Number(awsAiLabelSummaryTopP),
        },
    });
    const client = new BedrockRuntimeClient({
        region: awsAiLabelSummaryRegion,
    });
    log.info(
        `[LLM] Sending Generate Label and Summary Prompt for conversation ${String(
            conversationId,
        )}:\n${userPrompt}`,
    );
    const response = await client.send(command);
    const message = response.output?.message;
    const modelResponseStr =
        message !== undefined
            ? message.content !== undefined
                ? message.content[0].text
                : undefined
            : undefined;
    if (modelResponseStr === undefined) {
        throw new Error(
            `[LLM]: Unable to parse AWS Bedrock response: '${JSON.stringify(
                response,
            )}'`,
        );
    }
    const modelResponse: JSONObject = parseLlmOutputJson(modelResponseStr);
    // try strict first
    const resultStrict =
        zodGenLabelSummaryOutputStrict.safeParse(modelResponse);
    if (resultStrict.success) {
        return resultStrict.data;
    } else {
        log.warn(
            resultStrict.error,
            `[LLM]: Unable to parse AI Label and Summary output object using strict mode:\n'${JSON.stringify(
                modelResponse,
            )}'`,
        );
    }
    // will throw and be caught by the generic fastify handler eventually
    const resultLoose = zodGenLabelSummaryOutputLoose.safeParse(modelResponse);
    if (!resultLoose.success) {
        throw new Error(
            `[LLM]: Unable to parse AI Label and Summary output object using loose mode:\n'${JSON.stringify(
                modelResponse,
            )}'`,
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
    majorityAgreeOpinions: OpinionInsight[];
    majorityDisagreeOpinions: OpinionInsight[];
    controversialOpinions: OpinionInsight[];
    groupAwareConsensusAgreeOpinions: OpinionInsight[];
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

    // const polisClusterOpinionTableAlias0 = alias(
    //     polisClusterOpinionTable,
    //     "cluster_opinion_0 ",
    // );
    // const polisClusterOpinionTableAlias1 = alias(
    //     polisClusterOpinionTable,
    //     "cluster_opinion_1 ",
    // );
    // const polisClusterOpinionTableAlias2 = alias(
    //     polisClusterOpinionTable,
    //     "cluster_opinion_2 ",
    // );
    // const polisClusterOpinionTableAlias3 = alias(
    //     polisClusterOpinionTable,
    //     "cluster_opinion_3 ",
    // );
    // const polisClusterOpinionTableAlias4 = alias(
    //     polisClusterOpinionTable,
    //     "cluster_opinion_4 ",
    // );
    // const polisClusterOpinionTableAlias5 = alias(
    //     polisClusterOpinionTable,
    //     "cluster_opinion_5 ",
    // );

    const conversationDataResults = await db
        .select({
            opinionContent: opinionContentTable.content,
            participantCount: conversationTable.participantCount,
            numAgrees: opinionTable.numAgrees,
            numDisagrees: opinionTable.numDisagrees,
            groupAwareConsensusProbabilityAgree:
                opinionTable.polisGroupAwareConsensusProbabilityAgree,
            cluster0NumUsers: polisClusterTableAlias0.numUsers,
            cluster0NumAgrees: opinionTable.polisCluster0NumAgrees,
            cluster0NumDisagrees: opinionTable.polisCluster0NumDisagrees,
            // cluster0RepnessProbability:
            //     polisClusterOpinionTableAlias0.probabilityAgreement,
            // cluster0RepnessAgreementType:
            //     polisClusterOpinionTableAlias0.agreementType,
            cluster1NumUsers: polisClusterTableAlias1.numUsers,
            cluster1NumAgrees: opinionTable.polisCluster1NumAgrees,
            cluster1NumDisagrees: opinionTable.polisCluster1NumDisagrees,
            // cluster1RepnessProbability:
            //     polisClusterOpinionTableAlias1.probabilityAgreement,
            // cluster1RepnessAgreementType:
            //     polisClusterOpinionTableAlias1.agreementType,
            cluster2NumUsers: polisClusterTableAlias2.numUsers,
            cluster2NumAgrees: opinionTable.polisCluster2NumAgrees,
            cluster2NumDisagrees: opinionTable.polisCluster2NumDisagrees,
            // cluster2RepnessProbability:
            //     polisClusterOpinionTableAlias2.probabilityAgreement,
            // cluster2RepnessAgreementType:
            //     polisClusterOpinionTableAlias2.agreementType,
            cluster3NumUsers: polisClusterTableAlias3.numUsers,
            cluster3NumAgrees: opinionTable.polisCluster3NumAgrees,
            cluster3NumDisagrees: opinionTable.polisCluster3NumDisagrees,
            // cluster3RepnessProbability:
            //     polisClusterOpinionTableAlias3.probabilityAgreement,
            // cluster3RepnessAgreementType:
            //     polisClusterOpinionTableAlias3.agreementType,
            cluster4NumUsers: polisClusterTableAlias4.numUsers,
            cluster4NumAgrees: opinionTable.polisCluster4NumAgrees,
            cluster4NumDisagrees: opinionTable.polisCluster4NumDisagrees,
            // cluster4RepnessProbability:
            //     polisClusterOpinionTableAlias4.probabilityAgreement,
            // cluster4RepnessAgreementType:
            //     polisClusterOpinionTableAlias4.agreementType,
            cluster5NumUsers: polisClusterTableAlias5.numUsers,
            cluster5NumAgrees: opinionTable.polisCluster5NumAgrees,
            cluster5NumDisagrees: opinionTable.polisCluster5NumDisagrees,
            // cluster5RepnessProbability:
            //     polisClusterOpinionTableAlias5.probabilityAgreement,
            // cluster5RepnessAgreementType:
            //     polisClusterOpinionTableAlias5.agreementType,
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
        // .leftJoin(
        //     polisClusterOpinionTableAlias0,
        //     eq(
        //         polisClusterOpinionTableAlias0.polisClusterId,
        //         polisClusterTableAlias0.id,
        //     ),
        // )
        // .leftJoin(
        //     polisClusterOpinionTableAlias1,
        //     eq(
        //         polisClusterOpinionTableAlias1.polisClusterId,
        //         polisClusterTableAlias1.id,
        //     ),
        // )
        // .leftJoin(
        //     polisClusterOpinionTableAlias2,
        //     eq(
        //         polisClusterOpinionTableAlias2.polisClusterId,
        //         polisClusterTableAlias2.id,
        //     ),
        // )
        // .leftJoin(
        //     polisClusterOpinionTableAlias3,
        //     eq(
        //         polisClusterOpinionTableAlias3.polisClusterId,
        //         polisClusterTableAlias3.id,
        //     ),
        // )
        // .leftJoin(
        //     polisClusterOpinionTableAlias4,
        //     eq(
        //         polisClusterOpinionTableAlias4.polisClusterId,
        //         polisClusterTableAlias4.id,
        //     ),
        // )
        // .leftJoin(
        //     polisClusterOpinionTableAlias5,
        //     eq(
        //         polisClusterOpinionTableAlias5.polisClusterId,
        //         polisClusterTableAlias5.id,
        //     ),
        // )
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                isNotNull(opinionTable.currentContentId),
                or(
                    // total
                    isSqlWhereMajority({
                        numAgreesColumn: opinionTable.numAgrees,
                        numDisagreesColumn: opinionTable.numDisagrees,
                        memberCountColumn: conversationTable.participantCount,
                    }),
                    isSqlWhereControversial({
                        numAgreesColumn: opinionTable.numAgrees,
                        memberCountColumn: conversationTable.participantCount,
                        numDisagreesColumn: opinionTable.numDisagrees,
                    }),
                    isSqlWhereGroupAwareConsensusAgree({
                        cluster0NumUsersColumn:
                            polisClusterTableAlias0.numUsers,
                        cluster1NumUsersColumn:
                            polisClusterTableAlias1.numUsers,
                        cluster2NumUsersColumn:
                            polisClusterTableAlias2.numUsers,
                        cluster3NumUsersColumn:
                            polisClusterTableAlias3.numUsers,
                        cluster4NumUsersColumn:
                            polisClusterTableAlias4.numUsers,
                        cluster5NumUsersColumn:
                            polisClusterTableAlias5.numUsers,
                    }),
                    // 0
                    isSqlWhereMajority({
                        numAgreesColumn: opinionTable.polisCluster0NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster0NumDisagrees,
                        memberCountColumn: polisClusterTableAlias0.numUsers,
                    }),
                    isSqlWhereControversial({
                        numAgreesColumn: opinionTable.polisCluster0NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster0NumDisagrees,
                        memberCountColumn: polisClusterTableAlias0.numUsers,
                    }),
                    // isSqlWhereRepresentative({
                    //     polisClusterOpinionIdColumn:
                    //         polisClusterOpinionTableAlias0.id,
                    // }),
                    // 1
                    isSqlWhereMajority({
                        numAgreesColumn: opinionTable.polisCluster1NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster1NumDisagrees,
                        memberCountColumn: polisClusterTableAlias1.numUsers,
                    }),
                    isSqlWhereControversial({
                        numAgreesColumn: opinionTable.polisCluster1NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster1NumDisagrees,
                        memberCountColumn: polisClusterTableAlias1.numUsers,
                    }),
                    // isSqlWhereRepresentative({
                    //     polisClusterOpinionIdColumn:
                    //         polisClusterOpinionTableAlias1.id,
                    // }),
                    // 2
                    isSqlWhereMajority({
                        numAgreesColumn: opinionTable.polisCluster2NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster2NumDisagrees,
                        memberCountColumn: polisClusterTableAlias2.numUsers,
                    }),
                    isSqlWhereControversial({
                        numAgreesColumn: opinionTable.polisCluster2NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster2NumDisagrees,
                        memberCountColumn: polisClusterTableAlias2.numUsers,
                    }),
                    // isSqlWhereRepresentative({
                    //     polisClusterOpinionIdColumn:
                    //         polisClusterOpinionTableAlias2.id,
                    // }),
                    // 3
                    isSqlWhereMajority({
                        numAgreesColumn: opinionTable.polisCluster3NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster3NumDisagrees,
                        memberCountColumn: polisClusterTableAlias3.numUsers,
                    }),
                    isSqlWhereControversial({
                        numAgreesColumn: opinionTable.polisCluster3NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster3NumDisagrees,
                        memberCountColumn: polisClusterTableAlias3.numUsers,
                    }),
                    // isSqlWhereRepresentative({
                    //     polisClusterOpinionIdColumn:
                    //         polisClusterOpinionTableAlias3.id,
                    // }),
                    // 4
                    isSqlWhereMajority({
                        numAgreesColumn: opinionTable.polisCluster4NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster4NumDisagrees,
                        memberCountColumn: polisClusterTableAlias4.numUsers,
                    }),
                    isSqlWhereControversial({
                        numAgreesColumn: opinionTable.polisCluster4NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster4NumDisagrees,
                        memberCountColumn: polisClusterTableAlias4.numUsers,
                    }),
                    // isSqlWhereRepresentative({
                    //     polisClusterOpinionIdColumn:
                    //         polisClusterOpinionTableAlias4.id,
                    // }),
                    // 5
                    isSqlWhereMajority({
                        numAgreesColumn: opinionTable.polisCluster5NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster5NumDisagrees,
                        memberCountColumn: polisClusterTableAlias5.numUsers,
                    }),
                    isSqlWhereControversial({
                        numAgreesColumn: opinionTable.polisCluster5NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster5NumDisagrees,
                        memberCountColumn: polisClusterTableAlias5.numUsers,
                    }),
                    // isSqlWhereRepresentative({
                    //     polisClusterOpinionIdColumn:
                    //         polisClusterOpinionTableAlias5.id,
                    // }),
                ),
            ),
        );

    const majorityAgreeOpinions: OpinionInsight[] = [];
    const majorityDisagreeOpinions: OpinionInsight[] = [];
    const controversialOpinions: OpinionInsight[] = [];
    const groupAwareConsensusAgreeOpinions: OpinionInsight[] = [];
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
            isMajorityAgree({
                numAgrees: conversationData.numAgrees,
                memberCount: conversationData.participantCount,
            })
        ) {
            majorityAgreeOpinions.push(newOpinionTotal);
        }
        if (
            isMajorityDisagree({
                numDisagrees: conversationData.numDisagrees,
                memberCount: conversationData.participantCount,
            })
        ) {
            majorityDisagreeOpinions.push(newOpinionTotal);
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
            isGroupAwareConsensusAgree({
                numClusters:
                    conversationData.cluster5NumUsers !== null
                        ? 6
                        : conversationData.cluster4NumUsers !== null
                          ? 5
                          : conversationData.cluster3NumUsers !== null
                            ? 4
                            : conversationData.cluster2NumUsers !== null
                              ? 3
                              : conversationData.cluster1NumUsers !== null
                                ? 2
                                : conversationData.cluster0NumUsers !== null
                                  ? 1
                                  : 1, // no cluster is 1 cluster
                probability:
                    conversationData.groupAwareConsensusProbabilityAgree,
            })
        ) {
            groupAwareConsensusAgreeOpinions.push(newOpinionTotal);
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
                isMajorityAgree({
                    numAgrees: conversationData.cluster0NumAgrees,
                    memberCount: conversationData.cluster0NumUsers,
                })
            ) {
                if ("0" in clusters) {
                    clusters["0"].majorityAgreeOpinions.push(
                        newOpinionCluster0,
                    );
                } else {
                    clusters["0"] = {
                        memberCount: conversationData.cluster0NumUsers,
                        majorityAgreeOpinions: [newOpinionCluster0],
                        majorityDisagreeOpinions: [],
                        controversialOpinions: [],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
                    };
                }
            }
            if (
                isMajorityDisagree({
                    numDisagrees: conversationData.cluster0NumDisagrees,
                    memberCount: conversationData.cluster0NumUsers,
                })
            ) {
                if ("0" in clusters) {
                    clusters["0"].majorityDisagreeOpinions.push(
                        newOpinionCluster0,
                    );
                } else {
                    clusters["0"] = {
                        memberCount: conversationData.cluster0NumUsers,
                        majorityDisagreeOpinions: [newOpinionCluster0],
                        majorityAgreeOpinions: [],
                        controversialOpinions: [],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
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
                        majorityAgreeOpinions: [],
                        majorityDisagreeOpinions: [],
                        controversialOpinions: [newOpinionCluster0],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
                    };
                }
            }
            // if (
            //     isRepresentativeAgree({
            //         clusterRepnessProbability: toUnionUndefined(
            //             conversationData.cluster0RepnessProbability,
            //         ),
            //         clusterRepnessAgreementType: toUnionUndefined(
            //             conversationData.cluster0RepnessAgreementType,
            //         ),
            //     })
            // ) {
            //     if ("0" in clusters) {
            //         clusters["0"].representativeAgreeOpinions.push(
            //             newOpinionCluster0,
            //         );
            //     } else {
            //         clusters["0"] = {
            //             memberCount: conversationData.cluster0NumUsers,
            //             majorityAgreeOpinions: [],
            //             majorityDisagreeOpinions: [],
            //             controversialOpinions: [],
            //             representativeAgreeOpinions: [newOpinionCluster0],
            //             representativeDisagreeOpinions: [],
            //         };
            //     }
            // }
            // if (
            //     isRepresentativeDisagree({
            //         clusterRepnessProbability: toUnionUndefined(
            //             conversationData.cluster0RepnessProbability,
            //         ),
            //         clusterRepnessAgreementType: toUnionUndefined(
            //             conversationData.cluster0RepnessAgreementType,
            //         ),
            //     })
            // ) {
            //     if ("0" in clusters) {
            //         clusters["0"].representativeDisagreeOpinions.push(
            //             newOpinionCluster0,
            //         );
            //     } else {
            //         clusters["0"] = {
            //             memberCount: conversationData.cluster0NumUsers,
            //             majorityAgreeOpinions: [],
            //             majorityDisagreeOpinions: [],
            //             controversialOpinions: [],
            //             representativeAgreeOpinions: [],
            //             representativeDisagreeOpinions: [newOpinionCluster0],
            //         };
            //     }
            // }
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
                isMajorityAgree({
                    numAgrees: conversationData.cluster1NumAgrees,
                    memberCount: conversationData.cluster1NumUsers,
                })
            ) {
                if ("1" in clusters) {
                    clusters["1"].majorityAgreeOpinions.push(
                        newOpinionCluster1,
                    );
                } else {
                    clusters["1"] = {
                        memberCount: conversationData.cluster1NumUsers,
                        majorityAgreeOpinions: [newOpinionCluster1],
                        majorityDisagreeOpinions: [],
                        controversialOpinions: [],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
                    };
                }
            }
            if (
                isMajorityDisagree({
                    numDisagrees: conversationData.cluster1NumDisagrees,
                    memberCount: conversationData.cluster1NumUsers,
                })
            ) {
                if ("1" in clusters) {
                    clusters["1"].majorityDisagreeOpinions.push(
                        newOpinionCluster1,
                    );
                } else {
                    clusters["1"] = {
                        memberCount: conversationData.cluster1NumUsers,
                        majorityDisagreeOpinions: [newOpinionCluster1],
                        majorityAgreeOpinions: [],
                        controversialOpinions: [],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
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
                        majorityAgreeOpinions: [],
                        majorityDisagreeOpinions: [],
                        controversialOpinions: [newOpinionCluster1],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
                    };
                }
            }
            // if (
            //     isRepresentativeAgree({
            //         clusterRepnessProbability: toUnionUndefined(
            //             conversationData.cluster1RepnessProbability,
            //         ),
            //         clusterRepnessAgreementType: toUnionUndefined(
            //             conversationData.cluster1RepnessAgreementType,
            //         ),
            //     })
            // ) {
            //     if ("1" in clusters) {
            //         clusters["1"].representativeAgreeOpinions.push(
            //             newOpinionCluster1,
            //         );
            //     } else {
            //         clusters["1"] = {
            //             memberCount: conversationData.cluster1NumUsers,
            //             majorityAgreeOpinions: [],
            //             majorityDisagreeOpinions: [],
            //             controversialOpinions: [],
            //             representativeAgreeOpinions: [newOpinionCluster1],
            //             representativeDisagreeOpinions: [],
            //         };
            //     }
            // }
            // if (
            //     isRepresentativeDisagree({
            //         clusterRepnessProbability: toUnionUndefined(
            //             conversationData.cluster1RepnessProbability,
            //         ),
            //         clusterRepnessAgreementType: toUnionUndefined(
            //             conversationData.cluster1RepnessAgreementType,
            //         ),
            //     })
            // ) {
            //     if ("1" in clusters) {
            //         clusters["1"].representativeDisagreeOpinions.push(
            //             newOpinionCluster1,
            //         );
            //     } else {
            //         clusters["1"] = {
            //             memberCount: conversationData.cluster1NumUsers,
            //             majorityAgreeOpinions: [],
            //             majorityDisagreeOpinions: [],
            //             controversialOpinions: [],
            //             representativeAgreeOpinions: [],
            //             representativeDisagreeOpinions: [newOpinionCluster1],
            //         };
            //     }
            // }
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
                isMajorityAgree({
                    numAgrees: conversationData.cluster2NumAgrees,
                    memberCount: conversationData.cluster2NumUsers,
                })
            ) {
                if ("2" in clusters) {
                    clusters["2"].majorityAgreeOpinions.push(
                        newOpinionCluster2,
                    );
                } else {
                    clusters["2"] = {
                        memberCount: conversationData.cluster2NumUsers,
                        majorityAgreeOpinions: [newOpinionCluster2],
                        majorityDisagreeOpinions: [],
                        controversialOpinions: [],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
                    };
                }
            }
            if (
                isMajorityDisagree({
                    numDisagrees: conversationData.cluster2NumDisagrees,
                    memberCount: conversationData.cluster2NumUsers,
                })
            ) {
                if ("2" in clusters) {
                    clusters["2"].majorityDisagreeOpinions.push(
                        newOpinionCluster2,
                    );
                } else {
                    clusters["2"] = {
                        memberCount: conversationData.cluster2NumUsers,
                        majorityDisagreeOpinions: [newOpinionCluster2],
                        majorityAgreeOpinions: [],
                        controversialOpinions: [],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
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
                        majorityAgreeOpinions: [],
                        majorityDisagreeOpinions: [],
                        controversialOpinions: [newOpinionCluster2],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
                    };
                }
            }
            // if (
            //     isRepresentativeAgree({
            //         clusterRepnessProbability: toUnionUndefined(
            //             conversationData.cluster2RepnessProbability,
            //         ),
            //         clusterRepnessAgreementType: toUnionUndefined(
            //             conversationData.cluster2RepnessAgreementType,
            //         ),
            //     })
            // ) {
            //     if ("2" in clusters) {
            //         clusters["2"].representativeAgreeOpinions.push(
            //             newOpinionCluster2,
            //         );
            //     } else {
            //         clusters["2"] = {
            //             memberCount: conversationData.cluster2NumUsers,
            //             majorityAgreeOpinions: [],
            //             majorityDisagreeOpinions: [],
            //             controversialOpinions: [],
            //             representativeAgreeOpinions: [newOpinionCluster2],
            //             representativeDisagreeOpinions: [],
            //         };
            //     }
            // }
            // if (
            //     isRepresentativeDisagree({
            //         clusterRepnessProbability: toUnionUndefined(
            //             conversationData.cluster2RepnessProbability,
            //         ),
            //         clusterRepnessAgreementType: toUnionUndefined(
            //             conversationData.cluster2RepnessAgreementType,
            //         ),
            //     })
            // ) {
            //     if ("2" in clusters) {
            //         clusters["2"].representativeDisagreeOpinions.push(
            //             newOpinionCluster2,
            //         );
            //     } else {
            //         clusters["2"] = {
            //             memberCount: conversationData.cluster2NumUsers,
            //             majorityAgreeOpinions: [],
            //             majorityDisagreeOpinions: [],
            //             controversialOpinions: [],
            //             representativeAgreeOpinions: [],
            //             representativeDisagreeOpinions: [newOpinionCluster2],
            //         };
            //     }
            // }
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
                isMajorityAgree({
                    numAgrees: conversationData.cluster3NumAgrees,
                    memberCount: conversationData.cluster3NumUsers,
                })
            ) {
                if ("3" in clusters) {
                    clusters["3"].majorityAgreeOpinions.push(
                        newOpinionCluster3,
                    );
                } else {
                    clusters["3"] = {
                        memberCount: conversationData.cluster3NumUsers,
                        majorityAgreeOpinions: [newOpinionCluster3],
                        majorityDisagreeOpinions: [],
                        controversialOpinions: [],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
                    };
                }
            }
            if (
                isMajorityDisagree({
                    numDisagrees: conversationData.cluster3NumDisagrees,
                    memberCount: conversationData.cluster3NumUsers,
                })
            ) {
                if ("3" in clusters) {
                    clusters["3"].majorityDisagreeOpinions.push(
                        newOpinionCluster3,
                    );
                } else {
                    clusters["3"] = {
                        memberCount: conversationData.cluster3NumUsers,
                        majorityDisagreeOpinions: [newOpinionCluster3],
                        majorityAgreeOpinions: [],
                        controversialOpinions: [],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
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
                        majorityAgreeOpinions: [],
                        majorityDisagreeOpinions: [],
                        controversialOpinions: [newOpinionCluster3],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
                    };
                }
            }
            // if (
            //     isRepresentativeAgree({
            //         clusterRepnessProbability: toUnionUndefined(
            //             conversationData.cluster3RepnessProbability,
            //         ),
            //         clusterRepnessAgreementType: toUnionUndefined(
            //             conversationData.cluster3RepnessAgreementType,
            //         ),
            //     })
            // ) {
            //     if ("3" in clusters) {
            //         clusters["3"].representativeAgreeOpinions.push(
            //             newOpinionCluster3,
            //         );
            //     } else {
            //         clusters["3"] = {
            //             memberCount: conversationData.cluster3NumUsers,
            //             majorityAgreeOpinions: [],
            //             majorityDisagreeOpinions: [],
            //             controversialOpinions: [],
            //             representativeAgreeOpinions: [newOpinionCluster3],
            //             representativeDisagreeOpinions: [],
            //         };
            //     }
            // }
            // if (
            //     isRepresentativeDisagree({
            //         clusterRepnessProbability: toUnionUndefined(
            //             conversationData.cluster3RepnessProbability,
            //         ),
            //         clusterRepnessAgreementType: toUnionUndefined(
            //             conversationData.cluster3RepnessAgreementType,
            //         ),
            //     })
            // ) {
            //     if ("3" in clusters) {
            //         clusters["3"].representativeDisagreeOpinions.push(
            //             newOpinionCluster3,
            //         );
            //     } else {
            //         clusters["3"] = {
            //             memberCount: conversationData.cluster3NumUsers,
            //             majorityAgreeOpinions: [],
            //             majorityDisagreeOpinions: [],
            //             controversialOpinions: [],
            //             representativeAgreeOpinions: [],
            //             representativeDisagreeOpinions: [newOpinionCluster3],
            //         };
            //     }
            // }
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
                isMajorityAgree({
                    numAgrees: conversationData.cluster4NumAgrees,
                    memberCount: conversationData.cluster4NumUsers,
                })
            ) {
                if ("4" in clusters) {
                    clusters["4"].majorityAgreeOpinions.push(
                        newOpinionCluster4,
                    );
                } else {
                    clusters["4"] = {
                        memberCount: conversationData.cluster4NumUsers,
                        majorityAgreeOpinions: [newOpinionCluster4],
                        majorityDisagreeOpinions: [],
                        controversialOpinions: [],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
                    };
                }
            }
            if (
                isMajorityDisagree({
                    numDisagrees: conversationData.cluster4NumDisagrees,
                    memberCount: conversationData.cluster4NumUsers,
                })
            ) {
                if ("4" in clusters) {
                    clusters["4"].majorityDisagreeOpinions.push(
                        newOpinionCluster4,
                    );
                } else {
                    clusters["4"] = {
                        memberCount: conversationData.cluster4NumUsers,
                        majorityDisagreeOpinions: [newOpinionCluster4],
                        majorityAgreeOpinions: [],
                        controversialOpinions: [],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
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
                        majorityAgreeOpinions: [],
                        majorityDisagreeOpinions: [],
                        controversialOpinions: [newOpinionCluster4],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
                    };
                }
            }
            // if (
            //     isRepresentativeAgree({
            //         clusterRepnessProbability: toUnionUndefined(
            //             conversationData.cluster4RepnessProbability,
            //         ),
            //         clusterRepnessAgreementType: toUnionUndefined(
            //             conversationData.cluster4RepnessAgreementType,
            //         ),
            //     })
            // ) {
            //     if ("4" in clusters) {
            //         clusters["4"].representativeAgreeOpinions.push(
            //             newOpinionCluster4,
            //         );
            //     } else {
            //         clusters["4"] = {
            //             memberCount: conversationData.cluster4NumUsers,
            //             majorityAgreeOpinions: [],
            //             majorityDisagreeOpinions: [],
            //             controversialOpinions: [],
            //             representativeAgreeOpinions: [newOpinionCluster4],
            //             representativeDisagreeOpinions: [],
            //         };
            //     }
            // }
            // if (
            //     isRepresentativeDisagree({
            //         clusterRepnessProbability: toUnionUndefined(
            //             conversationData.cluster4RepnessProbability,
            //         ),
            //         clusterRepnessAgreementType: toUnionUndefined(
            //             conversationData.cluster4RepnessAgreementType,
            //         ),
            //     })
            // ) {
            //     if ("4" in clusters) {
            //         clusters["4"].representativeDisagreeOpinions.push(
            //             newOpinionCluster4,
            //         );
            //     } else {
            //         clusters["4"] = {
            //             memberCount: conversationData.cluster4NumUsers,
            //             majorityAgreeOpinions: [],
            //             majorityDisagreeOpinions: [],
            //             controversialOpinions: [],
            //             representativeAgreeOpinions: [],
            //             representativeDisagreeOpinions: [newOpinionCluster4],
            //         };
            //     }
            // }
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
                isMajorityAgree({
                    numAgrees: conversationData.cluster5NumAgrees,
                    memberCount: conversationData.cluster5NumUsers,
                })
            ) {
                if ("5" in clusters) {
                    clusters["5"].majorityAgreeOpinions.push(
                        newOpinionCluster5,
                    );
                } else {
                    clusters["5"] = {
                        memberCount: conversationData.cluster5NumUsers,
                        majorityAgreeOpinions: [newOpinionCluster5],
                        majorityDisagreeOpinions: [],
                        controversialOpinions: [],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
                    };
                }
            }
            if (
                isMajorityDisagree({
                    numDisagrees: conversationData.cluster5NumDisagrees,
                    memberCount: conversationData.cluster5NumUsers,
                })
            ) {
                if ("5" in clusters) {
                    clusters["5"].majorityDisagreeOpinions.push(
                        newOpinionCluster5,
                    );
                } else {
                    clusters["5"] = {
                        memberCount: conversationData.cluster5NumUsers,
                        majorityDisagreeOpinions: [newOpinionCluster5],
                        majorityAgreeOpinions: [],
                        controversialOpinions: [],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
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
                        majorityAgreeOpinions: [],
                        majorityDisagreeOpinions: [],
                        controversialOpinions: [newOpinionCluster5],
                        representativeAgreeOpinions: [],
                        representativeDisagreeOpinions: [],
                    };
                }
            }
            // if (
            //     isRepresentativeAgree({
            //         clusterRepnessProbability: toUnionUndefined(
            //             conversationData.cluster5RepnessProbability,
            //         ),
            //         clusterRepnessAgreementType: toUnionUndefined(
            //             conversationData.cluster5RepnessAgreementType,
            //         ),
            //     })
            // ) {
            //     if ("5" in clusters) {
            //         clusters["5"].representativeAgreeOpinions.push(
            //             newOpinionCluster5,
            //         );
            //     } else {
            //         clusters["5"] = {
            //             memberCount: conversationData.cluster5NumUsers,
            //             majorityAgreeOpinions: [],
            //             majorityDisagreeOpinions: [],
            //             controversialOpinions: [],
            //             representativeAgreeOpinions: [newOpinionCluster5],
            //             representativeDisagreeOpinions: [],
            //         };
            //     }
            // }
            // if (
            //     isRepresentativeDisagree({
            //         clusterRepnessProbability: toUnionUndefined(
            //             conversationData.cluster5RepnessProbability,
            //         ),
            //         clusterRepnessAgreementType: toUnionUndefined(
            //             conversationData.cluster5RepnessAgreementType,
            //         ),
            //     })
            // ) {
            //     if ("5" in clusters) {
            //         clusters["5"].representativeDisagreeOpinions.push(
            //             newOpinionCluster5,
            //         );
            //     } else {
            //         clusters["5"] = {
            //             memberCount: conversationData.cluster5NumUsers,
            //             majorityAgreeOpinions: [],
            //             majorityDisagreeOpinions: [],
            //             controversialOpinions: [],
            //             representativeAgreeOpinions: [],
            //             representativeDisagreeOpinions: [newOpinionCluster5],
            //         };
            //     }
            // }
        }
    }
    return {
        majorityAgreeOpinions,
        majorityDisagreeOpinions,
        controversialOpinions,
        groupAwareConsensusAgreeOpinions,
        clusters,
    };
}
