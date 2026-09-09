import "fast-text-encoding";

import { sleep } from "k6";
import execution from "k6/execution";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";
import type { Options } from "k6/options";
import { z } from "zod";
import {
    buildAuthorizationHeader,
    buildUcan,
    createDidIfDoesNotExist,
    deleteDid,
} from "./crypto/ucan/operation.js";
import { Dto, type MaxDiffSaveRequest } from "./shared/types/dto.js";
import { recordMaxDiffVote, restoreMaxDiff } from "./shared/utils/maxdiff.js";
import { logLoadEvent } from "./utils/semanticLog.js";
import {
    buildSolidagoScenarios,
    chooseComparison,
    parseSolidagoConfig,
} from "./utils/solidagoWorkload.js";

const config = parseSolidagoConfig(__ENV);
const requestSuccess = new Rate("ranking_request_success");
const requestDuration = new Trend("ranking_request_duration", true);
const usersCompleted = new Counter("ranking_users_completed");
const userSuccess = new Rate("ranking_user_success");
const comparisonsSaved = new Counter("ranking_comparisons_saved");
const historyLength = new Trend("ranking_history_length");

export const options: Options = {
    scenarios: buildSolidagoScenarios(config),
    thresholds: {
        http_req_failed: ["rate<0.05"],
        ranking_request_success: ["rate>0.95"],
        "ranking_request_duration{operation:save}": ["p(95)<5000"],
        ...Object.fromEntries(
            config.conversations.flatMap((slug) => [
                [
                    `ranking_users_completed{conversation:${slug}}`,
                    [`count==${String(config.usersPerConversation)}`],
                ],
                [`ranking_user_success{conversation:${slug}}`, ["rate>0.95"]],
                [
                    `ranking_request_success{conversation:${slug}}`,
                    ["rate>0.95"],
                ],
                [
                    `ranking_request_duration{conversation:${slug},operation:save}`,
                    ["p(95)<5000"],
                ],
            ]),
        ),
    },
    setupTimeout: "10m",
    teardownTimeout: `${String(config.cooldownSeconds + config.conversations.length * 35 + 30)}s`,
};

type Credentials = Awaited<ReturnType<typeof createDidIfDoesNotExist>>;
type RequestContext = { conversationSlugId: string } & (
    | { phase: "participation"; credentials: Credentials; userId: string }
    | { phase: "setup" | "teardown"; credentials: undefined; userId: undefined }
);

// Reuse the canonical DTOs, including business failures returned with HTTP 200.
const successfulSave = Dto.maxdiffSaveResponse.transform(
    (response, context) => {
        if (!response.success) {
            context.addIssue({ code: "custom", message: response.reason });
            return z.NEVER;
        }
        return response;
    },
);

async function request<T>({
    context,
    operation,
    pathname,
    body,
    schema,
}: {
    context: RequestContext;
    operation: "metadata" | "items" | "load" | "save" | "results";
    pathname: string;
    body: object;
    schema: z.ZodType<T>;
}): Promise<{ data: T; responseTimeMs: number }> {
    const tags = {
        conversation: context.conversationSlugId,
        operation,
        phase: context.phase,
    };
    let responseTimeMs = 0;
    let status = 0;
    let errorMessage = "Unable to sign request";
    try {
        const authorization =
            context.credentials === undefined
                ? {}
                : buildAuthorizationHeader(
                      await buildUcan({
                          ...context.credentials,
                          pathname,
                          method: "POST",
                          backendDid: config.backendDid,
                      }),
                  );
        errorMessage = "HTTP request failed";
        const response = http.post(
            `${config.apiBaseUrl}${pathname}`,
            JSON.stringify(body),
            {
                headers: {
                    "Content-Type": "application/json",
                    ...authorization,
                },
                tags,
                timeout: "30s",
                redirects: 0,
            },
        );
        responseTimeMs = response.timings.duration;
        status = response.status;
        requestDuration.add(responseTimeMs, tags);
        if (status !== 200) {
            errorMessage = `HTTP ${String(status)} (transport code ${String(response.error_code)})`;
            throw new Error(errorMessage);
        }
        errorMessage = "Invalid JSON response";
        const parsed = schema.safeParse(response.json());
        if (!parsed.success) {
            errorMessage = parsed.error.issues
                .map((issue) =>
                    operation === "save" && issue.code === "custom"
                        ? `Participation blocked: ${issue.message}`
                        : `Invalid response: ${issue.code} at ${issue.path.join(".")}`,
                )
                .join("; ");
            throw new Error(errorMessage);
        }
        requestSuccess.add(true, tags);
        return { data: parsed.data, responseTimeMs };
    } catch {
        requestSuccess.add(false, tags);
        logLoadEvent({
            scenario: "solidago-ranking",
            phase: context.phase,
            action: operation,
            outcome: "failure",
            conversationSlugId: context.conversationSlugId,
            userId: context.userId,
            responseTimeMs,
            error: errorMessage,
            metadata: { status },
        });
        throw new Error(errorMessage);
    }
}

export async function setup(): Promise<void> {
    logLoadEvent({
        scenario: "solidago-ranking",
        phase: "setup",
        action: "scenario_configured",
        outcome: "info",
        count: config.conversations.length,
        metadata: {
            apiBaseUrl: config.apiBaseUrl,
            backendDid: config.backendDid,
            conversations: config.conversations.join(","),
            usersPerConversation: config.usersPerConversation,
            vusPerConversation: config.vusPerConversation,
            comparisonsPerUser: config.comparisonsPerUser,
            totalUsers:
                config.conversations.length * config.usersPerConversation,
            totalVus: config.conversations.length * config.vusPerConversation,
            thinkTimeSeconds: config.thinkTimeSeconds,
            cooldownSeconds: config.cooldownSeconds,
            maxDurationSeconds: config.maxDurationSeconds,
        },
    });
    for (const conversationSlugId of config.conversations) {
        const context: RequestContext = {
            conversationSlugId,
            credentials: undefined,
            userId: undefined,
            phase: "setup",
        };
        try {
            const { data: conversation } = await request({
                context,
                operation: "metadata",
                pathname: "/api/v1/conversation/get",
                body: { conversationSlugId },
                schema: Dto.getConversationResponse,
            });
            if (conversation.status !== "ready") {
                throw new Error("Conversation is not ready");
            }
            const { metadata, interaction } = conversation.conversationData;
            if (
                metadata.conversationType !== "ranking" ||
                metadata.participationMode !== "guest" ||
                metadata.requiresEventTicket !== undefined ||
                metadata.isClosed ||
                metadata.moderation.status !== "unmoderated" ||
                (interaction.surveyGate?.hasSurvey === true &&
                    !interaction.surveyGate.isOptional)
            ) {
                throw new Error(
                    "Use an open, unmoderated guest BWS ranking conversation without ticket or required survey gates",
                );
            }
            const {
                data: { items },
            } = await request({
                context,
                operation: "items",
                pathname: "/api/v1/ranking/bws/items/fetch",
                body: { conversationSlugId, lifecycleFilter: "active" },
                schema: Dto.maxdiffItemsFetchResponse,
            });
            if (items.length < 4) {
                throw new Error(
                    "Each ranking fixture needs at least four active items",
                );
            }
            // Also establish the pre-run result state, without treating old scores as fresh computation.
            await observeResults(context);
            logLoadEvent({
                scenario: "solidago-ranking",
                phase: "setup",
                action: "fixture_ready",
                outcome: "success",
                conversationSlugId,
                count: items.length,
            });
        } catch (error) {
            logLoadEvent({
                scenario: "solidago-ranking",
                phase: "setup",
                action: "fixture_ready",
                outcome: "failure",
                conversationSlugId,
                error: String(error),
            });
            throw error;
        }
    }
}

export default async function rankingParticipant(): Promise<void> {
    const conversationSlugId = z
        .string()
        .parse(__ENV.RANKING_CONVERSATION_SLUG_ID);
    const iterationIndex = execution.scenario.iterationInTest;
    const userId = `${execution.scenario.name}:${String(iterationIndex)}`;
    const tags = { conversation: conversationSlugId };
    // Seed the counter even when no participant finishes, so its threshold still fails.
    usersCompleted.add(0, tags);
    let savedCount = 0;
    let failureMessage = "Unable to initialize participant credentials";
    try {
        const credentials = await createDidIfDoesNotExist(userId);
        const context: RequestContext = {
            conversationSlugId,
            credentials,
            userId,
            phase: "participation",
        };
        logLoadEvent({
            scenario: "solidago-ranking",
            phase: "participation",
            action: "user_started",
            outcome: "start",
            conversationSlugId,
            userId,
            iterationIndex,
        });
        failureMessage =
            "Participant flow failed; inspect the preceding request failure event";
        const {
            data: { items },
        } = await request({
            context,
            operation: "items",
            pathname: "/api/v1/ranking/bws/items/fetch",
            body: { conversationSlugId, lifecycleFilter: "active" },
            schema: Dto.maxdiffItemsFetchResponse,
        });
        const itemSlugIds = items.map((item) => item.slugId);
        const activeItems = new Set(itemSlugIds);
        const { data: loaded } = await request({
            context,
            operation: "load",
            pathname: "/api/v1/ranking/bws/load",
            body: { conversationSlugId },
            schema: Dto.maxdiffLoadResponse,
        });
        let candidateSets = loaded.candidateSets;
        const instance = restoreMaxDiff({
            items: itemSlugIds,
            comparisons: loaded.comparisons ?? [],
        });
        if (candidateSets.length === 0) {
            failureMessage =
                "Fresh participant received no candidate sets; check that fixture items remain active";
            throw new Error(failureMessage);
        }
        for (
            let index = 0;
            index < config.comparisonsPerUser && !instance.complete;
            index++
        ) {
            const candidateSet = candidateSets.at(0);
            if (
                candidateSet === undefined ||
                candidateSet.some((item) => !activeItems.has(item))
            ) {
                failureMessage =
                    "Server candidates do not match the participant's active items; keep fixtures unchanged during load";
                throw new Error(failureMessage);
            }
            failureMessage = "Invalid server candidate set";
            const comparison = chooseComparison({
                candidateSet,
                preferenceGroup: iterationIndex % 4,
            });
            recordMaxDiffVote({
                instance,
                candidates: comparison.set,
                best: comparison.best,
                worst: comparison.worst,
            });
            const comparisons = instance.exportState().comparisons;
            if (config.thinkTimeSeconds > 0) sleep(config.thinkTimeSeconds);
            failureMessage =
                "Participant flow failed; inspect the preceding request failure event";
            const { data: saved, responseTimeMs } = await request({
                context,
                operation: "save",
                pathname: "/api/v1/ranking/bws/save",
                body: {
                    conversationSlugId,
                    ranking: instance.result ?? null,
                    comparisons,
                    isComplete: instance.complete,
                } satisfies MaxDiffSaveRequest,
                schema: successfulSave,
            });
            candidateSets = saved.candidateSets;
            savedCount++;
            comparisonsSaved.add(1, tags);
            historyLength.add(comparisons.length, tags);
            logLoadEvent({
                scenario: "solidago-ranking",
                phase: "participation",
                action: "comparison_saved",
                outcome: "success",
                conversationSlugId,
                userId,
                iterationIndex,
                count: savedCount,
                responseTimeMs,
                metadata: {
                    historyLength: comparisons.length,
                    preferenceGroup: iterationIndex % 4,
                    rankingComplete: instance.complete,
                },
            });
        }
        if (instance.complete !== (candidateSets.length === 0)) {
            failureMessage =
                "Client and server disagree on ranking completion; keep fixtures unchanged during load";
            throw new Error(failureMessage);
        }
        const rankingComplete = instance.complete;
        await observeResults(context);
        usersCompleted.add(1, tags);
        userSuccess.add(true, tags);
        logLoadEvent({
            scenario: "solidago-ranking",
            phase: "participation",
            action: "user_completed",
            outcome: "complete",
            conversationSlugId,
            userId,
            iterationIndex,
            count: savedCount,
            metadata: {
                stopReason: rankingComplete
                    ? "ranking_complete"
                    : "comparison_budget",
                rankingComplete,
            },
        });
    } catch {
        userSuccess.add(false, tags);
        logLoadEvent({
            scenario: "solidago-ranking",
            phase: "participation",
            action: "user_failed",
            outcome: "failure",
            conversationSlugId,
            userId,
            iterationIndex,
            count: savedCount,
            error: failureMessage,
        });
    } finally {
        // k6 isolates each VU's store; an iteration owns all keys in this store.
        await deleteDid();
    }
}

async function observeResults(context: RequestContext): Promise<void> {
    const {
        data: { rankings },
        responseTimeMs,
    } = await request({
        context,
        operation: "results",
        pathname: "/api/v1/ranking/bws/results",
        body: {
            conversationSlugId: context.conversationSlugId,
            lifecycleFilter: "active",
        },
        schema: Dto.maxdiffResultsResponse,
    });
    let scoredItems = 0;
    let maxParticipantCount = 0;
    for (const item of rankings) {
        if (item.score !== null) scoredItems++;
        maxParticipantCount = Math.max(
            maxParticipantCount,
            item.participantCount,
        );
    }
    logLoadEvent({
        scenario: "solidago-ranking",
        phase: context.phase,
        action: "results_observed",
        outcome: "info",
        conversationSlugId: context.conversationSlugId,
        userId: context.userId,
        count: rankings.length,
        responseTimeMs,
        metadata: {
            scoredItems,
            maxParticipantCount,
            scoringFreshnessVerified: false,
        },
    });
}

export async function teardown(): Promise<void> {
    logLoadEvent({
        scenario: "solidago-ranking",
        phase: "teardown",
        action: "scoring_cooldown",
        outcome: "start",
        metadata: { seconds: config.cooldownSeconds },
    });
    if (config.cooldownSeconds > 0) sleep(config.cooldownSeconds);
    for (const conversationSlugId of config.conversations) {
        try {
            await observeResults({
                conversationSlugId,
                credentials: undefined,
                userId: undefined,
                phase: "teardown",
            });
        } catch {
            // request() records the failure; still observe the remaining conversations.
        }
    }
    logLoadEvent({
        scenario: "solidago-ranking",
        phase: "teardown",
        action: "scenario_finished",
        outcome: "complete",
        metadata: { cleanupPerformed: false, scoringFreshnessVerified: false },
    });
}
