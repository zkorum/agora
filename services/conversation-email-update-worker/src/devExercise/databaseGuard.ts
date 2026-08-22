import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";

const MARKER_NAME = "dedicated_conversation_email_update_exercise_database";
const markerRowSchema = z.object({ markerValue: z.string() });
const databaseRowSchema = z.object({ databaseName: z.string() });

async function assertDatabaseName({
    db,
    expectedDatabaseName,
}: {
    db: PostgresJsDatabase;
    expectedDatabaseName: string;
}): Promise<void> {
    const rows = await db.execute(
        sql<{ databaseName: string }>`select current_database() as "databaseName"`,
    );
    const row = databaseRowSchema.parse(rows.at(0));
    if (row.databaseName !== expectedDatabaseName) {
        throw new Error(
            `Connected database ${row.databaseName} does not match guarded database ${expectedDatabaseName}`,
        );
    }
}

export async function initializeExerciseDatabaseMarker({
    db,
    expectedDatabaseName,
    markerValue,
}: {
    db: PostgresJsDatabase;
    expectedDatabaseName: string;
    markerValue: string;
}): Promise<void> {
    await assertDatabaseName({ db, expectedDatabaseName });
    await db.execute(sql`
        create table if not exists conversation_email_update_dev_exercise_database_marker (
            marker_name text primary key,
            marker_value text not null,
            initialized_at timestamp(0) not null default now()
        )
    `);
    await db.execute(sql`
        insert into conversation_email_update_dev_exercise_database_marker
            (marker_name, marker_value)
        values (${MARKER_NAME}, ${markerValue})
        on conflict (marker_name) do nothing
    `);
    await assertExerciseDatabaseMarker({
        db,
        expectedDatabaseName,
        markerValue,
    });
}

export async function assertExerciseDatabaseMarker({
    db,
    expectedDatabaseName,
    markerValue,
}: {
    db: PostgresJsDatabase;
    expectedDatabaseName: string;
    markerValue: string;
}): Promise<void> {
    await assertDatabaseName({ db, expectedDatabaseName });
    let rows;
    try {
        rows = await db.execute(sql<{ markerValue: string }>`
            select marker_value as "markerValue"
            from conversation_email_update_dev_exercise_database_marker
            where marker_name = ${MARKER_NAME}
        `);
    } catch (error: unknown) {
        throw new Error(
            "Database is not initialized for the Conversation Email Update development exercise",
            { cause: error },
        );
    }
    const parsed = markerRowSchema.safeParse(rows.at(0));
    if (!parsed.success || parsed.data.markerValue !== markerValue) {
        throw new Error(
            "Database development-exercise marker does not match the guarded manifest",
        );
    }
}
