import { asc, and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    analysisSnapshotResultTable,
    conversationTable,
    conversationViewSnapshotCheckpointReasonTable,
    polisConversationConfigTable,
    conversationViewSnapshotTable,
    opinionGroupSpecTable,
} from "@/shared-backend/schema.js";
import { calculateConversationCounters } from "@/shared-backend/conversationCounters.js";
import type { FetchAnalysisCheckpointsResponse } from "@/shared/types/dto.js";
import {
    queueConversationAnalysisUpdatedEventsForViewSnapshots,
    queueConversationCommentStatsUpdatedEventsForViewSnapshots,
} from "./realtimeEventOutbox.js";

type ConversationViewSnapshotReason =
    | "analysis_completed"
    | "survey_refreshed"
    | "conversation_content_updated"
    | "conversation_lifecycle_updated";

type LifecycleCheckpointReason = "conversation_closed";

interface LatestSnapshotRefs {
    analysisSnapshotId: number | null;
    surveyAggregateSnapshotId: number | null;
    variantsEnabled: boolean;
}

export async function fetchAnalysisCheckpointsByConversationSlugId({
    db,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
}): Promise<FetchAnalysisCheckpointsResponse> {
    const rows = await db
        .select({
            conversationViewSnapshotId: conversationViewSnapshotTable.id,
            createdAt: conversationViewSnapshotTable.createdAt,
            activatedAt: conversationViewSnapshotTable.activatedAt,
            opinionCount: conversationViewSnapshotTable.opinionCount,
            voteCount: conversationViewSnapshotTable.voteCount,
            participantCount: conversationViewSnapshotTable.participantCount,
            totalOpinionCount: conversationViewSnapshotTable.totalOpinionCount,
            totalVoteCount: conversationViewSnapshotTable.totalVoteCount,
            totalParticipantCount:
                conversationViewSnapshotTable.totalParticipantCount,
            moderatedOpinionCount:
                conversationViewSnapshotTable.moderatedOpinionCount,
            hiddenOpinionCount:
                conversationViewSnapshotTable.hiddenOpinionCount,
            isClosed: conversationViewSnapshotTable.isClosed,
            reason: conversationViewSnapshotCheckpointReasonTable.reason,
            groupCount:
                conversationViewSnapshotCheckpointReasonTable.groupCount,
            previousGroupCount:
                conversationViewSnapshotCheckpointReasonTable.previousGroupCount,
            reasonParticipantCount:
                conversationViewSnapshotCheckpointReasonTable.participantCount,
            participantMilestone:
                conversationViewSnapshotCheckpointReasonTable.participantMilestone,
            reasonVoteCount:
                conversationViewSnapshotCheckpointReasonTable.voteCount,
            voteMilestone:
                conversationViewSnapshotCheckpointReasonTable.voteMilestone,
        })
        .from(conversationViewSnapshotCheckpointReasonTable)
        .innerJoin(
            conversationViewSnapshotTable,
            eq(
                conversationViewSnapshotTable.id,
                conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
            ),
        )
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationViewSnapshotTable.conversationId,
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                isNotNull(conversationViewSnapshotTable.activatedAt),
            ),
        )
        .orderBy(
            asc(conversationViewSnapshotTable.createdAt),
            asc(conversationViewSnapshotTable.id),
            asc(conversationViewSnapshotCheckpointReasonTable.id),
        );

    const checkpointsById = new Map<
        number,
        FetchAnalysisCheckpointsResponse[number]
    >();
    for (const row of rows) {
        if (row.activatedAt === null) {
            continue;
        }

        const checkpoint = checkpointsById.get(
            row.conversationViewSnapshotId,
        ) ?? {
            conversationViewSnapshotId: row.conversationViewSnapshotId,
            createdAt: row.createdAt,
            activatedAt: row.activatedAt,
            opinionCount: row.opinionCount,
            voteCount: row.voteCount,
            participantCount: row.participantCount,
            totalOpinionCount: row.totalOpinionCount,
            totalVoteCount: row.totalVoteCount,
            totalParticipantCount: row.totalParticipantCount,
            moderatedOpinionCount: row.moderatedOpinionCount,
            hiddenOpinionCount: row.hiddenOpinionCount,
            isClosed: row.isClosed,
            reasons: [],
        };

        checkpoint.reasons.push({
            reason: row.reason,
            groupCount: row.groupCount,
            previousGroupCount: row.previousGroupCount,
            participantCount: row.reasonParticipantCount,
            participantMilestone: row.participantMilestone,
            voteCount: row.reasonVoteCount,
            voteMilestone: row.voteMilestone,
        });
        checkpointsById.set(row.conversationViewSnapshotId, checkpoint);
    }

    return Array.from(checkpointsById.values());
}

function getCurrentOpinionGroupSpecIds(
    specRows: {
        id: number;
        key: string;
    }[],
): number[] {
    const seenKeys = new Set<string>();
    const specIds: number[] = [];

    for (const row of specRows) {
        if (seenKeys.has(row.key)) {
            continue;
        }
        seenKeys.add(row.key);
        specIds.push(row.id);
    }

    return specIds;
}

export async function createConversationViewSnapshotsFromCurrentState({
    db,
    conversationId,
    viewReason,
    lifecycleCheckpointReason,
    emitRealtimeEvent = false,
    emitCommentStatsRealtimeEvent = false,
    changedOpinionIds = [],
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    viewReason: ConversationViewSnapshotReason;
    lifecycleCheckpointReason?: LifecycleCheckpointReason;
    emitRealtimeEvent?: boolean;
    emitCommentStatsRealtimeEvent?: boolean;
    changedOpinionIds?: number[];
}): Promise<number> {
    const conversationRows = await db
        .select({
            currentContentId: conversationTable.currentContentId,
            isClosed: conversationTable.isClosed,
            preferredOpinionGroupCount:
                polisConversationConfigTable.preferredOpinionGroupCount,
        })
        .from(conversationTable)
        .leftJoin(
            polisConversationConfigTable,
            eq(
                polisConversationConfigTable.id,
                conversationTable.polisConfigId,
            ),
        )
        .where(eq(conversationTable.id, conversationId))
        .limit(1);

    if (conversationRows.length === 0) {
        throw new Error(
            `Cannot create conversation view snapshot for missing conversation ${String(conversationId)}`,
        );
    }

    const specRows = await db
        .select({
            id: opinionGroupSpecTable.id,
            key: opinionGroupSpecTable.key,
        })
        .from(opinionGroupSpecTable)
        .orderBy(
            opinionGroupSpecTable.key,
            desc(opinionGroupSpecTable.version),
        );
    const currentOpinionGroupSpecIds = getCurrentOpinionGroupSpecIds(specRows);
    if (currentOpinionGroupSpecIds.length === 0) {
        return 0;
    }

    const conversation = conversationRows[0];
    if (conversation.isClosed && lifecycleCheckpointReason === undefined)
        return 0;
    const counters = await calculateConversationCounters({
        db,
        conversationId,
    });

    const previousAnalysisRows = await db
        .selectDistinctOn([conversationViewSnapshotTable.opinionGroupSpecId], {
            opinionGroupSpecId:
                conversationViewSnapshotTable.opinionGroupSpecId,
            analysisSnapshotId:
                conversationViewSnapshotTable.analysisSnapshotId,
            surveyAggregateSnapshotId:
                conversationViewSnapshotTable.surveyAggregateSnapshotId,
            variantsEnabled: analysisSnapshotResultTable.variantsEnabled,
        })
        .from(conversationViewSnapshotTable)
        .innerJoin(
            analysisSnapshotResultTable,
            and(
                eq(
                    analysisSnapshotResultTable.analysisSnapshotId,
                    conversationViewSnapshotTable.analysisSnapshotId,
                ),
                eq(
                    analysisSnapshotResultTable.opinionGroupSpecId,
                    conversationViewSnapshotTable.opinionGroupSpecId,
                ),
            ),
        )
        .where(
            and(
                eq(
                    conversationViewSnapshotTable.conversationId,
                    conversationId,
                ),
                inArray(
                    conversationViewSnapshotTable.opinionGroupSpecId,
                    currentOpinionGroupSpecIds,
                ),
                isNotNull(conversationViewSnapshotTable.activatedAt),
                isNotNull(conversationViewSnapshotTable.analysisSnapshotId),
            ),
        )
        .orderBy(
            conversationViewSnapshotTable.opinionGroupSpecId,
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        );

    const latestSnapshotRefsBySpecId = new Map<number, LatestSnapshotRefs>();
    for (const row of previousAnalysisRows) {
        if (row.analysisSnapshotId === null) {
            continue;
        }
        latestSnapshotRefsBySpecId.set(row.opinionGroupSpecId, {
            analysisSnapshotId: row.analysisSnapshotId,
            surveyAggregateSnapshotId: row.surveyAggregateSnapshotId,
            variantsEnabled: row.variantsEnabled,
        });
    }

    const activatedAt = new Date();
    const shouldPreserveSurveyAggregate = viewReason !== "survey_refreshed";
    const insertedRows = await db
        .insert(conversationViewSnapshotTable)
        .values(
            currentOpinionGroupSpecIds.map((opinionGroupSpecId) => {
                const refs = latestSnapshotRefsBySpecId.get(opinionGroupSpecId);
                return {
                    conversationId,
                    opinionGroupSpecId,
                    analysisSnapshotId: refs?.analysisSnapshotId ?? null,
                    surveyAggregateSnapshotId: shouldPreserveSurveyAggregate
                        ? (refs?.surveyAggregateSnapshotId ?? null)
                        : null,
                    conversationContentId: conversation.currentContentId,
                    viewReason,
                    preferredOpinionGroupCount:
                        refs?.variantsEnabled === true
                            ? conversation.preferredOpinionGroupCount
                            : null,
                    isClosed: conversation.isClosed,
                    opinionCount: counters.opinionCount,
                    voteCount: counters.voteCount,
                    participantCount: counters.participantCount,
                    totalOpinionCount: counters.totalOpinionCount,
                    totalVoteCount: counters.totalVoteCount,
                    totalParticipantCount: counters.totalParticipantCount,
                    moderatedOpinionCount: counters.moderatedOpinionCount,
                    hiddenOpinionCount: counters.hiddenOpinionCount,
                    activatedAt:
                        refs === undefined ||
                        lifecycleCheckpointReason !== undefined
                            ? activatedAt
                            : null,
                };
            }),
        )
        .returning({
            id: conversationViewSnapshotTable.id,
            opinionGroupSpecId:
                conversationViewSnapshotTable.opinionGroupSpecId,
        });

    if (lifecycleCheckpointReason !== undefined) {
        await db.insert(conversationViewSnapshotCheckpointReasonTable).values(
            insertedRows.map((row) => ({
                conversationViewSnapshotId: row.id,
                conversationId,
                opinionGroupSpecId: row.opinionGroupSpecId,
                reason: lifecycleCheckpointReason,
            })),
        );
    }

    if (emitRealtimeEvent) {
        await queueConversationAnalysisUpdatedEventsForViewSnapshots({
            db,
            conversationViewSnapshotIds: insertedRows.map((row) => row.id),
        });
    }

    if (emitCommentStatsRealtimeEvent) {
        await queueConversationCommentStatsUpdatedEventsForViewSnapshots({
            db,
            conversationViewSnapshotIds: insertedRows.map((row) => row.id),
            changedOpinionIds,
        });
    }

    return currentOpinionGroupSpecIds.length;
}
