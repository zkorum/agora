import { format as formatDate } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { config } from "@/app.js";

/**
 * Format date as human-readable string for Polis export.
 * Formats in UTC timezone following Polis specification.
 * Example: "Sat Nov 17 05:09:36 UTC 2018"
 */
export function formatDatetime(date: Date): string {
    const utcDate = new TZDate(date, "UTC");
    return formatDate(utcDate, "EEE MMM dd HH:mm:ss zzz yyyy");
}

/**
 * Generate S3 key for an export file
 */
export function generateS3Key({
    conversationSlugId,
    exportSlugId,
    fileType,
}: {
    conversationSlugId: string;
    exportSlugId: string;
    fileType: string;
}): string {
    return `${config.AWS_S3_CONVERSATION_EXPORTS_PATH}${conversationSlugId}/${exportSlugId}/${fileType}.csv`;
}

/**
 * Generate file name for an export file (stored in database and S3 key)
 */
export function generateFileName(fileType: string): string {
    return `${fileType}.csv`;
}

/**
 * Generate download filename with timestamp for Content-Disposition header
 */
export function generateDownloadFileName({
    fileType,
    createdAt,
}: {
    fileType: string;
    createdAt: Date;
}): string {
    const utcDate = new TZDate(createdAt, "UTC");
    const timestamp = formatDate(utcDate, "yyyyMMdd-HHmmss");
    return `${fileType}-${timestamp}.csv`;
}
