import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { htmlToCountedText } from "@/shared/richText.js";
import {
    validateRichTextHtmlByteCount,
    validateRichTextInputWithPlainText,
} from "@/shared/shared.js";
import {
    SEED_SUGGESTION_TARGET_COUNT,
    type GenerateSeedSuggestionsRequest,
    type GenerateSeedSuggestionsResponse,
} from "@/shared/types/dto.js";
import {
    createBedrockConverse,
    createBedrockSeedSuggestionSource,
    type SeedSuggestionFailureReason,
    type SeedSuggestionModelResult,
    type SeedSuggestionSource,
} from "./seedSuggestionModel.js";
import {
    DEFAULT_SEED_SUGGESTION_SYSTEM_PROMPT,
    selectUsableSeedStatements,
    selectUsableSeedTip,
    type SeedSuggestionModelInput,
} from "./seedSuggestionPrompt.js";
import type { SeedSuggestionSourceName } from "./seedSuggestionSourceName.js";

export const SEED_SUGGESTION_RATE_LIMIT_MAX = 5;
export const SEED_SUGGESTION_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_TRACKED_USERS = 10_000;

/** Why a request failed: the model's failures, or a description over the limits. */
export type GenerateSeedSuggestionsFailureReason =
    | SeedSuggestionFailureReason
    | "description_too_long";

export type GenerateSeedSuggestionsResult =
    | { success: true; response: GenerateSeedSuggestionsResponse }
    | {
          success: false;
          reason: GenerateSeedSuggestionsFailureReason;
          detail: string;
      };

type DescriptionResult =
    | { success: true; plainText: string }
    | { success: false; detail: string };

/**
 * The description as plain text, refused above the limits that apply when the
 * conversation is published: without them, a request sent outside the page could make
 * the model read a very long text, at Agora's expense.
 */
function readDescription(html: string | undefined): DescriptionResult {
    if (html === undefined) {
        return { success: true, plainText: "" };
    }
    const htmlSize = validateRichTextHtmlByteCount({
        htmlString: html,
        mode: "conversation",
    });
    if (!htmlSize.success) {
        return {
            success: false,
            detail: `${htmlSize.reason}: ${String(htmlSize.count)} > ${String(htmlSize.limit)}`,
        };
    }
    const plainText = htmlToCountedText(html);
    const textSize = validateRichTextInputWithPlainText({
        htmlString: html,
        plainText,
        mode: "conversation",
    });
    if (!textSize.success) {
        return {
            success: false,
            detail: `${textSize.reason}: ${String(textSize.count)} > ${String(textSize.limit)}`,
        };
    }
    return { success: true, plainText };
}

// Keywords a reviewer puts in the conversation title to see each state of the page
// without calling a model. Only the simulated source reads them.
const SIMULATE_NOT_CONFIDENT = "simulate:not-confident";
const SIMULATE_FAILURE = "simulate:failure";
const SIMULATE_SLOW = "simulate:slow";
const SIMULATED_SLOW_DELAY_MS = 5000;

interface CreateSimulatedSeedSuggestionSourceParams {
    slowDelayMs?: number;
}

export function createSimulatedSeedSuggestionSource({
    slowDelayMs = SIMULATED_SLOW_DELAY_MS,
}: CreateSimulatedSeedSuggestionSourceParams = {}): SeedSuggestionSource {
    const generate = async ({
        conversationTitle,
        existingStatements,
        targetCount,
    }: SeedSuggestionModelInput): Promise<SeedSuggestionModelResult> => {
        const title = conversationTitle.toLowerCase();
        if (title.includes(SIMULATE_FAILURE)) {
            return {
                success: false,
                reason: "model_failure",
                detail: "simulated failure",
            };
        }
        if (title.includes(SIMULATE_NOT_CONFIDENT)) {
            return {
                success: true,
                answer: {
                    confidence: false,
                    userFeedback:
                        "Simulated tip: say who this question is for and what you would like participants to propose.",
                    statements: [],
                },
            };
        }
        if (title.includes(SIMULATE_SLOW)) {
            await sleep(slowDelayMs);
        }
        // Numbered after what is already on the page, so pressing the button again
        // returns statements that differ from the previous ones.
        const firstNumber = existingStatements.length + 1;
        return {
            success: true,
            answer: {
                confidence: true,
                userFeedback: "",
                statements: Array.from(
                    { length: targetCount },
                    (_, index) =>
                        `Simulated suggestion ${String(firstNumber + index)}: a placeholder statement to agree or disagree with.`,
                ),
            },
        };
    };

    return { name: "simulated", modelId: "simulated", generate };
}

export interface SeedSuggestionSettings {
    source: SeedSuggestionSourceName;
    /** Overrides the system prompt selected by the experiments. */
    systemPrompt: string | undefined;
    temperature: number;
    timeoutMs: number;
    bedrockRegion: string;
    bedrockModelId: string;
}

export function createSeedSuggestionSource({
    source,
    systemPrompt = DEFAULT_SEED_SUGGESTION_SYSTEM_PROMPT,
    temperature,
    timeoutMs,
    bedrockRegion,
    bedrockModelId,
}: SeedSuggestionSettings): SeedSuggestionSource {
    switch (source) {
        case "simulated":
            return createSimulatedSeedSuggestionSource();
        case "bedrock":
            return createBedrockSeedSuggestionSource({
                modelId: bedrockModelId,
                systemPrompt,
                temperature,
                timeoutMs,
                converse: createBedrockConverse(bedrockRegion),
            });
    }
}

interface GenerateSeedSuggestionsParams {
    source: SeedSuggestionSource;
    request: GenerateSeedSuggestionsRequest;
}

export async function generateSeedSuggestions({
    source,
    request,
}: GenerateSeedSuggestionsParams): Promise<GenerateSeedSuggestionsResult> {
    const description = readDescription(request.conversationBody);
    if (!description.success) {
        return {
            success: false,
            reason: "description_too_long",
            detail: description.detail,
        };
    }
    const result = await source.generate({
        conversationTitle: request.conversationTitle,
        // The description is rich text; the model reads plain text.
        conversationBody: description.plainText,
        existingStatements: request.existingStatements,
        targetCount: SEED_SUGGESTION_TARGET_COUNT,
    });
    if (!result.success) {
        return result;
    }

    const generationId = randomUUID();
    const { answer } = result;
    if (!answer.confidence) {
        const tip = selectUsableSeedTip(answer.userFeedback);
        if (tip === undefined) {
            return {
                success: false,
                reason: "invalid_answer",
                detail: "not confident, but no tip was given",
            };
        }
        // The statements of a not-confident answer are never sent to the browser.
        return {
            success: true,
            response: { generationId, confident: false, tip },
        };
    }

    const statements = selectUsableSeedStatements({
        statements: answer.statements,
        existingStatements: request.existingStatements,
        targetCount: SEED_SUGGESTION_TARGET_COUNT,
    });
    if (statements.length === 0) {
        return {
            success: false,
            reason: "invalid_answer",
            detail: "no statement passed the checks",
        };
    }
    return {
        success: true,
        response: {
            generationId,
            confident: true,
            suggestions: statements.map((text) => ({
                suggestionId: randomUUID(),
                text,
            })),
        },
    };
}

/**
 * Usage of AI suggestions is recorded as marked lines in the API log, not in the
 * database: how often they are requested, and how many are taken as statements.
 * No conversation or suggestion text is logged.
 */
export const SEED_SUGGESTION_EVENT_MARKER = "AGORA_AI_SUGGESTION_EVENT";

interface SeedSuggestionRequestEvent {
    userId: string;
    draftId: string;
    conversationType: GenerateSeedSuggestionsRequest["conversationType"];
    source: SeedSuggestionSourceName;
    model: string;
    durationMs: number;
}

export type SeedSuggestionEvent =
    | (SeedSuggestionRequestEvent & {
          event: "generated";
          generationId: string;
          confident: boolean;
          suggestionIds: string[];
      })
    | (SeedSuggestionRequestEvent & {
          event: "failed";
          reason: GenerateSeedSuggestionsFailureReason;
          detail: string;
      })
    | {
          event: "added";
          userId: string;
          draftId: string;
          generationId: string;
          suggestionId: string;
      };

export function formatSeedSuggestionEvent(event: SeedSuggestionEvent): string {
    return `${SEED_SUGGESTION_EVENT_MARKER} ${JSON.stringify({
        timestamp: new Date().toISOString(),
        ...event,
    })}`;
}

export type SeedSuggestionRateLimitResult =
    | { isAllowed: true }
    | { isAllowed: false; retryAfterMs: number };

export interface SeedSuggestionRateLimiter {
    consume: (userId: string) => SeedSuggestionRateLimitResult;
}

interface CreateSeedSuggestionRateLimiterParams {
    maxRequests?: number;
    windowMs?: number;
    now?: () => number;
}

/**
 * Sliding-window limit on generations per user, to bound model cost.
 *
 * Kept in this process: with several API instances, each one counts separately, so
 * the effective limit is `maxRequests` per instance.
 */
export function createSeedSuggestionRateLimiter({
    maxRequests = SEED_SUGGESTION_RATE_LIMIT_MAX,
    windowMs = SEED_SUGGESTION_RATE_LIMIT_WINDOW_MS,
    now = Date.now,
}: CreateSeedSuggestionRateLimiterParams = {}): SeedSuggestionRateLimiter {
    const requestTimesByUser = new Map<string, number[]>();

    const consume = (userId: string): SeedSuggestionRateLimitResult => {
        const currentTime = now();
        const windowStart = currentTime - windowMs;
        const recentTimes = (requestTimesByUser.get(userId) ?? []).filter(
            (time) => time > windowStart,
        );
        const oldestTime = recentTimes.at(0);
        if (recentTimes.length >= maxRequests && oldestTime !== undefined) {
            requestTimesByUser.set(userId, recentTimes);
            return {
                isAllowed: false,
                retryAfterMs: oldestTime + windowMs - currentTime,
            };
        }
        if (requestTimesByUser.size >= MAX_TRACKED_USERS) {
            for (const [trackedUserId, times] of requestTimesByUser) {
                if (times.every((time) => time <= windowStart)) {
                    requestTimesByUser.delete(trackedUserId);
                }
            }
        }
        requestTimesByUser.set(userId, [...recentTimes, currentTime]);
        return { isAllowed: true };
    };

    return { consume };
}
