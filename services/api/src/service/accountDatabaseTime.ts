import { httpErrors } from "@fastify/sensible";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import { userTable } from "@/shared-backend/schema.js";

export async function getAccountDatabaseTime({
    db,
    userId,
}: {
    db: PostgresTransaction;
    userId: string;
}): Promise<Date> {
    // Read wall time after account-lock waits, not at transaction start.
    const rows = await db
        .select({
            now: sql`clock_timestamp()`.mapWith((value: unknown) =>
                z.coerce.date().parse(value),
            ),
        })
        .from(userTable)
        .where(eq(userTable.id, userId));
    const row = rows.at(0);
    if (row === undefined) throw httpErrors.unauthorized("Account unavailable");
    return row.now;
}
