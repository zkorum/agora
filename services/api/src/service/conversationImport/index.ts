/**
 * Conversation Import Service
 *
 * Handles CSV import requests for conversations.
 * This service manages the async import process similar to conversationExport.
 */

import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import type { ImportBuffer } from "../importBuffer.js";
import type {
    GetConversationImportStatusResponse,
    GetActiveImportResponse,
} from "@/shared/types/dto.js";
import type { EventSlug, ParticipationMode } from "@/shared/types/zod.js";
import type { RealtimeSSEManager } from "../realtimeSSE.js";
import * as database from "./database.js";
import { CSV_UPLOAD_FIELD_NAMES } from "@/shared-app-api/csvUpload.js";
import type { CsvFiles } from "@/service/csvImport.js";
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";

interface RequestConversationImportParams {
    db: PostgresDatabase;
    userId: string;
    files: CsvFiles;
    formData: {
        postAsOrganization?: string;
        indexConversationAt?: string;
        participationMode: ParticipationMode;
        isIndexed: boolean;
        requiresEventTicket?: EventSlug;
    };
    didWrite: string;
    importBuffer: ImportBuffer;
    realtimeSSEManager: RealtimeSSEManager;
}

interface RequestConversationImportResult {
    importSlugId: string;
}

/**
 * Request a CSV import - creates a pending import record and queues it for processing
 */
export async function requestConversationImport(
    params: RequestConversationImportParams,
): Promise<RequestConversationImportResult> {
    const {
        db,
        userId,
        files,
        formData,
        didWrite,
        importBuffer,
        realtimeSSEManager,
    } = params;

    // Files are already parsed and validated by caller via zodCsvFiles
    const summaryContent = files[CSV_UPLOAD_FIELD_NAMES.SUMMARY_FILE];
    const commentsContent = files[CSV_UPLOAD_FIELD_NAMES.COMMENTS_FILE];
    const votesContent = files[CSV_UPLOAD_FIELD_NAMES.VOTES_FILE];

    // Verify files have content (Zod schema ensures they're strings, but could be empty)
    if (
        summaryContent.trim().length === 0 ||
        commentsContent.trim().length === 0 ||
        votesContent.trim().length === 0
    ) {
        throw new Error(
            "One or more CSV files are empty. Please ensure all files contain valid data.",
        );
    }

    // Perform dry-run parsing to validate CSV schema and content
    // This catches malformed CSV, missing columns, or invalid data early
    try {
        const { parseSummaryCsv, parseCommentsCsv, parseVotesCsv } =
            await import("../polisCsvParser.js");

        // Parse all CSV files to validate schema and content
        await parseSummaryCsv(summaryContent);
        await parseCommentsCsv(commentsContent);
        await parseVotesCsv(votesContent);

        // If we get here, all CSV files are valid
    } catch (error) {
        // Provide user-friendly error message
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        throw new Error(
            `CSV validation failed: ${errorMessage}. Please ensure your CSV files match the required format.`,
        );
    }

    const createImportResult = await database.createImportRecord({
        db,
        userId,
    });

    if (createImportResult.status === "active_import_exists") {
        throw httpErrors.conflict(
            "You already have an import in progress. Please wait for it to complete before starting a new one.",
        );
    }

    try {
        await importBuffer.addImport({
            type: "csv",
            importSlugId: createImportResult.importSlugId,
            userId,
            files,
            formData,
            didWrite,
            authorId: userId,
        });
    } catch (error) {
        try {
            await database.markImportFailed({
                db,
                importSlugId: createImportResult.importSlugId,
                failureReason: "processing_error",
            });
        } catch (markFailedError) {
            log.error(
                markFailedError,
                `[Import] Failed to mark ${createImportResult.importSlugId} as failed after queue error`,
            );
        }
        throw error;
    }

    const { createImportNotification } = await import("./notifications.js");
    try {
        await createImportNotification({
            db,
            userId,
            importId: createImportResult.importId,
            conversationId: null,
            type: "import_started",
            realtimeSSEManager,
        });
    } catch (error) {
        log.error(
            error,
            `[Import] Failed to send start notification for ${createImportResult.importSlugId}`,
        );
    }

    return { importSlugId: createImportResult.importSlugId };
}

interface RequestUrlImportParams {
    db: PostgresDatabase;
    userId: string;
    polisUrl: string;
    formData: {
        postAsOrganization?: string;
        indexConversationAt?: string;
        participationMode: ParticipationMode;
        isIndexed: boolean;
        requiresEventTicket?: EventSlug;
    };
    didWrite: string;
    importBuffer: ImportBuffer;
    realtimeSSEManager: RealtimeSSEManager;
}

/**
 * Request a URL import - creates a pending import record and queues it for processing
 */
export async function requestUrlImport(
    params: RequestUrlImportParams,
): Promise<RequestConversationImportResult> {
    const {
        db,
        userId,
        polisUrl,
        formData,
        didWrite,
        importBuffer,
        realtimeSSEManager,
    } = params;

    const createImportResult = await database.createImportRecord({
        db,
        userId,
    });

    if (createImportResult.status === "active_import_exists") {
        throw httpErrors.conflict(
            "You already have an import in progress. Please wait for it to complete before starting a new one.",
        );
    }

    try {
        await importBuffer.addImport({
            type: "url",
            importSlugId: createImportResult.importSlugId,
            userId,
            polisUrl,
            formData,
            didWrite,
            authorId: userId,
        });
    } catch (error) {
        try {
            await database.markImportFailed({
                db,
                importSlugId: createImportResult.importSlugId,
                failureReason: "processing_error",
            });
        } catch (markFailedError) {
            log.error(
                markFailedError,
                `[Import] Failed to mark ${createImportResult.importSlugId} as failed after queue error`,
            );
        }
        throw error;
    }

    const { createImportNotification } = await import("./notifications.js");
    try {
        await createImportNotification({
            db,
            userId,
            importId: createImportResult.importId,
            conversationId: null,
            type: "import_started",
            realtimeSSEManager,
        });
    } catch (error) {
        log.error(
            error,
            `[Import] Failed to send start notification for ${createImportResult.importSlugId}`,
        );
    }

    return { importSlugId: createImportResult.importSlugId };
}

interface GetConversationImportStatusParams {
    db: PostgresDatabase;
    importSlugId: string;
}

/**
 * Get the status of a CSV import
 */
export async function getConversationImportStatus(
    params: GetConversationImportStatusParams,
): Promise<GetConversationImportStatusResponse | null> {
    const result = await database.getImportStatus(params);
    if (result === null) {
        return null;
    }

    const importSlugId = params.importSlugId;
    const { status, conversationSlugId, failureReason, createdAt, updatedAt } =
        result;

    // Return discriminated union based on status
    if (status === "processing") {
        return {
            status: "processing",
            importSlugId,
            createdAt,
            updatedAt,
        };
    } else if (status === "completed") {
        if (conversationSlugId === null) {
            throw new Error(
                "conversationSlugId should not be null for completed status",
            );
        }
        return {
            status: "completed",
            importSlugId,
            conversationSlugId,
            createdAt,
            updatedAt,
        };
    } else {
        // status === "failed"
        return {
            status: "failed",
            importSlugId,
            failureReason: failureReason ?? undefined,
            createdAt,
            updatedAt,
        };
    }
}

interface GetActiveImportForUserParams {
    db: PostgresDatabase;
    userId: string;
}

/**
 * Get the active (processing) import for a user, if any
 * Returns null if no active import exists
 */
export async function getActiveImportForUser(
    params: GetActiveImportForUserParams,
): Promise<GetActiveImportResponse> {
    const result = await database.getActiveImportForUser(params);

    if (result === null) {
        return { hasActiveImport: false as const };
    }

    return {
        hasActiveImport: true as const,
        importSlugId: result.importSlugId,
        createdAt: result.createdAt,
    };
}
