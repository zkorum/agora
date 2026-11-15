import { and, eq, inArray, isNull } from "drizzle-orm";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import { comparisonAnswerTable } from "@/shared-backend/schema.js";
import type { ComparisonAnswer } from "@/shared/types/zod.js";

type StoredComparison = typeof comparisonAnswerTable.$inferSelect;
// Keep bulk restores/edits below the driver's 65,534-parameter limit.
const COMPARISON_WRITE_BATCH_SIZE = 1_000;

function diffComparisonAnswers({
    stored,
    submitted,
}: {
    stored: Pick<
        StoredComparison,
        "id" | "position" | "bestSlugId" | "worstSlugId" | "candidateSet"
    >[];
    submitted: ComparisonAnswer[];
}) {
    const remaining = new Map(stored.map((row) => [row.position, row]));
    const inserts: { position: number; comparison: ComparisonAnswer }[] = [];
    for (const [position, comparison] of submitted.entries()) {
        const previous = remaining.get(position);
        if (
            previous?.bestSlugId === comparison.best &&
            previous.worstSlugId === comparison.worst &&
            previous.candidateSet.length === comparison.set.length &&
            previous.candidateSet.every(
                (item, index) => comparison.set[index] === item,
            )
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

// The caller must hold the participant's comparison_response row lock throughout
// this transaction, so concurrent saves cannot diff against the same old history.
export async function syncComparisonAnswers({
    tx,
    responseId,
    comparisons,
    now,
}: {
    tx: PostgresTransaction;
    responseId: number;
    comparisons: ComparisonAnswer[];
    now: Date;
}): Promise<void> {
    const stored = await tx
        .select({
            id: comparisonAnswerTable.id,
            position: comparisonAnswerTable.position,
            bestSlugId: comparisonAnswerTable.bestSlugId,
            worstSlugId: comparisonAnswerTable.worstSlugId,
            candidateSet: comparisonAnswerTable.candidateSet,
        })
        .from(comparisonAnswerTable)
        .where(
            and(
                eq(comparisonAnswerTable.comparisonResponseId, responseId),
                isNull(comparisonAnswerTable.deletedAt),
            ),
        );
    const { deletedIds, inserts } = diffComparisonAnswers({
        stored,
        submitted: comparisons,
    });
    for (
        let offset = 0;
        offset < deletedIds.length;
        offset += COMPARISON_WRITE_BATCH_SIZE
    ) {
        await tx
            .update(comparisonAnswerTable)
            .set({ deletedAt: now })
            .where(
                inArray(
                    comparisonAnswerTable.id,
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
        await tx.insert(comparisonAnswerTable).values(
            inserts
                .slice(offset, offset + COMPARISON_WRITE_BATCH_SIZE)
                .map(({ position, comparison }) => ({
                    comparisonResponseId: responseId,
                    position,
                    bestSlugId: comparison.best,
                    worstSlugId: comparison.worst,
                    candidateSet: comparison.set,
                })),
        );
    }
}
