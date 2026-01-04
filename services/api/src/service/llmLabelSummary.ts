import { log } from "@/app.js";
import {
    conversationTable,
    polisClusterTable,
    polisContentTable,
} from "@/shared-backend/schema.js";
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
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { type JSONObject } from "extract-first-json";
import * as commentService from "./comment.js";

interface UpdateAiLabelsAndSummariesProps {
    db: PostgresJsDatabase;
    conversationId: number;
    polisContentId: number;
    conversationInsightsWithOpinionIds: ConversationInsightsWithOpinionIds;
    awsAiLabelSummaryRegion: string;
    awsAiLabelSummaryModelId: string;
    awsAiLabelSummaryTemperature: string;
    awsAiLabelSummaryTopP: string;
    awsAiLabelSummaryMaxTokens: string;
    awsAiLabelSummaryPrompt: string;
}

export interface ClusterInsights {
    agreesWith: string[];
    disagreesWith: string[];
}

export interface ClusterInsightsWithOpinionIds {
    agreesWith: number[];
    disagreesWith: number[];
}

export interface ConversationInsights {
    conversationTitle: string;
    conversationBody?: string;
    clusters: Record<string, ClusterInsights>;
}

export interface ConversationInsightsWithOpinionIds {
    conversationTitle: string;
    conversationBody?: string;
    clusters: Record<string, ClusterInsightsWithOpinionIds>;
}

async function getConversationInsightsFrom({
    db,
    conversationInsightsWithOpinionIds,
}: {
    db: PostgresJsDatabase;
    conversationInsightsWithOpinionIds: ConversationInsightsWithOpinionIds;
}): Promise<ConversationInsights> {
    const opinionIds = new Set<number>();
    const clusterInsightsWithOpinionIdsPerCluster =
        conversationInsightsWithOpinionIds.clusters;
    for (const clusterInsightsWithOpinionIds of Object.values(
        clusterInsightsWithOpinionIdsPerCluster,
    )) {
        for (const opinionId of clusterInsightsWithOpinionIds.agreesWith) {
            opinionIds.add(opinionId);
        }
        for (const opinionId of clusterInsightsWithOpinionIds.disagreesWith) {
            opinionIds.add(opinionId);
        }
    }
    const opinionContentsByIds = await commentService.getOpinionContentsFromIds(
        {
            db,
            opinionIds: Array.from(opinionIds),
        },
    );
    const clusters: Record<string, ClusterInsights> = {};
    for (const [polisKey, clusterInsightsWithOpinionIds] of Object.entries(
        conversationInsightsWithOpinionIds.clusters,
    )) {
        clusters[polisKey] = {
            agreesWith: clusterInsightsWithOpinionIds.agreesWith.map(
                (opinionId) => opinionContentsByIds[opinionId],
            ),
            disagreesWith: clusterInsightsWithOpinionIds.disagreesWith.map(
                (opinionId) => opinionContentsByIds[opinionId],
            ),
        };
    }
    return {
        ...conversationInsightsWithOpinionIds,
        clusters: clusters,
    };
}

export async function updateAiLabelsAndSummaries({
    db,
    conversationId,
    polisContentId,
    conversationInsightsWithOpinionIds,
    awsAiLabelSummaryRegion,
    awsAiLabelSummaryModelId,
    awsAiLabelSummaryTemperature,
    awsAiLabelSummaryTopP,
    awsAiLabelSummaryMaxTokens,
    awsAiLabelSummaryPrompt,
}: UpdateAiLabelsAndSummariesProps): Promise<void> {
    const conversationInsights = await getConversationInsightsFrom({
        db,
        conversationInsightsWithOpinionIds,
    });
    log.info(
        `[Repness] conversationInsights for conversationId='${String(
            conversationId,
        )}' and for polisContentId='${String(polisContentId)}', conversationInsights=${JSON.stringify(conversationInsights)}}`,
    );

    const genLabelSummaryOutput = await invokeRemoteModel({
        conversationId,
        polisContentId,
        conversationInsights,
        awsAiLabelSummaryRegion,
        awsAiLabelSummaryModelId,
        awsAiLabelSummaryTemperature,
        awsAiLabelSummaryTopP,
        awsAiLabelSummaryMaxTokens,
        awsAiLabelSummaryPrompt,
    });
    log.info(
        `[LLM] Received Label and Summary Prompt results for conversationId='${String(
            conversationId,
        )}' and polisContentId='${String(polisContentId)}': ${JSON.stringify(genLabelSummaryOutput)}`,
    );
    await updateClustersLabelsAndSummaries({
        db,
        conversationId,
        polisContentId,
        aiClustersLabelsAndSummaries: genLabelSummaryOutput.clusters,
    });
}

interface UpdateClustersLabelsAndSummariesProps {
    db: PostgresJsDatabase;
    conversationId: number;
    polisContentId: number;
    aiClustersLabelsAndSummaries:
        | GenLabelSummaryOutputClusterStrict
        | GenLabelSummaryOutputClusterLoose;
}

async function updateClustersLabelsAndSummaries({
    db,
    conversationId,
    polisContentId,
    aiClustersLabelsAndSummaries,
}: UpdateClustersLabelsAndSummariesProps): Promise<void> {
    for (const key of Object.keys(
        aiClustersLabelsAndSummaries,
    ) as (keyof typeof aiClustersLabelsAndSummaries)[] /* necessary otherwise the fine-grained type of `key` is lost */) {
        const aiClusterLabelAndSummary = aiClustersLabelsAndSummaries[key];
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
            AND "p"."id" = ${polisContentId}
            AND "pc"."polis_content_id" = "p"."id";
        `);
    }
}

interface InvokeRemoteModelProps {
    conversationId: number;
    polisContentId: number;
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
    polisContentId,
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
        `[LLM] Sending Generate Label and Summary Prompt for conversationId='${String(
            conversationId,
        )}' and polisContentId='${String(polisContentId)}':\n${userPrompt}`,
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
            `[LLM]: Unable to parse AWS Bedrock response for conversationId='${String(
                conversationId,
            )}' and polisContentId='${String(polisContentId)}': '${JSON.stringify(
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
            `[LLM]: Unable to parse AI Label and Summary output object using strict mode for conversationId='${String(
                conversationId,
            )}' and polisContentId='${String(polisContentId)}:\n'${JSON.stringify(
                modelResponse,
            )}'`,
        );
    }
    // will throw and be caught by the generic fastify handler eventually
    const resultLoose = zodGenLabelSummaryOutputLoose.safeParse(modelResponse);
    if (!resultLoose.success) {
        throw new Error(
            `[LLM]: Unable to parse AI Label and Summary output object using loose mode for conversationId='${String(
                conversationId,
            )}' and polisContentId='${String(polisContentId)}:\n'${JSON.stringify(
                modelResponse,
            )}'`,
            { cause: resultLoose.error },
        );
    }
    return resultLoose.data;
}
