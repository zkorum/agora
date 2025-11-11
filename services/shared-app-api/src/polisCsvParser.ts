import { z } from "zod";
import { parse } from "fast-csv";
import { Readable } from "stream";

// File size limit: 50MB
export const MAX_CSV_FILE_SIZE = 50 * 1024 * 1024;

// CSV file name constants with their corresponding schemas
export const POLIS_CSV_FILES = {
    SUMMARY: {
        fileName: "summary.csv",
        schema: "PolisSummaryCsvSchema",
    },
    COMMENTS: {
        fileName: "comments.csv",
        schema: "PolisCommentCsvSchema",
    },
    VOTES: {
        fileName: "votes.csv",
        schema: "PolisVoteCsvSchema",
    },
} as const;

// Array of required file names for validation
export const REQUIRED_CSV_FILE_NAMES = [
    POLIS_CSV_FILES.SUMMARY.fileName,
    POLIS_CSV_FILES.COMMENTS.fileName,
    POLIS_CSV_FILES.VOTES.fileName,
] as const;

/**
 * Validate that uploaded files match the required Polis CSV file names
 * @param fileNames Array of uploaded file names
 * @returns Object with isValid boolean, missing files, and unexpected files
 */
export function validateCsvFileNames(fileNames: string[]): {
    isValid: boolean;
    missingFiles: string[];
    unexpectedFiles: string[];
} {
    const requiredSet = new Set<string>(REQUIRED_CSV_FILE_NAMES);
    const uploadedSet = new Set<string>(fileNames);

    const missingFiles = Array.from(REQUIRED_CSV_FILE_NAMES).filter(
        (name) => !uploadedSet.has(name),
    );
    const unexpectedFiles = fileNames.filter((name) => !requiredSet.has(name));

    return {
        isValid: missingFiles.length === 0 && unexpectedFiles.length === 0,
        missingFiles,
        unexpectedFiles,
    };
}

// Define Zod schemas for CSV validation
export const PolisSummaryCsvSchema = z.object({
    topic: z.string().min(1).max(140),
    url: z.string().url().optional().or(z.literal("")),
    views: z.coerce.number().int().min(0),
    voters: z.coerce.number().int().min(0),
    "voters-in-conv": z.coerce.number().int().min(0),
    commenters: z.coerce.number().int().min(0),
    comments: z.coerce.number().int().min(0),
    groups: z.coerce.number().int().min(0),
    "conversation-description": z.string().optional().or(z.literal("")),
});

export const PolisCommentCsvSchema = z.object({
    timestamp: z.coerce.number().int(),
    datetime: z.string(),
    "comment-id": z.coerce.number().int(),
    "author-id": z.coerce.number().int(),
    agrees: z.coerce.number().int().min(0),
    disagrees: z.coerce.number().int().min(0),
    moderated: z.coerce.number().int().min(0).max(1),
    "comment-body": z.string(),
});

export const PolisVoteCsvSchema = z.object({
    timestamp: z.coerce.number().int(),
    datetime: z.string(),
    "comment-id": z.coerce.number().int(),
    "voter-id": z.coerce.number().int(),
    vote: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});

export type PolisSummaryCsv = z.infer<typeof PolisSummaryCsvSchema>;
export type PolisCommentCsv = z.infer<typeof PolisCommentCsvSchema>;
export type PolisVoteCsv = z.infer<typeof PolisVoteCsvSchema>;

/**
 * Parse and validate summary CSV content
 * Summary CSV is a key-value format with 2 columns (no headers)
 */
export function parseSummaryCsv(csvContent: string): Promise<PolisSummaryCsv> {
    return new Promise((resolve, reject) => {
        const data: Record<string, string> = {};
        const stream = Readable.from([csvContent]);

        stream
            .pipe(
                parse({
                    headers: false, // Summary CSV has no headers
                    trim: true,
                }),
            )
            .on("data", (row: string[]) => {
                if (row.length >= 2) {
                    const key = row[0];
                    const value = row[1];
                    data[key] = value;
                }
            })
            .on("end", () => {
                try {
                    const validated = PolisSummaryCsvSchema.parse(data);
                    resolve(validated);
                } catch (error) {
                    reject(
                        error instanceof Error
                            ? error
                            : new Error(String(error)),
                    );
                }
            })
            .on("error", (error: Error) => {
                reject(
                    new Error(`Failed to parse summary CSV: ${error.message}`),
                );
            });
    });
}

/**
 * Parse and validate comments CSV content
 */
export function parseCommentsCsv(
    csvContent: string,
): Promise<PolisCommentCsv[]> {
    return new Promise((resolve, reject) => {
        const comments: PolisCommentCsv[] = [];
        const stream = Readable.from([csvContent]);

        stream
            .pipe(
                parse({
                    headers: true, // First row contains headers
                    trim: true,
                    skipLines: 0,
                }),
            )
            .on("data", (row: Record<string, string>) => {
                try {
                    const validated = PolisCommentCsvSchema.parse(row);
                    comments.push(validated);
                } catch (error) {
                    reject(
                        new Error(
                            `Invalid comment row: ${
                                error instanceof Error
                                    ? error.message
                                    : String(error)
                            }`,
                        ),
                    );
                }
            })
            .on("end", () => {
                if (comments.length === 0) {
                    reject(new Error("Comments CSV contains no data rows"));
                } else {
                    resolve(comments);
                }
            })
            .on("error", (error: Error) => {
                reject(
                    new Error(`Failed to parse comments CSV: ${error.message}`),
                );
            });
    });
}

/**
 * Parse and validate votes CSV content
 */
export function parseVotesCsv(csvContent: string): Promise<PolisVoteCsv[]> {
    return new Promise((resolve, reject) => {
        const votes: PolisVoteCsv[] = [];
        const stream = Readable.from([csvContent]);

        stream
            .pipe(
                parse({
                    headers: true, // First row contains headers
                    trim: true,
                    skipLines: 0,
                }),
            )
            .on("data", (row: Record<string, string>) => {
                try {
                    const validated = PolisVoteCsvSchema.parse(row);
                    votes.push(validated);
                } catch (error) {
                    reject(
                        new Error(
                            `Invalid vote row: ${
                                error instanceof Error
                                    ? error.message
                                    : String(error)
                            }`,
                        ),
                    );
                }
            })
            .on("end", () => {
                if (votes.length === 0) {
                    reject(new Error("Votes CSV contains no data rows"));
                } else {
                    resolve(votes);
                }
            })
            .on("error", (error: Error) => {
                reject(
                    new Error(`Failed to parse votes CSV: ${error.message}`),
                );
            });
    });
}
