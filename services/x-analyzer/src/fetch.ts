import "dotenv/config";
import {
    writeFileSync,
    readFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    renameSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { TwitterApi, ApiResponseError, ApiRequestError } from "twitter-api-v2";
import {
    createGrokClient,
    scoutResultSchema,
    botDetectionResultSchema,
    enrichResultSchema,
} from "./grok.js";
import type { GrokClient, ScoutResult } from "./grok.js";
import type {
    Tweetv2SearchParams,
    Tweetv2FieldsParams,
    InlineErrorV2,
    TweetV2,
    UserV2,
} from "twitter-api-v2";

// --- Zod schemas (local file storage only — API types come from twitter-api-v2) ---

const tweetDataSchema = z.object({
    id: z.string(),
    text: z.string(),
    authorId: z.string(),
    authorUsername: z.string(),
    createdAt: z.string(),
    likeCount: z.number(),
    replyCount: z.number(),
    retweetCount: z.number(),
    quoteCount: z.number(),
});

const replySchema = tweetDataSchema.extend({
    inReplyToTweetId: z.string().nullable(),
    _depth: z.number().optional(),
});

// Recursive schema: a quote tweet can have its own explored thread
// (replies + nested quotes). Thread is only present if the quote had
// enough engagement to warrant exploration.
interface QuoteThread extends TweetData {
    quotedTweetId: string;
    thread?: {
        replies: Reply[];
        quotes: QuoteThread[];
    };
}

const quoteThreadSchema: z.ZodType<QuoteThread> = z.lazy(() =>
    tweetDataSchema.extend({
        quotedTweetId: z.string(),
        thread: z
            .object({
                replies: z.array(replySchema),
                quotes: z.array(quoteThreadSchema),
            })
            .optional(),
    }),
);

const fetchStatsSchema = z.object({
    totalFetchedReplies: z.number(),
    totalFilteredReplies: z.number(),
    estimatedCost: z.number(),
    stoppedEarly: z.boolean(),
    stopReason: z
        .enum([
            "complete",
            "max-tweets",
            "max-cost",
            "quality-drop",
            "priority-cap",
        ])
        .optional(),
    // Engagement thresholds saved for resume re-filtering (e.g. after bot detection)
    resolvedMinLikes: z.number().optional(),
    resolvedMinReplies: z.number().optional(),
});

const threadStatsSchema = z.object({
    uniqueAuthors: z.number(),
    totalReplies: z.number(),
    directReplies: z.number(),
    nestedReplies: z.number(),
    maxDepth: z.number(),
    averageDepth: z.number(),
    engagementDistribution: z.object({
        p25: z.number(),
        p50: z.number(),
        p75: z.number(),
        p99: z.number(),
    }),
    topAuthors: z.array(
        z.object({
            username: z.string(),
            authorId: z.string(),
            replyCount: z.number(),
            totalLikes: z.number(),
        }),
    ),
    authorsByReplyCount: z.object({
        single: z.number(),
        twoToThree: z.number(),
        fourPlus: z.number(),
    }),
    timeSpan: z.object({
        first: z.string(),
        last: z.string(),
        durationHours: z.number(),
    }),
    quoteStats: z
        .object({
            totalQuotes: z.number(),
            quotesWithThreads: z.number(),
            totalQuoteReplies: z.number(),
            uniqueQuoteAuthors: z.number(),
            engagementDistribution: z
                .object({
                    p25: z.number(),
                    p50: z.number(),
                    p75: z.number(),
                    p99: z.number(),
                })
                .optional(),
        })
        .optional(),
});

const authorDataSchema = z.object({
    username: z.string(),
    bio: z.string().optional(),
    followerCount: z.number().optional(),
    followingCount: z.number().optional(),
    tweetCount: z.number().optional(),
    verifiedType: z.string().optional(),
    accountCreatedAt: z.string().optional(),
});

export type AuthorData = z.infer<typeof authorDataSchema>;

const authorEntrySchema = authorDataSchema.extend({
    repliesInThread: z.number(),
    totalLikesInThread: z.number(),
    replyIds: z.array(z.string()),
});

const replyChainMessageSchema = z.object({
    replyId: z.string(),
    authorUsername: z.string(),
    text: z.string(),
    likeCount: z.number(),
    depth: z.number(),
});

const replyChainSchema = z.object({
    rootReplyId: z.string(),
    totalEngagement: z.number(),
    depth: z.number(),
    messages: z.array(replyChainMessageSchema),
});

// Use z.lazy for self-referential _quotedThread field
export const rawThreadDataSchema: z.ZodType<RawThreadDataInput> = z.lazy(
    () =>
        z.object({
            originalTweet: tweetDataSchema,
            replies: z.array(replySchema),
            quotes: z.array(quoteThreadSchema).optional(),
            fetchedAt: z.string(),
            tweetUrl: z.string(),
            _nextToken: z.string().optional(),
            _fetchStats: fetchStatsSchema.optional(),
            _threadStats: threadStatsSchema.optional(),
            _authors: z.record(z.string(), authorEntrySchema).optional(),
            _topReplyChains: z.array(replyChainSchema).optional(),
            // Grok x_search intelligence (optional — present when XAI_API_KEY is set)
            _scout: scoutResultSchema.optional(),
            _botDetection: botDetectionResultSchema.optional(),
            _grokContext: enrichResultSchema.optional(),
            // If the analyzed tweet is itself a quote tweet, persist the quoted
            // tweet ID so resume can fetch it even if the process crashes before step 10
            _quotedTweetId: z.string().optional(),
            // The quoted tweet's full thread analysis (max depth 1 — no recursion)
            _quotedThread: z.lazy(() => rawThreadDataSchema).optional(),
        }),
);

// Explicit interface needed for z.lazy self-reference
interface RawThreadDataInput {
    originalTweet: z.infer<typeof tweetDataSchema>;
    replies: z.infer<typeof replySchema>[];
    quotes?: QuoteThread[];
    fetchedAt: string;
    tweetUrl: string;
    _nextToken?: string;
    _fetchStats?: z.infer<typeof fetchStatsSchema>;
    _threadStats?: z.infer<typeof threadStatsSchema>;
    _authors?: Record<string, z.infer<typeof authorEntrySchema>>;
    _topReplyChains?: z.infer<typeof replyChainSchema>[];
    _scout?: z.infer<typeof scoutResultSchema>;
    _botDetection?: z.infer<typeof botDetectionResultSchema>;
    _grokContext?: z.infer<typeof enrichResultSchema>;
    _quotedTweetId?: string;
    _quotedThread?: RawThreadDataInput;
}

// --- Types (derived from schemas) ---

export type TweetData = z.infer<typeof tweetDataSchema>;
export type Reply = z.infer<typeof replySchema>;
export type { QuoteThread };
type FetchStats = z.infer<typeof fetchStatsSchema>;
export type RawThreadData = z.infer<typeof rawThreadDataSchema>;

export interface FetchOptions {
    maxTweets: number | undefined;
    maxCost: number | undefined;
    autoPct: number;
    maxDepth: number;
    sortOrder: "recency" | "relevancy";
    noQualityStop: boolean;
    noLimit: boolean;
    includeQuotes: boolean;
    maxQuoteDepth: number;
}

const DEFAULT_FETCH_OPTIONS: FetchOptions = {
    maxTweets: undefined,
    maxCost: undefined,
    autoPct: 10,
    maxDepth: 5,
    sortOrder: "relevancy",
    noQualityStop: false,
    noLimit: false,
    includeQuotes: true,
    maxQuoteDepth: 1,
};

// --- Config ---

if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    process.exit(0);
}

const BEARER_TOKEN = process.env.X_BEARER_TOKEN;
const MAX_RETRIES = 3;
const MAX_RATE_LIMIT_RETRIES = 10;
const RETRY_BASE_MS = 2000;
const COST_PER_POST = 0.005;
const COST_PER_USER = 0.01;
const MAX_EMPTY_PAGES = 3;

function calculateSmartBudget({
    replyCount,
    quoteCount,
    includeQuotes,
}: {
    replyCount: number;
    quoteCount: number;
    includeQuotes: boolean;
}): number | undefined {
    const fullReplyCost =
        (replyCount + 1) * COST_PER_POST + replyCount * COST_PER_USER;
    const fullQuoteCost = includeQuotes
        ? quoteCount * (COST_PER_POST + COST_PER_USER) * 1.5
        : 0;
    const fullCost = fullReplyCost + fullQuoteCost;

    console.log(
        `  [Budget] Calculating: replyCost=$${fullReplyCost.toFixed(3)}, quoteCost=$${fullQuoteCost.toFixed(3)}, fullCost=$${fullCost.toFixed(3)} (${replyCount} replies, ${quoteCount} quotes)`,
    );

    // Small threads: fetch everything, no cap needed
    if (fullCost <= 3) {
        console.log(
            `  [Budget] Full cost $${fullCost.toFixed(3)} <= $3 — no cap needed`,
        );
        return undefined;
    }

    // Larger threads: sqrt-scaled cap, min $3, max $25
    const cap = Math.min(25, Math.max(3, Math.ceil(Math.sqrt(replyCount) * 0.3)));
    console.log(
        `  [Budget] sqrt-scaled cap: sqrt(${replyCount}) * 0.3 = ${(Math.sqrt(replyCount) * 0.3).toFixed(2)} → clamped to $${cap}`,
    );
    return cap;
}

if (!BEARER_TOKEN) {
    console.error(
        "Error: X_BEARER_TOKEN is not set. Copy env.example to .env and fill it in.",
    );
    process.exit(1);
}

const client = new TwitterApi(BEARER_TOKEN).readOnly;

const TWEET_API_FIELDS = {
    expansions: ["author_id"],
    "tweet.fields": ["public_metrics", "created_at", "author_id"],
    "user.fields": [
        "username",
        "description",
        "public_metrics",
        "verified_type",
        "created_at",
    ],
} satisfies Partial<Tweetv2FieldsParams>;

// --- Helpers ---

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = resolve(__dirname, "..", "output");

let _outputDirOverride: string | undefined;
export function _setOutputDir(dir: string): void {
    _outputDirOverride = dir;
}
function getOutputDir(): string {
    return _outputDirOverride ?? DEFAULT_OUTPUT_DIR;
}

function outputPath(tweetId: string): string {
    return resolve(getOutputDir(), `${tweetId}.json`);
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

export function saveProgress({
    data,
    tweetId,
}: {
    data: RawThreadData;
    tweetId: string;
}): void {
    mkdirSync(getOutputDir(), { recursive: true });
    const target = outputPath(tweetId);
    const tmp = `${target}.tmp`;
    const json = JSON.stringify(data, null, 2);
    writeFileSync(tmp, json);
    renameSync(tmp, target);
    console.log(
        `  [Save] Wrote ${(json.length / 1024).toFixed(1)}KB to ${target} (${data.replies.length} replies, ${data.quotes?.length ?? 0} quotes)`,
    );
}

export function loadExisting(tweetId: string): RawThreadData | null {
    const path = outputPath(tweetId);
    if (!existsSync(path)) {
        console.log(`  [Resume] No existing file at ${path}`);
        return null;
    }
    try {
        const raw = readFileSync(path, "utf-8");
        console.log(
            `  [Resume] Loading existing file: ${path} (${(raw.length / 1024).toFixed(1)}KB)`,
        );
        const data = rawThreadDataSchema.parse(JSON.parse(raw));
        console.log(
            `  [Resume] Loaded: ${data.replies.length} replies, ${data.quotes?.length ?? 0} quotes, ` +
                `nextToken=${data._nextToken ? "present" : "none"}, scout=${data._scout ? "present" : "none"}, ` +
                `botDetection=${data._botDetection ? "present" : "none"}, grokContext=${data._grokContext ? "present" : "none"}`,
        );
        return data;
    } catch (error) {
        console.warn(
            `  [Resume] Failed to parse existing file ${path}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
    }
}

export function findIncompleteFile(): {
    data: RawThreadData;
    tweetId: string;
} | null {
    const outputDir = getOutputDir();
    mkdirSync(outputDir, { recursive: true });
    const files = readdirSync(outputDir).filter((f) => f.endsWith(".json"));
    console.log(
        `  [Resume] Scanning ${files.length} JSON files in ${outputDir} for incomplete fetches`,
    );
    for (const file of files) {
        try {
            const raw = readFileSync(resolve(outputDir, file), "utf-8");
            const data = rawThreadDataSchema.parse(JSON.parse(raw));
            if (data._nextToken) {
                console.log(
                    `  [Resume] Found incomplete: ${file} (${data.replies.length} replies, nextToken present)`,
                );
                return { data, tweetId: data.originalTweet.id };
            }
            console.log(
                `  [Resume] ${file}: complete (${data.replies.length} replies)`,
            );
        } catch {
            console.log(`  [Resume] ${file}: failed to parse, skipping`);
            continue;
        }
    }
    console.log("  [Resume] No incomplete files found");
    return null;
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let rateLimitRetries = 0;
    for (let attempt = 0; ; attempt++) {
        try {
            const result = await fn();
            if (attempt > 0) {
                console.log(
                    `  [Retry] Succeeded after ${attempt} retries`,
                );
            }
            return result;
        } catch (error) {
            // Rate limited — wait for reset then retry (with ceiling)
            if (
                error instanceof ApiResponseError &&
                error.rateLimitError &&
                error.rateLimit
            ) {
                rateLimitRetries++;
                if (rateLimitRetries > MAX_RATE_LIMIT_RETRIES) {
                    throw new Error(
                        `Rate limited ${MAX_RATE_LIMIT_RETRIES} times consecutively. Giving up.`,
                    );
                }
                const waitMs = error.rateLimit.reset * 1000 - Date.now() + 1000;
                const waitSecs = Math.ceil(Math.max(waitMs, 1000) / 1000);
                console.log(
                    `  [Retry] Rate limited (${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES}). ` +
                        `Reset at ${new Date(error.rateLimit.reset * 1000).toISOString()}, waiting ${waitSecs}s...`,
                );
                console.log(
                    `  [Retry] Rate limit details: limit=${error.rateLimit.limit}, remaining=${error.rateLimit.remaining}`,
                );
                await sleep(Math.max(waitMs, 1000));
                continue;
            }

            // Network errors — retry with backoff
            if (error instanceof ApiRequestError && attempt < MAX_RETRIES) {
                const waitMs = RETRY_BASE_MS * 2 ** attempt;
                console.log(
                    `  [Retry] Network error (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${error.message}. Retrying in ${waitMs / 1000}s...`,
                );
                await sleep(waitMs);
                continue;
            }

            // Server errors (5xx) — retry with backoff
            if (
                error instanceof ApiResponseError &&
                error.code >= 500 &&
                attempt < MAX_RETRIES
            ) {
                const waitMs = RETRY_BASE_MS * 2 ** attempt;
                console.log(
                    `  [Retry] Server error ${error.code} (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${error.message}. Retrying in ${waitMs / 1000}s...`,
                );
                await sleep(waitMs);
                continue;
            }

            console.log(
                `  [Retry] Unrecoverable error after ${attempt + 1} attempts: ${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }
}

const TWEET_URL_PATTERN = /(?:x\.com|twitter\.com)\/\w+\/status\/(\d+)/;

export function extractTweetId(url: string): string {
    const match = TWEET_URL_PATTERN.exec(url);
    if (!match?.[1]) {
        throw new Error(
            `Cannot extract tweet ID from URL: ${url}\nExpected format: https://x.com/user/status/123456789`,
        );
    }
    return match[1];
}

// --- CLI parsing ---

function parsePositiveInt({
    value,
    flag,
}: {
    value: string | undefined;
    flag: string;
}): number {
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) {
        throw new Error(`${flag} must be a positive integer, got "${value}"`);
    }
    return num;
}

function parseNonNegativeInt({
    value,
    flag,
}: {
    value: string | undefined;
    flag: string;
}): number {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
        throw new Error(
            `${flag} must be a non-negative integer, got "${value}"`,
        );
    }
    return num;
}

function parsePositiveFloat({
    value,
    flag,
}: {
    value: string | undefined;
    flag: string;
}): number {
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) {
        throw new Error(`${flag} must be a positive number, got "${value}"`);
    }
    return num;
}

// Engagement on tweets follows a power-law distribution: a handful of
// replies/quotes get huge engagement, then it drops off sharply. A linear
// percentage threshold (e.g. "10% of top") is too aggressive for viral
// tweets (5000-like threshold when top is 50K) and too lenient for small
// ones. sqrt gives a sub-linear curve that naturally adapts:
// small threads → selective, viral threads → more permissive.
export function autoCalibrate({
    topMetric,
    autoPct,
}: {
    topMetric: number;
    autoPct: number;
}): number | undefined {
    if (topMetric <= 0) {
        console.log(
            `  [Filter] autoCalibrate: topMetric=${topMetric} <= 0, returning undefined`,
        );
        return undefined;
    }
    const raw = Math.sqrt((topMetric * autoPct) / 10);
    const result = Math.max(1, Math.ceil(raw));
    console.log(
        `  [Filter] autoCalibrate: sqrt((${topMetric} * ${autoPct}) / 10) = ${raw.toFixed(2)} → threshold=${result}`,
    );
    return result;
}

function printUsage(): void {
    console.log(
        "X Thread Analyzer — Fetch a tweet's replies and quote tweets.\n",
    );
    console.log("Usage:");
    console.log("  pnpm x-fetch <tweet-url> [options]");
    console.log("  pnpm x-fetch --resume [tweet-url] [options]");
    console.log("\nBudget controls:");
    console.log(
        "  --max-tweets N        Stop after fetching N replies (default: unlimited)",
    );
    console.log(
        "  --max-cost N          Stop when estimated cost exceeds $N (default: unlimited)",
    );
    console.log(
        "                        May overshoot by ~$0.50 (one extra page)",
    );
    console.log("\nQuote tweet exploration (on by default):");
    console.log(
        "  --no-quotes           Skip quote tweets entirely",
    );
    console.log(
        "  --include-quotes      (no-op, quotes are already on by default)",
    );
    console.log(
        "  --max-quote-depth N   How deep to follow quote threads (default: 1)",
    );
    console.log(
        "                        0 = flat list only, 1 = replies of quotes, 2 = quotes of quotes",
    );
    console.log("\nEngagement filtering (always auto-calibrated):");
    console.log(
        "  Engagement thresholds are automatically set from page 1 data using a",
    );
    console.log(
        "  sqrt-based formula that adapts to the tweet's scale. Low-engagement",
    );
    console.log(
        "  replies are saved to .filtered.json; the raw file keeps everything.",
    );
    console.log(
        "  --auto-pct N          Sensitivity for auto-threshold (default: 10)",
    );
    console.log(
        "                        Higher = more selective, lower = more permissive",
    );
    console.log(
        "  --max-depth N         Max sub-thread depth for filtering (default: 5)",
    );
    console.log("\nPagination:");
    console.log(
        '  --sort-order X        "relevancy" (default) or "recency"',
    );
    console.log(
        "  --no-quality-stop     Disable auto-stop when page quality drops",
    );
    console.log("\nSafety:");
    console.log(
        "  --no-limit            Skip auto-budget and fetch everything",
    );
    console.log("\nOther:");
    console.log("  --help, -h            Show this help message");
    console.log("\nSmart budget:");
    console.log(
        "  X API charges $0.005/post + $0.010/user read. For viral tweets,",
    );
    console.log(
        "  the tool auto-calculates a budget based on reply/quote counts",
    );
    console.log(
        "  (sqrt-scaled, $3-$25). Small threads (<$3) have no cap.",
    );
    console.log(
        "  Use --max-cost to override, or --no-limit for uncapped fetching.",
    );
    console.log("\nExamples:");
    console.log("  # Just works — smart budget, replies + quotes, breadth-first");
    console.log("  pnpm x-fetch https://x.com/user/status/123\n");
    console.log("  # Custom budget");
    console.log(
        "  pnpm x-fetch https://x.com/user/status/123 --max-cost 10\n",
    );
    console.log("  # Replies only, no quotes");
    console.log(
        "  pnpm x-fetch https://x.com/user/status/123 --no-quotes\n",
    );
    console.log("  # Deep quote exploration (quotes of quotes)");
    console.log(
        "  pnpm x-fetch https://x.com/user/status/123 --max-quote-depth 2\n",
    );
    console.log("  # Resume an interrupted fetch");
    console.log("  pnpm x-fetch --resume\n");
    console.log("  # Fetch everything, no budget cap");
    console.log("  pnpm x-fetch https://x.com/user/status/123 --no-limit");
}

export function parseFetchOptions(args: string[]): {
    options: FetchOptions;
    tweetUrl: string | undefined;
    isResume: boolean;
} {
    if (args.includes("--help") || args.includes("-h")) {
        printUsage();
        process.exit(0);
    }

    const isResume = args.includes("--resume");
    let tweetUrl: string | undefined;
    const options: FetchOptions = { ...DEFAULT_FETCH_OPTIONS };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--resume") continue;

        const getVal = (): string | undefined =>
            arg.includes("=") ? arg.split("=")[1] : args[++i];

        if (arg === "--max-tweets" || arg.startsWith("--max-tweets=")) {
            options.maxTweets = parsePositiveInt({
                value: getVal(),
                flag: "--max-tweets",
            });
        } else if (arg === "--max-cost" || arg.startsWith("--max-cost=")) {
            options.maxCost = parsePositiveFloat({
                value: getVal(),
                flag: "--max-cost",
            });
        } else if (arg === "--include-quotes") {
            options.includeQuotes = true;
        } else if (arg === "--no-quotes") {
            options.includeQuotes = false;
        } else if (
            arg === "--max-quote-depth" ||
            arg.startsWith("--max-quote-depth=")
        ) {
            options.maxQuoteDepth = parseNonNegativeInt({
                value: getVal(),
                flag: "--max-quote-depth",
            });
        } else if (arg === "--auto-pct" || arg.startsWith("--auto-pct=")) {
            options.autoPct = parsePositiveInt({
                value: getVal(),
                flag: "--auto-pct",
            });
        } else if (arg === "--max-depth" || arg.startsWith("--max-depth=")) {
            options.maxDepth = parsePositiveInt({
                value: getVal(),
                flag: "--max-depth",
            });
        } else if (arg === "--sort-order" || arg.startsWith("--sort-order=")) {
            const val = getVal();
            if (val !== "recency" && val !== "relevancy") {
                throw new Error(
                    `--sort-order must be "recency" or "relevancy", got "${val}"`,
                );
            }
            options.sortOrder = val;
        } else if (arg === "--no-quality-stop") {
            options.noQualityStop = true;
        } else if (arg === "--no-limit") {
            options.noLimit = true;
        } else if (!arg.startsWith("--")) {
            tweetUrl = arg;
        } else {
            throw new Error(`Unknown flag: ${arg}`);
        }
    }

    return { options, tweetUrl, isResume };
}

// --- Data mapping ---

export function mapTweetToData({
    tweet,
    users,
}: {
    tweet: TweetV2;
    users: Map<string, AuthorData>;
}): TweetData {
    return {
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id ?? "unknown",
        authorUsername:
            users.get(tweet.author_id ?? "")?.username ?? "unknown",
        createdAt: tweet.created_at ?? new Date().toISOString(),
        likeCount: tweet.public_metrics?.like_count ?? 0,
        replyCount: tweet.public_metrics?.reply_count ?? 0,
        retweetCount: tweet.public_metrics?.retweet_count ?? 0,
        quoteCount: tweet.public_metrics?.quote_count ?? 0,
    };
}

export function tweetToReply({
    tweet,
    users,
}: {
    tweet: TweetV2;
    users: Map<string, AuthorData>;
}): Reply {
    return {
        ...mapTweetToData({ tweet, users }),
        inReplyToTweetId:
            tweet.referenced_tweets?.find((r) => r.type === "replied_to")?.id ??
            null,
    };
}

export function annotateReplyDepths({
    replies,
    rootTweetId,
}: {
    replies: Reply[];
    rootTweetId: string;
}): void {
    const replyById = new Map<string, Reply>();
    for (const reply of replies) {
        replyById.set(reply.id, reply);
    }

    const depthCache = new Map<string, number>();
    const inProgress = new Set<string>();

    const computeDepth = (replyId: string): number => {
        const cached = depthCache.get(replyId);
        if (cached !== undefined) return cached;
        if (inProgress.has(replyId)) {
            depthCache.set(replyId, 0);
            return 0;
        }
        inProgress.add(replyId);
        const reply = replyById.get(replyId);
        if (
            !reply?.inReplyToTweetId ||
            reply.inReplyToTweetId === rootTweetId
        ) {
            depthCache.set(replyId, 0);
            inProgress.delete(replyId);
            return 0;
        }
        // Guard against missing parents: if parent isn't in replyById, treat as depth 0
        if (!replyById.has(reply.inReplyToTweetId)) {
            depthCache.set(replyId, 0);
            inProgress.delete(replyId);
            return 0;
        }
        const parentDepth = computeDepth(reply.inReplyToTweetId);
        const depth = parentDepth + 1;
        depthCache.set(replyId, depth);
        inProgress.delete(replyId);
        return depth;
    };

    for (const reply of replies) {
        reply._depth = computeDepth(reply.id);
    }
}

function annotateQuoteTreeDepths({
    quotes,
}: {
    quotes: QuoteThread[];
}): void {
    for (const quote of quotes) {
        if (quote.thread) {
            annotateReplyDepths({
                replies: quote.thread.replies,
                rootTweetId: quote.id,
            });
            annotateQuoteTreeDepths({ quotes: quote.thread.quotes });
        }
    }
}

function usersMapFromIncludes(
    users: UserV2[] | undefined,
): Map<string, AuthorData> {
    return new Map(
        users?.map((u) => [
            u.id,
            {
                username: u.username,
                bio: u.description,
                followerCount: u.public_metrics?.followers_count,
                followingCount: u.public_metrics?.following_count,
                tweetCount: u.public_metrics?.tweet_count,
                verifiedType: u.verified_type,
                accountCreatedAt: u.created_at,
            },
        ]) ?? [],
    );
}

function logInlineErrors(errors: InlineErrorV2[]): void {
    if (errors.length === 0) return;
    console.warn(`  API returned ${errors.length} inline error(s):`);
    for (const err of errors) {
        console.warn(`    - ${err.title}: ${err.detail}`);
    }
}

// --- Pagination controller ---

type StopReason = "max-tweets" | "max-cost" | "quality-drop" | "priority-cap";

// After quality-drop first triggers, allow up to this many extra pages
// to search for unfetched priority reply IDs before force-stopping.
// ~$2.50 worst case (5 pages × ~$0.50/page).
const MAX_EXTRA_PAGES_FOR_PRIORITIES = 5;

export interface PaginationController {
    tweetCount: number;
    uniqueUserCount: number;
    estimatedCost: () => number;
    recordPage: (pageTweets: Reply[]) => void;
    shouldStop: (options: FetchOptions) => {
        stop: boolean;
        reason?: StopReason;
    };
    resolvedMinLikes: number | undefined;
    resolvedMinReplies: number | undefined;
}

export function createPaginationController({
    existingReplies,
    costOffset = 0,
    priorityReplyIds,
}: {
    existingReplies: Reply[];
    costOffset?: number;
    priorityReplyIds?: Set<string>;
}): PaginationController {
    let tweetCount = existingReplies.length;
    const uniqueUserIds = new Set(existingReplies.map((r) => r.authorId));
    const fetchedReplyIds = new Set(existingReplies.map((r) => r.id));
    let resolvedMinLikes: number | undefined;
    let resolvedMinReplies: number | undefined;
    let pageNumber = 0;
    let lastPageMaxLikes = 0;
    let lastPageMaxReplies = 0;
    let extraPagesAfterDrop = 0;
    let qualityDropTriggered = false;

    const estimatedCost = (): number => {
        return (
            (tweetCount + 1) * COST_PER_POST +
            uniqueUserIds.size * COST_PER_USER +
            costOffset
        );
    };

    const recordPage = (pageTweets: Reply[]): void => {
        pageNumber++;
        const newUsers = new Set<string>();
        for (const tweet of pageTweets) {
            tweetCount++;
            if (!uniqueUserIds.has(tweet.authorId)) {
                newUsers.add(tweet.authorId);
            }
            uniqueUserIds.add(tweet.authorId);
            fetchedReplyIds.add(tweet.id);
        }

        lastPageMaxLikes =
            pageTweets.length > 0
                ? Math.max(...pageTweets.map((t) => t.likeCount))
                : 0;

        lastPageMaxReplies =
            pageTweets.length > 0
                ? Math.max(...pageTweets.map((t) => t.replyCount))
                : 0;

        console.log(
            `  [Pagination] Page ${pageNumber}: ${pageTweets.length} tweets, ${newUsers.size} new users, ` +
                `maxLikes=${lastPageMaxLikes}, maxReplies=${lastPageMaxReplies}, ` +
                `cumulative: ${tweetCount} tweets, ${uniqueUserIds.size} users, $${estimatedCost().toFixed(3)}`,
        );
    };

    const shouldStop = (
        options: FetchOptions,
    ): { stop: boolean; reason?: StopReason } => {
        console.log(
            `  [Pagination] shouldStop check: page=${pageNumber}, tweets=${tweetCount}, cost=$${estimatedCost().toFixed(3)}, ` +
                `maxTweets=${options.maxTweets ?? "none"}, maxCost=${options.maxCost !== undefined ? `$${options.maxCost}` : "none"}, ` +
                `noQualityStop=${options.noQualityStop}`,
        );

        // Always auto-calibrate engagement thresholds from page 1 data.
        // Uses sqrt-based formula so thresholds adapt to any scale:
        // small threads get selective, viral threads get permissive.
        if (pageNumber === 1) {
            console.log(
                `  [Pagination] Calibrating thresholds from page 1 (autoPct=${options.autoPct})`,
            );
            resolvedMinLikes = autoCalibrate({
                topMetric: lastPageMaxLikes,
                autoPct: options.autoPct,
            });
            if (resolvedMinLikes !== undefined) {
                console.log(
                    `  Auto-calibrated min-likes: ${resolvedMinLikes} (top reply: ${lastPageMaxLikes} likes)`,
                );
            }
            resolvedMinReplies = autoCalibrate({
                topMetric: lastPageMaxReplies,
                autoPct: options.autoPct,
            });
            if (resolvedMinReplies !== undefined) {
                console.log(
                    `  Auto-calibrated min-replies: ${resolvedMinReplies} (top reply: ${lastPageMaxReplies} replies)`,
                );
            }
        }

        // Hard caps — always enforced regardless of priorities
        if (
            options.maxTweets !== undefined &&
            tweetCount >= options.maxTweets
        ) {
            console.log(
                `  [Pagination] STOP: max-tweets reached (${tweetCount} >= ${options.maxTweets})`,
            );
            return { stop: true, reason: "max-tweets" };
        }
        if (
            options.maxCost !== undefined &&
            estimatedCost() >= options.maxCost
        ) {
            console.log(
                `  [Pagination] STOP: max-cost reached ($${estimatedCost().toFixed(3)} >= $${options.maxCost})`,
            );
            return { stop: true, reason: "max-cost" };
        }

        // Quality drop — skip on page 1 (need it for calibration)
        const isQualityDrop =
            !options.noQualityStop &&
            pageNumber > 1 &&
            resolvedMinLikes !== undefined &&
            lastPageMaxLikes < resolvedMinLikes;

        console.log(
            `  [Pagination] Quality check: lastPageMaxLikes=${lastPageMaxLikes}, resolvedMinLikes=${resolvedMinLikes ?? "none"}, ` +
                `isQualityDrop=${isQualityDrop}, qualityDropTriggered=${qualityDropTriggered}`,
        );

        if (isQualityDrop) {
            if (!qualityDropTriggered) {
                qualityDropTriggered = true;
            }
            extraPagesAfterDrop++;

            // If priority reply IDs exist and some haven't been fetched yet,
            // continue for up to MAX_EXTRA_PAGES_FOR_PRIORITIES to find them.
            // This prevents dropping minority voices identified by scout.
            if (priorityReplyIds && priorityReplyIds.size > 0) {
                const unfetchedCount = [...priorityReplyIds].filter(
                    (id) => !fetchedReplyIds.has(id),
                ).length;

                if (
                    unfetchedCount > 0 &&
                    extraPagesAfterDrop <=
                        MAX_EXTRA_PAGES_FOR_PRIORITIES
                ) {
                    console.log(
                        `  Quality drop triggered but continuing — ${unfetchedCount} priority reply(s) still missing ` +
                            `(extra page ${extraPagesAfterDrop}/${MAX_EXTRA_PAGES_FOR_PRIORITIES})`,
                    );
                    return { stop: false };
                }

                if (
                    unfetchedCount > 0 &&
                    extraPagesAfterDrop >
                        MAX_EXTRA_PAGES_FOR_PRIORITIES
                ) {
                    console.log(
                        `  Priority search cap reached — ${unfetchedCount} priority reply(s) not found after ${MAX_EXTRA_PAGES_FOR_PRIORITIES} extra pages`,
                    );
                    return { stop: true, reason: "priority-cap" };
                }
            }

            return { stop: true, reason: "quality-drop" };
        }

        console.log("  [Pagination] CONTINUE: no stop conditions met");
        return { stop: false };
    };

    return {
        get tweetCount() {
            return tweetCount;
        },
        get uniqueUserCount() {
            return uniqueUserIds.size;
        },
        estimatedCost,
        recordPage,
        shouldStop,
        get resolvedMinLikes() {
            return resolvedMinLikes;
        },
        get resolvedMinReplies() {
            return resolvedMinReplies;
        },
    };
}

// --- API calls ---

function makeFetchStats({
    replyCount,
    estimatedCost,
    stoppedEarly,
    stopReason,
    resolvedMinLikes,
    resolvedMinReplies,
}: {
    replyCount: number;
    estimatedCost: number;
    stoppedEarly: boolean;
    stopReason: FetchStats["stopReason"];
    resolvedMinLikes?: number;
    resolvedMinReplies?: number;
}): FetchStats {
    return {
        totalFetchedReplies: replyCount,
        totalFilteredReplies: replyCount,
        estimatedCost,
        stoppedEarly,
        stopReason,
        resolvedMinLikes,
        resolvedMinReplies,
    };
}

export interface FetchTweetResult {
    tweet: TweetData;
    quotedTweetId: string | undefined;
}

export async function fetchTweet(tweetId: string): Promise<FetchTweetResult> {
    console.log(`Fetching tweet ${tweetId}...`);

    const fetchFields = {
        ...TWEET_API_FIELDS,
        expansions: [...TWEET_API_FIELDS.expansions, "referenced_tweets.id"],
        "tweet.fields": [
            ...TWEET_API_FIELDS["tweet.fields"],
            "referenced_tweets",
        ],
    };

    console.log(
        `  [API] singleTweet(${tweetId}) with fields: ${JSON.stringify(fetchFields)}`,
    );

    const result = await withRetry(() =>
        client.v2.singleTweet(tweetId, fetchFields),
    );

    const userCount = result.includes?.users?.length ?? 0;
    console.log(
        `  [API] singleTweet response: data.id=${result.data.id}, included_users=${userCount}, ` +
            `errors=${result.errors?.length ?? 0}`,
    );
    console.log(
        `  [API] Tweet metrics: likes=${result.data.public_metrics?.like_count ?? "?"}, ` +
            `replies=${result.data.public_metrics?.reply_count ?? "?"}, ` +
            `retweets=${result.data.public_metrics?.retweet_count ?? "?"}, ` +
            `quotes=${result.data.public_metrics?.quote_count ?? "?"}`,
    );

    if (result.errors) {
        logInlineErrors(result.errors);
    }

    const quotedTweetId = result.data.referenced_tweets?.find(
        (r) => r.type === "quoted",
    )?.id;

    if (result.data.referenced_tweets?.length) {
        console.log(
            `  [API] referenced_tweets: ${JSON.stringify(result.data.referenced_tweets)}`,
        );
    }
    if (quotedTweetId) {
        console.log(`  [API] Tweet quotes another tweet: ${quotedTweetId}`);
    } else {
        console.log(`  [API] Tweet does not quote another tweet`);
    }

    return {
        tweet: mapTweetToData({
            tweet: result.data,
            users: usersMapFromIncludes(result.includes?.users),
        }),
        quotedTweetId,
    };
}

interface FetchConversationParams {
    conversationId: string;
    result: RawThreadData;
    startToken?: string;
    options: FetchOptions;
    costOffset?: number;
    singlePage?: boolean;
    authorAccumulator?: AuthorAccumulator;
    // When true, skip saving to disk (used for quote thread sub-fetches
    // where the parent saves the combined result via saveContext)
    skipSave?: boolean;
    // Scout-identified priority reply IDs — prevent quality-drop from
    // stopping before these are fetched
    priorityReplyIds?: Set<string>;
}

export async function fetchConversation({
    conversationId,
    result,
    startToken,
    options,
    costOffset,
    singlePage,
    authorAccumulator,
    skipSave,
    priorityReplyIds,
}: FetchConversationParams): Promise<PaginationController> {
    console.log(`Fetching conversation tree for ${conversationId}...`);
    console.log(
        `  [API] fetchConversation: singlePage=${singlePage ?? false}, skipSave=${skipSave ?? false}, ` +
            `costOffset=${costOffset ?? 0}, sortOrder=${options.sortOrder}, ` +
            `priorityReplyIds=${priorityReplyIds?.size ?? 0}`,
    );
    if (startToken) {
        console.log(
            `  Resuming from token (${result.replies.length} replies already saved), token=${startToken.slice(0, 20)}...`,
        );
    }

    const searchParams = {
        ...TWEET_API_FIELDS,
        expansions: [...TWEET_API_FIELDS.expansions, "referenced_tweets.id"],
        "tweet.fields": [
            ...TWEET_API_FIELDS["tweet.fields"],
            "referenced_tweets",
        ],
        max_results: 100,
        sort_order: options.sortOrder,
        ...(startToken ? { next_token: startToken } : {}),
    } satisfies Partial<Tweetv2SearchParams>;

    console.log(
        `  [API] Search query: "conversation_id:${conversationId}" with params: max_results=100, sort_order=${options.sortOrder}`,
    );

    const paginator = await withRetry(() =>
        client.v2.search(`conversation_id:${conversationId}`, searchParams),
    );

    const controller = createPaginationController({
        existingReplies: result.replies,
        costOffset,
        priorityReplyIds,
    });

    // The paginator accumulates tweets/includes/errors across pages.
    // processedCount tracks how many we've already handled so we only
    // process new tweets from each page via .slice(processedCount).
    let processedCount = 0;
    let lastErrorCount = 0;
    let page = 0;

    const processPage = (): Reply[] => {
        const users = usersMapFromIncludes(paginator.includes.users);
        const newTweets = paginator.tweets.slice(processedCount);
        const newReplies: Reply[] = [];

        for (const tweet of newTweets) {
            const reply = tweetToReply({ tweet, users });
            result.replies.push(reply);
            newReplies.push(reply);
        }

        processedCount = paginator.tweets.length;

        if (authorAccumulator) {
            authorAccumulator.ingest({ users, replies: newReplies });
        }

        const newErrors = paginator.errors.slice(lastErrorCount);
        if (newErrors.length > 0) {
            logInlineErrors(newErrors);
        }
        lastErrorCount = paginator.errors.length;

        return newReplies;
    };

    const savePage = ({ newReplies }: { newReplies: Reply[] }): void => {
        page++;
        controller.recordPage(newReplies);
        result._nextToken = paginator.meta.next_token;
        result.fetchedAt = new Date().toISOString();
        if (!skipSave) {
            saveProgress({ data: result, tweetId: conversationId });
        }
        console.log(
            `  Page ${page}: ${newReplies.length} tweets (total: ${result.replies.length}, ~$${controller.estimatedCost().toFixed(3)})${skipSave ? "" : " [saved]"}`,
        );
    };

    // Process and save first page
    savePage({ newReplies: processPage() });

    // Single-page mode: return after page 1 (used by breadth-first Phase 1)
    if (singlePage) {
        return controller;
    }

    // Check budget after first page
    const firstCheck = controller.shouldStop(options);
    if (firstCheck.stop) {
        console.log(
            `  Stopped: ${firstCheck.reason} (fetched ${result.replies.length} replies, ~$${controller.estimatedCost().toFixed(3)})`,
        );
        result._fetchStats = makeFetchStats({
            replyCount: result.replies.length,
            estimatedCost: controller.estimatedCost(),
            stoppedEarly: true,
            stopReason: firstCheck.reason,
            resolvedMinLikes: controller.resolvedMinLikes,
            resolvedMinReplies: controller.resolvedMinReplies,
        });
        if (!skipSave) {
            saveProgress({ data: result, tweetId: conversationId });
        }
        return controller;
    }

    // Fetch remaining pages
    let consecutiveEmptyPages = 0;
    while (!paginator.done) {
        await withRetry(async () => {
            await paginator.fetchNext();
        });
        const newReplies = processPage();

        if (newReplies.length === 0) {
            consecutiveEmptyPages++;
            if (consecutiveEmptyPages >= MAX_EMPTY_PAGES) {
                console.warn(
                    `  ${MAX_EMPTY_PAGES} consecutive empty pages — stopping pagination.`,
                );
                break;
            }
        } else {
            consecutiveEmptyPages = 0;
        }

        savePage({ newReplies });

        const check = controller.shouldStop(options);
        if (check.stop) {
            console.log(
                `  Stopped: ${check.reason} (fetched ${result.replies.length} replies, ~$${controller.estimatedCost().toFixed(3)})`,
            );
            result._fetchStats = makeFetchStats({
                replyCount: result.replies.length,
                estimatedCost: controller.estimatedCost(),
                stoppedEarly: true,
                stopReason: check.reason,
                resolvedMinLikes: controller.resolvedMinLikes,
                resolvedMinReplies: controller.resolvedMinReplies,
            });
            if (!skipSave) {
                saveProgress({ data: result, tweetId: conversationId });
            }
            return controller;
        }
    }

    // Fetch complete — remove resume token
    delete result._nextToken;
    result._fetchStats = makeFetchStats({
        replyCount: result.replies.length,
        estimatedCost: controller.estimatedCost(),
        stoppedEarly: false,
        stopReason: "complete",
        resolvedMinLikes: controller.resolvedMinLikes,
        resolvedMinReplies: controller.resolvedMinReplies,
    });
    if (!skipSave) {
        saveProgress({ data: result, tweetId: conversationId });
    }
    return controller;
}

// --- Quote tweet exploration ---
//
// Quote tweets are where the most interesting discourse happens — influential
// voices adding real takes. We recursively explore the quote tree:
// 1. Fetch the flat list of all quote tweets (cheap)
// 2. Auto-calibrate an engagement threshold from the top quote
// 3. Explore threads (replies + sub-quotes) for qualifying quotes
// 4. At each depth, the threshold decays (÷2) so we naturally dig deeper
//    into high-engagement branches without spending budget on dead ones.

function tweetToQuoteThread({
    tweet,
    users,
    quotedTweetId,
}: {
    tweet: TweetV2;
    users: Map<string, AuthorData>;
    quotedTweetId: string;
}): QuoteThread {
    return {
        ...mapTweetToData({ tweet, users }),
        quotedTweetId,
    };
}

interface ExploreQuoteTreeParams {
    tweetId: string;
    options: FetchOptions;
    depth: number;
    autoThreshold: number | undefined;
    costRef: { value: number };
    // When provided (depth 0 only), saves result to disk after each
    // incremental update so data is never lost if interrupted.
    saveContext?: { result: RawThreadData; rootTweetId: string };
    authorAccumulator?: AuthorAccumulator;
    // Grok-identified priority quotes (explored regardless of engagement threshold)
    priorityQuoteIds?: Set<string>;
}

export async function exploreQuoteTree({
    tweetId,
    options,
    depth,
    autoThreshold,
    costRef,
    saveContext,
    authorAccumulator,
    priorityQuoteIds,
}: ExploreQuoteTreeParams): Promise<QuoteThread[]> {
    console.log(
        `  [Quotes] exploreQuoteTree: tweetId=${tweetId}, depth=${depth}, autoThreshold=${autoThreshold ?? "none"}, ` +
            `costSoFar=$${costRef.value.toFixed(3)}, maxCost=${options.maxCost !== undefined ? `$${options.maxCost}` : "none"}, ` +
            `maxQuoteDepth=${options.maxQuoteDepth}, priorityQuotes=${priorityQuoteIds?.size ?? 0}`,
    );

    // Budget gate — stop if we've already exceeded the cost cap
    if (options.maxCost !== undefined && costRef.value >= options.maxCost) {
        console.log(`  [Quotes] Skipping quotes at depth ${depth}: budget exhausted ($${costRef.value.toFixed(3)} >= $${options.maxCost})`);
        return [];
    }

    console.log(`  Fetching quote tweets for ${tweetId} (depth ${depth})...`);

    // Fetch flat list of all quote tweets (paginated)
    const quotes: QuoteThread[] = [];
    const paginator = await withRetry(() =>
        client.v2.quotes(tweetId, {
            ...TWEET_API_FIELDS,
            expansions: [...TWEET_API_FIELDS.expansions, "referenced_tweets.id"],
            "tweet.fields": [
                ...TWEET_API_FIELDS["tweet.fields"],
                "referenced_tweets",
            ],
            max_results: 100,
        }),
    );

    let processedCount = 0;
    const processQuotePage = (): void => {
        const users = usersMapFromIncludes(paginator.includes.users);
        const allNewTweets = paginator.tweets.slice(processedCount);

        // Filter out retweets — the quotes endpoint returns RT'd quote tweets
        // which are duplicates that waste budget and pollute clustering data
        const newTweets = allNewTweets.filter(
            (tweet) =>
                !tweet.referenced_tweets?.some(
                    (r) => r.type === "retweeted",
                ),
        );
        if (newTweets.length < allNewTweets.length) {
            const filteredIds = allNewTweets
                .filter((tweet) =>
                    tweet.referenced_tweets?.some(
                        (r) => r.type === "retweeted",
                    ),
                )
                .map((t) => t.id);
            console.log(
                `  [Quotes] Filtered ${filteredIds.length}/${allNewTweets.length} retweets from quote page: [${filteredIds.join(", ")}]`,
            );
        } else {
            console.log(
                `  [Quotes] All ${allNewTweets.length} tweets on this page are original quotes (no retweets)`,
            );
        }

        const newQuotes: QuoteThread[] = [];
        for (const tweet of newTweets) {
            newQuotes.push(
                tweetToQuoteThread({ tweet, users, quotedTweetId: tweetId }),
            );
        }
        quotes.push(...newQuotes);
        processedCount = paginator.tweets.length;

        if (authorAccumulator) {
            authorAccumulator.ingestQuotes({ users, quotes: newQuotes });
        }

        // Track cost: each page costs per-post + per-user (only non-RT tweets)
        const pageUserCount = new Set(
            newTweets.map((t) => t.author_id ?? "unknown"),
        ).size;
        costRef.value +=
            newTweets.length * COST_PER_POST + pageUserCount * COST_PER_USER;
    };

    processQuotePage();

    while (!paginator.done) {
        if (options.maxCost !== undefined && costRef.value >= options.maxCost) {
            console.log(`  Quote pagination stopped: budget exhausted`);
            break;
        }
        await withRetry(async () => {
            await paginator.fetchNext();
        });
        processQuotePage();
    }

    // At depth 0, persist the flat list immediately so it's not lost if interrupted
    if (saveContext) {
        saveContext.result.quotes = quotes;
        saveProgress({
            data: saveContext.result,
            tweetId: saveContext.rootTweetId,
        });
    }

    if (quotes.length === 0) return quotes;
    console.log(`  Found ${quotes.length} quote tweets at depth ${depth}`);

    // Auto-calibrate threshold from the top quote (depth 0 only).
    // Deeper levels inherit the calibrated threshold from above.
    let threshold = autoThreshold;
    if (threshold === undefined) {
        const topLikes = Math.max(...quotes.map((q) => q.likeCount));
        threshold = autoCalibrate({
            topMetric: topLikes,
            autoPct: options.autoPct,
        });
        if (threshold !== undefined) {
            console.log(
                `  Auto-calibrated quote threshold: ${threshold} likes (top: ${topLikes})`,
            );
        }
    }

    // If at depth limit, return the flat list without exploring threads
    if (depth >= options.maxQuoteDepth) return quotes;

    // If no threshold could be calibrated (all 0 likes), return flat
    if (threshold === undefined) return quotes;

    // Explore qualifying quotes — sorted by engagement (highest first)
    // so we spend budget on the most interesting branches first.
    // Priority quotes (identified by scout) are always included regardless of engagement.
    const depthThreshold = thresholdAtDepth({ base: threshold, depth });
    const qualifying = quotes
        .filter(
            (q) =>
                q.likeCount >= depthThreshold ||
                priorityQuoteIds?.has(q.id),
        )
        .sort((a, b) => b.likeCount - a.likeCount);

    const priorityCount = priorityQuoteIds
        ? quotes.filter(
              (q) =>
                  priorityQuoteIds.has(q.id) &&
                  q.likeCount < depthThreshold,
          ).length
        : 0;
    console.log(
        `  ${qualifying.length}/${quotes.length} quotes qualify for thread exploration (>= ${depthThreshold} likes` +
            (priorityCount > 0
                ? `, +${priorityCount} priority`
                : "") +
            `)`,
    );

    for (const [i, quote] of qualifying.entries()) {
        if (options.maxCost !== undefined && costRef.value >= options.maxCost) {
            console.log(
                `  [Quotes] Budget exhausted at quote ${i + 1}/${qualifying.length}, stopping exploration`,
            );
            break;
        }

        const isPriority = priorityQuoteIds?.has(quote.id) ?? false;
        console.log(
            `  [Quotes] Exploring quote ${i + 1}/${qualifying.length}: id=${quote.id}, ` +
                `@${quote.authorUsername}, ${quote.likeCount} likes${isPriority ? " [PRIORITY]" : ""}, ` +
                `costBefore=$${costRef.value.toFixed(3)}`,
        );

        // Fetch this quote's reply thread
        const threadResult: RawThreadData = {
            originalTweet: quote,
            replies: [],
            fetchedAt: new Date().toISOString(),
            tweetUrl: "",
        };
        const ctrl = await fetchConversation({
            conversationId: quote.id,
            result: threadResult,
            options,
            costOffset: costRef.value,
            authorAccumulator,
            skipSave: true,
        });
        // Subtract COST_PER_POST: estimatedCost() includes the quote tweet
        // itself via (tweetCount + 1), but it was already counted in the
        // flat quote list fetch above.
        const addedCost = ctrl.estimatedCost() - COST_PER_POST;
        costRef.value += addedCost;
        console.log(
            `  [Quotes] Quote ${quote.id} thread: ${threadResult.replies.length} replies, ` +
                `addedCost=$${addedCost.toFixed(3)}, cumulativeCost=$${costRef.value.toFixed(3)}`,
        );

        // Recurse: fetch this quote's own quote tweets
        // (no saveContext — sub-quote data is persisted when the parent
        // saves after quote.thread assignment below)
        const subQuotes = await exploreQuoteTree({
            tweetId: quote.id,
            options,
            depth: depth + 1,
            autoThreshold: threshold,
            costRef,
            authorAccumulator,
            priorityQuoteIds,
        });

        quote.thread = {
            replies: threadResult.replies,
            quotes: subQuotes,
        };

        // Save after each explored quote thread so progress is never lost
        if (saveContext) {
            saveProgress({
                data: saveContext.result,
                tweetId: saveContext.rootTweetId,
            });
        }
    }

    return quotes;
}

// Check whether saved quotes still have unexplored threads.
// Returns true if quotes haven't been fetched yet, or if any qualifying
// quote is missing its thread data (interrupted during exploration).
function needsQuoteExploration({
    existing,
    options,
}: {
    existing: RawThreadData;
    options: FetchOptions;
}): boolean {
    if (!existing.quotes) {
        console.log("  [Resume] needsQuoteExploration: no quotes array → needs exploration");
        return true;
    }
    if (existing.quotes.length === 0) {
        console.log("  [Resume] needsQuoteExploration: empty quotes array → no exploration needed");
        return false;
    }
    if (options.maxQuoteDepth <= 0) {
        console.log("  [Resume] needsQuoteExploration: maxQuoteDepth=0 → no exploration needed");
        return false;
    }

    const topLikes = Math.max(...existing.quotes.map((q) => q.likeCount));
    const threshold = autoCalibrate({
        topMetric: topLikes,
        autoPct: options.autoPct,
    });
    if (threshold === undefined) {
        console.log("  [Resume] needsQuoteExploration: no threshold → no exploration needed");
        return false;
    }

    const depthThreshold = thresholdAtDepth({ base: threshold, depth: 0 });
    const unexplored = existing.quotes.filter(
        (q) => q.likeCount >= depthThreshold && !q.thread,
    );
    console.log(
        `  [Resume] needsQuoteExploration: ${unexplored.length}/${existing.quotes.length} quotes need exploration ` +
            `(threshold=${depthThreshold} likes)`,
    );
    return unexplored.length > 0;
}

// Resume partial quote exploration — re-derives thresholds from saved
// flat list and explores only qualifying quotes that lack thread data.
async function resumeQuoteExploration({
    quotes,
    options,
    costRef,
    saveContext,
    authorAccumulator,
}: {
    quotes: QuoteThread[];
    options: FetchOptions;
    costRef: { value: number };
    saveContext: { result: RawThreadData; rootTweetId: string };
    authorAccumulator?: AuthorAccumulator;
}): Promise<void> {
    if (quotes.length === 0) return;

    const topLikes = Math.max(...quotes.map((q) => q.likeCount));
    const threshold = autoCalibrate({
        topMetric: topLikes,
        autoPct: options.autoPct,
    });
    if (threshold === undefined) return;

    if (options.maxQuoteDepth <= 0) return;

    const depthThreshold = thresholdAtDepth({ base: threshold, depth: 0 });
    const qualifying = quotes
        .filter((q) => q.likeCount >= depthThreshold && !q.thread)
        .sort((a, b) => b.likeCount - a.likeCount);

    if (qualifying.length === 0) return;
    console.log(
        `  Resuming quote exploration: ${qualifying.length} quotes remaining`,
    );

    for (const quote of qualifying) {
        if (options.maxCost !== undefined && costRef.value >= options.maxCost)
            break;

        const threadResult: RawThreadData = {
            originalTweet: quote,
            replies: [],
            fetchedAt: new Date().toISOString(),
            tweetUrl: "",
        };
        const ctrl = await fetchConversation({
            conversationId: quote.id,
            result: threadResult,
            options,
            costOffset: costRef.value,
            authorAccumulator,
            skipSave: true,
        });
        costRef.value += ctrl.estimatedCost() - COST_PER_POST;

        const subQuotes = await exploreQuoteTree({
            tweetId: quote.id,
            options,
            depth: 1,
            autoThreshold: threshold,
            costRef,
            authorAccumulator,
        });

        quote.thread = {
            replies: threadResult.replies,
            quotes: subQuotes,
        };
        saveProgress({
            data: saveContext.result,
            tweetId: saveContext.rootTweetId,
        });
    }
}

// --- Engagement filtering ---

interface FilterParams {
    replies: Reply[];
    rootTweetId: string;
    minLikes: number | undefined;
    minReplies: number | undefined;
    maxDepth: number;
    // Grok-informed priority/exclusion sets (optional)
    priorityAuthorIds?: Set<string>;
    priorityReplyIds?: Set<string>;
    botAuthorIds?: Set<string>;
}

function thresholdAtDepth({
    base,
    depth,
}: {
    base: number;
    depth: number;
}): number {
    return Math.max(1, Math.ceil(base / 2 ** depth));
}

export function filterRepliesByEngagement({
    replies,
    rootTweetId,
    minLikes,
    minReplies,
    maxDepth,
    priorityAuthorIds,
    priorityReplyIds,
    botAuthorIds,
}: FilterParams): Reply[] {
    console.log(
        `  [Filter] filterRepliesByEngagement: ${replies.length} replies, minLikes=${minLikes ?? "none"}, ` +
            `minReplies=${minReplies ?? "none"}, maxDepth=${maxDepth}, ` +
            `priorityAuthors=${priorityAuthorIds?.size ?? 0}, priorityReplies=${priorityReplyIds?.size ?? 0}, ` +
            `botAuthors=${botAuthorIds?.size ?? 0}`,
    );

    if (
        minLikes === undefined &&
        minReplies === undefined &&
        !botAuthorIds?.size
    ) {
        console.log(
            "  [Filter] No thresholds or bots to filter — returning all replies",
        );
        return replies;
    }

    // Ensure depth annotations exist (may already be set by annotateReplyDepths)
    const needsDepth = replies.some((r) => r._depth === undefined);
    if (needsDepth) {
        console.log("  [Filter] Annotating reply depths (not yet computed)");
        annotateReplyDepths({ replies, rootTweetId });
    }

    // Build reply lookup for ancestor traversal
    const replyById = new Map<string, Reply>();
    for (const reply of replies) {
        replyById.set(reply.id, reply);
    }

    // Track filter decision stats
    let botExcluded = 0;
    let depthExcluded = 0;
    let priorityKept = 0;
    let engagementKept = 0;
    let engagementExcluded = 0;

    // Check each reply against its depth-decayed threshold
    const passesThreshold = (reply: Reply): boolean => {
        // Bot authors are always excluded (even if priority — bot wins)
        if (botAuthorIds?.has(reply.authorId)) {
            botExcluded++;
            return false;
        }

        const depth = reply._depth ?? 0;
        if (depth >= maxDepth) {
            depthExcluded++;
            return false;
        }

        // Priority authors and priority replies bypass engagement thresholds
        if (priorityAuthorIds?.has(reply.authorId)) {
            priorityKept++;
            return true;
        }
        if (priorityReplyIds?.has(reply.id)) {
            priorityKept++;
            return true;
        }

        if (minLikes !== undefined) {
            const threshold = thresholdAtDepth({ base: minLikes, depth });
            if (reply.likeCount < threshold) {
                engagementExcluded++;
                return false;
            }
        }
        if (minReplies !== undefined) {
            const threshold = thresholdAtDepth({ base: minReplies, depth });
            if (reply.replyCount < threshold) {
                engagementExcluded++;
                return false;
            }
        }
        engagementKept++;
        return true;
    };

    // Mark passing replies + their ancestors as kept
    const keptIds = new Set<string>();
    let ancestorsAdded = 0;

    const markAncestors = (replyId: string): void => {
        let currentId: string | null = replyId;
        while (
            currentId !== null &&
            currentId !== rootTweetId &&
            !keptIds.has(currentId)
        ) {
            keptIds.add(currentId);
            ancestorsAdded++;
            const current = replyById.get(currentId);
            currentId = current?.inReplyToTweetId ?? null;
        }
    };

    for (const reply of replies) {
        if (passesThreshold(reply)) {
            markAncestors(reply.id);
        }
    }

    const ancestorsPreserved = Math.max(0, ancestorsAdded - engagementKept - priorityKept);
    console.log(
        `  [Filter] Results: ${keptIds.size}/${replies.length} kept — ` +
            `botExcluded=${botExcluded}, depthExcluded=${depthExcluded}, ` +
            `priorityKept=${priorityKept}, engagementKept=${engagementKept}, ` +
            `engagementExcluded=${engagementExcluded}, ancestorsPreserved=${ancestorsPreserved}`,
    );

    return replies.filter((r) => keptIds.has(r.id));
}

// --- Filtered output ---

function outputFilteredPath(tweetId: string): string {
    return resolve(getOutputDir(), `${tweetId}.filtered.json`);
}

function saveFiltered({
    data,
    tweetId,
}: {
    data: RawThreadData;
    tweetId: string;
}): void {
    mkdirSync(getOutputDir(), { recursive: true });
    const target = outputFilteredPath(tweetId);
    const tmp = `${target}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, target);
}

function filterQuoteThreads({
    quotes,
    minLikes,
    minReplies,
    maxDepth,
    priorityAuthorIds,
    priorityReplyIds,
    botAuthorIds,
}: {
    quotes: QuoteThread[];
    minLikes: number | undefined;
    minReplies: number | undefined;
    maxDepth: number;
    priorityAuthorIds?: Set<string>;
    priorityReplyIds?: Set<string>;
    botAuthorIds?: Set<string>;
}): QuoteThread[] {
    return quotes.map((q) => {
        if (!q.thread) return q;
        const filteredReplies = filterRepliesByEngagement({
            replies: q.thread.replies,
            rootTweetId: q.id,
            minLikes,
            minReplies,
            maxDepth,
            priorityAuthorIds,
            priorityReplyIds,
            botAuthorIds,
        });
        const filteredSubQuotes = filterQuoteThreads({
            quotes: q.thread.quotes,
            minLikes,
            minReplies,
            maxDepth,
            priorityAuthorIds,
            priorityReplyIds,
            botAuthorIds,
        });
        return {
            ...q,
            thread: {
                replies: filteredReplies,
                quotes: filteredSubQuotes,
            },
        };
    });
}

export function applyFilterAndSave({
    result,
    tweetId,
    controller,
    minLikes: minLikesOverride,
    minReplies: minRepliesOverride,
    maxDepth,
    priorityAuthorIds,
    priorityReplyIds,
    botAuthorIds,
}: {
    result: RawThreadData;
    tweetId: string;
    controller?: PaginationController;
    minLikes?: number;
    minReplies?: number;
    maxDepth: number;
    priorityAuthorIds?: Set<string>;
    priorityReplyIds?: Set<string>;
    botAuthorIds?: Set<string>;
}): RawThreadData | null {
    const minLikes = minLikesOverride ?? controller?.resolvedMinLikes;
    const minReplies = minRepliesOverride ?? controller?.resolvedMinReplies;

    if (
        minLikes === undefined &&
        minReplies === undefined &&
        !botAuthorIds?.size
    )
        return null;

    const filteredReplies = filterRepliesByEngagement({
        replies: result.replies,
        rootTweetId: tweetId,
        minLikes,
        minReplies,
        maxDepth,
        priorityAuthorIds,
        priorityReplyIds,
        botAuthorIds,
    });

    const filteredQuotes = result.quotes
        ? filterQuoteThreads({
              quotes: result.quotes,
              minLikes,
              minReplies,
              maxDepth,
              priorityAuthorIds,
              priorityReplyIds,
              botAuthorIds,
          })
        : undefined;

    const filteredData: RawThreadData = {
        ...result,
        replies: filteredReplies,
        quotes: filteredQuotes,
        _fetchStats: result._fetchStats
            ? {
                  ...result._fetchStats,
                  totalFilteredReplies: filteredReplies.length,
              }
            : undefined,
    };

    saveFiltered({ data: filteredData, tweetId });
    console.log(
        `  Filtered: ${filteredReplies.length}/${result.replies.length} replies kept` +
            ` (min-likes: ${minLikes ?? "any"}, min-replies: ${minReplies ?? "any"})`,
    );
    if (priorityAuthorIds?.size || priorityReplyIds?.size) {
        console.log(
            `  Priority preserved: ${priorityAuthorIds?.size ?? 0} authors, ${priorityReplyIds?.size ?? 0} replies`,
        );
    }
    if (botAuthorIds?.size) {
        console.log(`  Bot authors excluded: ${botAuthorIds.size}`);
    }
    console.log(`  Filtered output saved to output/${tweetId}.filtered.json`);

    return filteredData;
}

// --- Computed enrichments ---

function percentile({
    sorted,
    p,
}: {
    sorted: number[];
    p: number;
}): number {
    if (sorted.length === 0) return 0;
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const lowerVal = sorted[lower] ?? 0;
    const upperVal = sorted[upper] ?? 0;
    if (lower === upper) return lowerVal;
    return lowerVal + (upperVal - lowerVal) * (index - lower);
}

function collectQuoteTreeStats({
    quotes,
}: {
    quotes: QuoteThread[];
}): {
    totalQuotes: number;
    quotesWithThreads: number;
    totalQuoteReplies: number;
    authorIds: Set<string>;
    replyLikeCounts: number[];
} {
    let totalQuotes = 0;
    let quotesWithThreads = 0;
    let totalQuoteReplies = 0;
    const authorIds = new Set<string>();
    const replyLikeCounts: number[] = [];

    for (const q of quotes) {
        totalQuotes++;
        authorIds.add(q.authorId);
        if (q.thread) {
            quotesWithThreads++;
            totalQuoteReplies += q.thread.replies.length;
            for (const r of q.thread.replies) {
                authorIds.add(r.authorId);
                replyLikeCounts.push(r.likeCount);
            }
            const sub = collectQuoteTreeStats({ quotes: q.thread.quotes });
            totalQuotes += sub.totalQuotes;
            quotesWithThreads += sub.quotesWithThreads;
            totalQuoteReplies += sub.totalQuoteReplies;
            for (const id of sub.authorIds) authorIds.add(id);
            replyLikeCounts.push(...sub.replyLikeCounts);
        }
    }

    return {
        totalQuotes,
        quotesWithThreads,
        totalQuoteReplies,
        authorIds,
        replyLikeCounts,
    };
}

export function computeThreadStats({
    replies,
    quotes,
    rootTweetId,
}: {
    replies: Reply[];
    quotes?: QuoteThread[];
    rootTweetId: string;
}): z.infer<typeof threadStatsSchema> {
    const authorMap = new Map<
        string,
        { replyCount: number; totalLikes: number; username: string }
    >();
    for (const reply of replies) {
        const existing = authorMap.get(reply.authorId);
        if (existing) {
            existing.replyCount++;
            existing.totalLikes += reply.likeCount;
        } else {
            authorMap.set(reply.authorId, {
                replyCount: 1,
                totalLikes: reply.likeCount,
                username: reply.authorUsername,
            });
        }
    }

    const directReplies = replies.filter(
        (r) => r.inReplyToTweetId === rootTweetId || r.inReplyToTweetId === null,
    ).length;
    const nestedReplies = replies.length - directReplies;

    const depths = replies.map((r) => r._depth ?? 0);
    const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
    const averageDepth =
        depths.length > 0
            ? depths.reduce((sum, d) => sum + d, 0) / depths.length
            : 0;

    const sortedLikes = replies.map((r) => r.likeCount).sort((a, b) => a - b);

    const topAuthors = Array.from(authorMap.entries())
        .map(([authorId, data]) => ({
            username: data.username,
            authorId,
            replyCount: data.replyCount,
            totalLikes: data.totalLikes,
        }))
        .sort((a, b) => b.totalLikes - a.totalLikes)
        .slice(0, 10);

    let single = 0;
    let twoToThree = 0;
    let fourPlus = 0;
    for (const data of authorMap.values()) {
        if (data.replyCount === 1) single++;
        else if (data.replyCount <= 3) twoToThree++;
        else fourPlus++;
    }

    const timestamps = replies
        .map((r) => r.createdAt)
        .filter((t) => t)
        .sort();
    const first = timestamps[0] ?? "";
    const last = timestamps[timestamps.length - 1] ?? "";
    const durationHours =
        first && last
            ? (new Date(last).getTime() - new Date(first).getTime()) /
              (1000 * 60 * 60)
            : 0;

    let quoteStats: z.infer<typeof threadStatsSchema>["quoteStats"];
    if (quotes && quotes.length > 0) {
        const qs = collectQuoteTreeStats({ quotes });
        const sortedQuoteLikes = qs.replyLikeCounts.sort((a, b) => a - b);
        quoteStats = {
            totalQuotes: qs.totalQuotes,
            quotesWithThreads: qs.quotesWithThreads,
            totalQuoteReplies: qs.totalQuoteReplies,
            uniqueQuoteAuthors: qs.authorIds.size,
            engagementDistribution:
                sortedQuoteLikes.length > 0
                    ? {
                          p25: percentile({ sorted: sortedQuoteLikes, p: 25 }),
                          p50: percentile({ sorted: sortedQuoteLikes, p: 50 }),
                          p75: percentile({ sorted: sortedQuoteLikes, p: 75 }),
                          p99: percentile({ sorted: sortedQuoteLikes, p: 99 }),
                      }
                    : undefined,
        };
    }

    return {
        uniqueAuthors: authorMap.size,
        totalReplies: replies.length,
        directReplies,
        nestedReplies,
        maxDepth,
        averageDepth: Math.round(averageDepth * 100) / 100,
        engagementDistribution: {
            p25: percentile({ sorted: sortedLikes, p: 25 }),
            p50: percentile({ sorted: sortedLikes, p: 50 }),
            p75: percentile({ sorted: sortedLikes, p: 75 }),
            p99: percentile({ sorted: sortedLikes, p: 99 }),
        },
        topAuthors,
        authorsByReplyCount: { single, twoToThree, fourPlus },
        timeSpan: {
            first,
            last,
            durationHours: Math.round(durationHours * 100) / 100,
        },
        quoteStats,
    };
}

export interface AuthorAccumulator {
    ingest: (params: {
        users: Map<string, AuthorData>;
        replies: Reply[];
    }) => void;
    ingestQuotes: (params: {
        users: Map<string, AuthorData>;
        quotes: QuoteThread[];
    }) => void;
    build: () => Record<string, z.infer<typeof authorEntrySchema>>;
}

export function createAuthorAccumulator(): AuthorAccumulator {
    const profileData = new Map<string, AuthorData>();
    const replyIdsMap = new Map<string, string[]>();
    const totalLikesMap = new Map<string, number>();

    const ingest = ({
        users,
        replies,
    }: {
        users: Map<string, AuthorData>;
        replies: Reply[];
    }): void => {
        const newProfiles = [...users.keys()].filter(
            (id) => !profileData.has(id),
        ).length;
        for (const [id, data] of users) {
            if (!profileData.has(id)) {
                profileData.set(id, data);
            }
        }
        for (const reply of replies) {
            const existing = replyIdsMap.get(reply.authorId) ?? [];
            existing.push(reply.id);
            replyIdsMap.set(reply.authorId, existing);
            totalLikesMap.set(
                reply.authorId,
                (totalLikesMap.get(reply.authorId) ?? 0) + reply.likeCount,
            );
        }
        console.log(
            `  [Authors] Ingested ${replies.length} replies, ${newProfiles} new profiles (total: ${profileData.size} profiles, ${replyIdsMap.size} authors)`,
        );
    };

    const ingestQuotes = ({
        users,
        quotes,
    }: {
        users: Map<string, AuthorData>;
        quotes: QuoteThread[];
    }): void => {
        for (const [id, data] of users) {
            if (!profileData.has(id)) {
                profileData.set(id, data);
            }
        }
        for (const quote of quotes) {
            // The quote tweet itself contributes as a "reply" for the author
            const existing = replyIdsMap.get(quote.authorId) ?? [];
            existing.push(quote.id);
            replyIdsMap.set(quote.authorId, existing);
            totalLikesMap.set(
                quote.authorId,
                (totalLikesMap.get(quote.authorId) ?? 0) + quote.likeCount,
            );
        }
    };

    const build = (): Record<string, z.infer<typeof authorEntrySchema>> => {
        const result: Record<string, z.infer<typeof authorEntrySchema>> = {};
        for (const [authorId, ids] of replyIdsMap) {
            const profile = profileData.get(authorId);
            result[authorId] = {
                username: profile?.username ?? "unknown",
                bio: profile?.bio,
                followerCount: profile?.followerCount,
                followingCount: profile?.followingCount,
                tweetCount: profile?.tweetCount,
                verifiedType: profile?.verifiedType,
                accountCreatedAt: profile?.accountCreatedAt,
                repliesInThread: ids.length,
                totalLikesInThread: totalLikesMap.get(authorId) ?? 0,
                replyIds: ids,
            };
        }
        return result;
    };

    return { ingest, ingestQuotes, build };
}

// Rebuild an AuthorAccumulator from previously saved data so that
// resume sessions produce a complete _authors map.
function rebuildAuthorAccumulator({
    existing,
    authorAccumulator,
}: {
    existing: RawThreadData;
    authorAccumulator: AuthorAccumulator;
}): void {
    // Reconstruct author profile data from the saved _authors field
    const savedProfiles = new Map<string, AuthorData>();
    if (existing._authors) {
        for (const [authorId, entry] of Object.entries(existing._authors)) {
            savedProfiles.set(authorId, {
                username: entry.username,
                bio: entry.bio,
                followerCount: entry.followerCount,
                followingCount: entry.followingCount,
                tweetCount: entry.tweetCount,
                verifiedType: entry.verifiedType,
                accountCreatedAt: entry.accountCreatedAt,
            });
        }
    }

    // Build a users map that covers all reply authors (may not all
    // be in _authors if the previous session crashed before enriching)
    const replyUsers = new Map<string, AuthorData>();
    for (const reply of existing.replies) {
        if (!replyUsers.has(reply.authorId)) {
            replyUsers.set(
                reply.authorId,
                savedProfiles.get(reply.authorId) ?? {
                    username: reply.authorUsername,
                },
            );
        }
    }
    authorAccumulator.ingest({
        users: replyUsers,
        replies: existing.replies,
    });

    // Replay quote tweets (flat list + recursive thread replies)
    if (existing.quotes && existing.quotes.length > 0) {
        const replayQuotes = (quotes: QuoteThread[]): void => {
            const quoteUsers = new Map<string, AuthorData>();
            for (const q of quotes) {
                if (!quoteUsers.has(q.authorId)) {
                    quoteUsers.set(
                        q.authorId,
                        savedProfiles.get(q.authorId) ?? {
                            username: q.authorUsername,
                        },
                    );
                }
            }
            authorAccumulator.ingestQuotes({ users: quoteUsers, quotes });

            // Replay thread replies for explored quotes
            for (const q of quotes) {
                if (q.thread) {
                    const threadUsers = new Map<string, AuthorData>();
                    for (const r of q.thread.replies) {
                        if (!threadUsers.has(r.authorId)) {
                            threadUsers.set(
                                r.authorId,
                                savedProfiles.get(r.authorId) ?? {
                                    username: r.authorUsername,
                                },
                            );
                        }
                    }
                    authorAccumulator.ingest({
                        users: threadUsers,
                        replies: q.thread.replies,
                    });
                    // Recurse into nested quotes
                    if (q.thread.quotes.length > 0) {
                        replayQuotes(q.thread.quotes);
                    }
                }
            }
        };
        replayQuotes(existing.quotes);
    }
}

export function computeTopReplyChains({
    replies,
    rootTweetId,
}: {
    replies: Reply[];
    rootTweetId: string;
}): z.infer<typeof replyChainSchema>[] {
    // Build parent→children index
    const childrenOf = new Map<string, string[]>();
    const replyById = new Map<string, Reply>();
    for (const reply of replies) {
        replyById.set(reply.id, reply);
        const parentId = reply.inReplyToTweetId ?? rootTweetId;
        const siblings = childrenOf.get(parentId) ?? [];
        siblings.push(reply.id);
        childrenOf.set(parentId, siblings);
    }

    // Compute total engagement for each subtree rooted at a direct reply
    const subtreeEngagement = (replyId: string, visited: Set<string>): number => {
        const reply = replyById.get(replyId);
        if (!reply || visited.has(replyId)) return 0;
        visited.add(replyId);
        let total = reply.likeCount + reply.replyCount;
        const children = childrenOf.get(replyId) ?? [];
        for (const childId of children) {
            total += subtreeEngagement(childId, visited);
        }
        return total;
    };

    // Find direct replies (depth 0) and score them
    const directReplies = replies.filter(
        (r) =>
            r.inReplyToTweetId === rootTweetId ||
            r.inReplyToTweetId === null,
    );

    const scored = directReplies.map((r) => ({
        reply: r,
        engagement: subtreeEngagement(r.id, new Set()),
    }));
    scored.sort((a, b) => b.engagement - a.engagement);

    // Take top 10 and flatten each chain into messages
    const chains: z.infer<typeof replyChainSchema>[] = [];

    for (const { reply: root, engagement } of scored.slice(0, 10)) {
        const messages: z.infer<typeof replyChainMessageSchema>[] = [];
        let maxChainDepth = 0;

        // DFS to collect all messages in the chain
        const visited = new Set<string>();
        const collect = (replyId: string): void => {
            const reply = replyById.get(replyId);
            if (!reply || visited.has(replyId)) return;
            visited.add(replyId);
            const depth = reply._depth ?? 0;
            if (depth > maxChainDepth) maxChainDepth = depth;
            messages.push({
                replyId: reply.id,
                authorUsername: reply.authorUsername,
                text: reply.text,
                likeCount: reply.likeCount,
                depth,
            });
            const children = childrenOf.get(replyId) ?? [];
            // Sort children by likes for readability
            const sortedChildren = children
                .map((id) => replyById.get(id))
                .filter((r): r is Reply => r !== undefined)
                .sort((a, b) => b.likeCount - a.likeCount);
            for (const child of sortedChildren) {
                collect(child.id);
            }
        };

        collect(root.id);

        if (messages.length > 0) {
            chains.push({
                rootReplyId: root.id,
                totalEngagement: engagement,
                depth: maxChainDepth,
                messages,
            });
        }
    }

    return chains;
}

function collectQuoteReplyChains({
    quotes,
}: {
    quotes: QuoteThread[];
}): z.infer<typeof replyChainSchema>[] {
    const allChains: z.infer<typeof replyChainSchema>[] = [];
    for (const q of quotes) {
        if (q.thread && q.thread.replies.length > 0) {
            const chains = computeTopReplyChains({
                replies: q.thread.replies,
                rootTweetId: q.id,
            });
            allChains.push(...chains);
        }
        if (q.thread && q.thread.quotes.length > 0) {
            allChains.push(
                ...collectQuoteReplyChains({ quotes: q.thread.quotes }),
            );
        }
    }
    return allChains;
}

function enrichAndSave({
    result,
    tweetId,
    authorAccumulator,
}: {
    result: RawThreadData;
    tweetId: string;
    authorAccumulator?: AuthorAccumulator;
}): void {
    // 1. Annotate depths
    console.log(
        `  [Enrich] Annotating depths for ${result.replies.length} replies...`,
    );
    annotateReplyDepths({ replies: result.replies, rootTweetId: tweetId });
    if (result.quotes) {
        console.log(
            `  [Enrich] Annotating depths for ${result.quotes.length} quote threads...`,
        );
        annotateQuoteTreeDepths({ quotes: result.quotes });
    }

    // 2. Compute thread stats
    result._threadStats = computeThreadStats({
        replies: result.replies,
        quotes: result.quotes,
        rootTweetId: tweetId,
    });
    console.log(
        `  [Enrich] Thread stats: ${result._threadStats.uniqueAuthors} authors, ` +
            `${result._threadStats.directReplies} direct / ${result._threadStats.nestedReplies} nested replies, ` +
            `maxDepth=${result._threadStats.maxDepth}, avgDepth=${result._threadStats.averageDepth}`,
    );
    console.log(
        `  [Enrich] Engagement distribution: p25=${result._threadStats.engagementDistribution.p25}, ` +
            `p50=${result._threadStats.engagementDistribution.p50}, p75=${result._threadStats.engagementDistribution.p75}, ` +
            `p99=${result._threadStats.engagementDistribution.p99}`,
    );

    // 3. Build author map
    if (authorAccumulator) {
        result._authors = authorAccumulator.build();
        console.log(
            `  [Enrich] Built author map: ${Object.keys(result._authors).length} authors`,
        );
    }

    // 4. Compute top reply chains (main + quote threads, merged by engagement)
    const mainChains = computeTopReplyChains({
        replies: result.replies,
        rootTweetId: tweetId,
    });
    console.log(
        `  [Enrich] Top reply chains (main): ${mainChains.length} chains`,
    );
    if (result.quotes && result.quotes.length > 0) {
        const quoteChains = collectQuoteReplyChains({
            quotes: result.quotes,
        });
        console.log(
            `  [Enrich] Top reply chains (quotes): ${quoteChains.length} chains`,
        );
        const merged = [...mainChains, ...quoteChains]
            .sort((a, b) => b.totalEngagement - a.totalEngagement)
            .slice(0, 10);
        result._topReplyChains = merged;
    } else {
        result._topReplyChains = mainChains;
    }
    console.log(
        `  [Enrich] Final top chains: ${result._topReplyChains.length} (top engagement: ${result._topReplyChains[0]?.totalEngagement ?? 0})`,
    );

    // 5. Save
    saveProgress({ data: result, tweetId });
}

// --- Grok integration helpers ---

interface GrokPrioritySets {
    priorityAuthorIds: Set<string>;
    priorityReplyIds: Set<string>;
    priorityQuoteIds: Set<string>;
}

function buildPrioritySetsFromScout({
    scout,
    replies,
}: {
    scout: ScoutResult;
    replies: Reply[];
}): GrokPrioritySets {
    // Map priority author usernames to author IDs using fetched reply data
    const usernameToId = new Map<string, string>();
    for (const reply of replies) {
        usernameToId.set(
            reply.authorUsername.toLowerCase(),
            reply.authorId,
        );
    }

    const priorityAuthorIds = new Set<string>();
    const unmatchedAuthors: string[] = [];
    for (const username of scout.priorityAuthors) {
        const cleanUsername = username.replace(/^@/, "").toLowerCase();
        const id = usernameToId.get(cleanUsername);
        if (id) {
            priorityAuthorIds.add(id);
        } else {
            unmatchedAuthors.push(username);
        }
    }

    console.log(
        `  [Priority] Built priority sets: ${priorityAuthorIds.size}/${scout.priorityAuthors.length} authors resolved, ` +
            `${scout.priorityReplyIds.length} reply IDs, ${scout.priorityQuoteTweetIds.length} quote IDs`,
    );
    if (unmatchedAuthors.length > 0) {
        console.log(
            `  [Priority] Unresolved priority authors (not found in replies): ${unmatchedAuthors.join(", ")}`,
        );
    }

    return {
        priorityAuthorIds,
        priorityReplyIds: new Set(scout.priorityReplyIds),
        priorityQuoteIds: new Set(scout.priorityQuoteTweetIds),
    };
}

function tryCreateGrokClient(): GrokClient | null {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return null;
    console.log("  [Grok] XAI_API_KEY detected — enabling Grok intelligence");
    return createGrokClient({ apiKey });
}

// --- Reusable thread analysis pipeline ---

interface AnalyzeThreadParams {
    tweetId: string;
    tweetUrl: string;
    options: FetchOptions;
    grokClient: GrokClient | null;
    followQuotedTweet: boolean;
}

async function analyzeThread({
    tweetId,
    tweetUrl,
    options: inputOptions,
    grokClient,
    followQuotedTweet,
}: AnalyzeThreadParams): Promise<RawThreadData> {
    // Clone options so budget mutations don't leak to the caller
    const options = { ...inputOptions };

    console.log(
        `  [analyzeThread] Starting for ${tweetId} (followQuotedTweet=${followQuotedTweet})`,
    );

    // 1. Fetch original tweet
    const { tweet: originalTweet, quotedTweetId } = await fetchTweet(tweetId);
    console.log(
        `  [analyzeThread] @${originalTweet.authorUsername}: "${originalTweet.text.slice(0, 80)}..."`,
    );
    console.log(
        `  ${originalTweet.likeCount} likes, ${originalTweet.replyCount} replies, ${originalTweet.quoteCount} quotes`,
    );

    const result: RawThreadData = {
        originalTweet,
        replies: [],
        fetchedAt: new Date().toISOString(),
        tweetUrl,
        _quotedTweetId: quotedTweetId,
    };
    saveProgress({ data: result, tweetId });

    // 2. Scout phase
    let scoutResult: ScoutResult | null = null;
    if (grokClient) {
        scoutResult = await grokClient.scout({ tweetUrl, originalTweet });
        if (scoutResult) {
            result._scout = scoutResult;
            saveProgress({ data: result, tweetId });
        }
    }

    // Auto-budget
    const hasCaps =
        options.maxCost !== undefined || options.maxTweets !== undefined;
    if (!hasCaps && !options.noLimit) {
        if (scoutResult) {
            options.maxCost = scoutResult.suggestedBudget;
            options.autoPct = scoutResult.suggestedAutoPct;
        } else {
            const smartBudget = calculateSmartBudget({
                replyCount: originalTweet.replyCount,
                quoteCount: originalTweet.quoteCount,
                includeQuotes: options.includeQuotes,
            });
            if (smartBudget !== undefined) {
                options.maxCost = smartBudget;
            }
        }
    }

    const authorAccumulator = createAuthorAccumulator();
    let prioritySets: GrokPrioritySets = {
        priorityAuthorIds: new Set(),
        priorityReplyIds: new Set(),
        priorityQuoteIds: new Set(),
    };

    // 3. First page of replies
    const phase1Ctrl = await fetchConversation({
        conversationId: tweetId,
        result,
        options,
        singlePage: true,
        authorAccumulator,
    });

    if (scoutResult) {
        prioritySets = buildPrioritySetsFromScout({
            scout: scoutResult,
            replies: result.replies,
        });
    }

    // 4. Quote exploration
    let quoteCost = 0;
    if (options.includeQuotes) {
        const costRef = { value: phase1Ctrl.estimatedCost() };
        result.quotes = await exploreQuoteTree({
            tweetId,
            options,
            depth: 0,
            autoThreshold: undefined,
            costRef,
            saveContext: { result, rootTweetId: tweetId },
            authorAccumulator,
            priorityQuoteIds: prioritySets.priorityQuoteIds.size > 0
                ? prioritySets.priorityQuoteIds
                : undefined,
        });
        saveProgress({ data: result, tweetId });
        quoteCost = costRef.value - phase1Ctrl.estimatedCost();
    }

    // 5. Remaining reply pages
    let finalCtrl = phase1Ctrl;
    if (result._nextToken) {
        finalCtrl = await fetchConversation({
            conversationId: tweetId,
            result,
            startToken: result._nextToken,
            options,
            costOffset: quoteCost,
            authorAccumulator,
            priorityReplyIds: prioritySets.priorityReplyIds.size > 0
                ? prioritySets.priorityReplyIds
                : undefined,
        });
    }

    if (scoutResult) {
        prioritySets = buildPrioritySetsFromScout({
            scout: scoutResult,
            replies: result.replies,
        });
    }

    // 6. Enrich with computed fields
    enrichAndSave({ result, tweetId, authorAccumulator });

    // 7. Bot detection
    let botAuthorIds: Set<string> | undefined;
    if (grokClient && result._authors) {
        const authorsMap = new Map(
            Object.entries(result._authors).map(([id, data]) => [id, data]),
        );
        const botResult = await grokClient.detectBots({
            authors: authorsMap,
            replies: result.replies,
        });
        if (botResult) {
            result._botDetection = botResult;
            botAuthorIds = new Set(botResult.botAuthorIds);
            saveProgress({ data: result, tweetId });
        }
    }

    // 8. Engagement filtering
    const filtered = applyFilterAndSave({
        result,
        tweetId,
        controller: finalCtrl,
        maxDepth: options.maxDepth,
        priorityAuthorIds: prioritySets.priorityAuthorIds.size > 0
            ? prioritySets.priorityAuthorIds
            : undefined,
        priorityReplyIds: prioritySets.priorityReplyIds.size > 0
            ? prioritySets.priorityReplyIds
            : undefined,
        botAuthorIds,
    });

    // 9. Grok enrichment
    if (grokClient) {
        const filteredOutReplies = filtered
            ? result.replies.filter(
                  (r) => !filtered.replies.some((fr) => fr.id === r.id),
              )
            : undefined;

        const enrichResult = await grokClient.enrich({
            originalTweet: result.originalTweet,
            topAuthors: result._threadStats?.topAuthors,
            topReplyChains: result._topReplyChains,
            filteredOutReplies,
        });
        if (enrichResult) {
            result._grokContext = enrichResult;
            saveProgress({ data: result, tweetId });
        }
    }

    // 10. Auto-analyze quoted tweet (depth 1 guard — no infinite recursion)
    console.log(
        `  [analyzeThread] Quoted tweet check: followQuotedTweet=${followQuotedTweet}, quotedTweetId=${quotedTweetId ?? "none"}, tweetId=${tweetId}`,
    );
    if (
        followQuotedTweet &&
        quotedTweetId &&
        quotedTweetId !== tweetId
    ) {
        // Compute shared remaining budget for the nested analysis
        const nestedOptions = { ...inputOptions };
        // Use the live cost from the pagination controller + quote exploration,
        // NOT result._fetchStats which may not be set yet (singlePage mode skips it)
        const parentCost = finalCtrl.estimatedCost() + quoteCost;
        // options.maxCost may differ from inputOptions.maxCost if auto-budget was applied
        const effectiveCap = options.maxCost ?? inputOptions.maxCost;

        if (effectiveCap !== undefined) {
            const remaining = Math.max(0, effectiveCap - parentCost);
            nestedOptions.maxCost = remaining;
            console.log(
                `  [analyzeThread] Budget for quoted thread: $${remaining.toFixed(3)} remaining (parent spent $${parentCost.toFixed(3)} of $${effectiveCap})`,
            );
            if (remaining <= 0) {
                console.log(
                    `  [analyzeThread] Budget exhausted — skipping quoted thread (resume can fetch later with --resume)`,
                );
                return result;
            }
        }

        console.log(
            `  [analyzeThread] Auto-analyzing quoted tweet ${quotedTweetId} (depth-1 cap: nested call will NOT follow further quotes)`,
        );
        result._quotedThread = await analyzeThread({
            tweetId: quotedTweetId,
            tweetUrl: `https://x.com/i/status/${quotedTweetId}`,
            options: nestedOptions,
            grokClient,
            followQuotedTweet: false,
        });
        console.log(
            `  [analyzeThread] Quoted thread analysis complete: ${result._quotedThread.replies.length} replies, ${result._quotedThread.quotes?.length ?? 0} quotes`,
        );
        saveProgress({ data: result, tweetId });
    } else if (followQuotedTweet && quotedTweetId === tweetId) {
        console.log(
            `  [analyzeThread] CIRCULAR QUOTE DETECTED: tweet ${tweetId} quotes itself — skipping to prevent infinite loop`,
        );
    } else if (!followQuotedTweet && quotedTweetId) {
        console.log(
            `  [analyzeThread] Depth-1 cap reached: not following quoted tweet ${quotedTweetId} (already inside a nested analysis)`,
        );
    } else if (!quotedTweetId) {
        console.log(
            `  [analyzeThread] No quoted tweet to follow`,
        );
    }

    return result;
}

// --- Main ---

export async function main(): Promise<void> {
    const { options, tweetUrl, isResume } = parseFetchOptions(
        process.argv.slice(2),
    );

    console.log(`  [CLI] Parsed options: ${JSON.stringify(options)}`);
    console.log(
        `  [CLI] tweetUrl=${tweetUrl ?? "none"}, isResume=${isResume}`,
    );
    console.log(
        `  [CLI] Env: X_BEARER_TOKEN=${BEARER_TOKEN ? "set" : "MISSING"}, ` +
            `XAI_API_KEY=${process.env.XAI_API_KEY ? "set" : "not set (Grok disabled)"}`,
    );

    // Resume mode
    if (isResume) {
        let tweetId: string | undefined;
        let existing: RawThreadData | null = null;

        if (tweetUrl) {
            tweetId = extractTweetId(tweetUrl);
            existing = loadExisting(tweetId);
        } else {
            const found = findIncompleteFile();
            if (found) {
                existing = found.data;
                tweetId = found.tweetId;
            }
        }

        if (!existing || !tweetId) {
            console.error("Error: no incomplete fetch found to resume.");
            console.error("Usage: pnpm x-fetch --resume [tweet-url]");
            process.exit(1);
        }

        // Check if there's anything to resume (replies, quotes, enrichment, or Grok phases)
        const hasIncompleteReplies = !!existing._nextToken;
        const hasIncompleteQuotes =
            options.includeQuotes &&
            needsQuoteExploration({ existing, options });
        const needsEnrichment =
            existing.replies.length > 0 &&
            (!existing._threadStats || !existing._authors);
        const grokClient = tryCreateGrokClient();
        const needsBotDetection = grokClient && !existing._botDetection;
        const needsGrokEnrich = grokClient && !existing._grokContext;
        const needsQuotedThread =
            !existing._quotedThread &&
            existing._quotedTweetId !== undefined &&
            existing._quotedTweetId !== tweetId;

        console.log(
            `  [Resume] State: incompleteReplies=${hasIncompleteReplies}, incompleteQuotes=${hasIncompleteQuotes}, ` +
                `needsEnrichment=${needsEnrichment}, ` +
                `needsBotDetection=${!!needsBotDetection}, needsGrokEnrich=${!!needsGrokEnrich}, ` +
                `needsQuotedThread=${needsQuotedThread}, ` +
                `grokClient=${grokClient ? "available" : "null"}`,
        );

        if (
            !hasIncompleteReplies &&
            !hasIncompleteQuotes &&
            !needsEnrichment &&
            !needsBotDetection &&
            !needsGrokEnrich &&
            !needsQuotedThread
        ) {
            console.log(
                `Fetch for ${tweetId} already completed — nothing to resume.`,
            );
            const quoteSuffix =
                existing.quotes && existing.quotes.length > 0
                    ? ` and ${existing.quotes.length} quoted threads`
                    : "";
            console.log(
                `  ${existing.replies.length} replies${quoteSuffix} saved in output/${tweetId}.json`,
            );
            return;
        }

        console.log(
            `Resuming fetch for @${existing.originalTweet.authorUsername}'s thread (${tweetId})...`,
        );

        // Rebuild priority sets from saved scout data
        let prioritySets: GrokPrioritySets = {
            priorityAuthorIds: new Set(),
            priorityReplyIds: new Set(),
            priorityQuoteIds: new Set(),
        };
        const savedScout = existing._scout;
        if (savedScout) {
            prioritySets = buildPrioritySetsFromScout({
                scout: savedScout,
                replies: existing.replies,
            });
            // Apply scout-informed options if user didn't override
            const hasCaps =
                options.maxCost !== undefined ||
                options.maxTweets !== undefined;
            if (!hasCaps && !options.noLimit) {
                options.maxCost = savedScout.suggestedBudget;
                options.autoPct = savedScout.suggestedAutoPct;
            }
        }

        // Breadth-first resume: quotes before remaining replies
        const authorAccumulator = createAuthorAccumulator();
        rebuildAuthorAccumulator({ existing, authorAccumulator });

        // 1. Resume quote exploration first (if incomplete)
        const baseCost =
            (existing.replies.length + 1) * COST_PER_POST +
            new Set(existing.replies.map((r) => r.authorId)).size *
                COST_PER_USER;
        let quoteCost = 0;

        if (hasIncompleteQuotes) {
            const costRef = { value: baseCost };
            const saveCtx = { result: existing, rootTweetId: tweetId };

            if (!existing.quotes) {
                existing.quotes = await exploreQuoteTree({
                    tweetId,
                    options,
                    depth: 0,
                    autoThreshold: undefined,
                    costRef,
                    saveContext: saveCtx,
                    authorAccumulator,
                    priorityQuoteIds: prioritySets.priorityQuoteIds.size > 0
                        ? prioritySets.priorityQuoteIds
                        : undefined,
                });
            } else {
                await resumeQuoteExploration({
                    quotes: existing.quotes,
                    options,
                    costRef,
                    saveContext: saveCtx,
                    authorAccumulator,
                });
            }
            saveProgress({ data: existing, tweetId });
            quoteCost = costRef.value - baseCost;
        }

        // 2. Resume remaining reply pages (if _nextToken exists)
        // Pass priority reply IDs so quality-drop doesn't stop before finding them.
        let controller: PaginationController | undefined;
        if (hasIncompleteReplies) {
            controller = await fetchConversation({
                conversationId: tweetId,
                result: existing,
                startToken: existing._nextToken,
                options,
                costOffset: quoteCost,
                authorAccumulator,
                priorityReplyIds: prioritySets.priorityReplyIds.size > 0
                    ? prioritySets.priorityReplyIds
                    : undefined,
            });
        }

        // Update priority author IDs after fetching more replies
        if (savedScout) {
            prioritySets = buildPrioritySetsFromScout({
                scout: savedScout,
                replies: existing.replies,
            });
        }

        // 3. Enrich with computed fields
        enrichAndSave({ result: existing, tweetId, authorAccumulator });

        // 4. Bot detection (if not already done)
        let botAuthorIds: Set<string> | undefined;
        if (existing._botDetection) {
            botAuthorIds = new Set(existing._botDetection.botAuthorIds);
        } else if (grokClient && existing._authors) {
            const authorsMap = new Map(
                Object.entries(existing._authors).map(([id, data]) => [
                    id,
                    data,
                ]),
            );
            const botResult = await grokClient.detectBots({
                authors: authorsMap,
                replies: existing.replies,
            });
            if (botResult) {
                existing._botDetection = botResult;
                botAuthorIds = new Set(botResult.botAuthorIds);
                saveProgress({ data: existing, tweetId });
            }
        }

        // 5. Apply engagement filtering (with priorities + bot exclusion)
        // Use controller thresholds if replies were re-fetched, otherwise
        // reconstruct from saved _fetchStats (e.g. resume for bot detection only)
        let filtered: RawThreadData | null = null;
        if (controller) {
            filtered = applyFilterAndSave({
                result: existing,
                tweetId,
                controller,
                maxDepth: options.maxDepth,
                priorityAuthorIds: prioritySets.priorityAuthorIds.size > 0
                    ? prioritySets.priorityAuthorIds
                    : undefined,
                priorityReplyIds: prioritySets.priorityReplyIds.size > 0
                    ? prioritySets.priorityReplyIds
                    : undefined,
                botAuthorIds,
            });
        } else if (
            existing._fetchStats?.resolvedMinLikes !== undefined ||
            existing._fetchStats?.resolvedMinReplies !== undefined ||
            botAuthorIds?.size
        ) {
            filtered = applyFilterAndSave({
                result: existing,
                tweetId,
                minLikes: existing._fetchStats?.resolvedMinLikes,
                minReplies: existing._fetchStats?.resolvedMinReplies,
                maxDepth: options.maxDepth,
                priorityAuthorIds: prioritySets.priorityAuthorIds.size > 0
                    ? prioritySets.priorityAuthorIds
                    : undefined,
                priorityReplyIds: prioritySets.priorityReplyIds.size > 0
                    ? prioritySets.priorityReplyIds
                    : undefined,
                botAuthorIds,
            });
        }

        // 6. Grok enrichment (if not already done)
        if (grokClient && !existing._grokContext) {
            const filteredOutReplies = filtered
                ? existing.replies.filter(
                      (r) => !filtered.replies.some((fr) => fr.id === r.id),
                  )
                : undefined;

            const enrichResult = await grokClient.enrich({
                originalTweet: existing.originalTweet,
                topAuthors: existing._threadStats?.topAuthors,
                topReplyChains: existing._topReplyChains,
                filteredOutReplies,
            });
            if (enrichResult) {
                existing._grokContext = enrichResult;
                saveProgress({ data: existing, tweetId });
            }
        }

        // 7. Fetch quoted thread if missing
        if (needsQuotedThread && existing._quotedTweetId) {
            console.log(
                `  [Resume] Fetching quoted thread ${existing._quotedTweetId}...`,
            );
            existing._quotedThread = await analyzeThread({
                tweetId: existing._quotedTweetId,
                tweetUrl: `https://x.com/i/status/${existing._quotedTweetId}`,
                options,
                grokClient,
                followQuotedTweet: false,
            });
            saveProgress({ data: existing, tweetId });
        }

        printSummary({ result: existing, filtered, tweetId, options });
        return;
    }

    // Fresh fetch
    if (!tweetUrl) {
        printUsage();
        process.exit(1);
    }

    const tweetId = extractTweetId(tweetUrl);

    // Never overwrite existing data — always require explicit action
    const existing = loadExisting(tweetId);
    if (existing) {
        if (existing._nextToken) {
            console.error(
                `Warning: output/${tweetId}.json has an incomplete fetch (${existing.replies.length} replies saved).`,
            );
            console.error(
                `Run "pnpm x-fetch --resume" to continue, or delete output/${tweetId}.json to start fresh.`,
            );
        } else {
            console.error(
                `output/${tweetId}.json already exists with a completed fetch (${existing.replies.length} replies).`,
            );
            console.error(
                `Delete the file to start fresh, or use --resume --include-quotes to add quotes.`,
            );
        }
        process.exit(1);
    }

    // Initialize Grok client (null if XAI_API_KEY not set)
    const grokClient = tryCreateGrokClient();
    const fetchStart = Date.now();

    const result = await analyzeThread({
        tweetId,
        tweetUrl,
        options,
        grokClient,
        followQuotedTweet: true,
    });

    const elapsed = ((Date.now() - fetchStart) / 1000).toFixed(1);
    console.log(`  [Timing] Total fetch time: ${elapsed}s`);
    printSummary({ result, filtered: null, tweetId, options });
}

function countQuoteTree(quotes: QuoteThread[]): {
    total: number;
    withThread: number;
} {
    let total = 0;
    let withThread = 0;
    for (const q of quotes) {
        total++;
        if (q.thread) {
            withThread++;
            const sub = countQuoteTree(q.thread.quotes);
            total += sub.total;
            withThread += sub.withThread;
        }
    }
    return { total, withThread };
}

function printSummary({
    result,
    filtered,
    tweetId,
    options,
}: {
    result: RawThreadData;
    filtered: RawThreadData | null;
    tweetId: string;
    options: FetchOptions;
}): void {
    const { replies, originalTweet } = result;
    const uniqueAuthors = new Set(replies.map((r) => r.authorId)).size;
    const directReplies = replies.filter(
        (r) => r.inReplyToTweetId === tweetId,
    ).length;
    const nestedReplies = replies.filter(
        (r) => r.inReplyToTweetId !== null && r.inReplyToTweetId !== tweetId,
    ).length;
    const totalLikes = replies.reduce((sum, r) => sum + r.likeCount, 0);

    console.log(`\nDone! Output written to output/${tweetId}.json`);
    console.log(`\nSummary:`);
    console.log(`  Original tweet: @${originalTweet.authorUsername}`);
    console.log(`  Sort order: ${options.sortOrder}`);
    console.log(`  Direct replies: ${directReplies}`);
    console.log(`  Nested replies: ${nestedReplies}`);
    console.log(`  Unique authors: ${uniqueAuthors}`);
    console.log(`  Total likes across replies: ${totalLikes}`);

    if (result.quotes && result.quotes.length > 0) {
        const { total, withThread } = countQuoteTree(result.quotes);
        console.log(`  Quote tweets: ${total}`);
        if (withThread > 0) {
            console.log(`  Quotes with explored threads: ${withThread}`);
        }
    }

    if (result._fetchStats) {
        const stats = result._fetchStats;
        console.log(`  Estimated cost: $${stats.estimatedCost.toFixed(3)}`);
        if (result._quotedThread?._fetchStats) {
            const qtCost = result._quotedThread._fetchStats.estimatedCost;
            console.log(`  Quoted thread cost: $${qtCost.toFixed(3)}`);
            console.log(
                `  Total cost (main + quoted): $${(stats.estimatedCost + qtCost).toFixed(3)}`,
            );
        }
        if (stats.stoppedEarly) {
            console.log(`  Stopped early: ${stats.stopReason}`);
        }
    }

    if (result._quotedThread) {
        console.log(
            `\nQuoted thread (@${result._quotedThread.originalTweet.authorUsername}):`,
        );
        console.log(`  Replies: ${result._quotedThread.replies.length}`);
        if (result._quotedThread.quotes?.length) {
            console.log(`  Quotes: ${result._quotedThread.quotes.length}`);
        }
    } else if (result._quotedTweetId) {
        console.log(
            `\nQuoted tweet ${result._quotedTweetId} not yet analyzed (use --resume to fetch)`,
        );
    }

    if (filtered) {
        const filteredAuthors = new Set(filtered.replies.map((r) => r.authorId))
            .size;
        console.log(`\nFiltered output (output/${tweetId}.filtered.json):`);
        console.log(
            `  Kept replies: ${filtered.replies.length}/${replies.length}`,
        );
        console.log(`  Unique authors (filtered): ${filteredAuthors}`);
    }

    // Grok intelligence summary
    if (result._scout || result._botDetection || result._grokContext) {
        console.log(`\nGrok intelligence:`);
        if (result._scout) {
            console.log(
                `  Scout: "${result._scout.topic}" (quality ${result._scout.qualityScore}/10, ${result._scout.camps.length} camps)`,
            );
        }
        if (result._botDetection) {
            console.log(
                `  Bot detection: ${result._botDetection.totalFlagged}/${result._botDetection.totalAssessed} flagged`,
            );
        }
        if (result._grokContext) {
            console.log(
                `  Enrichment: ${result._grokContext.relatedThreads.length} related threads, ${result._grokContext.salvaged.length} salvaged replies`,
            );
        }
    }
}

// Only run main when this file is the entry point (not when imported by to-csv etc.)
const isEntryPoint =
    process.env.VITEST !== "true" &&
    import.meta.url === `file://${process.argv[1]}`;

if (isEntryPoint) {
    main().catch((err: unknown) => {
        console.error("\nFatal error:", err);
        console.error(
            `\nAny partial data is saved in output/. Run "pnpm x-fetch --resume" to continue.`,
        );
        process.exit(1);
    });
}
