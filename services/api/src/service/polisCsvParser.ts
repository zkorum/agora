import { z } from "zod";
import { parse } from "fast-csv";
import { Readable } from "stream";

// Define Zod schemas for CSV validation
export const PolisSummaryCsvSchema = z
    .object({
        topic: z.string().min(1).max(140),
        url: z.string().url().optional().or(z.literal("")),
        views: z.coerce.number().int().min(0).optional(),
        voters: z.coerce.number().int().min(0),
        "voters-in-conv": z.coerce.number().int().min(0),
        commenters: z.coerce.number().int().min(0),
        comments: z.coerce.number().int().min(0),
        groups: z.coerce.number().int().min(0),
        "conversation-description": z.string().optional().or(z.literal("")),
    })
    .strict();

export const PolisCommentCsvSchema = z
    .object({
        timestamp: z.coerce.number().int(),
        datetime: z.string(),
        "comment-id": z.coerce.number().int(),
        "author-id": z.coerce.number().int(),
        agrees: z.coerce.number().int().min(0),
        disagrees: z.coerce.number().int().min(0),
        moderated: z.coerce
            .number()
            .int()
            .refine((val) => val === -1 || val === 0 || val === 1, {
                message: "moderated must be -1, 0, or 1",
            }),
        importance: z.coerce.number().int().min(0).optional(),
        "comment-body": z.string(),
    })
    .strict();

export const PolisVoteCsvSchema = z
    .object({
        timestamp: z.coerce.number().int(),
        datetime: z.string(),
        "comment-id": z.coerce.number().int(),
        "voter-id": z.coerce.number().int(),
        vote: z.coerce
            .number()
            .int()
            .refine((val) => val === -1 || val === 0 || val === 1, {
                message: "vote must be -1, 0, or 1",
            }),
        important: z.coerce.number().int().min(0).max(1).optional(),
    })
    .strict();

export type PolisSummaryCsv = z.infer<typeof PolisSummaryCsvSchema>;
export type PolisCommentCsv = z.infer<typeof PolisCommentCsvSchema>;
export type PolisVoteCsv = z.infer<typeof PolisVoteCsvSchema>;

/**
 * Helper function to extract column names from a Zod object schema
 */
function getSchemaColumns(schema: z.ZodObject<z.ZodRawShape>): string[] {
    return Object.keys(schema.shape);
}

/**
 * Parse and validate summary CSV content
 * Summary CSV is a key-value format with 2 columns (no headers)
 */
export function parseSummaryCsv(csvContent: string): Promise<PolisSummaryCsv> {
    return new Promise((resolve, reject) => {
        const data: Record<string, string> = {};
        const stream = Readable.from([csvContent]);
        const TIMEOUT_MS = 30000; // 30 second timeout
        let isComplete = false;

        // Set timeout to prevent hanging
        const timeoutId = setTimeout(() => {
            if (!isComplete) {
                isComplete = true;
                stream.destroy();
                reject(
                    new Error(
                        "Summary CSV parsing timed out after 30 seconds. File may be too large or incorrectly formatted.",
                    ),
                );
            }
        }, TIMEOUT_MS);

        const cleanup = () => {
            clearTimeout(timeoutId);
            isComplete = true;
        };

        stream
            .pipe(
                parse({
                    headers: false, // Summary CSV has no headers
                    trim: true,
                }),
            )
            .on("data", (row: string[]) => {
                if (isComplete) return;

                if (row.length >= 2) {
                    const key = row[0];
                    const value = row[1];
                    data[key] = value;
                }
            })
            .on("end", () => {
                if (isComplete) return;
                cleanup();

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
                if (isComplete) return;
                cleanup();
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
        const errors: string[] = [];
        let rowNumber = 1; // Start at 1 (header row)
        const stream = Readable.from([csvContent]);
        const MAX_ERRORS = 10; // Stop after collecting this many errors
        const TIMEOUT_MS = 30000; // 30 second timeout
        let isComplete = false;

        // Set timeout to prevent hanging
        const timeoutId = setTimeout(() => {
            if (!isComplete) {
                isComplete = true;
                stream.destroy();
                reject(
                    new Error(
                        "Comments CSV parsing timed out after 30 seconds. File may be too large or incorrectly formatted.",
                    ),
                );
            }
        }, TIMEOUT_MS);

        const cleanup = () => {
            clearTimeout(timeoutId);
            isComplete = true;
        };

        stream
            .pipe(
                parse({
                    headers: true, // First row contains headers
                    trim: true,
                    skipLines: 0,
                }),
            )
            .on("data", (row: Record<string, string>) => {
                if (isComplete) return;

                rowNumber++;
                try {
                    const validated = PolisCommentCsvSchema.parse(row);
                    comments.push(validated);
                } catch (error) {
                    errors.push(
                        `Row ${String(rowNumber)}: ${
                            error instanceof Error
                                ? error.message
                                : String(error)
                        }`,
                    );

                    // Early termination: stop if we have too many errors
                    if (errors.length >= MAX_ERRORS) {
                        cleanup();
                        stream.destroy();
                        const expectedColumns = getSchemaColumns(
                            PolisCommentCsvSchema,
                        );
                        reject(
                            new Error(
                                `Comments CSV validation failed (showing first ${String(MAX_ERRORS)} errors):\n${errors.join("\n")}\n\nThis file may be the wrong type. Expected columns: ${expectedColumns.join(", ")}`,
                            ),
                        );
                    }
                }
            })
            .on("end", () => {
                if (isComplete) return;
                cleanup();

                if (errors.length > 0) {
                    reject(
                        new Error(
                            `Comments CSV validation failed:\n${errors.join("\n")}`,
                        ),
                    );
                } else if (comments.length === 0) {
                    reject(new Error("Comments CSV contains no data rows"));
                } else {
                    resolve(comments);
                }
            })
            .on("error", (error: Error) => {
                if (isComplete) return;
                cleanup();
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
        const errors: string[] = [];
        let rowNumber = 1; // Start at 1 (header row)
        const stream = Readable.from([csvContent]);
        const MAX_ERRORS = 10; // Stop after collecting this many errors
        const TIMEOUT_MS = 30000; // 30 second timeout
        let isComplete = false;

        // Set timeout to prevent hanging
        const timeoutId = setTimeout(() => {
            if (!isComplete) {
                isComplete = true;
                stream.destroy();
                reject(
                    new Error(
                        "Votes CSV parsing timed out after 30 seconds. File may be too large or incorrectly formatted.",
                    ),
                );
            }
        }, TIMEOUT_MS);

        const cleanup = () => {
            clearTimeout(timeoutId);
            isComplete = true;
        };

        stream
            .pipe(
                parse({
                    headers: true, // First row contains headers
                    trim: true,
                    skipLines: 0,
                }),
            )
            .on("data", (row: Record<string, string>) => {
                if (isComplete) return;

                rowNumber++;
                try {
                    const validated = PolisVoteCsvSchema.parse(row);
                    votes.push(validated);
                } catch (error) {
                    errors.push(
                        `Row ${String(rowNumber)}: ${
                            error instanceof Error
                                ? error.message
                                : String(error)
                        }`,
                    );

                    // Early termination: stop if we have too many errors
                    if (errors.length >= MAX_ERRORS) {
                        cleanup();
                        stream.destroy();
                        const expectedColumns =
                            getSchemaColumns(PolisVoteCsvSchema);
                        reject(
                            new Error(
                                `Votes CSV validation failed (showing first ${String(MAX_ERRORS)} errors):\n${errors.join("\n")}\n\nThis file may be the wrong type. Expected columns: ${expectedColumns.join(", ")}`,
                            ),
                        );
                    }
                }
            })
            .on("end", () => {
                if (isComplete) return;
                cleanup();

                if (errors.length > 0) {
                    reject(
                        new Error(
                            `Votes CSV validation failed:\n${errors.join("\n")}`,
                        ),
                    );
                } else if (votes.length === 0) {
                    reject(new Error("Votes CSV contains no data rows"));
                } else {
                    resolve(votes);
                }
            })
            .on("error", (error: Error) => {
                if (isComplete) return;
                cleanup();
                reject(
                    new Error(`Failed to parse votes CSV: ${error.message}`),
                );
            });
    });
}
