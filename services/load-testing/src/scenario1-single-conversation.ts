/**
 * Scenario 1: Conversation Voting Load Test
 *
 * Sequential test flow:
 * 1. First X users (OPINION_CREATOR_COUNT, default 50) each create 1 opinion
 *    distributed across one or more conversations
 * 2. Then these X users each vote on 50-100% of all fetched opinions
 * 3. Finally Y additional users (ADDITIONAL_VOTERS, default 50) join and each vote on 50-100% of opinions
 *
 * Total participants: OPINION_CREATOR_COUNT + ADDITIONAL_VOTERS (default: 100)
 * Initial opinions: OPINION_CREATOR_COUNT (default: 50)
 * Each user votes on: 50-100% of opinions across all configured conversations
 *
 * - Skips teardown cleanup in large mode because credentials are generated inside VUs
 */

// Polyfill for TextEncoder/TextDecoder (k6 doesn't provide these globally)
import "fast-text-encoding";

import { sleep } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";
import { SharedArray } from "k6/data";
import execution from "k6/execution";
import { createDidIfDoesNotExist } from "./crypto/ucan/operation.js";
import {
    createOpinion,
    fetchOpinions,
    fetchConversationPage,
    fetchSurveyForm,
    saveSurveyAnswer,
    type CreateOpinionResponse,
    type SurveyAnswerSubmission,
    type SurveyQuestionFormItem,
    type VoteResponse,
} from "./utils/api.js";
import { logLoadEvent } from "./utils/semanticLog.js";
import { performUserActions } from "./utils/userActions.js";

function getNumberEnv({
    value,
    fallback,
}: {
    value: string | undefined;
    fallback: number;
}): number {
    if (value === undefined || value === "") {
        return fallback;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function getBooleanEnv({
    value,
    fallback,
}: {
    value: string | undefined;
    fallback: boolean;
}): boolean {
    if (value === undefined || value === "") {
        return fallback;
    }

    const normalizedValue = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalizedValue)) {
        return true;
    }
    if (["0", "false", "no", "off"].includes(normalizedValue)) {
        return false;
    }

    return fallback;
}

// Configuration constants - Simple and configurable
const OPINION_CREATOR_COUNT = getNumberEnv({ value: __ENV.OPINION_CREATOR_COUNT, fallback: 50 }); // Users who create opinions
const ADDITIONAL_VOTERS = getNumberEnv({ value: __ENV.ADDITIONAL_VOTERS, fallback: 50 }); // Additional users who only vote
const TOTAL_USERS = OPINION_CREATOR_COUNT + ADDITIONAL_VOTERS;
const ACTIVE_VUS = getNumberEnv({ value: __ENV.LOAD_TEST_VUS, fallback: Math.min(TOTAL_USERS, 100) });
const MIN_VOTE_PERCENTAGE = 0.5; // Each user votes on at least 50% of opinions
const MAX_VOTE_PERCENTAGE = 1.0; // Each user votes on at most 100% of opinions
const INTERMITTENT_OPINION_CREATION_PROBABILITY = getNumberEnv({ value: __ENV.INTERMITTENT_OPINION_CREATION_PROBABILITY, fallback: 0.1 });

// Sleep timing configuration (in seconds)
const SLEEP_BETWEEN_ACTIONS = 0.5;
const INITIAL_WAIT_FOR_OPINIONS_SECONDS = 10; // Initial wait for opinion creators to finish
const OPINION_FETCH_RETRY_ATTEMPTS = 5; // Number of times to retry fetching opinions
const OPINION_FETCH_RETRY_DELAY = 2; // Seconds between fetch retries

// Page fetching configuration
const MAIN_PAGE_FETCH_PROBABILITY = getNumberEnv({ value: __ENV.MAIN_PAGE_FETCH_PROBABILITY, fallback: 0.1 }); // 10% chance to fetch main page during actions
const CONVERSATION_PAGE_FETCH_PROBABILITY = getNumberEnv({ value: __ENV.CONVERSATION_PAGE_FETCH_PROBABILITY, fallback: 0.15 }); // 15% chance to fetch conversation page during actions (higher because users refresh to see updates)
const AUTO_FILL_SURVEY = getBooleanEnv({ value: __ENV.AUTO_FILL_SURVEY || __ENV.SURVEY_AUTO_FILL, fallback: true });

// Custom metrics
const opinionsCreated = new Counter("opinions_created");
const opinionsFailed = new Counter("opinions_failed");
const votesSuccessful = new Counter("votes_successful");
const votesFailed = new Counter("votes_failed");
const conversationPageFetches = new Counter("conversation_page_fetches");
const mainPageFetches = new Counter("main_page_fetches");
const opinionResponseTime = new Trend("opinion_response_time");
const voteResponseTime = new Trend("vote_response_time");
const conversationPageResponseTime = new Trend("conversation_page_response_time");
const mainPageResponseTime = new Trend("main_page_response_time");
const opinionSuccessRate = new Rate("opinion_success_rate");
const voteSuccessRate = new Rate("vote_success_rate");
const surveyFillAttempts = new Counter("survey_fill_attempts");
const surveyFillSkipped = new Counter("survey_fill_skipped");
const surveyQuestionsAnswered = new Counter("survey_questions_answered");
const surveyResponsesCompleted = new Counter("survey_responses_completed");
const surveyFillFailed = new Counter("survey_fill_failed");
const surveyFillResponseTime = new Trend("survey_fill_response_time");
const surveyFillSuccessRate = new Rate("survey_fill_success_rate");

// Test configuration - each VU executes one user flow.
export const options = {
    scenarios: {
        sequential_users: {
            executor: "shared-iterations",
            vus: ACTIVE_VUS,
            iterations: TOTAL_USERS,
            maxDuration: "30m",
        },
    },
    thresholds: {
        opinion_success_rate: ["rate>0.95"],
        vote_success_rate: ["rate>0.95"],
        opinion_response_time: ["p(95)<5000"],
        vote_response_time: ["p(95)<5000"],
        http_req_failed: ["rate<0.05"],
    },
    teardownTimeout: "10m",
};

// Environment variables (set these before running the test)
const CONVERSATION_SLUG_IDS_STR = __ENV.CONVERSATION_SLUG_IDS || __ENV.CONVERSATION_SLUG_ID || "";

if (!CONVERSATION_SLUG_IDS_STR) {
    throw new Error(
        "CONVERSATION_SLUG_IDS environment variable is required. Example: k6 run -e CONVERSATION_SLUG_IDS=abc123,def456 dist/scenario1-single-conversation.cjs",
    );
}

const CONVERSATION_SLUG_IDS = CONVERSATION_SLUG_IDS_STR.split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

if (CONVERSATION_SLUG_IDS.length === 0) {
    throw new Error("At least one conversation slug ID is required");
}

console.log(
    `Testing with ${String(CONVERSATION_SLUG_IDS.length)} conversation(s): ${CONVERSATION_SLUG_IDS.join(", ")}`,
);
logLoadEvent({
    phase: "configuration",
    action: "scenario_configured",
    outcome: "info",
    count: CONVERSATION_SLUG_IDS.length,
    metadata: {
        opinionCreatorCount: OPINION_CREATOR_COUNT,
        additionalVoters: ADDITIONAL_VOTERS,
        totalUsers: TOTAL_USERS,
        activeVus: ACTIVE_VUS,
        autoFillSurvey: AUTO_FILL_SURVEY,
    },
});

// Sample opinion texts for variety
const opinionTexts = new SharedArray("opinion_texts", function () {
    return [
        "I think this is a great proposal that benefits everyone.",
        "We should consider the environmental impact before proceeding.",
        "The budget allocation seems reasonable for this project.",
        "I have concerns about the timeline being too aggressive.",
        "This aligns well with our community values and goals.",
        "We need more data before making such an important decision.",
        "I support this initiative but with some modifications.",
        "The implementation plan needs more detail and clarity.",
        "This could set a positive precedent for future projects.",
        "I appreciate the thorough research that went into this.",
        "The economic implications need further consideration.",
        "This addresses a critical need in our community.",
        "I would like to see more stakeholder input first.",
        "The proposed solution seems both practical and effective.",
        "We should evaluate alternative approaches as well.",
    ];
});

// Voting options (users vote once per opinion, can't change their vote)
const VOTING_OPTIONS: ("agree" | "disagree" | "pass")[] = [
    "agree",
    "disagree",
    "pass",
];

// Backend DID from environment variable
// Default to localhost for local development
const BACKEND_DID = __ENV.BACKEND_DID || "did:web:localhost%3A8084";

interface FillSurveyResult {
    skipped: boolean;
    success: boolean;
    questionsAnswered: number;
    questionCount: number;
    responseTime: number;
    justCompleted: boolean;
    status?: string;
    skipReason?: string;
    isOptional?: boolean;
    canParticipate?: boolean;
    error?: string;
}

function buildSurveyAnswer({
    question,
    iterationIndex,
}: {
    question: SurveyQuestionFormItem;
    iterationIndex: number;
}):
    | { success: true; answer: SurveyAnswerSubmission }
    | { success: false; error: string } {
    switch (question.questionType) {
        case "choice": {
            const optionSlugIds = [...question.options]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((option) => option.optionSlugId)
                .filter((optionSlugId): optionSlugId is string => optionSlugId !== undefined);
            const selectionCount = Math.max(question.constraints.minSelections, 1);
            if (optionSlugIds.length < selectionCount) {
                return {
                    success: false,
                    error: "Survey choice question has too few options",
                };
            }

            const startIndex = iterationIndex % optionSlugIds.length;
            const selectedOptionSlugIds = Array.from(
                { length: selectionCount },
                (_, index) => optionSlugIds[(startIndex + index) % optionSlugIds.length],
            );
            return {
                success: true,
                answer: {
                    questionType: "choice",
                    optionSlugIds: selectedOptionSlugIds,
                },
            };
        }
        case "free_text": {
            if (question.constraints.inputMode === "integer") {
                if (
                    question.constraints.maxValue !== undefined &&
                    question.constraints.maxValue < question.constraints.minValue
                ) {
                    return {
                        success: false,
                        error: "Survey integer question has invalid bounds",
                    };
                }

                return {
                    success: true,
                    answer: {
                        questionType: "free_text",
                        textValueHtml: String(question.constraints.minValue),
                    },
                };
            }

            const minPlainTextLength = Math.max(
                question.constraints.minPlainTextLength ?? 1,
                1,
            );
            const maxAllowedLength = Math.min(
                question.constraints.maxPlainTextLength,
                question.constraints.maxHtmlLength,
            );
            if (maxAllowedLength < minPlainTextLength) {
                return {
                    success: false,
                    error: "Survey free-text question has impossible length bounds",
                };
            }

            return {
                success: true,
                answer: {
                    questionType: "free_text",
                    textValueHtml: "x".repeat(minPlainTextLength),
                },
            };
        }
    }
}

async function fillSurveyForConversation({
    conversationSlugId,
    did,
    prefixedKey,
    backendDid,
    iterationIndex,
    userId,
}: {
    conversationSlugId: string;
    did: string;
    prefixedKey: string;
    backendDid: string;
    iterationIndex: number;
    userId: string;
}): Promise<FillSurveyResult> {
    console.log(`[${userId}] Checking survey for ${conversationSlugId}`);
    logLoadEvent({
        phase: "survey_fill",
        action: "fetch_survey_form",
        outcome: "start",
        userId,
        iterationIndex,
        conversationSlugId,
    });

    const surveyForm = await fetchSurveyForm({
        conversationSlugId,
        did,
        prefixedKey,
        backendDid,
    });
    let responseTime = surveyForm.responseTime;

    if (!surveyForm.success) {
        return {
            skipped: false,
            success: false,
            questionsAnswered: 0,
            questionCount: 0,
            responseTime,
            justCompleted: false,
            error: surveyForm.error,
        };
    }

    const surveyGate = surveyForm.surveyGate;
    console.log(
        `[${userId}] Survey form for ${conversationSlugId}: hasSurvey=${String(surveyGate?.hasSurvey === true)} status=${surveyGate?.status ?? "unknown"} questions=${String(surveyForm.questions.length)}`,
    );
    logLoadEvent({
        phase: "survey_fill",
        action: "fetch_survey_form",
        outcome: "success",
        userId,
        iterationIndex,
        conversationSlugId,
        count: surveyForm.questions.length,
        responseTimeMs: surveyForm.responseTime,
        metadata: {
            hasSurvey: surveyGate?.hasSurvey === true,
            status: surveyGate?.status ?? null,
            isOptional: surveyGate?.isOptional ?? null,
            canParticipate: surveyGate?.canParticipate ?? null,
        },
    });

    if (
        surveyGate?.hasSurvey !== true ||
        surveyForm.questions.length === 0 ||
        surveyGate.status === "complete_valid"
    ) {
        const skipReason = surveyGate?.hasSurvey !== true
            ? "no_survey"
            : surveyForm.questions.length === 0
                ? "empty_survey"
                : "already_complete";
        console.log(`[${userId}] Skipping survey fill for ${conversationSlugId}: ${skipReason}`);
        return {
            skipped: true,
            success: true,
            questionsAnswered: 0,
            questionCount: surveyForm.questions.length,
            responseTime,
            justCompleted: false,
            status: surveyGate?.status,
            skipReason,
            isOptional: surveyGate?.isOptional,
            canParticipate: surveyGate?.canParticipate,
        };
    }

    let questionsAnswered = 0;
    let justCompleted = false;
    for (const question of [...surveyForm.questions].sort(
        (a, b) => a.displayOrder - b.displayOrder,
    )) {
        if (question.questionSlugId === undefined) {
            return {
                skipped: false,
                success: false,
                questionsAnswered,
                questionCount: surveyForm.questions.length,
                responseTime,
                justCompleted,
                status: surveyGate.status,
                isOptional: surveyGate.isOptional,
                canParticipate: surveyGate.canParticipate,
                error: "Survey question is missing questionSlugId",
            };
        }

        const answerResult = buildSurveyAnswer({ question, iterationIndex });
        if (!answerResult.success) {
            return {
                skipped: false,
                success: false,
                questionsAnswered,
                questionCount: surveyForm.questions.length,
                responseTime,
                justCompleted,
                status: surveyGate.status,
                isOptional: surveyGate.isOptional,
                canParticipate: surveyGate.canParticipate,
                error: answerResult.error,
            };
        }

        console.log(
            `[${userId}] Saving survey answer ${String(questionsAnswered + 1)}/${String(surveyForm.questions.length)} for ${conversationSlugId} question=${question.questionSlugId}`,
        );
        const saveResult = await saveSurveyAnswer({
            conversationSlugId,
            questionSlugId: question.questionSlugId,
            answer: answerResult.answer,
            did,
            prefixedKey,
            backendDid,
        });
        responseTime += saveResult.responseTime;
        if (!saveResult.success) {
            return {
                skipped: false,
                success: false,
                questionsAnswered,
                questionCount: surveyForm.questions.length,
                responseTime,
                justCompleted,
                status: surveyGate.status,
                isOptional: surveyGate.isOptional,
                canParticipate: surveyGate.canParticipate,
                error: saveResult.error,
            };
        }

        questionsAnswered += 1;
        justCompleted ||= saveResult.justCompleted === true;
        logLoadEvent({
            phase: "survey_fill",
            action: "save_survey_answer",
            outcome: "success",
            userId,
            iterationIndex,
            conversationSlugId,
            responseTimeMs: saveResult.responseTime,
            count: questionsAnswered,
            metadata: {
                questionSlugId: question.questionSlugId,
                questionType: question.questionType,
                justCompleted: saveResult.justCompleted === true,
                status: saveResult.surveyGate?.status ?? null,
            },
        });
    }

    console.log(
        `[${userId}] Completed survey fill for ${conversationSlugId}: answered=${String(questionsAnswered)} justCompleted=${String(justCompleted)}`,
    );

    return {
        skipped: false,
        success: true,
        questionsAnswered,
        questionCount: surveyForm.questions.length,
        responseTime,
        justCompleted,
        status: surveyGate.status,
        isOptional: surveyGate.isOptional,
        canParticipate: surveyGate.canParticipate,
    };
}

function recordSurveyFillResult({
    result,
    userId,
    iterationIndex,
    conversationSlugId,
}: {
    result: FillSurveyResult;
    userId: string;
    iterationIndex: number;
    conversationSlugId: string;
}): void {
    surveyFillResponseTime.add(result.responseTime);
    if (result.skipped) {
        surveyFillSkipped.add(1);
        logLoadEvent({
            phase: "survey_fill",
            action: "fill_survey",
            outcome: "skip",
            userId,
            iterationIndex,
            conversationSlugId,
            responseTimeMs: result.responseTime,
            metadata: {
                status: result.status ?? null,
                skipReason: result.skipReason ?? null,
                questionCount: result.questionCount,
                isOptional: result.isOptional ?? null,
                canParticipate: result.canParticipate ?? null,
            },
        });
        return;
    }

    surveyFillAttempts.add(1);
    surveyQuestionsAnswered.add(result.questionsAnswered);
    surveyFillSuccessRate.add(result.success ? 1 : 0);
    if (result.justCompleted) {
        surveyResponsesCompleted.add(1);
    }

    if (result.success) {
        logLoadEvent({
            phase: "survey_fill",
            action: "fill_survey",
            outcome: "success",
            userId,
            iterationIndex,
            conversationSlugId,
            count: result.questionsAnswered,
            responseTimeMs: result.responseTime,
            metadata: {
                status: result.status ?? null,
                justCompleted: result.justCompleted,
                questionCount: result.questionCount,
                isOptional: result.isOptional ?? null,
                canParticipate: result.canParticipate ?? null,
            },
        });
    } else {
        surveyFillFailed.add(1);
        console.error(`[${userId}] Survey fill failed for ${conversationSlugId}: ${String(result.error)}`);
        logLoadEvent({
            phase: "survey_fill",
            action: "fill_survey",
            outcome: "failure",
            userId,
            iterationIndex,
            conversationSlugId,
            count: result.questionsAnswered,
            responseTimeMs: result.responseTime,
            error: result.error,
            metadata: {
                status: result.status ?? null,
                questionCount: result.questionCount,
                isOptional: result.isOptional ?? null,
                canParticipate: result.canParticipate ?? null,
            },
        });
    }
}

function getUserId(iterationIndex: number): string {
    return iterationIndex < OPINION_CREATOR_COUNT
        ? `creator-${String(iterationIndex)}`
        : `voter-${String(iterationIndex - OPINION_CREATOR_COUNT)}`;
}

/**
 * Setup function - keeps startup cheap so large runs begin sending traffic quickly.
 * Credentials are generated inside each VU because k6 setup has a short default timeout.
 */
export function setup(): void {
    console.log("=== Setup: user keypairs will be generated by each VU ===");
    logLoadEvent({
        phase: "setup",
        action: "prepare_users",
        outcome: "complete",
        count: TOTAL_USERS,
        metadata: { credentialGeneration: "per_vu" },
    });
}

/**
 * Main test function - each VU executes one user flow.
 * The first OPINION_CREATOR_COUNT users create opinions, then everyone votes.
 */
export default async function () {
    const iterationIndex = execution.scenario.iterationInTest;
    const isOpinionCreator = iterationIndex < OPINION_CREATOR_COUNT;
    const assignedConversationSlugId = CONVERSATION_SLUG_IDS[iterationIndex % CONVERSATION_SLUG_IDS.length];
    const userId = getUserId(iterationIndex);

    console.log(`[${userId}] Starting (iteration ${String(iterationIndex)})`);
    logLoadEvent({
        phase: "user_flow",
        action: "start_user",
        outcome: "start",
        userId,
        iterationIndex,
        conversationSlugId: assignedConversationSlugId,
    });

    // Step 1: Generate credentials inside this VU to avoid a long serial setup phase.
    console.log(`[${userId}] Generating keypair...`);
    const credentialStartTime = Date.now();
    const { did, prefixedKey } = await createDidIfDoesNotExist(userId);
    logLoadEvent({
        phase: "user_credentials",
        action: "generate_keypair",
        outcome: "success",
        userId,
        iterationIndex,
        responseTimeMs: Date.now() - credentialStartTime,
    });

    // Step 2: Fetch conversation page (simulates user landing on the frontend page)
    // This will trigger the frontend to make multiple API calls to the backend
    console.log(`[${userId}] Fetching conversation page...`);
    const conversationPageResult = fetchConversationPage({
        conversationSlugId: assignedConversationSlugId,
    });

    conversationPageFetches.add(1);
    conversationPageResponseTime.add(conversationPageResult.responseTime);

    if (!conversationPageResult.success) {
        console.error(`[${userId}] Failed to fetch conversation page: ${String(conversationPageResult.error)}`);
        logLoadEvent({
            phase: "page_fetch",
            action: "fetch_conversation_page",
            outcome: "failure",
            userId,
            iterationIndex,
            conversationSlugId: assignedConversationSlugId,
            responseTimeMs: conversationPageResult.responseTime,
            error: String(conversationPageResult.error),
        });
    } else {
        logLoadEvent({
            phase: "page_fetch",
            action: "fetch_conversation_page",
            outcome: "success",
            userId,
            iterationIndex,
            conversationSlugId: assignedConversationSlugId,
            responseTimeMs: conversationPageResult.responseTime,
        });
    }

    sleep(1); // Brief pause after page load

    // Step 3: Detect and complete surveys before participating.
    // Users may vote across all configured conversations, so each VU checks all of them.
    if (AUTO_FILL_SURVEY) {
        for (const conversationSlugId of CONVERSATION_SLUG_IDS) {
            const surveyFillResult = await fillSurveyForConversation({
                conversationSlugId,
                did,
                prefixedKey,
                backendDid: BACKEND_DID,
                iterationIndex,
                userId,
            });
            recordSurveyFillResult({
                result: surveyFillResult,
                userId,
                iterationIndex,
                conversationSlugId,
            });
        }
    } else {
        console.log(`[${userId}] Survey auto-fill disabled`);
        logLoadEvent({
            phase: "survey_fill",
            action: "fill_survey",
            outcome: "skip",
            userId,
            iterationIndex,
            conversationSlugId: assignedConversationSlugId,
            metadata: { skipReason: "auto_fill_disabled" },
        });
    }

    // Step 4: Opinion creators create 1 opinion before everyone fetches and votes
    let initialCreatedOpinionSlug: string | undefined;
    if (isOpinionCreator) {
        const opinionText = opinionTexts[iterationIndex % opinionTexts.length];
        console.log(`[${userId}] Creating opinion in ${assignedConversationSlugId}`);

        const opinionResult = await createOpinion({
            conversationSlugId: assignedConversationSlugId,
            opinionText,
            did,
            prefixedKey,
            backendDid: BACKEND_DID,
        });

        if (opinionResult.success && opinionResult.opinionSlugId) {
            initialCreatedOpinionSlug = opinionResult.opinionSlugId;
            opinionsCreated.add(1);
            opinionSuccessRate.add(1);
            console.log(`[${userId}] Created opinion: ${opinionResult.opinionSlugId} (${String(opinionResult.responseTime)}ms)`);
            logLoadEvent({
                phase: "initial_opinion",
                action: "create_opinion",
                outcome: "success",
                userId,
                iterationIndex,
                conversationSlugId: assignedConversationSlugId,
                opinionSlugId: opinionResult.opinionSlugId,
                responseTimeMs: opinionResult.responseTime,
            });
        } else {
            opinionsFailed.add(1);
            opinionSuccessRate.add(0);
            const reason = opinionResult.reason ?? "Unknown error";
            console.error(`[${userId}] OPINION CREATION FAILED - Reason: ${reason} - Response time: ${String(opinionResult.responseTime)}ms`);
            logLoadEvent({
                phase: "initial_opinion",
                action: "create_opinion",
                outcome: "failure",
                userId,
                iterationIndex,
                conversationSlugId: assignedConversationSlugId,
                responseTimeMs: opinionResult.responseTime,
                error: reason,
            });
        }

        opinionResponseTime.add(opinionResult.responseTime);
    }

    // Step 5: Wait for opinions to be visible before fetching and voting
    console.log(`[${userId}] Waiting ${String(INITIAL_WAIT_FOR_OPINIONS_SECONDS)}s for opinions to be created...`);
    sleep(INITIAL_WAIT_FOR_OPINIONS_SECONDS);

    // Step 6: Fetch available opinions from every configured conversation
    let fetchedOpinionSlugs: string[] = [];
    for (let attempt = 1; attempt <= OPINION_FETCH_RETRY_ATTEMPTS; attempt++) {
        console.log(`[${userId}] Fetching opinions (attempt ${String(attempt)}/${String(OPINION_FETCH_RETRY_ATTEMPTS)})...`);

        const fetchedOpinionSlugSet = new Set<string>();
        let fetchFailed = false;

        for (const conversationSlugId of CONVERSATION_SLUG_IDS) {
            const fetchResult = fetchOpinions({
                conversationSlugId,
            });

            if (fetchResult.success) {
                for (const opinion of fetchResult.opinions) {
                    fetchedOpinionSlugSet.add(opinion.opinionSlugId);
                }
            } else {
                fetchFailed = true;
                console.error(`[${userId}] Failed to fetch opinions for ${conversationSlugId}: ${String(fetchResult.error)}`);
                logLoadEvent({
                    phase: "opinion_fetch",
                    action: "fetch_opinions",
                    outcome: "failure",
                    userId,
                    iterationIndex,
                    conversationSlugId,
                    error: String(fetchResult.error),
                    metadata: { attempt },
                });
            }
        }

        fetchedOpinionSlugs = Array.from(fetchedOpinionSlugSet);
        console.log(`[${userId}] Fetched ${String(fetchedOpinionSlugs.length)} opinions from ${String(CONVERSATION_SLUG_IDS.length)} conversation(s)`);
        logLoadEvent({
            phase: "opinion_fetch",
            action: "fetch_opinions",
            outcome: fetchFailed ? "failure" : "success",
            userId,
            iterationIndex,
            count: fetchedOpinionSlugs.length,
            metadata: { attempt, conversationCount: CONVERSATION_SLUG_IDS.length },
        });

        const expectedMinimum = OPINION_CREATOR_COUNT * 0.9;
        if (!fetchFailed && fetchedOpinionSlugs.length >= expectedMinimum) {
            console.log(`[${userId}] Got sufficient opinions (${String(fetchedOpinionSlugs.length)}/${String(OPINION_CREATOR_COUNT)})`);
            break;
        }

        if (attempt < OPINION_FETCH_RETRY_ATTEMPTS) {
            console.log(`[${userId}] Only got ${String(fetchedOpinionSlugs.length)}/${String(OPINION_CREATOR_COUNT)} expected opinions, retrying in ${String(OPINION_FETCH_RETRY_DELAY)}s...`);
            sleep(OPINION_FETCH_RETRY_DELAY);
        }
    }

    // Step 7: Calculate how many votes to cast
    const availableOpinions = fetchedOpinionSlugs.length;
    const minVotes = Math.floor(availableOpinions * MIN_VOTE_PERCENTAGE);
    const maxVotes = Math.floor(availableOpinions * MAX_VOTE_PERCENTAGE);
    const numVotesToCast = availableOpinions > 0
        ? Math.floor(Math.random() * (maxVotes - minVotes + 1)) + minVotes
        : 0;

    console.log(`[${userId}] Will vote on ${String(numVotesToCast)} opinions (${String(availableOpinions)} available)`);
    logLoadEvent({
        phase: "vote_plan",
        action: "plan_votes",
        outcome: "info",
        userId,
        iterationIndex,
        count: numVotesToCast,
        metadata: { availableOpinions },
    });

    // Step 8: Perform voting actions. Opinion creators already created the initial batch.
    const userActionResult = await performUserActions({
        config: {
            did,
            prefixedKey,
            backendDid: BACKEND_DID,
            userId,
            numOpinionsToCreate: 0,
            numVotesToCast,
            conversationSlugIds: CONVERSATION_SLUG_IDS,
            opinionTexts,
            votingOptions: VOTING_OPTIONS,
            sleepBetweenActions: SLEEP_BETWEEN_ACTIONS,
            allAvailableOpinions: fetchedOpinionSlugs,
            alreadyVotedOpinionSlugs: initialCreatedOpinionSlug ? [initialCreatedOpinionSlug] : [],
            intermittentOpinionCreationProbability: INTERMITTENT_OPINION_CREATION_PROBABILITY,
            fetchMainPageProbability: MAIN_PAGE_FETCH_PROBABILITY,
            fetchConversationPageProbability: CONVERSATION_PAGE_FETCH_PROBABILITY,
        },
        onOpinionCreated: (
            opinionResult: CreateOpinionResponse & {
                conversationSlugId?: string;
                userId?: string;
            },
        ) => {
            if (opinionResult.success && opinionResult.opinionSlugId) {
                opinionsCreated.add(1);
                opinionSuccessRate.add(1);
                console.log(`[${userId}] Created opinion: ${opinionResult.opinionSlugId} (${String(opinionResult.responseTime)}ms)`);
                logLoadEvent({
                    phase: "user_action",
                    action: "create_opinion",
                    outcome: "success",
                    userId,
                    iterationIndex,
                    conversationSlugId: opinionResult.conversationSlugId,
                    opinionSlugId: opinionResult.opinionSlugId,
                    responseTimeMs: opinionResult.responseTime,
                });
            } else {
                opinionsFailed.add(1);
                opinionSuccessRate.add(0);
                const reason = opinionResult.reason ?? "Unknown error";
                console.error(`[${userId}] OPINION CREATION FAILED - Reason: ${reason} - Response time: ${String(opinionResult.responseTime)}ms`);
                logLoadEvent({
                    phase: "user_action",
                    action: "create_opinion",
                    outcome: "failure",
                    userId,
                    iterationIndex,
                    conversationSlugId: opinionResult.conversationSlugId,
                    responseTimeMs: opinionResult.responseTime,
                    error: reason,
                });

            }
            opinionResponseTime.add(opinionResult.responseTime);
        },
        onVoteCast: (voteResult: VoteResponse & { targetOpinionSlugId?: string; userId?: string }) => {
            if (voteResult.success) {
                votesSuccessful.add(1);
                voteSuccessRate.add(1);
                console.log(`[${userId}] Voted on opinion: ${String(voteResult.targetOpinionSlugId)}`);
                logLoadEvent({
                    phase: "user_action",
                    action: "cast_vote",
                    outcome: "success",
                    userId,
                    iterationIndex,
                    opinionSlugId: voteResult.targetOpinionSlugId,
                    responseTimeMs: voteResult.responseTime,
                });
            } else {
                votesFailed.add(1);
                voteSuccessRate.add(0);
                console.error(`[${userId}] Vote failed: ${String(voteResult.error)}`);
                logLoadEvent({
                    phase: "user_action",
                    action: "cast_vote",
                    outcome: "failure",
                    userId,
                    iterationIndex,
                    opinionSlugId: voteResult.targetOpinionSlugId,
                    responseTimeMs: voteResult.responseTime,
                    error: String(voteResult.error),
                });
            }
            voteResponseTime.add(voteResult.responseTime);
        },
    });

    // Track page fetch metrics
    if (userActionResult.metrics.mainPageFetches > 0) {
        mainPageFetches.add(userActionResult.metrics.mainPageFetches);
        for (let i = 0; i < userActionResult.metrics.mainPageFetches; i++) {
            mainPageResponseTime.add(
                userActionResult.metrics.totalMainPageResponseTime / userActionResult.metrics.mainPageFetches
            );
        }
    }

    if (userActionResult.metrics.conversationPageFetches > 0) {
        conversationPageFetches.add(userActionResult.metrics.conversationPageFetches);
        for (let i = 0; i < userActionResult.metrics.conversationPageFetches; i++) {
            conversationPageResponseTime.add(
                userActionResult.metrics.totalConversationPageResponseTime / userActionResult.metrics.conversationPageFetches
            );
        }
    }

    console.log(`[${userId}] Completed`);
    logLoadEvent({
        phase: "user_flow",
        action: "complete_user",
        outcome: "complete",
        userId,
        iterationIndex,
        metadata: {
            opinionsSucceeded: userActionResult.metrics.opinionsSucceeded,
            opinionsFailed: userActionResult.metrics.opinionsFailed,
            votesSucceeded: userActionResult.metrics.votesSucceeded,
            votesFailed: userActionResult.metrics.votesFailed,
        },
    });
}

/**
 * Teardown phase.
 * Per-VU private keys are isolated to each k6 VU runtime, so teardown cannot sign
 * user deletion requests without reintroducing setup-time key generation.
 */
export function teardown() {
    console.log("=== Teardown: skipping user deletion ===");
    console.log("Per-VU generated credentials are not available in teardown.");
    logLoadEvent({
        phase: "teardown",
        action: "delete_users",
        outcome: "skip",
        count: TOTAL_USERS,
        metadata: { reason: "per_vu_credentials_not_available" },
    });
}
