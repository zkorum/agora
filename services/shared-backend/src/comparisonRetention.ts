import { and, isNotNull, ne, sql } from "drizzle-orm";
import type { PostgresTransaction } from "./db.js";
import { rankingScoreTable } from "./schema.js";

/** Legacy blobs have no reviewed account-scope contract. Quarantine them globally
 * until classified/cleaned, including accounts with no surviving response rows.
 * SQL NULL and JSON null carry no account context.
 */
export async function hasUnclassifiedComparisonAccountContext(
    db: PostgresTransaction,
): Promise<boolean> {
    const rows = await db
        .select({ id: rankingScoreTable.id })
        .from(rankingScoreTable)
        .where(
            and(
                isNotNull(rankingScoreTable.userWeightsSnapshot),
                ne(rankingScoreTable.userWeightsSnapshot, sql`'null'::jsonb`),
            ),
        )
        .limit(1);
    return rows.length > 0;
}
