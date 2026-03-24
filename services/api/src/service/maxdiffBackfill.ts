/**
 * One-time startup backfill for MaxDiff snapshot scores.
 *
 * After the V0046.3 migration nullifies snapshots on completed/canceled items,
 * this function recomputes them using the new Bradley-Terry MLE algorithm.
 * Runs once on API startup, idempotent — becomes a no-op once all snapshots
 * are populated.
 */

import { maxdiffItemTable } from "@/shared-backend/schema.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, inArray, isNotNull } from "drizzle-orm";
import { computeItemSnapshot } from "./maxdiff.js";
import { log } from "@/app.js";

export async function backfillMaxdiffSnapshots({
    db,
}: {
    db: PostgresDatabase;
}): Promise<void> {
    // Find all completed/canceled items with NULL snapshots
    const itemsToBackfill = await db
        .select({
            id: maxdiffItemTable.id,
            slugId: maxdiffItemTable.slugId,
            conversationId: maxdiffItemTable.conversationId,
        })
        .from(maxdiffItemTable)
        .where(
            and(
                inArray(maxdiffItemTable.lifecycleStatus, [
                    "completed",
                    "canceled",
                ]),
                isNull(maxdiffItemTable.snapshotScore),
                isNotNull(maxdiffItemTable.currentContentId),
            ),
        );

    if (itemsToBackfill.length === 0) {
        log.info(
            "[MaxDiff Backfill] No items need snapshot recomputation",
        );
        return;
    }

    log.info(
        `[MaxDiff Backfill] Recomputing snapshots for ${itemsToBackfill.length} items`,
    );

    let successCount = 0;
    let errorCount = 0;

    for (const item of itemsToBackfill) {
        try {
            const snapshot = await computeItemSnapshot({
                db,
                conversationId: item.conversationId,
                itemSlugId: item.slugId,
            });

            if (snapshot.snapshotScore !== null) {
                await db
                    .update(maxdiffItemTable)
                    .set({
                        snapshotScore: snapshot.snapshotScore,
                        snapshotRank: snapshot.snapshotRank,
                        snapshotParticipantCount:
                            snapshot.snapshotParticipantCount,
                    })
                    .where(eq(maxdiffItemTable.id, item.id));
                successCount++;
            }
        } catch (error) {
            log.error(
                error,
                `[MaxDiff Backfill] Failed to recompute snapshot for item ${item.slugId}`,
            );
            errorCount++;
        }
    }

    log.info(
        `[MaxDiff Backfill] Complete: ${successCount} succeeded, ${errorCount} failed`,
    );
}
