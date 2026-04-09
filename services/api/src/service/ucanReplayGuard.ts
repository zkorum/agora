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
import type { ValkeyRef } from "./valkeyRef.js";

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
    syncToValkey: (params: { valkey: Valkey }) => Promise<number>;
    shutdown: () => void;
}

interface CreateUcanReplayGuardParams {
    valkeyRef: ValkeyRef;
}

export function createUcanReplayGuard({
    valkeyRef,
}: CreateUcanReplayGuardParams): UcanReplayGuard {
    interface UsedUcanEntry {
        expiryUnix: number;
        issuerDid: string;
    }

    // In-memory store — used as fallback when Valkey is not configured.
    // Map<sha256hex, { expiryUnix, issuerDid }>
    const usedHashes = new Map<string, UsedUcanEntry>();
    const getNowUnix = (): number => Math.floor(Date.now() / 1000);
    const getTrackedExpiryUnix = (expiryUnix: number): number => expiryUnix + 5;
    const getTtlSeconds = ({
        expiryUnix,
        nowUnix,
    }: {
        expiryUnix: number;
        nowUnix: number;
    }): number => Math.max(expiryUnix - nowUnix, 1);
    const getTrackedEntry = ({
        ucanHash,
        nowUnix,
    }: {
        ucanHash: string;
        nowUnix: number;
    }): UsedUcanEntry | undefined => {
        const trackedEntry = usedHashes.get(ucanHash);
        if (trackedEntry === undefined) {
            return undefined;
        }

        if (trackedEntry.expiryUnix <= nowUnix) {
            usedHashes.delete(ucanHash);
            return undefined;
        }

        return trackedEntry;
    };

    // Always keep the cleanup loop running so the in-memory fallback stays bounded,
    // even if Valkey becomes available after startup or temporarily unavailable later.
    let cleanupInterval: ReturnType<typeof setInterval> | undefined = setInterval(
        () => {
            const nowUnix = getNowUnix();
            for (const [hash, entry] of usedHashes) {
                if (entry.expiryUnix <= nowUnix) {
                    usedHashes.delete(hash);
                }
            }
        },
        10_000,
    );
    cleanupInterval.unref();

    const checkAndMark = async ({
        encodedUcan,
        expiryUnix,
        issuerDid,
    }: {
        encodedUcan: string;
        expiryUnix: number;
        issuerDid: string;
    }): Promise<boolean> => {
        const valkey = valkeyRef.current;

        // SHA-256 of the raw JWT string. UCANs use deterministic base64url encoding
        // so the same token always produces the same hash. The 64-char hex digest
        // makes the Valkey key well-formed with no injection risk.
        const ucanHash = createHash("sha256")
            .update(encodedUcan)
            .digest("hex");
        const nowUnix = getNowUnix();

        if (getTrackedEntry({ ucanHash, nowUnix }) !== undefined) {
            return true;
        }

        if (valkey !== undefined) {
            // Valkey path: atomic SET NX with TTL (cross-instance protection)
            const ucanKey = `${VALKEY_QUEUE_KEYS.UCAN_USED_PREFIX}${ucanHash}`;
            const ttlSeconds = getTtlSeconds({
                expiryUnix: getTrackedExpiryUnix(expiryUnix),
                nowUnix,
            });

            // Atomic check-and-set: returns null if key already exists (replay).
            // Value is the issuer DID — useful for debugging replay attacks in logs.
            const setResult = await valkey.set(ucanKey, issuerDid, {
                conditionalSet: "onlyIfDoesNotExist",
                expiry: { type: TimeUnit.Seconds, count: ttlSeconds },
            });

            return setResult === null; // null = key existed = replay
        }

        // In-memory fallback: single-instance replay protection only
        usedHashes.set(ucanHash, {
            expiryUnix: getTrackedExpiryUnix(expiryUnix),
            issuerDid,
        });
        return false; // not a replay
    };

    const syncToValkey = async ({ valkey }: { valkey: Valkey }): Promise<number> => {
        const nowUnix = getNowUnix();
        let syncedCount = 0;

        for (const [ucanHash, entry] of usedHashes) {
            if (entry.expiryUnix <= nowUnix) {
                usedHashes.delete(ucanHash);
                continue;
            }

            const ucanKey = `${VALKEY_QUEUE_KEYS.UCAN_USED_PREFIX}${ucanHash}`;
            await valkey.set(ucanKey, entry.issuerDid, {
                conditionalSet: "onlyIfDoesNotExist",
                expiry: {
                    type: TimeUnit.Seconds,
                    count: getTtlSeconds({
                        expiryUnix: entry.expiryUnix,
                        nowUnix,
                    }),
                },
            });
            usedHashes.delete(ucanHash);
            syncedCount += 1;
        }

        return syncedCount;
    };

    const shutdown = (): void => {
        if (cleanupInterval !== undefined) {
            clearInterval(cleanupInterval);
            cleanupInterval = undefined;
        }
        usedHashes.clear();
    };

    return { checkAndMark, syncToValkey, shutdown };
}
