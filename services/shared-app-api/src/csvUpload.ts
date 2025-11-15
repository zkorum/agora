// File size limit: 50MB
export const MAX_CSV_FILE_SIZE = 50 * 1024 * 1024;

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

/**
 * Array of required CSV field names for validation
 */
export const REQUIRED_CSV_FIELDS = [
    CSV_UPLOAD_FIELD_NAMES.SUMMARY_FILE,
    CSV_UPLOAD_FIELD_NAMES.COMMENTS_FILE,
    CSV_UPLOAD_FIELD_NAMES.VOTES_FILE,
] as const;

/**
 * Validate that uploaded form fields contain all required CSV files
 * @param fieldNames Array of form field names from uploaded files
 * @returns Object with isValid boolean, missing fields, and unexpected fields
 */
export function validateCsvFieldNames(fieldNames: string[]): {
    isValid: boolean;
    missingFields: string[];
    unexpectedFields: string[];
} {
    const requiredSet = new Set<string>(REQUIRED_CSV_FIELDS);
    const uploadedSet = new Set<string>(fieldNames);

    const missingFields = Array.from(REQUIRED_CSV_FIELDS).filter(
        (name) => !uploadedSet.has(name),
    );
    const unexpectedFields = fieldNames.filter(
        (name) => !requiredSet.has(name),
    );

    return {
        isValid: missingFields.length === 0 && unexpectedFields.length === 0,
        missingFields,
        unexpectedFields,
    };
}
