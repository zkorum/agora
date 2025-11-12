/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { Redis } from "ioredis";
import type { Logger } from "pino";
import type { FastifyBaseLogger } from "fastify";

interface InitializeRedisParams {
    redisUrl: string | undefined;
    log: Logger | FastifyBaseLogger;
}

/**
 * Initialize Redis client (optional)
 *
 * Used for:
 * - Vote buffer persistence across API instances
 * - Future: Distributed locks, rate limiting, etc.
 *
 * If REDIS_URL is not provided, returns undefined and services fall back to in-memory only.
 *
 * Configuration:
 * - Local: redis://localhost:6379
 * - Production: AWS ElastiCache endpoint with TLS
 */
export function initializeRedis({
    redisUrl,
    log,
}: InitializeRedisParams): Redis | undefined {
    if (redisUrl === undefined) {
        log.info(
            "[Redis] Not configured - services will use in-memory storage only",
        );
        return undefined;
    }

    try {
        log.info(
            `[Redis] Initializing connection to ${redisUrl.replace(/:[^:@]+@/, ":***@")}`,
        );
        const redis = new Redis(redisUrl, {
            // Retry strategy for failover handling
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                log.warn(`[Redis] Retry attempt ${String(times)}, delay: ${String(delay)}ms`);
                return delay;
            },
            // Reconnect on READONLY error (ElastiCache failover)
            reconnectOnError: (err: Error) => {
                const targetError = "READONLY";
                if (err.message.includes(targetError)) {
                    log.warn(
                        "[Redis] READONLY error detected, reconnecting (failover)",
                    );
                    return 2; // Reconnect and resend command
                }
                return false;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false, // Connect immediately
        });

        redis.on("connect", () => {
            log.info("[Redis] Connected successfully");
        });

        redis.on("ready", () => {
            log.info("[Redis] Ready to accept commands");
        });

        redis.on("error", (err: Error) => {
            log.error(err, "[Redis] Connection error");
        });

        redis.on("close", () => {
            log.warn("[Redis] Connection closed");
        });

        redis.on("reconnecting", () => {
            log.info("[Redis] Reconnecting...");
        });

        return redis;
    } catch (error) {
        log.error(
            error,
            "[Redis] Failed to initialize - services will fall back to in-memory storage only",
        );
        return undefined;
    }
}
