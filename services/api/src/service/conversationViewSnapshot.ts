import {
    and,
    desc,
    eq,
    inArray,
    isNotNull,
    isNull,
    lt,
    ne,
    or,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    analysisSnapshotResultTable,
    analysisWorkStateTable,
    conversationTable,
    opinionGroupDescriptionLocaleStatusTable,
    conversationViewSnapshotTable,
    opinionGroupSpecTable,
} from "@/shared-backend/schema.js";
import { calculateConversationCounters } from "@/shared-backend/conversationCounters.js";
import { ZodSupportedDisplayLanguageCodes } from "@/shared/languages.js";

type ConversationViewSnapshotReason =
    | "analysis_completed"
    | "survey_refreshed"
    | "conversation_content_updated"
    | "conversation_lifecycle_updated";

interface LatestSnapshotRefs {
    analysisSnapshotId: number | null;
    surveyAggregateSnapshotId: number | null;
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
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    viewReason: ConversationViewSnapshotReason;
}): Promise<number> {
    const conversationRows = await db
        .select({
            currentContentId: conversationTable.currentContentId,
            isClosed: conversationTable.isClosed,
        })
        .from(conversationTable)
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
    const counters = await calculateConversationCounters({
        db,
        conversationId,
    });

    const previousSnapshotRows = await db
        .select({
            opinionGroupSpecId:
                conversationViewSnapshotTable.opinionGroupSpecId,
            analysisSnapshotId:
                conversationViewSnapshotTable.analysisSnapshotId,
            surveyAggregateSnapshotId:
                conversationViewSnapshotTable.surveyAggregateSnapshotId,
        })
        .from(conversationViewSnapshotTable)
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
            ),
        )
        .orderBy(
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        );

    const latestSnapshotRefsBySpecId = new Map<number, LatestSnapshotRefs>();
    for (const row of previousSnapshotRows) {
        const refs = latestSnapshotRefsBySpecId.get(row.opinionGroupSpecId) ?? {
            analysisSnapshotId: null,
            surveyAggregateSnapshotId: null,
        };

        if (
            refs.analysisSnapshotId === null &&
            row.analysisSnapshotId !== null
        ) {
            refs.analysisSnapshotId = row.analysisSnapshotId;
        }
        if (
            refs.surveyAggregateSnapshotId === null &&
            row.surveyAggregateSnapshotId !== null
        ) {
            refs.surveyAggregateSnapshotId = row.surveyAggregateSnapshotId;
        }

        latestSnapshotRefsBySpecId.set(row.opinionGroupSpecId, refs);
    }

    const activatedAt = new Date();
    const shouldPreserveSurveyAggregate = viewReason !== "survey_refreshed";
    await db.insert(conversationViewSnapshotTable).values(
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
                isClosed: conversation.isClosed,
                opinionCount: counters.opinionCount,
                voteCount: counters.voteCount,
                participantCount: counters.participantCount,
                totalOpinionCount: counters.totalOpinionCount,
                totalVoteCount: counters.totalVoteCount,
                totalParticipantCount: counters.totalParticipantCount,
                moderatedOpinionCount: counters.moderatedOpinionCount,
                hiddenOpinionCount: counters.hiddenOpinionCount,
                activatedAt,
            };
        }),
    );

    return currentOpinionGroupSpecIds.length;
}

export async function ensureAiDescriptionLocaleStatusesForLatestAnalysisSnapshots({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<boolean> {
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
        return false;
    }

    const pendingAnalysisRows = await db
        .select({ id: analysisWorkStateTable.id })
        .from(analysisWorkStateTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, analysisWorkStateTable.conversationId),
        )
        .where(
            and(
                eq(analysisWorkStateTable.conversationId, conversationId),
                inArray(
                    analysisWorkStateTable.opinionGroupSpecId,
                    currentOpinionGroupSpecIds,
                ),
                or(
                    isNotNull(analysisWorkStateTable.runningDataGeneration),
                    lt(
                        analysisWorkStateTable.lastCompletedDataGeneration,
                        conversationTable.analysisDataGeneration,
                    ),
                ),
            ),
        )
        .limit(1);
    if (pendingAnalysisRows.length > 0) {
        return false;
    }

    const snapshotRows = await db
        .select({
            viewSnapshotId: conversationViewSnapshotTable.id,
            opinionGroupSpecId:
                conversationViewSnapshotTable.opinionGroupSpecId,
            resultId: analysisSnapshotResultTable.id,
            resultOutcome: analysisSnapshotResultTable.outcome,
        })
        .from(conversationViewSnapshotTable)
        .leftJoin(
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
            ),
        )
        .orderBy(
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        );

    const latestSnapshotBySpecId = new Map<
        number,
        {
            viewSnapshotId: number;
            resultId: number | null;
            resultOutcome: string | null;
        }
    >();
    for (const row of snapshotRows) {
        if (!latestSnapshotBySpecId.has(row.opinionGroupSpecId)) {
            latestSnapshotBySpecId.set(row.opinionGroupSpecId, {
                viewSnapshotId: row.viewSnapshotId,
                resultId: row.resultId,
                resultOutcome: row.resultOutcome,
            });
        }
    }
    if (latestSnapshotBySpecId.size === 0) {
        return false;
    }

    const pendingStatus = "pending" as const;
    let didQueueAiDescriptionWork = false;
    for (const [opinionGroupSpecId, snapshot] of latestSnapshotBySpecId) {
        if (
            snapshot.resultId === null ||
            snapshot.resultOutcome !== "success"
        ) {
            continue;
        }
        const resultId = snapshot.resultId;

        await db
            .update(opinionGroupDescriptionLocaleStatusTable)
            .set({ nextRunAt: null })
            .where(
                and(
                    eq(
                        opinionGroupDescriptionLocaleStatusTable.conversationId,
                        conversationId,
                    ),
                    eq(
                        opinionGroupDescriptionLocaleStatusTable.opinionGroupSpecId,
                        opinionGroupSpecId,
                    ),
                    ne(
                        opinionGroupDescriptionLocaleStatusTable.conversationViewSnapshotId,
                        snapshot.viewSnapshotId,
                    ),
                    isNotNull(
                        opinionGroupDescriptionLocaleStatusTable.nextRunAt,
                    ),
                    isNull(opinionGroupDescriptionLocaleStatusTable.leaseToken),
                ),
            );

        const insertedRows = await db
            .insert(opinionGroupDescriptionLocaleStatusTable)
            .values(
                ZodSupportedDisplayLanguageCodes.options.map((locale) => ({
                    conversationViewSnapshotId: snapshot.viewSnapshotId,
                    conversationId,
                    opinionGroupSpecId,
                    analysisSnapshotResultId: resultId,
                    locale,
                    status: pendingStatus,
                    aiGenerationExpected: false,
                    translationExpected: false,
                    nextRunAt: locale === "en" ? new Date() : null,
                })),
            )
            .onConflictDoNothing()
            .returning({ id: opinionGroupDescriptionLocaleStatusTable.id });
        if (insertedRows.length > 0) {
            didQueueAiDescriptionWork = true;
        }

        const updatedRows = await db
            .update(opinionGroupDescriptionLocaleStatusTable)
            .set({
                nextRunAt: new Date(),
                nonRetryableAiDescriptionEpoch: null,
            })
            .where(
                and(
                    eq(
                        opinionGroupDescriptionLocaleStatusTable.conversationViewSnapshotId,
                        snapshot.viewSnapshotId,
                    ),
                    ne(
                        opinionGroupDescriptionLocaleStatusTable.status,
                        "ready",
                    ),
                    eq(opinionGroupDescriptionLocaleStatusTable.locale, "en"),
                    isNull(opinionGroupDescriptionLocaleStatusTable.leaseToken),
                ),
            )
            .returning({ id: opinionGroupDescriptionLocaleStatusTable.id });
        if (updatedRows.length > 0) {
            didQueueAiDescriptionWork = true;
        }
    }

    return didQueueAiDescriptionWork;
}
