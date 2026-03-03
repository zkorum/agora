/**
 * UCAN Replay Guard
 *
 * Prevents UCAN token replay attacks by tracking used token hashes.
 * Two modes:
 * - Valkey (production): Atomic SET NX with TTL — cross-instance protection
 * - In-memory (fallback): Map with periodic cleanup — single-instance only
 *
 * Same graceful degradation pattern as vote/import/export buffers.
 */

import { createHash } from "node:crypto";
import { TimeUnit } from "@valkey/valkey-glide";
import type { Valkey } from "@/shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";

export interface UcanReplayGuard {
    /**
     * Check if a UCAN has been used before, and mark it as used if not.
     * Returns true if the UCAN is a replay (already used).
     */
    checkAndMark: (params: {
        encodedUcan: string;
        expiryUnix: number;
        issuerDid: string;
    }) => Promise<boolean>;
    shutdown: () => void;
}

interface CreateUcanReplayGuardParams {
    valkey?: Valkey;
}

export function createUcanReplayGuard({
    valkey,
}: CreateUcanReplayGuardParams): UcanReplayGuard {
    // In-memory store — used as fallback when Valkey is not configured.
    // Map<sha256hex, expiryUnixSeconds>
    const usedHashes = new Map<string, number>();
    let cleanupInterval: ReturnType<typeof setInterval> | undefined;

    if (valkey === undefined) {
        // Cleanup expired entries every 10s. UCANs have 30s lifetime (120s for uploads),
        // so 10s interval keeps memory bounded without excessive iteration.
        cleanupInterval = setInterval(() => {
            const nowUnix = Math.floor(Date.now() / 1000);
            for (const [hash, expiry] of usedHashes) {
                if (expiry <= nowUnix) {
                    usedHashes.delete(hash);
                }
            }
        }, 10_000);
    }

    const checkAndMark = async ({
        encodedUcan,
        expiryUnix,
        issuerDid,
    }: {
        encodedUcan: string;
        expiryUnix: number;
        issuerDid: string;
    }): Promise<boolean> => {
        // SHA-256 of the raw JWT string. UCANs use deterministic base64url encoding
        // so the same token always produces the same hash. The 64-char hex digest
        // makes the Valkey key well-formed with no injection risk.
        const ucanHash = createHash("sha256")
            .update(encodedUcan)
            .digest("hex");

        if (valkey !== undefined) {
            // Valkey path: atomic SET NX with TTL (cross-instance protection)
            const ucanKey = `${VALKEY_QUEUE_KEYS.UCAN_USED_PREFIX}${ucanHash}`;
            const nowUnix = Math.floor(Date.now() / 1000);
            const ttlSeconds = Math.max(expiryUnix - nowUnix + 5, 1);

            // Atomic check-and-set: returns null if key already exists (replay).
            // Value is the issuer DID — useful for debugging replay attacks in logs.
            const setResult = await valkey.set(ucanKey, issuerDid, {
                conditionalSet: "onlyIfDoesNotExist",
                expiry: { type: TimeUnit.Seconds, count: ttlSeconds },
            });

            return setResult === null; // null = key existed = replay
        }

        // In-memory fallback: single-instance replay protection only
        if (usedHashes.has(ucanHash)) {
            return true; // replay
        }
        usedHashes.set(ucanHash, expiryUnix + 5);
        return false; // not a replay
    };

    const shutdown = (): void => {
        if (cleanupInterval !== undefined) {
            clearInterval(cleanupInterval);
            cleanupInterval = undefined;
        }
        usedHashes.clear();
    };

    return { checkAndMark, shutdown };
}
