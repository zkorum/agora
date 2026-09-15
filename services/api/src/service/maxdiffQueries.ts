import { and, count, eq, sql, type SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { maxdiffResultTable } from "@/shared-backend/schema.js";

export function buildMaxdiffAppearanceCountQuery({
    db,
    conversationId,
    additionalFilter,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    additionalFilter?: SQL;
}) {
    const item = sql<string>`item_text`;
    return db
        .select({ itemSlugId: item, appearanceCount: count() })
        .from(maxdiffResultTable)
        .crossJoin(
            sql`jsonb_array_elements(${maxdiffResultTable.comparisons}) as comp`,
        )
        .crossJoin(sql`jsonb_array_elements_text(comp -> 'set') as item_text`)
        .where(
            and(
                eq(maxdiffResultTable.conversationId, conversationId),
                additionalFilter,
            ),
        )
        .groupBy(item);
}
