import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { and, desc, eq, lt } from "drizzle-orm";
import { config, log } from "@/app.js";
import { httpErrors } from "@fastify/sensible";
import {
    conversationExportTable,
    conversationExportFileTable,
    conversationTable,
} from "@/shared-backend/schema.js";
import { uploadToS3, generatePresignedUrl, deleteFromS3 } from "../s3.js";
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
import { createExportNotification } from "./notifications.js";
import type { ExportBuffer } from "../exportBuffer.js";

// Maximum number of exports to keep per conversation
const MAX_EXPORTS_PER_CONVERSATION = 7;

interface RequestConversationExportParams {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
    exportBuffer: ExportBuffer;
}

/**
 * Request a new conversation export.
 * This function delegates to the export buffer for cooldown enforcement and batching.
 */
export async function requestConversationExport({
    db,
    conversationSlugId,
    userId,
    exportBuffer,
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

    // Delegate to export buffer - handles cooldown, batching, and processing
    const { exportSlugId } = await exportBuffer.add({
        exportRequest: {
            userId,
            conversationId,
            conversationSlugId,
            timestamp: new Date(),
        },
    });

    // Return only the exportSlugId to match the API response schema
    return { exportSlugId };
}

/**
 * Background job to generate all CSV files and upload to S3.
 * Exported for use by exportBuffer.
 */
export async function processConversationExport({
    db,
    conversationId,
    conversationSlugId,
    userId,
}: ProcessConversationExportParams): Promise<void> {
    try {
        // Find the processing export record for this user+conversation
        const exportRecordList = await db
            .select({
                id: conversationExportTable.id,
                slugId: conversationExportTable.slugId,
                createdAt: conversationExportTable.createdAt,
            })
            .from(conversationExportTable)
            .where(
                and(
                    eq(conversationExportTable.conversationId, conversationId),
                    eq(conversationExportTable.userId, userId),
                    eq(conversationExportTable.status, "processing"),
                ),
            )
            .orderBy(desc(conversationExportTable.createdAt))
            .limit(1);

        if (exportRecordList.length === 0) {
            throw new Error(
                `No processing export found for conversation ${String(conversationId)} and user ${userId}`,
            );
        }

        const exportId = exportRecordList[0].id;
        const exportSlugId = exportRecordList[0].slugId;
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
        const uploadedS3Keys: string[] = []; // Track uploaded S3 keys for rollback

        try {
            // Generate and upload all files with rollback on failure
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

                // Track uploaded S3 key for potential rollback
                uploadedS3Keys.push(s3Key);

                // Store file metadata for database insertion (after all uploads succeed)
                fileRecords.push({
                    exportId: exportId,
                    fileType: fileType,
                    fileName: fileName,
                    fileSize: csvBuffer.length,
                    recordCount: recordCount,
                    s3Key: s3Key,
                });

                totalSize += csvBuffer.length;

                log.info(
                    `Generated ${fileType}.csv for export ${exportSlugId}: ${recordCount.toString()} records, ${csvBuffer.length.toString()} bytes`,
                );
            }

            // All S3 uploads succeeded - now insert database records
            for (const fileRecord of fileRecords) {
                await db
                    .insert(conversationExportFileTable)
                    .values(fileRecord)
                    .returning();
            }
        } catch (uploadError: unknown) {
            // Rollback: delete all successfully uploaded S3 files
            log.error(
                `Error during export generation for ${exportSlugId}, rolling back ${uploadedS3Keys.length.toString()} uploaded files`,
                uploadError,
            );

            for (const s3Key of uploadedS3Keys) {
                try {
                    await deleteFromS3({
                        s3Key,
                        bucketName: config.AWS_S3_BUCKET_NAME,
                    });
                    log.info(`Rolled back S3 file: ${s3Key}`);
                } catch (deleteError: unknown) {
                    // Log but don't fail the rollback if individual deletes fail
                    log.error(
                        `Failed to rollback S3 file ${s3Key}:`,
                        deleteError,
                    );
                }
            }

            // Re-throw the original error to trigger the outer catch block
            throw uploadError;
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

        // Create notification for successful export
        await createExportNotification({
            db,
            userId,
            exportId,
            conversationId,
            type: "export_completed",
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            log.error(`Error message: ${error.message}`);
            if (error.stack) {
                log.error(`Stack trace: ${error.stack}`);
            }
        }

        // Update export record with error (find by conversationId and userId)
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
            .where(
                and(
                    eq(conversationExportTable.conversationId, conversationId),
                    eq(conversationExportTable.userId, userId),
                    eq(conversationExportTable.status, "processing"),
                ),
            );

        log.error(
            `Failed to process export for conversation ${String(conversationId)}, user ${userId}:`,
            error,
        );

        // Find the failed export ID to create notification
        try {
            const failedExportList = await db
                .select({ id: conversationExportTable.id })
                .from(conversationExportTable)
                .where(
                    and(
                        eq(
                            conversationExportTable.conversationId,
                            conversationId,
                        ),
                        eq(conversationExportTable.userId, userId),
                        eq(conversationExportTable.status, "failed"),
                    ),
                )
                .orderBy(desc(conversationExportTable.createdAt))
                .limit(1);

            if (failedExportList.length > 0) {
                const failedExportId = failedExportList[0].id;

                // Create notification for failed export
                await createExportNotification({
                    db,
                    userId,
                    exportId: failedExportId,
                    conversationId,
                    type: "export_failed",
                    message: error instanceof Error ? error.message : undefined,
                });
            }
        } catch (notificationError: unknown) {
            // Log but don't fail if notification creation fails
            log.error(
                "Failed to create failure notification:",
                notificationError,
            );
        }
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
