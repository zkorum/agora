/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { GlideClient, Decoder } from "@valkey/valkey-glide";
import type { BaseLogger } from "pino";

// Using valkey-glide, the official Valkey client
export type Valkey = GlideClient;

interface InitializeValkeyParams {
    valkeyUrl: string | undefined;
    log: Pick<BaseLogger, "info" | "error">;
    type: "Queue" | "Cache";
}

interface ParsedValkeyUrl {
    host: string;
    port: number;
    username?: string;
    password?: string;
    useTLS: boolean;
}

/**
 * Parse a Valkey/Redis URL into components for valkey-glide
 *
 * Supported formats:
 * - valkey://localhost:6379
 * - valkeys://localhost:6379 (TLS)
 * - redis://localhost:6379
 * - rediss://localhost:6379 (TLS)
 * - valkey://user:password@localhost:6379
 * - valkeys://user:password@localhost:6379
 */
function parseValkeyUrl(urlString: string): ParsedValkeyUrl {
    const url = new URL(urlString);

    const useTLS = url.protocol === "valkeys:" || url.protocol === "rediss:";

    const host = url.hostname;
    const port = url.port ? parseInt(url.port, 10) : 6379;

    // Decode username and password (they may be URL-encoded)
    const username = url.username
        ? decodeURIComponent(url.username)
        : undefined;
    const password = url.password
        ? decodeURIComponent(url.password)
        : undefined;

    return { host, port, username, password, useTLS };
}

/**
 * Initialize Valkey client (optional)
 *
 * Used for:
 * - Vote buffer persistence across API instances
 * - Export buffer queue management
 * - Future: Distributed locks, rate limiting, etc.
 *
 * If QUEUE_VALKEY_URL is not provided, returns undefined and services fall back to in-memory only.
 *
 * Configuration:
 * - Local: valkey://localhost:6379
 * - Production: AWS ElastiCache endpoint with TLS (Valkey-compatible)
 *   Example: valkeys://username:password@my-cluster.xxxxx.cache.amazonaws.com:6379
 */
export async function initializeValkey({
    valkeyUrl,
    log,
    type,
}: InitializeValkeyParams): Promise<Valkey | undefined> {
    if (valkeyUrl === undefined) {
        log.info(
            `[${type}Valkey] Not configured - services will use in-memory storage only`,
        );
        return undefined;
    }

    try {
        log.info(
            `[${type}Valkey] Initializing connection to ${valkeyUrl.replace(/:[^:@]+@/, ":***@")}`,
        );

        const { host, port, username, password, useTLS } =
            parseValkeyUrl(valkeyUrl);

        // Build credentials only if password is provided (required by valkey-glide)
        const credentials =
            password !== undefined ? { username, password } : undefined;

        const valkey = await GlideClient.createClient({
            addresses: [{ host, port }],
            credentials,
            useTLS,
            // Request timeout: time to wait for command completion including retries
            requestTimeout: 5000, // 5 seconds
            // Connection backoff: exponential retry strategy for reconnections
            // Formula: rand(0 ... factor * (exponentBase ^ N)) where N = attempt number
            connectionBackoff: {
                numberOfRetries: 10, // Max retries before delay becomes constant
                factor: 100, // Base delay multiplier in ms
                exponentBase: 2, // Delay doubles each retry: 100ms, 200ms, 400ms...
            },
            // Advanced connection settings
            advancedConfiguration: {
                // Time to wait for TCP/TLS connection to complete
                // Note: Default is 250ms (not 2000ms as documented - known bug)
                connectionTimeout: 5000, // 5 seconds for ElastiCache/slow networks
            },
            // Use string decoder by default - all our data is JSON (UTF-8)
            // This ensures lrange/get/etc return string instead of Buffer
            defaultDecoder: Decoder.String,
        });

        log.info(`[${type}Valkey] Connected successfully`);

        return valkey;
    } catch (error) {
        log.error(
            error,
            `[${type}Valkey] Failed to initialize - services will fall back to in-memory storage only`,
        );
        return undefined;
    }
}
