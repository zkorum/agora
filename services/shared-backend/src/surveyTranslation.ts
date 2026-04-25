import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    surveyQuestionContentTranslationTable,
    surveyQuestionOptionContentTranslationTable,
} from "./schema.js";

export async function getSurveyQuestionContentTranslations({
    db,
    surveyQuestionContentIds,
    displayLanguageCode,
}: {
    db: PostgresJsDatabase;
    surveyQuestionContentIds: number[];
    displayLanguageCode: string;
}): Promise<Map<number, string>> {
    if (surveyQuestionContentIds.length === 0) {
        return new Map();
    }

    const rows = await db
        .select({
            surveyQuestionContentId:
                surveyQuestionContentTranslationTable.surveyQuestionContentId,
            translatedQuestionText:
                surveyQuestionContentTranslationTable.translatedQuestionText,
        })
        .from(surveyQuestionContentTranslationTable)
        .where(
            and(
                inArray(
                    surveyQuestionContentTranslationTable.surveyQuestionContentId,
                    surveyQuestionContentIds,
                ),
                eq(
                    surveyQuestionContentTranslationTable.displayLanguageCode,
                    displayLanguageCode,
                ),
            ),
        );

    return new Map(
        rows.map((row) => [row.surveyQuestionContentId, row.translatedQuestionText]),
    );
}

export async function getSurveyQuestionOptionContentTranslations({
    db,
    surveyQuestionOptionContentIds,
    displayLanguageCode,
}: {
    db: PostgresJsDatabase;
    surveyQuestionOptionContentIds: number[];
    displayLanguageCode: string;
}): Promise<Map<number, string>> {
    if (surveyQuestionOptionContentIds.length === 0) {
        return new Map();
    }

    const rows = await db
        .select({
            surveyQuestionOptionContentId:
                surveyQuestionOptionContentTranslationTable.surveyQuestionOptionContentId,
            translatedOptionText:
                surveyQuestionOptionContentTranslationTable.translatedOptionText,
        })
        .from(surveyQuestionOptionContentTranslationTable)
        .where(
            and(
                inArray(
                    surveyQuestionOptionContentTranslationTable.surveyQuestionOptionContentId,
                    surveyQuestionOptionContentIds,
                ),
                eq(
                    surveyQuestionOptionContentTranslationTable.displayLanguageCode,
                    displayLanguageCode,
                ),
            ),
        );

    return new Map(
        rows.map((row) => [row.surveyQuestionOptionContentId, row.translatedOptionText]),
    );
}
