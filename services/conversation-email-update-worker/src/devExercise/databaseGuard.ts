import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";
import { exerciseFixtureSchema } from "./schemas.js";

const MARKER_NAME = "dedicated_conversation_email_update_exercise_database";
const markerRowSchema = z.object({ markerValue: z.string() });
const databaseRowSchema = z.object({ databaseName: z.string() });
const targetReservationOwnerSchema = z.object({
    conversationId: z.number().int().positive(),
    namespace: z.string(),
    fixtureId: z.uuid(),
    markerValue: z.string(),
});
const targetReservationRowSchema = z.discriminatedUnion("state", [
    targetReservationOwnerSchema.extend({
        state: z.literal("preparing"),
        fixture: z.null(),
    }),
    targetReservationOwnerSchema.extend({
        state: z.enum(["prepared", "cleaned"]),
        fixture: exerciseFixtureSchema,
    }),
]);

interface TargetReservationParams {
    db: PostgresJsDatabase;
    conversationId: number;
    namespace: string;
    fixtureId: string;
    markerValue: string;
}

type TargetReservation = z.infer<typeof targetReservationRowSchema>;

interface TargetReservationOwnerParams {
    db: PostgresJsDatabase;
    namespace: string;
    fixtureId: string;
    markerValue: string;
}

export async function assertDatabaseName({
    db,
    expectedDatabaseName,
}: {
    db: PostgresJsDatabase;
    expectedDatabaseName: string;
}): Promise<void> {
    const rows = await db.execute(
        sql<{
            databaseName: string;
        }>`select current_database() as "databaseName"`,
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
        create table if not exists conversation_email_update_dev_exercise_target_reservation (
            conversation_id integer primary key,
            namespace text not null unique,
            fixture_id uuid not null unique,
            marker_value text not null,
            reservation_state text not null default 'preparing'
                check (reservation_state in ('preparing', 'prepared', 'cleaned')),
            fixture jsonb,
            reserved_at timestamp(0) not null default now()
        )
    `);
    await db.execute(sql`
        alter table conversation_email_update_dev_exercise_target_reservation
        add column if not exists reservation_state text not null default 'preparing'
    `);
    await db.execute(sql`
        alter table conversation_email_update_dev_exercise_target_reservation
        add column if not exists fixture jsonb
    `);
    await db.execute(sql`
        insert into conversation_email_update_dev_exercise_database_marker
            (marker_name, marker_value)
        values (${MARKER_NAME}, ${markerValue})
        on conflict (marker_name) do nothing
    `);
    await assertExerciseDatabaseMarkerValue({ db, markerValue });
}

async function assertExerciseDatabaseMarkerValue({
    db,
    markerValue,
}: {
    db: PostgresJsDatabase;
    markerValue: string;
}): Promise<void> {
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

async function readExerciseTargetReservation({
    db,
    conversationId,
}: Pick<TargetReservationParams, "db" | "conversationId">) {
    const rows = await db.execute(sql<{
        conversationId: number;
        namespace: string;
        fixtureId: string;
        markerValue: string;
        state: string;
        fixture: unknown;
    }>`
        select
            conversation_id as "conversationId",
            namespace,
            fixture_id as "fixtureId",
            marker_value as "markerValue",
            reservation_state as state,
            fixture
        from conversation_email_update_dev_exercise_target_reservation
        where conversation_id = ${conversationId}
    `);
    return targetReservationRowSchema.safeParse(rows.at(0));
}

export async function readOwnedExerciseTargetReservation({
    db,
    namespace,
    fixtureId,
    markerValue,
}: TargetReservationOwnerParams): Promise<TargetReservation | undefined> {
    const rows = await db.execute<{
        conversationId: number;
        namespace: string;
        fixtureId: string;
        markerValue: string;
        state: string;
        fixture: unknown;
    }>(sql`
        select
            conversation_id as "conversationId",
            namespace,
            fixture_id as "fixtureId",
            marker_value as "markerValue",
            reservation_state as state,
            fixture
        from conversation_email_update_dev_exercise_target_reservation
        where namespace = ${namespace}
           or fixture_id = ${fixtureId}
    `);
    if (rows.length === 0) return undefined;
    const reservation = targetReservationRowSchema.safeParse(
        rows.length === 1 ? rows.at(0) : undefined,
    );
    if (
        !reservation.success ||
        reservation.data.namespace !== namespace ||
        reservation.data.fixtureId !== fixtureId ||
        reservation.data.markerValue !== markerValue
    ) {
        throw new Error(
            "Target conversation reservation does not match the guarded fixture",
        );
    }
    return reservation.data;
}

export async function acquireExerciseTargetReservation(
    params: TargetReservationParams,
): Promise<void> {
    await params.db.execute(sql`
        insert into conversation_email_update_dev_exercise_target_reservation
            (conversation_id, namespace, fixture_id, marker_value)
        values (
            ${params.conversationId},
            ${params.namespace},
            ${params.fixtureId},
            ${params.markerValue}
        )
        on conflict do nothing
    `);
    const reservation = await readExerciseTargetReservation(params);
    if (
        !reservation.success ||
        reservation.data.namespace !== params.namespace ||
        reservation.data.fixtureId !== params.fixtureId ||
        reservation.data.markerValue !== params.markerValue ||
        reservation.data.state !== "preparing"
    ) {
        throw new Error(
            `Conversation ${params.conversationId.toString()} is reserved by another development exercise`,
        );
    }
}

export async function assertExerciseTargetReservation(
    params: TargetReservationParams,
): Promise<TargetReservation> {
    const reservation = await readExerciseTargetReservation(params);
    if (
        !reservation.success ||
        reservation.data.namespace !== params.namespace ||
        reservation.data.fixtureId !== params.fixtureId ||
        reservation.data.markerValue !== params.markerValue
    ) {
        throw new Error(
            "Target conversation reservation does not match the guarded fixture",
        );
    }
    return reservation.data;
}

export async function markExerciseTargetReservationPrepared({
    fixture,
    ...params
}: TargetReservationParams & {
    fixture: z.infer<typeof exerciseFixtureSchema>;
}): Promise<void> {
    const updated = await params.db.execute<{ conversationId: number }>(sql`
        update conversation_email_update_dev_exercise_target_reservation
        set reservation_state = 'prepared',
            fixture = ${JSON.stringify(fixture)}::jsonb
        where conversation_id = ${params.conversationId}
          and namespace = ${params.namespace}
          and fixture_id = ${params.fixtureId}
          and marker_value = ${params.markerValue}
          and reservation_state = 'preparing'
          and fixture is null
        returning conversation_id as "conversationId"
    `);
    if (updated.length !== 1) {
        throw new Error(
            "Refusing to prepare a target reservation not owned by this fixture",
        );
    }
}

export async function markExerciseTargetReservationCleaned(
    params: TargetReservationParams,
): Promise<void> {
    const updated = await params.db.execute<{ conversationId: number }>(sql`
        update conversation_email_update_dev_exercise_target_reservation
        set reservation_state = 'cleaned'
        where conversation_id = ${params.conversationId}
          and namespace = ${params.namespace}
          and fixture_id = ${params.fixtureId}
          and marker_value = ${params.markerValue}
          and reservation_state = 'prepared'
        returning conversation_id as "conversationId"
    `);
    if (updated.length === 1) return;
    const reservation = await assertExerciseTargetReservation(params);
    if (reservation.state !== "cleaned") {
        throw new Error(
            "Refusing to clean a target reservation not owned by this fixture",
        );
    }
}

export async function releaseExerciseTargetReservation(
    params: TargetReservationParams,
): Promise<void> {
    const deleted = await params.db.execute(sql<{ conversationId: number }>`
        delete from conversation_email_update_dev_exercise_target_reservation
        where conversation_id = ${params.conversationId}
          and namespace = ${params.namespace}
          and fixture_id = ${params.fixtureId}
          and marker_value = ${params.markerValue}
          and reservation_state = 'cleaned'
        returning conversation_id as "conversationId"
    `);
    if (deleted.length !== 1) {
        throw new Error(
            "Refusing to release a target reservation not owned by this fixture",
        );
    }
}

export async function finalizeExerciseTargetReservation(
    params: TargetReservationOwnerParams,
): Promise<void> {
    const reservation = await readOwnedExerciseTargetReservation(params);
    if (reservation === undefined) return;
    if (reservation.state !== "cleaned") {
        throw new Error(
            "Refusing to release a target reservation before cleanup completes",
        );
    }
    try {
        await releaseExerciseTargetReservation({
            ...params,
            conversationId: reservation.conversationId,
        });
    } catch (error: unknown) {
        const current = await readOwnedExerciseTargetReservation(params);
        if (current !== undefined) throw error;
    }
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
    await assertExerciseDatabaseMarkerValue({ db, markerValue });
}
