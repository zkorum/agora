import {
    parseSummaryCsv,
    parseCommentsCsv,
    parseVotesCsv,
} from "./polisCsvParser.js";
import { CSV_UPLOAD_FIELD_NAMES } from "@/shared-app-api/csvUpload.js";
import type { ValidateCsvResponse } from "@/shared/types/dto.js";
import { z } from "zod";

/**
 * Zod schema for CSV file contents
 * Requires all three files with string content, rejects extra fields
 * Use .safeParse() or .parse() to convert unknown input to typed CsvFiles
 */
export const zodCsvFiles = z
    .object({
        [CSV_UPLOAD_FIELD_NAMES.SUMMARY_FILE]: z.string(),
        [CSV_UPLOAD_FIELD_NAMES.COMMENTS_FILE]: z.string(),
        [CSV_UPLOAD_FIELD_NAMES.VOTES_FILE]: z.string(),
    })
    .strict();

export type CsvFiles = z.infer<typeof zodCsvFiles>;

/**
 * Validate individual CSV files without importing
 * Accepts 1, 2, or all 3 CSV files and validates each independently
 * Returns per-file validation results with helpful error messages
 */
export async function validateIndividualCsvFiles({
    files,
}: {
    files: Partial<Record<string, string>>;
}): Promise<ValidateCsvResponse> {
    const result: ValidateCsvResponse = {};

    // Validate summary file if provided
    const summaryContent = files[CSV_UPLOAD_FIELD_NAMES.SUMMARY_FILE];
    if (summaryContent !== undefined) {
        try {
            await parseSummaryCsv(summaryContent);
            result.summaryFile = {
                isValid: true,
            };
        } catch (error) {
            result.summaryFile = {
                isValid: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to parse summary file",
            };
        }
    }

    // Validate comments file if provided
    const commentsContent = files[CSV_UPLOAD_FIELD_NAMES.COMMENTS_FILE];
    if (commentsContent !== undefined) {
        try {
            await parseCommentsCsv(commentsContent);
            result.commentsFile = {
                isValid: true,
            };
        } catch (error) {
            result.commentsFile = {
                isValid: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to parse comments file",
            };
        }
    }

    // Validate votes file if provided
    const votesContent = files[CSV_UPLOAD_FIELD_NAMES.VOTES_FILE];
    if (votesContent !== undefined) {
        try {
            await parseVotesCsv(votesContent);
            result.votesFile = {
                isValid: true,
            };
        } catch (error) {
            result.votesFile = {
                isValid: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to parse votes file",
            };
        }
    }

    return result;
}
