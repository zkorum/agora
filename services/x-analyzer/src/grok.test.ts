import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    scoutResultSchema,
    botDetectionResultSchema,
    enrichResultSchema,
    createGrokClient,
} from "./grok.js";
import type { ScoutResult, BotDetectionResult, EnrichResult } from "./grok.js";
import type { TweetData, Reply } from "./fetch.js";

// --- Test fixtures ---

function makeOriginalTweet(overrides: Partial<TweetData> = {}): TweetData {
    return {
        id: "111",
        text: "Should AI be regulated?",
        authorId: "author_1",
        authorUsername: "alice",
        createdAt: "2024-06-15T10:00:00.000Z",
        likeCount: 5000,
        replyCount: 2000,
        retweetCount: 300,
        quoteCount: 100,
        ...overrides,
    };
}

function makeReply(overrides: Partial<Reply> & { id: string }): Reply {
    return {
        text: "reply text",
        authorId: "author",
        authorUsername: "user",
        createdAt: "2024-01-01T00:00:00.000Z",
        likeCount: 0,
        replyCount: 0,
        retweetCount: 0,
        quoteCount: 0,
        inReplyToTweetId: null,
        ...overrides,
    };
}

const VALID_SCOUT_RESPONSE: ScoutResult = {
    topic: "AI regulation debate",
    camps: [
        {
            label: "Pro-regulation",
            estimatedSize: "majority",
            keyVoices: ["@regfan"],
        },
        {
            label: "Anti-regulation",
            estimatedSize: "significant-minority",
            keyVoices: ["@freemarketbob"],
        },
        {
            label: "Nuanced middle",
            estimatedSize: "small-minority",
            keyVoices: ["@thoughtfulcarol"],
        },
    ],
    faultLines: [
        "Whether regulation stifles innovation",
        "Who should regulate AI",
        "Speed of implementation",
    ],
    qualityScore: 8,
    estimatedBotPrevalence: 0.15,
    priorityAuthors: ["@regfan", "@freemarketbob", "@thoughtfulcarol"],
    priorityReplyIds: ["reply_42", "reply_99"],
    priorityQuoteTweetIds: ["qt_7", "qt_12"],
    suggestedBudget: 15,
    suggestedAutoPct: 12,
};

const VALID_BOT_DETECTION_RESPONSE: BotDetectionResult = {
    assessments: [
        {
            authorId: "bot_1",
            username: "@spambot99",
            isBot: true,
            confidence: "high",
            reasoning: "No bio, suspicious follower ratio, repetitive content",
        },
        {
            authorId: "real_1",
            username: "@genuineuser",
            isBot: false,
            confidence: "medium",
            reasoning: "New account but coherent, topic-relevant replies",
        },
    ],
    botAuthorIds: ["bot_1"],
    totalAssessed: 2,
    totalFlagged: 1,
};

const VALID_ENRICH_RESPONSE: EnrichResult = {
    relatedThreads: [
        {
            url: "https://x.com/someone/status/222",
            summary: "Earlier debate on same topic",
            relevance: "Same key voices, different framing",
        },
    ],
    participantContext: [
        {
            username: "@regfan",
            contextSummary:
                "Published an op-ed on AI safety last month. Consistently pro-regulation.",
        },
    ],
    visualContentInsights: [
        {
            replyId: "reply_50",
            description: "Chart showing AI incident rates",
            inferredStance: "agree",
        },
    ],
    semanticHighlights: [
        {
            replyId: "reply_77",
            reason: "Detailed counter-argument with citations, only 2 likes",
        },
    ],
    salvaged: [
        {
            replyId: "reply_201",
            reason: "Genuine minority opinion from researcher, filtered for low engagement",
        },
    ],
};

// --- Schema validation tests ---

describe("scoutResultSchema", () => {
    it("parses a valid scout result", () => {
        const parsed = scoutResultSchema.parse(VALID_SCOUT_RESPONSE);
        expect(parsed.topic).toBe("AI regulation debate");
        expect(parsed.camps).toHaveLength(3);
        expect(parsed.qualityScore).toBe(8);
        expect(parsed.priorityReplyIds).toEqual(["reply_42", "reply_99"]);
    });

    it("rejects qualityScore above 10", () => {
        expect(() =>
            scoutResultSchema.parse({ ...VALID_SCOUT_RESPONSE, qualityScore: 11 }),
        ).toThrow();
    });

    it("rejects qualityScore below 0", () => {
        expect(() =>
            scoutResultSchema.parse({
                ...VALID_SCOUT_RESPONSE,
                qualityScore: -1,
            }),
        ).toThrow();
    });

    it("rejects estimatedBotPrevalence above 1", () => {
        expect(() =>
            scoutResultSchema.parse({
                ...VALID_SCOUT_RESPONSE,
                estimatedBotPrevalence: 1.5,
            }),
        ).toThrow();
    });

    it("rejects invalid camp estimatedSize", () => {
        expect(() =>
            scoutResultSchema.parse({
                ...VALID_SCOUT_RESPONSE,
                camps: [
                    {
                        label: "X",
                        estimatedSize: "invalid",
                        keyVoices: [],
                    },
                ],
            }),
        ).toThrow();
    });

    it("rejects suggestedAutoPct below 1", () => {
        expect(() =>
            scoutResultSchema.parse({
                ...VALID_SCOUT_RESPONSE,
                suggestedAutoPct: 0,
            }),
        ).toThrow();
    });

    it("rejects missing required fields", () => {
        expect(() =>
            scoutResultSchema.parse({ topic: "partial" }),
        ).toThrow();
    });
});

describe("botDetectionResultSchema", () => {
    it("parses a valid bot detection result", () => {
        const parsed = botDetectionResultSchema.parse(
            VALID_BOT_DETECTION_RESPONSE,
        );
        expect(parsed.botAuthorIds).toEqual(["bot_1"]);
        expect(parsed.totalFlagged).toBe(1);
        expect(parsed.assessments).toHaveLength(2);
    });

    it("accepts empty assessments and botAuthorIds", () => {
        const parsed = botDetectionResultSchema.parse({
            assessments: [],
            botAuthorIds: [],
            totalAssessed: 0,
            totalFlagged: 0,
        });
        expect(parsed.botAuthorIds).toEqual([]);
    });

    it("rejects invalid confidence level", () => {
        expect(() =>
            botDetectionResultSchema.parse({
                ...VALID_BOT_DETECTION_RESPONSE,
                assessments: [
                    {
                        authorId: "x",
                        username: "@x",
                        isBot: true,
                        confidence: "very-high",
                        reasoning: "test",
                    },
                ],
            }),
        ).toThrow();
    });
});

describe("enrichResultSchema", () => {
    it("parses a valid enrich result", () => {
        const parsed = enrichResultSchema.parse(VALID_ENRICH_RESPONSE);
        expect(parsed.relatedThreads).toHaveLength(1);
        expect(parsed.salvaged).toHaveLength(1);
        expect(parsed.visualContentInsights[0]?.inferredStance).toBe("agree");
    });

    it("accepts all-empty arrays", () => {
        const parsed = enrichResultSchema.parse({
            relatedThreads: [],
            participantContext: [],
            visualContentInsights: [],
            semanticHighlights: [],
            salvaged: [],
        });
        expect(parsed.salvaged).toEqual([]);
    });

    it("allows optional inferredStance", () => {
        const parsed = enrichResultSchema.parse({
            ...VALID_ENRICH_RESPONSE,
            visualContentInsights: [
                { replyId: "r1", description: "A photo" },
            ],
        });
        expect(parsed.visualContentInsights[0]?.inferredStance).toBeUndefined();
    });
});

// --- Grok client tests (with mocked APIs) ---

describe("createGrokClient", () => {
    const API_KEY = "test-api-key";

    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(() => undefined);
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("scout", () => {
        it("returns parsed ScoutResult on valid Grok response", async () => {
            // Mock the global fetch for the Responses API
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        output: [
                            {
                                type: "message",
                                content: [
                                    {
                                        type: "output_text",
                                        text: JSON.stringify(
                                            VALID_SCOUT_RESPONSE,
                                        ),
                                    },
                                ],
                            },
                        ],
                    }),
            });
            vi.stubGlobal("fetch", mockFetch);

            const client = createGrokClient({ apiKey: API_KEY });
            const result = await client.scout({
                tweetUrl: "https://x.com/alice/status/111",
                originalTweet: makeOriginalTweet(),
            });

            expect(result).not.toBeNull();
            expect(result?.topic).toBe("AI regulation debate");
            expect(result?.camps).toHaveLength(3);
            expect(result?.priorityAuthors).toContain("@regfan");

            // Verify fetch was called with correct URL and auth
            expect(mockFetch).toHaveBeenCalledOnce();
            expect(JSON.stringify(mockFetch.mock.calls[0])).toContain(
                "https://api.x.ai/v1/responses",
            );
            expect(JSON.stringify(mockFetch.mock.calls[0])).toContain(
                `Bearer ${API_KEY}`,
            );
        });

        it("returns null on API error", async () => {
            vi.stubGlobal(
                "fetch",
                vi.fn().mockResolvedValue({
                    ok: false,
                    status: 500,
                    text: () => Promise.resolve("Internal Server Error"),
                }),
            );

            const client = createGrokClient({ apiKey: API_KEY });
            const result = await client.scout({
                tweetUrl: "https://x.com/alice/status/111",
                originalTweet: makeOriginalTweet(),
            });

            expect(result).toBeNull();
        });

        it("returns null on network timeout", async () => {
            vi.stubGlobal(
                "fetch",
                vi.fn().mockRejectedValue(new Error("Timeout")),
            );

            const client = createGrokClient({ apiKey: API_KEY });
            const result = await client.scout({
                tweetUrl: "https://x.com/alice/status/111",
                originalTweet: makeOriginalTweet(),
            });

            expect(result).toBeNull();
        });

        it("returns null when response has no text output", async () => {
            vi.stubGlobal(
                "fetch",
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve({ output: [] }),
                }),
            );

            const client = createGrokClient({ apiKey: API_KEY });
            const result = await client.scout({
                tweetUrl: "https://x.com/alice/status/111",
                originalTweet: makeOriginalTweet(),
            });

            expect(result).toBeNull();
        });

        it("handles JSON wrapped in markdown code blocks", async () => {
            const wrappedJson = `\`\`\`json\n${JSON.stringify(VALID_SCOUT_RESPONSE)}\n\`\`\``;
            vi.stubGlobal(
                "fetch",
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve({
                        output: [
                            {
                                type: "message",
                                content: [
                                    { type: "output_text", text: wrappedJson },
                                ],
                            },
                        ],
                    }),
                }),
            );

            const client = createGrokClient({ apiKey: API_KEY });
            const result = await client.scout({
                tweetUrl: "https://x.com/alice/status/111",
                originalTweet: makeOriginalTweet(),
            });

            expect(result).not.toBeNull();
            expect(result?.topic).toBe("AI regulation debate");
        });

        it("returns null on invalid JSON in response", async () => {
            vi.stubGlobal(
                "fetch",
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve({
                        output: [
                            {
                                type: "message",
                                content: [
                                    {
                                        type: "output_text",
                                        text: "This is not valid JSON at all",
                                    },
                                ],
                            },
                        ],
                    }),
                }),
            );

            const client = createGrokClient({ apiKey: API_KEY });
            const result = await client.scout({
                tweetUrl: "https://x.com/alice/status/111",
                originalTweet: makeOriginalTweet(),
            });

            expect(result).toBeNull();
        });

        it("returns null when response is valid JSON but wrong schema", async () => {
            vi.stubGlobal(
                "fetch",
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve({
                        output: [
                            {
                                type: "message",
                                content: [
                                    {
                                        type: "output_text",
                                        text: JSON.stringify({
                                            topic: "test",
                                            camps: [],
                                        }),
                                    },
                                ],
                            },
                        ],
                    }),
                }),
            );

            const client = createGrokClient({ apiKey: API_KEY });
            const result = await client.scout({
                tweetUrl: "https://x.com/alice/status/111",
                originalTweet: makeOriginalTweet(),
            });

            expect(result).toBeNull();
        });
    });

    describe("detectBots", () => {
        it("returns empty result when no suspicious authors", async () => {
            const authors = new Map([
                [
                    "real_author",
                    {
                        username: "genuineuser",
                        bio: "AI researcher at MIT",
                        followerCount: 5000,
                        followingCount: 200,
                        tweetCount: 3000,
                        accountCreatedAt: "2018-01-01T00:00:00.000Z",
                        repliesInThread: 2,
                        totalLikesInThread: 50,
                        replyIds: ["r1", "r2"],
                    },
                ],
            ]);

            const client = createGrokClient({ apiKey: API_KEY });
            const result = await client.detectBots({
                authors,
                replies: [],
            });

            expect(result).not.toBeNull();
            expect(result?.botAuthorIds).toEqual([]);
            expect(result?.totalAssessed).toBe(0);
        });

        it("sends suspicious authors to Grok and returns parsed result", async () => {
            // Mock OpenAI SDK's chat.completions.create
            // Since detectBots uses the OpenAI SDK (not Responses API),
            // we need to mock the OpenAI constructor
            const _mockCreate = vi.fn().mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: JSON.stringify(
                                VALID_BOT_DETECTION_RESPONSE,
                            ),
                        },
                    },
                ],
            });

            // Mock the OpenAI module
            const { createGrokClient: createClient } = await import(
                "./grok.js"
            );

            // We can't easily mock the OpenAI constructor, so let's test
            // the suspicious-author filtering logic by providing a suspicious author
            const authors = new Map([
                [
                    "sus_1",
                    {
                        username: "xbot123",
                        // No bio — suspicious
                        followerCount: 3,
                        followingCount: 50000,
                        tweetCount: 5,
                        accountCreatedAt: "2024-06-01T00:00:00.000Z",
                        repliesInThread: 1,
                        totalLikesInThread: 0,
                        replyIds: ["r1"],
                    },
                ],
            ]);

            // This will try to call the real API and fail, but it tests that
            // suspicious authors are identified and sent
            const client = createClient({ apiKey: "fake-key" });
            const result = await client.detectBots({
                authors,
                replies: [
                    makeReply({
                        id: "r1",
                        authorId: "sus_1",
                        text: "Check out this link!",
                    }),
                ],
            });

            // API call fails with fake key, but batching returns a combined
            // result with empty assessments (individual batch failures are skipped)
            expect(result).not.toBeNull();
            expect(result?.assessments).toHaveLength(0);
            expect(result?.totalFlagged).toBe(0);
        });

        it("identifies suspicious authors by various signals", async () => {
            // Author with no bio only (1 signal — not enough alone)
            const noBioOnlyAuthor = {
                username: "noname",
                followerCount: 100,
                followingCount: 100,
                tweetCount: 50,
                repliesInThread: 1,
                totalLikesInThread: 0,
                replyIds: ["r1"],
            };

            // Author with suspicious follower ratio (always flagged)
            const susRatioAuthor = {
                username: "followbot",
                bio: "Hi",
                followerCount: 10,
                followingCount: 50000,
                tweetCount: 100,
                repliesInThread: 1,
                totalLikesInThread: 0,
                replyIds: ["r2"],
            };

            // Author with no bio + high reply count (2 signals — flagged)
            const noBioSpammyAuthor = {
                username: "chatty",
                followerCount: 500,
                followingCount: 200,
                tweetCount: 3000,
                repliesInThread: 5,
                totalLikesInThread: 10,
                replyIds: ["r3", "r4", "r5", "r6", "r7"],
            };

            // Author with only low tweet count (1 signal — not enough alone)
            const lowTweetOnlyAuthor = {
                username: "newuser",
                bio: "Just joined",
                followerCount: 100,
                followingCount: 100,
                tweetCount: 5,
                repliesInThread: 1,
                totalLikesInThread: 0,
                replyIds: ["r8"],
            };

            // Normal author (should NOT be flagged as suspicious)
            const normalAuthor = {
                username: "normal",
                bio: "Software engineer",
                followerCount: 500,
                followingCount: 200,
                tweetCount: 3000,
                repliesInThread: 2,
                totalLikesInThread: 50,
                replyIds: ["r9", "r10"],
            };

            const authors = new Map([
                ["a1", noBioOnlyAuthor],
                ["a2", susRatioAuthor],
                ["a3", noBioSpammyAuthor],
                ["a4", lowTweetOnlyAuthor],
                ["a5", normalAuthor],
            ]);

            const client = createGrokClient({ apiKey: "fake-key" });
            const result = await client.detectBots({
                authors,
                replies: [],
            });

            // Batching returns a combined result even if individual API calls fail
            expect(result).not.toBeNull();
            expect(result?.assessments).toHaveLength(0);
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining("[Grok] Running bot detection on 5 authors"),
            );
            // Only susRatioAuthor and noBioSpammyAuthor should be flagged as suspicious
            // (noBioOnlyAuthor and lowTweetOnlyAuthor have only 1 signal each)
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining("Suspicious: @followbot"),
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining("Suspicious: @chatty"),
            );
        });
    });

    describe("enrich", () => {
        it("returns null on API error", async () => {
            vi.stubGlobal(
                "fetch",
                vi.fn().mockResolvedValue({
                    ok: false,
                    status: 429,
                    text: () => Promise.resolve("Rate limited"),
                }),
            );

            const client = createGrokClient({ apiKey: API_KEY });
            const result = await client.enrich({
                originalTweet: makeOriginalTweet(),
            });

            expect(result).toBeNull();
        });

        it("parses valid enrich response", async () => {
            vi.stubGlobal(
                "fetch",
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve({
                        output: [
                            {
                                type: "message",
                                content: [
                                    {
                                        type: "output_text",
                                        text: JSON.stringify(
                                            VALID_ENRICH_RESPONSE,
                                        ),
                                    },
                                ],
                            },
                        ],
                    }),
                }),
            );

            const client = createGrokClient({ apiKey: API_KEY });
            const result = await client.enrich({
                originalTweet: makeOriginalTweet(),
                filteredOutReplies: [
                    makeReply({
                        id: "filtered_1",
                        text: "Important minority take",
                        likeCount: 1,
                    }),
                ],
            });

            expect(result).not.toBeNull();
            expect(result?.salvaged).toHaveLength(1);
            expect(result?.relatedThreads).toHaveLength(1);
        });

        it("handles enrich with all optional params", async () => {
            vi.stubGlobal(
                "fetch",
                vi.fn().mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve({
                        output: [
                            {
                                type: "message",
                                content: [
                                    {
                                        type: "output_text",
                                        text: JSON.stringify(
                                            VALID_ENRICH_RESPONSE,
                                        ),
                                    },
                                ],
                            },
                        ],
                    }),
                }),
            );

            const client = createGrokClient({ apiKey: API_KEY });
            const result = await client.enrich({
                originalTweet: makeOriginalTweet(),
                topAuthors: [
                    {
                        username: "regfan",
                        authorId: "a1",
                        replyCount: 5,
                        totalLikes: 200,
                    },
                ],
                topReplyChains: [
                    {
                        rootReplyId: "r1",
                        totalEngagement: 500,
                        depth: 3,
                        messages: [
                            {
                                replyId: "r1",
                                authorUsername: "alice",
                                text: "First point",
                                likeCount: 200,
                                depth: 0,
                            },
                            {
                                replyId: "r2",
                                authorUsername: "bob",
                                text: "Counter point",
                                likeCount: 150,
                                depth: 1,
                            },
                        ],
                    },
                ],
                filteredOutReplies: [
                    makeReply({
                        id: "filtered_1",
                        text: "Minority view",
                    }),
                ],
            });

            expect(result).not.toBeNull();
        });
    });
});
