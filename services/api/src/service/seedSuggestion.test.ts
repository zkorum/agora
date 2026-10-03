import { describe, expect, it } from "vitest";

import { MAX_LENGTH_CONVERSATION_BODY } from "@/shared/shared.js";
import { Dto } from "@/shared/types/dto.js";
import type { GenerateSeedSuggestionsRequest } from "@/shared/types/dto.js";
import {
    createSeedSuggestionRateLimiter,
    createSeedSuggestionSource,
    createSimulatedSeedSuggestionSource,
    formatSeedSuggestionEvent,
    generateSeedSuggestions,
    type SeedSuggestionSettings,
} from "./seedSuggestion.js";
import type {
    SeedSuggestionModelResult,
    SeedSuggestionSource,
} from "./seedSuggestionModel.js";

const settings: SeedSuggestionSettings = {
    source: "simulated",
    systemPrompt: undefined,
    temperature: 0.3,
    timeoutMs: 1000,
    bedrockRegion: "us-east-1",
    bedrockModelId: "mistral.mistral-large-3-675b-instruct",
};

function sourceAnswering(
    result: SeedSuggestionModelResult,
): SeedSuggestionSource {
    return {
        name: "simulated",
        modelId: "test",
        generate: () => Promise.resolve(result),
    };
}

function buildRequest(
    overrides: Partial<GenerateSeedSuggestionsRequest> = {},
): GenerateSeedSuggestionsRequest {
    return {
        draftId: "7a1c3f9e-2b4d-4e8a-9c6f-1d2e3f4a5b6c",
        conversationTitle: "Night buses",
        conversationBody:
            "<p>Which priorities for the new night bus lines?</p>",
        conversationType: "polis",
        postAsOrganization: undefined,
        existingStatements: [],
        ...overrides,
    };
}

describe("simulated seed suggestion source", () => {
    const source = createSimulatedSeedSuggestionSource({ slowDelayMs: 1 });

    it("returns the requested number of distinct statements when confident", async () => {
        const result = await source.generate({
            conversationTitle: "Night buses",
            conversationBody: "",
            existingStatements: [],
            targetCount: 3,
        });

        expect(result.success).toBe(true);
        if (!result.success) {
            return;
        }
        expect(result.answer.confidence).toBe(true);
        expect(new Set(result.answer.statements).size).toBe(3);
    });

    it("does not repeat itself when called again with its earlier statements", async () => {
        const first = await source.generate({
            conversationTitle: "Night buses",
            conversationBody: "",
            existingStatements: [],
            targetCount: 3,
        });
        expect(first.success).toBe(true);
        if (!first.success) {
            return;
        }
        const second = await source.generate({
            conversationTitle: "Night buses",
            conversationBody: "",
            existingStatements: first.answer.statements,
            targetCount: 3,
        });
        expect(second.success).toBe(true);
        if (!second.success) {
            return;
        }

        for (const statement of second.answer.statements) {
            expect(first.answer.statements).not.toContain(statement);
        }
    });

    it("selects the other cases from a keyword in the title", async () => {
        const notConfident = await source.generate({
            conversationTitle: "Discussion simulate:not-confident",
            conversationBody: "",
            existingStatements: [],
            targetCount: 3,
        });
        expect(notConfident).toMatchObject({
            success: true,
            answer: { confidence: false, statements: [] },
        });

        const failure = await source.generate({
            conversationTitle: "Discussion SIMULATE:FAILURE",
            conversationBody: "",
            existingStatements: [],
            targetCount: 3,
        });
        expect(failure).toMatchObject({
            success: false,
            reason: "model_failure",
        });

        const slow = await source.generate({
            conversationTitle: "Discussion simulate:slow",
            conversationBody: "",
            existingStatements: [],
            targetCount: 3,
        });
        expect(slow.success).toBe(true);
    });
});

describe("generateSeedSuggestions", () => {
    const source = createSimulatedSeedSuggestionSource({ slowDelayMs: 1 });

    it("returns suggestions with identifiers that fit the response schema", async () => {
        const result = await generateSeedSuggestions({
            source,
            request: buildRequest(),
        });

        expect(result.success).toBe(true);
        if (!result.success) {
            return;
        }
        expect(
            Dto.generateSeedSuggestionsResponse.safeParse(result.response)
                .success,
        ).toBe(true);
        expect(result.response.confident).toBe(true);
        if (!result.response.confident) {
            return;
        }
        expect(result.response.suggestions).toHaveLength(3);
        expect(
            new Set(
                result.response.suggestions.map(
                    (suggestion) => suggestion.suggestionId,
                ),
            ).size,
        ).toBe(3);
    });

    it("returns only the tip when the model is not confident", async () => {
        const result = await generateSeedSuggestions({
            source,
            request: buildRequest({
                conversationTitle: "Discussion simulate:not-confident",
            }),
        });

        expect(result.success).toBe(true);
        if (!result.success) {
            return;
        }
        expect(result.response.confident).toBe(false);
        expect(result.response).not.toHaveProperty("suggestions");
        expect(
            Dto.generateSeedSuggestionsResponse.safeParse(result.response)
                .success,
        ).toBe(true);
    });

    it("reports a failure without a response", async () => {
        const result = await generateSeedSuggestions({
            source,
            request: buildRequest({
                conversationTitle: "Discussion simulate:failure",
            }),
        });

        expect(result).toMatchObject({
            success: false,
            reason: "model_failure",
        });
    });

    it("drops statements that are empty, too long or already on the page", async () => {
        const existing = "Night buses should run every 30 minutes.";
        const result = await generateSeedSuggestions({
            source: sourceAnswering({
                success: true,
                answer: {
                    confidence: true,
                    userFeedback: "A tip that must not be returned.",
                    statements: [
                        "   ",
                        "x".repeat(281),
                        "  night buses should run   every 30 minutes. ",
                        "Night buses should also run on weekdays.",
                    ],
                },
            }),
            request: buildRequest({ existingStatements: [existing] }),
        });

        expect(result.success).toBe(true);
        if (!result.success || !result.response.confident) {
            return;
        }
        expect(
            result.response.suggestions.map((suggestion) => suggestion.text),
        ).toEqual(["Night buses should also run on weekdays."]);
        expect(result.response).not.toHaveProperty("tip");
    });

    it("keeps at most three statements", async () => {
        const result = await generateSeedSuggestions({
            source: sourceAnswering({
                success: true,
                answer: {
                    confidence: true,
                    userFeedback: "",
                    statements: ["One.", "Two.", "Three.", "Four."],
                },
            }),
            request: buildRequest(),
        });

        expect(result.success).toBe(true);
        if (!result.success || !result.response.confident) {
            return;
        }
        expect(result.response.suggestions).toHaveLength(3);
    });

    it("fails when no statement passes the checks", async () => {
        const result = await generateSeedSuggestions({
            source: sourceAnswering({
                success: true,
                answer: {
                    confidence: true,
                    userFeedback: "",
                    statements: ["", "x".repeat(300)],
                },
            }),
            request: buildRequest(),
        });

        expect(result).toMatchObject({
            success: false,
            reason: "invalid_answer",
        });
    });

    it("fails when the model is not confident and gives no tip", async () => {
        const result = await generateSeedSuggestions({
            source: sourceAnswering({
                success: true,
                answer: {
                    confidence: false,
                    userFeedback: "  ",
                    statements: ["A statement that must never be shown."],
                },
            }),
            request: buildRequest(),
        });

        expect(result).toMatchObject({
            success: false,
            reason: "invalid_answer",
        });
    });

    it("never returns the statements of a not-confident answer", async () => {
        const result = await generateSeedSuggestions({
            source: sourceAnswering({
                success: true,
                answer: {
                    confidence: false,
                    userFeedback: "Say which neighbourhood this is about.",
                    statements: ["A statement that must never be shown."],
                },
            }),
            request: buildRequest(),
        });

        expect(result.success).toBe(true);
        if (!result.success) {
            return;
        }
        expect(JSON.stringify(result.response)).not.toContain(
            "must never be shown",
        );
    });

    it("refuses a description longer than a published one may be, without calling the model", async () => {
        let called = false;
        const result = await generateSeedSuggestions({
            source: {
                name: "simulated",
                modelId: "test",
                generate: () => {
                    called = true;
                    return Promise.resolve({
                        success: true,
                        answer: {
                            confidence: true,
                            userFeedback: "",
                            statements: ["One."],
                        },
                    });
                },
            },
            request: buildRequest({
                conversationBody: `<p>${"x".repeat(MAX_LENGTH_CONVERSATION_BODY + 1)}</p>`,
            }),
        });

        expect(result).toMatchObject({
            success: false,
            reason: "description_too_long",
        });
        expect(called).toBe(false);
    });

    it("gives the model the description as plain text", async () => {
        const seen: string[] = [];
        const source: SeedSuggestionSource = {
            name: "simulated",
            modelId: "test",
            generate: (input) => {
                seen.push(input.conversationBody);
                return Promise.resolve({
                    success: true,
                    answer: {
                        confidence: true,
                        userFeedback: "",
                        statements: ["One."],
                    },
                });
            },
        };

        await generateSeedSuggestions({ source, request: buildRequest() });

        expect(seen).toEqual(["Which priorities for the new night bus lines?"]);
    });
});

describe("createSeedSuggestionSource", () => {
    it("builds the source named in the settings", () => {
        expect(createSeedSuggestionSource(settings).name).toBe("simulated");
        expect(
            createSeedSuggestionSource({ ...settings, source: "bedrock" }),
        ).toMatchObject({
            name: "bedrock",
            modelId: "mistral.mistral-large-3-675b-instruct",
        });
    });
});

describe("createSeedSuggestionRateLimiter", () => {
    it("allows five generations per minute per user, then refuses", () => {
        let currentTime = 0;
        const limiter = createSeedSuggestionRateLimiter({
            now: () => currentTime,
        });

        for (let press = 0; press < 5; press += 1) {
            expect(limiter.consume("user-a")).toEqual({ isAllowed: true });
            currentTime += 1000;
        }
        expect(limiter.consume("user-a")).toEqual({
            isAllowed: false,
            retryAfterMs: 55_000,
        });
        expect(limiter.consume("user-b")).toEqual({ isAllowed: true });
    });

    it("allows again once the oldest generation leaves the window", () => {
        let currentTime = 0;
        const limiter = createSeedSuggestionRateLimiter({
            maxRequests: 2,
            windowMs: 1000,
            now: () => currentTime,
        });

        limiter.consume("user-a");
        limiter.consume("user-a");
        expect(limiter.consume("user-a").isAllowed).toBe(false);
        currentTime = 1001;
        expect(limiter.consume("user-a").isAllowed).toBe(true);
    });
});

describe("formatSeedSuggestionEvent", () => {
    it("writes one marked line that can be parsed back", () => {
        const line = formatSeedSuggestionEvent({
            event: "added",
            userId: "user-a",
            draftId: "draft-1",
            generationId: "generation-1",
            suggestionId: "suggestion-1",
        });

        expect(line.startsWith("AGORA_AI_SUGGESTION_EVENT {")).toBe(true);
        expect(line).not.toContain("\n");
        const parsed: unknown = JSON.parse(
            line.slice("AGORA_AI_SUGGESTION_EVENT ".length),
        );
        expect(parsed).toMatchObject({
            event: "added",
            suggestionId: "suggestion-1",
        });
    });
});
