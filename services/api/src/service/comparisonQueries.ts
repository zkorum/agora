import { and, count, eq, isNull, sql, type SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    comparisonAnswerTable,
    comparisonResponseTable,
} from "@/shared-backend/schema.js";

export function buildComparisonAppearanceCountQuery({
    db,
    conversationId,
    additionalFilter,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    additionalFilter?: SQL;
}) {
    // Expand PostgreSQL arrays from canonical active answers, not the JSON backup.
    const appearances = db.$with("comparison_appearances").as(
        db
            .select({
                itemSlugId:
                    sql<string>`unnest(${comparisonAnswerTable.candidateSet})`.as(
                        "item_slug_id",
                    ),
            })
            .from(comparisonAnswerTable)
            .innerJoin(
                comparisonResponseTable,
                eq(
                    comparisonResponseTable.id,
                    comparisonAnswerTable.comparisonResponseId,
                ),
            )
            .where(
                and(
                    eq(comparisonResponseTable.conversationId, conversationId),
                    isNull(comparisonResponseTable.detachedAt),
                    isNull(comparisonAnswerTable.deletedAt),
                    additionalFilter,
                ),
            ),
    );
    return db
        .with(appearances)
        .select({
            itemSlugId: appearances.itemSlugId,
            appearanceCount: count(),
        })
        .from(appearances)
        .groupBy(appearances.itemSlugId);
}
