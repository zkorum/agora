import { and, asc, eq, gt, isNotNull, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { log } from "@/app.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import {
    conversationContentTable,
    conversationLanguageSettingTable,
    conversationTable,
    opinionContentTable,
    opinionTable,
    surveyQuestionContentTable,
    surveyQuestionOptionContentTable,
    surveyQuestionOptionTable,
    surveyQuestionTable,
} from "@/shared-backend/schema.js";
import {
    htmlToCountedText,
    LEGACY_MAX_LENGTH_CONVERSATION_BODY_HTML_OUTPUT,
    MAX_LENGTH_CONVERSATION_BODY,
    MAX_LENGTH_CONVERSATION_BODY_HTML,
} from "@/shared/shared.js";
import {
    buildConversationLanguageDetectionCorpus,
    buildGoogleConversationLanguageDetectionCorpus,
    normalizeConversationLanguageSettingRow,
    resolveConversationLanguageSetting,
    type StoredConversationLanguageSetting,
    upsertConversationLanguageSetting,
} from "./conversationLanguage.js";
import {
    contentLanguageMetadataUpdateValues,
    getContentItemLanguageHints,
    type ContentLanguageMetadata,
    resolveContentLanguageMetadata,
} from "./contentLanguageMetadata.js";

const PLAIN_TEXT_BACKFILL_BATCH_SIZE = 500;
const LANGUAGE_BACKFILL_BATCH_SIZE = 100;

const backfillLanguageSettingSelect = {
    settingMode: conversationLanguageSettingTable.mode,
    languageCode: conversationLanguageSettingTable.languageCode,
    detectedLanguageCode: conversationLanguageSettingTable.detectedLanguageCode,
    detectedSourceLanguageCode:
        conversationLanguageSettingTable.detectedSourceLanguageCode,
    detectedRawLanguageCode:
        conversationLanguageSettingTable.detectedRawLanguageCode,
    detectedRawLanguageProvider:
        conversationLanguageSettingTable.detectedRawLanguageProvider,
    detectionConfidence: conversationLanguageSettingTable.detectionConfidence,
    detectedFromCorpusHash: conversationLanguageSettingTable.detectedFromCorpusHash,
};

interface BackfillLanguageSettingRow {
    settingMode: "auto" | "manual" | null;
    languageCode: string | null;
    detectedLanguageCode: string | null;
    detectedSourceLanguageCode: string | null;
    detectedRawLanguageCode: string | null;
    detectedRawLanguageProvider: StoredConversationLanguageSetting["detectedRawLanguageProvider"];
    detectionConfidence: number | null;
    detectedFromCorpusHash: string | null;
}

function normalizeBackfillLanguageSetting({
    row,
}: {
    row: BackfillLanguageSettingRow;
}): StoredConversationLanguageSetting | undefined {
    return normalizeConversationLanguageSettingRow(
        row.settingMode === null
            ? undefined
            : {
                  mode: row.settingMode,
                  languageCode: row.languageCode,
                  detectedLanguageCode: row.detectedLanguageCode,
                  detectedSourceLanguageCode: row.detectedSourceLanguageCode,
                  detectedRawLanguageCode: row.detectedRawLanguageCode,
                  detectedRawLanguageProvider: row.detectedRawLanguageProvider,
                  detectionConfidence: row.detectionConfidence,
                  detectedFromCorpusHash: row.detectedFromCorpusHash,
              },
    );
}

function getBackfillContentItemLanguageHints({
    row,
}: {
    row: BackfillLanguageSettingRow;
}) {
    const languageSetting = normalizeBackfillLanguageSetting({ row });
    if (languageSetting === undefined) {
        return [];
    }
    return getContentItemLanguageHints({
        languageSetting,
        additionalLanguageCodes: [],
    });
}

function backfillSourceLanguageUpdateValues({
    metadata,
}: {
    metadata: ContentLanguageMetadata;
}): ContentLanguageMetadata {
    if (metadata.sourceLanguageCode !== null) {
        return metadata;
    }
    return {
        sourceLanguageCode: null,
        sourceRawLanguageCode: metadata.sourceRawLanguageCode,
        sourceLanguageProvider: metadata.sourceLanguageProvider,
        sourceLanguageConfidence: 0,
    };
}

export function logActiveConversationBodyLimits(): void {
    log.info(
        {
            maxConversationBodyPlainTextChars: MAX_LENGTH_CONVERSATION_BODY,
            maxConversationBodyHtmlChars: MAX_LENGTH_CONVERSATION_BODY_HTML,
            legacyMaxConversationBodyHtmlOutputChars:
                LEGACY_MAX_LENGTH_CONVERSATION_BODY_HTML_OUTPUT,
        },
        "[ConversationLimits] Active conversation body limits",
    );
}

export async function logConversationBodyLimitCompatibility({
    db,
}: {
    db: PostgresDatabase;
}): Promise<void> {
    try {
        const rows = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(conversationContentTable)
            .where(
                sql`${conversationContentTable.body} IS NOT NULL AND length(${conversationContentTable.body}) > ${MAX_LENGTH_CONVERSATION_BODY_HTML}`,
            );

        log.info(
            { legacyConversationBodiesOverNewHtmlLimit: rows.at(0)?.count ?? 0 },
            "[ConversationLimits] Legacy conversation body compatibility check",
        );
    } catch (error) {
        log.warn(
            error,
            "[ConversationLimits] Failed legacy conversation body compatibility check",
        );
    }
}

async function backfillConversationContentPlainText({
    db,
}: {
    db: PostgresDatabase;
}): Promise<number> {
    let totalUpdated = 0;

    for (;;) {
        const rows = await db
            .select({
                id: conversationContentTable.id,
                body: conversationContentTable.body,
            })
            .from(conversationContentTable)
            .where(isNull(conversationContentTable.bodyPlainText))
            .orderBy(asc(conversationContentTable.id))
            .limit(PLAIN_TEXT_BACKFILL_BATCH_SIZE);

        if (rows.length === 0) {
            return totalUpdated;
        }

        for (const row of rows) {
            await db
                .update(conversationContentTable)
                .set({
                    bodyPlainText:
                        row.body === null ? "" : htmlToCountedText(row.body),
                })
                .where(eq(conversationContentTable.id, row.id));
        }

        totalUpdated += rows.length;
        log.info(
            { batchUpdated: rows.length, totalUpdated },
            "[ConversationPlainText] Backfilled conversation content plain text batch",
        );
    }
}

async function backfillOpinionContentPlainText({
    db,
}: {
    db: PostgresDatabase;
}): Promise<number> {
    let totalUpdated = 0;

    for (;;) {
        const rows = await db
            .select({
                id: opinionContentTable.id,
                content: opinionContentTable.content,
            })
            .from(opinionContentTable)
            .where(isNull(opinionContentTable.contentPlainText))
            .orderBy(asc(opinionContentTable.id))
            .limit(PLAIN_TEXT_BACKFILL_BATCH_SIZE);

        if (rows.length === 0) {
            return totalUpdated;
        }

        for (const row of rows) {
            await db
                .update(opinionContentTable)
                .set({ contentPlainText: htmlToCountedText(row.content) })
                .where(eq(opinionContentTable.id, row.id));
        }

        totalUpdated += rows.length;
        log.info(
            { batchUpdated: rows.length, totalUpdated },
            "[OpinionPlainText] Backfilled opinion content plain text batch",
        );
    }
}

export async function backfillContentPlainTextFields({
    db,
}: {
    db: PostgresDatabase;
}): Promise<void> {
    try {
        const conversationUpdated = await backfillConversationContentPlainText({
            db,
        });
        const opinionUpdated = await backfillOpinionContentPlainText({ db });
        const [conversationRemaining] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(conversationContentTable)
            .where(isNull(conversationContentTable.bodyPlainText));
        const [opinionRemaining] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(opinionContentTable)
            .where(isNull(opinionContentTable.contentPlainText));

        log.info(
            {
                conversationUpdated,
                opinionUpdated,
                conversationRemainingNullPlainText: conversationRemaining.count,
                opinionRemainingNullPlainText: opinionRemaining.count,
            },
            "[ContentPlainText] Backfill complete",
        );
    } catch (error) {
        log.warn(error, "[ContentPlainText] Backfill failed");
    }
}

async function backfillConversationLanguageSettings({
    db,
    googleCloudCredentials,
}: {
    db: PostgresDatabase;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<number> {
    let totalUpdated = 0;
    let lastConversationId = 0;
    log.info(
        {
            googleCloudTranslationConfigured: googleCloudCredentials !== undefined,
        },
        "[ConversationLanguageBackfill] Starting conversation language backfill",
    );

    for (;;) {
        const rows = await db
            .select({
                conversationId: conversationTable.id,
                conversationContentId: conversationContentTable.id,
                title: conversationContentTable.title,
                bodyPlainText: conversationContentTable.bodyPlainText,
                ...backfillLanguageSettingSelect,
            })
            .from(conversationTable)
            .innerJoin(
                conversationContentTable,
                eq(
                    conversationTable.currentContentId,
                    conversationContentTable.id,
                ),
            )
            .leftJoin(
                conversationLanguageSettingTable,
                eq(
                    conversationLanguageSettingTable.conversationId,
                    conversationTable.id,
                ),
            )
            .where(
                and(
                    gt(conversationTable.id, lastConversationId),
                    or(
                        isNull(conversationLanguageSettingTable.id),
                        eq(conversationLanguageSettingTable.mode, "auto"),
                    ),
                ),
            )
            .orderBy(asc(conversationTable.id))
            .limit(LANGUAGE_BACKFILL_BATCH_SIZE);

        if (rows.length === 0) {
            return totalUpdated;
        }

        for (const row of rows) {
            lastConversationId = row.conversationId;
            const existing = normalizeBackfillLanguageSetting({ row });
            const setting = await resolveConversationLanguageSetting({
                request: { mode: "auto" },
                existing,
                conversationTitle: row.title,
                bodyPlainText: row.bodyPlainText ?? "",
                googleCloudCredentials,
            });

            await upsertConversationLanguageSetting({
                db,
                conversationId: row.conversationId,
                setting,
                now: new Date(),
            });
        }

        totalUpdated += rows.length;
        log.info(
            { batchUpdated: rows.length, totalUpdated },
            "[ConversationLanguageBackfill] Backfilled conversation language batch",
        );
    }
}

async function backfillConversationContentSourceLanguages({
    db,
}: {
    db: PostgresDatabase;
}): Promise<number> {
    let totalUpdated = 0;
    let lastContentId = 0;

    for (;;) {
        const rows = await db
            .select({
                contentId: conversationContentTable.id,
                title: conversationContentTable.title,
                bodyPlainText: conversationContentTable.bodyPlainText,
                ...backfillLanguageSettingSelect,
            })
            .from(conversationTable)
            .innerJoin(
                conversationContentTable,
                eq(
                    conversationTable.currentContentId,
                    conversationContentTable.id,
                ),
            )
            .leftJoin(
                conversationLanguageSettingTable,
                eq(
                    conversationLanguageSettingTable.conversationId,
                    conversationTable.id,
                ),
            )
            .where(
                and(
                    gt(conversationContentTable.id, lastContentId),
                    isNull(conversationContentTable.sourceLanguageCode),
                    isNull(conversationContentTable.sourceLanguageConfidence),
                ),
            )
            .orderBy(asc(conversationContentTable.id))
            .limit(LANGUAGE_BACKFILL_BATCH_SIZE);

        if (rows.length === 0) {
            return totalUpdated;
        }

        for (const row of rows) {
            lastContentId = row.contentId;
            const bodyPlainText = row.bodyPlainText ?? "";
            const sourceLanguageMetadata = backfillSourceLanguageUpdateValues({
                metadata: await resolveContentLanguageMetadata({
                    text: buildConversationLanguageDetectionCorpus({
                        conversationTitle: row.title,
                        bodyPlainText,
                    }),
                    googleText: buildGoogleConversationLanguageDetectionCorpus({
                        conversationTitle: row.title,
                        bodyPlainText,
                    }),
                    googleCloudCredentials: undefined,
                    useGoogleLanguageDetection: false,
                    languageHints: getBackfillContentItemLanguageHints({ row }),
                }),
            });

            await db
                .update(conversationContentTable)
                .set(contentLanguageMetadataUpdateValues(sourceLanguageMetadata))
                .where(eq(conversationContentTable.id, row.contentId));
        }

        totalUpdated += rows.length;
        log.info(
            { batchUpdated: rows.length, totalUpdated },
            "[ContentLanguageBackfill] Backfilled conversation source language batch",
        );
    }
}

async function backfillSurveyQuestionSourceLanguages({
    db,
}: {
    db: PostgresDatabase;
}): Promise<number> {
    let totalUpdated = 0;
    let lastContentId = 0;

    for (;;) {
        const rows = await db
            .select({
                contentId: surveyQuestionContentTable.id,
                questionText: surveyQuestionContentTable.questionText,
                ...backfillLanguageSettingSelect,
            })
            .from(surveyQuestionTable)
            .innerJoin(
                surveyQuestionContentTable,
                eq(
                    surveyQuestionContentTable.id,
                    surveyQuestionTable.currentContentId,
                ),
            )
            .leftJoin(
                conversationLanguageSettingTable,
                eq(
                    conversationLanguageSettingTable.conversationId,
                    surveyQuestionTable.conversationId,
                ),
            )
            .where(
                and(
                    gt(surveyQuestionContentTable.id, lastContentId),
                    isNotNull(surveyQuestionTable.currentContentId),
                    isNull(surveyQuestionContentTable.sourceLanguageCode),
                    isNull(surveyQuestionContentTable.sourceLanguageConfidence),
                ),
            )
            .orderBy(asc(surveyQuestionContentTable.id))
            .limit(LANGUAGE_BACKFILL_BATCH_SIZE);

        if (rows.length === 0) {
            return totalUpdated;
        }

        for (const row of rows) {
            lastContentId = row.contentId;
            const sourceLanguageMetadata = backfillSourceLanguageUpdateValues({
                metadata: await resolveContentLanguageMetadata({
                    text: row.questionText,
                    googleCloudCredentials: undefined,
                    useGoogleLanguageDetection: false,
                    languageHints: getBackfillContentItemLanguageHints({ row }),
                }),
            });

            await db
                .update(surveyQuestionContentTable)
                .set(contentLanguageMetadataUpdateValues(sourceLanguageMetadata))
                .where(eq(surveyQuestionContentTable.id, row.contentId));
        }

        totalUpdated += rows.length;
        log.info(
            { batchUpdated: rows.length, totalUpdated },
            "[ContentLanguageBackfill] Backfilled survey question source language batch",
        );
    }
}

async function backfillSurveyOptionSourceLanguages({
    db,
}: {
    db: PostgresDatabase;
}): Promise<number> {
    let totalUpdated = 0;
    let lastContentId = 0;

    for (;;) {
        const rows = await db
            .select({
                contentId: surveyQuestionOptionContentTable.id,
                optionText: surveyQuestionOptionContentTable.optionText,
                ...backfillLanguageSettingSelect,
            })
            .from(surveyQuestionOptionTable)
            .innerJoin(
                surveyQuestionOptionContentTable,
                eq(
                    surveyQuestionOptionContentTable.id,
                    surveyQuestionOptionTable.currentContentId,
                ),
            )
            .innerJoin(
                surveyQuestionTable,
                eq(
                    surveyQuestionTable.id,
                    surveyQuestionOptionTable.surveyQuestionId,
                ),
            )
            .leftJoin(
                conversationLanguageSettingTable,
                eq(
                    conversationLanguageSettingTable.conversationId,
                    surveyQuestionTable.conversationId,
                ),
            )
            .where(
                and(
                    gt(surveyQuestionOptionContentTable.id, lastContentId),
                    isNotNull(surveyQuestionOptionTable.currentContentId),
                    isNull(surveyQuestionOptionContentTable.sourceLanguageCode),
                    isNull(
                        surveyQuestionOptionContentTable.sourceLanguageConfidence,
                    ),
                ),
            )
            .orderBy(asc(surveyQuestionOptionContentTable.id))
            .limit(LANGUAGE_BACKFILL_BATCH_SIZE);

        if (rows.length === 0) {
            return totalUpdated;
        }

        for (const row of rows) {
            lastContentId = row.contentId;
            const sourceLanguageMetadata = backfillSourceLanguageUpdateValues({
                metadata: await resolveContentLanguageMetadata({
                    text: row.optionText,
                    googleCloudCredentials: undefined,
                    useGoogleLanguageDetection: false,
                    languageHints: getBackfillContentItemLanguageHints({ row }),
                }),
            });

            await db
                .update(surveyQuestionOptionContentTable)
                .set(contentLanguageMetadataUpdateValues(sourceLanguageMetadata))
                .where(eq(surveyQuestionOptionContentTable.id, row.contentId));
        }

        totalUpdated += rows.length;
        log.info(
            { batchUpdated: rows.length, totalUpdated },
            "[ContentLanguageBackfill] Backfilled survey option source language batch",
        );
    }
}

async function backfillOpinionSourceLanguages({
    db,
}: {
    db: PostgresDatabase;
}): Promise<number> {
    let totalUpdated = 0;
    let lastContentId = 0;

    for (;;) {
        const rows = await db
            .select({
                contentId: opinionContentTable.id,
                content: opinionContentTable.content,
                contentPlainText: opinionContentTable.contentPlainText,
                ...backfillLanguageSettingSelect,
            })
            .from(opinionTable)
            .innerJoin(
                opinionContentTable,
                eq(opinionContentTable.id, opinionTable.currentContentId),
            )
            .leftJoin(
                conversationLanguageSettingTable,
                eq(
                    conversationLanguageSettingTable.conversationId,
                    opinionTable.conversationId,
                ),
            )
            .where(
                and(
                    gt(opinionContentTable.id, lastContentId),
                    isNotNull(opinionTable.currentContentId),
                    isNull(opinionContentTable.sourceLanguageCode),
                    isNull(opinionContentTable.sourceLanguageConfidence),
                ),
            )
            .orderBy(asc(opinionContentTable.id))
            .limit(LANGUAGE_BACKFILL_BATCH_SIZE);

        if (rows.length === 0) {
            return totalUpdated;
        }

        for (const row of rows) {
            lastContentId = row.contentId;
            const sourceLanguageMetadata = backfillSourceLanguageUpdateValues({
                metadata: await resolveContentLanguageMetadata({
                    text: row.contentPlainText ?? htmlToCountedText(row.content),
                    googleCloudCredentials: undefined,
                    useGoogleLanguageDetection: false,
                    languageHints: getBackfillContentItemLanguageHints({ row }),
                }),
            });

            await db
                .update(opinionContentTable)
                .set(contentLanguageMetadataUpdateValues(sourceLanguageMetadata))
                .where(eq(opinionContentTable.id, row.contentId));
        }

        totalUpdated += rows.length;
        log.info(
            { batchUpdated: rows.length, totalUpdated },
            "[ContentLanguageBackfill] Backfilled opinion source language batch",
        );
    }
}

async function backfillContentTranslationSourceLanguages({
    db,
}: {
    db: PostgresDatabase;
}): Promise<{
    conversationUpdated: number;
    surveyQuestionUpdated: number;
    surveyOptionUpdated: number;
    opinionUpdated: number;
}> {
    const conversationUpdated = await backfillConversationContentSourceLanguages({
        db,
    });
    const surveyQuestionUpdated = await backfillSurveyQuestionSourceLanguages({
        db,
    });
    const surveyOptionUpdated = await backfillSurveyOptionSourceLanguages({ db });
    const opinionUpdated = await backfillOpinionSourceLanguages({ db });

    return {
        conversationUpdated,
        surveyQuestionUpdated,
        surveyOptionUpdated,
        opinionUpdated,
    };
}

export async function backfillConversationContentMetadata({
    db,
    googleCloudCredentials,
}: {
    db: PostgresDatabase;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<void> {
    await backfillContentPlainTextFields({ db });

    try {
        const languageUpdated = await backfillConversationLanguageSettings({
            db,
            googleCloudCredentials,
        });
        const sourceLanguageUpdated =
            await backfillContentTranslationSourceLanguages({ db });
        const [remainingWithoutLanguageSetting] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(conversationTable)
            .leftJoin(
                conversationLanguageSettingTable,
                eq(
                    conversationLanguageSettingTable.conversationId,
                    conversationTable.id,
                ),
            )
            .where(isNull(conversationLanguageSettingTable.id));

        log.info(
            {
                languageUpdated,
                sourceLanguageUpdated,
                remainingWithoutLanguageSetting:
                    remainingWithoutLanguageSetting.count,
            },
            "[ConversationLanguageBackfill] Backfill complete",
        );
    } catch (error) {
        log.warn(error, "[ConversationLanguageBackfill] Backfill failed");
    }
}
