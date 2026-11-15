import { userTable } from "./schema.js";
import type { PostgresTransaction } from "./db.js";
import { and, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";

type AccountLifecycleRow = Pick<
    typeof userTable.$inferSelect,
    | "isDeleted"
    | "deletedAt"
    | "deletionReason"
    | "deletionRequestedAt"
    | "recoverableUntil"
    | "purgeStartedAt"
>;

export type AccountLifecycle =
    | { state: "active" }
    | {
          state: "irreversible_deletion";
          deletedAt: Date | undefined;
          reason: "guest_merge" | "account_deletion" | "legacy";
      }
    | { state: "pending_deletion"; requestedAt: Date; recoverableUntil: Date }
    | { state: "purging"; startedAt: Date };

/** Legacy deletion does not acquire a recovery window through classification. */
export function getAccountLifecycle(
    row: AccountLifecycleRow,
): AccountLifecycle {
    if (!row.isDeleted) return { state: "active" };
    if (row.purgeStartedAt !== null)
        return { state: "purging", startedAt: row.purgeStartedAt };
    if (
        row.deletionRequestedAt !== null &&
        row.recoverableUntil !== null &&
        row.deletionReason === "account_deletion"
    ) {
        return {
            state: "pending_deletion",
            requestedAt: row.deletionRequestedAt,
            recoverableUntil: row.recoverableUntil,
        };
    }
    return {
        state: "irreversible_deletion",
        deletedAt: row.deletedAt ?? undefined,
        reason: row.deletionReason ?? "legacy",
    };
}

/** Caller must coordinate its durable purge task in the same writer transaction. */
export async function beginScheduledAccountPurge({
    db,
    userId,
}: {
    db: PostgresTransaction;
    userId: string;
}): Promise<boolean> {
    await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .for("no key update");
    // Wall time advances across waits; stored timestamp-without-zone fields use UTC.
    const claimed = await db
        .update(userTable)
        .set({ purgeStartedAt: sql`clock_timestamp() AT TIME ZONE 'UTC'` })
        .where(
            and(
                eq(userTable.id, userId),
                eq(userTable.isDeleted, true),
                eq(userTable.deletionReason, "account_deletion"),
                isNotNull(userTable.deletionRequestedAt),
                isNull(userTable.purgeStartedAt),
                lte(
                    userTable.recoverableUntil,
                    sql`clock_timestamp() AT TIME ZONE 'UTC'`,
                ),
            ),
        )
        .returning({ id: userTable.id });
    return claimed.length === 1;
}
