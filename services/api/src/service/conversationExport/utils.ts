import { format as formatDate } from "date-fns";
import { TZDate } from "@date-fns/tz";
import slugify from "@sindresorhus/slugify";

// S3 path for conversation exports (hardcoded as internal implementation detail)
const S3_EXPORTS_PATH = "exports/conversations/";

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
    return `${S3_EXPORTS_PATH}${conversationSlugId}/${exportSlugId}/${fileType}.csv`;
}

/**
 * Generate file name for an export file (stored in database and S3 key)
 */
export function generateFileName(fileType: string): string {
    return `${fileType}.csv`;
}

/**
 * Generate download filename with conversation title, slug ID and ISO 8601 timestamp for Content-Disposition header.
 * Format: {title-slug}-{slugId}-{fileType}-{iso-timestamp}.csv
 * Example: climate-discussion-XFqZMoE-comments-2025-11-28T21-59-19Z.csv
 */
export function generateDownloadFileName({
    conversationTitle,
    conversationSlugId,
    fileType,
    createdAt,
}: {
    conversationTitle: string;
    conversationSlugId: string;
    fileType: string;
    createdAt: Date;
}): string {
    const utcDate = new TZDate(createdAt, "UTC");
    // ISO 8601 format with filename-safe characters (replace colons with hyphens)
    const isoTimestamp = formatDate(utcDate, "yyyy-MM-dd'T'HH-mm-ss'Z'");

    // Slugify title and limit length
    let titleSlug = slugify(conversationTitle).slice(0, 50);

    // Handle edge case: empty title after slugification
    if (!titleSlug) {
        titleSlug = "untitled";
    }

    return `${titleSlug}-${conversationSlugId}-${fileType}-${isoTimestamp}.csv`;
}
