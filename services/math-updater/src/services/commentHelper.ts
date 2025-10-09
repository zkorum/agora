/**
 * Helper function from comment service
 * Extracted from services/api/src/service/comment.ts
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import { opinionTable, opinionContentTable } from "@/shared-backend/schema.js";

export type OpinionContentById = Record<number, string>;

/**
 * Get opinion contents by IDs
 */
export async function getOpinionContentsFromIds({
    db,
    opinionIds,
}: {
    db: PostgresJsDatabase;
    opinionIds: number[];
}): Promise<OpinionContentById> {
    const results = await db
        .select({
            opinionId: opinionTable.id,
            content: opinionContentTable.content,
        })
        .from(opinionTable)
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.id, opinionTable.currentContentId),
        )
        .where(inArray(opinionTable.id, opinionIds));

    if (results.length === 0) {
        throw new Error(`Cannot find opinionIds=${opinionIds.join(", ")}`);
    }

    const opinionContentById: OpinionContentById = {};
    for (const result of results) {
        opinionContentById[result.opinionId] = result.content;
    }

    return opinionContentById;
}
