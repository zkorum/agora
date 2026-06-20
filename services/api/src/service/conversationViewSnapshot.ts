import {
    asc,
    and,
    desc,
    eq,
    gt,
    inArray,
    isNotNull,
    isNull,
    or,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    analysisSnapshotResultTable,
    conversationTable,
    conversationViewSnapshotCheckpointReasonTable,
    opinionGroupCandidateAssessmentTable,
    opinionGroupCandidateTable,
    opinionGroupCandidateDescriptionLocaleRequestTable,
    opinionGroupDescriptionTranslationTable,
    opinionGroupDescriptionTranslationWorkTable,
    opinionGroupLineageDescriptionWorkTable,
    opinionGroupLineageTable,
    opinionGroupTable,
    conversationViewSnapshotTable,
    opinionGroupSpecTable,
} from "@/shared-backend/schema.js";
import { calculateConversationCounters } from "@/shared-backend/conversationCounters.js";
import {
    type SupportedDisplayLanguageCodes,
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

async function upsertCandidateDescriptionLocaleRequest({
    db,
    candidateId,
    locale,
    now,
}: {
    db: PostgresJsDatabase;
    candidateId: number;
    locale: SupportedDisplayLanguageCodes;
    now: Date;
}): Promise<boolean> {
    const rows = await db
        .insert(opinionGroupCandidateDescriptionLocaleRequestTable)
        .values({
            candidateId,
            locale,
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: [
                opinionGroupCandidateDescriptionLocaleRequestTable.candidateId,
                opinionGroupCandidateDescriptionLocaleRequestTable.locale,
            ],
            set: { updatedAt: now },
        })
        .returning({ id: opinionGroupCandidateDescriptionLocaleRequestTable.id });

    return rows.length > 0;
}

async function ensureLineageDescriptionWorkForCandidate({
    db,
    conversationId,
    candidateId,
    lineageIds,
    now,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    candidateId: number;
    lineageIds: number[];
    now: Date;
}): Promise<boolean> {
    if (lineageIds.length === 0) {
        return false;
    }

    const insertedWorkRows = await db
        .insert(opinionGroupLineageDescriptionWorkTable)
        .values(
            lineageIds.map((lineageId) => ({
                lineageId,
                conversationId,
                sourceCandidateId: candidateId,
            })),
        )
        .onConflictDoNothing()
        .returning({ id: opinionGroupLineageDescriptionWorkTable.id });
    const updatedWorkRows = await db
        .update(opinionGroupLineageDescriptionWorkTable)
        .set({
            conversationId,
            sourceCandidateId: candidateId,
            updatedAt: now,
        })
        .where(
            and(
                inArray(
                    opinionGroupLineageDescriptionWorkTable.lineageId,
                    lineageIds,
                ),
                isNull(opinionGroupLineageDescriptionWorkTable.leaseToken),
            ),
        )
        .returning({ id: opinionGroupLineageDescriptionWorkTable.id });
    return insertedWorkRows.length > 0 || updatedWorkRows.length > 0;
}

async function ensureDescriptionTranslationWorkForCandidate({
    db,
    conversationId,
    locale,
    descriptionIds,
    now,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    locale: SupportedDisplayLanguageCodes;
    descriptionIds: number[];
    now: Date;
}): Promise<boolean> {
    if (descriptionIds.length === 0) {
        return false;
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
                eq(opinionGroupDescriptionTranslationTable.locale, locale),
            ),
        );
    const translatedDescriptionIds = new Set(
        translatedRows.map((row) => row.descriptionId),
    );
    const missingTranslationDescriptionIds = descriptionIds.filter(
        (descriptionId) => !translatedDescriptionIds.has(descriptionId),
    );
    if (missingTranslationDescriptionIds.length === 0) {
        return false;
    }

    const insertedTranslationWorkRows = await db
        .insert(opinionGroupDescriptionTranslationWorkTable)
        .values(
            missingTranslationDescriptionIds.map((descriptionId) => ({
                descriptionId,
                conversationId,
                locale,
            })),
        )
        .onConflictDoNothing()
        .returning({ id: opinionGroupDescriptionTranslationWorkTable.id });
    const updatedTranslationWorkRows = await db
        .update(opinionGroupDescriptionTranslationWorkTable)
        .set({
            conversationId,
            updatedAt: now,
        })
        .where(
            and(
                inArray(
                    opinionGroupDescriptionTranslationWorkTable.descriptionId,
                    missingTranslationDescriptionIds,
                ),
                eq(opinionGroupDescriptionTranslationWorkTable.locale, locale),
                isNull(opinionGroupDescriptionTranslationWorkTable.leaseToken),
            ),
        )
        .returning({ id: opinionGroupDescriptionTranslationWorkTable.id });
    return insertedTranslationWorkRows.length > 0 || updatedTranslationWorkRows.length > 0;
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
            changedOpinionIds,
        });
    }

    return currentOpinionGroupSpecIds.length;
}

export async function ensureAiDescriptionLocaleRequestForConversationViewSnapshot({
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
    const newerConversationViewSnapshotTable = alias(
        conversationViewSnapshotTable,
        "newerConversationViewSnapshot",
    );
    const snapshotRows = await db
        .select({
            conversationId: conversationTable.id,
            aiLabelingEnabled: conversationTable.aiLabelingEnabled,
            opinionGroupSpecId: conversationViewSnapshotTable.opinionGroupSpecId,
            viewSnapshotCreatedAt: conversationViewSnapshotTable.createdAt,
            resultId: analysisSnapshotResultTable.id,
            resultOutcome: analysisSnapshotResultTable.outcome,
            candidateId: opinionGroupCandidateTable.id,
            checkpointReasonId: conversationViewSnapshotCheckpointReasonTable.id,
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
        .innerJoin(
            opinionGroupCandidateAssessmentTable,
            eq(
                opinionGroupCandidateAssessmentTable.candidateId,
                opinionGroupCandidateTable.id,
            ),
        )
        .leftJoin(
            conversationViewSnapshotCheckpointReasonTable,
            eq(
                conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
                conversationViewSnapshotTable.id,
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationViewSnapshotTable.id, conversationViewSnapshotId),
                isNotNull(conversationViewSnapshotTable.activatedAt),
                eq(opinionGroupCandidateTable.outcome, "success"),
                isNull(opinionGroupCandidateAssessmentTable.hiddenReason),
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

    const newerSnapshotRows = await db
        .select({ id: newerConversationViewSnapshotTable.id })
        .from(newerConversationViewSnapshotTable)
        .where(
            and(
                eq(
                    newerConversationViewSnapshotTable.conversationId,
                    snapshot.conversationId,
                ),
                eq(
                    newerConversationViewSnapshotTable.opinionGroupSpecId,
                    snapshot.opinionGroupSpecId,
                ),
                eq(newerConversationViewSnapshotTable.viewReason, "analysis_completed"),
                or(
                    gt(
                        newerConversationViewSnapshotTable.createdAt,
                        snapshot.viewSnapshotCreatedAt,
                    ),
                    and(
                        eq(
                            newerConversationViewSnapshotTable.createdAt,
                            snapshot.viewSnapshotCreatedAt,
                        ),
                        gt(
                            newerConversationViewSnapshotTable.id,
                            conversationViewSnapshotId,
                        ),
                    ),
                ),
            ),
        )
        .limit(1);
    if (snapshot.checkpointReasonId === null && newerSnapshotRows.length > 0) {
        return false;
    }

    const now = new Date();
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
    let didQueueAiDescriptionWork = await upsertCandidateDescriptionLocaleRequest({
        db,
        candidateId: snapshot.candidateId,
        locale: requestedLocale,
        now,
    });
    if (missingEnglishLineageIds.length > 0) {
        const didQueueEnglishWork = await ensureLineageDescriptionWorkForCandidate({
            db,
            conversationId: snapshot.conversationId,
            candidateId: snapshot.candidateId,
            lineageIds: missingEnglishLineageIds,
            now,
        });
        didQueueAiDescriptionWork = didQueueAiDescriptionWork || didQueueEnglishWork;
    }

    if (requestedLocale === "en") {
        return didQueueAiDescriptionWork;
    }

    const descriptionIds = lineageRows
        .map((row) => row.systemDescriptionId)
        .filter((descriptionId): descriptionId is number => descriptionId !== null);
    const englishReady = descriptionIds.length === lineageRows.length;
    if (!englishReady) {
        return didQueueAiDescriptionWork;
    }

    return (
        didQueueAiDescriptionWork ||
        (await ensureDescriptionTranslationWorkForCandidate({
            db,
            conversationId: snapshot.conversationId,
            locale: requestedLocale,
            descriptionIds,
            now,
        }))
    );
}
