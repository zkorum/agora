#!/usr/bin/env npx tsx

import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { pathToFileURL } from "node:url";
import { createPostgresClient } from "../src/shared-backend/db.js";
import { sharedConfigSchema } from "../src/shared-backend/config.js";
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

const BATCH_SIZE = 500;

// One-time migration helper for the rich-text/plain-text split.
// Run manually with `pnpm backfill:rich-text-plain-text` after V0079.1 has
// copied legacy ranking rows into ranking_item* tables and before V0081 adds
// strict body/plain-text pair constraints. Keep this script until every
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

function rowsWithHtml(rows: { id: number; html: string | null }[]): BackfillRow[] {
    return rows.flatMap((row) =>
        row.html === null ? [] : [{ id: row.id, html: row.html }],
    );
}

const noopClearStalePlainText = (): Promise<number> => Promise.resolve(0);

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

async function main(): Promise<void> {
    const config = sharedConfigSchema.parse(process.env);
    const client = await createPostgresClient(config, log);
    const db = drizzle(client);

    try {
        for (const target of targets) {
            const updatedCount = await backfillTarget({ db, target });
            log.info(
                `[RichTextPlainTextBackfill] ${target.label}: completed with ${String(updatedCount)} row(s) updated`,
            );
        }
    } finally {
        await client.end({ timeout: 5 });
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
