import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { PostgresTransaction } from "./db.js";
import { deviceTable, retiredDeviceKeyTable, userTable } from "./schema.js";

/** Call under the account purge lock, before removing device/account rows. */
export async function retirePurgingAccountDeviceKeys({
    db,
    userId,
}: {
    db: PostgresTransaction;
    userId: string;
}): Promise<number> {
    const retired = await db
        .insert(retiredDeviceKeyTable)
        .select(
            db
                .select({
                    didWrite: deviceTable.didWrite,
                    retiredAt: sql<Date>`clock_timestamp() AT TIME ZONE 'UTC'`.as("retired_at"),
                })
                .from(deviceTable)
                .innerJoin(userTable, eq(userTable.id, deviceTable.userId))
                .where(
                    and(
                        eq(userTable.id, userId),
                        eq(userTable.isDeleted, true),
                        isNotNull(userTable.purgeStartedAt),
                    ),
                ),
        )
        .onConflictDoNothing();
    return retired.count;
}
