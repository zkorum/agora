/**
 * Pure parsing functions for MaxDiff comparison data.
 * No DB access, no service dependencies — safe to import in tests.
 */

import { z } from "zod";
import {
    zodMaxdiffComparison,
    type MaxDiffComparison,
} from "@/shared/types/zod.js";

/**
 * Extract all comparisons from raw JSONB result rows, filtering to active items.
 * Also counts how many users compared each item (for participant counts).
 * Pure function, no DB access.
 */
export function parseResultRows({
    rows,
    items,
}: {
    rows: { ranking: unknown; comparisons: unknown }[];
    items: string[];
}): {
    perUserComparisons: MaxDiffComparison[][];
    participantCounts: Map<string, number>;
} {
    const itemSet = new Set(items);
    const perUserComparisons: MaxDiffComparison[][] = [];
    const itemParticipants = new Map<string, Set<number>>();
    for (const item of items) {
        itemParticipants.set(item, new Set());
    }

    for (let userIdx = 0; userIdx < rows.length; userIdx++) {
        const row = rows[userIdx];
        const comparisons = z
            .array(zodMaxdiffComparison)
            .parse(row.comparisons);

        const userComps: MaxDiffComparison[] = [];
        for (const comp of comparisons) {
            if (!itemSet.has(comp.best) || !itemSet.has(comp.worst)) continue;
            const filteredSet = comp.set.filter((id) => itemSet.has(id));
            if (filteredSet.length < 2) continue;

            userComps.push({
                best: comp.best,
                worst: comp.worst,
                set: filteredSet,
            });

            for (const item of filteredSet) {
                itemParticipants.get(item)?.add(userIdx);
            }
        }
        if (userComps.length > 0) {
            perUserComparisons.push(userComps);
        }
    }

    const participantCounts = new Map<string, number>();
    for (const [item, participants] of itemParticipants) {
        participantCounts.set(item, participants.size);
    }

    return { perUserComparisons, participantCounts };
}
