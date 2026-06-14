import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { log } from "@/app.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import {
    conversationContentTable,
    conversationLanguageSettingTable,
    conversationTable,
    opinionContentTable,
} from "@/shared-backend/schema.js";
import {
    htmlToCountedText,
    LEGACY_MAX_LENGTH_CONVERSATION_BODY_HTML_OUTPUT,
    MAX_LENGTH_CONVERSATION_BODY,
    MAX_LENGTH_CONVERSATION_BODY_HTML,
} from "@/shared/shared.js";
import {
    normalizeConversationLanguageSettingRow,
    resolveConversationLanguageSetting,
    upsertConversationLanguageSetting,
} from "./conversationLanguage.js";

const PLAIN_TEXT_BACKFILL_BATCH_SIZE = 500;
const LANGUAGE_BACKFILL_BATCH_SIZE = 100;

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
    if (googleCloudCredentials === undefined) {
        log.info(
            "[ConversationLanguageBackfill] Skipped because Google Cloud Translation is not configured",
        );
        return 0;
    }

    let totalUpdated = 0;
    let lastConversationId = 0;

    for (;;) {
        const rows = await db
            .select({
                conversationId: conversationTable.id,
                conversationContentId: conversationContentTable.id,
                title: conversationContentTable.title,
                bodyPlainText: conversationContentTable.bodyPlainText,
                settingId: conversationLanguageSettingTable.id,
                settingMode: conversationLanguageSettingTable.mode,
                languageCode: conversationLanguageSettingTable.languageCode,
                detectedLanguageCode:
                    conversationLanguageSettingTable.detectedLanguageCode,
                detectedRawLanguageCode:
                    conversationLanguageSettingTable.detectedRawLanguageCode,
                detectionConfidence:
                    conversationLanguageSettingTable.detectionConfidence,
                detectedFromCorpusHash:
                    conversationLanguageSettingTable.detectedFromCorpusHash,
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
            const existing = normalizeConversationLanguageSettingRow(
                row.settingMode === null
                    ? undefined
                    : {
                          mode: row.settingMode,
                          languageCode: row.languageCode,
                          detectedLanguageCode: row.detectedLanguageCode,
                          detectedRawLanguageCode: row.detectedRawLanguageCode,
                          detectionConfidence: row.detectionConfidence,
                          detectedFromCorpusHash: row.detectedFromCorpusHash,
                      },
            );
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
            await db
                .update(conversationContentTable)
                .set({
                    sourceLanguageCode: setting.detectedRawLanguageCode,
                    sourceLanguageConfidence: setting.detectionConfidence,
                })
                .where(eq(conversationContentTable.id, row.conversationContentId));
        }

        totalUpdated += rows.length;
        log.info(
            { batchUpdated: rows.length, totalUpdated },
            "[ConversationLanguageBackfill] Backfilled conversation language batch",
        );
    }
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
                remainingWithoutLanguageSetting:
                    remainingWithoutLanguageSetting.count,
            },
            "[ConversationLanguageBackfill] Backfill complete",
        );
    } catch (error) {
        log.warn(error, "[ConversationLanguageBackfill] Backfill failed");
    }
}
