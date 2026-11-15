import { eq, inArray, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    realtimeEventDispatchStateTable,
    realtimeEventOutboxTable,
} from "@/shared-backend/schema.js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";

const BATCH_SIZE = 500;

export async function initializeRealtimeDispatch(
    db: PostgresJsDatabase,
): Promise<void> {
    await getPrimaryDatabase(db)
        .insert(realtimeEventDispatchStateTable)
        .values({ id: 1 })
        .onConflictDoNothing();
}

export async function dispatchRealtimeEventBatch(
    db: PostgresJsDatabase,
): Promise<number> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        // Only dispatchers serialize here. Business transactions never update
        // this record and can append events while a delivery batch is prepared.
        const states = await tx
            .select()
            .from(realtimeEventDispatchStateTable)
            .where(eq(realtimeEventDispatchStateTable.id, 1))
            .for("update", { skipLocked: true });
        const state = states.at(0);
        if (state === undefined) return 0;

        const pending = await tx
            .select({ id: realtimeEventOutboxTable.id })
            .from(realtimeEventOutboxTable)
            .where(isNull(realtimeEventOutboxTable.deliveryId))
            .orderBy(realtimeEventOutboxTable.id)
            .limit(BATCH_SIZE)
            .for("update", { skipLocked: true });
        if (pending.length === 0) return 0;

        const assignments = pending.map(
            (row, index) =>
                sql`WHEN ${realtimeEventOutboxTable.id} = ${row.id} THEN ${state.lastDeliveryId + index + 1}::int`,
        );
        await tx
            .update(realtimeEventOutboxTable)
            .set({
                deliveryId: sql`CASE ${sql.join(assignments, sql` `)} END`,
                // Transaction-start time can predate delivery by hours. Retention
                // starts at assignment, never at the business transaction's now().
                deliveredAt: sql`clock_timestamp()`,
            })
            .where(
                inArray(
                    realtimeEventOutboxTable.id,
                    pending.map((row) => row.id),
                ),
            );
        await tx
            .update(realtimeEventDispatchStateTable)
            .set({ lastDeliveryId: state.lastDeliveryId + pending.length })
            .where(eq(realtimeEventDispatchStateTable.id, 1));
        return pending.length;
    });
}

export async function fetchDeliveredEventUpperBound(
    db: PostgresJsDatabase,
): Promise<number> {
    // Delivery notifications schedule the next bounded batch. Do not drain an
    // unbounded backlog before the listeners can broadcast already-ready events.
    await dispatchRealtimeEventBatch(db);
    const states = await getPrimaryDatabase(db)
        .select({ id: realtimeEventDispatchStateTable.lastDeliveryId })
        .from(realtimeEventDispatchStateTable)
        .where(eq(realtimeEventDispatchStateTable.id, 1));
    const state = states.at(0);
    if (state === undefined)
        throw new Error("Realtime dispatch state is not initialized");
    return state.id;
}
