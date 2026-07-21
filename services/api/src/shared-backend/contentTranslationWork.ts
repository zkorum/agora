import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";

import {
    contentTranslationWorkTable,
    opinionContentTable,
    opinionTable,
} from "./schema.js";

export async function cancelPendingOpinionTranslationWorkForOpinion({
    db,
    opinionId,
    now,
}: {
    db: PostgresDatabase;
    opinionId: number;
    now: Date;
}): Promise<void> {
    const opinionContentIds = db
        .select({ id: opinionContentTable.id })
        .from(opinionContentTable)
        .where(eq(opinionContentTable.opinionId, opinionId));
    await db
        .update(contentTranslationWorkTable)
        .set({
            status: "failed",
            lastErrorCode: "ineligible_source",
            lastErrorMessage: "Opinion is hidden",
            failedAt: now,
            completedAt: null,
            updatedAt: now,
        })
        .where(
            and(
                eq(contentTranslationWorkTable.sourceKind, "opinion"),
                eq(contentTranslationWorkTable.status, "pending"),
                inArray(
                    contentTranslationWorkTable.opinionContentId,
                    opinionContentIds,
                ),
            ),
        );
}

export async function cancelPendingOpinionTranslationWorkForUser({
    db,
    userId,
    now,
}: {
    db: PostgresDatabase;
    userId: string;
    now: Date;
}): Promise<void> {
    const opinionContentIds = db
        .select({ id: opinionContentTable.id })
        .from(opinionContentTable)
        .innerJoin(
            opinionTable,
            eq(opinionTable.id, opinionContentTable.opinionId),
        )
        .where(eq(opinionTable.authorId, userId));
    await db
        .update(contentTranslationWorkTable)
        .set({
            status: "failed",
            lastErrorCode: "ineligible_source",
            lastErrorMessage: "Opinion author account is deleted",
            failedAt: now,
            completedAt: null,
            updatedAt: now,
        })
        .where(
            and(
                eq(contentTranslationWorkTable.sourceKind, "opinion"),
                eq(contentTranslationWorkTable.status, "pending"),
                inArray(
                    contentTranslationWorkTable.opinionContentId,
                    opinionContentIds,
                ),
            ),
        );
}
