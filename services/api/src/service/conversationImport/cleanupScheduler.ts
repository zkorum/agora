/**
 * Scheduled cleanup task for stale imports
 *
 * This module runs a periodic cleanup job that marks stale imports as failed.
 * An import is considered stale if it's been in "processing" state for longer
 * than the threshold (default: 1 hour).
 */

import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { cleanupStaleImports } from "./database.js";
import { log } from "@/app.js";

// Configuration constants
const STALE_IMPORT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const STALE_IMPORT_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

interface CleanupSchedulerDependencies {
    db: PostgresDatabase;
}

/**
 * Start the scheduled cleanup task for stale imports
 * Returns a function to stop the scheduler
 */
export function startStaleImportCleanup(
    deps: CleanupSchedulerDependencies,
): () => void {
    const { db } = deps;

    const intervalId = setInterval(() => {
        void (async () => {
            try {
                const cleanedCount = await cleanupStaleImports({
                    db,
                    staleThresholdMs: STALE_IMPORT_THRESHOLD_MS,
                });
                if (cleanedCount > 0) {
                    log.info(
                        `[ImportCleanup] Cleaned up ${String(cleanedCount)} stale imports`,
                    );
                }
            } catch (error) {
                log.error(error, "[ImportCleanup] Error during cleanup");
            }
        })();
    }, STALE_IMPORT_CLEANUP_INTERVAL_MS);

    log.info(
        `[ImportCleanup] Scheduled cleanup started (interval: 1h, threshold: 1h)`,
    );

    // Return cleanup function
    return () => {
        clearInterval(intervalId);
        log.info("[ImportCleanup] Scheduled cleanup stopped");
    };
}
