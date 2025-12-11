/**
 * Database operations for conversation imports
 */

import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    conversationImportTable,
    conversationTable,
    importStatusEnum,
} from "@/shared-backend/schema.js";
import { eq, and, lt } from "drizzle-orm";
import { log } from "@/app.js";

interface CreateImportRecordParams {
    db: PostgresDatabase;
    importSlugId: string;
    userId: string;
}

/**
 * Create a new import record in the database
 */
export async function createImportRecord(
    params: CreateImportRecordParams,
): Promise<number> {
    const { db, importSlugId, userId } = params;

    const [result] = await db
        .insert(conversationImportTable)
        .values({
            slugId: importSlugId,
            userId: userId,
            status: "processing",
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning({ id: conversationImportTable.id });

    return result.id;
}

interface GetImportStatusParams {
    db: PostgresDatabase;
    importSlugId: string;
}

interface ImportStatusResult {
    status: (typeof importStatusEnum.enumValues)[number];
    conversationSlugId: string | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Get the status of a CSV import
 * Uses left join to get conversation slug ID when import is completed
 */
export async function getImportStatus(
    params: GetImportStatusParams,
): Promise<ImportStatusResult | null> {
    const { db, importSlugId } = params;

    const result = await db
        .select({
            status: conversationImportTable.status,
            conversationSlugId: conversationTable.slugId,
            errorMessage: conversationImportTable.errorMessage,
            createdAt: conversationImportTable.createdAt,
            updatedAt: conversationImportTable.updatedAt,
        })
        .from(conversationImportTable)
        .leftJoin(
            conversationTable,
            eq(conversationImportTable.conversationId, conversationTable.id),
        )
        .where(eq(conversationImportTable.slugId, importSlugId))
        .limit(1);

    if (result.length === 0) {
        return null;
    }

    return result[0];
}

interface CleanupStaleImportsParams {
    db: PostgresDatabase;
    staleThresholdMs: number; // e.g., 3600000 for 1 hour
}

/**
 * Mark stale imports as failed
 * An import is considered stale if it's been in "processing" state
 * for longer than the threshold
 */
export async function cleanupStaleImports(
    params: CleanupStaleImportsParams,
): Promise<number> {
    const { db, staleThresholdMs } = params;

    const staleTimestamp = new Date(Date.now() - staleThresholdMs);

    const result = await db
        .update(conversationImportTable)
        .set({
            status: "failed",
            errorMessage:
                "Import timed out - processing took longer than expected",
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(conversationImportTable.status, "processing"),
                lt(conversationImportTable.updatedAt, staleTimestamp),
            ),
        )
        .returning({ slugId: conversationImportTable.slugId });

    return result.length;
}

interface GetActiveImportForUserParams {
    db: PostgresDatabase;
    userId: string;
}

interface ActiveImportResult {
    importSlugId: string;
    status: (typeof importStatusEnum.enumValues)[number];
    createdAt: Date;
}

/**
 * Get the active (processing) import for a user, if any
 * Returns null if user has no active import
 */
export async function getActiveImportForUser(
    params: GetActiveImportForUserParams,
): Promise<ActiveImportResult | null> {
    const { db, userId } = params;

    const result = await db
        .select({
            importSlugId: conversationImportTable.slugId,
            status: conversationImportTable.status,
            createdAt: conversationImportTable.createdAt,
        })
        .from(conversationImportTable)
        .where(
            and(
                eq(conversationImportTable.userId, userId),
                eq(conversationImportTable.status, "processing"),
            ),
        )
        .limit(1);

    if (result.length === 0) {
        return null;
    }

    return result[0];
}

interface StuckImportRecord {
    id: number;
    slugId: string;
    userId: string;
}

interface CleanupStuckImportsOnStartupParams {
    db: PostgresDatabase;
    errorMessage: string;
}

interface CleanupStuckImportsResult {
    cleanedCount: number;
    stuckImports: StuckImportRecord[];
}

/**
 * Cleanup stuck imports on server startup.
 * Returns the list of stuck imports so notifications can be sent.
 * This is separate from the periodic cleanup because:
 * 1. It runs immediately without threshold check (server restarted)
 * 2. It returns import details for notification sending
 */
export async function cleanupStuckImportsOnStartup({
    db,
    errorMessage,
}: CleanupStuckImportsOnStartupParams): Promise<CleanupStuckImportsResult> {
    // First, get all stuck imports (to return for notification sending)
    const stuckImports = await db
        .select({
            id: conversationImportTable.id,
            slugId: conversationImportTable.slugId,
            userId: conversationImportTable.userId,
        })
        .from(conversationImportTable)
        .where(eq(conversationImportTable.status, "processing"));

    if (stuckImports.length === 0) {
        return {
            cleanedCount: 0,
            stuckImports: [],
        };
    }

    // Mark all stuck imports as failed
    await db
        .update(conversationImportTable)
        .set({
            status: "failed",
            errorMessage: errorMessage,
            updatedAt: new Date(),
        })
        .where(eq(conversationImportTable.status, "processing"));

    log.info(
        `[ImportStartup] Marked ${String(stuckImports.length)} stuck imports as failed`,
    );

    return {
        cleanedCount: stuckImports.length,
        stuckImports: stuckImports,
    };
}
