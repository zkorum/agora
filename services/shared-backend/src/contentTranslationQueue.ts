import { Script } from "@valkey/valkey-glide";
import type { BaseLogger } from "pino";
import type { Valkey } from "./valkey.js";
import { VALKEY_QUEUE_KEYS } from "./valkeyQueues.js";

export const CONTENT_TRANSLATION_PRIORITY_SCORE_OFFSET = 10_000_000_000_000;

export const CONTENT_TRANSLATION_QUEUE_PRIORITIES = {
    userInteractive: 0,
    eagerVisible: 1,
    maintenance: 2,
} as const;

export type ContentTranslationQueuePriority =
    (typeof CONTENT_TRANSLATION_QUEUE_PRIORITIES)[keyof typeof CONTENT_TRANSLATION_QUEUE_PRIORITIES];

export const ENQUEUE_CONTENT_TRANSLATION_WORK_SCRIPT = `
local current = redis.call('ZSCORE', KEYS[1], ARGV[1])
local nextScore = tonumber(ARGV[2])

if nextScore == nil then
    return redis.error_reply('invalid content translation queue score')
end

if (not current) or nextScore < tonumber(current) then
    redis.call('ZADD', KEYS[1], nextScore, ARGV[1])
    return 1
end

return 0
`;

export const CONTENT_TRANSLATION_USER_RATE_LIMIT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
local windowMs = tonumber(ARGV[1])
local maxRequests = tonumber(ARGV[2])

if windowMs == nil or windowMs <= 0 then
    return redis.error_reply('invalid content translation rate-limit window')
end

if maxRequests == nil or maxRequests <= 0 then
    return redis.error_reply('invalid content translation rate-limit max')
end

if current == 1 then
    redis.call('PEXPIRE', KEYS[1], windowMs)
end

local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
    redis.call('PEXPIRE', KEYS[1], windowMs)
    ttl = windowMs
end

if current > maxRequests then
    return {0, current, ttl}
end

return {1, current, ttl}
`;

interface BuildContentTranslationQueueScoreParams {
    priority: ContentTranslationQueuePriority;
    enqueuedAtMs: number;
}

interface EnqueueContentTranslationWorkParams {
    valkey: Valkey | undefined;
    script: Script;
    workId: number;
    priority: ContentTranslationQueuePriority;
    enqueuedAtMs?: number;
    log: Pick<BaseLogger, "info" | "error">;
}

export interface ContentTranslationUserRateLimitResult {
    isAllowed: boolean;
    requestCount: number;
    retryAfterMs: number;
}

interface ConsumeContentTranslationUserRateLimitParams {
    valkey: Valkey;
    script: Script;
    userId: string;
    maxRequests: number;
    windowMs: number;
}

function assertValidEnqueuedAtMs(enqueuedAtMs: number): void {
    if (!Number.isSafeInteger(enqueuedAtMs) || enqueuedAtMs < 0) {
        throw new Error(
            `Invalid content translation enqueue timestamp: ${String(enqueuedAtMs)}`,
        );
    }
}

export function buildContentTranslationQueueScore({
    priority,
    enqueuedAtMs,
}: BuildContentTranslationQueueScoreParams): number {
    assertValidEnqueuedAtMs(enqueuedAtMs);

    const score = priority * CONTENT_TRANSLATION_PRIORITY_SCORE_OFFSET + enqueuedAtMs;
    if (!Number.isSafeInteger(score)) {
        throw new Error(`Unsafe content translation queue score: ${String(score)}`);
    }
    return score;
}

function parseEnqueueScriptResult(result: unknown): 0 | 1 {
    if (result === 0 || result === 1) {
        return result;
    }
    if (result === "0") {
        return 0;
    }
    if (result === "1") {
        return 1;
    }
    throw new Error(
        `Unexpected content translation queue script result: ${String(result)}`,
    );
}

function parseRateLimitNumber(value: unknown, name: string): number {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isSafeInteger(parsed)) {
        throw new Error(
            `Unexpected content translation rate-limit ${name}: ${String(value)}`,
        );
    }
    return parsed;
}

function parseRateLimitScriptResult(
    result: unknown,
): ContentTranslationUserRateLimitResult {
    if (!Array.isArray(result) || result.length !== 3) {
        throw new Error(
            `Unexpected content translation rate-limit script result: ${String(result)}`,
        );
    }

    const allowedFlag = parseRateLimitNumber(result[0], "allowed flag");
    if (allowedFlag !== 0 && allowedFlag !== 1) {
        throw new Error(
            `Unexpected content translation rate-limit allowed flag: ${String(allowedFlag)}`,
        );
    }

    return {
        isAllowed: allowedFlag === 1,
        requestCount: parseRateLimitNumber(result[1], "request count"),
        retryAfterMs: parseRateLimitNumber(result[2], "retry-after ms"),
    };
}

export async function consumeContentTranslationUserRateLimit({
    valkey,
    script,
    userId,
    maxRequests,
    windowMs,
}: ConsumeContentTranslationUserRateLimitParams): Promise<ContentTranslationUserRateLimitResult> {
    if (userId.length === 0) {
        throw new Error("Content translation rate limit requires a user id");
    }
    if (!Number.isSafeInteger(maxRequests) || maxRequests <= 0) {
        throw new Error(
            `Invalid content translation rate-limit max: ${String(maxRequests)}`,
        );
    }
    if (!Number.isSafeInteger(windowMs) || windowMs <= 0) {
        throw new Error(
            `Invalid content translation rate-limit window: ${String(windowMs)}`,
        );
    }

    return parseRateLimitScriptResult(
        await valkey.invokeScript(script, {
            keys: [`content-translation:rate-limit:user:${userId}`],
            args: [String(windowMs), String(maxRequests)],
        }),
    );
}

export async function enqueueContentTranslationWork({
    valkey,
    script,
    workId,
    priority,
    enqueuedAtMs = Date.now(),
    log,
}: EnqueueContentTranslationWorkParams): Promise<boolean> {
    if (valkey === undefined) {
        log.info(
            `[ContentTranslationQueue] Skipped queueing workId=${String(workId)} queue=${VALKEY_QUEUE_KEYS.CONTENT_TRANSLATION_DIRTY}: valkey not configured`,
        );
        return false;
    }

    if (!Number.isSafeInteger(workId) || workId <= 0) {
        throw new Error(`Invalid content translation work id: ${String(workId)}`);
    }

    const score = buildContentTranslationQueueScore({ priority, enqueuedAtMs });
    try {
        const result = parseEnqueueScriptResult(
            await valkey.invokeScript(script, {
                keys: [VALKEY_QUEUE_KEYS.CONTENT_TRANSLATION_DIRTY],
                args: [String(workId), String(score)],
            }),
        );
        log.info(
            `[ContentTranslationQueue] Queue result workId=${String(workId)} queue=${VALKEY_QUEUE_KEYS.CONTENT_TRANSLATION_DIRTY} score=${String(score)} updated=${String(result === 1)}`,
        );
        return result === 1;
    } catch (error: unknown) {
        log.error(
            error,
            `[ContentTranslationQueue] Failed to queue workId=${String(workId)} queue=${VALKEY_QUEUE_KEYS.CONTENT_TRANSLATION_DIRTY}`,
        );
        throw error;
    }
}
