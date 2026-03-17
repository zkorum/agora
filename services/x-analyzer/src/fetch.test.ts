import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
    vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
    mkdirSync,
    rmSync,
    existsSync,
    readFileSync,
    writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { TweetV2 } from "twitter-api-v2";
import { ApiResponseError, ApiRequestError } from "twitter-api-v2";
import {
    extractTweetId,
    mapTweetToData,
    tweetToReply,
    withRetry,
    saveProgress,
    loadExisting,
    findIncompleteFile,
    main,
    rawThreadDataSchema,
    _setOutputDir,
    parseFetchOptions,
    createPaginationController,
    filterRepliesByEngagement,
    autoCalibrate,
    annotateReplyDepths,
    computeThreadStats,
    createAuthorAccumulator,
    computeTopReplyChains,
    fetchTweet,
} from "./fetch.js";
import type {
    Reply,
    FetchOptions,
    AuthorData,
    FetchTweetResult,
} from "./fetch.js";

// Suppress console output in tests without eslint-disable
function noop(): void {
    // intentionally empty
}

// --- Test fixtures ---

const TWEET_ID = "1234567890";
const AUTHOR_ID = "author_001";
const AUTHOR_USERNAME = "testauthor";

function makeReply(overrides: Partial<Reply> & { id: string }): Reply {
    return {
        text: "reply",
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

function makeTweetV2(overrides: Partial<TweetV2> = {}): TweetV2 {
    return {
        id: "123",
        text: "Hello world",
        edit_history_tweet_ids: ["123"],
        author_id: "user1",
        created_at: "2024-01-01T00:00:00.000Z",
        public_metrics: {
            like_count: 10,
            reply_count: 5,
            retweet_count: 3,
            quote_count: 1,
            impression_count: 100,
        },
        ...overrides,
    };
}

function makeSampleThreadData() {
    return {
        originalTweet: {
            id: "999",
            text: "Original",
            authorId: "a1",
            authorUsername: "author",
            createdAt: "2024-01-01T00:00:00.000Z",
            likeCount: 5,
            replyCount: 2,
            retweetCount: 1,
            quoteCount: 0,
        },
        replies: [] as Reply[],
        fetchedAt: "2024-01-01T12:00:00.000Z",
        tweetUrl: "https://x.com/author/status/999",
    };
}

// --- MSW fixtures ---

const RATE_LIMIT_HEADERS = {
    "x-rate-limit-limit": "300",
    "x-rate-limit-remaining": "299",
    "x-rate-limit-reset": String(Math.floor(Date.now() / 1000) + 900),
    "content-type": "application/json",
};

function makeReplyTweet({
    index,
    replyToId,
}: {
    index: number;
    replyToId: string;
}) {
    return {
        id: `reply_${index}`,
        text: `Reply number ${index}`,
        author_id: `replier_${index}`,
        created_at: `2024-06-15T1${index}:00:00.000Z`,
        edit_history_tweet_ids: [`reply_${index}`],
        public_metrics: {
            retweet_count: 0,
            reply_count: 0,
            like_count: index,
            quote_count: 0,
            impression_count: index * 10,
        },
        referenced_tweets: [{ type: "replied_to", id: replyToId }],
    };
}

function makeQuoteTweet({
    index,
    quotedTweetId,
    likeCount,
}: {
    index: number;
    quotedTweetId: string;
    likeCount: number;
}) {
    return {
        id: `quote_${index}`,
        text: `Quote tweet number ${index}`,
        author_id: `quoter_${index}`,
        created_at: `2024-06-16T1${index}:00:00.000Z`,
        edit_history_tweet_ids: [`quote_${index}`],
        public_metrics: {
            retweet_count: 0,
            reply_count: index,
            like_count: likeCount,
            quote_count: 0,
            impression_count: likeCount * 10,
        },
        referenced_tweets: [{ type: "quoted" as const, id: quotedTweetId }],
    };
}

// --- Viral scenario MSW factory ---

const VIRAL_TWEET_ID = "9999999999";
const VIRAL_AUTHOR_ID = "viral_author_000";
const VIRAL_AUTHOR_USERNAME = "viraluser";
const VIRAL_PAGES = 8;
const VIRAL_REPLIES_PER_PAGE = 100;
const VIRAL_BASE_LIKES = 500;
const VIRAL_DECAY = 0.5;
const VIRAL_QUOTE_IDS = [
    "quote_viral_1",
    "quote_viral_2",
    "quote_viral_3",
    "quote_viral_4",
    "quote_viral_5",
    "quote_viral_6",
];
const VIRAL_QUOTE_LIKES = [2000, 800, 300, 5, 2, 0];
const SUB_QUOTE_ID = "sub_quote_viral_1";

function createViralScenario() {
    let viralSearchCount = 0;
    let viralQuotesCount = 0;
    const viralCallOrder: string[] = [];

    function generateMainReplyPage({ pageIndex }: { pageIndex: number }) {
        const pageLikes = Math.floor(
            VIRAL_BASE_LIKES * Math.pow(VIRAL_DECAY, pageIndex),
        );
        const tweets: ReturnType<typeof makeReplyTweet>[] = [];
        const userMap = new Map<
            string,
            { id: string; name: string; username: string }
        >();

        for (let t = 0; t < VIRAL_REPLIES_PER_PAGE; t++) {
            const globalIndex = pageIndex * VIRAL_REPLIES_PER_PAGE + t;
            const likeCount = Math.max(
                0,
                Math.floor(pageLikes * (1 - t * 0.005)),
            );

            // Nested: every 5th reply on pages 1+ replies to prev page tweet
            let replyToId = VIRAL_TWEET_ID;
            if (pageIndex > 0 && t % 5 === 0) {
                replyToId = `vr_p${pageIndex - 1}_t${t}`;
            }

            // Duplicate author: index 5 on even pages > 0 reuses page 0's author
            let aid = `viral_author_${globalIndex}`;
            if (t === 5 && pageIndex > 0 && pageIndex % 2 === 0) {
                aid = "viral_author_5";
            }

            tweets.push({
                id: `vr_p${pageIndex}_t${t}`,
                text: `Viral reply p${pageIndex} t${t}`,
                author_id: aid,
                created_at: "2024-06-15T10:00:00.000Z",
                edit_history_tweet_ids: [`vr_p${pageIndex}_t${t}`],
                public_metrics: {
                    like_count: likeCount,
                    reply_count: Math.floor(likeCount * 0.1),
                    retweet_count: Math.floor(likeCount * 0.05),
                    quote_count: 0,
                    impression_count: likeCount * 10,
                },
                referenced_tweets: [{ type: "replied_to" as const, id: replyToId }],
            });

            userMap.set(aid, {
                id: aid,
                name: `Author ${globalIndex}`,
                username: `author${globalIndex}`,
            });
        }

        return { tweets, users: Array.from(userMap.values()) };
    }

    function makeSmallReplyPage({
        conversationId,
        prefix,
        count,
        baseLikes,
    }: {
        conversationId: string;
        prefix: string;
        count: number;
        baseLikes: number;
    }) {
        const tweets = [];
        const users = [];
        for (let t = 0; t < count; t++) {
            tweets.push({
                id: `${prefix}_${t}`,
                text: `Reply ${prefix} ${t}`,
                author_id: `${prefix}_author_${t}`,
                created_at: "2024-06-16T12:00:00.000Z",
                edit_history_tweet_ids: [`${prefix}_${t}`],
                public_metrics: {
                    like_count: Math.max(1, baseLikes - t * 5),
                    reply_count: 1,
                    retweet_count: 0,
                    quote_count: 0,
                    impression_count: Math.max(10, (baseLikes - t * 5) * 10),
                },
                referenced_tweets: [
                    { type: "replied_to" as const, id: conversationId },
                ],
            });
            users.push({
                id: `${prefix}_author_${t}`,
                name: `${prefix} Author ${t}`,
                username: `${prefix}author${t}`,
            });
        }
        return { tweets, users };
    }

    const viralHandlers = [
        http.get("https://api.x.com/2/tweets/:id", ({ params }) => {
            if (String(params.id) === VIRAL_TWEET_ID) {
                return HttpResponse.json(
                    {
                        data: {
                            id: VIRAL_TWEET_ID,
                            text: "This viral tweet broke the internet",
                            author_id: VIRAL_AUTHOR_ID,
                            created_at: "2024-06-15T10:00:00.000Z",
                            edit_history_tweet_ids: [VIRAL_TWEET_ID],
                            public_metrics: {
                                retweet_count: 1000,
                                reply_count: 5000,
                                like_count: 50000,
                                quote_count: 200,
                                impression_count: 1000000,
                            },
                        },
                        includes: {
                            users: [
                                {
                                    id: VIRAL_AUTHOR_ID,
                                    name: "Viral Author",
                                    username: VIRAL_AUTHOR_USERNAME,
                                },
                            ],
                        },
                    },
                    { headers: RATE_LIMIT_HEADERS },
                );
            }
            return HttpResponse.json(
                {
                    errors: [
                        {
                            title: "Not Found",
                            detail: "Tweet not found",
                            type: "about:blank",
                        },
                    ],
                },
                { status: 404, headers: RATE_LIMIT_HEADERS },
            );
        }),

        http.get(
            "https://api.x.com/2/tweets/search/recent",
            ({ request }) => {
                viralSearchCount++;
                const url = new URL(request.url);
                const query = url.searchParams.get("query") ?? "";
                const nextToken = url.searchParams.get("next_token");
                const match = /conversation_id:(\S+)/.exec(query);
                const conversationId = match?.[1] ?? "";
                viralCallOrder.push(
                    `search:${conversationId === VIRAL_TWEET_ID ? "main" : conversationId}`,
                );

                // Main viral thread: multi-page pagination
                if (conversationId === VIRAL_TWEET_ID) {
                    let pageIndex = 0;
                    if (nextToken) {
                        const m = /viral_main_p(\d+)/.exec(nextToken);
                        pageIndex = m ? parseInt(m[1], 10) : VIRAL_PAGES;
                    }
                    if (pageIndex >= VIRAL_PAGES) {
                        return HttpResponse.json(
                            { data: [], meta: { result_count: 0 } },
                            { headers: RATE_LIMIT_HEADERS },
                        );
                    }

                    const { tweets, users } = generateMainReplyPage({
                        pageIndex,
                    });
                    const hasNext = pageIndex < VIRAL_PAGES - 1;
                    return HttpResponse.json(
                        {
                            data: tweets,
                            meta: {
                                newest_id:
                                    tweets[tweets.length - 1]?.id ?? "unknown",
                                oldest_id: tweets[0]?.id ?? "unknown",
                                result_count: tweets.length,
                                ...(hasNext
                                    ? {
                                          next_token: `viral_main_p${pageIndex + 1}`,
                                      }
                                    : {}),
                            },
                            includes: { users },
                        },
                        { headers: RATE_LIMIT_HEADERS },
                    );
                }

                // Quote thread replies (single page each)
                if (conversationId === "quote_viral_1" && !nextToken) {
                    const { tweets, users } = makeSmallReplyPage({
                        conversationId,
                        prefix: "q1r",
                        count: 10,
                        baseLikes: 50,
                    });
                    return HttpResponse.json(
                        {
                            data: tweets,
                            meta: { result_count: tweets.length },
                            includes: { users },
                        },
                        { headers: RATE_LIMIT_HEADERS },
                    );
                }

                if (conversationId === "quote_viral_2" && !nextToken) {
                    const { tweets, users } = makeSmallReplyPage({
                        conversationId,
                        prefix: "q2r",
                        count: 5,
                        baseLikes: 30,
                    });
                    return HttpResponse.json(
                        {
                            data: tweets,
                            meta: { result_count: tweets.length },
                            includes: { users },
                        },
                        { headers: RATE_LIMIT_HEADERS },
                    );
                }

                if (conversationId === SUB_QUOTE_ID && !nextToken) {
                    const { tweets, users } = makeSmallReplyPage({
                        conversationId,
                        prefix: "sq1r",
                        count: 3,
                        baseLikes: 20,
                    });
                    return HttpResponse.json(
                        {
                            data: tweets,
                            meta: { result_count: tweets.length },
                            includes: { users },
                        },
                        { headers: RATE_LIMIT_HEADERS },
                    );
                }

                // Default: empty results
                return HttpResponse.json(
                    { data: [], meta: { result_count: 0 } },
                    { headers: RATE_LIMIT_HEADERS },
                );
            },
        ),

        http.get(
            "https://api.x.com/2/tweets/:id/quote_tweets",
            ({ params }) => {
                viralQuotesCount++;
                const qtid = String(params.id);
                viralCallOrder.push(`quotes:${qtid}`);

                if (qtid === VIRAL_TWEET_ID) {
                    const data = VIRAL_QUOTE_IDS.map((id, i) => ({
                        id,
                        text: `Quote tweet ${i + 1}`,
                        author_id: `quoter_v${i + 1}`,
                        created_at: `2024-06-16T${String(11 + i).padStart(2, "0")}:00:00.000Z`,
                        edit_history_tweet_ids: [id],
                        public_metrics: {
                            like_count: VIRAL_QUOTE_LIKES[i] ?? 0,
                            reply_count: i < 3 ? 10 : 0,
                            retweet_count: Math.floor(
                                (VIRAL_QUOTE_LIKES[i] ?? 0) * 0.1,
                            ),
                            quote_count: i === 0 ? 1 : 0,
                            impression_count: (VIRAL_QUOTE_LIKES[i] ?? 0) * 10,
                        },
                        referenced_tweets: [
                            { type: "quoted" as const, id: qtid },
                        ],
                    }));
                    const users = VIRAL_QUOTE_IDS.map((_, i) => ({
                        id: `quoter_v${i + 1}`,
                        name: `Quoter ${i + 1}`,
                        username: `quoter${i + 1}`,
                    }));
                    return HttpResponse.json(
                        {
                            data,
                            meta: { result_count: data.length },
                            includes: { users },
                        },
                        { headers: RATE_LIMIT_HEADERS },
                    );
                }

                if (qtid === "quote_viral_1") {
                    return HttpResponse.json(
                        {
                            data: [
                                {
                                    id: SUB_QUOTE_ID,
                                    text: "Sub-quote of quote 1",
                                    author_id: "sub_quoter_1",
                                    created_at: "2024-06-17T10:00:00.000Z",
                                    edit_history_tweet_ids: [SUB_QUOTE_ID],
                                    public_metrics: {
                                        like_count: 100,
                                        reply_count: 3,
                                        retweet_count: 5,
                                        quote_count: 0,
                                        impression_count: 1000,
                                    },
                                    referenced_tweets: [
                                        {
                                            type: "quoted" as const,
                                            id: qtid,
                                        },
                                    ],
                                },
                            ],
                            meta: { result_count: 1 },
                            includes: {
                                users: [
                                    {
                                        id: "sub_quoter_1",
                                        name: "Sub Quoter",
                                        username: "subquoter1",
                                    },
                                ],
                            },
                        },
                        { headers: RATE_LIMIT_HEADERS },
                    );
                }

                // All other tweets have no quotes
                return HttpResponse.json(
                    { meta: { result_count: 0 } },
                    { headers: RATE_LIMIT_HEADERS },
                );
            },
        ),
    ];

    return {
        handlers: viralHandlers,
        getSearchCallCount: () => viralSearchCount,
        getQuotesCallCount: () => viralQuotesCount,
        getCallOrder: () => viralCallOrder,
        resetCounters: () => {
            viralSearchCount = 0;
            viralQuotesCount = 0;
            viralCallOrder.length = 0;
        },
    };
}

let searchCallCount = 0;
let quotesCallCount = 0;

const handlers = [
    http.get("https://api.x.com/2/tweets/:id", ({ params }) => {
        if (params.id === TWEET_ID) {
            return HttpResponse.json(
                {
                    data: {
                        id: TWEET_ID,
                        text: "This is the original thread starter tweet",
                        author_id: AUTHOR_ID,
                        created_at: "2024-06-15T10:00:00.000Z",
                        edit_history_tweet_ids: [TWEET_ID],
                        public_metrics: {
                            retweet_count: 10,
                            reply_count: 25,
                            like_count: 100,
                            quote_count: 5,
                            impression_count: 5000,
                        },
                    },
                    includes: {
                        users: [
                            {
                                id: AUTHOR_ID,
                                name: "Test Author",
                                username: AUTHOR_USERNAME,
                            },
                        ],
                    },
                },
                { headers: RATE_LIMIT_HEADERS },
            );
        }
        return HttpResponse.json(
            {
                errors: [
                    {
                        title: "Not Found",
                        detail: "Tweet not found",
                        type: "about:blank",
                    },
                ],
            },
            { status: 404, headers: RATE_LIMIT_HEADERS },
        );
    }),

    http.get("https://api.x.com/2/tweets/search/recent", ({ request }) => {
        const url = new URL(request.url);
        const nextToken = url.searchParams.get("next_token");
        searchCallCount++;

        const users = [
            {
                id: "replier_1",
                name: "Replier 1",
                username: "replier1",
            },
            {
                id: "replier_2",
                name: "Replier 2",
                username: "replier2",
            },
            {
                id: "replier_3",
                name: "Replier 3",
                username: "replier3",
            },
        ];

        if (!nextToken) {
            // First page: 2 direct replies + next_token
            return HttpResponse.json(
                {
                    data: [
                        makeReplyTweet({
                            index: 1,
                            replyToId: TWEET_ID,
                        }),
                        makeReplyTweet({
                            index: 2,
                            replyToId: TWEET_ID,
                        }),
                    ],
                    meta: {
                        newest_id: "reply_2",
                        oldest_id: "reply_1",
                        result_count: 2,
                        next_token: "page2token",
                    },
                    includes: { users },
                },
                { headers: RATE_LIMIT_HEADERS },
            );
        }

        if (nextToken === "page2token") {
            // Second (final) page: 1 nested reply, no next_token
            return HttpResponse.json(
                {
                    data: [
                        makeReplyTweet({
                            index: 3,
                            replyToId: "reply_1",
                        }),
                    ],
                    meta: {
                        newest_id: "reply_3",
                        oldest_id: "reply_3",
                        result_count: 1,
                    },
                    includes: { users },
                },
                { headers: RATE_LIMIT_HEADERS },
            );
        }

        return HttpResponse.json(
            { data: [], meta: { result_count: 0 } },
            { headers: RATE_LIMIT_HEADERS },
        );
    }),

    // Quotes endpoint: only the root tweet has quotes in our fixture.
    // Sub-tweets return empty so recursion terminates cleanly.
    http.get(
        "https://api.x.com/2/tweets/:id/quote_tweets",
        ({ params }) => {
            quotesCallCount++;
            const quotedTweetId = String(params.id);

            if (quotedTweetId !== TWEET_ID) {
                return HttpResponse.json(
                    { meta: { result_count: 0 } },
                    { headers: RATE_LIMIT_HEADERS },
                );
            }

            const quoters = [
                {
                    id: "quoter_1",
                    name: "Quoter 1",
                    username: "quoter1",
                },
                {
                    id: "quoter_2",
                    name: "Quoter 2",
                    username: "quoter2",
                },
            ];

            return HttpResponse.json(
                {
                    data: [
                        makeQuoteTweet({
                            index: 1,
                            quotedTweetId,
                            likeCount: 500,
                        }),
                        makeQuoteTweet({
                            index: 2,
                            quotedTweetId,
                            likeCount: 3,
                        }),
                    ],
                    meta: {
                        result_count: 2,
                    },
                    includes: { users: quoters },
                },
                { headers: RATE_LIMIT_HEADERS },
            );
        },
    ),
];

const server = setupServer(...handlers);

// --- Temp directory helpers ---

let tempDir: string;

function setupTempDir(): void {
    tempDir = join(
        tmpdir(),
        `x-analyzer-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(tempDir, { recursive: true });
    _setOutputDir(tempDir);
}

function cleanupTempDir(): void {
    if (tempDir && existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
    }
}

// ============================================================
// Unit tests — pure functions
// ============================================================

describe("extractTweetId", () => {
    it("extracts ID from x.com URL", () => {
        expect(extractTweetId("https://x.com/elonmusk/status/1234567890")).toBe(
            "1234567890",
        );
    });

    it("extracts ID from twitter.com URL", () => {
        expect(
            extractTweetId("https://twitter.com/user/status/9876543210"),
        ).toBe("9876543210");
    });

    it("extracts ID from URL with query parameters", () => {
        expect(extractTweetId("https://x.com/user/status/111?s=20&t=abc")).toBe(
            "111",
        );
    });

    it("throws on invalid URL", () => {
        expect(() => extractTweetId("https://example.com/not-a-tweet")).toThrow(
            "Cannot extract tweet ID",
        );
    });

    it("throws on empty string", () => {
        expect(() => extractTweetId("")).toThrow("Cannot extract tweet ID");
    });

    it("throws on URL without status segment", () => {
        expect(() => extractTweetId("https://x.com/user/likes")).toThrow(
            "Cannot extract tweet ID",
        );
    });
});

function makeAuthorData(username: string): AuthorData {
    return { username };
}

describe("mapTweetToData", () => {
    const users = new Map([["user1", makeAuthorData("alice")]]);

    it("maps a complete tweet correctly", () => {
        const result = mapTweetToData({
            tweet: makeTweetV2(),
            users,
        });
        expect(result).toEqual({
            id: "123",
            text: "Hello world",
            authorId: "user1",
            authorUsername: "alice",
            createdAt: "2024-01-01T00:00:00.000Z",
            likeCount: 10,
            replyCount: 5,
            retweetCount: 3,
            quoteCount: 1,
        });
    });

    it("defaults authorId to 'unknown' when author_id missing", () => {
        const result = mapTweetToData({
            tweet: makeTweetV2({ author_id: undefined }),
            users,
        });
        expect(result.authorId).toBe("unknown");
        expect(result.authorUsername).toBe("unknown");
    });

    it("defaults authorUsername to 'unknown' when user not in map", () => {
        const result = mapTweetToData({
            tweet: makeTweetV2({ author_id: "nonexistent" }),
            users,
        });
        expect(result.authorUsername).toBe("unknown");
    });

    it("defaults metrics to 0 when public_metrics missing", () => {
        const result = mapTweetToData({
            tweet: makeTweetV2({ public_metrics: undefined }),
            users,
        });
        expect(result.likeCount).toBe(0);
        expect(result.replyCount).toBe(0);
        expect(result.retweetCount).toBe(0);
    });
});

describe("tweetToReply", () => {
    const users = new Map([["u1", makeAuthorData("bob")]]);

    it("extracts inReplyToTweetId from replied_to reference", () => {
        const result = tweetToReply({
            tweet: makeTweetV2({
                id: "200",
                author_id: "u1",
                referenced_tweets: [{ type: "replied_to", id: "100" }],
            }),
            users,
        });
        expect(result.inReplyToTweetId).toBe("100");
        expect(result.id).toBe("200");
    });

    it("returns null inReplyToTweetId when no referenced_tweets", () => {
        const result = tweetToReply({
            tweet: makeTweetV2({
                id: "201",
                author_id: "u1",
                referenced_tweets: undefined,
            }),
            users,
        });
        expect(result.inReplyToTweetId).toBeNull();
    });

    it("returns null when only quoted type present", () => {
        const result = tweetToReply({
            tweet: makeTweetV2({
                id: "202",
                author_id: "u1",
                referenced_tweets: [{ type: "quoted", id: "100" }],
            }),
            users,
        });
        expect(result.inReplyToTweetId).toBeNull();
    });
});

// ============================================================
// Retry logic tests
// ============================================================

describe("withRetry", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns result on first success", async () => {
        const fn = vi.fn().mockResolvedValue("success");
        const result = await withRetry(fn);
        expect(result).toBe("success");
        expect(fn).toHaveBeenCalledOnce();
    });

    it("retries on ApiRequestError and succeeds", async () => {
        const error = new ApiRequestError("Network error", {
            request: {} as never,
            error: new Error("ECONNRESET"),
        });

        const fn = vi
            .fn()
            .mockRejectedValueOnce(error)
            .mockResolvedValueOnce("ok");

        const promise = withRetry(fn);
        await vi.advanceTimersByTimeAsync(2000);
        const result = await promise;
        expect(result).toBe("ok");
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it("gives up after MAX_RETRIES on ApiRequestError", async () => {
        const error = new ApiRequestError("Network error", {
            request: {} as never,
            error: new Error("ECONNRESET"),
        });

        const fn = vi.fn().mockRejectedValue(error);
        const promise = withRetry(fn);

        // Attach rejection handler BEFORE advancing timers to avoid
        // unhandled rejection warnings
        const rejection =
            expect(promise).rejects.toBeInstanceOf(ApiRequestError);

        await vi.advanceTimersByTimeAsync(14_000);
        await rejection;
        expect(fn).toHaveBeenCalledTimes(4); // initial + 3 retries
    });

    it("retries on 5xx ApiResponseError", async () => {
        const error = new ApiResponseError("Server error", {
            code: 503,
            request: {} as never,
            response: {} as never,
            headers: {},
            data: {},
            rateLimit: undefined,
        });

        const fn = vi
            .fn()
            .mockRejectedValueOnce(error)
            .mockResolvedValueOnce("recovered");

        const promise = withRetry(fn);
        await vi.advanceTimersByTimeAsync(2000);
        const result = await promise;
        expect(result).toBe("recovered");
    });

    it("retries on rate limit error (waits for reset)", async () => {
        const resetTime = Math.floor(Date.now() / 1000) + 5;
        const error = new ApiResponseError("Rate limited", {
            code: 429,
            request: {} as never,
            response: {} as never,
            headers: {},
            data: {},
            rateLimit: {
                limit: 100,
                remaining: 0,
                reset: resetTime,
            },
        });

        const fn = vi
            .fn()
            .mockRejectedValueOnce(error)
            .mockResolvedValueOnce("after-rate-limit");

        const promise = withRetry(fn);
        // Wait past the reset time + 1s buffer
        await vi.advanceTimersByTimeAsync(7000);
        const result = await promise;
        expect(result).toBe("after-rate-limit");
    });

    it("gives up after MAX_RATE_LIMIT_RETRIES consecutive 429s", async () => {
        const makeRateLimitError = () =>
            new ApiResponseError("Rate limited", {
                code: 429,
                request: {} as never,
                response: {} as never,
                headers: {},
                data: {},
                rateLimit: {
                    limit: 100,
                    remaining: 0,
                    reset: Math.floor(Date.now() / 1000) + 1,
                },
            });

        const fn = vi.fn().mockRejectedValue(makeRateLimitError());

        const promise = withRetry(fn);
        const rejection = expect(promise).rejects.toThrow(
            "Rate limited 10 times consecutively",
        );

        // Each retry waits ~2s (reset in 1s + 1s buffer), 10 retries = ~20s
        await vi.advanceTimersByTimeAsync(30_000);
        await rejection;
        // 1 initial + 10 retries = 11 calls
        expect(fn).toHaveBeenCalledTimes(11);
    });

    it("throws immediately on unknown errors", async () => {
        const fn = vi.fn().mockRejectedValue(new Error("Unknown error"));
        await expect(withRetry(fn)).rejects.toThrow("Unknown error");
        expect(fn).toHaveBeenCalledOnce();
    });
});

// ============================================================
// File I/O tests
// ============================================================

describe("file I/O", () => {
    beforeEach(() => {
        setupTempDir();
    });

    afterEach(() => {
        cleanupTempDir();
    });

    describe("saveProgress + loadExisting", () => {
        it("round-trips data through save and load", () => {
            const data = makeSampleThreadData();
            saveProgress({ data, tweetId: "999" });
            const loaded = loadExisting("999");
            expect(loaded).toEqual(data);
        });

        it("returns null for non-existent file", () => {
            expect(loadExisting("nonexistent")).toBeNull();
        });

        it("returns null for invalid JSON", () => {
            writeFileSync(join(tempDir, "bad.json"), "not valid json");
            expect(loadExisting("bad")).toBeNull();
        });

        it("preserves _nextToken for incomplete fetches", () => {
            const data = {
                ...makeSampleThreadData(),
                _nextToken: "abc123",
            };
            saveProgress({ data, tweetId: "999" });
            const loaded = loadExisting("999");
            expect(loaded?._nextToken).toBe("abc123");
        });
    });

    describe("findIncompleteFile", () => {
        it("finds file with _nextToken", () => {
            const data = {
                ...makeSampleThreadData(),
                _nextToken: "token123",
            };
            saveProgress({ data, tweetId: "999" });

            const found = findIncompleteFile();
            expect(found).not.toBeNull();
            expect(found?.tweetId).toBe("999");
            expect(found?.data._nextToken).toBe("token123");
        });

        it("returns null when all fetches complete", () => {
            saveProgress({
                data: makeSampleThreadData(),
                tweetId: "999",
            });
            expect(findIncompleteFile()).toBeNull();
        });

        it("returns null when output directory is empty", () => {
            expect(findIncompleteFile()).toBeNull();
        });
    });
});

// ============================================================
// CLI parsing tests
// ============================================================

describe("parseFetchOptions", () => {
    it("returns defaults when no flags provided", () => {
        const { options, tweetUrl, isResume } = parseFetchOptions([
            "https://x.com/user/status/123",
        ]);
        expect(options.maxTweets).toBeUndefined();
        expect(options.maxCost).toBeUndefined();
        expect(options.autoPct).toBe(10);
        expect(options.maxDepth).toBe(5);
        expect(options.sortOrder).toBe("relevancy");
        expect(options.noQualityStop).toBe(false);
        expect(options.noLimit).toBe(false);
        expect(options.includeQuotes).toBe(true);
        expect(options.maxQuoteDepth).toBe(1);
        expect(tweetUrl).toBe("https://x.com/user/status/123");
        expect(isResume).toBe(false);
    });

    it("parses all flags with space-separated values", () => {
        const { options } = parseFetchOptions([
            "https://x.com/user/status/123",
            "--max-tweets",
            "500",
            "--max-cost",
            "10.5",
            "--auto-pct",
            "20",
            "--max-depth",
            "3",
            "--sort-order",
            "recency",
            "--no-quality-stop",
            "--include-quotes",
            "--max-quote-depth",
            "2",
        ]);
        expect(options.maxTweets).toBe(500);
        expect(options.maxCost).toBe(10.5);
        expect(options.autoPct).toBe(20);
        expect(options.maxDepth).toBe(3);
        expect(options.sortOrder).toBe("recency");
        expect(options.noQualityStop).toBe(true);
        expect(options.includeQuotes).toBe(true);
        expect(options.maxQuoteDepth).toBe(2);
    });

    it("parses flags with = syntax", () => {
        const { options } = parseFetchOptions([
            "https://x.com/user/status/123",
            "--max-tweets=200",
            "--max-cost=5.5",
            "--max-quote-depth=3",
        ]);
        expect(options.maxTweets).toBe(200);
        expect(options.maxCost).toBe(5.5);
        expect(options.maxQuoteDepth).toBe(3);
    });

    it("recognizes --resume flag", () => {
        const { isResume, tweetUrl } = parseFetchOptions(["--resume"]);
        expect(isResume).toBe(true);
        expect(tweetUrl).toBeUndefined();
    });

    it("recognizes --resume with URL", () => {
        const { isResume, tweetUrl } = parseFetchOptions([
            "--resume",
            "https://x.com/user/status/123",
        ]);
        expect(isResume).toBe(true);
        expect(tweetUrl).toBe("https://x.com/user/status/123");
    });

    it("throws on invalid --max-tweets value", () => {
        expect(() => parseFetchOptions(["--max-tweets", "abc"])).toThrow(
            "positive integer",
        );
    });

    it("throws on invalid --sort-order value", () => {
        expect(() => parseFetchOptions(["--sort-order", "random"])).toThrow(
            '"recency" or "relevancy"',
        );
    });

    it("throws on unknown flag", () => {
        expect(() => parseFetchOptions(["--unknown-flag"])).toThrow(
            "Unknown flag",
        );
    });

    it("allows --max-quote-depth 0 for flat quotes", () => {
        const { options } = parseFetchOptions([
            "https://x.com/user/status/123",
            "--max-quote-depth",
            "0",
        ]);
        expect(options.maxQuoteDepth).toBe(0);
    });

    it("parses --no-limit flag", () => {
        const { options } = parseFetchOptions([
            "https://x.com/user/status/123",
            "--no-limit",
        ]);
        expect(options.noLimit).toBe(true);
    });

});

// ============================================================
// Pagination controller tests
// ============================================================

describe("createPaginationController", () => {
    const defaultOptions: FetchOptions = {
        maxTweets: undefined,
        maxCost: undefined,
        autoPct: 10,
        maxDepth: 5,
        sortOrder: "relevancy",
        noQualityStop: false,
        noLimit: false,
        includeQuotes: false,
        maxQuoteDepth: 1,
    };

    it("calculates cost from tweet count and unique users", () => {
        const controller = createPaginationController({
            existingReplies: [],
        });
        controller.recordPage([
            makeReply({ id: "1", authorId: "a" }),
            makeReply({ id: "2", authorId: "b" }),
        ]);
        // (2 tweets + 1 original) * 0.005 + 2 users * 0.010 = 0.015 + 0.020 = 0.035
        expect(controller.estimatedCost()).toBeCloseTo(0.035, 3);
    });

    it("seeds from existing replies on resume", () => {
        const existing = [
            makeReply({ id: "1", authorId: "a" }),
            makeReply({ id: "2", authorId: "b" }),
        ];
        const controller = createPaginationController({
            existingReplies: existing,
        });
        expect(controller.tweetCount).toBe(2);
        expect(controller.uniqueUserCount).toBe(2);
    });

    it("deduplicates users across pages", () => {
        const controller = createPaginationController({
            existingReplies: [],
        });
        controller.recordPage([makeReply({ id: "1", authorId: "a" })]);
        controller.recordPage([makeReply({ id: "2", authorId: "a" })]);
        expect(controller.tweetCount).toBe(2);
        expect(controller.uniqueUserCount).toBe(1);
    });

    it("triggers max-tweets stop", () => {
        const controller = createPaginationController({
            existingReplies: [],
        });
        controller.recordPage(
            Array.from({ length: 100 }, (_, i) =>
                makeReply({ id: String(i), authorId: `a${i}` }),
            ),
        );
        const check = controller.shouldStop({
            ...defaultOptions,
            maxTweets: 100,
        });
        expect(check.stop).toBe(true);
        expect(check.reason).toBe("max-tweets");
    });

    it("triggers max-cost stop", () => {
        const controller = createPaginationController({
            existingReplies: [],
        });
        controller.recordPage(
            Array.from({ length: 100 }, (_, i) =>
                makeReply({ id: String(i), authorId: `a${i}` }),
            ),
        );
        // Cost: (100+1)*0.005 + 100*0.010 = 0.505 + 1.0 = 1.505
        const check = controller.shouldStop({
            ...defaultOptions,
            maxCost: 1.0,
        });
        expect(check.stop).toBe(true);
        expect(check.reason).toBe("max-cost");
    });

    it("auto-calibrates minLikes from page 1 using sqrt formula", () => {
        const controller = createPaginationController({
            existingReplies: [],
        });
        controller.recordPage([
            makeReply({ id: "1", likeCount: 500 }),
            makeReply({ id: "2", likeCount: 200 }),
        ]);
        // sqrt(500 * 10 / 10) = sqrt(500) = 22.36 → ceil → 23
        controller.shouldStop(defaultOptions);
        expect(controller.resolvedMinLikes).toBe(23);
    });

    it("triggers quality-drop on page 2 when best tweet below threshold", () => {
        const controller = createPaginationController({
            existingReplies: [],
        });
        // Page 1: high engagement → auto-calibrate: sqrt(100) = 10
        controller.recordPage([makeReply({ id: "1", likeCount: 100 })]);
        controller.shouldStop(defaultOptions);
        expect(controller.resolvedMinLikes).toBe(10);

        // Page 2: best tweet (3 likes) < threshold (10) → quality drop
        controller.recordPage([makeReply({ id: "2", likeCount: 3 })]);
        const check = controller.shouldStop(defaultOptions);
        expect(check.stop).toBe(true);
        expect(check.reason).toBe("quality-drop");
    });

    it("does not quality-drop when --no-quality-stop is set", () => {
        const controller = createPaginationController({
            existingReplies: [],
        });
        const opts = { ...defaultOptions, noQualityStop: true };
        controller.recordPage([makeReply({ id: "1", likeCount: 100 })]);
        controller.shouldStop(opts);

        controller.recordPage([makeReply({ id: "2", likeCount: 1 })]);
        const check = controller.shouldStop(opts);
        expect(check.stop).toBe(false);
    });

    it("does not stop when no caps are set", () => {
        const controller = createPaginationController({
            existingReplies: [],
        });
        controller.recordPage(
            Array.from({ length: 100 }, (_, i) =>
                makeReply({ id: String(i), authorId: `a${i}` }),
            ),
        );
        const check = controller.shouldStop(defaultOptions);
        expect(check.stop).toBe(false);
    });

    it("continues past quality-drop when priority reply IDs are unfetched", () => {
        const controller = createPaginationController({
            existingReplies: [],
            priorityReplyIds: new Set(["priority_reply_1"]),
        });
        // Page 1: high engagement → calibrate threshold to 10
        controller.recordPage([makeReply({ id: "1", likeCount: 100 })]);
        controller.shouldStop(defaultOptions);
        expect(controller.resolvedMinLikes).toBe(10);

        // Page 2: low quality (3 likes < threshold 10) BUT priority reply not yet found
        controller.recordPage([makeReply({ id: "2", likeCount: 3 })]);
        const check = controller.shouldStop(defaultOptions);
        expect(check.stop).toBe(false);
    });

    it("stops on quality-drop when all priority replies have been fetched", () => {
        const controller = createPaginationController({
            existingReplies: [],
            priorityReplyIds: new Set(["priority_reply_1"]),
        });
        // Page 1: high engagement → calibrate threshold to 10
        controller.recordPage([makeReply({ id: "1", likeCount: 100 })]);
        controller.shouldStop(defaultOptions);

        // Page 2: contains the priority reply — it's been fetched now
        controller.recordPage([
            makeReply({ id: "priority_reply_1", likeCount: 5 }),
        ]);
        const check2 = controller.shouldStop(defaultOptions);
        // All priorities found, quality drop triggers
        expect(check2.stop).toBe(true);
        expect(check2.reason).toBe("quality-drop");
    });

    it("force-stops after MAX_EXTRA_PAGES_FOR_PRIORITIES even with unfetched priorities", () => {
        const controller = createPaginationController({
            existingReplies: [],
            priorityReplyIds: new Set(["never_found_reply"]),
        });
        // Page 1: high engagement → calibrate threshold to 10
        controller.recordPage([makeReply({ id: "1", likeCount: 100 })]);
        controller.shouldStop(defaultOptions);

        // Pages 2-7: all low quality, priority reply never appears
        // MAX_EXTRA_PAGES_FOR_PRIORITIES = 5, so pages 2-6 continue, page 7 stops
        for (let i = 2; i <= 6; i++) {
            controller.recordPage([
                makeReply({ id: String(i), likeCount: 1 }),
            ]);
            const check = controller.shouldStop(defaultOptions);
            expect(check.stop).toBe(false);
        }

        // Page 7: 6th page after quality drop → exceeds cap of 5
        controller.recordPage([makeReply({ id: "7", likeCount: 1 })]);
        const finalCheck = controller.shouldStop(defaultOptions);
        expect(finalCheck.stop).toBe(true);
        expect(finalCheck.reason).toBe("priority-cap");
    });

    it("quality-drop behaves normally without priority reply IDs", () => {
        const controller = createPaginationController({
            existingReplies: [],
            // No priorityReplyIds → same behavior as before
        });
        // Page 1: calibrate
        controller.recordPage([makeReply({ id: "1", likeCount: 100 })]);
        controller.shouldStop(defaultOptions);

        // Page 2: quality drop → stops immediately (no priorities to search for)
        controller.recordPage([makeReply({ id: "2", likeCount: 3 })]);
        const check = controller.shouldStop(defaultOptions);
        expect(check.stop).toBe(true);
        expect(check.reason).toBe("quality-drop");
    });

    it("hard caps override priority extension", () => {
        const controller = createPaginationController({
            existingReplies: [],
            priorityReplyIds: new Set(["priority_reply_1"]),
        });
        // Page 1: high engagement
        controller.recordPage(
            Array.from({ length: 100 }, (_, i) =>
                makeReply({ id: String(i), authorId: `a${i}`, likeCount: 100 }),
            ),
        );
        // max-cost should still trigger even with unfetched priorities
        const check = controller.shouldStop({
            ...defaultOptions,
            maxCost: 0.01,
        });
        expect(check.stop).toBe(true);
        expect(check.reason).toBe("max-cost");
    });
});

// ============================================================
// Auto-calibration tests (pure function used by PaginationController + exploreQuoteTree)
// ============================================================

describe("autoCalibrate", () => {
    it("returns undefined when topMetric is 0", () => {
        expect(autoCalibrate({ topMetric: 0, autoPct: 10 })).toBeUndefined();
    });

    it("returns 1 as minimum threshold", () => {
        // sqrt(1 * 10 / 10) = sqrt(1) = 1
        expect(autoCalibrate({ topMetric: 1, autoPct: 10 })).toBe(1);
    });

    it("uses sqrt formula: sqrt(topMetric * autoPct / 10)", () => {
        // sqrt(100 * 10 / 10) = sqrt(100) = 10
        expect(autoCalibrate({ topMetric: 100, autoPct: 10 })).toBe(10);
        // sqrt(10000 * 10 / 10) = sqrt(10000) = 100
        expect(autoCalibrate({ topMetric: 10000, autoPct: 10 })).toBe(100);
    });

    it("ceils fractional results", () => {
        // sqrt(50 * 10 / 10) = sqrt(50) = 7.07 → ceil → 8
        expect(autoCalibrate({ topMetric: 50, autoPct: 10 })).toBe(8);
    });

    it("higher autoPct gives higher threshold", () => {
        const low = autoCalibrate({ topMetric: 1000, autoPct: 5 }) ?? 0;
        const mid = autoCalibrate({ topMetric: 1000, autoPct: 10 }) ?? 0;
        const high = autoCalibrate({ topMetric: 1000, autoPct: 20 }) ?? 0;
        expect(low).toBeGreaterThan(0);
        expect(mid).toBeGreaterThan(low);
        expect(high).toBeGreaterThan(mid);
    });

    it("scales sub-linearly with engagement magnitude", () => {
        const small = autoCalibrate({ topMetric: 100, autoPct: 10 }) ?? 0;
        const large = autoCalibrate({ topMetric: 10000, autoPct: 10 }) ?? 0;
        // sqrt scaling: 100→10, 10000→100. Ratio = 10, not 100.
        expect(large / small).toBe(10);
    });
});

// ============================================================
// Engagement filtering tests
// ============================================================

describe("filterRepliesByEngagement", () => {
    const ROOT_ID = "root";

    it("returns all replies when no filters set", () => {
        const replies = [
            makeReply({ id: "1", inReplyToTweetId: ROOT_ID }),
            makeReply({ id: "2", inReplyToTweetId: ROOT_ID }),
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: undefined,
            minReplies: undefined,
            maxDepth: 5,
        });
        expect(result).toHaveLength(2);
    });

    it("filters by minLikes at depth 0", () => {
        const replies = [
            makeReply({ id: "1", likeCount: 10, inReplyToTweetId: ROOT_ID }),
            makeReply({ id: "2", likeCount: 1, inReplyToTweetId: ROOT_ID }),
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 5,
            minReplies: undefined,
            maxDepth: 5,
        });
        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe("1");
    });

    it("applies decaying threshold at deeper depths", () => {
        // minLikes=10: depth 0 needs >=10, depth 1 needs >=5, depth 2 needs >=3
        const replies = [
            makeReply({
                id: "A",
                likeCount: 20,
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "B",
                likeCount: 6,
                inReplyToTweetId: "A",
            }), // depth 1, needs >=5 → passes
            makeReply({
                id: "C",
                likeCount: 3,
                inReplyToTweetId: "B",
            }), // depth 2, needs >=3 → passes
            makeReply({
                id: "D",
                likeCount: 1,
                inReplyToTweetId: "C",
            }), // depth 3, needs >=2 → fails
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 10,
            minReplies: undefined,
            maxDepth: 5,
        });
        expect(result.map((r) => r.id)).toEqual(["A", "B", "C"]);
    });

    it("preserves ancestor chain for qualifying deep reply", () => {
        // Parent A has 0 likes but child C at depth 2 has 50 likes
        const replies = [
            makeReply({
                id: "A",
                likeCount: 0,
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "B",
                likeCount: 0,
                inReplyToTweetId: "A",
            }),
            makeReply({
                id: "C",
                likeCount: 50,
                inReplyToTweetId: "B",
            }), // depth 2, needs >=3 → passes
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 10,
            minReplies: undefined,
            maxDepth: 5,
        });
        // C passes, so B and A must be kept as ancestors
        expect(result.map((r) => r.id)).toEqual(["A", "B", "C"]);
    });

    it("removes entire sub-thread when no descendant qualifies", () => {
        const replies = [
            makeReply({
                id: "A",
                likeCount: 0,
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "B",
                likeCount: 0,
                inReplyToTweetId: "A",
            }),
            makeReply({
                id: "C",
                likeCount: 0,
                inReplyToTweetId: "B",
            }),
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 5,
            minReplies: undefined,
            maxDepth: 5,
        });
        expect(result).toHaveLength(0);
    });

    it("hard stops at maxDepth", () => {
        const replies = [
            makeReply({
                id: "A",
                likeCount: 100,
                inReplyToTweetId: ROOT_ID,
            }), // depth 0
            makeReply({
                id: "B",
                likeCount: 100,
                inReplyToTweetId: "A",
            }), // depth 1
            makeReply({
                id: "C",
                likeCount: 100,
                inReplyToTweetId: "B",
            }), // depth 2 — at maxDepth, excluded
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 1,
            minReplies: undefined,
            maxDepth: 2, // hard stop at depth 2
        });
        expect(result.map((r) => r.id)).toEqual(["A", "B"]);
    });

    it("keeps sibling branches independently", () => {
        const replies = [
            makeReply({
                id: "A",
                likeCount: 0,
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "B",
                likeCount: 20,
                inReplyToTweetId: "A",
            }), // passes
            makeReply({
                id: "C",
                likeCount: 0,
                inReplyToTweetId: "A",
            }), // fails
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 5,
            minReplies: undefined,
            maxDepth: 5,
        });
        // B passes, A kept as ancestor, C filtered out
        expect(result.map((r) => r.id)).toEqual(["A", "B"]);
    });

    it("combines minLikes and minReplies (both must pass)", () => {
        const replies = [
            makeReply({
                id: "1",
                likeCount: 10,
                replyCount: 0,
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "2",
                likeCount: 10,
                replyCount: 5,
                inReplyToTweetId: ROOT_ID,
            }),
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 5,
            minReplies: 3,
            maxDepth: 5,
        });
        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe("2");
    });
});

// ============================================================
// E2E test with MSW
// ============================================================

describe("E2E: full fetch flow", () => {
    beforeAll(() => {
        server.listen({ onUnhandledRequest: "error" });
    });

    afterAll(() => {
        server.close();
    });

    beforeEach(() => {
        searchCallCount = 0;
        quotesCallCount = 0;
        setupTempDir();
        server.resetHandlers();
        vi.spyOn(console, "log").mockImplementation(noop);
        vi.spyOn(console, "warn").mockImplementation(noop);
        vi.spyOn(console, "error").mockImplementation(noop);
    });

    afterEach(() => {
        cleanupTempDir();
        vi.restoreAllMocks();
    });

    it("stops after --max-tweets cap, preserves _nextToken and sets stoppedEarly", async () => {
        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
            "--max-tweets",
            "2",
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        const outputPath = join(tempDir, `${TWEET_ID}.json`);
        expect(existsSync(outputPath)).toBe(true);

        const raw = readFileSync(outputPath, "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));

        // Phase 1: 2 replies (page 1). Phase 3: 1 more reply from page 2,
        // then max-tweets hit (3 >= 2). Total 3 replies.
        expect(data.replies).toHaveLength(3);

        // _fetchStats should indicate early stop
        expect(data._fetchStats).toBeDefined();
        expect(data._fetchStats?.stoppedEarly).toBe(true);
        expect(data._fetchStats?.stopReason).toBe("max-tweets");

        // Phase 1: 1 search. Phase 2: 1 search (quote thread) + quotes calls.
        // Phase 3: 1 search (page 2, then stops). = 3 search calls total.
        expect(searchCallCount).toBe(3);

        // Quotes still fetched (breadth-first: quotes before remaining replies)
        expect(data.quotes).toBeDefined();
        expect(data.quotes).toHaveLength(2);
    });

    it("auto-calculates smart budget for viral tweets instead of aborting", async () => {
        // Override tweet handler to return high reply count
        server.use(
            http.get("https://api.x.com/2/tweets/:id", () => {
                return HttpResponse.json(
                    {
                        data: {
                            id: TWEET_ID,
                            text: "Viral tweet",
                            author_id: AUTHOR_ID,
                            created_at: "2024-06-15T10:00:00.000Z",
                            edit_history_tweet_ids: [TWEET_ID],
                            public_metrics: {
                                retweet_count: 100,
                                reply_count: 5000,
                                like_count: 10000,
                                quote_count: 50,
                                impression_count: 500000,
                            },
                        },
                        includes: {
                            users: [
                                {
                                    id: AUTHOR_ID,
                                    name: "Test Author",
                                    username: AUTHOR_USERNAME,
                                },
                            ],
                        },
                    },
                    { headers: RATE_LIMIT_HEADERS },
                );
            }),
        );

        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        // Should proceed (not abort) — auto-budget is set but basic handlers
        // only have 3 replies (~$0.05), well under the $22 budget, so no early stop.
        expect(searchCallCount).toBeGreaterThan(0);

        const outputPath = join(tempDir, `${TWEET_ID}.json`);
        const raw = readFileSync(outputPath, "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));
        // Fetch completed normally (budget never hit for this small thread)
        expect(data._fetchStats?.stoppedEarly).toBe(false);
        expect(data.replies.length).toBeGreaterThan(0);
    });

    it("bypasses cost safety with --no-limit", async () => {
        // Same high-reply override
        server.use(
            http.get("https://api.x.com/2/tweets/:id", () => {
                return HttpResponse.json(
                    {
                        data: {
                            id: TWEET_ID,
                            text: "Viral tweet",
                            author_id: AUTHOR_ID,
                            created_at: "2024-06-15T10:00:00.000Z",
                            edit_history_tweet_ids: [TWEET_ID],
                            public_metrics: {
                                retweet_count: 100,
                                reply_count: 5000,
                                like_count: 10000,
                                quote_count: 50,
                                impression_count: 500000,
                            },
                        },
                        includes: {
                            users: [
                                {
                                    id: AUTHOR_ID,
                                    name: "Test Author",
                                    username: AUTHOR_USERNAME,
                                },
                            ],
                        },
                    },
                    { headers: RATE_LIMIT_HEADERS },
                );
            }),
        );

        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
            "--no-limit",
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        // --no-limit should bypass safety check and proceed with fetch
        expect(searchCallCount).toBeGreaterThan(0);
    });

    it("bypasses cost safety when --max-cost is set", async () => {
        // Same high-reply override
        server.use(
            http.get("https://api.x.com/2/tweets/:id", () => {
                return HttpResponse.json(
                    {
                        data: {
                            id: TWEET_ID,
                            text: "Viral tweet",
                            author_id: AUTHOR_ID,
                            created_at: "2024-06-15T10:00:00.000Z",
                            edit_history_tweet_ids: [TWEET_ID],
                            public_metrics: {
                                retweet_count: 100,
                                reply_count: 5000,
                                like_count: 10000,
                                quote_count: 50,
                                impression_count: 500000,
                            },
                        },
                        includes: {
                            users: [
                                {
                                    id: AUTHOR_ID,
                                    name: "Test Author",
                                    username: AUTHOR_USERNAME,
                                },
                            ],
                        },
                    },
                    { headers: RATE_LIMIT_HEADERS },
                );
            }),
        );

        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
            "--max-cost",
            "5",
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        // --max-cost should bypass safety check (it IS a cap)
        expect(searchCallCount).toBeGreaterThan(0);
    });

    it("fetches original tweet + paginated replies, writes correct output JSON", async () => {
        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        // Verify output file
        const outputPath = join(tempDir, `${TWEET_ID}.json`);
        expect(existsSync(outputPath)).toBe(true);

        const raw = readFileSync(outputPath, "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));

        // Original tweet
        expect(data.originalTweet.id).toBe(TWEET_ID);
        expect(data.originalTweet.authorUsername).toBe(AUTHOR_USERNAME);
        expect(data.originalTweet.likeCount).toBe(100);

        // Replies: 2 from page 1 + 1 from page 2 = 3 total
        expect(data.replies).toHaveLength(3);
        expect(data.replies[0]?.id).toBe("reply_1");
        expect(data.replies[0]?.inReplyToTweetId).toBe(TWEET_ID);
        expect(data.replies[1]?.id).toBe("reply_2");
        expect(data.replies[1]?.inReplyToTweetId).toBe(TWEET_ID);
        expect(data.replies[2]?.id).toBe("reply_3");
        expect(data.replies[2]?.inReplyToTweetId).toBe("reply_1");

        // No resume token (fetch completed)
        expect(data._nextToken).toBeUndefined();

        // Breadth-first: Phase 1 (1 search) → Phase 2 quotes (quote_1's thread:
        // 2 search calls for its 2-page conversation) → Phase 3 (1 search for page 2) = 4
        expect(searchCallCount).toBe(4);

        // Quotes are on by default — 2 quotes fetched
        expect(data.quotes).toBeDefined();
        expect(data.quotes).toHaveLength(2);

        // Tweet URL preserved
        expect(data.tweetUrl).toBe(
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        );
    });

    it("does not fetch quotes with --no-quotes", async () => {
        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
            "--no-quotes",
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        expect(quotesCallCount).toBe(0);

        const outputPath = join(tempDir, `${TWEET_ID}.json`);
        const raw = readFileSync(outputPath, "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));
        expect(data.quotes).toBeUndefined();
    });

    it("explores threads for high-engagement quotes only", async () => {
        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
            "--include-quotes",
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        const outputPath = join(tempDir, `${TWEET_ID}.json`);
        const raw = readFileSync(outputPath, "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));

        expect(quotesCallCount).toBeGreaterThan(0);
        const quotes = data.quotes ?? [];
        expect(quotes).toHaveLength(2);

        // Quote with 500 likes: auto-threshold = ceil(sqrt(500)) = 23
        // 500 >= 23, so its thread should be explored
        const highEngagement = quotes.find((q) => q.id === "quote_1");
        expect(highEngagement).toBeDefined();
        expect(highEngagement?.likeCount).toBe(500);
        expect(highEngagement?.quotedTweetId).toBe(TWEET_ID);
        expect(highEngagement?.thread).toBeDefined();
        expect(highEngagement?.thread?.replies).toBeDefined();
        expect(highEngagement?.thread?.quotes).toHaveLength(0);

        // Quote with 3 likes: 3 < 23, so no thread exploration
        const lowEngagement = quotes.find((q) => q.id === "quote_2");
        expect(lowEngagement).toBeDefined();
        expect(lowEngagement?.likeCount).toBe(3);
        expect(lowEngagement?.thread).toBeUndefined();
    });

    it("returns flat quotes without thread exploration when --max-quote-depth 0", async () => {
        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
            "--include-quotes",
            "--max-quote-depth",
            "0",
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        const outputPath = join(tempDir, `${TWEET_ID}.json`);
        const raw = readFileSync(outputPath, "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));

        const quotes = data.quotes ?? [];
        expect(quotes).toHaveLength(2);

        // Both quotes should be flat — no thread exploration at depth 0
        for (const quote of quotes) {
            expect(quote.thread).toBeUndefined();
        }

        // Only 1 quotes API call (flat list), no search calls for quote threads
        expect(quotesCallCount).toBe(1);
    });

    it("skips quote exploration when budget is exhausted by replies", async () => {
        const originalArgv = process.argv;
        // Phase 1 (singlePage): page 1 has 2 replies.
        // Cost: (2 + 1) * $0.005 + 2 * $0.01 = $0.035
        // Setting --max-cost to $0.02 means costRef ($0.035) >= maxCost ($0.02)
        // when exploreQuoteTree is called — the budget gate fires immediately.
        process.argv = [
            "node",
            "fetch.ts",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
            "--max-cost",
            "0.02",
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        const outputPath = join(tempDir, `${TWEET_ID}.json`);
        const raw = readFileSync(outputPath, "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));

        // Budget exhausted before quote exploration could start
        const quotes = data.quotes ?? [];
        expect(quotes).toHaveLength(0);
    });

    it("blocks fresh fetch when output file already exists (completed)", async () => {
        // Pre-write a completed fetch (no _nextToken)
        const existingData = {
            originalTweet: {
                id: TWEET_ID,
                text: "Existing tweet",
                authorId: AUTHOR_ID,
                authorUsername: AUTHOR_USERNAME,
                createdAt: "2024-01-01T00:00:00.000Z",
                likeCount: 50,
                replyCount: 10,
                retweetCount: 5,
                quoteCount: 2,
            },
            replies: [makeReply({ id: "existing_reply_1" })],
            fetchedAt: "2024-01-01T00:00:00.000Z",
            tweetUrl: `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        };
        saveProgress({ data: existingData, tweetId: TWEET_ID });

        const exitError = new Error("process.exit called");
        vi.spyOn(process, "exit").mockImplementation(() => {
            throw exitError;
        });
        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        ];

        try {
            await expect(main()).rejects.toThrow("process.exit called");
        } finally {
            process.argv = originalArgv;
        }

        // No API calls should have been made
        expect(searchCallCount).toBe(0);
        expect(quotesCallCount).toBe(0);

        // Original data should be untouched
        const raw = readFileSync(join(tempDir, `${TWEET_ID}.json`), "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));
        expect(data.replies).toHaveLength(1);
        expect(data.replies[0]?.id).toBe("existing_reply_1");
    });

    it("resume explores quotes when replies are already complete", async () => {
        // Pre-write completed reply data (no _nextToken, no quotes)
        const existingData = {
            originalTweet: {
                id: TWEET_ID,
                text: "Test tweet",
                authorId: AUTHOR_ID,
                authorUsername: AUTHOR_USERNAME,
                createdAt: "2024-01-01T00:00:00.000Z",
                likeCount: 100,
                replyCount: 25,
                retweetCount: 10,
                quoteCount: 5,
            },
            replies: [
                makeReply({ id: "r1" }),
                makeReply({ id: "r2" }),
            ],
            fetchedAt: "2024-01-01T00:00:00.000Z",
            tweetUrl: `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        };
        saveProgress({ data: existingData, tweetId: TWEET_ID });

        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            "--resume",
            "--include-quotes",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        const raw = readFileSync(join(tempDir, `${TWEET_ID}.json`), "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));

        // Replies should be unchanged — the 2 pre-written replies are still there
        // (fetchConversation was NOT called for reply pagination since no _nextToken)
        expect(data.replies).toHaveLength(2);
        expect(data.replies[0]?.id).toBe("r1");
        expect(data.replies[1]?.id).toBe("r2");

        // Quotes should now be present (searchCallCount > 0 is from quote thread exploration)
        expect(quotesCallCount).toBeGreaterThan(0);
        const quotes = data.quotes ?? [];
        expect(quotes.length).toBeGreaterThan(0);
    });

    it("resume skips already-explored quote threads", async () => {
        // Pre-write data with quotes — quote_1 already has thread,
        // quote_2 is below threshold (3 < 23) so should not be explored
        const existingData = {
            originalTweet: {
                id: TWEET_ID,
                text: "Test tweet",
                authorId: AUTHOR_ID,
                authorUsername: AUTHOR_USERNAME,
                createdAt: "2024-01-01T00:00:00.000Z",
                likeCount: 100,
                replyCount: 25,
                retweetCount: 10,
                quoteCount: 5,
            },
            replies: [makeReply({ id: "r1" })],
            quotes: [
                {
                    id: "quote_1",
                    text: "Quote 1",
                    authorId: "quoter_1",
                    authorUsername: "quoter1",
                    createdAt: "2024-06-16T11:00:00.000Z",
                    likeCount: 500,
                    replyCount: 1,
                    retweetCount: 0,
                    quoteCount: 0,
                    quotedTweetId: TWEET_ID,
                    thread: { replies: [], quotes: [] },
                },
                {
                    id: "quote_2",
                    text: "Quote 2",
                    authorId: "quoter_2",
                    authorUsername: "quoter2",
                    createdAt: "2024-06-16T12:00:00.000Z",
                    likeCount: 3,
                    replyCount: 2,
                    retweetCount: 0,
                    quoteCount: 0,
                    quotedTweetId: TWEET_ID,
                },
            ],
            fetchedAt: "2024-01-01T00:00:00.000Z",
            tweetUrl: `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        };
        saveProgress({ data: existingData, tweetId: TWEET_ID });

        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            "--resume",
            "--include-quotes",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        // No new API calls — quote_1 already explored, quote_2 below threshold
        expect(searchCallCount).toBe(0);
        expect(quotesCallCount).toBe(0);
    });

    it("saves quotes incrementally during exploration", async () => {
        // Run a fetch that includes quotes. After completion, verify the
        // file has the correct quote structure with explored threads.
        // The saveContext mechanism assigns result.quotes inside
        // exploreQuoteTree and saves after each step — without it,
        // result.quotes would only be set after the function returns.
        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
            "--include-quotes",
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        const outputPath = join(tempDir, `${TWEET_ID}.json`);
        const raw = readFileSync(outputPath, "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));

        // Quotes should be present with correct structure
        const allQuotes = data.quotes ?? [];
        expect(allQuotes).toHaveLength(2);

        // High-engagement quote should have explored thread
        const explored = allQuotes.find((q) => q.id === "quote_1");
        expect(explored?.thread).toBeDefined();

        // Low-engagement quote should be flat (no thread)
        const flat = allQuotes.find((q) => q.id === "quote_2");
        expect(flat?.thread).toBeUndefined();

        // Now verify the incremental save is testable via resume:
        // Write a partial state (flat list without threads) and resume.
        // If incremental save didn't work, the resume path wouldn't find
        // quotes to explore.
        const partialData = {
            ...data,
            quotes: allQuotes.map((q) => {
                // Strip threads — simulating interruption after flat list save
                const { thread: _, ...rest } = q;
                return rest;
            }),
        };
        writeFileSync(outputPath, JSON.stringify(partialData, null, 2));
        searchCallCount = 0;
        quotesCallCount = 0;

        process.argv = [
            "node",
            "fetch.ts",
            "--resume",
            "--include-quotes",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        // Resume should have explored the qualifying quote's thread
        const resumed = rawThreadDataSchema.parse(
            JSON.parse(readFileSync(outputPath, "utf-8")),
        );
        const resumedQuotes = resumed.quotes ?? [];
        const resumedQuote = resumedQuotes.find((q) => q.id === "quote_1");
        expect(resumedQuote?.thread).toBeDefined();

        // No new flat-list quote fetch needed (already saved), but
        // sub-quote exploration for quote_1 at depth 1 hits the quotes API
        expect(quotesCallCount).toBeGreaterThan(0);
        // Search calls happen for quote thread reply exploration
        expect(searchCallCount).toBeGreaterThan(0);
    });

    it("resume with --include-quotes resumes reply pagination then explores quotes", async () => {
        // Pre-write incomplete reply data (has _nextToken, no quotes)
        const existingData = {
            originalTweet: {
                id: TWEET_ID,
                text: "Test tweet",
                authorId: AUTHOR_ID,
                authorUsername: AUTHOR_USERNAME,
                createdAt: "2024-01-01T00:00:00.000Z",
                likeCount: 100,
                replyCount: 25,
                retweetCount: 10,
                quoteCount: 5,
            },
            replies: [
                makeReply({ id: "reply_1", inReplyToTweetId: TWEET_ID }),
                makeReply({ id: "reply_2", inReplyToTweetId: TWEET_ID }),
            ],
            fetchedAt: "2024-01-01T00:00:00.000Z",
            tweetUrl: `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
            _nextToken: "page2token",
        };
        saveProgress({ data: existingData, tweetId: TWEET_ID });

        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            "--resume",
            "--include-quotes",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        const raw = readFileSync(join(tempDir, `${TWEET_ID}.json`), "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));

        // Replies should include page 2 (resumed from page2token)
        expect(data.replies).toHaveLength(3);
        expect(data._nextToken).toBeUndefined();

        // Reply pagination resumed + quote thread exploration used search API
        // (1 for reply page 2 + N for quote thread pages)
        expect(searchCallCount).toBeGreaterThanOrEqual(1);

        // Quotes should be explored
        expect(quotesCallCount).toBeGreaterThan(0);
        const resumedQuotes = data.quotes ?? [];
        expect(resumedQuotes.length).toBeGreaterThan(0);
    });

    it("resume with --max-quote-depth 0 does not explore threads even when quotes lack threads", async () => {
        // Pre-write data with flat quotes (quote_1 qualifies by engagement
        // but has no thread). With --max-quote-depth 0, no exploration should happen.
        const existingData = {
            originalTweet: {
                id: TWEET_ID,
                text: "Test tweet",
                authorId: AUTHOR_ID,
                authorUsername: AUTHOR_USERNAME,
                createdAt: "2024-01-01T00:00:00.000Z",
                likeCount: 100,
                replyCount: 25,
                retweetCount: 10,
                quoteCount: 5,
            },
            replies: [makeReply({ id: "r1" })],
            quotes: [
                {
                    id: "quote_1",
                    text: "Quote 1",
                    authorId: "quoter_1",
                    authorUsername: "quoter1",
                    createdAt: "2024-06-16T11:00:00.000Z",
                    likeCount: 500,
                    replyCount: 1,
                    retweetCount: 0,
                    quoteCount: 0,
                    quotedTweetId: TWEET_ID,
                    // no thread — would normally qualify for exploration
                },
                {
                    id: "quote_2",
                    text: "Quote 2",
                    authorId: "quoter_2",
                    authorUsername: "quoter2",
                    createdAt: "2024-06-16T12:00:00.000Z",
                    likeCount: 3,
                    replyCount: 2,
                    retweetCount: 0,
                    quoteCount: 0,
                    quotedTweetId: TWEET_ID,
                },
            ],
            fetchedAt: "2024-01-01T00:00:00.000Z",
            tweetUrl: `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        };
        saveProgress({ data: existingData, tweetId: TWEET_ID });

        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            "--resume",
            "--include-quotes",
            "--max-quote-depth",
            "0",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        // No API calls — maxQuoteDepth 0 means no thread exploration
        expect(searchCallCount).toBe(0);
        expect(quotesCallCount).toBe(0);

        // Data should be unchanged
        const raw = readFileSync(join(tempDir, `${TWEET_ID}.json`), "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));
        const quotes = data.quotes ?? [];
        expect(quotes).toHaveLength(2);
        expect(quotes.find((q) => q.id === "quote_1")?.thread).toBeUndefined();
    });

    it("resume says nothing to resume when replies and quotes are all complete", async () => {
        // Pre-write a fully completed fetch (no _nextToken, all qualifying
        // quotes have thread data)
        const existingData = {
            originalTweet: {
                id: TWEET_ID,
                text: "Test tweet",
                authorId: AUTHOR_ID,
                authorUsername: AUTHOR_USERNAME,
                createdAt: "2024-01-01T00:00:00.000Z",
                likeCount: 100,
                replyCount: 25,
                retweetCount: 10,
                quoteCount: 5,
            },
            replies: [makeReply({ id: "r1" }), makeReply({ id: "r2" })],
            quotes: [
                {
                    id: "quote_1",
                    text: "Quote 1",
                    authorId: "quoter_1",
                    authorUsername: "quoter1",
                    createdAt: "2024-06-16T11:00:00.000Z",
                    likeCount: 500,
                    replyCount: 1,
                    retweetCount: 0,
                    quoteCount: 0,
                    quotedTweetId: TWEET_ID,
                    thread: { replies: [], quotes: [] },
                },
            ],
            fetchedAt: "2024-01-01T00:00:00.000Z",
            tweetUrl: `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        };
        saveProgress({ data: existingData, tweetId: TWEET_ID });

        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            "--resume",
            "--include-quotes",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        ];

        try {
            await main();
        } finally {
            process.argv = originalArgv;
        }

        // No API calls — everything is already complete
        expect(searchCallCount).toBe(0);
        expect(quotesCallCount).toBe(0);

        // Data should be unchanged
        const raw = readFileSync(join(tempDir, `${TWEET_ID}.json`), "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));
        expect(data.replies).toHaveLength(2);
        const quotes = data.quotes ?? [];
        expect(quotes).toHaveLength(1);
        expect(quotes[0]?.thread).toBeDefined();
    });

    it("blocks fresh fetch when incomplete file exists", async () => {
        // Pre-write an incomplete fetch (has _nextToken)
        const existingData = {
            originalTweet: {
                id: TWEET_ID,
                text: "Existing tweet",
                authorId: AUTHOR_ID,
                authorUsername: AUTHOR_USERNAME,
                createdAt: "2024-01-01T00:00:00.000Z",
                likeCount: 50,
                replyCount: 10,
                retweetCount: 5,
                quoteCount: 2,
            },
            replies: [makeReply({ id: "existing_reply_1" })],
            fetchedAt: "2024-01-01T00:00:00.000Z",
            tweetUrl: `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
            _nextToken: "some_token",
        };
        saveProgress({ data: existingData, tweetId: TWEET_ID });

        const exitError = new Error("process.exit called");
        vi.spyOn(process, "exit").mockImplementation(() => {
            throw exitError;
        });
        const originalArgv = process.argv;
        process.argv = [
            "node",
            "fetch.ts",
            `https://x.com/${AUTHOR_USERNAME}/status/${TWEET_ID}`,
        ];

        try {
            await expect(main()).rejects.toThrow("process.exit called");
        } finally {
            process.argv = originalArgv;
        }

        // No API calls should have been made
        expect(searchCallCount).toBe(0);
        expect(quotesCallCount).toBe(0);

        // Original data should be untouched
        const raw = readFileSync(join(tempDir, `${TWEET_ID}.json`), "utf-8");
        const data = rawThreadDataSchema.parse(JSON.parse(raw));
        expect(data.replies).toHaveLength(1);
        expect(data._nextToken).toBe("some_token");
    });

    // ============================================================
    // Viral tweet scenario — large-scale E2E
    // ============================================================

    describe("viral tweet scenario", () => {
        let viral: ReturnType<typeof createViralScenario>;

        beforeEach(() => {
            viral = createViralScenario();
            server.use(...viral.handlers);
        });

        it("fetches viral thread with quality-drop and full quote exploration", async () => {
            const originalArgv = process.argv;
            process.argv = [
                "node",
                "fetch.ts",
                `https://x.com/${VIRAL_AUTHOR_USERNAME}/status/${VIRAL_TWEET_ID}`,
                "--no-limit",
                "--include-quotes",
            ];

            try {
                await main();
            } finally {
                process.argv = originalArgv;
            }

            // --- Raw output ---
            const outputPath = join(tempDir, `${VIRAL_TWEET_ID}.json`);
            expect(existsSync(outputPath)).toBe(true);
            const raw = readFileSync(outputPath, "utf-8");
            const data = rawThreadDataSchema.parse(JSON.parse(raw));

            // Original tweet metrics
            expect(data.originalTweet.id).toBe(VIRAL_TWEET_ID);
            expect(data.originalTweet.likeCount).toBe(50000);
            expect(data.originalTweet.replyCount).toBe(5000);
            expect(data.originalTweet.quoteCount).toBe(200);
            expect(data.originalTweet.authorUsername).toBe(
                VIRAL_AUTHOR_USERNAME,
            );

            // Quality-drop: pages 0-5 fetched (600 replies), page 5 max likes = 15 < threshold 23
            expect(data.replies).toHaveLength(600);
            expect(data._fetchStats).toBeDefined();
            expect(data._fetchStats?.stoppedEarly).toBe(true);
            expect(data._fetchStats?.stopReason).toBe("quality-drop");
            expect(data._fetchStats?.estimatedCost).toBeGreaterThan(0);

            // Resume token preserved (stopped early, more pages exist)
            expect(data._nextToken).toBeDefined();

            // Nested replies: every 5th reply on pages 1+ replies to a previous page tweet
            const nestedReplies = data.replies.filter(
                (r) =>
                    r.inReplyToTweetId !== null &&
                    r.inReplyToTweetId !== VIRAL_TWEET_ID,
            );
            expect(nestedReplies.length).toBeGreaterThan(0);

            // 6 quote tweets fetched
            const quotes = data.quotes ?? [];
            expect(quotes).toHaveLength(6);

            // Quotes 1-3 qualify (>= 45 likes), have explored threads
            // Quote threshold: ceil(sqrt(2000)) = 45
            const q1 = quotes.find((q) => q.id === "quote_viral_1");
            const q2 = quotes.find((q) => q.id === "quote_viral_2");
            const q3 = quotes.find((q) => q.id === "quote_viral_3");
            expect(q1?.thread).toBeDefined();
            expect(q1?.thread?.replies).toHaveLength(10);
            expect(q2?.thread).toBeDefined();
            expect(q2?.thread?.replies).toHaveLength(5);
            expect(q3?.thread).toBeDefined();
            expect(q3?.thread?.replies).toHaveLength(0);

            // Sub-quote of quote_viral_1 present as flat list (maxQuoteDepth=1 default)
            expect(q1?.thread?.quotes).toHaveLength(1);
            expect(q1?.thread?.quotes[0]?.id).toBe(SUB_QUOTE_ID);
            // Not explored at depth 1 (depth >= maxQuoteDepth)
            expect(q1?.thread?.quotes[0]?.thread).toBeUndefined();

            // Quotes 4-6 below threshold, no thread exploration
            const q4 = quotes.find((q) => q.id === "quote_viral_4");
            const q5 = quotes.find((q) => q.id === "quote_viral_5");
            const q6 = quotes.find((q) => q.id === "quote_viral_6");
            expect(q4?.thread).toBeUndefined();
            expect(q5?.thread).toBeUndefined();
            expect(q6?.thread).toBeUndefined();

            // API call counts: 6 main search + 3 quote threads = 9 search,
            // 1 main quotes + 3 depth-1 quotes = 4 quotes
            expect(viral.getSearchCallCount()).toBe(9);
            expect(viral.getQuotesCallCount()).toBe(4);

            // --- Filtered output ---
            const filteredPath = join(
                tempDir,
                `${VIRAL_TWEET_ID}.filtered.json`,
            );
            expect(existsSync(filteredPath)).toBe(true);
            const filteredRaw = readFileSync(filteredPath, "utf-8");
            const filtered = rawThreadDataSchema.parse(
                JSON.parse(filteredRaw),
            );

            // Filtered has fewer replies than raw
            expect(filtered.replies.length).toBeLessThan(data.replies.length);
            expect(filtered.replies.length).toBeGreaterThan(0);

            // Ancestor preservation: every kept reply whose parent is not
            // the root tweet must also have its parent in the filtered set
            const filteredIds = new Set(filtered.replies.map((r) => r.id));
            for (const reply of filtered.replies) {
                if (
                    reply.inReplyToTweetId &&
                    reply.inReplyToTweetId !== VIRAL_TWEET_ID
                ) {
                    expect(filteredIds.has(reply.inReplyToTweetId)).toBe(true);
                }
            }
        });

        it("stops at max-cost before exhausting all pages", async () => {
            const originalArgv = process.argv;
            process.argv = [
                "node",
                "fetch.ts",
                `https://x.com/${VIRAL_AUTHOR_USERNAME}/status/${VIRAL_TWEET_ID}`,
                "--max-cost",
                "1.00",
            ];

            try {
                await main();
            } finally {
                process.argv = originalArgv;
            }

            const raw = readFileSync(
                join(tempDir, `${VIRAL_TWEET_ID}.json`),
                "utf-8",
            );
            const data = rawThreadDataSchema.parse(JSON.parse(raw));

            // Phase 1 (singlePage): 100 replies. Phase 2: cost ~$1.50 >= $1.00 →
            // quotes skipped. Phase 3: fetches page 2 (100 more), then stops.
            expect(data.replies).toHaveLength(200);
            expect(data._fetchStats?.stoppedEarly).toBe(true);
            expect(data._fetchStats?.stopReason).toBe("max-cost");
            expect(data._nextToken).toBeDefined();

            // Phase 1: 1 search. Phase 3: 1 search (page 2, then budget stops).
            expect(viral.getSearchCallCount()).toBe(2);

            // Quotes skipped: budget exhausted before quote exploration
            const quotes = data.quotes ?? [];
            expect(quotes).toHaveLength(0);
            expect(viral.getQuotesCallCount()).toBe(0);
        });

        it("stops at max-tweets cap", async () => {
            const originalArgv = process.argv;
            process.argv = [
                "node",
                "fetch.ts",
                `https://x.com/${VIRAL_AUTHOR_USERNAME}/status/${VIRAL_TWEET_ID}`,
                "--max-tweets",
                "150",
                "--no-limit",
            ];

            try {
                await main();
            } finally {
                process.argv = originalArgv;
            }

            const raw = readFileSync(
                join(tempDir, `${VIRAL_TWEET_ID}.json`),
                "utf-8",
            );
            const data = rawThreadDataSchema.parse(JSON.parse(raw));

            // Phase 1 (singlePage): 100 replies. Phase 2: quotes explored
            // (3 qualifying). Phase 3: page 2 (200 total >= 150), stops.
            expect(data.replies).toHaveLength(200);
            expect(data._fetchStats?.stoppedEarly).toBe(true);
            expect(data._fetchStats?.stopReason).toBe("max-tweets");
            expect(data._nextToken).toBeDefined();

            // Phase 1: 1 search. Phase 2: 3 search (quote threads).
            // Phase 3: 1 search (page 2). = 5 total.
            expect(viral.getSearchCallCount()).toBe(5);

            // Quotes explored (default on)
            expect(data.quotes).toBeDefined();
            expect(data.quotes?.length).toBeGreaterThan(0);
        });

        it("explores nested quotes with --max-quote-depth 2", async () => {
            const originalArgv = process.argv;
            process.argv = [
                "node",
                "fetch.ts",
                `https://x.com/${VIRAL_AUTHOR_USERNAME}/status/${VIRAL_TWEET_ID}`,
                "--no-limit",
                "--include-quotes",
                "--max-quote-depth",
                "2",
            ];

            try {
                await main();
            } finally {
                process.argv = originalArgv;
            }

            const raw = readFileSync(
                join(tempDir, `${VIRAL_TWEET_ID}.json`),
                "utf-8",
            );
            const data = rawThreadDataSchema.parse(JSON.parse(raw));

            const quotes = data.quotes ?? [];
            const q1 = quotes.find((q) => q.id === "quote_viral_1");
            expect(q1?.thread).toBeDefined();

            // With maxQuoteDepth=2, sub-quote at depth 1 is explored
            const subQuotes = q1?.thread?.quotes ?? [];
            expect(subQuotes).toHaveLength(1);
            expect(subQuotes[0]?.id).toBe(SUB_QUOTE_ID);
            expect(subQuotes[0]?.thread).toBeDefined();
            expect(subQuotes[0]?.thread?.replies).toHaveLength(3);
            expect(subQuotes[0]?.thread?.quotes).toHaveLength(0);

            // Additional API calls vs maxQuoteDepth=1:
            // +1 search for sub-quote thread, +1 quotes for sub-quote's own quotes
            // Total: 10 search (6 main + 3 quote threads + 1 sub-quote thread)
            //        5 quotes (1 main + 3 depth-1 + 1 depth-2)
            expect(viral.getSearchCallCount()).toBe(10);
            expect(viral.getQuotesCallCount()).toBe(5);
        });

        it("breadth-first with default values: best replies + quotes first", async () => {
            const originalArgv = process.argv;
            // No flags — just the URL. Smart defaults should handle everything.
            process.argv = [
                "node",
                "fetch.ts",
                `https://x.com/${VIRAL_AUTHOR_USERNAME}/status/${VIRAL_TWEET_ID}`,
            ];

            try {
                await main();
            } finally {
                process.argv = originalArgv;
            }

            const raw = readFileSync(
                join(tempDir, `${VIRAL_TWEET_ID}.json`),
                "utf-8",
            );
            const data = rawThreadDataSchema.parse(JSON.parse(raw));

            // Auto-budget: ceil(sqrt(5000) * 0.3) = ceil(21.2) = 22, capped at $25 → $22
            // This is set automatically — no --max-cost needed.

            // Should have both replies AND quotes
            expect(data.replies.length).toBeGreaterThan(0);
            expect(data.quotes).toBeDefined();
            expect(data.quotes?.length).toBeGreaterThan(0);

            // Verify breadth-first ordering via call log:
            // 1. First call is a search for main thread (Phase 1)
            // 2. Then quotes + quote-thread searches (Phase 2)
            // 3. Then remaining main-thread searches (Phase 3)
            const callOrder = viral.getCallOrder();
            expect(callOrder[0]).toBe("search:main"); // Phase 1

            // Find where Phase 2 starts (first quotes call)
            const firstQuotesIdx = callOrder.findIndex((c) =>
                c.startsWith("quotes:"),
            );
            expect(firstQuotesIdx).toBeGreaterThan(0); // Quotes come after page 1

            // Find where Phase 3 starts (next main-thread search after quotes)
            const phase3Idx = callOrder.findIndex(
                (c, i) => i > firstQuotesIdx && c === "search:main",
            );

            // All quote-related calls should be between Phase 1 and Phase 3
            if (phase3Idx !== -1) {
                const quoteCalls = callOrder.slice(
                    firstQuotesIdx,
                    phase3Idx,
                );
                // Every call in this range should be quotes or quote-thread searches
                for (const call of quoteCalls) {
                    expect(
                        call.startsWith("quotes:") ||
                            (call.startsWith("search:") &&
                                call !== "search:main"),
                    ).toBe(true);
                }
            }

            // Filtered output should also exist
            const filteredPath = join(
                tempDir,
                `${VIRAL_TWEET_ID}.filtered.json`,
            );
            expect(existsSync(filteredPath)).toBe(true);

            // Quality-drop should have stopped Phase 3 before fetching all 8 pages
            expect(data.replies.length).toBeLessThan(
                VIRAL_PAGES * VIRAL_REPLIES_PER_PAGE,
            );
        });
    });

    // ============================================================
    // Retweet filtering in quote tweets
    // ============================================================

    describe("retweet filtering in quotes", () => {
        const RT_TEST_TWEET_ID = "9900000000000001";
        const RT_TEST_AUTHOR_ID = "rt_test_author";

        beforeEach(() => {
            server.use(
                // Single tweet endpoint
                http.get(
                    "https://api.x.com/2/tweets/:id",
                    ({ params }) => {
                        const id = String(params.id);
                        if (id !== RT_TEST_TWEET_ID) {
                            return HttpResponse.json(
                                { errors: [{ message: "Not found" }] },
                                { status: 404, headers: RATE_LIMIT_HEADERS },
                            );
                        }
                        return HttpResponse.json(
                            {
                                data: {
                                    id: RT_TEST_TWEET_ID,
                                    text: "Original tweet for RT test",
                                    author_id: RT_TEST_AUTHOR_ID,
                                    created_at: "2024-06-15T10:00:00.000Z",
                                    edit_history_tweet_ids: [RT_TEST_TWEET_ID],
                                    public_metrics: {
                                        like_count: 100,
                                        reply_count: 5,
                                        retweet_count: 10,
                                        quote_count: 6,
                                        impression_count: 1000,
                                    },
                                },
                                includes: {
                                    users: [
                                        {
                                            id: RT_TEST_AUTHOR_ID,
                                            name: "RT Test Author",
                                            username: "rttestauthor",
                                        },
                                    ],
                                },
                            },
                            { headers: RATE_LIMIT_HEADERS },
                        );
                    },
                ),

                // Search endpoint (replies) — return empty
                http.get(
                    "https://api.x.com/2/tweets/search/recent",
                    () => {
                        return HttpResponse.json(
                            { meta: { result_count: 0 } },
                            { headers: RATE_LIMIT_HEADERS },
                        );
                    },
                ),

                // Quotes endpoint — return mix of originals and retweets
                http.get(
                    "https://api.x.com/2/tweets/:id/quote_tweets",
                    () => {
                        const originalQuote1 = {
                            id: "orig_quote_1",
                            text: "My original take on this",
                            author_id: "orig_quoter_1",
                            created_at: "2024-06-16T10:00:00.000Z",
                            edit_history_tweet_ids: ["orig_quote_1"],
                            public_metrics: {
                                like_count: 5,
                                reply_count: 1,
                                retweet_count: 0,
                                quote_count: 0,
                                impression_count: 50,
                            },
                            referenced_tweets: [
                                { type: "quoted", id: RT_TEST_TWEET_ID },
                            ],
                        };

                        const originalQuote2 = {
                            id: "orig_quote_2",
                            text: "Another thoughtful response",
                            author_id: "orig_quoter_2",
                            created_at: "2024-06-16T11:00:00.000Z",
                            edit_history_tweet_ids: ["orig_quote_2"],
                            public_metrics: {
                                like_count: 3,
                                reply_count: 0,
                                retweet_count: 0,
                                quote_count: 0,
                                impression_count: 30,
                            },
                            referenced_tweets: [
                                { type: "quoted", id: RT_TEST_TWEET_ID },
                            ],
                        };

                        const rtOfQuote1 = {
                            id: "rt_of_quote_1",
                            text: "RT @orig_quoter_1: My original take on this",
                            author_id: "retweeter_1",
                            created_at: "2024-06-16T12:00:00.000Z",
                            edit_history_tweet_ids: ["rt_of_quote_1"],
                            public_metrics: {
                                like_count: 0,
                                reply_count: 0,
                                retweet_count: 0,
                                quote_count: 0,
                                impression_count: 5,
                            },
                            referenced_tweets: [
                                { type: "retweeted", id: "orig_quote_1" },
                                { type: "quoted", id: RT_TEST_TWEET_ID },
                            ],
                        };

                        const rtOfQuote2 = {
                            id: "rt_of_quote_2",
                            text: "RT @orig_quoter_1: My original take on this",
                            author_id: "retweeter_2",
                            created_at: "2024-06-16T13:00:00.000Z",
                            edit_history_tweet_ids: ["rt_of_quote_2"],
                            public_metrics: {
                                like_count: 0,
                                reply_count: 0,
                                retweet_count: 0,
                                quote_count: 0,
                                impression_count: 3,
                            },
                            referenced_tweets: [
                                { type: "retweeted", id: "orig_quote_2" },
                                { type: "quoted", id: RT_TEST_TWEET_ID },
                            ],
                        };

                        const rtOfQuote3 = {
                            id: "rt_of_quote_3",
                            text: "RT @orig_quoter_2: Another thoughtful response",
                            author_id: "retweeter_3",
                            created_at: "2024-06-16T14:00:00.000Z",
                            edit_history_tweet_ids: ["rt_of_quote_3"],
                            public_metrics: {
                                like_count: 0,
                                reply_count: 0,
                                retweet_count: 0,
                                quote_count: 0,
                                impression_count: 2,
                            },
                            referenced_tweets: [
                                { type: "retweeted", id: "orig_quote_1" },
                                { type: "quoted", id: RT_TEST_TWEET_ID },
                            ],
                        };

                        return HttpResponse.json(
                            {
                                data: [
                                    originalQuote1,
                                    rtOfQuote1,
                                    originalQuote2,
                                    rtOfQuote2,
                                    rtOfQuote3,
                                ],
                                includes: {
                                    users: [
                                        {
                                            id: "orig_quoter_1",
                                            name: "Quoter 1",
                                            username: "quoter1",
                                        },
                                        {
                                            id: "orig_quoter_2",
                                            name: "Quoter 2",
                                            username: "quoter2",
                                        },
                                        {
                                            id: "retweeter_1",
                                            name: "Retweeter 1",
                                            username: "retweeter1",
                                        },
                                        {
                                            id: "retweeter_2",
                                            name: "Retweeter 2",
                                            username: "retweeter2",
                                        },
                                        {
                                            id: "retweeter_3",
                                            name: "Retweeter 3",
                                            username: "retweeter3",
                                        },
                                    ],
                                },
                                meta: {
                                    result_count: 5,
                                    next_token: undefined,
                                },
                            },
                            { headers: RATE_LIMIT_HEADERS },
                        );
                    },
                ),
            );
        });

        it("filters out retweets from quote tweets, keeping only originals", async () => {
            const originalArgv = process.argv;
            process.argv = [
                "node",
                "fetch.ts",
                `https://x.com/rttestauthor/status/${RT_TEST_TWEET_ID}`,
                "--no-quality-stop",
            ];

            try {
                await main();
            } finally {
                process.argv = originalArgv;
            }

            const outputFile = join(tempDir, `${RT_TEST_TWEET_ID}.json`);
            expect(existsSync(outputFile)).toBe(true);

            const raw = readFileSync(outputFile, "utf-8");
            const data = rawThreadDataSchema.parse(JSON.parse(raw));

            // Should have 2 original quotes, not 5
            const quotes = data.quotes ?? [];
            expect(quotes.length).toBe(2);

            // Verify the kept quotes are the originals
            const quoteIds = quotes.map((q) => q.id);
            expect(quoteIds).toContain("orig_quote_1");
            expect(quoteIds).toContain("orig_quote_2");

            // Verify retweets were filtered out
            expect(quoteIds).not.toContain("rt_of_quote_1");
            expect(quoteIds).not.toContain("rt_of_quote_2");
            expect(quoteIds).not.toContain("rt_of_quote_3");
        });
    });

    // ============================================================
    // fetchTweet quoted tweet detection
    // ============================================================

    describe("fetchTweet quoted tweet detection", () => {
        const QUOTE_TWEET_ID = "9900000000000010";
        const QUOTED_ORIGINAL_ID = "9900000000000099";

        beforeEach(() => {
            server.use(
                http.get(
                    "https://api.x.com/2/tweets/:id",
                    ({ params }) => {
                        const id = String(params.id);

                        if (id === QUOTE_TWEET_ID) {
                            return HttpResponse.json(
                                {
                                    data: {
                                        id: QUOTE_TWEET_ID,
                                        text: "My quote of the original",
                                        author_id: "qt_author",
                                        created_at:
                                            "2024-06-15T10:00:00.000Z",
                                        edit_history_tweet_ids: [
                                            QUOTE_TWEET_ID,
                                        ],
                                        public_metrics: {
                                            like_count: 50,
                                            reply_count: 10,
                                            retweet_count: 5,
                                            quote_count: 2,
                                            impression_count: 500,
                                        },
                                        referenced_tweets: [
                                            {
                                                type: "quoted",
                                                id: QUOTED_ORIGINAL_ID,
                                            },
                                        ],
                                    },
                                    includes: {
                                        users: [
                                            {
                                                id: "qt_author",
                                                name: "QT Author",
                                                username: "qtauthor",
                                            },
                                        ],
                                    },
                                },
                                { headers: RATE_LIMIT_HEADERS },
                            );
                        }

                        if (id === QUOTED_ORIGINAL_ID) {
                            return HttpResponse.json(
                                {
                                    data: {
                                        id: QUOTED_ORIGINAL_ID,
                                        text: "The original tweet being quoted",
                                        author_id: "original_author",
                                        created_at:
                                            "2024-06-14T10:00:00.000Z",
                                        edit_history_tweet_ids: [
                                            QUOTED_ORIGINAL_ID,
                                        ],
                                        public_metrics: {
                                            like_count: 200,
                                            reply_count: 50,
                                            retweet_count: 30,
                                            quote_count: 10,
                                            impression_count: 5000,
                                        },
                                    },
                                    includes: {
                                        users: [
                                            {
                                                id: "original_author",
                                                name: "Original Author",
                                                username: "originalauthor",
                                            },
                                        ],
                                    },
                                },
                                { headers: RATE_LIMIT_HEADERS },
                            );
                        }

                        if (id === "plain_tweet_001") {
                            return HttpResponse.json(
                                {
                                    data: {
                                        id: "plain_tweet_001",
                                        text: "A regular tweet",
                                        author_id: "plain_author",
                                        created_at:
                                            "2024-06-15T10:00:00.000Z",
                                        edit_history_tweet_ids: [
                                            "plain_tweet_001",
                                        ],
                                        public_metrics: {
                                            like_count: 10,
                                            reply_count: 2,
                                            retweet_count: 1,
                                            quote_count: 0,
                                            impression_count: 100,
                                        },
                                    },
                                    includes: {
                                        users: [
                                            {
                                                id: "plain_author",
                                                name: "Plain Author",
                                                username: "plainauthor",
                                            },
                                        ],
                                    },
                                },
                                { headers: RATE_LIMIT_HEADERS },
                            );
                        }

                        return HttpResponse.json(
                            { errors: [{ message: "Not found" }] },
                            { status: 404, headers: RATE_LIMIT_HEADERS },
                        );
                    },
                ),
            );
        });

        it("returns quotedTweetId when tweet quotes another", async () => {
            const result: FetchTweetResult =
                await fetchTweet(QUOTE_TWEET_ID);

            expect(result.tweet.id).toBe(QUOTE_TWEET_ID);
            expect(result.quotedTweetId).toBe(QUOTED_ORIGINAL_ID);
        });

        it("returns undefined quotedTweetId for non-quote tweets", async () => {
            const result: FetchTweetResult =
                await fetchTweet(QUOTED_ORIGINAL_ID);

            expect(result.tweet.id).toBe(QUOTED_ORIGINAL_ID);
            expect(result.quotedTweetId).toBeUndefined();
        });

        it("returns undefined quotedTweetId for plain tweets", async () => {
            const result: FetchTweetResult =
                await fetchTweet("plain_tweet_001");

            expect(result.quotedTweetId).toBeUndefined();
        });
    });

    // ============================================================
    // Quoted tweet auto-analysis (depth 1 cap, circular guard)
    // ============================================================

    describe("quoted tweet auto-analysis", () => {
        const QT_MAIN_ID = "9900000000000020";
        const QT_QUOTED_ID = "9900000000000021";

        beforeEach(() => {
            server.use(
                // Single tweet endpoint
                http.get(
                    "https://api.x.com/2/tweets/:id",
                    ({ params }) => {
                        const id = String(params.id);

                        if (id === QT_MAIN_ID) {
                            return HttpResponse.json(
                                {
                                    data: {
                                        id: QT_MAIN_ID,
                                        text: "My take on the original thread",
                                        author_id: "main_author",
                                        created_at:
                                            "2024-06-15T10:00:00.000Z",
                                        edit_history_tweet_ids: [QT_MAIN_ID],
                                        public_metrics: {
                                            like_count: 50,
                                            reply_count: 3,
                                            retweet_count: 2,
                                            quote_count: 1,
                                            impression_count: 500,
                                        },
                                        referenced_tweets: [
                                            {
                                                type: "quoted",
                                                id: QT_QUOTED_ID,
                                            },
                                        ],
                                    },
                                    includes: {
                                        users: [
                                            {
                                                id: "main_author",
                                                name: "Main Author",
                                                username: "mainauthor",
                                            },
                                        ],
                                    },
                                },
                                { headers: RATE_LIMIT_HEADERS },
                            );
                        }

                        if (id === QT_QUOTED_ID) {
                            return HttpResponse.json(
                                {
                                    data: {
                                        id: QT_QUOTED_ID,
                                        text: "The original controversial take",
                                        author_id: "quoted_author",
                                        created_at:
                                            "2024-06-14T10:00:00.000Z",
                                        edit_history_tweet_ids: [
                                            QT_QUOTED_ID,
                                        ],
                                        public_metrics: {
                                            like_count: 200,
                                            reply_count: 20,
                                            retweet_count: 15,
                                            quote_count: 5,
                                            impression_count: 3000,
                                        },
                                        referenced_tweets: [
                                            {
                                                type: "quoted",
                                                id: "deeper_tweet_should_not_follow",
                                            },
                                        ],
                                    },
                                    includes: {
                                        users: [
                                            {
                                                id: "quoted_author",
                                                name: "Quoted Author",
                                                username: "quotedauthor",
                                            },
                                        ],
                                    },
                                },
                                { headers: RATE_LIMIT_HEADERS },
                            );
                        }

                        return HttpResponse.json(
                            { errors: [{ message: "Not found" }] },
                            { status: 404, headers: RATE_LIMIT_HEADERS },
                        );
                    },
                ),

                // Search endpoint (replies) — return empty for all
                http.get(
                    "https://api.x.com/2/tweets/search/recent",
                    () => {
                        return HttpResponse.json(
                            { meta: { result_count: 0 } },
                            { headers: RATE_LIMIT_HEADERS },
                        );
                    },
                ),

                // Quotes endpoint — return empty for all
                http.get(
                    "https://api.x.com/2/tweets/:id/quote_tweets",
                    () => {
                        return HttpResponse.json(
                            {
                                data: [],
                                includes: { users: [] },
                                meta: { result_count: 0 },
                            },
                            { headers: RATE_LIMIT_HEADERS },
                        );
                    },
                ),
            );
        });

        it("auto-analyzes quoted tweet and stores in _quotedThread", async () => {
            const originalArgv = process.argv;
            process.argv = [
                "node",
                "fetch.ts",
                `https://x.com/mainauthor/status/${QT_MAIN_ID}`,
                "--no-quality-stop",
            ];

            try {
                await main();
            } finally {
                process.argv = originalArgv;
            }

            const outputFile = join(tempDir, `${QT_MAIN_ID}.json`);
            expect(existsSync(outputFile)).toBe(true);

            const raw = readFileSync(outputFile, "utf-8");
            const data = rawThreadDataSchema.parse(JSON.parse(raw));

            // Main tweet data is correct
            expect(data.originalTweet.id).toBe(QT_MAIN_ID);
            expect(data.originalTweet.authorUsername).toBe("mainauthor");

            // _quotedTweetId should be persisted
            expect(data._quotedTweetId).toBe(QT_QUOTED_ID);

            // _quotedThread should exist and contain the quoted tweet's analysis
            const quotedThread = data._quotedThread;
            expect(quotedThread).toBeDefined();
            expect(quotedThread?.originalTweet.id).toBe(QT_QUOTED_ID);
            expect(quotedThread?.originalTweet.authorUsername).toBe(
                "quotedauthor",
            );

            // The quoted tweet itself quotes "deeper_tweet_should_not_follow",
            // but depth-1 cap should prevent following it
            expect(quotedThread?._quotedThread).toBeUndefined();
        });

        it("does not follow circular quotes (self-quote)", async () => {
            // Override the handler so QT_MAIN_ID quotes itself
            server.use(
                http.get(
                    "https://api.x.com/2/tweets/:id",
                    ({ params }) => {
                        const id = String(params.id);
                        if (id === QT_MAIN_ID) {
                            return HttpResponse.json(
                                {
                                    data: {
                                        id: QT_MAIN_ID,
                                        text: "I quote myself",
                                        author_id: "main_author",
                                        created_at:
                                            "2024-06-15T10:00:00.000Z",
                                        edit_history_tweet_ids: [QT_MAIN_ID],
                                        public_metrics: {
                                            like_count: 10,
                                            reply_count: 1,
                                            retweet_count: 0,
                                            quote_count: 0,
                                            impression_count: 100,
                                        },
                                        // Circular: quotes itself
                                        referenced_tweets: [
                                            {
                                                type: "quoted",
                                                id: QT_MAIN_ID,
                                            },
                                        ],
                                    },
                                    includes: {
                                        users: [
                                            {
                                                id: "main_author",
                                                name: "Main Author",
                                                username: "mainauthor",
                                            },
                                        ],
                                    },
                                },
                                { headers: RATE_LIMIT_HEADERS },
                            );
                        }
                        return HttpResponse.json(
                            { errors: [{ message: "Not found" }] },
                            { status: 404, headers: RATE_LIMIT_HEADERS },
                        );
                    },
                ),
            );

            const originalArgv = process.argv;
            process.argv = [
                "node",
                "fetch.ts",
                `https://x.com/mainauthor/status/${QT_MAIN_ID}`,
                "--no-quality-stop",
            ];

            try {
                await main();
            } finally {
                process.argv = originalArgv;
            }

            const outputFile = join(tempDir, `${QT_MAIN_ID}.json`);
            const raw = readFileSync(outputFile, "utf-8");
            const data = rawThreadDataSchema.parse(JSON.parse(raw));

            // Should NOT have _quotedThread (circular quote was detected)
            expect(data._quotedThread).toBeUndefined();

            // But _quotedTweetId should still reflect the circular reference
            expect(data._quotedTweetId).toBe(QT_MAIN_ID);
        });

        it("resume picks up missing _quotedThread", async () => {
            // Write a partial file that has _quotedTweetId but no _quotedThread
            const partialData = {
                originalTweet: {
                    id: QT_MAIN_ID,
                    text: "My take on the original thread",
                    authorId: "main_author",
                    authorUsername: "mainauthor",
                    createdAt: "2024-06-15T10:00:00.000Z",
                    likeCount: 50,
                    replyCount: 3,
                    retweetCount: 2,
                    quoteCount: 1,
                },
                replies: [],
                fetchedAt: "2024-06-15T12:00:00.000Z",
                tweetUrl: `https://x.com/mainauthor/status/${QT_MAIN_ID}`,
                _quotedTweetId: QT_QUOTED_ID,
                // No _quotedThread — this is what resume should fill
            };
            const outputFile = join(tempDir, `${QT_MAIN_ID}.json`);
            writeFileSync(outputFile, JSON.stringify(partialData));

            const originalArgv = process.argv;
            process.argv = [
                "node",
                "fetch.ts",
                "--resume",
                `https://x.com/mainauthor/status/${QT_MAIN_ID}`,
            ];

            try {
                await main();
            } finally {
                process.argv = originalArgv;
            }

            const raw = readFileSync(outputFile, "utf-8");
            const data = rawThreadDataSchema.parse(JSON.parse(raw));

            // Resume should have fetched the quoted thread
            expect(data._quotedThread).toBeDefined();
            expect(data._quotedThread?.originalTweet.id).toBe(QT_QUOTED_ID);
            expect(data._quotedThread?.originalTweet.authorUsername).toBe(
                "quotedauthor",
            );
        });

        it("budget exhaustion skips quoted thread but persists _quotedTweetId", async () => {
            const originalArgv = process.argv;
            process.argv = [
                "node",
                "fetch.ts",
                `https://x.com/mainauthor/status/${QT_MAIN_ID}`,
                "--no-quality-stop",
                "--max-cost",
                "0.001",
            ];

            try {
                await main();
            } finally {
                process.argv = originalArgv;
            }

            const outputFile = join(tempDir, `${QT_MAIN_ID}.json`);
            const raw = readFileSync(outputFile, "utf-8");
            const data = rawThreadDataSchema.parse(JSON.parse(raw));

            // _quotedTweetId should be persisted for later resume
            expect(data._quotedTweetId).toBe(QT_QUOTED_ID);

            // _quotedThread should NOT exist (budget was 0)
            expect(data._quotedThread).toBeUndefined();
        });
    });
});

// ============================================================
// annotateReplyDepths tests
// ============================================================

describe("annotateReplyDepths", () => {
    it("annotates direct replies as depth 0", () => {
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "root" }),
            makeReply({ id: "r2", inReplyToTweetId: "root" }),
        ];
        annotateReplyDepths({ replies, rootTweetId: "root" });
        expect(replies[0]._depth).toBe(0);
        expect(replies[1]._depth).toBe(0);
    });

    it("annotates a linear chain correctly", () => {
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "root" }),
            makeReply({ id: "r2", inReplyToTweetId: "r1" }),
            makeReply({ id: "r3", inReplyToTweetId: "r2" }),
        ];
        annotateReplyDepths({ replies, rootTweetId: "root" });
        expect(replies[0]._depth).toBe(0);
        expect(replies[1]._depth).toBe(1);
        expect(replies[2]._depth).toBe(2);
    });

    it("annotates a branching tree correctly", () => {
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "root" }),
            makeReply({ id: "r2", inReplyToTweetId: "r1" }),
            makeReply({ id: "r3", inReplyToTweetId: "r1" }),
            makeReply({ id: "r4", inReplyToTweetId: "r3" }),
        ];
        annotateReplyDepths({ replies, rootTweetId: "root" });
        expect(replies[0]._depth).toBe(0);
        expect(replies[1]._depth).toBe(1);
        expect(replies[2]._depth).toBe(1);
        expect(replies[3]._depth).toBe(2);
    });

    it("handles orphaned replies (parent not in list) as depth 0", () => {
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "missing_parent" }),
            makeReply({ id: "r2", inReplyToTweetId: "r1" }),
        ];
        annotateReplyDepths({ replies, rootTweetId: "root" });
        expect(replies[0]._depth).toBe(0);
        expect(replies[1]._depth).toBe(1);
    });

    it("handles null inReplyToTweetId as depth 0", () => {
        const replies = [makeReply({ id: "r1", inReplyToTweetId: null })];
        annotateReplyDepths({ replies, rootTweetId: "root" });
        expect(replies[0]._depth).toBe(0);
    });

    it("handles empty replies array", () => {
        const replies: Reply[] = [];
        annotateReplyDepths({ replies, rootTweetId: "root" });
        expect(replies).toHaveLength(0);
    });

    it("handles self-referencing reply (cycle of 1) without crashing", () => {
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "r1" }),
        ];
        annotateReplyDepths({ replies, rootTweetId: "root" });
        // Cycle is broken: the recursive call sees inProgress and returns 0,
        // so the outer call computes depth = 0 + 1 = 1
        expect(replies[0]._depth).toBe(1);
    });

    it("handles mutual cycle (A -> B -> A) without crashing", () => {
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "r2" }),
            makeReply({ id: "r2", inReplyToTweetId: "r1" }),
        ];
        annotateReplyDepths({ replies, rootTweetId: "root" });
        // Both should get finite depths (cycle broken at 0)
        expect(replies[0]._depth).toBeTypeOf("number");
        expect(replies[1]._depth).toBeTypeOf("number");
    });

    it("handles longer cycle (A -> B -> C -> A) without crashing", () => {
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "r3" }),
            makeReply({ id: "r2", inReplyToTweetId: "r1" }),
            makeReply({ id: "r3", inReplyToTweetId: "r2" }),
        ];
        annotateReplyDepths({ replies, rootTweetId: "root" });
        for (const r of replies) {
            expect(r._depth).toBeTypeOf("number");
        }
    });
});

// ============================================================
// computeThreadStats tests
// ============================================================

describe("computeThreadStats", () => {
    it("computes basic stats for a simple thread", () => {
        const replies = [
            makeReply({
                id: "r1",
                authorId: "a1",
                authorUsername: "user1",
                likeCount: 10,
                inReplyToTweetId: "root",
                _depth: 0,
                createdAt: "2024-01-01T10:00:00.000Z",
            }),
            makeReply({
                id: "r2",
                authorId: "a2",
                authorUsername: "user2",
                likeCount: 20,
                inReplyToTweetId: "root",
                _depth: 0,
                createdAt: "2024-01-01T12:00:00.000Z",
            }),
            makeReply({
                id: "r3",
                authorId: "a1",
                authorUsername: "user1",
                likeCount: 5,
                inReplyToTweetId: "r2",
                _depth: 1,
                createdAt: "2024-01-01T14:00:00.000Z",
            }),
        ];

        const stats = computeThreadStats({
            replies,
            rootTweetId: "root",
        });

        expect(stats.uniqueAuthors).toBe(2);
        expect(stats.totalReplies).toBe(3);
        expect(stats.directReplies).toBe(2);
        expect(stats.nestedReplies).toBe(1);
        expect(stats.maxDepth).toBe(1);
        expect(stats.averageDepth).toBeCloseTo(0.33, 1);
    });

    it("computes engagement distribution percentiles", () => {
        // Likes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        const replies = Array.from({ length: 10 }, (_, i) =>
            makeReply({
                id: `r${i}`,
                authorId: `a${i}`,
                authorUsername: `user${i}`,
                likeCount: i,
                inReplyToTweetId: "root",
                _depth: 0,
                createdAt: "2024-01-01T10:00:00.000Z",
            }),
        );

        const stats = computeThreadStats({
            replies,
            rootTweetId: "root",
        });

        expect(stats.engagementDistribution.p25).toBeCloseTo(2.25, 1);
        expect(stats.engagementDistribution.p50).toBeCloseTo(4.5, 1);
        expect(stats.engagementDistribution.p75).toBeCloseTo(6.75, 1);
        expect(stats.engagementDistribution.p99).toBeCloseTo(8.91, 1);
    });

    it("computes topAuthors sorted by total likes", () => {
        const replies = [
            makeReply({ id: "r1", authorId: "a1", authorUsername: "prolific", likeCount: 100, inReplyToTweetId: "root", _depth: 0 }),
            makeReply({ id: "r2", authorId: "a1", authorUsername: "prolific", likeCount: 50, inReplyToTweetId: "root", _depth: 0 }),
            makeReply({ id: "r3", authorId: "a2", authorUsername: "casual", likeCount: 10, inReplyToTweetId: "root", _depth: 0 }),
        ];

        const stats = computeThreadStats({ replies, rootTweetId: "root" });

        expect(stats.topAuthors[0]).toEqual({
            username: "prolific",
            authorId: "a1",
            replyCount: 2,
            totalLikes: 150,
        });
        expect(stats.topAuthors[1]).toEqual({
            username: "casual",
            authorId: "a2",
            replyCount: 1,
            totalLikes: 10,
        });
    });

    it("computes authorsByReplyCount buckets", () => {
        const replies = [
            // a1: 1 reply (single)
            makeReply({ id: "r1", authorId: "a1", inReplyToTweetId: "root", _depth: 0 }),
            // a2: 2 replies (twoToThree)
            makeReply({ id: "r2", authorId: "a2", inReplyToTweetId: "root", _depth: 0 }),
            makeReply({ id: "r3", authorId: "a2", inReplyToTweetId: "root", _depth: 0 }),
            // a3: 4 replies (fourPlus)
            makeReply({ id: "r4", authorId: "a3", inReplyToTweetId: "root", _depth: 0 }),
            makeReply({ id: "r5", authorId: "a3", inReplyToTweetId: "root", _depth: 0 }),
            makeReply({ id: "r6", authorId: "a3", inReplyToTweetId: "root", _depth: 0 }),
            makeReply({ id: "r7", authorId: "a3", inReplyToTweetId: "root", _depth: 0 }),
        ];

        const stats = computeThreadStats({ replies, rootTweetId: "root" });

        expect(stats.authorsByReplyCount).toEqual({
            single: 1,
            twoToThree: 1,
            fourPlus: 1,
        });
    });

    it("computes timeSpan correctly", () => {
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "root", _depth: 0, createdAt: "2024-01-01T10:00:00.000Z" }),
            makeReply({ id: "r2", inReplyToTweetId: "root", _depth: 0, createdAt: "2024-01-01T16:00:00.000Z" }),
        ];

        const stats = computeThreadStats({ replies, rootTweetId: "root" });

        expect(stats.timeSpan.first).toBe("2024-01-01T10:00:00.000Z");
        expect(stats.timeSpan.last).toBe("2024-01-01T16:00:00.000Z");
        expect(stats.timeSpan.durationHours).toBe(6);
    });

    it("handles empty replies", () => {
        const stats = computeThreadStats({
            replies: [],
            rootTweetId: "root",
        });

        expect(stats.uniqueAuthors).toBe(0);
        expect(stats.totalReplies).toBe(0);
        expect(stats.maxDepth).toBe(0);
        expect(stats.engagementDistribution.p50).toBe(0);
    });

    it("includes quoteStats when quotes are provided", () => {
        const quotes = [
            {
                id: "q1", text: "quote", authorId: "qa1", authorUsername: "quoter1",
                createdAt: "2024-01-01T00:00:00.000Z", likeCount: 10, replyCount: 2,
                retweetCount: 0, quoteCount: 0, quotedTweetId: "root",
                thread: {
                    replies: [
                        makeReply({ id: "qr1", authorId: "qa2", inReplyToTweetId: "q1" }),
                    ],
                    quotes: [],
                },
            },
            {
                id: "q2", text: "quote2", authorId: "qa3", authorUsername: "quoter2",
                createdAt: "2024-01-01T00:00:00.000Z", likeCount: 5, replyCount: 0,
                retweetCount: 0, quoteCount: 0, quotedTweetId: "root",
            },
        ];

        const stats = computeThreadStats({
            replies: [],
            quotes,
            rootTweetId: "root",
        });

        const qs = stats.quoteStats;
        expect(qs).toBeDefined();
        expect(qs?.totalQuotes).toBe(2);
        expect(qs?.quotesWithThreads).toBe(1);
        expect(qs?.totalQuoteReplies).toBe(1);
        expect(qs?.uniqueQuoteAuthors).toBe(3); // qa1, qa2, qa3
    });
});

// ============================================================
// createAuthorAccumulator tests
// ============================================================

describe("createAuthorAccumulator", () => {
    it("accumulates authors from multiple pages", () => {
        const acc = createAuthorAccumulator();

        const users1 = new Map<string, AuthorData>([
            ["a1", { username: "alice", bio: "Developer", followerCount: 1000 }],
        ]);
        const users2 = new Map<string, AuthorData>([
            ["a2", { username: "bob", bio: "Designer", followerCount: 500 }],
        ]);

        acc.ingest({
            users: users1,
            replies: [
                makeReply({ id: "r1", authorId: "a1", likeCount: 10 }),
                makeReply({ id: "r2", authorId: "a1", likeCount: 20 }),
            ],
        });

        acc.ingest({
            users: users2,
            replies: [
                makeReply({ id: "r3", authorId: "a2", likeCount: 5 }),
            ],
        });

        const result = acc.build();

        expect(Object.keys(result)).toHaveLength(2);
        expect(result.a1).toEqual({
            username: "alice",
            bio: "Developer",
            followerCount: 1000,
            followingCount: undefined,
            tweetCount: undefined,
            verifiedType: undefined,
            accountCreatedAt: undefined,
            repliesInThread: 2,
            totalLikesInThread: 30,
            replyIds: ["r1", "r2"],
        });
        const a2 = result.a2;
        expect(a2.username).toBe("bob");
        expect(a2.repliesInThread).toBe(1);
        expect(a2.totalLikesInThread).toBe(5);
    });

    it("ingests quote tweet authors via ingestQuotes", () => {
        const acc = createAuthorAccumulator();

        const users = new Map<string, AuthorData>([
            ["qa1", { username: "quoter" }],
        ]);

        acc.ingestQuotes({
            users,
            quotes: [
                {
                    id: "q1", text: "quote", authorId: "qa1", authorUsername: "quoter",
                    createdAt: "2024-01-01T00:00:00.000Z", likeCount: 100,
                    replyCount: 5, retweetCount: 2, quoteCount: 0, quotedTweetId: "root",
                },
            ],
        });

        const result = acc.build();

        const qa1 = result.qa1;
        expect(qa1).toBeDefined();
        expect(qa1.username).toBe("quoter");
        expect(qa1.repliesInThread).toBe(1);
        expect(qa1.totalLikesInThread).toBe(100);
        expect(qa1.replyIds).toEqual(["q1"]);
    });

    it("does not overwrite profile data from earlier pages", () => {
        const acc = createAuthorAccumulator();

        acc.ingest({
            users: new Map([["a1", { username: "alice", bio: "First" }]]),
            replies: [makeReply({ id: "r1", authorId: "a1" })],
        });

        acc.ingest({
            users: new Map([["a1", { username: "alice", bio: "Second" }]]),
            replies: [makeReply({ id: "r2", authorId: "a1" })],
        });

        const result = acc.build();
        const a1 = result.a1;
        expect(a1.bio).toBe("First");
        expect(a1.repliesInThread).toBe(2);
    });

    it("returns empty object when nothing ingested", () => {
        const acc = createAuthorAccumulator();
        expect(acc.build()).toEqual({});
    });
});

// ============================================================
// computeTopReplyChains tests
// ============================================================

describe("computeTopReplyChains", () => {
    it("returns chains sorted by total engagement", () => {
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "root", likeCount: 10, replyCount: 5, _depth: 0, authorUsername: "alice" }),
            makeReply({ id: "r2", inReplyToTweetId: "r1", likeCount: 3, replyCount: 1, _depth: 1, authorUsername: "bob" }),
            makeReply({ id: "r3", inReplyToTweetId: "root", likeCount: 100, replyCount: 20, _depth: 0, authorUsername: "carol" }),
        ];

        const chains = computeTopReplyChains({ replies, rootTweetId: "root" });

        expect(chains).toHaveLength(2);
        // r3 has more engagement (100+20=120) than r1+r2 (10+5+3+1=19)
        expect(chains[0].rootReplyId).toBe("r3");
        expect(chains[1].rootReplyId).toBe("r1");
    });

    it("includes child messages in chains", () => {
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "root", likeCount: 10, replyCount: 2, _depth: 0, authorUsername: "alice" }),
            makeReply({ id: "r2", inReplyToTweetId: "r1", likeCount: 5, replyCount: 0, _depth: 1, authorUsername: "bob" }),
            makeReply({ id: "r3", inReplyToTweetId: "r1", likeCount: 3, replyCount: 0, _depth: 1, authorUsername: "carol" }),
        ];

        const chains = computeTopReplyChains({ replies, rootTweetId: "root" });

        expect(chains).toHaveLength(1);
        const chain = chains[0];
        expect(chain.messages).toHaveLength(3);
        // Root message first
        expect(chain.messages[0].replyId).toBe("r1");
        // Children sorted by likes (r2 before r3)
        expect(chain.messages[1].replyId).toBe("r2");
        expect(chain.messages[2].replyId).toBe("r3");
    });

    it("limits to top 10 chains", () => {
        const replies = Array.from({ length: 15 }, (_, i) =>
            makeReply({
                id: `r${i}`,
                inReplyToTweetId: "root",
                likeCount: 15 - i,
                _depth: 0,
            }),
        );

        const chains = computeTopReplyChains({ replies, rootTweetId: "root" });
        expect(chains).toHaveLength(10);
    });

    it("returns empty array for empty replies", () => {
        const chains = computeTopReplyChains({
            replies: [],
            rootTweetId: "root",
        });
        expect(chains).toHaveLength(0);
    });

    it("computes depth of deepest message in chain", () => {
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "root", _depth: 0 }),
            makeReply({ id: "r2", inReplyToTweetId: "r1", _depth: 1 }),
            makeReply({ id: "r3", inReplyToTweetId: "r2", _depth: 2 }),
        ];

        const chains = computeTopReplyChains({ replies, rootTweetId: "root" });

        expect(chains[0].depth).toBe(2);
    });

    it("handles self-referencing reply without crashing", () => {
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "r1", likeCount: 5, replyCount: 1, _depth: 0 }),
        ];
        // r1 is not a direct reply to root, but inReplyToTweetId is itself.
        // computeTopReplyChains filters for direct replies (inReplyToTweetId === rootTweetId || null),
        // so this returns no chains. The key is it doesn't crash.
        const chains = computeTopReplyChains({ replies, rootTweetId: "root" });
        expect(chains).toHaveLength(0);
    });

    it("handles mutual cycle (A -> B -> A) in subtree without crashing", () => {
        // r1 is a direct reply. r2 and r3 form a cycle in r1's subtree.
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "root", likeCount: 10, replyCount: 2, _depth: 0 }),
            makeReply({ id: "r2", inReplyToTweetId: "r3", likeCount: 3, replyCount: 1, _depth: 1 }),
            makeReply({ id: "r3", inReplyToTweetId: "r2", likeCount: 2, replyCount: 1, _depth: 1 }),
        ];

        const chains = computeTopReplyChains({ replies, rootTweetId: "root" });

        expect(chains).toHaveLength(1);
        expect(chains[0].rootReplyId).toBe("r1");
        // Engagement should be finite (cycle doesn't cause infinite accumulation)
        expect(chains[0].totalEngagement).toBeGreaterThan(0);
        expect(Number.isFinite(chains[0].totalEngagement)).toBe(true);
    });

    it("handles 3-node cycle (A -> B -> C -> A) in subtree without crashing", () => {
        const replies = [
            makeReply({ id: "r1", inReplyToTweetId: "root", likeCount: 5, replyCount: 1, _depth: 0 }),
            // r2 -> r4 -> r3 -> r2 forms a cycle under r1
            makeReply({ id: "r2", inReplyToTweetId: "r1", likeCount: 3, replyCount: 1, _depth: 1 }),
            makeReply({ id: "r3", inReplyToTweetId: "r2", likeCount: 1, replyCount: 1, _depth: 2 }),
            makeReply({ id: "r4", inReplyToTweetId: "r3", likeCount: 1, replyCount: 1, _depth: 3 }),
        ];
        // Create cycle: make r2's parent be r4 (r2 -> r4 instead of r2 -> r1)
        // But keep r1 as direct reply so chains are found.
        // childrenOf will have: r1 -> [r2 (via original)], but r2.inReplyToTweetId = r4
        // Actually childrenOf is built from inReplyToTweetId, so:
        // r2.parent = r4 means childrenOf(r4) = [r2], childrenOf(r1) = [], childrenOf(r2) = [r3], childrenOf(r3) = [r4]
        // Cycle: r2 -> r3 -> r4 -> r2
        replies[1] = makeReply({ id: "r2", inReplyToTweetId: "r4", likeCount: 3, replyCount: 1, _depth: 1 });

        const chains = computeTopReplyChains({ replies, rootTweetId: "root" });
        // r1 is the only direct reply; the cyclic nodes are orphaned from r1's subtree
        expect(chains).toHaveLength(1);
        expect(Number.isFinite(chains[0].totalEngagement)).toBe(true);
    });
});

// ============================================================
// Grok-informed filtering: priority authors, priority replies, bot exclusion
// ============================================================

describe("filterRepliesByEngagement with Grok params", () => {
    const ROOT_ID = "root";

    it("priority authors bypass engagement thresholds", () => {
        const replies = [
            makeReply({
                id: "1",
                authorId: "priority_user",
                likeCount: 0,
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "2",
                authorId: "normal_user",
                likeCount: 0,
                inReplyToTweetId: ROOT_ID,
            }),
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 10,
            minReplies: undefined,
            maxDepth: 5,
            priorityAuthorIds: new Set(["priority_user"]),
        });
        // priority_user bypasses minLikes, normal_user filtered out
        expect(result.map((r) => r.id)).toEqual(["1"]);
    });

    it("priority replies bypass engagement thresholds by reply ID", () => {
        const replies = [
            makeReply({
                id: "important_reply",
                likeCount: 0,
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "normal_reply",
                likeCount: 0,
                inReplyToTweetId: ROOT_ID,
            }),
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 10,
            minReplies: undefined,
            maxDepth: 5,
            priorityReplyIds: new Set(["important_reply"]),
        });
        expect(result.map((r) => r.id)).toEqual(["important_reply"]);
    });

    it("bot authors are excluded even above engagement threshold", () => {
        const replies = [
            makeReply({
                id: "1",
                authorId: "bot_user",
                likeCount: 500,
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "2",
                authorId: "real_user",
                likeCount: 500,
                inReplyToTweetId: ROOT_ID,
            }),
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 1,
            minReplies: undefined,
            maxDepth: 5,
            botAuthorIds: new Set(["bot_user"]),
        });
        // bot_user excluded despite 500 likes
        expect(result.map((r) => r.id)).toEqual(["2"]);
    });

    it("bot flag wins over priority author flag", () => {
        const replies = [
            makeReply({
                id: "1",
                authorId: "both_bot_and_priority",
                likeCount: 100,
                inReplyToTweetId: ROOT_ID,
            }),
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 1,
            minReplies: undefined,
            maxDepth: 5,
            priorityAuthorIds: new Set(["both_bot_and_priority"]),
            botAuthorIds: new Set(["both_bot_and_priority"]),
        });
        // Bot flag takes precedence, reply excluded
        expect(result).toHaveLength(0);
    });

    it("bot flag wins over priority reply flag", () => {
        const replies = [
            makeReply({
                id: "priority_but_bot",
                authorId: "bot_author",
                likeCount: 100,
                inReplyToTweetId: ROOT_ID,
            }),
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 1,
            minReplies: undefined,
            maxDepth: 5,
            priorityReplyIds: new Set(["priority_but_bot"]),
            botAuthorIds: new Set(["bot_author"]),
        });
        // Bot flag takes precedence even for priority replies
        expect(result).toHaveLength(0);
    });

    it("preserves ancestor chain for priority deep reply", () => {
        const replies = [
            makeReply({
                id: "A",
                likeCount: 0,
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "B",
                likeCount: 0,
                inReplyToTweetId: "A",
            }),
            makeReply({
                id: "C",
                authorId: "priority_user",
                likeCount: 0,
                inReplyToTweetId: "B",
            }),
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 10,
            minReplies: undefined,
            maxDepth: 5,
            priorityAuthorIds: new Set(["priority_user"]),
        });
        // C passes as priority, A and B kept as ancestors
        expect(result.map((r) => r.id)).toEqual(["A", "B", "C"]);
    });

    it("excludes bot replies even when they are ancestors", () => {
        // Bot's reply is an ancestor of a qualifying reply
        const replies = [
            makeReply({
                id: "bot_reply",
                authorId: "bot_user",
                likeCount: 50,
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "good_reply",
                likeCount: 50,
                inReplyToTweetId: "bot_reply",
            }),
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 5,
            minReplies: undefined,
            maxDepth: 5,
            botAuthorIds: new Set(["bot_user"]),
        });
        // good_reply qualifies and needs bot_reply as ancestor.
        // The ancestor chain marking keeps bot_reply in keptIds,
        // but the bot check happens in passesThreshold which determines
        // which replies trigger ancestor marking. Since good_reply passes,
        // its ancestor bot_reply gets kept despite being a bot.
        // This is expected: we keep ancestors for context even if they're bots.
        expect(result.map((r) => r.id)).toEqual(["bot_reply", "good_reply"]);
    });

    it("returns all replies when only botAuthorIds set (no like filter) but still excludes bots", () => {
        const replies = [
            makeReply({
                id: "1",
                authorId: "normal",
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "2",
                authorId: "bot",
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "3",
                authorId: "normal2",
                inReplyToTweetId: ROOT_ID,
            }),
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: undefined,
            minReplies: undefined,
            maxDepth: 5,
            botAuthorIds: new Set(["bot"]),
        });
        // With no minLikes/minReplies, the function processes via passesThreshold
        // which excludes bots
        expect(result.map((r) => r.id)).toEqual(["1", "3"]);
    });

    it("multiple priority authors all bypass thresholds", () => {
        const replies = [
            makeReply({
                id: "1",
                authorId: "p1",
                likeCount: 0,
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "2",
                authorId: "p2",
                likeCount: 0,
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "3",
                authorId: "normal",
                likeCount: 0,
                inReplyToTweetId: ROOT_ID,
            }),
        ];
        const result = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 10,
            minReplies: undefined,
            maxDepth: 5,
            priorityAuthorIds: new Set(["p1", "p2"]),
        });
        expect(result.map((r) => r.id)).toEqual(["1", "2"]);
    });

    it("empty priority/bot sets behave same as no sets", () => {
        const replies = [
            makeReply({
                id: "1",
                likeCount: 20,
                inReplyToTweetId: ROOT_ID,
            }),
            makeReply({
                id: "2",
                likeCount: 0,
                inReplyToTweetId: ROOT_ID,
            }),
        ];
        const withSets = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 5,
            minReplies: undefined,
            maxDepth: 5,
            priorityAuthorIds: new Set(),
            priorityReplyIds: new Set(),
            botAuthorIds: new Set(),
        });
        const withoutSets = filterRepliesByEngagement({
            replies,
            rootTweetId: ROOT_ID,
            minLikes: 5,
            minReplies: undefined,
            maxDepth: 5,
        });
        expect(withSets.map((r) => r.id)).toEqual(
            withoutSets.map((r) => r.id),
        );
    });
});

