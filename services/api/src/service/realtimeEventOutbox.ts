import {
    and,
    desc,
    eq,
    gt,
    gte,
    inArray,
    isNotNull,
    isNull,
    lte,
    sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type pino from "pino";
import { z } from "zod";
import type { SharedConfigSchema } from "@/shared-backend/config.js";
import {
    createPostgresClient,
    getPrimaryDatabase,
} from "@/shared-backend/db.js";
import {
    conversationTable,
    conversationViewSnapshotCheckpointReasonTable,
    conversationViewSnapshotTable,
    analysisSnapshotResultTable,
    opinionGroupCandidateAssessmentTable,
    opinionGroupCandidateTable,
    opinionGroupVariantTable,
    opinionTable,
    realtimeEventOutboxTable,
    realtimeEventOutboxTopicTable,
} from "@/shared-backend/schema.js";
import type { SSEEventDataByType } from "@/shared/types/dto.js";
import {
    zodSSEContentTranslationUpdatedData,
    zodSSEConversationAnalysisUpdatedData,
} from "@/shared/types/sse.js";
import {
    zodEventSlug,
    zodParticipationMode,
    zodPreferredOpinionGroupCount,
} from "@/shared/types/zod.js";
import {
    buildContentTranslationTopic,
    buildProjectContentTranslationTopic,
    type RealtimeSSEManager,
} from "./realtimeSSE.js";

const REALTIME_EVENT_OUTBOX_CHANNEL = "realtime_event_outbox";
const RECENT_EVENT_CATCHUP_MS = 5 * 60 * 1000;
const RECENT_EVENT_CATCHUP_INTERVAL_MS = 30 * 1000;

const zodConversationCommentStatsUpdatedData = z.object({
    conversationSlugId: z.string().min(1),
    conversationViewSnapshotId: z.number().int().positive(),
    opinionCount: z.number().int().nonnegative(),
    voteCount: z.number().int().nonnegative(),
    participantCount: z.number().int().nonnegative(),
    totalOpinionCount: z.number().int().nonnegative(),
    totalVoteCount: z.number().int().nonnegative(),
    totalParticipantCount: z.number().int().nonnegative(),
    moderatedOpinionCount: z.number().int().nonnegative(),
    hiddenOpinionCount: z.number().int().nonnegative(),
    isClosed: z.boolean(),
    opinionVoteCounts: z
        .array(
            z
                .object({
                    opinionSlugId: z.string().min(1),
                    numParticipants: z.number().int().nonnegative(),
                    numAgrees: z.number().int().nonnegative(),
                    numDisagrees: z.number().int().nonnegative(),
                    numPasses: z.number().int().nonnegative(),
                })
                .strict(),
        )
        .default([]),
    timestamp: z.number().int().nonnegative(),
});

const zodConversationSettingsUpdatedData = z.object({
    conversationSlugId: z.string().min(1),
    settings: z
        .object({
            isIndexed: z.boolean(),
            participationMode: zodParticipationMode,
            requiresEventTicket: zodEventSlug.nullable(),
            aiLabelingEnabled: z.boolean(),
            preferredOpinionGroupCount: zodPreferredOpinionGroupCount,
            isClosed: z.boolean(),
        })
        .strict(),
    timestamp: z.number().int().nonnegative(),
});

const zodRealtimeEventOutboxNotification = z.object({
    id: z.number().int().positive(),
});

const zodLegacyContentTranslationUpdatedData = z
    .object({
        subject: z.record(z.string(), z.unknown()),
        targetLanguageCode: z.string(),
        status: z.enum(["completed", "failed"]),
        sourceVersion: z.uuid(),
        timestamp: z.number(),
    })
    .strict();

interface RealtimeEventOutboxBridge {
    start: () => Promise<void>;
    shutdown: () => Promise<void>;
}

type ListenerClient = Awaited<ReturnType<typeof createPostgresClient>>;

interface RealtimeEventOutboxRow {
    id: number;
    eventType: string;
    payload: unknown;
}

function parseContentTranslationUpdatedData(payload: unknown) {
    const current = zodSSEContentTranslationUpdatedData.safeParse(payload);
    if (current.success) {
        return current.data;
    }

    const legacy = zodLegacyContentTranslationUpdatedData.safeParse(payload);
    if (!legacy.success) {
        return undefined;
    }
    const normalized = zodSSEContentTranslationUpdatedData.safeParse({
        subject: {
            ...legacy.data.subject,
            sourceVersion: legacy.data.sourceVersion,
        },
        targetLanguageCode: legacy.data.targetLanguageCode,
        status: legacy.data.status,
        timestamp: legacy.data.timestamp,
    });
    return normalized.success ? normalized.data : undefined;
}

type RealtimeReplayEvent =
    | {
          id: number;
          event: "conversation_analysis_updated";
          data: SSEEventDataByType["conversation_analysis_updated"];
      }
    | {
          id: number;
          event: "conversation_comment_stats_updated";
          data: SSEEventDataByType["conversation_comment_stats_updated"];
      }
    | {
          id: number;
          event: "conversation_settings_updated";
          data: SSEEventDataByType["conversation_settings_updated"];
      }
    | {
          id: number;
          event: "content_translation_updated";
          data: SSEEventDataByType["content_translation_updated"];
      };

async function fetchDisplayableGroupCountsByViewSnapshotId({
    db,
    conversationViewSnapshotIds,
}: {
    db: PostgresJsDatabase;
    conversationViewSnapshotIds: number[];
}): Promise<Map<number, number[]>> {
    const uniqueViewSnapshotIds = Array.from(
        new Set(conversationViewSnapshotIds),
    );
    if (uniqueViewSnapshotIds.length === 0) {
        return new Map();
    }

    const rows = await db
        .select({
            conversationViewSnapshotId: conversationViewSnapshotTable.id,
            groupCount: opinionGroupVariantTable.groupCount,
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
        .innerJoin(
            opinionGroupCandidateTable,
            eq(
                opinionGroupCandidateTable.snapshotResultId,
                analysisSnapshotResultTable.id,
            ),
        )
        .innerJoin(
            opinionGroupVariantTable,
            eq(
                opinionGroupVariantTable.id,
                opinionGroupCandidateTable.opinionGroupVariantId,
            ),
        )
        .innerJoin(
            opinionGroupCandidateAssessmentTable,
            eq(
                opinionGroupCandidateAssessmentTable.candidateId,
                opinionGroupCandidateTable.id,
            ),
        )
        .where(
            and(
                inArray(
                    conversationViewSnapshotTable.id,
                    uniqueViewSnapshotIds,
                ),
                eq(analysisSnapshotResultTable.outcome, "success"),
                eq(opinionGroupCandidateTable.outcome, "success"),
                isNull(opinionGroupCandidateAssessmentTable.hiddenReason),
                isNotNull(opinionGroupCandidateAssessmentTable.selectionScore),
            ),
        )
        .orderBy(
            conversationViewSnapshotTable.id,
            opinionGroupVariantTable.groupCount,
        );

    const groupCountsByViewSnapshotId = new Map<number, number[]>();
    for (const row of rows) {
        const groupCounts =
            groupCountsByViewSnapshotId.get(row.conversationViewSnapshotId) ??
            [];
        groupCounts.push(row.groupCount);
        groupCountsByViewSnapshotId.set(
            row.conversationViewSnapshotId,
            groupCounts,
        );
    }
    return groupCountsByViewSnapshotId;
}

interface QueueConversationAnalysisUpdatedEventsForViewSnapshotsProps {
    db: PostgresJsDatabase;
    conversationViewSnapshotIds: number[];
}

interface QueueConversationCommentStatsUpdatedEventsForViewSnapshotsProps {
    db: PostgresJsDatabase;
    conversationViewSnapshotIds: number[];
    changedOpinionIds?: number[];
}

interface QueueConversationAnalysisUpdatedEventsForLatestViewSnapshotsProps {
    db: PostgresJsDatabase;
    conversationIds: number[];
}

interface QueueConversationSettingsUpdatedEventProps {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    settings: SSEEventDataByType["conversation_settings_updated"]["settings"];
}

type LiveOpinionVoteCount =
    SSEEventDataByType["conversation_comment_stats_updated"]["opinionVoteCounts"][number];

async function fetchLiveOpinionVoteCounts({
    db,
    opinionIds,
}: {
    db: PostgresJsDatabase;
    opinionIds: number[];
}): Promise<LiveOpinionVoteCount[]> {
    const uniqueOpinionIds = Array.from(new Set(opinionIds));
    if (uniqueOpinionIds.length === 0) {
        return [];
    }

    const rows = await db
        .select({
            opinionSlugId: opinionTable.slugId,
            numAgrees: opinionTable.numAgrees,
            numDisagrees: opinionTable.numDisagrees,
            numPasses: opinionTable.numPasses,
        })
        .from(opinionTable)
        .where(inArray(opinionTable.id, uniqueOpinionIds));

    return rows.map((row) => ({
        opinionSlugId: row.opinionSlugId,
        numParticipants: row.numAgrees + row.numDisagrees + row.numPasses,
        numAgrees: row.numAgrees,
        numDisagrees: row.numDisagrees,
        numPasses: row.numPasses,
    }));
}

export async function queueConversationSettingsUpdatedEvent({
    db,
    conversationSlugId,
    settings,
}: QueueConversationSettingsUpdatedEventProps): Promise<void> {
    const primaryDb = getPrimaryDatabase(db);
    const payload: SSEEventDataByType["conversation_settings_updated"] = {
        conversationSlugId,
        settings,
        timestamp: Date.now(),
    };

    await primaryDb.insert(realtimeEventOutboxTable).values({
        eventType: "conversation_settings_updated",
        payload,
    });
}

export async function queueConversationAnalysisUpdatedEventsForViewSnapshots({
    db,
    conversationViewSnapshotIds,
}: QueueConversationAnalysisUpdatedEventsForViewSnapshotsProps): Promise<void> {
    if (conversationViewSnapshotIds.length === 0) {
        return;
    }

    const primaryDb = getPrimaryDatabase(db);
    const rows = await primaryDb
        .select({
            conversationSlugId: conversationTable.slugId,
            conversationViewSnapshotId: conversationViewSnapshotTable.id,
            analysisSnapshotId:
                conversationViewSnapshotTable.analysisSnapshotId,
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
        })
        .from(conversationViewSnapshotTable)
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationViewSnapshotTable.conversationId,
            ),
        )
        .where(
            and(
                inArray(
                    conversationViewSnapshotTable.id,
                    conversationViewSnapshotIds,
                ),
                isNotNull(conversationViewSnapshotTable.activatedAt),
                isNotNull(conversationViewSnapshotTable.analysisSnapshotId),
            ),
        );

    const checkpointRows = await primaryDb
        .select({
            conversationViewSnapshotId:
                conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
        })
        .from(conversationViewSnapshotCheckpointReasonTable)
        .where(
            inArray(
                conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
                conversationViewSnapshotIds,
            ),
        );
    const checkpointViewSnapshotIds = new Set(
        checkpointRows.map((row) => row.conversationViewSnapshotId),
    );
    const displayableGroupCountsByViewSnapshotId =
        await fetchDisplayableGroupCountsByViewSnapshotId({
            db: primaryDb,
            conversationViewSnapshotIds,
        });

    const timestamp = Date.now();
    const values: (typeof realtimeEventOutboxTable.$inferInsert)[] = [];
    for (const row of rows) {
        if (row.analysisSnapshotId === null) {
            continue;
        }
        const payload: SSEEventDataByType["conversation_analysis_updated"] = {
            conversationSlugId: row.conversationSlugId,
            conversationViewSnapshotId: row.conversationViewSnapshotId,
            analysisSnapshotId: row.analysisSnapshotId,
            changeKind: "snapshot",
            checkpointChanged: checkpointViewSnapshotIds.has(
                row.conversationViewSnapshotId,
            ),
            displayableGroupCounts:
                displayableGroupCountsByViewSnapshotId.get(
                    row.conversationViewSnapshotId,
                ) ?? [],
            opinionCount: row.opinionCount,
            voteCount: row.voteCount,
            participantCount: row.participantCount,
            totalOpinionCount: row.totalOpinionCount,
            totalVoteCount: row.totalVoteCount,
            totalParticipantCount: row.totalParticipantCount,
            moderatedOpinionCount: row.moderatedOpinionCount,
            hiddenOpinionCount: row.hiddenOpinionCount,
            isClosed: row.isClosed,
            timestamp,
        };
        values.push({ eventType: "conversation_analysis_updated", payload });
    }

    if (values.length === 0) {
        return;
    }

    await primaryDb.insert(realtimeEventOutboxTable).values(values);
}

export async function queueConversationCommentStatsUpdatedEventsForViewSnapshots({
    db,
    conversationViewSnapshotIds,
    changedOpinionIds = [],
}: QueueConversationCommentStatsUpdatedEventsForViewSnapshotsProps): Promise<void> {
    if (conversationViewSnapshotIds.length === 0) {
        return;
    }

    const primaryDb = getPrimaryDatabase(db);
    const opinionVoteCounts = await fetchLiveOpinionVoteCounts({
        db: primaryDb,
        opinionIds: changedOpinionIds,
    });
    const rows = await primaryDb
        .select({
            conversationSlugId: conversationTable.slugId,
            conversationViewSnapshotId: conversationViewSnapshotTable.id,
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
        })
        .from(conversationViewSnapshotTable)
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationViewSnapshotTable.conversationId,
            ),
        )
        .where(
            inArray(
                conversationViewSnapshotTable.id,
                conversationViewSnapshotIds,
            ),
        );

    const timestamp = Date.now();
    const values = rows.map((row) => {
        const payload: SSEEventDataByType["conversation_comment_stats_updated"] =
            {
                conversationSlugId: row.conversationSlugId,
                conversationViewSnapshotId: row.conversationViewSnapshotId,
                opinionCount: row.opinionCount,
                voteCount: row.voteCount,
                participantCount: row.participantCount,
                totalOpinionCount: row.totalOpinionCount,
                totalVoteCount: row.totalVoteCount,
                totalParticipantCount: row.totalParticipantCount,
                moderatedOpinionCount: row.moderatedOpinionCount,
                hiddenOpinionCount: row.hiddenOpinionCount,
                isClosed: row.isClosed,
                opinionVoteCounts,
                timestamp,
            };
        return { eventType: "conversation_comment_stats_updated", payload };
    });

    if (values.length === 0) {
        return;
    }

    await primaryDb.insert(realtimeEventOutboxTable).values(values);
}

export async function queueConversationAnalysisUpdatedEventsForLatestViewSnapshots({
    db,
    conversationIds,
}: QueueConversationAnalysisUpdatedEventsForLatestViewSnapshotsProps): Promise<void> {
    const uniqueConversationIds = Array.from(new Set(conversationIds));
    if (uniqueConversationIds.length === 0) {
        return;
    }

    const primaryDb = getPrimaryDatabase(db);
    const rows = await primaryDb
        .selectDistinctOn([conversationViewSnapshotTable.conversationId], {
            conversationSlugId: conversationTable.slugId,
            conversationViewSnapshotId: conversationViewSnapshotTable.id,
            analysisSnapshotId:
                conversationViewSnapshotTable.analysisSnapshotId,
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
        })
        .from(conversationViewSnapshotTable)
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationViewSnapshotTable.conversationId,
            ),
        )
        .where(
            and(
                inArray(
                    conversationViewSnapshotTable.conversationId,
                    uniqueConversationIds,
                ),
                isNotNull(conversationViewSnapshotTable.activatedAt),
                isNotNull(conversationViewSnapshotTable.analysisSnapshotId),
            ),
        )
        .orderBy(
            conversationViewSnapshotTable.conversationId,
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        );

    const timestamp = Date.now();
    const values: (typeof realtimeEventOutboxTable.$inferInsert)[] = [];
    const displayableGroupCountsByViewSnapshotId =
        await fetchDisplayableGroupCountsByViewSnapshotId({
            db: primaryDb,
            conversationViewSnapshotIds: rows.map(
                (row) => row.conversationViewSnapshotId,
            ),
        });
    for (const row of rows) {
        if (row.analysisSnapshotId === null) {
            continue;
        }
        const payload: SSEEventDataByType["conversation_analysis_updated"] = {
            conversationSlugId: row.conversationSlugId,
            conversationViewSnapshotId: row.conversationViewSnapshotId,
            analysisSnapshotId: row.analysisSnapshotId,
            changeKind: "snapshot",
            checkpointChanged: false,
            displayableGroupCounts:
                displayableGroupCountsByViewSnapshotId.get(
                    row.conversationViewSnapshotId,
                ) ?? [],
            opinionCount: row.opinionCount,
            voteCount: row.voteCount,
            participantCount: row.participantCount,
            totalOpinionCount: row.totalOpinionCount,
            totalVoteCount: row.totalVoteCount,
            totalParticipantCount: row.totalParticipantCount,
            moderatedOpinionCount: row.moderatedOpinionCount,
            hiddenOpinionCount: row.hiddenOpinionCount,
            isClosed: row.isClosed,
            timestamp,
        };
        values.push({ eventType: "conversation_analysis_updated", payload });
    }

    if (values.length === 0) {
        return;
    }

    await primaryDb.insert(realtimeEventOutboxTable).values(values);
}

export async function fetchConversationAnalysisUpdatedEventForLatestViewSnapshot({
    db,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
}): Promise<SSEEventDataByType["conversation_analysis_updated"] | undefined> {
    const primaryDb = getPrimaryDatabase(db);
    const rows = await primaryDb
        .selectDistinctOn([conversationViewSnapshotTable.conversationId], {
            conversationSlugId: conversationTable.slugId,
            conversationViewSnapshotId: conversationViewSnapshotTable.id,
            analysisSnapshotId:
                conversationViewSnapshotTable.analysisSnapshotId,
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
        })
        .from(conversationViewSnapshotTable)
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
                isNotNull(conversationViewSnapshotTable.analysisSnapshotId),
            ),
        )
        .orderBy(
            conversationViewSnapshotTable.conversationId,
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        )
        .limit(1);

    const row = rows.at(0);
    if (
        row?.analysisSnapshotId === undefined ||
        row.analysisSnapshotId === null
    ) {
        return undefined;
    }

    const checkpointRows = await primaryDb
        .select({
            conversationViewSnapshotId:
                conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
        })
        .from(conversationViewSnapshotCheckpointReasonTable)
        .where(
            eq(
                conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
                row.conversationViewSnapshotId,
            ),
        )
        .limit(1);
    const displayableGroupCountsByViewSnapshotId =
        await fetchDisplayableGroupCountsByViewSnapshotId({
            db: primaryDb,
            conversationViewSnapshotIds: [row.conversationViewSnapshotId],
        });

    return {
        conversationSlugId: row.conversationSlugId,
        conversationViewSnapshotId: row.conversationViewSnapshotId,
        analysisSnapshotId: row.analysisSnapshotId,
        changeKind: "latest_state",
        checkpointChanged: checkpointRows.length > 0,
        displayableGroupCounts:
            displayableGroupCountsByViewSnapshotId.get(
                row.conversationViewSnapshotId,
            ) ?? [],
        opinionCount: row.opinionCount,
        voteCount: row.voteCount,
        participantCount: row.participantCount,
        totalOpinionCount: row.totalOpinionCount,
        totalVoteCount: row.totalVoteCount,
        totalParticipantCount: row.totalParticipantCount,
        moderatedOpinionCount: row.moderatedOpinionCount,
        hiddenOpinionCount: row.hiddenOpinionCount,
        isClosed: row.isClosed,
        timestamp: Date.now(),
    };
}

function parseRealtimeEventOutboxRow({
    id,
    eventType,
    payload,
}: {
    id: number;
    eventType: string;
    payload: unknown;
}): RealtimeReplayEvent | undefined {
    switch (eventType) {
        case "conversation_analysis_updated": {
            try {
                return {
                    id,
                    event: eventType,
                    data: zodSSEConversationAnalysisUpdatedData.parse(payload),
                };
            } catch {
                return undefined;
            }
        }
        case "conversation_comment_stats_updated": {
            const result =
                zodConversationCommentStatsUpdatedData.safeParse(payload);
            if (!result.success) {
                return undefined;
            }
            return {
                id,
                event: eventType,
                data: result.data,
            };
        }
        case "conversation_settings_updated": {
            const result =
                zodConversationSettingsUpdatedData.safeParse(payload);
            if (!result.success) {
                return undefined;
            }
            return {
                id,
                event: eventType,
                data: result.data,
            };
        }
        case "content_translation_updated": {
            const data = parseContentTranslationUpdatedData(payload);
            if (data === undefined) {
                return undefined;
            }
            return {
                id,
                event: eventType,
                data,
            };
        }
        default: {
            return undefined;
        }
    }
}

export async function fetchConversationRealtimeEventsAfterId({
    db,
    conversationSlugId,
    lastEventId,
    limit,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    lastEventId: number;
    limit: number;
}): Promise<RealtimeReplayEvent[]> {
    const primaryDb = getPrimaryDatabase(db);
    const rows = await primaryDb
        .select({
            id: realtimeEventOutboxTable.id,
            eventType: realtimeEventOutboxTable.eventType,
            payload: realtimeEventOutboxTable.payload,
        })
        .from(realtimeEventOutboxTable)
        .where(
            and(
                gt(realtimeEventOutboxTable.id, lastEventId),
                inArray(realtimeEventOutboxTable.eventType, [
                    "conversation_analysis_updated",
                    "conversation_settings_updated",
                ]),
                sql`${realtimeEventOutboxTable.payload}->>'conversationSlugId' = ${conversationSlugId}`,
            ),
        )
        .orderBy(realtimeEventOutboxTable.id)
        .limit(limit);

    const events: RealtimeReplayEvent[] = [];
    for (const row of rows) {
        const event = parseRealtimeEventOutboxRow(row);
        if (event !== undefined) {
            events.push(event);
        }
    }
    return events;
}

export async function fetchRealtimeTopicEventsAfterId({
    db,
    topics,
    lastEventId,
    limit,
}: {
    db: PostgresJsDatabase;
    topics: string[];
    lastEventId: number;
    limit: number;
}): Promise<RealtimeReplayEvent[]> {
    if (topics.length === 0) {
        return [];
    }

    const primaryDb = getPrimaryDatabase(db);
    const rows = await primaryDb
        .select({
            id: realtimeEventOutboxTable.id,
            eventType: realtimeEventOutboxTable.eventType,
            payload: realtimeEventOutboxTable.payload,
        })
        .from(realtimeEventOutboxTopicTable)
        .innerJoin(
            realtimeEventOutboxTable,
            eq(
                realtimeEventOutboxTable.id,
                realtimeEventOutboxTopicTable.eventId,
            ),
        )
        .where(
            and(
                gt(realtimeEventOutboxTable.id, lastEventId),
                inArray(realtimeEventOutboxTopicTable.topic, topics),
            ),
        )
        .orderBy(realtimeEventOutboxTable.id)
        .limit(limit);

    const seenEventIds = new Set<number>();
    const events: RealtimeReplayEvent[] = [];
    for (const row of rows) {
        if (seenEventIds.has(row.id)) {
            continue;
        }
        seenEventIds.add(row.id);
        const event = parseRealtimeEventOutboxRow(row);
        if (event !== undefined) {
            events.push(event);
        }
    }
    return events;
}

export function createRealtimeEventOutboxBridge({
    db,
    config,
    log,
    realtimeSSEManager,
}: {
    db: PostgresJsDatabase;
    config: SharedConfigSchema;
    log: Pick<pino.BaseLogger, "info" | "warn" | "error">;
    realtimeSSEManager: RealtimeSSEManager;
}): RealtimeEventOutboxBridge {
    let listenerClient: ListenerClient | undefined;
    let isStarted = false;
    let catchupInterval: NodeJS.Timeout | undefined;
    let highestProcessedOutboxId = 0;
    let outboxTaskQueue: Promise<void> = Promise.resolve();
    const failedOutboxIds = new Set<number>();
    const primaryDb = getPrimaryDatabase(db);

    const broadcastOutboxRow = ({
        id,
        eventType,
        payload,
    }: {
        id: number;
        eventType: string;
        payload: unknown;
    }): void => {
        const realtimeEvent = parseRealtimeEventOutboxRow({
            id,
            eventType,
            payload,
        });
        if (realtimeEvent === undefined) {
            log.warn(
                `[RealtimeOutbox] Ignoring unsupported event type ${eventType}`,
            );
            return;
        }

        switch (realtimeEvent.event) {
            case "conversation_analysis_updated": {
                realtimeSSEManager.broadcastToConversationSubscribers({
                    conversationSlugId: realtimeEvent.data.conversationSlugId,
                    id: realtimeEvent.id,
                    event: realtimeEvent.event,
                    data: realtimeEvent.data,
                });
                break;
            }
            case "conversation_comment_stats_updated": {
                realtimeSSEManager.broadcastToConversationSubscribers({
                    conversationSlugId: realtimeEvent.data.conversationSlugId,
                    id: realtimeEvent.id,
                    event: realtimeEvent.event,
                    data: realtimeEvent.data,
                });
                break;
            }
            case "conversation_settings_updated": {
                realtimeSSEManager.broadcastToConversationSubscribers({
                    conversationSlugId: realtimeEvent.data.conversationSlugId,
                    id: realtimeEvent.id,
                    event: realtimeEvent.event,
                    data: realtimeEvent.data,
                });
                break;
            }
            case "content_translation_updated": {
                if (realtimeEvent.data.subject.kind === "project") {
                    realtimeSSEManager.broadcastToTopicSubscribers({
                        topic: buildProjectContentTranslationTopic({
                            projectSlug: realtimeEvent.data.subject.projectSlug,
                            targetLanguageCode:
                                realtimeEvent.data.targetLanguageCode,
                        }),
                        id: realtimeEvent.id,
                        event: realtimeEvent.event,
                        data: realtimeEvent.data,
                    });
                    break;
                }
                realtimeSSEManager.broadcastToTopicSubscribers({
                    topic: buildContentTranslationTopic({
                        conversationSlugId:
                            realtimeEvent.data.subject.conversationSlugId,
                        targetLanguageCode:
                            realtimeEvent.data.targetLanguageCode,
                    }),
                    id: realtimeEvent.id,
                    event: realtimeEvent.event,
                    data: realtimeEvent.data,
                });
                break;
            }
        }
    };

    const processOutboxRow = (row: RealtimeEventOutboxRow): void => {
        if (
            row.id <= highestProcessedOutboxId &&
            !failedOutboxIds.has(row.id)
        ) {
            return;
        }

        broadcastOutboxRow(row);
        failedOutboxIds.delete(row.id);
        highestProcessedOutboxId = Math.max(highestProcessedOutboxId, row.id);
    };

    const processNotification = async ({
        payload,
    }: {
        payload: string;
    }): Promise<void> => {
        const parsedJson: unknown = JSON.parse(payload);
        const parsedPayload =
            zodRealtimeEventOutboxNotification.safeParse(parsedJson);
        if (!parsedPayload.success) {
            log.warn("[RealtimeOutbox] Ignoring invalid notification payload");
            return;
        }

        const outboxId = parsedPayload.data.id;
        if (
            outboxId <= highestProcessedOutboxId &&
            !failedOutboxIds.has(outboxId)
        ) {
            return;
        }

        try {
            const rows = await primaryDb
                .select({
                    id: realtimeEventOutboxTable.id,
                    eventType: realtimeEventOutboxTable.eventType,
                    payload: realtimeEventOutboxTable.payload,
                })
                .from(realtimeEventOutboxTable)
                .where(
                    and(
                        gt(
                            realtimeEventOutboxTable.id,
                            highestProcessedOutboxId,
                        ),
                        lte(realtimeEventOutboxTable.id, outboxId),
                    ),
                )
                .orderBy(realtimeEventOutboxTable.id);
            if (rows.length === 0) {
                log.warn(
                    `[RealtimeOutbox] Missing outbox row ${String(outboxId)}`,
                );
                return;
            }

            processOutboxRows({ rows, failureContext: "notification" });
        } catch (error: unknown) {
            failedOutboxIds.add(outboxId);
            throw error;
        }
    };

    const processOutboxRows = ({
        rows,
        failureContext,
    }: {
        rows: RealtimeEventOutboxRow[];
        failureContext: string;
    }): void => {
        for (const row of rows) {
            try {
                processOutboxRow(row);
            } catch (error: unknown) {
                failedOutboxIds.add(row.id);
                log.error(
                    error,
                    `[RealtimeOutbox] Failed to process ${failureContext} row ${String(row.id)}`,
                );
            }
        }
    };

    const processRecentEvents = async (): Promise<void> => {
        const since = new Date(Date.now() - RECENT_EVENT_CATCHUP_MS);
        const rows = await primaryDb
            .select({
                id: realtimeEventOutboxTable.id,
                eventType: realtimeEventOutboxTable.eventType,
                payload: realtimeEventOutboxTable.payload,
            })
            .from(realtimeEventOutboxTable)
            .where(
                and(
                    gte(realtimeEventOutboxTable.createdAt, since),
                    gt(realtimeEventOutboxTable.id, highestProcessedOutboxId),
                ),
            )
            .orderBy(realtimeEventOutboxTable.id);

        processOutboxRows({ rows, failureContext: "catch-up" });

        if (failedOutboxIds.size === 0) {
            return;
        }

        const failedRows = await primaryDb
            .select({
                id: realtimeEventOutboxTable.id,
                eventType: realtimeEventOutboxTable.eventType,
                payload: realtimeEventOutboxTable.payload,
            })
            .from(realtimeEventOutboxTable)
            .where(
                inArray(
                    realtimeEventOutboxTable.id,
                    Array.from(failedOutboxIds),
                ),
            )
            .orderBy(realtimeEventOutboxTable.id);

        processOutboxRows({ rows: failedRows, failureContext: "retry" });

        const foundFailedIds = new Set(failedRows.map((row) => row.id));
        for (const failedOutboxId of failedOutboxIds) {
            if (!foundFailedIds.has(failedOutboxId)) {
                failedOutboxIds.delete(failedOutboxId);
            }
        }
    };

    const processNotificationSafely = async ({
        payload,
    }: {
        payload: string;
    }): Promise<void> => {
        try {
            await processNotification({ payload });
        } catch (error: unknown) {
            log.error(error, "[RealtimeOutbox] Failed to process notification");
        }
    };

    const processRecentEventsSafely = async (): Promise<void> => {
        try {
            await processRecentEvents();
        } catch (error: unknown) {
            log.error(
                error,
                "[RealtimeOutbox] Failed to catch up recent events",
            );
        }
    };

    const enqueueOutboxTask = ({
        task,
    }: {
        task: () => Promise<void>;
    }): void => {
        const previousTask = outboxTaskQueue;
        outboxTaskQueue = (async (): Promise<void> => {
            try {
                await previousTask;
            } catch (error: unknown) {
                log.error(error, "[RealtimeOutbox] Previous task failed");
            }
            await task();
        })();
        void outboxTaskQueue;
    };

    return {
        start: async (): Promise<void> => {
            if (isStarted) {
                return;
            }

            await processRecentEvents();
            listenerClient = await createPostgresClient(config, log, false);
            await listenerClient.listen(
                REALTIME_EVENT_OUTBOX_CHANNEL,
                (payload) => {
                    enqueueOutboxTask({
                        task: async (): Promise<void> => {
                            await processNotificationSafely({ payload });
                        },
                    });
                },
            );
            isStarted = true;
            catchupInterval = setInterval(() => {
                enqueueOutboxTask({ task: processRecentEventsSafely });
            }, RECENT_EVENT_CATCHUP_INTERVAL_MS);
            catchupInterval.unref();
            log.info("[RealtimeOutbox] Listening for realtime DB events");
        },
        shutdown: async (): Promise<void> => {
            if (catchupInterval !== undefined) {
                clearInterval(catchupInterval);
                catchupInterval = undefined;
            }

            if (listenerClient === undefined) {
                return;
            }

            await listenerClient.end({ timeout: 5 });
            listenerClient = undefined;
            isStarted = false;
        },
    };
}
