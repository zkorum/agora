import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";

/**
 * Parameters for processing a conversation export in the background
 */
export interface ProcessConversationExportParams {
    db: PostgresDatabase;
    exportSlugId: string;
    conversationId: number;
    conversationSlugId: string;
}

/**
 * Metadata about a generated export file
 */
export interface ExportFileMetadata {
    fileType: string;
    fileName: string;
    fileSize: number;
    recordCount: number;
    s3Key: string;
    s3Url: string;
    s3UrlExpiresAt: Date;
}
