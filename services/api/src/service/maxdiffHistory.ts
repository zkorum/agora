import {
    and,
    eq,
    inArray,
    isNull,
    type ExtractTablesWithRelations,
} from "drizzle-orm";
import type { PostgresJsTransaction } from "drizzle-orm/postgres-js";
import { maxdiffComparisonTable } from "@/shared-backend/schema.js";
import type { MaxDiffComparison } from "@/shared/types/zod.js";

type StoredComparison = typeof maxdiffComparisonTable.$inferSelect;
type Transaction = PostgresJsTransaction<
    Record<string, never>,
    ExtractTablesWithRelations<Record<string, never>>
>;
// Keep bulk restores/edits below the driver's 65,534-parameter limit.
const COMPARISON_WRITE_BATCH_SIZE = 1_000;

function diffMaxdiffComparisons({
    stored,
    submitted,
}: {
    stored: Pick<
        StoredComparison,
        "id" | "position" | "bestSlugId" | "worstSlugId" | "candidateSet"
    >[];
    submitted: MaxDiffComparison[];
}) {
    const remaining = new Map(stored.map((row) => [row.position, row]));
    const inserts: { position: number; comparison: MaxDiffComparison }[] = [];
    for (const [position, comparison] of submitted.entries()) {
        const previous = remaining.get(position);
        if (
            previous?.bestSlugId === comparison.best &&
            previous.worstSlugId === comparison.worst &&
            previous.candidateSet.length === comparison.set.length &&
            previous.candidateSet.every((item) => comparison.set.includes(item))
        ) {
            remaining.delete(position);
        } else {
            inserts.push({ position, comparison });
        }
    }
    return {
        deletedIds: [...remaining.values()].map((row) => row.id),
        inserts,
    };
}

// The caller must hold the participant's maxdiff_result row lock throughout
// this transaction, so concurrent saves cannot diff against the same old history.
export async function syncMaxdiffComparisons({
    tx,
    resultId,
    comparisons,
    now,
}: {
    tx: Transaction;
    resultId: number;
    comparisons: MaxDiffComparison[];
    now: Date;
}): Promise<void> {
    const stored = await tx
        .select({
            id: maxdiffComparisonTable.id,
            position: maxdiffComparisonTable.position,
            bestSlugId: maxdiffComparisonTable.bestSlugId,
            worstSlugId: maxdiffComparisonTable.worstSlugId,
            candidateSet: maxdiffComparisonTable.candidateSet,
        })
        .from(maxdiffComparisonTable)
        .where(
            and(
                eq(maxdiffComparisonTable.maxdiffResultId, resultId),
                isNull(maxdiffComparisonTable.deletedAt),
            ),
        );
    const { deletedIds, inserts } = diffMaxdiffComparisons({
        stored,
        submitted: comparisons,
    });
    for (
        let offset = 0;
        offset < deletedIds.length;
        offset += COMPARISON_WRITE_BATCH_SIZE
    ) {
        await tx
            .update(maxdiffComparisonTable)
            .set({ deletedAt: now })
            .where(
                inArray(
                    maxdiffComparisonTable.id,
                    deletedIds.slice(
                        offset,
                        offset + COMPARISON_WRITE_BATCH_SIZE,
                    ),
                ),
            );
    }
    for (
        let offset = 0;
        offset < inserts.length;
        offset += COMPARISON_WRITE_BATCH_SIZE
    ) {
        await tx.insert(maxdiffComparisonTable).values(
            inserts
                .slice(offset, offset + COMPARISON_WRITE_BATCH_SIZE)
                .map(({ position, comparison }) => ({
                    maxdiffResultId: resultId,
                    position,
                    bestSlugId: comparison.best,
                    worstSlugId: comparison.worst,
                    candidateSet: comparison.set,
                })),
        );
    }
}
