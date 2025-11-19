import { Redis } from "ioredis";
import type { Logger } from "pino";
import type { FastifyBaseLogger } from "fastify";

// Valkey is Redis-compatible, so we use the ioredis client
// Valkey is a fork of Redis with enhanced features and open governance
export type Valkey = Redis;

interface InitializeValkeyParams {
    valkeyUrl: string | undefined;
    log: Logger | FastifyBaseLogger;
}

/**
 * Initialize Valkey client (optional)
 *
 * Used for:
 * - Vote buffer persistence across API instances
 * - Export buffer queue management
 * - Future: Distributed locks, rate limiting, etc.
 *
 * If VALKEY_URL is not provided, returns undefined and services fall back to in-memory only.
 *
 * Configuration:
 * - Local: valkey://localhost:6379
 * - Production: AWS ElastiCache endpoint with TLS (Valkey-compatible)
 */
export function initializeValkey({
    valkeyUrl,
    log,
}: InitializeValkeyParams): Valkey | undefined {
    if (valkeyUrl === undefined) {
        log.info(
            "[Valkey] Not configured - services will use in-memory storage only",
        );
        return undefined;
    }

    try {
        log.info(
            `[Valkey] Initializing connection to ${valkeyUrl.replace(/:[^:@]+@/, ":***@")}`,
        );
        const valkey = new Redis(valkeyUrl, {
            // Retry strategy for failover handling
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                log.warn(`[Valkey] Retry attempt ${String(times)}, delay: ${String(delay)}ms`);
                return delay;
            },
            // Reconnect on READONLY error (ElastiCache failover)
            reconnectOnError: (err: Error) => {
                const targetError = "READONLY";
                if (err.message.includes(targetError)) {
                    log.warn(
                        "[Valkey] READONLY error detected, reconnecting (failover)",
                    );
                    return 2; // Reconnect and resend command
                }
                return false;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false, // Connect immediately
        });

        valkey.on("connect", () => {
            log.info("[Valkey] Connected successfully");
        });

        valkey.on("ready", () => {
            log.info("[Valkey] Ready to accept commands");
        });

        valkey.on("error", (err: Error) => {
            log.error(err, "[Valkey] Connection error");
        });

        valkey.on("close", () => {
            log.warn("[Valkey] Connection closed");
        });

        valkey.on("reconnecting", () => {
            log.info("[Valkey] Reconnecting...");
        });

        return valkey;
    } catch (error) {
        log.error(
            error,
            "[Valkey] Failed to initialize - services will fall back to in-memory storage only",
        );
        return undefined;
    }
}
