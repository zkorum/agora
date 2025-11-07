import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { and, desc, eq, lt } from "drizzle-orm";
import { config, log } from "@/app.js";
import { httpErrors } from "@fastify/sensible";
import {
    conversationExportTable,
    conversationTable,
    conversationContentTable,
    opinionTable,
    opinionContentTable,
    userTable,
} from "@/schema.js";
import { format } from "fast-csv";
import { uploadToS3, generatePresignedUrl } from "./s3.js";
import { nanoid } from "nanoid";

interface RequestConversationExportParams {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
}

interface RequestConversationExportReturn {
    exportId: number;
    status: "processing";
    estimatedCompletionTime: Date;
}

/**
 * Request a new conversation export.
 */
export async function requestConversationExport({
    db,
    conversationSlugId,
}: RequestConversationExportParams): Promise<RequestConversationExportReturn> {
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

    const [exportRecord] = await db
        .insert(conversationExportTable)
        .values({
            conversationId: conversationId,
            status: "processing",
            expiresAt: expiresAt,
        })
        .returning({
            id: conversationExportTable.id,
        });

    // Estimate completion time (2 minutes for now, can be adjusted based on conversation size)
    const estimatedCompletionTime = new Date(now.getTime() + 2 * 60 * 1000);

    // Start background processing (don't await)
    processConversationExport({
        db,
        exportId: exportRecord.id,
        conversationId,
        conversationSlugId,
    }).catch((error: unknown) => {
        log.error("Error processing conversation export:", error);
    });

    return {
        exportId: exportRecord.id,
        status: "processing",
        estimatedCompletionTime,
    };
}

interface ProcessConversationExportParams {
    db: PostgresDatabase;
    exportId: number;
    conversationId: number;
    conversationSlugId: string;
}

/**
 * Background job to generate CSV and upload to S3.
 */
async function processConversationExport({
    db,
    exportId,
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
            .where(eq(conversationExportTable.id, exportId));

        log.info(
            `Conversation export ${exportId.toString()} completed successfully`,
        );
    } catch (error: unknown) {
        log.error(`Error processing export ${exportId.toString()}:`, error);

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
            .where(eq(conversationExportTable.id, exportId));
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
 * Generate CSV file for conversation.
 */
async function generateConversationCsv({
    db,
    conversationId,
    conversationSlugId,
}: GenerateConversationCsvParams): Promise<GenerateConversationCsvReturn> {
    // Fetch conversation details with content
    const conversationData = await db
        .select({
            title: conversationContentTable.title,
            createdAt: conversationTable.createdAt,
        })
        .from(conversationTable)
        .leftJoin(
            conversationContentTable,
            eq(conversationTable.currentContentId, conversationContentTable.id),
        )
        .where(eq(conversationTable.id, conversationId))
        .limit(1);

    const conversation = conversationData[0];

    // Fetch all opinions for this conversation
    const opinions = await db
        .select({
            opinionSlugId: opinionTable.slugId,
            authorUsername: userTable.username,
            content: opinionContentTable.content,
            createdAt: opinionTable.createdAt,
            numAgrees: opinionTable.numAgrees,
            numDisagrees: opinionTable.numDisagrees,
            numPasses: opinionTable.numPasses,
            isSeed: opinionTable.isSeed,
        })
        .from(opinionTable)
        .innerJoin(userTable, eq(opinionTable.authorId, userTable.id))
        .innerJoin(
            opinionContentTable,
            eq(opinionTable.currentContentId, opinionContentTable.id),
        )
        .where(eq(opinionTable.conversationId, conversationId))
        .orderBy(opinionTable.createdAt);

    // Generate CSV
    const rows = opinions.map((opinion) => ({
        opinion_id: opinion.opinionSlugId,
        conversation_id: conversationSlugId,
        author_username: opinion.authorUsername,
        content: opinion.content,
        created_at: opinion.createdAt.toISOString(),
        num_agrees: opinion.numAgrees,
        num_disagrees: opinion.numDisagrees,
        num_passes: opinion.numPasses,
        is_seed: opinion.isSeed,
    }));

    const csvStream = format({ headers: true });
    const chunks: Buffer[] = [];

    // Add metadata as comments at the top
    const metadata = [
        `# Conversation Export`,
        `# Title: ${conversation.title ?? ""}`,
        `# Created: ${conversation.createdAt.toISOString()}`,
        `# Export Date: ${new Date().toISOString()}`,
        `# Total Opinions: ${opinions.length.toString()}`,
        ``,
    ].join("\n");

    chunks.push(Buffer.from(metadata + "\n"));

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
    exportId: number;
    userId: string;
}

interface GetConversationExportStatusReturn {
    exportId: number;
    status: "processing" | "completed" | "failed";
    conversationSlugId: string;
    downloadUrl?: string;
    urlExpiresAt?: Date;
    fileSize?: number;
    opinionCount?: number;
    errorMessage?: string;
    createdAt: Date;
}

/**
 * Get export status and download URL.
 */
export async function getConversationExportStatus({
    db,
    exportId,
}: GetConversationExportStatusParams): Promise<GetConversationExportStatusReturn> {
    const exportRecordList = await db
        .select({
            id: conversationExportTable.id,
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
                eq(conversationExportTable.id, exportId),
                eq(conversationExportTable.isDeleted, false),
            ),
        )
        .limit(1);

    if (exportRecordList.length !== 1) {
        throw httpErrors.notFound("Export not found");
    }

    const exportRecord = exportRecordList[0];

    return {
        exportId: exportRecord.id,
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

interface ConversationExportHistoryItem {
    exportId: number;
    status: "processing" | "completed" | "failed";
    createdAt: Date;
    downloadUrl?: string;
    urlExpiresAt?: Date;
}

/**
 * Get export history for a conversation.
 */
export async function getConversationExportHistory({
    db,
    conversationSlugId,
}: GetConversationExportHistoryParams): Promise<
    ConversationExportHistoryItem[]
> {
    const exports = await db
        .select({
            exportId: conversationExportTable.id,
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
        exportId: exp.exportId,
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
