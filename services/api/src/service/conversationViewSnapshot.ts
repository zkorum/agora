import {
    asc,
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
    conversationViewSnapshotCheckpointReasonTable,
    opinionGroupCandidateTable,
    opinionGroupDescriptionLocaleExpectationTable,
    opinionGroupLineageTable,
    opinionGroupTable,
    conversationViewSnapshotTable,
    opinionGroupSpecTable,
} from "@/shared-backend/schema.js";
import { calculateConversationCounters } from "@/shared-backend/conversationCounters.js";
import {
    type SupportedDisplayLanguageCodes,
    ZodSupportedDisplayLanguageCodes,
} from "@/shared/languages.js";
import type { FetchAnalysisCheckpointsResponse } from "@/shared/types/dto.js";
import { queueConversationAnalysisUpdatedEventsForViewSnapshots } from "./realtimeEventOutbox.js";
import {
    fetchSnapshotCandidateOptions,
    getRequiredDescriptionCandidateIds,
} from "./opinionGroupAnalysis.js";

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

type AiDescriptionLocaleExpectationKind = "english_description" | "translation";

function getAiDescriptionLocaleExpectationKind(
    locale: SupportedDisplayLanguageCodes,
): AiDescriptionLocaleExpectationKind {
    return locale === "en" ? "english_description" : "translation";
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
            hiddenOpinionCount: conversationViewSnapshotTable.hiddenOpinionCount,
            isClosed: conversationViewSnapshotTable.isClosed,
            reason: conversationViewSnapshotCheckpointReasonTable.reason,
            groupCount: conversationViewSnapshotCheckpointReasonTable.groupCount,
            previousGroupCount:
                conversationViewSnapshotCheckpointReasonTable.previousGroupCount,
            reasonParticipantCount:
                conversationViewSnapshotCheckpointReasonTable.participantCount,
            participantMilestone:
                conversationViewSnapshotCheckpointReasonTable.participantMilestone,
            reasonVoteCount: conversationViewSnapshotCheckpointReasonTable.voteCount,
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
            eq(conversationTable.id, conversationViewSnapshotTable.conversationId),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
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

        const checkpoint = checkpointsById.get(row.conversationViewSnapshotId) ?? {
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
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    viewReason: ConversationViewSnapshotReason;
    lifecycleCheckpointReason?: LifecycleCheckpointReason;
    emitRealtimeEvent?: boolean;
}): Promise<number> {
    const conversationRows = await db
        .select({
            currentContentId: conversationTable.currentContentId,
            isClosed: conversationTable.isClosed,
            preferredOpinionGroupCount:
                conversationTable.preferredOpinionGroupCount,
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

    const previousAnalysisRows = await db
        .selectDistinctOn([conversationViewSnapshotTable.opinionGroupSpecId], {
            opinionGroupSpecId:
                conversationViewSnapshotTable.opinionGroupSpecId,
            analysisSnapshotId:
                conversationViewSnapshotTable.analysisSnapshotId,
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
            surveyAggregateSnapshotId: null,
            variantsEnabled: row.variantsEnabled,
        });
    }

    const previousSurveyRows = await db
        .selectDistinctOn([conversationViewSnapshotTable.opinionGroupSpecId], {
            opinionGroupSpecId:
                conversationViewSnapshotTable.opinionGroupSpecId,
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
                isNotNull(
                    conversationViewSnapshotTable.surveyAggregateSnapshotId,
                ),
            ),
        )
        .orderBy(
            conversationViewSnapshotTable.opinionGroupSpecId,
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        );

    for (const row of previousSurveyRows) {
        if (row.surveyAggregateSnapshotId === null) {
            continue;
        }
        const refs = latestSnapshotRefsBySpecId.get(row.opinionGroupSpecId) ?? {
            analysisSnapshotId: null,
            surveyAggregateSnapshotId: null,
            variantsEnabled: false,
        };
        refs.surveyAggregateSnapshotId = row.surveyAggregateSnapshotId;
        latestSnapshotRefsBySpecId.set(row.opinionGroupSpecId, refs);
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
                    preferredOpinionGroupCount: refs?.variantsEnabled === true
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
            opinionGroupSpecId: conversationViewSnapshotTable.opinionGroupSpecId,
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

    return currentOpinionGroupSpecIds.length;
}

async function hasReadyEnglishDescriptionsForSnapshotResult({
    db,
    resultId,
    variantsEnabled,
}: {
    db: PostgresJsDatabase;
    resultId: number;
    variantsEnabled: boolean;
}): Promise<boolean> {
    const candidateRows = await fetchSnapshotCandidateOptions({ db, resultId });
    const requiredCandidateIds = getRequiredDescriptionCandidateIds({
        candidates: candidateRows,
        variantsEnabled,
    });
    if (requiredCandidateIds.length === 0) {
        return false;
    }

    const missingDescriptionRows = await db
        .select({ id: opinionGroupLineageTable.id })
        .from(opinionGroupCandidateTable)
        .innerJoin(
            opinionGroupTable,
            eq(opinionGroupTable.candidateId, opinionGroupCandidateTable.id),
        )
        .innerJoin(
            opinionGroupLineageTable,
            eq(opinionGroupLineageTable.id, opinionGroupTable.lineageId),
        )
        .where(
            and(
                inArray(opinionGroupCandidateTable.id, requiredCandidateIds),
                isNull(opinionGroupLineageTable.systemDescriptionId),
            ),
        )
        .limit(1);

    return missingDescriptionRows.length === 0;
}

export async function ensureAiDescriptionLocaleExpectationsForLatestAnalysisSnapshots({
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
            .update(opinionGroupDescriptionLocaleExpectationTable)
            .set({ retryDemandDueAt: null, updatedAt: new Date() })
            .where(
                and(
                    eq(
                        opinionGroupDescriptionLocaleExpectationTable.conversationId,
                        conversationId,
                    ),
                    eq(
                        opinionGroupDescriptionLocaleExpectationTable.opinionGroupSpecId,
                        opinionGroupSpecId,
                    ),
                    ne(
                        opinionGroupDescriptionLocaleExpectationTable.conversationViewSnapshotId,
                        snapshot.viewSnapshotId,
                    ),
                    isNotNull(
                        opinionGroupDescriptionLocaleExpectationTable.retryDemandDueAt,
                    ),
                ),
            );

        const now = new Date();
        const insertedRows = await db
            .insert(opinionGroupDescriptionLocaleExpectationTable)
            .values(
                ZodSupportedDisplayLanguageCodes.options.map((locale) => ({
                    conversationViewSnapshotId: snapshot.viewSnapshotId,
                    conversationId,
                    opinionGroupSpecId,
                    analysisSnapshotResultId: resultId,
                    locale,
                    expectationKind: getAiDescriptionLocaleExpectationKind(locale),
                    retryDemandDueAt: locale === "en" ? now : null,
                })),
            )
            .onConflictDoUpdate({
                target: [
                    opinionGroupDescriptionLocaleExpectationTable.conversationViewSnapshotId,
                    opinionGroupDescriptionLocaleExpectationTable.locale,
                ],
                set: {
                    analysisSnapshotResultId: resultId,
                    updatedAt: now,
                },
            })
            .returning({ id: opinionGroupDescriptionLocaleExpectationTable.id });
        if (insertedRows.length > 0) {
            didQueueAiDescriptionWork = true;
        }

        const updatedRows = await db
            .update(opinionGroupDescriptionLocaleExpectationTable)
            .set({
                retryDemandDueAt: now,
                updatedAt: now,
            })
            .where(
                and(
                    eq(
                        opinionGroupDescriptionLocaleExpectationTable.conversationViewSnapshotId,
                        snapshot.viewSnapshotId,
                    ),
                    eq(opinionGroupDescriptionLocaleExpectationTable.locale, "en"),
                ),
            )
            .returning({ id: opinionGroupDescriptionLocaleExpectationTable.id });
        if (updatedRows.length > 0) {
            didQueueAiDescriptionWork = true;
        }
    }

    return didQueueAiDescriptionWork;
}

export async function ensureAiDescriptionLocaleExpectationForConversationViewSnapshot({
    db,
    conversationSlugId,
    conversationViewSnapshotId,
    requestedLocale,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    conversationViewSnapshotId: number;
    requestedLocale: SupportedDisplayLanguageCodes;
}): Promise<boolean> {
    const snapshotRows = await db
        .select({
            conversationId: conversationTable.id,
            aiLabelingEnabled: conversationTable.aiLabelingEnabled,
            opinionGroupSpecId: conversationViewSnapshotTable.opinionGroupSpecId,
            resultId: analysisSnapshotResultTable.id,
            resultOutcome: analysisSnapshotResultTable.outcome,
            variantsEnabled: analysisSnapshotResultTable.variantsEnabled,
        })
        .from(conversationViewSnapshotTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, conversationViewSnapshotTable.conversationId),
        )
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
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationViewSnapshotTable.id, conversationViewSnapshotId),
                isNotNull(conversationViewSnapshotTable.activatedAt),
            ),
        )
        .limit(1);
    const snapshot = snapshotRows.at(0);
    if (
        snapshot === undefined ||
        !snapshot.aiLabelingEnabled ||
        snapshot.resultId === null ||
        snapshot.resultOutcome !== "success"
    ) {
        return false;
    }

    const now = new Date();
    const englishRows = await db
        .insert(opinionGroupDescriptionLocaleExpectationTable)
        .values({
            conversationViewSnapshotId,
            conversationId: snapshot.conversationId,
            opinionGroupSpecId: snapshot.opinionGroupSpecId,
            analysisSnapshotResultId: snapshot.resultId,
            locale: "en",
            expectationKind: "english_description",
            retryDemandDueAt: now,
        })
        .onConflictDoUpdate({
            target: [
                opinionGroupDescriptionLocaleExpectationTable.conversationViewSnapshotId,
                opinionGroupDescriptionLocaleExpectationTable.locale,
            ],
            set: {
                analysisSnapshotResultId: snapshot.resultId,
                retryDemandDueAt: now,
                updatedAt: now,
            },
        })
        .returning({ id: opinionGroupDescriptionLocaleExpectationTable.id });

    if (requestedLocale === "en") {
        return englishRows.length > 0;
    }

    const englishReady = await hasReadyEnglishDescriptionsForSnapshotResult({
        db,
        resultId: snapshot.resultId,
        variantsEnabled: snapshot.variantsEnabled === true,
    });
    const requestedRows = await db
        .insert(opinionGroupDescriptionLocaleExpectationTable)
        .values({
            conversationViewSnapshotId,
            conversationId: snapshot.conversationId,
            opinionGroupSpecId: snapshot.opinionGroupSpecId,
            analysisSnapshotResultId: snapshot.resultId,
            locale: requestedLocale,
            expectationKind: "translation",
            retryDemandDueAt: englishReady ? now : null,
        })
        .onConflictDoUpdate({
            target: [
                opinionGroupDescriptionLocaleExpectationTable.conversationViewSnapshotId,
                opinionGroupDescriptionLocaleExpectationTable.locale,
            ],
            set: {
                analysisSnapshotResultId: snapshot.resultId,
                ...(englishReady ? { retryDemandDueAt: now } : {}),
                updatedAt: now,
            },
        })
        .returning({ id: opinionGroupDescriptionLocaleExpectationTable.id });

    return englishRows.length > 0 || requestedRows.length > 0;
}
