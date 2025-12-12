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
import type { EventSlug } from "@/shared/types/zod.js";
import type { NotificationSSEManager } from "../notificationSSE.js";
import * as database from "./database.js";
import { generateRandomSlugId } from "@/crypto.js";
import {
    validateCsvFieldNames,
    CSV_UPLOAD_FIELD_NAMES,
} from "@/shared-app-api/csvUpload.js";

interface RequestConversationImportParams {
    db: PostgresDatabase;
    userId: string;
    files: Partial<Record<string, string>>;
    formData: {
        postAsOrganization?: string;
        indexConversationAt?: string;
        isLoginRequired: boolean;
        isIndexed: boolean;
        requiresEventTicket?: EventSlug;
    };
    proof: string;
    didWrite: string;
    importBuffer: ImportBuffer;
    notificationSSEManager: NotificationSSEManager;
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
        proof,
        didWrite,
        importBuffer,
        notificationSSEManager,
    } = params;

    // Early CSV validation - fail fast before creating database records
    const fieldNames = Object.keys(files);
    const validation = validateCsvFieldNames(fieldNames);

    if (!validation.isValid) {
        const errors: string[] = [];
        if (validation.missingFields.length > 0) {
            errors.push(
                `Missing required CSV files: ${validation.missingFields.join(", ")}`,
            );
        }
        if (validation.unexpectedFields.length > 0) {
            errors.push(
                `Unexpected files uploaded: ${validation.unexpectedFields.join(", ")}`,
            );
        }
        throw new Error(
            `Please upload all required CSV files (summary, comments, votes). ${errors.join("; ")}`,
        );
    }

    // Verify all required files have content
    const summaryContent = files[CSV_UPLOAD_FIELD_NAMES.SUMMARY_FILE];
    const commentsContent = files[CSV_UPLOAD_FIELD_NAMES.COMMENTS_FILE];
    const votesContent = files[CSV_UPLOAD_FIELD_NAMES.VOTES_FILE];

    if (
        !summaryContent ||
        summaryContent.trim().length === 0 ||
        !commentsContent ||
        commentsContent.trim().length === 0 ||
        !votesContent ||
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

    // Check if user already has an active import
    const activeImport = await database.getActiveImportForUser({
        db,
        userId,
    });

    if (activeImport !== null) {
        throw new Error(
            "You already have an import in progress. Please wait for it to complete before starting a new one.",
        );
    }

    // Create import record in database
    const importSlugId = generateRandomSlugId();
    const importId = await database.createImportRecord({
        db,
        importSlugId,
        userId,
    });

    // Create notification for import start
    const { createImportNotification } = await import("./notifications.js");
    await createImportNotification({
        db,
        userId,
        importId,
        conversationId: null,
        type: "import_started",
        notificationSSEManager,
    });

    // Queue CSV import for async processing
    await importBuffer.addImport({
        type: "csv",
        importSlugId,
        userId,
        files,
        formData,
        proof,
        didWrite,
        authorId: userId,
    });

    return { importSlugId };
}

interface RequestUrlImportParams {
    db: PostgresDatabase;
    userId: string;
    polisUrl: string;
    formData: {
        postAsOrganization?: string;
        indexConversationAt?: string;
        isLoginRequired: boolean;
        isIndexed: boolean;
        requiresEventTicket?: EventSlug;
    };
    proof: string;
    didWrite: string;
    importBuffer: ImportBuffer;
    notificationSSEManager: NotificationSSEManager;
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
        proof,
        didWrite,
        importBuffer,
        notificationSSEManager,
    } = params;

    // Check if user already has an active import
    const activeImport = await database.getActiveImportForUser({
        db,
        userId,
    });

    if (activeImport !== null) {
        throw new Error(
            "You already have an import in progress. Please wait for it to complete before starting a new one.",
        );
    }

    // Create import record in database
    const importSlugId = generateRandomSlugId();
    const importId = await database.createImportRecord({
        db,
        importSlugId,
        userId,
    });

    // Create notification for import start
    const { createImportNotification } = await import("./notifications.js");
    await createImportNotification({
        db,
        userId,
        importId,
        conversationId: null,
        type: "import_started",
        notificationSSEManager,
    });

    // Queue URL import for async processing
    await importBuffer.addImport({
        type: "url",
        importSlugId,
        userId,
        polisUrl,
        formData,
        proof,
        didWrite,
        authorId: userId,
    });

    return { importSlugId };
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
    const { status, conversationSlugId, errorMessage, createdAt, updatedAt } =
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
            errorMessage: errorMessage ?? undefined,
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
