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
import {
    Dto,
    type MaxDiffSaveRequest,
    type MaxDiffResultItem,
} from "./shared/types/dto.js";
import { recordMaxDiffVote, restoreMaxDiff } from "./shared/utils/maxdiff.js";
import { logLoadEvent } from "./utils/semanticLog.js";
import {
    buildSolidagoScenarios,
    parseSolidagoConfig,
} from "./utils/solidagoWorkload.js";
import {
    createRankingVoter,
    comparisonBudget,
    preferenceGroup,
    evaluateRanking,
} from "./utils/rankingStrategies.js";

const config = parseSolidagoConfig(__ENV);
const requestSuccess = new Rate("ranking_request_success");
const requestDuration = new Trend("ranking_request_duration", true);
const usersCompleted = new Counter("ranking_users_completed");
const userSuccess = new Rate("ranking_user_success");
const comparisonsSaved = new Counter("ranking_comparisons_saved");
const historyLength = new Trend("ranking_history_length");
const signingDuration = new Trend("ranking_signing_duration", true);
const clientComputeDuration = new Trend(
    "ranking_client_compute_duration",
    true,
);
const requestTotalDuration = new Trend("ranking_request_total_duration", true);
const payloadBytes = new Trend("ranking_request_payload_bytes");
const usersStarted = new Counter("ranking_users_started");

export const options: Options = {
    summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
    scenarios: buildSolidagoScenarios(config),
    thresholds: {
        http_req_failed: ["rate<0.05"],
        ranking_request_success: ["rate>0.95"],
        "ranking_request_duration{operation:save}": ["p(95)<5000"],
        ...(config.workloadMode === "arrival-rate"
            ? { dropped_iterations: ["count==0"] }
            : {}),
        ...Object.fromEntries(
            config.conversations.flatMap((slug) => [
                [
                    `ranking_users_completed{conversation:${slug}}`,
                    [
                        config.workloadMode === "iterations"
                            ? `count==${String(config.usersPerConversation)}`
                            : "count>0",
                    ],
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
    const totalStarted = Date.now();
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
        const signMs = Date.now() - totalStarted;
        signingDuration.add(signMs, tags);
        const payload = JSON.stringify(body);
        const bytes = new TextEncoder().encode(payload).length;
        payloadBytes.add(bytes, tags);
        errorMessage = "HTTP request failed";
        const response = http.post(`${config.apiBaseUrl}${pathname}`, payload, {
            headers: {
                "Content-Type": "application/json",
                ...authorization,
            },
            tags,
            timeout: "30s",
            redirects: 0,
        });
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
        logLoadEvent({
            scenario: "solidago-ranking",
            phase: context.phase,
            action: "request_completed",
            outcome: "success",
            conversationSlugId: context.conversationSlugId,
            responseTimeMs,
            metadata: {
                operation,
                signingMs: signMs,
                payloadBytes: bytes,
                blockedMs: response.timings.blocked,
                waitingMs: response.timings.waiting,
                totalMs: Date.now() - totalStarted,
            },
        });
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
    } finally {
        requestTotalDuration.add(Date.now() - totalStarted, tags);
    }
}

interface SetupData {
    fixtures: { conversationSlugId: string; itemOrder: string[] }[];
}

export async function setup(): Promise<SetupData> {
    const fixtures: SetupData["fixtures"] = [];
    logLoadEvent({
        scenario: "solidago-ranking",
        phase: "setup",
        action: "scenario_configured",
        outcome: "info",
        count: config.conversations.length,
        metadata: {
            apiBaseUrl: config.apiBaseUrl,
            workloadMode: config.workloadMode,
            durationSeconds: config.durationSeconds,
            arrivalRatePerConversation: config.arrivalRate,
            strategy: config.strategy,
            seed: config.seed,
            noiseRate: config.noiseRate,
            majorityShare: config.majorityShare,
            dropoutRate: config.dropoutRate,
            backendDid: config.backendDid,
            conversations: config.conversations.join(","),
            usersPerConversation: config.usersPerConversation,
            vusPerConversation: config.vusPerConversation,
            maxVusPerConversation:
                config.workloadMode === "arrival-rate"
                    ? config.maxVusPerConversation
                    : config.vusPerConversation,
            totalMaxVus:
                config.conversations.length *
                (config.workloadMode === "arrival-rate"
                    ? config.maxVusPerConversation
                    : config.vusPerConversation),
            comparisonsPerUser: config.comparisonsPerUser,
            totalUsers:
                config.workloadMode === "iterations"
                    ? config.conversations.length * config.usersPerConversation
                    : null,
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
            const order =
                config.itemOrders.get(conversationSlugId) ??
                items.map((item) => item.slugId);
            const active = new Set(items.map((item) => item.slugId));
            if (
                order.length !== active.size ||
                new Set(order).size !== active.size ||
                order.some((id) => !active.has(id))
            ) {
                throw new Error(
                    "Configured item order must contain every active item exactly once",
                );
            }
            fixtures.push({ conversationSlugId, itemOrder: order });
            logLoadEvent({
                scenario: "solidago-ranking",
                phase: "setup",
                action: "item_manifest",
                outcome: "info",
                conversationSlugId,
                metadata: {
                    itemOrder: JSON.stringify(order),
                    strategy: config.strategy,
                    seed: config.seed,
                },
            });
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
    return { fixtures };
}

export default async function rankingParticipant(
    data: SetupData,
): Promise<void> {
    const conversationSlugId = z
        .string()
        .parse(__ENV.RANKING_CONVERSATION_SLUG_ID);
    const iterationIndex = execution.scenario.iterationInTest;
    const userId = `${execution.scenario.name}:${String(iterationIndex)}`;
    const tags = { conversation: conversationSlugId };
    usersStarted.add(1, tags);
    // Seed the counter even when no participant finishes, so its threshold still fails.
    usersCompleted.add(0, tags);
    let savedCount = 0;
    let failureMessage = "Unable to initialize participant credentials";
    const participantStarted = Date.now();
    try {
        logLoadEvent({
            scenario: "solidago-ranking",
            phase: "participation",
            action: "user_started",
            outcome: "start",
            conversationSlugId,
            userId,
            iterationIndex,
        });
        const credentialsStarted = Date.now();
        const credentials = await createDidIfDoesNotExist(userId);
        clientComputeDuration.add(Date.now() - credentialsStarted, {
            ...tags,
            operation: "credentials",
        });
        const context: RequestContext = {
            conversationSlugId,
            credentials,
            userId,
            phase: "participation",
        };
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
        const itemOrder = data.fixtures.find(
            (fixture) => fixture.conversationSlugId === conversationSlugId,
        )?.itemOrder;
        if (
            itemOrder?.length !== activeItems.size ||
            itemOrder.some((id) => !activeItems.has(id))
        ) {
            throw new Error("Active items differ from the setup manifest");
        }
        const preferenceStarted = Date.now();
        const chooseComparison = createRankingVoter({
            itemOrder,
            strategy: config.strategy,
            seed: config.seed,
            userIndex: iterationIndex,
            majorityShare: config.majorityShare,
            noiseRate: config.noiseRate,
        });
        clientComputeDuration.add(Date.now() - preferenceStarted, {
            ...tags,
            operation: "preference_setup",
        });
        const { data: loaded } = await request({
            context,
            operation: "load",
            pathname: "/api/v1/ranking/bws/load",
            body: { conversationSlugId },
            schema: Dto.maxdiffLoadResponse,
        });
        let candidateSets = loaded.candidateSets;
        const restoreStarted = Date.now();
        const instance = restoreMaxDiff({
            items: itemSlugIds,
            comparisons: loaded.comparisons ?? [],
        });
        clientComputeDuration.add(Date.now() - restoreStarted, {
            ...tags,
            operation: "restore",
        });
        const budget = comparisonBudget({
            strategy: config.strategy,
            seed: config.seed,
            userIndex: iterationIndex,
            maximum: config.comparisonsPerUser,
            dropoutRate: config.dropoutRate,
        });
        if (candidateSets.length === 0) {
            failureMessage =
                "Fresh participant received no candidate sets; check that fixture items remain active";
            throw new Error(failureMessage);
        }
        for (let index = 0; index < budget && !instance.complete; index++) {
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
            const computeStarted = Date.now();
            const comparison = chooseComparison({
                candidateSet,
                comparisonIndex: index,
            });
            recordMaxDiffVote({
                instance,
                candidates: comparison.set,
                best: comparison.best,
                worst: comparison.worst,
            });
            const comparisons = instance.exportState().comparisons;
            clientComputeDuration.add(Date.now() - computeStarted, {
                ...tags,
                operation: "vote",
            });
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
                    preferenceGroup: preferenceGroup({
                        strategy: config.strategy,
                        seed: config.seed,
                        userIndex: iterationIndex,
                        majorityShare: config.majorityShare,
                    }),
                    best: comparison.best,
                    worst: comparison.worst,
                    candidateSet: JSON.stringify(comparison.set),
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
                    : budget < config.comparisonsPerUser
                      ? "dropout_budget"
                      : "comparison_budget",
                rankingComplete,
                durationMs: Date.now() - participantStarted,
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

async function observeResults(
    context: RequestContext,
): Promise<MaxDiffResultItem[]> {
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
    return rankings;
}

export async function teardown(data: SetupData): Promise<void> {
    let evaluationFailed = false;
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
            const rankings = await observeResults({
                conversationSlugId,
                credentials: undefined,
                userId: undefined,
                phase: "teardown",
            });
            logLoadEvent({
                scenario: "solidago-ranking",
                phase: "teardown",
                action: "ranking_evaluated",
                outcome: "info",
                conversationSlugId,
                metadata: {
                    ...evaluateRanking({
                        itemOrder:
                            data.fixtures.find(
                                (fixture) =>
                                    fixture.conversationSlugId ===
                                    conversationSlugId,
                            )?.itemOrder ?? [],
                        rankings,
                    }),
                    strategy: config.strategy,
                    referenceIsCommonPreference: [
                        "unanimous",
                        "noisy",
                        "sparse",
                    ].includes(config.strategy),
                    scoringFreshnessVerified: false,
                },
            });
        } catch {
            evaluationFailed = true;
            logLoadEvent({
                scenario: "solidago-ranking",
                phase: "teardown",
                action: "ranking_evaluated",
                outcome: "failure",
                conversationSlugId,
                error: "Unable to fetch or evaluate the final ranking",
            });
        }
    }
    logLoadEvent({
        scenario: "solidago-ranking",
        phase: "teardown",
        action: "scenario_finished",
        outcome: evaluationFailed ? "failure" : "complete",
        metadata: { cleanupPerformed: false, scoringFreshnessVerified: false },
    });
    if (evaluationFailed)
        throw new Error(
            "Final ranking evaluation failed; inspect teardown events",
        );
}
