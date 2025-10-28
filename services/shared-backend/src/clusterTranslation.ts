/**
 * Shared cluster translation utilities
 * Used by both API (on-demand) and math-updater (pre-generation) services
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, inArray } from "drizzle-orm";
import { polisClusterTranslationTable } from "./schema.js";

/**
 * Fetch translations for multiple clusters in a specific language
 */
export async function getClusterTranslations(
    db: PostgresJsDatabase,
    clusterIds: number[],
    languageCode: string,
): Promise<Map<number, { aiLabel: string | null; aiSummary: string | null }>> {
    if (clusterIds.length === 0) {
        return new Map();
    }

    const results = await db
        .select({
            polisClusterId: polisClusterTranslationTable.polisClusterId,
            aiLabel: polisClusterTranslationTable.aiLabel,
            aiSummary: polisClusterTranslationTable.aiSummary,
        })
        .from(polisClusterTranslationTable)
        .where(
            and(
                inArray(
                    polisClusterTranslationTable.polisClusterId,
                    clusterIds,
                ),
                eq(polisClusterTranslationTable.languageCode, languageCode),
            ),
        );

    const translationMap = new Map<
        number,
        { aiLabel: string | null; aiSummary: string | null }
    >();

    for (const row of results) {
        translationMap.set(row.polisClusterId, {
            aiLabel: row.aiLabel,
            aiSummary: row.aiSummary,
        });
    }

    return translationMap;
}
