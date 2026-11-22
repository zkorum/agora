/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { and, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresTransaction, ReplicaDatabase } from "./db.js";
import {
    comparisonInputBaselineTable,
    rankingConversationStatsSnapshotTable,
    rankingInputSnapshotTable,
    rankingScoreTable,
} from "./schema.js";

const baselineInput = alias(
    rankingInputSnapshotTable,
    "complete_comparison_input",
);
const completeBaseline = alias(
    comparisonInputBaselineTable,
    "complete_comparison_baseline",
);

type ComparisonInputBaselineResolution =
    | {
          status: "available";
          inputSnapshotId: string;
          baselineInputSnapshotId: string;
          comparisonMethod: "bws" | "pairwise";
          participantCount: number;
          itemCount: number;
          answerCount: number;
      }
    | {
          status: "unsupported";
          reason:
              | "missing_publication"
              | "missing_numerical_evidence"
              | "missing_complete_baseline";
      };

/** Reader routing/authorization belongs to the caller. Never infer a legacy
 * baseline from current participation or from an apparently unfiltered result.
 */
export async function resolveRetainedComparisonBaseline({
    db,
    conversationId,
    statsSnapshotId,
}: {
    db: ReplicaDatabase;
    conversationId: number;
    statsSnapshotId: number;
}): Promise<ComparisonInputBaselineResolution> {
    const rows = await db
        .select({
            input: {
                id: rankingInputSnapshotTable.id,
                comparisonMethod: rankingInputSnapshotTable.comparisonMethod,
                participantCount: rankingInputSnapshotTable.participantCount,
                itemCount: rankingInputSnapshotTable.itemCount,
                answerCount: rankingInputSnapshotTable.answerCount,
            },
            baseline: { id: baselineInput.id },
            certificate: { id: completeBaseline.inputSnapshotId },
        })
        .from(rankingConversationStatsSnapshotTable)
        .leftJoin(rankingInputSnapshotTable, retainedComparisonInputCondition())
        .leftJoin(
            comparisonInputBaselineTable,
            and(
                eq(
                    comparisonInputBaselineTable.inputSnapshotId,
                    rankingInputSnapshotTable.id,
                ),
                eq(comparisonInputBaselineTable.conversationId, conversationId),
            ),
        )
        .leftJoin(
            baselineInput,
            and(
                eq(
                    baselineInput.id,
                    comparisonInputBaselineTable.baselineInputSnapshotId,
                ),
                eq(baselineInput.conversationId, conversationId),
                isNotNull(baselineInput.sealedAt),
            ),
        )
        .leftJoin(
            completeBaseline,
            and(
                eq(completeBaseline.inputSnapshotId, baselineInput.id),
                eq(completeBaseline.baselineInputSnapshotId, baselineInput.id),
            ),
        )
        .where(
            and(
                eq(rankingConversationStatsSnapshotTable.id, statsSnapshotId),
                eq(
                    rankingConversationStatsSnapshotTable.conversationId,
                    conversationId,
                ),
                isNull(rankingConversationStatsSnapshotTable.deletedAt),
            ),
        )
        .limit(1);
    const row = rows.at(0);
    if (row === undefined)
        return { status: "unsupported", reason: "missing_publication" };
    if (row.input === null)
        return { status: "unsupported", reason: "missing_numerical_evidence" };
    if (row.baseline === null || row.certificate === null)
        return { status: "unsupported", reason: "missing_complete_baseline" };
    return {
        status: "available",
        inputSnapshotId: row.input.id,
        baselineInputSnapshotId: row.baseline.id,
        comparisonMethod: row.input.comparisonMethod,
        participantCount: row.input.participantCount,
        itemCount: row.input.itemCount,
        answerCount: row.input.answerCount,
    };
}

/** Reused closure evidence keeps its original publication identity. */
export function retainedComparisonInputCondition() {
    return and(
        eq(
            rankingInputSnapshotTable.conversationId,
            rankingConversationStatsSnapshotTable.conversationId,
        ),
        isNotNull(rankingInputSnapshotTable.sealedAt),
        or(
            eq(
                rankingInputSnapshotTable.statsSnapshotId,
                rankingConversationStatsSnapshotTable.id,
            ),
            eq(
                rankingInputSnapshotTable.id,
                rankingConversationStatsSnapshotTable.reusedInputSnapshotId,
            ),
        ),
    );
}

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
