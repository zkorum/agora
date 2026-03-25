/**
 * One-time startup backfill for MaxDiff snapshot scores.
 *
 * After the V0046.3 migration nullifies snapshots on completed/canceled items,
 * this function recomputes them using the new Bradley-Terry MLE algorithm.
 * Runs once on API startup, idempotent — becomes a no-op once all snapshots
 * are populated.
 *
 * Batches items by conversation to avoid N+1 queries.
 */

import {
    maxdiffItemTable,
    maxdiffResultTable,
} from "@/shared-backend/schema.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, inArray, isNotNull } from "drizzle-orm";
import { parseResultRows, computeScores } from "./maxdiff.js";
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
        `[MaxDiff Backfill] Recomputing snapshots for ${String(itemsToBackfill.length)} items`,
    );

    // Group items by conversation to batch queries
    const byConversation = new Map<
        number,
        { id: number; slugId: string }[]
    >();
    for (const item of itemsToBackfill) {
        const list = byConversation.get(item.conversationId) ?? [];
        list.push({ id: item.id, slugId: item.slugId });
        byConversation.set(item.conversationId, list);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const [conversationId, conversationItems] of byConversation) {
        try {
            // Fetch ALL items (including completed/canceled) + all results ONCE per conversation
            const allItems = await db
                .select({ slugId: maxdiffItemTable.slugId })
                .from(maxdiffItemTable)
                .where(
                    and(
                        eq(maxdiffItemTable.conversationId, conversationId),
                        isNotNull(maxdiffItemTable.currentContentId),
                    ),
                );

            const items = allItems.map((r) => r.slugId);
            if (items.length < 2) continue;

            const allResults = await db
                .select({
                    ranking: maxdiffResultTable.ranking,
                    comparisons: maxdiffResultTable.comparisons,
                })
                .from(maxdiffResultTable)
                .where(
                    eq(maxdiffResultTable.conversationId, conversationId),
                );

            const { perUserComparisons, participantCounts } = parseResultRows({
                rows: allResults,
                items,
            });
            const scored = computeScores({
                perUserComparisons,
                items,
                participantCounts,
            });

            // Compute snapshot for each item in this conversation
            for (const item of conversationItems) {
                const itemScore = scored.find(
                    (s) => s.itemSlugId === item.slugId,
                );
                if (itemScore === undefined) continue;

                const rank = scored.indexOf(itemScore) + 1;
                await db
                    .update(maxdiffItemTable)
                    .set({
                        snapshotScore: itemScore.score,
                        snapshotRank: rank,
                        snapshotParticipantCount: itemScore.participantCount,
                    })
                    .where(eq(maxdiffItemTable.id, item.id));
                successCount++;
            }
        } catch (error) {
            log.error(
                error,
                `[MaxDiff Backfill] Failed for conversation ${String(conversationId)}`,
            );
            errorCount += conversationItems.length;
        }
    }

    log.info(
        `[MaxDiff Backfill] Complete: ${String(successCount)} succeeded, ${String(errorCount)} failed`,
    );
}
