#!/usr/bin/env npx tsx

import { createPostgresClient } from "../src/shared-backend/db.js";
import { sharedConfigSchema } from "../src/shared-backend/config.js";
import { htmlToCountedText } from "../src/shared-app-api/html.js";

const BATCH_SIZE = 500;

const log = {
    info: (...args: unknown[]): void => {
        console.info(...args);
    },
    error: (...args: unknown[]): void => {
        console.error(...args);
    },
};

interface BackfillTarget {
    label: string;
    tableName: string;
    idColumn: string;
    htmlColumn: string;
    plainTextColumn: string;
}

const targets: BackfillTarget[] = [
    {
        label: "survey answers",
        tableName: "survey_answer",
        idColumn: "id",
        htmlColumn: "text_value_html",
        plainTextColumn: "text_value_plain_text",
    },
    {
        label: "ranking item content",
        tableName: "ranking_item_content",
        idColumn: "id",
        htmlColumn: "body",
        plainTextColumn: "body_plain_text",
    },
    {
        label: "conversation content",
        tableName: "conversation_content",
        idColumn: "id",
        htmlColumn: "body",
        plainTextColumn: "body_plain_text",
    },
    {
        label: "opinion content",
        tableName: "opinion_content",
        idColumn: "id",
        htmlColumn: "content",
        plainTextColumn: "content_plain_text",
    },
    {
        label: "project content",
        tableName: "project_content",
        idColumn: "id",
        htmlColumn: "body",
        plainTextColumn: "body_plain_text",
    },
    {
        label: "conversation content translations",
        tableName: "conversation_content_translation",
        idColumn: "id",
        htmlColumn: "translated_body",
        plainTextColumn: "translated_body_plain_text",
    },
    {
        label: "project content translations",
        tableName: "project_content_translation",
        idColumn: "id",
        htmlColumn: "translated_body",
        plainTextColumn: "translated_body_plain_text",
    },
    {
        label: "opinion content translations",
        tableName: "opinion_content_translation",
        idColumn: "id",
        htmlColumn: "translated_content",
        plainTextColumn: "translated_content_plain_text",
    },
    {
        label: "ranking item content translations",
        tableName: "ranking_item_content_translation",
        idColumn: "id",
        htmlColumn: "translated_body_html",
        plainTextColumn: "translated_body_plain_text",
    },
];

function assertSqlIdentifier(value: string): void {
    if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
        throw new Error(`Unsafe SQL identifier: ${value}`);
    }
}

function assertBackfillTarget(target: BackfillTarget): void {
    assertSqlIdentifier(target.tableName);
    assertSqlIdentifier(target.idColumn);
    assertSqlIdentifier(target.htmlColumn);
    assertSqlIdentifier(target.plainTextColumn);
}

async function backfillTarget({
    sql,
    target,
}: {
    sql: Awaited<ReturnType<typeof createPostgresClient>>;
    target: BackfillTarget;
}): Promise<number> {
    assertBackfillTarget(target);

    let updatedCount = 0;
    for (;;) {
        const rows = await sql<
            {
                id: number;
                html: string;
            }[]
        >`
            SELECT ${sql(target.idColumn)} AS id, ${sql(target.htmlColumn)} AS html
            FROM ${sql(target.tableName)}
            WHERE ${sql(target.plainTextColumn)} IS NULL
              AND ${sql(target.htmlColumn)} IS NOT NULL
            ORDER BY ${sql(target.idColumn)}
            LIMIT ${BATCH_SIZE}
        `;

        if (rows.length === 0) {
            return updatedCount;
        }

        await sql.begin(async (transaction) => {
            for (const row of rows) {
                await transaction`
                    UPDATE ${transaction(target.tableName)}
                    SET ${transaction(target.plainTextColumn)} = ${htmlToCountedText(row.html)}
                    WHERE ${transaction(target.idColumn)} = ${row.id}
                `;
            }
        });

        updatedCount += rows.length;
        log.info(
            `[RichTextPlainTextBackfill] ${target.label}: updated ${String(updatedCount)} row(s)`,
        );
    }
}

async function main(): Promise<void> {
    const config = sharedConfigSchema.parse(process.env);
    const sql = await createPostgresClient(config, log);

    try {
        for (const target of targets) {
            const updatedCount = await backfillTarget({ sql, target });
            log.info(
                `[RichTextPlainTextBackfill] ${target.label}: completed with ${String(updatedCount)} row(s) updated`,
            );
        }
    } finally {
        await sql.end({ timeout: 5 });
    }
}

await main();
