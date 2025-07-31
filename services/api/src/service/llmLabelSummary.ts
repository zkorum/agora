import { log } from "@/app.js";
import {
    conversationContentTable,
    conversationTable,
    polisClusterTable,
    polisContentTable,
} from "@/schema.js";
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
    BedrockRuntimeClient,
    ConverseCommand,
    type Message,
} from "@aws-sdk/client-bedrock-runtime";
import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { type JSONObject } from "extract-first-json";
import * as commentService from "./comment.js";

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

interface ClusterInsights {
    representativeAgreeOpinions: string[];
    representativeDisagreeOpinions: string[];
}

interface ConversationInsights {
    conversationTitle: string;
    conversationBody?: string;
    majorityOpinions: string[];
    controversialOpinions: string[];
    groupAwareConsensusAgreeOpinions: string[];
    clusters: Record<string, ClusterInsights>;
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
    const userPrompt = JSON.stringify(conversationInsights);
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
    const { conversationTitle, conversationBody } = conversationDataResults[0];
    const coreOpinions = await getCoreOpinions({
        db,
        conversationId,
    });
    return {
        conversationTitle,
        conversationBody: toUnionUndefined(conversationBody),
        ...coreOpinions,
    };
}

interface CoreOpinions {
    majorityOpinions: string[];
    controversialOpinions: string[];
    groupAwareConsensusAgreeOpinions: string[];
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
    const majorityOpinions = await commentService.fetchOpinionsByPostId({
        db,
        postId: conversationId,
        filterTarget: "majority",
        limit: 5,
    });
    const controversialOpinions = await commentService.fetchOpinionsByPostId({
        db,
        postId: conversationId,
        filterTarget: "controversial",
        limit: 5,
    });
    const groupAwareConsensusOpinions =
        await commentService.fetchOpinionsByPostId({
            db,
            postId: conversationId,
            filterTarget: "group-aware-consensus",
            limit: 5,
        });
    const cluster0Opinions = await commentService.fetchOpinionsByPostId({
        db,
        postId: conversationId,
        filterTarget: "representative",
        clusterKey: "0",
        limit: 5,
    });
    const cluster1Opinions = await commentService.fetchOpinionsByPostId({
        db,
        postId: conversationId,
        filterTarget: "representative",
        clusterKey: "1",
        limit: 5,
    });
    const cluster2Opinions = await commentService.fetchOpinionsByPostId({
        db,
        postId: conversationId,
        filterTarget: "representative",
        clusterKey: "2",
        limit: 5,
    });
    const cluster3Opinions = await commentService.fetchOpinionsByPostId({
        db,
        postId: conversationId,
        filterTarget: "representative",
        clusterKey: "3",
        limit: 5,
    });
    const cluster4Opinions = await commentService.fetchOpinionsByPostId({
        db,
        postId: conversationId,
        filterTarget: "representative",
        clusterKey: "4",
        limit: 5,
    });
    const cluster5Opinions = await commentService.fetchOpinionsByPostId({
        db,
        postId: conversationId,
        filterTarget: "representative",
        clusterKey: "5",
        limit: 5,
    });

    const majorityOpinionInsights: string[] = Array.from(
        majorityOpinions.values(),
    ).map((opinion) => opinion.opinion);
    const controversialOpinionInsights: string[] = Array.from(
        controversialOpinions.values(),
    ).map((opinion) => opinion.opinion);
    const groupAwareConsensusAgreeOpinionInsights: string[] = Array.from(
        groupAwareConsensusOpinions.values(),
    ).map((opinion) => opinion.opinion);
    const clusters: Record<string, ClusterInsights> = {};
    if (cluster0Opinions.size !== 0) {
        const cluster0ArrayOpinions = Array.from(cluster0Opinions.values());
        const representativeOpinionsForCluster0 = cluster0ArrayOpinions.map(
            (opinion) => {
                const clusterStat = opinion.clustersStats.find(
                    (stat) => stat.key === "0",
                );
                if (clusterStat?.repfulFor === undefined) {
                    throw new Error(
                        `[LLM] Representative opinion opinionSlugId=${opinion.opinionSlugId} has no corresponding stat or the stat has not repful data for cluster 0: clusterStat=${JSON.stringify(clusterStat)}`,
                    );
                }
                return {
                    opinion: opinion.opinion,
                    repfulFor: clusterStat.repfulFor,
                };
            },
        );
        clusters["0"] = {
            representativeAgreeOpinions: representativeOpinionsForCluster0
                .filter((opinion) => opinion.repfulFor === "agree")
                .map((opinion) => opinion.opinion),
            representativeDisagreeOpinions: representativeOpinionsForCluster0
                .filter((opinion) => opinion.repfulFor === "disagree")
                .map((opinion) => opinion.opinion),
        };
    }
    if (cluster1Opinions.size !== 0) {
        const cluster1ArrayOpinions = Array.from(cluster1Opinions.values());
        const representativeOpinionsForCluster1 = cluster1ArrayOpinions.map(
            (opinion) => {
                const clusterStat = opinion.clustersStats.find(
                    (stat) => stat.key === "1",
                );
                if (clusterStat?.repfulFor === undefined) {
                    throw new Error(
                        `[LLM] Representative opinion opinionSlugId=${opinion.opinionSlugId} has no corresponding stat or the stat has not repful data for cluster 1: clusterStat=${JSON.stringify(clusterStat)}`,
                    );
                }
                return {
                    opinion: opinion.opinion,
                    repfulFor: clusterStat.repfulFor,
                };
            },
        );
        clusters["1"] = {
            representativeAgreeOpinions: representativeOpinionsForCluster1
                .filter((opinion) => opinion.repfulFor === "agree")
                .map((opinion) => opinion.opinion),
            representativeDisagreeOpinions: representativeOpinionsForCluster1
                .filter((opinion) => opinion.repfulFor === "disagree")
                .map((opinion) => opinion.opinion),
        };
    }
    if (cluster2Opinions.size !== 0) {
        const cluster2ArrayOpinions = Array.from(cluster2Opinions.values());
        const representativeOpinionsForCluster2 = cluster2ArrayOpinions.map(
            (opinion) => {
                const clusterStat = opinion.clustersStats.find(
                    (stat) => stat.key === "2",
                );
                if (clusterStat?.repfulFor === undefined) {
                    throw new Error(
                        `[LLM] Representative opinion opinionSlugId=${opinion.opinionSlugId} has no corresponding stat or the stat has not repful data for cluster 2: clusterStat=${JSON.stringify(clusterStat)}`,
                    );
                }
                return {
                    opinion: opinion.opinion,
                    repfulFor: clusterStat.repfulFor,
                };
            },
        );
        clusters["2"] = {
            representativeAgreeOpinions: representativeOpinionsForCluster2
                .filter((opinion) => opinion.repfulFor === "agree")
                .map((opinion) => opinion.opinion),
            representativeDisagreeOpinions: representativeOpinionsForCluster2
                .filter((opinion) => opinion.repfulFor === "disagree")
                .map((opinion) => opinion.opinion),
        };
    }
    if (cluster3Opinions.size !== 0) {
        const cluster3ArrayOpinions = Array.from(cluster3Opinions.values());
        const representativeOpinionsForCluster3 = cluster3ArrayOpinions.map(
            (opinion) => {
                const clusterStat = opinion.clustersStats.find(
                    (stat) => stat.key === "3",
                );
                if (clusterStat?.repfulFor === undefined) {
                    throw new Error(
                        `[LLM] Representative opinion opinionSlugId=${opinion.opinionSlugId} has no corresponding stat or the stat has not repful data for cluster 3: clusterStat=${JSON.stringify(clusterStat)}`,
                    );
                }
                return {
                    opinion: opinion.opinion,
                    repfulFor: clusterStat.repfulFor,
                };
            },
        );
        clusters["3"] = {
            representativeAgreeOpinions: representativeOpinionsForCluster3
                .filter((opinion) => opinion.repfulFor === "agree")
                .map((opinion) => opinion.opinion),
            representativeDisagreeOpinions: representativeOpinionsForCluster3
                .filter((opinion) => opinion.repfulFor === "disagree")
                .map((opinion) => opinion.opinion),
        };
    }
    if (cluster4Opinions.size !== 0) {
        const cluster4ArrayOpinions = Array.from(cluster4Opinions.values());
        const representativeOpinionsForCluster4 = cluster4ArrayOpinions.map(
            (opinion) => {
                const clusterStat = opinion.clustersStats.find(
                    (stat) => stat.key === "4",
                );
                if (clusterStat?.repfulFor === undefined) {
                    throw new Error(
                        `[LLM] Representative opinion opinionSlugId=${opinion.opinionSlugId} has no corresponding stat or the stat has not repful data for cluster 4: clusterStat=${JSON.stringify(clusterStat)}`,
                    );
                }
                return {
                    opinion: opinion.opinion,
                    repfulFor: clusterStat.repfulFor,
                };
            },
        );
        clusters["4"] = {
            representativeAgreeOpinions: representativeOpinionsForCluster4
                .filter((opinion) => opinion.repfulFor === "agree")
                .map((opinion) => opinion.opinion),
            representativeDisagreeOpinions: representativeOpinionsForCluster4
                .filter((opinion) => opinion.repfulFor === "disagree")
                .map((opinion) => opinion.opinion),
        };
    }
    if (cluster5Opinions.size !== 0) {
        const cluster5ArrayOpinions = Array.from(cluster5Opinions.values());
        const representativeOpinionsForCluster5 = cluster5ArrayOpinions.map(
            (opinion) => {
                const clusterStat = opinion.clustersStats.find(
                    (stat) => stat.key === "5",
                );
                if (clusterStat?.repfulFor === undefined) {
                    throw new Error(
                        `[LLM] Representative opinion opinionSlugId=${opinion.opinionSlugId} has no corresponding stat or the stat has not repful data for cluster 5: clusterStat=${JSON.stringify(clusterStat)}`,
                    );
                }
                return {
                    opinion: opinion.opinion,
                    repfulFor: clusterStat.repfulFor,
                };
            },
        );
        clusters["5"] = {
            representativeAgreeOpinions: representativeOpinionsForCluster5
                .filter((opinion) => opinion.repfulFor === "agree")
                .map((opinion) => opinion.opinion),
            representativeDisagreeOpinions: representativeOpinionsForCluster5
                .filter((opinion) => opinion.repfulFor === "disagree")
                .map((opinion) => opinion.opinion),
        };
    }
    return {
        majorityOpinions: majorityOpinionInsights,
        controversialOpinions: controversialOpinionInsights,
        groupAwareConsensusAgreeOpinions:
            groupAwareConsensusAgreeOpinionInsights,
        clusters,
    };
}
