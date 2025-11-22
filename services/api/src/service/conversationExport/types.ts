import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";

/**
 * Parameters for processing a conversation export in the background.
 * Called internally by exportBuffer only.
 */
export interface ProcessConversationExportParams {
    db: PostgresDatabase;
    conversationId: number;
    conversationSlugId: string;
    userId: string;
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
