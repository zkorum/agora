import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { and, desc, eq, lt } from "drizzle-orm";
import { config, log } from "@/app.js";
import { httpErrors } from "@fastify/sensible";
import {
    conversationExportTable,
    conversationTable,
    opinionTable,
    opinionContentTable,
    opinionModerationTable,
    userTable,
} from "@/shared-backend/schema.js";
import { format } from "fast-csv";
import { uploadToS3, generatePresignedUrl } from "./s3.js";
import { nanoid } from "nanoid";
import type {
    RequestConversationExportResponse,
    GetConversationExportStatusResponse,
    GetConversationExportHistoryResponse,
} from "@/shared/types/dto.js";

interface RequestConversationExportParams {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
}

/**
 * Request a new conversation export.
 */
export async function requestConversationExport({
    db,
    conversationSlugId,
}: RequestConversationExportParams): Promise<RequestConversationExportResponse> {
    // Verify conversation exists
    const conversation = await db
        .select({ id: conversationTable.id })
        .from(conversationTable)
        .where(eq(conversationTable.slugId, conversationSlugId))
        .limit(1);

    if (conversation.length === 0) {
        throw httpErrors.notFound("Conversation not found");
    }

    const conversationId = conversation[0].id;

    // Create export record
    const now = new Date();
    const expiresAt = new Date(
        now.getTime() +
            config.CONVERSATION_EXPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const exportSlugId = nanoid(8);

    const [exportRecord] = await db
        .insert(conversationExportTable)
        .values({
            slugId: exportSlugId,
            conversationId: conversationId,
            status: "processing",
            expiresAt: expiresAt,
        })
        .returning({
            slugId: conversationExportTable.slugId,
        });

    // Start background processing (don't await)
    processConversationExport({
        db,
        exportSlugId: exportRecord.slugId,
        conversationId,
        conversationSlugId,
    }).catch((error: unknown) => {
        log.error("Error processing conversation export:", error);
    });

    return {
        exportSlugId: exportRecord.slugId,
    };
}

interface ProcessConversationExportParams {
    db: PostgresDatabase;
    exportSlugId: string;
    conversationId: number;
    conversationSlugId: string;
}

/**
 * Background job to generate CSV and upload to S3.
 */
async function processConversationExport({
    db,
    exportSlugId,
    conversationId,
    conversationSlugId,
}: ProcessConversationExportParams): Promise<void> {
    try {
        // Generate CSV buffer
        const { csvBuffer, opinionCount } = await generateConversationCsv({
            db,
            conversationId,
            conversationSlugId,
        });

        // Generate S3 key
        const timestamp = Date.now();
        const random = nanoid(8);
        const s3Key = `${config.AWS_S3_CONVERSATION_EXPORTS_PATH}${conversationSlugId}/export-${timestamp.toString()}-${random}.csv`;

        // Upload to S3
        if (
            config.AWS_S3_BUCKET_NAME === undefined ||
            config.AWS_S3_REGION === undefined
        ) {
            throw new Error("S3 configuration is missing");
        }

        await uploadToS3({
            s3Key,
            buffer: csvBuffer,
            bucketName: config.AWS_S3_BUCKET_NAME,
        });

        // Generate pre-signed URL (valid for 7 days)
        const { url, expiresAt } = await generatePresignedUrl({
            s3Key,
            bucketName: config.AWS_S3_BUCKET_NAME,
            expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
        });

        // Update export record
        await db
            .update(conversationExportTable)
            .set({
                status: "completed",
                s3Key,
                s3Url: url,
                s3UrlExpiresAt: expiresAt,
                fileSize: csvBuffer.length,
                opinionCount,
                updatedAt: new Date(),
            })
            .where(eq(conversationExportTable.slugId, exportSlugId));

        log.info(`Conversation export ${exportSlugId} completed successfully`);
    } catch (error: unknown) {
        if (error instanceof Error) {
            log.error(`Error message: ${error.message}`);
            if (error.stack) {
                log.error(`Stack trace: ${error.stack}`); // Full stack trace
            }
        }

        // Update export record with error
        await db
            .update(conversationExportTable)
            .set({
                status: "failed",
                errorMessage:
                    error instanceof Error
                        ? error.message
                        : "Unknown error occurred",
                updatedAt: new Date(),
            })
            .where(eq(conversationExportTable.slugId, exportSlugId));
    }
}

interface GenerateConversationCsvParams {
    db: PostgresDatabase;
    conversationId: number;
    conversationSlugId: string;
}

interface GenerateConversationCsvReturn {
    csvBuffer: Buffer;
    opinionCount: number;
}

/**
 * Escape CSV field according to RFC 4180.
 * Wraps text in double quotes and escapes internal quotes by doubling them.
 */
function escapeCsvField(text: string): string {
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
}

/**
 * Format date as human-readable string for Polis export.
 * Example: "Sat Nov 17 05:09:36 WIB 2018"
 */
function formatDatetime(date: Date): string {
    return date.toString();
}

/**
 * Generate CSV file for conversation following Polis specification.
 */
async function generateConversationCsv({
    db,
    conversationId,
}: GenerateConversationCsvParams): Promise<GenerateConversationCsvReturn> {
    // Fetch all opinions for this conversation with moderation status
    const opinions = await db
        .select({
            opinionId: opinionTable.id,
            authorParticipantId: userTable.polisParticipantId,
            content: opinionContentTable.content,
            createdAt: opinionTable.createdAt,
            numAgrees: opinionTable.numAgrees,
            numDisagrees: opinionTable.numDisagrees,
            moderationId: opinionModerationTable.id,
        })
        .from(opinionTable)
        .innerJoin(userTable, eq(opinionTable.authorId, userTable.id))
        .innerJoin(
            opinionContentTable,
            eq(opinionTable.currentContentId, opinionContentTable.id),
        )
        .leftJoin(
            opinionModerationTable,
            eq(opinionTable.id, opinionModerationTable.opinionId),
        )
        .where(eq(opinionTable.conversationId, conversationId))
        .orderBy(opinionTable.createdAt);

    // Generate CSV rows following Polis spec
    const rows = opinions.map((opinion) => ({
        timestamp: Math.floor(opinion.createdAt.getTime() / 1000),
        datetime: formatDatetime(opinion.createdAt),
        "comment-id": opinion.opinionId,
        "author-id": opinion.authorParticipantId,
        agrees: opinion.numAgrees,
        disagrees: opinion.numDisagrees,
        moderated: opinion.moderationId !== null ? 1 : 0,
        "comment-body": escapeCsvField(opinion.content),
    }));

    const csvStream = format({ headers: true });
    const chunks: Buffer[] = [];

    csvStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
    });

    // Write all rows
    for (const row of rows) {
        csvStream.write(row);
    }

    csvStream.end();

    // Wait for stream to finish
    await new Promise<void>((resolve, reject) => {
        csvStream.on("end", () => {
            resolve();
        });
        csvStream.on("error", reject);
    });

    const csvBuffer = Buffer.concat(chunks);

    return {
        csvBuffer,
        opinionCount: opinions.length,
    };
}

interface GetConversationExportStatusParams {
    db: PostgresDatabase;
    exportSlugId: string;
    userId: string;
}

/**
 * Get export status and download URL.
 */
export async function getConversationExportStatus({
    db,
    exportSlugId,
}: GetConversationExportStatusParams): Promise<GetConversationExportStatusResponse> {
    const exportRecordList = await db
        .select({
            slugId: conversationExportTable.slugId,
            status: conversationExportTable.status,
            conversationSlugId: conversationTable.slugId,
            s3Url: conversationExportTable.s3Url,
            s3UrlExpiresAt: conversationExportTable.s3UrlExpiresAt,
            fileSize: conversationExportTable.fileSize,
            opinionCount: conversationExportTable.opinionCount,
            errorMessage: conversationExportTable.errorMessage,
            createdAt: conversationExportTable.createdAt,
        })
        .from(conversationExportTable)
        .innerJoin(
            conversationTable,
            eq(conversationExportTable.conversationId, conversationTable.id),
        )
        .where(
            and(
                eq(conversationExportTable.slugId, exportSlugId),
                eq(conversationExportTable.isDeleted, false),
            ),
        )
        .limit(1);

    if (exportRecordList.length !== 1) {
        throw httpErrors.notFound("Export not found");
    }

    const exportRecord = exportRecordList[0];

    return {
        exportSlugId: exportRecord.slugId,
        status: exportRecord.status,
        conversationSlugId: exportRecord.conversationSlugId,
        downloadUrl: exportRecord.s3Url ?? undefined,
        urlExpiresAt: exportRecord.s3UrlExpiresAt ?? undefined,
        fileSize: exportRecord.fileSize ?? undefined,
        opinionCount: exportRecord.opinionCount ?? undefined,
        errorMessage: exportRecord.errorMessage ?? undefined,
        createdAt: exportRecord.createdAt,
    };
}

interface GetConversationExportHistoryParams {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
}

/**
 * Get export history for a conversation.
 */
export async function getConversationExportHistory({
    db,
    conversationSlugId,
}: GetConversationExportHistoryParams): Promise<GetConversationExportHistoryResponse> {
    const exports = await db
        .select({
            exportSlugId: conversationExportTable.slugId,
            status: conversationExportTable.status,
            createdAt: conversationExportTable.createdAt,
            downloadUrl: conversationExportTable.s3Url,
            urlExpiresAt: conversationExportTable.s3UrlExpiresAt,
        })
        .from(conversationExportTable)
        .innerJoin(
            conversationTable,
            eq(conversationExportTable.conversationId, conversationTable.id),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationExportTable.isDeleted, false),
            ),
        )
        .orderBy(desc(conversationExportTable.createdAt))
        .limit(10);

    return exports.map((exp) => ({
        exportSlugId: exp.exportSlugId,
        status: exp.status,
        createdAt: exp.createdAt,
        downloadUrl: exp.downloadUrl ?? undefined,
        urlExpiresAt: exp.urlExpiresAt ?? undefined,
    }));
}

interface CleanupExpiredExportsParams {
    db: PostgresDatabase;
}

/**
 * Cleanup expired exports (cron job).
 */
export async function cleanupExpiredExports({
    db,
}: CleanupExpiredExportsParams): Promise<void> {
    const now = new Date();

    // Find expired exports
    const expiredExports = await db
        .select({
            id: conversationExportTable.id,
            s3Key: conversationExportTable.s3Key,
        })
        .from(conversationExportTable)
        .where(
            and(
                lt(conversationExportTable.expiresAt, now),
                eq(conversationExportTable.isDeleted, false),
            ),
        );

    log.info(
        `Found ${expiredExports.length.toString()} expired exports to clean up`,
    );

    for (const exportRecord of expiredExports) {
        try {
            // TODO: Delete from S3
            // if (exportRecord.s3Key && config.AWS_S3_BUCKET_NAME) {
            //     await deleteFromS3({
            //         s3Key: exportRecord.s3Key,
            //         bucketName: config.AWS_S3_BUCKET_NAME,
            //     });
            // }

            // Mark as deleted in database
            await db
                .update(conversationExportTable)
                .set({
                    isDeleted: true,
                    deletedAt: now,
                    updatedAt: now,
                })
                .where(eq(conversationExportTable.id, exportRecord.id));

            log.info(`Cleaned up expired export ${exportRecord.id.toString()}`);
        } catch (error: unknown) {
            log.error(
                `Error cleaning up export ${exportRecord.id.toString()}:`,
                error,
            );
        }
    }
}
