import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    getPrimaryDatabase,
    type PostgresTransaction,
} from "@/shared-backend/db.js";
import { realtimeEventDispatchStateTable } from "@/shared-backend/schema.js";

export interface RealtimeReplayWindow {
    floor: number;
    upperBound: number;
}

export async function lockRealtimeReplayWindow(
    db: PostgresTransaction,
): Promise<RealtimeReplayWindow> {
    const states = await db
        .select({
            floor: realtimeEventDispatchStateTable.replayFloorDeliveryId,
            upperBound: realtimeEventDispatchStateTable.lastDeliveryId,
        })
        .from(realtimeEventDispatchStateTable)
        .where(eq(realtimeEventDispatchStateTable.id, 1))
        .for("share");
    const state = states.at(0);
    if (state === undefined) {
        throw new Error("Realtime dispatch state is not initialized");
    }
    return state;
}

/** Pruning must lock/update this same singleton and remove only its delivered prefix. */
export async function readWithinRealtimeReplayWindow<T>({
    db,
    lastEventId,
    read,
}: {
    db: PostgresJsDatabase;
    lastEventId: number;
    read: (params: {
        db: PostgresTransaction;
        window: RealtimeReplayWindow;
    }) => Promise<T>;
}): Promise<
    | { status: "available"; value: T; window: RealtimeReplayWindow }
    | { status: "resync_required"; window: RealtimeReplayWindow }
> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const window = await lockRealtimeReplayWindow(tx);
        if (lastEventId < window.floor || lastEventId > window.upperBound) {
            return { status: "resync_required", window };
        }
        return {
            status: "available",
            value: await read({ db: tx, window }),
            window,
        };
    });
}
