/** **** WARNING: GENERATED FROM SHARED-APP-API DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
// File size limit: 50MB
export const MAX_CSV_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_CSV_FILE_SIZE_MB = MAX_CSV_FILE_SIZE / (1024 * 1024); // 50

/**
 * Type-safe field names for CSV file uploads
 * These constants ensure consistency between frontend and backend
 */
export const CSV_UPLOAD_FIELD_NAMES = {
    SUMMARY_FILE: "summaryFile",
    COMMENTS_FILE: "commentsFile",
    VOTES_FILE: "votesFile",
} as const;

export type CsvUploadFieldName =
    (typeof CSV_UPLOAD_FIELD_NAMES)[keyof typeof CSV_UPLOAD_FIELD_NAMES];
