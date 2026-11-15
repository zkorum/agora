/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { qvStatsRefreshTable } from "./schema.js";

/** Call inside a QV source mutation transaction. Polling makes wakeup delivery optional. */
export async function scheduleQvStatsRefresh({
    db,
    conversationIds,
}: {
    db: PostgresJsDatabase;
    conversationIds: readonly number[];
}): Promise<void> {
    const ids = [...new Set(conversationIds)];
    if (ids.length === 0) return;
    for (let offset = 0; offset < ids.length; offset += 1000) {
        await db
            .insert(qvStatsRefreshTable)
            .values(
                ids
                    .slice(offset, offset + 1000)
                    .map((conversationId) => ({ conversationId })),
            );
    }
}
