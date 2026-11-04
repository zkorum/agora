/**
 * Database operations for conversation imports
 */

import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    conversationImportTable,
    conversationTable,
    importStatusEnum,
    importFailureReasonEnum,
} from "@/shared-backend/schema.js";
import { eq, and, lte } from "drizzle-orm";
import { generateRandomSlugId } from "@/crypto.js";
import { MAX_CONVERSATION_IMPORT_DURATION_MS } from "@/shared/shared.js";

async function expireImportsForUser({
    db,
    userId,
}: {
    db: PostgresDatabase;
    userId: string;
}): Promise<void> {
    const now = new Date();
    // API polling/admission must recover even when the import worker is down.
    // The conditional writer-side update cannot overwrite a completed import.
    await db
        .update(conversationImportTable)
        .set({ status: "failed", failureReason: "timeout", updatedAt: now })
        .where(
            and(
                eq(conversationImportTable.userId, userId),
                eq(conversationImportTable.status, "processing"),
                lte(
                    conversationImportTable.createdAt,
                    new Date(
                        now.getTime() - MAX_CONVERSATION_IMPORT_DURATION_MS,
                    ),
                ),
            ),
        );
}

interface CreateImportRecordParams {
    db: PostgresDatabase;
    userId: string;
}

export type CreateImportRecordResult =
    | {
          status: "created";
          importId: number;
          importSlugId: string;
      }
    | {
          status: "active_import_exists";
          importSlugId: string;
      };

type ImportRecordAttempt = CreateImportRecordResult | { status: "retry" };

const MAX_IMPORT_RECORD_ATTEMPTS = 5;

/**
 * Create a new import record in the database
 */
export async function createImportRecord(
    params: CreateImportRecordParams,
): Promise<CreateImportRecordResult> {
    const { db, userId } = params;

    for (let attempt = 0; attempt < MAX_IMPORT_RECORD_ATTEMPTS; attempt += 1) {
        const importSlugId = generateRandomSlugId();
        const now = new Date();
        const result = await db.transaction<ImportRecordAttempt>(async (tx) => {
            await expireImportsForUser({ db: tx, userId });
            const insertedRows = await tx
                .insert(conversationImportTable)
                .values({
                    slugId: importSlugId,
                    userId: userId,
                    status: "processing",
                    createdAt: now,
                    updatedAt: now,
                })
                .onConflictDoNothing()
                .returning({ id: conversationImportTable.id });

            const inserted = insertedRows.at(0);
            if (inserted !== undefined) {
                return {
                    status: "created",
                    importId: inserted.id,
                    importSlugId,
                };
            }

            const activeImport = await findActiveImportForUser({
                db: tx,
                userId,
            });
            if (activeImport !== null) {
                return {
                    status: "active_import_exists",
                    importSlugId: activeImport.importSlugId,
                };
            }

            return { status: "retry" };
        });

        if (result.status !== "retry") {
            return result;
        }
    }

    throw new Error("Failed to allocate a unique import record");
}

interface MarkImportFailedParams {
    db: PostgresDatabase;
    importSlugId: string;
    failureReason: (typeof importFailureReasonEnum.enumValues)[number];
}

export async function markImportFailed({
    db,
    importSlugId,
    failureReason,
}: MarkImportFailedParams): Promise<void> {
    await db
        .update(conversationImportTable)
        .set({
            status: "failed",
            failureReason,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(conversationImportTable.slugId, importSlugId),
                eq(conversationImportTable.status, "processing"),
            ),
        );
}

interface GetImportStatusParams {
    db: PostgresDatabase;
    importSlugId: string;
    userId: string;
}

interface GetConversationImportAccessStateParams {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId?: string;
}

export type ConversationImportAccessState =
    | { status: "not_found" }
    | { status: "ready" }
    | { status: "importing"; importSlugId: string }
    | { status: "importing_not_visible" };

export async function getConversationImportAccessState({
    db,
    conversationSlugId,
    userId,
}: GetConversationImportAccessStateParams): Promise<ConversationImportAccessState> {
    const conversationRows = await db
        .select({
            conversationId: conversationTable.id,
            isImporting: conversationTable.isImporting,
        })
        .from(conversationTable)
        .where(eq(conversationTable.slugId, conversationSlugId))
        .limit(1);

    const conversation = conversationRows.at(0);
    if (conversation === undefined) {
        return { status: "not_found" };
    }
    if (!conversation.isImporting) {
        return { status: "ready" };
    }
    if (userId === undefined) {
        return { status: "importing_not_visible" };
    }

    const importRows = await db
        .select({ importSlugId: conversationImportTable.slugId })
        .from(conversationImportTable)
        .where(
            and(
                eq(
                    conversationImportTable.conversationId,
                    conversation.conversationId,
                ),
                eq(conversationImportTable.userId, userId),
            ),
        )
        .limit(1);

    const importRow = importRows.at(0);
    return importRow === undefined
        ? { status: "importing_not_visible" }
        : { status: "importing", importSlugId: importRow.importSlugId };
}

interface ImportStatusResult {
    status: (typeof importStatusEnum.enumValues)[number];
    conversationSlugId: string | null;
    failureReason: (typeof importFailureReasonEnum.enumValues)[number] | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Get the status of a CSV import
 * Uses left join to get conversation slug ID when import is completed
 */
async function readImportStatus(
    params: GetImportStatusParams,
): Promise<ImportStatusResult | null> {
    const { db, importSlugId, userId } = params;

    const result = await db
        .select({
            status: conversationImportTable.status,
            conversationSlugId: conversationTable.slugId,
            failureReason: conversationImportTable.failureReason,
            createdAt: conversationImportTable.createdAt,
            updatedAt: conversationImportTable.updatedAt,
        })
        .from(conversationImportTable)
        .leftJoin(
            conversationTable,
            eq(conversationImportTable.conversationId, conversationTable.id),
        )
        .where(
            and(
                eq(conversationImportTable.slugId, importSlugId),
                eq(conversationImportTable.userId, userId),
            ),
        )
        .limit(1);

    return result.at(0) ?? null;
}

function isPastImportDeadline(createdAt: Date): boolean {
    return (
        createdAt.getTime() <= Date.now() - MAX_CONVERSATION_IMPORT_DURATION_MS
    );
}

export async function getImportStatus(
    params: GetImportStatusParams,
): Promise<ImportStatusResult | null> {
    const result = await readImportStatus(params);
    if (
        result?.status !== "processing" ||
        !isPastImportDeadline(result.createdAt)
    ) {
        return result;
    }

    // Only overdue reads need a writer transaction. Read again inside that
    // transaction: a stale replica candidate may already be completed or failed.
    return await params.db.transaction(async (tx) => {
        await expireImportsForUser({ db: tx, userId: params.userId });
        return await readImportStatus({ ...params, db: tx });
    });
}

interface GetActiveImportForUserParams {
    db: PostgresDatabase;
    userId: string;
}

interface ActiveImportResult {
    importSlugId: string;
    createdAt: Date;
}

/**
 * Get the active (processing) import for a user, if any
 * Returns null if user has no active import
 */
async function findActiveImportForUser(
    params: GetActiveImportForUserParams,
): Promise<ActiveImportResult | null> {
    const { db, userId } = params;

    const result = await db
        .select({
            importSlugId: conversationImportTable.slugId,
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

    return result.at(0) ?? null;
}

export async function getActiveImportForUser(
    params: GetActiveImportForUserParams,
): Promise<ActiveImportResult | null> {
    const result = await findActiveImportForUser(params);
    if (result === null || !isPastImportDeadline(result.createdAt)) {
        return result;
    }

    return await params.db.transaction(async (tx) => {
        await expireImportsForUser({ db: tx, userId: params.userId });
        return await findActiveImportForUser({ ...params, db: tx });
    });
}
