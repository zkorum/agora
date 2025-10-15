import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { and, count, desc, eq, isNull, lt, ne, or } from "drizzle-orm";
import { config, log } from "@/app.js";
import { httpErrors } from "@fastify/sensible";
import {
    conversationExportTable,
    conversationExportFileTable,
    conversationTable,
    opinionTable,
    opinionModerationTable,
} from "@/shared-backend/schema.js";
import { uploadToS3, generatePresignedUrl, deleteFromS3 } from "../s3.js";
import { nanoid } from "nanoid";
import type {
    RequestConversationExportResponse,
    GetConversationExportStatusResponse,
    GetConversationExportHistoryResponse,
} from "@/shared/types/dto.js";
import type { ExportFileInfo } from "@/shared/types/zod.js";
import { ExportGeneratorFactory } from "./generators/factory.js";
import {
    generateS3Key,
    generateFileName,
    generateDownloadFileName,
} from "./utils.js";
import type { ProcessConversationExportParams } from "./types.js";

// Maximum number of exports to keep per conversation
const MAX_EXPORTS_PER_CONVERSATION = 7;

interface RequestConversationExportParams {
    db: PostgresDatabase;
    conversationSlugId: string;
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

    // Check if conversation has any opinions (excluding those moderated as "moved")
    const [{ count: opinionCount }] = await db
        .select({ count: count() })
        .from(opinionTable)
        .leftJoin(
            opinionModerationTable,
            eq(opinionTable.id, opinionModerationTable.opinionId),
        )
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                or(
                    isNull(opinionModerationTable.moderationAction),
                    ne(opinionModerationTable.moderationAction, "move"),
                ),
            ),
        );

    if (opinionCount === 0) {
        throw httpErrors.badRequest(
            "Cannot export conversation with no opinions",
        );
    }

    // Cleanup old exports
    try {
        const deletedCount = await cleanupOldExports({
            db,
            conversationId,
            maxExportsToKeep: MAX_EXPORTS_PER_CONVERSATION - 1,
        });
        if (deletedCount > 0) {
            log.info(
                `Cleaned up ${deletedCount.toString()} old exports for conversation ${conversationId.toString()} before creating new export`,
            );
        }
    } catch (error: unknown) {
        // Log error but don't block export creation
        log.error(
            `Error cleaning up old exports for conversation ${conversationId.toString()}:`,
            error,
        );
    }

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

/**
 * Background job to generate all CSV files and upload to S3.
 */
async function processConversationExport({
    db,
    exportSlugId,
    conversationId,
    conversationSlugId,
}: ProcessConversationExportParams): Promise<void> {
    try {
        // Get export ID and createdAt for file records
        const exportRecordList = await db
            .select({
                id: conversationExportTable.id,
                createdAt: conversationExportTable.createdAt,
            })
            .from(conversationExportTable)
            .where(eq(conversationExportTable.slugId, exportSlugId))
            .limit(1);

        if (exportRecordList.length !== 1) {
            throw new Error(`Export record not found: ${exportSlugId}`);
        }

        const exportId = exportRecordList[0].id;
        const exportCreatedAt = exportRecordList[0].createdAt;

        // Initialize generator factory
        const factory = new ExportGeneratorFactory();
        const generators = factory.getAllGenerators();

        // Validate S3 configuration
        if (!config.AWS_S3_BUCKET_NAME || !config.AWS_S3_REGION) {
            throw new Error("S3 configuration is missing");
        }

        let totalSize = 0;
        const fileRecords = [];

        // Generate each file
        for (const generator of generators) {
            const fileType = generator.fileType;

            // Generate CSV
            const { csvBuffer, recordCount } = await generator.generate({
                db,
                conversationId,
                conversationSlugId,
            });

            // Generate filename for database/S3 storage (without timestamp)
            const fileName = generateFileName(fileType);

            // Generate download filename with conversation slug ID and timestamp for Content-Disposition
            const downloadFileName = generateDownloadFileName({
                conversationSlugId,
                fileType,
                createdAt: exportCreatedAt,
            });

            // Generate S3 key
            const s3Key = generateS3Key({
                conversationSlugId,
                exportSlugId,
                fileType,
            });

            // Upload to S3 with download filename for Content-Disposition
            await uploadToS3({
                s3Key,
                buffer: csvBuffer,
                bucketName: config.AWS_S3_BUCKET_NAME,
                fileName: downloadFileName,
            });

            // Insert file record (store simple filename without timestamp)
            // Note: Presigned URLs are generated on-demand in getConversationExportStatus
            const [fileRecord] = await db
                .insert(conversationExportFileTable)
                .values({
                    exportId: exportId,
                    fileType: fileType,
                    fileName: fileName,
                    fileSize: csvBuffer.length,
                    recordCount: recordCount,
                    s3Key: s3Key,
                })
                .returning();

            fileRecords.push(fileRecord);
            totalSize += csvBuffer.length;

            log.info(
                `Generated ${fileType}.csv for export ${exportSlugId}: ${recordCount.toString()} records, ${csvBuffer.length.toString()} bytes`,
            );
        }

        // Update export record with totals
        await db
            .update(conversationExportTable)
            .set({
                status: "completed",
                totalFileSize: totalSize,
                totalFileCount: fileRecords.length,
                updatedAt: new Date(),
            })
            .where(eq(conversationExportTable.slugId, exportSlugId));

        log.info(`Conversation export ${exportSlugId} completed successfully`);
    } catch (error: unknown) {
        if (error instanceof Error) {
            log.error(`Error message: ${error.message}`);
            if (error.stack) {
                log.error(`Stack trace: ${error.stack}`);
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

interface GetConversationExportStatusParams {
    db: PostgresDatabase;
    exportSlugId: string;
}

/**
 * Get export status and download URLs for all files.
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
            totalFileSize: conversationExportTable.totalFileSize,
            totalFileCount: conversationExportTable.totalFileCount,
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

    // Fetch all file records for this export
    const fileRecords = await db
        .select({
            fileType: conversationExportFileTable.fileType,
            fileName: conversationExportFileTable.fileName,
            fileSize: conversationExportFileTable.fileSize,
            recordCount: conversationExportFileTable.recordCount,
            s3Key: conversationExportFileTable.s3Key,
        })
        .from(conversationExportFileTable)
        .innerJoin(
            conversationExportTable,
            eq(
                conversationExportFileTable.exportId,
                conversationExportTable.id,
            ),
        )
        .where(eq(conversationExportTable.slugId, exportSlugId));

    // Generate presigned URLs on-demand for all files
    let filesWithUrls: ExportFileInfo[] | undefined = undefined;

    if (fileRecords.length > 0) {
        if (!config.AWS_S3_BUCKET_NAME) {
            throw new Error("S3 configuration is missing");
        }

        const bucketName = config.AWS_S3_BUCKET_NAME;

        filesWithUrls = await Promise.all(
            fileRecords.map(async (file) => {
                // Generate fresh presigned URL with configurable expiration
                const { url, expiresAt } = await generatePresignedUrl({
                    s3Key: file.s3Key,
                    bucketName,
                    expiresIn: config.S3_PRESIGNED_URL_EXPIRY_SECONDS,
                });

                return {
                    fileType: file.fileType,
                    fileName: file.fileName,
                    fileSize: file.fileSize,
                    recordCount: file.recordCount,
                    downloadUrl: url,
                    urlExpiresAt: expiresAt,
                };
            }),
        );
    }

    return {
        exportSlugId: exportRecord.slugId,
        status: exportRecord.status,
        conversationSlugId: exportRecord.conversationSlugId,
        totalFileSize: exportRecord.totalFileSize ?? undefined,
        totalFileCount: exportRecord.totalFileCount ?? undefined,
        files: filesWithUrls,
        errorMessage: exportRecord.errorMessage ?? undefined,
        createdAt: exportRecord.createdAt,
    };
}

interface GetConversationExportHistoryParams {
    db: PostgresDatabase;
    conversationSlugId: string;
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
            totalFileCount: conversationExportTable.totalFileCount,
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
        .limit(MAX_EXPORTS_PER_CONVERSATION);

    return exports.map((exp) => ({
        exportSlugId: exp.exportSlugId,
        status: exp.status,
        createdAt: exp.createdAt,
        totalFileCount: exp.totalFileCount ?? undefined,
    }));
}

interface DeleteConversationExportParams {
    db: PostgresDatabase;
    exportSlugId: string;
}

/**
 * Delete a conversation export manually (moderator action).
 * Marks the export as deleted and cleans up S3 files.
 */
export async function deleteConversationExport({
    db,
    exportSlugId,
}: DeleteConversationExportParams): Promise<void> {
    // Find the export
    const exportRecordList = await db
        .select({
            id: conversationExportTable.id,
            isDeleted: conversationExportTable.isDeleted,
            status: conversationExportTable.status,
        })
        .from(conversationExportTable)
        .where(eq(conversationExportTable.slugId, exportSlugId))
        .limit(1);

    if (exportRecordList.length === 0) {
        throw httpErrors.notFound("Export not found");
    }

    const exportRecord = exportRecordList[0];

    if (exportRecord.isDeleted) {
        throw httpErrors.badRequest("Export already deleted");
    }

    // Only allow deletion of completed or failed exports
    if (
        exportRecord.status !== "completed" &&
        exportRecord.status !== "failed"
    ) {
        throw httpErrors.badRequest(
            "Cannot delete export while it is still processing",
        );
    }

    try {
        // Fetch all S3 keys for this export
        const fileRecords = await db
            .select({
                s3Key: conversationExportFileTable.s3Key,
            })
            .from(conversationExportFileTable)
            .where(eq(conversationExportFileTable.exportId, exportRecord.id));

        // Delete from S3
        for (const file of fileRecords) {
            if (file.s3Key && config.AWS_S3_BUCKET_NAME) {
                await deleteFromS3({
                    s3Key: file.s3Key,
                    bucketName: config.AWS_S3_BUCKET_NAME,
                });
            }
        }

        log.info(
            `Deleted ${fileRecords.length.toString()} files from S3 for export ${exportSlugId}`,
        );

        // Mark as deleted in database
        const now = new Date();
        await db
            .update(conversationExportTable)
            .set({
                isDeleted: true,
                deletedAt: now,
                updatedAt: now,
            })
            .where(eq(conversationExportTable.id, exportRecord.id));

        log.info(`Manually deleted export ${exportSlugId}`);
    } catch (error: unknown) {
        log.error(`Error deleting export ${exportSlugId}:`, error);
        throw error;
    }
}

interface CleanupExpiredExportsParams {
    db: PostgresDatabase;
}

/**
 * Cleanup expired exports (cron job).
 * Marks exports as deleted and cleans up S3 files.
 */
export async function cleanupExpiredExports({
    db,
}: CleanupExpiredExportsParams): Promise<void> {
    const now = new Date();

    // Find expired exports
    const expiredExports = await db
        .select({
            id: conversationExportTable.id,
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
            // Fetch all S3 keys for this export
            const fileRecords = await db
                .select({
                    s3Key: conversationExportFileTable.s3Key,
                })
                .from(conversationExportFileTable)
                .where(
                    eq(conversationExportFileTable.exportId, exportRecord.id),
                );

            // Delete from S3
            for (const file of fileRecords) {
                if (file.s3Key && config.AWS_S3_BUCKET_NAME) {
                    await deleteFromS3({
                        s3Key: file.s3Key,
                        bucketName: config.AWS_S3_BUCKET_NAME,
                    });
                }
            }

            log.info(
                `Deleted ${fileRecords.length.toString()} files from S3 for export ${exportRecord.id.toString()}`,
            );

            // Mark as deleted in database (cascade will handle file records if needed)
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

interface DeleteAllConversationExportsParams {
    db: PostgresDatabase;
    conversationId: number;
}

/**
 * Delete all exports for a conversation (called when conversation is deleted).
 * Marks exports as deleted and cleans up S3 files.
 * This function does not throw errors to allow graceful degradation.
 */
export async function deleteAllConversationExports({
    db,
    conversationId,
}: DeleteAllConversationExportsParams): Promise<number> {
    const now = new Date();

    try {
        // Find all non-deleted exports for this conversation
        const existingExports = await db
            .select({
                id: conversationExportTable.id,
            })
            .from(conversationExportTable)
            .where(
                and(
                    eq(conversationExportTable.conversationId, conversationId),
                    eq(conversationExportTable.isDeleted, false),
                ),
            );

        if (existingExports.length === 0) {
            log.info(
                `No exports found for conversation ${conversationId.toString()}`,
            );
            return 0;
        }

        log.info(
            `Deleting ${existingExports.length.toString()} exports for conversation ${conversationId.toString()}`,
        );

        let deletedCount = 0;

        for (const exportRecord of existingExports) {
            try {
                // Fetch all S3 keys for this export
                const fileRecords = await db
                    .select({
                        s3Key: conversationExportFileTable.s3Key,
                    })
                    .from(conversationExportFileTable)
                    .where(
                        eq(
                            conversationExportFileTable.exportId,
                            exportRecord.id,
                        ),
                    );

                // Delete from S3
                for (const file of fileRecords) {
                    if (file.s3Key && config.AWS_S3_BUCKET_NAME) {
                        try {
                            await deleteFromS3({
                                s3Key: file.s3Key,
                                bucketName: config.AWS_S3_BUCKET_NAME,
                            });
                        } catch (s3Error: unknown) {
                            log.error(
                                `Error deleting S3 file ${file.s3Key}:`,
                                s3Error,
                            );
                            // Continue with other files even if one fails
                        }
                    }
                }

                log.info(
                    `Deleted ${fileRecords.length.toString()} files from S3 for export ${exportRecord.id.toString()}`,
                );

                // Mark as deleted in database
                await db
                    .update(conversationExportTable)
                    .set({
                        isDeleted: true,
                        deletedAt: now,
                        updatedAt: now,
                    })
                    .where(eq(conversationExportTable.id, exportRecord.id));

                deletedCount++;
                log.info(
                    `Deleted export ${exportRecord.id.toString()} for conversation ${conversationId.toString()}`,
                );
            } catch (error: unknown) {
                log.error(
                    `Error deleting export ${exportRecord.id.toString()}:`,
                    error,
                );
                // Continue with other exports even if one fails
            }
        }

        return deletedCount;
    } catch (error: unknown) {
        log.error(
            `Error in deleteAllConversationExports for conversation ${conversationId.toString()}:`,
            error,
        );
        return 0;
    }
}

interface CleanupOldExportsParams {
    db: PostgresDatabase;
    conversationId: number;
    maxExportsToKeep: number;
}

/**
 * Cleanup old exports for a conversation, keeping only the most recent ones.
 * This is called before creating a new export to enforce the limit.
 */
async function cleanupOldExports({
    db,
    conversationId,
    maxExportsToKeep,
}: CleanupOldExportsParams): Promise<number> {
    const now = new Date();

    // Find all non-deleted exports for this conversation, ordered by creation date (newest first)
    const existingExports = await db
        .select({
            id: conversationExportTable.id,
        })
        .from(conversationExportTable)
        .where(
            and(
                eq(conversationExportTable.conversationId, conversationId),
                eq(conversationExportTable.isDeleted, false),
            ),
        )
        .orderBy(desc(conversationExportTable.createdAt));

    // If we have more than the max, delete the oldest ones
    if (existingExports.length > maxExportsToKeep) {
        const exportsToDelete = existingExports.slice(maxExportsToKeep);

        log.info(
            `Cleaning up ${exportsToDelete.length.toString()} old exports for conversation ${conversationId.toString()}`,
        );

        for (const exportRecord of exportsToDelete) {
            try {
                // Fetch all S3 keys for this export
                const fileRecords = await db
                    .select({
                        s3Key: conversationExportFileTable.s3Key,
                    })
                    .from(conversationExportFileTable)
                    .where(
                        eq(
                            conversationExportFileTable.exportId,
                            exportRecord.id,
                        ),
                    );

                // Delete from S3
                for (const file of fileRecords) {
                    if (file.s3Key && config.AWS_S3_BUCKET_NAME) {
                        await deleteFromS3({
                            s3Key: file.s3Key,
                            bucketName: config.AWS_S3_BUCKET_NAME,
                        });
                    }
                }

                log.info(
                    `Deleted ${fileRecords.length.toString()} files from S3 for export ${exportRecord.id.toString()}`,
                );

                // Mark as deleted in database
                await db
                    .update(conversationExportTable)
                    .set({
                        isDeleted: true,
                        deletedAt: now,
                        updatedAt: now,
                    })
                    .where(eq(conversationExportTable.id, exportRecord.id));

                log.info(`Cleaned up old export ${exportRecord.id.toString()}`);
            } catch (error: unknown) {
                log.error(
                    `Error cleaning up old export ${exportRecord.id.toString()}:`,
                    error,
                );
            }
        }

        return exportsToDelete.length;
    }

    return 0;
}
