import {
    and,
    count,
    eq,
    inArray,
    isNotNull,
    isNull,
    or,
    sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    conversationTable,
    gatheringConfigTable,
    gatheringResponseTable,
    projectTable,
} from "@/shared-backend/schema.js";
import {
    gatheringOwnResponseCondition,
    gatheringProjectCapabilityCondition,
    gatheringResponseEligibility,
} from "./gatheringEligibility.js";

interface GatheringDisplayCounts {
    responseCount: number;
    participantCount: number;
}

/** Parent visibility, project authorization and response counts share one primary snapshot. */
export async function fetchGatheringDisplayCounts({
    db,
    conversationIds,
    userId,
}: {
    db: PostgresJsDatabase;
    conversationIds: number[];
    userId: string | undefined;
}): Promise<Map<number, GatheringDisplayCounts>> {
    if (conversationIds.length === 0) return new Map();
    const reader = getPrimaryDatabase(db);
    const rows = await reader
        .select({
            conversationId: conversationTable.id,
            responseCount: count(gatheringResponseTable.id),
            // PostgreSQL's filtered count distinguishes real participants from seeds and empty LEFT JOINs.
            participantCount:
                sql<number>`count(*) filter (where ${eq(gatheringResponseTable.isSeed, false)})`.mapWith(
                    Number,
                ),
        })
        .from(conversationTable)
        .innerJoin(
            gatheringConfigTable,
            eq(gatheringConfigTable.id, conversationTable.gatheringConfigId),
        )
        .innerJoin(
            projectTable,
            and(
                eq(projectTable.id, conversationTable.projectId),
                isNull(projectTable.deletedAt),
            ),
        )
        .leftJoin(
            gatheringResponseTable,
            and(
                eq(gatheringResponseTable.configId, gatheringConfigTable.id),
                eq(gatheringResponseTable.conversationId, conversationTable.id),
                gatheringResponseEligibility(reader),
                isNull(gatheringResponseTable.moderation),
                or(
                    eq(gatheringConfigTable.responseVisibility, "everyone"),
                    gatheringOwnResponseCondition(userId),
                    gatheringProjectCapabilityCondition({
                        db: reader,
                        userId,
                        projectId: conversationTable.projectId,
                        capabilities: [
                            "conversation_edit",
                            "conversation_moderate",
                        ],
                    }),
                ),
            ),
        )
        .where(
            and(
                inArray(conversationTable.id, conversationIds),
                eq(conversationTable.conversationType, "gathering"),
                isNotNull(conversationTable.currentContentId),
                isNull(conversationTable.deletedAt),
                eq(conversationTable.isImporting, false),
            ),
        )
        .groupBy(conversationTable.id);
    return new Map(
        rows.map((row) => [
            row.conversationId,
            {
                responseCount: row.responseCount,
                participantCount: row.participantCount,
            },
        ]),
    );
}
