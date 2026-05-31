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
    opinionGroupDescriptionTranslationTable,
    opinionGroupDescriptionTranslationWorkTable,
    opinionGroupDescriptionLocaleExpectationTable,
    opinionGroupLineageDescriptionWorkTable,
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
    emitCommentStatsRealtimeEvent = false,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    viewReason: ConversationViewSnapshotReason;
    lifecycleCheckpointReason?: LifecycleCheckpointReason;
    emitRealtimeEvent?: boolean;
    emitCommentStatsRealtimeEvent?: boolean;
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

    if (emitCommentStatsRealtimeEvent) {
        await queueConversationCommentStatsUpdatedEventsForViewSnapshots({
            db,
            conversationViewSnapshotIds: insertedRows.map((row) => row.id),
        });
    }

    return currentOpinionGroupSpecIds.length;
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
    candidateId,
    requestedLocale,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    conversationViewSnapshotId: number;
    candidateId: number;
    requestedLocale: SupportedDisplayLanguageCodes;
}): Promise<boolean> {
    const snapshotRows = await db
        .select({
            conversationId: conversationTable.id,
            aiLabelingEnabled: conversationTable.aiLabelingEnabled,
            opinionGroupSpecId: conversationViewSnapshotTable.opinionGroupSpecId,
            resultId: analysisSnapshotResultTable.id,
            resultOutcome: analysisSnapshotResultTable.outcome,
            candidateId: opinionGroupCandidateTable.id,
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
        .innerJoin(
            opinionGroupCandidateTable,
            and(
                eq(
                    opinionGroupCandidateTable.snapshotResultId,
                    analysisSnapshotResultTable.id,
                ),
                eq(opinionGroupCandidateTable.id, candidateId),
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationViewSnapshotTable.id, conversationViewSnapshotId),
                isNotNull(conversationViewSnapshotTable.activatedAt),
                eq(opinionGroupCandidateTable.outcome, "success"),
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
    const resultId = snapshot.resultId;
    const lineageRows = await db
        .select({
            lineageId: opinionGroupLineageTable.id,
            systemDescriptionId: opinionGroupLineageTable.systemDescriptionId,
        })
        .from(opinionGroupTable)
        .innerJoin(
            opinionGroupLineageTable,
            eq(opinionGroupLineageTable.id, opinionGroupTable.lineageId),
        )
        .where(eq(opinionGroupTable.candidateId, snapshot.candidateId));
    if (lineageRows.length === 0) {
        return false;
    }

    const missingEnglishLineageIds = lineageRows
        .filter((row) => row.systemDescriptionId === null)
        .map((row) => row.lineageId);
    let didQueueAiDescriptionWork = false;
    if (missingEnglishLineageIds.length > 0) {
        const englishRows = await db
            .insert(opinionGroupDescriptionLocaleExpectationTable)
            .values({
                conversationViewSnapshotId,
                conversationId: snapshot.conversationId,
                opinionGroupSpecId: snapshot.opinionGroupSpecId,
                analysisSnapshotResultId: resultId,
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
                    analysisSnapshotResultId: resultId,
                    retryDemandDueAt: now,
                    updatedAt: now,
                },
            })
            .returning({ id: opinionGroupDescriptionLocaleExpectationTable.id });
        didQueueAiDescriptionWork ||= englishRows.length > 0;

        await db
            .insert(opinionGroupLineageDescriptionWorkTable)
            .values(
                missingEnglishLineageIds.map((lineageId) => ({
                    lineageId,
                    conversationId: snapshot.conversationId,
                    sourceCandidateId: snapshot.candidateId,
                    nextRunAt: now,
                })),
            )
            .onConflictDoNothing();
        const updatedWorkRows = await db
            .update(opinionGroupLineageDescriptionWorkTable)
            .set({
                conversationId: snapshot.conversationId,
                sourceCandidateId: snapshot.candidateId,
                nextRunAt: now,
                updatedAt: now,
            })
            .where(
                and(
                    inArray(
                        opinionGroupLineageDescriptionWorkTable.lineageId,
                        missingEnglishLineageIds,
                    ),
                    isNull(opinionGroupLineageDescriptionWorkTable.leaseToken),
                    isNull(opinionGroupLineageDescriptionWorkTable.nextRunAt),
                ),
            )
            .returning({ id: opinionGroupLineageDescriptionWorkTable.id });
        didQueueAiDescriptionWork ||= updatedWorkRows.length > 0;
    }

    if (requestedLocale === "en") {
        return didQueueAiDescriptionWork;
    }

    const descriptionIds = lineageRows
        .map((row) => row.systemDescriptionId)
        .filter((descriptionId): descriptionId is number => descriptionId !== null);
    const englishReady = descriptionIds.length === lineageRows.length;
    const requestedRows = await db
        .insert(opinionGroupDescriptionLocaleExpectationTable)
        .values({
            conversationViewSnapshotId,
            conversationId: snapshot.conversationId,
            opinionGroupSpecId: snapshot.opinionGroupSpecId,
            analysisSnapshotResultId: resultId,
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
                analysisSnapshotResultId: resultId,
                ...(englishReady ? { retryDemandDueAt: now } : {}),
                updatedAt: now,
            },
        })
        .returning({ id: opinionGroupDescriptionLocaleExpectationTable.id });

    didQueueAiDescriptionWork ||= requestedRows.length > 0;
    if (!englishReady) {
        return didQueueAiDescriptionWork;
    }

    const translatedRows = await db
        .select({ descriptionId: opinionGroupDescriptionTranslationTable.descriptionId })
        .from(opinionGroupDescriptionTranslationTable)
        .where(
            and(
                inArray(
                    opinionGroupDescriptionTranslationTable.descriptionId,
                    descriptionIds,
                ),
                eq(opinionGroupDescriptionTranslationTable.locale, requestedLocale),
            ),
        );
    const translatedDescriptionIds = new Set(
        translatedRows.map((row) => row.descriptionId),
    );
    const missingTranslationDescriptionIds = descriptionIds.filter(
        (descriptionId) => !translatedDescriptionIds.has(descriptionId),
    );
    if (missingTranslationDescriptionIds.length === 0) {
        return didQueueAiDescriptionWork;
    }

    await db
        .insert(opinionGroupDescriptionTranslationWorkTable)
        .values(
            missingTranslationDescriptionIds.map((descriptionId) => ({
                descriptionId,
                conversationId: snapshot.conversationId,
                locale: requestedLocale,
                nextRunAt: now,
            })),
        )
        .onConflictDoNothing();
    const updatedTranslationWorkRows = await db
        .update(opinionGroupDescriptionTranslationWorkTable)
        .set({
            conversationId: snapshot.conversationId,
            nextRunAt: now,
            updatedAt: now,
        })
        .where(
            and(
                inArray(
                    opinionGroupDescriptionTranslationWorkTable.descriptionId,
                    missingTranslationDescriptionIds,
                ),
                eq(opinionGroupDescriptionTranslationWorkTable.locale, requestedLocale),
                isNull(opinionGroupDescriptionTranslationWorkTable.leaseToken),
                isNull(opinionGroupDescriptionTranslationWorkTable.nextRunAt),
            ),
        )
        .returning({ id: opinionGroupDescriptionTranslationWorkTable.id });
    return didQueueAiDescriptionWork || updatedTranslationWorkRows.length > 0;
}
