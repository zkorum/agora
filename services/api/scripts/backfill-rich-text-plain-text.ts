#!/usr/bin/env npx tsx

import { and, asc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { pathToFileURL } from "node:url";
import { createPostgresClient } from "../src/shared-backend/db.js";
import { sharedConfigSchema } from "../src/shared-backend/config.js";
import {
    initializeGoogleCloudCredentials,
    type GoogleCloudCredentials,
} from "../src/shared-backend/googleCloudAuth.js";
import {
    conversationContentTable,
    conversationContentTranslationTable,
    opinionContentTable,
    opinionContentTranslationTable,
    projectContentTable,
    projectContentTranslationTable,
    rankingItemContentTable,
    rankingItemContentTranslationTable,
    surveyAnswerTable,
} from "../src/shared-backend/schema.js";
import { htmlToCountedText } from "../src/shared-app-api/html.js";
import {
    contentLanguageMetadataUpdateValues,
    resolveContentLanguageMetadata,
} from "../src/service/contentLanguageMetadata.js";

const BATCH_SIZE = 500;
const REQUIRED_ENV_EXAMPLE = [
    "CONNECTION_STRING=postgres://...",
    "",
    "GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/google-service-account.json",
    "GOOGLE_CLOUD_TRANSLATION_LOCATION=us-central1",
    "GOOGLE_CLOUD_TRANSLATION_ENDPOINT=translate.googleapis.com",
].join("\n");
const REQUIRED_ENV_KEYS = [
    "CONNECTION_STRING",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "GOOGLE_CLOUD_TRANSLATION_LOCATION",
    "GOOGLE_CLOUD_TRANSLATION_ENDPOINT",
] as const;

// One-time migration helper for the rich-text/plain-text split and legacy
// ranking-item language metadata.
// Run manually with `pnpm backfill:rich-text-plain-text` after V0079.1 has
// copied legacy ranking rows into ranking_item* tables and before V0080 adds
// strict body/plain-text pair constraints / V0081 drops maxdiff_* tables.
// Required env:
// CONNECTION_STRING=postgres://...
//
// GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/google-service-account.json
// GOOGLE_CLOUD_TRANSLATION_LOCATION=us-central1
// GOOGLE_CLOUD_TRANSLATION_ENDPOINT=translate.googleapis.com
// Keep this script until every
// deployed environment has successfully applied V0081; remove it after that
// migration is no longer pending anywhere.
//
// This file must not be imported by application runtime code. The direct-run
// guard at the bottom prevents accidental execution if a future test imports it.

const log = {
    info: (...args: unknown[]): void => {
        console.info(...args);
    },
    error: (...args: unknown[]): void => {
        console.error(...args);
    },
};

type Db = PostgresJsDatabase;

interface BackfillRow {
    id: number;
    html: string;
}

interface BackfillTarget {
    label: string;
    clearStalePlainText: (db: Db) => Promise<number>;
    readBatch: (db: Db) => Promise<BackfillRow[]>;
    updatePlainText: (db: Db, row: BackfillRow) => Promise<void>;
}

interface RankingItemLanguageBackfillRow {
    id: number;
    title: string;
    bodyPlainText: string | null;
}

function rowsWithHtml(rows: { id: number; html: string | null }[]): BackfillRow[] {
    return rows.flatMap((row) =>
        row.html === null ? [] : [{ id: row.id, html: row.html }],
    );
}

const noopClearStalePlainText = (): Promise<number> => Promise.resolve(0);

function isNonEmptyString(value: string | undefined): boolean {
    return value !== undefined && value.trim().length > 0;
}

const targets: BackfillTarget[] = [
    {
        label: "survey answers",
        clearStalePlainText: noopClearStalePlainText,
        readBatch: async (db) =>
            rowsWithHtml(
                await db
                    .select({
                        id: surveyAnswerTable.id,
                        html: surveyAnswerTable.textValueHtml,
                    })
                    .from(surveyAnswerTable)
                    .where(
                        and(
                            isNull(surveyAnswerTable.textValuePlainText),
                            isNotNull(surveyAnswerTable.textValueHtml),
                        ),
                    )
                    .orderBy(asc(surveyAnswerTable.id))
                    .limit(BATCH_SIZE),
            ),
        updatePlainText: async (db, row) => {
            await db
                .update(surveyAnswerTable)
                .set({ textValuePlainText: htmlToCountedText(row.html) })
                .where(
                    and(
                        eq(surveyAnswerTable.id, row.id),
                        eq(surveyAnswerTable.textValueHtml, row.html),
                        isNull(surveyAnswerTable.textValuePlainText),
                    ),
                );
        },
    },
    {
        label: "ranking item content",
        clearStalePlainText: async (db) => {
            const rows = await db
                .update(rankingItemContentTable)
                .set({ bodyPlainText: null })
                .where(
                    and(
                        isNull(rankingItemContentTable.body),
                        isNotNull(rankingItemContentTable.bodyPlainText),
                    ),
                )
                .returning({ id: rankingItemContentTable.id });
            return rows.length;
        },
        readBatch: async (db) =>
            rowsWithHtml(
                await db
                    .select({
                        id: rankingItemContentTable.id,
                        html: rankingItemContentTable.body,
                    })
                    .from(rankingItemContentTable)
                    .where(
                        and(
                            isNull(rankingItemContentTable.bodyPlainText),
                            isNotNull(rankingItemContentTable.body),
                        ),
                    )
                    .orderBy(asc(rankingItemContentTable.id))
                    .limit(BATCH_SIZE),
            ),
        updatePlainText: async (db, row) => {
            await db
                .update(rankingItemContentTable)
                .set({ bodyPlainText: htmlToCountedText(row.html) })
                .where(
                    and(
                        eq(rankingItemContentTable.id, row.id),
                        eq(rankingItemContentTable.body, row.html),
                        isNull(rankingItemContentTable.bodyPlainText),
                    ),
                );
        },
    },
    {
        label: "conversation content",
        clearStalePlainText: noopClearStalePlainText,
        readBatch: async (db) =>
            rowsWithHtml(
                await db
                    .select({
                        id: conversationContentTable.id,
                        html: conversationContentTable.body,
                    })
                    .from(conversationContentTable)
                    .where(
                        and(
                            isNull(conversationContentTable.bodyPlainText),
                            isNotNull(conversationContentTable.body),
                        ),
                    )
                    .orderBy(asc(conversationContentTable.id))
                    .limit(BATCH_SIZE),
            ),
        updatePlainText: async (db, row) => {
            await db
                .update(conversationContentTable)
                .set({ bodyPlainText: htmlToCountedText(row.html) })
                .where(
                    and(
                        eq(conversationContentTable.id, row.id),
                        eq(conversationContentTable.body, row.html),
                        isNull(conversationContentTable.bodyPlainText),
                    ),
                );
        },
    },
    {
        label: "opinion content",
        clearStalePlainText: noopClearStalePlainText,
        readBatch: async (db) =>
            rowsWithHtml(
                await db
                    .select({
                        id: opinionContentTable.id,
                        html: opinionContentTable.content,
                    })
                    .from(opinionContentTable)
                    .where(
                        and(
                            isNull(opinionContentTable.contentPlainText),
                            isNotNull(opinionContentTable.content),
                        ),
                    )
                    .orderBy(asc(opinionContentTable.id))
                    .limit(BATCH_SIZE),
            ),
        updatePlainText: async (db, row) => {
            await db
                .update(opinionContentTable)
                .set({ contentPlainText: htmlToCountedText(row.html) })
                .where(
                    and(
                        eq(opinionContentTable.id, row.id),
                        eq(opinionContentTable.content, row.html),
                        isNull(opinionContentTable.contentPlainText),
                    ),
                );
        },
    },
    {
        label: "project content",
        clearStalePlainText: noopClearStalePlainText,
        readBatch: async (db) =>
            rowsWithHtml(
                await db
                    .select({
                        id: projectContentTable.id,
                        html: projectContentTable.body,
                    })
                    .from(projectContentTable)
                    .where(
                        and(
                            isNull(projectContentTable.bodyPlainText),
                            isNotNull(projectContentTable.body),
                        ),
                    )
                    .orderBy(asc(projectContentTable.id))
                    .limit(BATCH_SIZE),
            ),
        updatePlainText: async (db, row) => {
            await db
                .update(projectContentTable)
                .set({ bodyPlainText: htmlToCountedText(row.html) })
                .where(
                    and(
                        eq(projectContentTable.id, row.id),
                        eq(projectContentTable.body, row.html),
                        isNull(projectContentTable.bodyPlainText),
                    ),
                );
        },
    },
    {
        label: "conversation content translations",
        clearStalePlainText: async (db) => {
            const rows = await db
                .update(conversationContentTranslationTable)
                .set({ translatedBodyPlainText: null })
                .where(
                    and(
                        isNull(conversationContentTranslationTable.translatedBody),
                        isNotNull(
                            conversationContentTranslationTable.translatedBodyPlainText,
                        ),
                    ),
                )
                .returning({ id: conversationContentTranslationTable.id });
            return rows.length;
        },
        readBatch: async (db) =>
            rowsWithHtml(
                await db
                    .select({
                        id: conversationContentTranslationTable.id,
                        html: conversationContentTranslationTable.translatedBody,
                    })
                    .from(conversationContentTranslationTable)
                    .where(
                        and(
                            isNull(
                                conversationContentTranslationTable.translatedBodyPlainText,
                            ),
                            isNotNull(
                                conversationContentTranslationTable.translatedBody,
                            ),
                        ),
                    )
                    .orderBy(asc(conversationContentTranslationTable.id))
                    .limit(BATCH_SIZE),
            ),
        updatePlainText: async (db, row) => {
            await db
                .update(conversationContentTranslationTable)
                .set({ translatedBodyPlainText: htmlToCountedText(row.html) })
                .where(
                    and(
                        eq(conversationContentTranslationTable.id, row.id),
                        eq(conversationContentTranslationTable.translatedBody, row.html),
                        isNull(
                            conversationContentTranslationTable.translatedBodyPlainText,
                        ),
                    ),
                );
        },
    },
    {
        label: "project content translations",
        clearStalePlainText: async (db) => {
            const rows = await db
                .update(projectContentTranslationTable)
                .set({ translatedBodyPlainText: null })
                .where(
                    and(
                        isNull(projectContentTranslationTable.translatedBody),
                        isNotNull(
                            projectContentTranslationTable.translatedBodyPlainText,
                        ),
                    ),
                )
                .returning({ id: projectContentTranslationTable.id });
            return rows.length;
        },
        readBatch: async (db) =>
            rowsWithHtml(
                await db
                    .select({
                        id: projectContentTranslationTable.id,
                        html: projectContentTranslationTable.translatedBody,
                    })
                    .from(projectContentTranslationTable)
                    .where(
                        and(
                            isNull(projectContentTranslationTable.translatedBodyPlainText),
                            isNotNull(projectContentTranslationTable.translatedBody),
                        ),
                    )
                    .orderBy(asc(projectContentTranslationTable.id))
                    .limit(BATCH_SIZE),
            ),
        updatePlainText: async (db, row) => {
            await db
                .update(projectContentTranslationTable)
                .set({ translatedBodyPlainText: htmlToCountedText(row.html) })
                .where(
                    and(
                        eq(projectContentTranslationTable.id, row.id),
                        eq(projectContentTranslationTable.translatedBody, row.html),
                        isNull(projectContentTranslationTable.translatedBodyPlainText),
                    ),
                );
        },
    },
    {
        label: "opinion content translations",
        clearStalePlainText: noopClearStalePlainText,
        readBatch: async (db) =>
            rowsWithHtml(
                await db
                    .select({
                        id: opinionContentTranslationTable.id,
                        html: opinionContentTranslationTable.translatedContent,
                    })
                    .from(opinionContentTranslationTable)
                    .where(
                        and(
                            isNull(
                                opinionContentTranslationTable.translatedContentPlainText,
                            ),
                            isNotNull(opinionContentTranslationTable.translatedContent),
                        ),
                    )
                    .orderBy(asc(opinionContentTranslationTable.id))
                    .limit(BATCH_SIZE),
            ),
        updatePlainText: async (db, row) => {
            await db
                .update(opinionContentTranslationTable)
                .set({ translatedContentPlainText: htmlToCountedText(row.html) })
                .where(
                    and(
                        eq(opinionContentTranslationTable.id, row.id),
                        eq(opinionContentTranslationTable.translatedContent, row.html),
                        isNull(
                            opinionContentTranslationTable.translatedContentPlainText,
                        ),
                    ),
                );
        },
    },
    {
        label: "ranking item content translations",
        clearStalePlainText: async (db) => {
            const rows = await db
                .update(rankingItemContentTranslationTable)
                .set({ translatedBodyPlainText: null })
                .where(
                    and(
                        isNull(rankingItemContentTranslationTable.translatedBodyHtml),
                        isNotNull(
                            rankingItemContentTranslationTable.translatedBodyPlainText,
                        ),
                    ),
                )
                .returning({ id: rankingItemContentTranslationTable.id });
            return rows.length;
        },
        readBatch: async (db) =>
            rowsWithHtml(
                await db
                    .select({
                        id: rankingItemContentTranslationTable.id,
                        html: rankingItemContentTranslationTable.translatedBodyHtml,
                    })
                    .from(rankingItemContentTranslationTable)
                    .where(
                        and(
                            isNull(
                                rankingItemContentTranslationTable.translatedBodyPlainText,
                            ),
                            isNotNull(
                                rankingItemContentTranslationTable.translatedBodyHtml,
                            ),
                        ),
                    )
                    .orderBy(asc(rankingItemContentTranslationTable.id))
                    .limit(BATCH_SIZE),
            ),
        updatePlainText: async (db, row) => {
            await db
                .update(rankingItemContentTranslationTable)
                .set({ translatedBodyPlainText: htmlToCountedText(row.html) })
                .where(
                    and(
                        eq(rankingItemContentTranslationTable.id, row.id),
                        eq(
                            rankingItemContentTranslationTable.translatedBodyHtml,
                            row.html,
                        ),
                        isNull(
                            rankingItemContentTranslationTable.translatedBodyPlainText,
                        ),
                    ),
                );
        },
    },
];

function requireBackfillEnv({ env }: { env: NodeJS.ProcessEnv }): void {
    const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !isNonEmptyString(env[key]));

    if (missingKeys.length === 0) {
        return;
    }

    throw new Error(
        [
            "[RichTextPlainTextBackfill] Missing required env var(s):",
            missingKeys.map((key) => `- ${key}`).join("\n"),
            "",
            "Expected env block:",
            REQUIRED_ENV_EXAMPLE,
        ].join("\n"),
    );
}

function buildRankingItemLanguageDetectionCorpus({
    title,
    bodyPlainText,
}: {
    title: string;
    bodyPlainText: string | null;
}): string {
    return [title, bodyPlainText]
        .map((text) => text?.trim() ?? "")
        .filter((text) => text.length > 0)
        .join("\n\n");
}

async function backfillTarget({
    db,
    target,
}: {
    db: Db;
    target: BackfillTarget;
}): Promise<number> {
    const clearedCount = await target.clearStalePlainText(db);
    if (clearedCount > 0) {
        log.info(
            `[RichTextPlainTextBackfill] ${target.label}: cleared ${String(clearedCount)} stale plain-text row(s)`,
        );
    }

    let updatedCount = 0;
    for (;;) {
        const rows = await target.readBatch(db);

        if (rows.length === 0) {
            return updatedCount;
        }

        for (const row of rows) {
            await target.updatePlainText(db, row);
        }

        updatedCount += rows.length;
        log.info(
            `[RichTextPlainTextBackfill] ${target.label}: updated ${String(updatedCount)} row(s)`,
        );
    }
}

async function backfillRankingItemLanguageMetadata({
    db,
    googleCloudCredentials,
}: {
    db: Db;
    googleCloudCredentials: GoogleCloudCredentials;
}): Promise<number> {
    let processedCount = 0;
    let lastSeenId = 0;
    for (;;) {
        const rows: RankingItemLanguageBackfillRow[] = await db
            .select({
                id: rankingItemContentTable.id,
                title: rankingItemContentTable.title,
                bodyPlainText: rankingItemContentTable.bodyPlainText,
            })
            .from(rankingItemContentTable)
            .where(
                and(
                    gt(rankingItemContentTable.id, lastSeenId),
                    isNull(rankingItemContentTable.sourceLanguageProvider),
                    isNull(rankingItemContentTable.sourceRawLanguageCode),
                ),
            )
            .orderBy(asc(rankingItemContentTable.id))
            .limit(BATCH_SIZE);

        if (rows.length === 0) {
            return processedCount;
        }

        for (const row of rows) {
            lastSeenId = row.id;
            const corpus = buildRankingItemLanguageDetectionCorpus({
                title: row.title,
                bodyPlainText: row.bodyPlainText,
            });
            const sourceLanguageMetadata = await resolveContentLanguageMetadata({
                text: corpus,
                googleText: corpus,
                googleCloudCredentials,
                useGoogleLanguageDetection: true,
            });

            await db
                .update(rankingItemContentTable)
                .set(contentLanguageMetadataUpdateValues(sourceLanguageMetadata))
                .where(
                    and(
                        eq(rankingItemContentTable.id, row.id),
                        isNull(rankingItemContentTable.sourceLanguageProvider),
                        isNull(rankingItemContentTable.sourceRawLanguageCode),
                    ),
                );
        }

        processedCount += rows.length;
        log.info(
            `[RichTextPlainTextBackfill] ranking item language metadata: processed ${String(processedCount)} row(s)`,
        );
    }
}

async function main(): Promise<void> {
    requireBackfillEnv({ env: process.env });
    const config = sharedConfigSchema.parse(process.env);
    const googleCloudCredentials = await initializeGoogleCloudCredentials({
        googleCloudServiceAccountAwsSecretKey: undefined,
        awsSecretRegion: undefined,
        googleApplicationCredentialsPath: config.GOOGLE_APPLICATION_CREDENTIALS,
        googleCloudTranslationLocation: config.GOOGLE_CLOUD_TRANSLATION_LOCATION,
        googleCloudTranslationEndpoint: config.GOOGLE_CLOUD_TRANSLATION_ENDPOINT,
        log,
    });
    const client = await createPostgresClient(config, log);
    const db = drizzle(client);

    try {
        for (const target of targets) {
            const updatedCount = await backfillTarget({ db, target });
            log.info(
                `[RichTextPlainTextBackfill] ${target.label}: completed with ${String(updatedCount)} row(s) updated`,
            );
        }
        const processedLanguageMetadataCount =
            await backfillRankingItemLanguageMetadata({
                db,
                googleCloudCredentials,
            });
        log.info(
            `[RichTextPlainTextBackfill] ranking item language metadata: completed with ${String(processedLanguageMetadataCount)} row(s) processed`,
        );
    } finally {
        await client.end({ timeout: 5 });
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
