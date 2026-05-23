import {
    analysisSnapshotResultTable,
    analysisSnapshotTable,
    conversationViewSnapshotTable,
    conversationViewSnapshotCheckpointReasonTable,
    analysisSpecTable,
    conversationTable,
    opinionGroupDescriptionLocaleStatusTable,
    opinionGroupCandidateAssessmentTable,
    opinionGroupCandidateTable,
    opinionGroupDescriptionTable,
    opinionGroupDescriptionTranslationTable,
    opinionGroupLineageTable,
    opinionGroupSpecTable,
    opinionGroupTable,
    opinionGroupUserTable,
    opinionGroupVariantTable,
} from "@/shared-backend/schema.js";
import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
    AnalysisView,
    AnalysisViewOptionStatus,
} from "@/shared/types/zod.js";
import { hasPremiumAnalysisVariantsAccess } from "./premiumEntitlement.js";

const englishLocaleStatusTable = alias(
    opinionGroupDescriptionLocaleStatusTable,
    "english_locale_status",
);
const requestedLocaleStatusTable = alias(
    opinionGroupDescriptionLocaleStatusTable,
    "requested_locale_status",
);

type AiDescriptionLocaleStatus = "pending" | "ready" | "fallback";

export interface SelectedOpinionGroupCandidate {
    conversationId: number;
    viewSnapshotId: number;
    surveyAggregateSnapshotId: number | null;
    participantCount: number;
    snapshotId: number;
    resultId: number;
    candidateId: number;
    groupCount: number;
    useSystemDescriptions: boolean;
}

export interface AnalysisConversationViewSnapshot {
    conversationViewSnapshotId: number;
    analysisSnapshotId: number;
    opinionCount: number;
    voteCount: number;
    participantCount: number;
    totalOpinionCount: number;
    totalVoteCount: number;
    totalParticipantCount: number;
    moderatedOpinionCount: number;
    hiddenOpinionCount: number;
    isClosed: boolean;
}

export interface SnapshotCandidateOption {
    candidateId: number;
    groupCount: number;
    selectionScore: number | null;
}

export interface AnalysisViewOption {
    view: AnalysisView;
    enabled: boolean;
    status: AnalysisViewOptionStatus;
    reason?: string;
    groupCount?: number;
    candidateId?: number;
    selectionScore?: number | null;
    resolvesToView?: AnalysisView;
}

export interface AnalysisViewState {
    requestedView: AnalysisView;
    canonicalView: AnalysisView;
    resolvedGroupCount: number | null;
    resolvedCandidateId: number | null;
    resolvedBy:
        | "system_default"
        | "facilitator_preference"
        | "facilitator_fallback"
        | "fixed_count"
        | "locked_fallback"
        | "unavailable_fixed_count"
        | "no_analysis";
    variantsEnabled: boolean;
    options: AnalysisViewOption[];
}

export interface OpinionGroupAnalysisSelection {
    candidate: SelectedOpinionGroupCandidate | undefined;
    viewState: AnalysisViewState;
    conversationViewSnapshot?: AnalysisConversationViewSnapshot;
    emptyReason?: string;
}

export interface LatestOpinionGroupResultRow {
    conversationId: number;
    authorId: string;
    organizationId: number | null;
    preferredOpinionGroupCount: number | null;
    aiLabelingEnabled: boolean;
    viewSnapshotId: number;
    surveyAggregateSnapshotId: number | null;
    participantCount: number;
    opinionCount: number;
    voteCount: number;
    totalOpinionCount: number;
    totalVoteCount: number;
    totalParticipantCount: number;
    moderatedOpinionCount: number;
    hiddenOpinionCount: number;
    isClosed: boolean;
    snapshotId: number;
    resultId: number;
    outcome: "success" | "insufficient_data";
    englishLocaleStatus: AiDescriptionLocaleStatus | null;
    englishAiGenerationExpected: boolean | null;
    requestedLocaleStatus: AiDescriptionLocaleStatus | null;
    requestedTranslationExpected: boolean | null;
}

export interface OpinionGroupResultDisplaySelection {
    latestResult: LatestOpinionGroupResultRow;
    useSystemDescriptions: boolean;
}

export interface DescriptionText {
    label?: string;
    summary?: string;
}

export interface GroupDescriptionRefs {
    groupId: number;
    systemDescriptionId: number | null;
    adminDescriptionId: number | null;
}

export interface SelectedOpinionGroupMembership {
    groupId: number;
    groupKey: string;
    groupLabel: string;
}

type ConversationSelector =
    | { conversationId: number; conversationSlugId?: never }
    | { conversationId?: never; conversationSlugId: string };

type GetSelectedOpinionGroupCandidateParams = {
    db: PostgresJsDatabase;
    displayLanguage?: string;
    analysisView?: AnalysisView;
    checkpointViewSnapshotId?: number;
} & ConversationSelector;

const FIXED_ANALYSIS_VIEWS: AnalysisView[] = ["2", "3", "4", "5", "6"];

function getFixedGroupCount(view: AnalysisView): number | undefined {
    switch (view) {
        case "2":
            return 2;
        case "3":
            return 3;
        case "4":
            return 4;
        case "5":
            return 5;
        case "6":
            return 6;
        case "facilitator_default":
        case "system_default":
            return undefined;
    }
}

function getAnalysisViewForGroupCount(
    groupCount: number | null,
): AnalysisView | undefined {
    switch (groupCount) {
        case 2:
            return "2";
        case 3:
            return "3";
        case 4:
            return "4";
        case 5:
            return "5";
        case 6:
            return "6";
        case null:
            return undefined;
        default:
            return undefined;
    }
}

function createAnalysisConversationViewSnapshot(
    row: LatestOpinionGroupResultRow,
): AnalysisConversationViewSnapshot {
    return {
        conversationViewSnapshotId: row.viewSnapshotId,
        analysisSnapshotId: row.snapshotId,
        opinionCount: row.opinionCount,
        voteCount: row.voteCount,
        participantCount: row.participantCount,
        totalOpinionCount: row.totalOpinionCount,
        totalVoteCount: row.totalVoteCount,
        totalParticipantCount: row.totalParticipantCount,
        moderatedOpinionCount: row.moderatedOpinionCount,
        hiddenOpinionCount: row.hiddenOpinionCount,
        isClosed: row.isClosed,
    };
}

function selectCandidate({
    candidates,
}: {
    candidates: SnapshotCandidateOption[];
}): SnapshotCandidateOption | undefined {
    return [...candidates].sort((a, b) => {
        const bSelectionScore = b.selectionScore ?? Number.NEGATIVE_INFINITY;
        const aSelectionScore = a.selectionScore ?? Number.NEGATIVE_INFINITY;
        if (bSelectionScore !== aSelectionScore) {
            return bSelectionScore - aSelectionScore;
        }

        return b.groupCount - a.groupCount;
    })[0];
}

function getDefinedIds(ids: (number | null)[]): number[] {
    return Array.from(new Set(ids.filter((id): id is number => id !== null)));
}

function getUseSystemDescriptions({
    row,
    displayLanguage,
}: {
    row: LatestOpinionGroupResultRow;
    displayLanguage: string;
}): boolean | undefined {
    if (!row.aiLabelingEnabled) {
        return false;
    }

    switch (row.englishLocaleStatus) {
        case "ready": {
            break;
        }
        case "fallback": {
            return false;
        }
        case "pending":
        case null: {
            return row.englishAiGenerationExpected === true ? undefined : false;
        }
    }

    if (displayLanguage === "en") {
        return true;
    }

    switch (row.requestedLocaleStatus) {
        case "ready":
        case "fallback": {
            return true;
        }
        case "pending":
        case null: {
            return row.requestedTranslationExpected === true ? undefined : true;
        }
    }

    return undefined;
}

export function selectLatestOpinionGroupResultForDisplay({
    rows,
    displayLanguage,
}: {
    rows: LatestOpinionGroupResultRow[];
    displayLanguage: string;
}): OpinionGroupResultDisplaySelection | undefined {
    for (const row of rows) {
        if (row.outcome !== "success") {
            return undefined;
        }

        const useSystemDescriptions = getUseSystemDescriptions({
            row,
            displayLanguage,
        });
        if (useSystemDescriptions === undefined) {
            continue;
        }

        return {
            latestResult: row,
            useSystemDescriptions,
        };
    }

    return undefined;
}

function resolveDescriptionText({
    adminDescriptionId,
    systemDescriptionId,
    descriptionsById,
    translationsByDescriptionId,
}: {
    adminDescriptionId: number | null;
    systemDescriptionId: number | null;
    descriptionsById: Map<number, { label: string; summary: string }>;
    translationsByDescriptionId: Map<
        number,
        { label: string; summary: string }
    >;
}): DescriptionText {
    const getDescription = (
        descriptionId: number | null,
    ): { label: string; summary: string } | undefined => {
        if (descriptionId === null) {
            return undefined;
        }

        return (
            translationsByDescriptionId.get(descriptionId) ??
            descriptionsById.get(descriptionId)
        );
    };

    const description =
        getDescription(adminDescriptionId) ??
        getDescription(systemDescriptionId);
    return {
        label: description?.label,
        summary: description?.summary,
    };
}

export async function getDescriptionTextsByGroupId({
    db,
    groups,
    displayLanguage,
    includeSystemDescriptions = true,
}: {
    db: PostgresJsDatabase;
    groups: GroupDescriptionRefs[];
    displayLanguage: string;
    includeSystemDescriptions?: boolean;
}): Promise<Map<number, DescriptionText>> {
    const descriptionIds = getDefinedIds(
        groups.flatMap((group) => [
            includeSystemDescriptions ? group.systemDescriptionId : null,
            group.adminDescriptionId,
        ]),
    );
    const descriptionRows =
        descriptionIds.length === 0
            ? []
            : await db
                  .select({
                      id: opinionGroupDescriptionTable.id,
                      label: opinionGroupDescriptionTable.label,
                      summary: opinionGroupDescriptionTable.summary,
                  })
                  .from(opinionGroupDescriptionTable)
                  .where(
                      inArray(opinionGroupDescriptionTable.id, descriptionIds),
                  );
    const translationRows =
        descriptionIds.length === 0
            ? []
            : await db
                  .select({
                      descriptionId:
                          opinionGroupDescriptionTranslationTable.descriptionId,
                      label: opinionGroupDescriptionTranslationTable.label,
                      summary: opinionGroupDescriptionTranslationTable.summary,
                  })
                  .from(opinionGroupDescriptionTranslationTable)
                  .where(
                      and(
                          inArray(
                              opinionGroupDescriptionTranslationTable.descriptionId,
                              descriptionIds,
                          ),
                          eq(
                              opinionGroupDescriptionTranslationTable.locale,
                              displayLanguage,
                          ),
                      ),
                  );
    const descriptionsById = new Map(
        descriptionRows.map((row) => [
            row.id,
            { label: row.label, summary: row.summary },
        ]),
    );
    const translationsByDescriptionId = new Map(
        translationRows.map((row) => [
            row.descriptionId,
            { label: row.label, summary: row.summary },
        ]),
    );

    return new Map(
        groups.map((group) => [
            group.groupId,
            resolveDescriptionText({
                adminDescriptionId: group.adminDescriptionId,
                systemDescriptionId: group.systemDescriptionId,
                descriptionsById,
                translationsByDescriptionId,
            }),
        ]),
    );
}

export async function getSelectedOpinionGroupCandidate({
    db,
    displayLanguage = "en",
    analysisView = "facilitator_default",
    checkpointViewSnapshotId,
    ...selector
}: GetSelectedOpinionGroupCandidateParams): Promise<
    SelectedOpinionGroupCandidate | undefined
> {
    const selection = await getOpinionGroupAnalysisSelection({
        db,
        displayLanguage,
        analysisView,
        checkpointViewSnapshotId,
        ...selector,
    });
    return selection.candidate;
}

export async function getOpinionGroupAnalysisSelection({
    db,
    displayLanguage = "en",
    analysisView = "facilitator_default",
    checkpointViewSnapshotId,
    ...selector
}: GetSelectedOpinionGroupCandidateParams): Promise<OpinionGroupAnalysisSelection> {
    const conversationFilter =
        selector.conversationId !== undefined
            ? eq(conversationTable.id, selector.conversationId)
            : eq(conversationTable.slugId, selector.conversationSlugId);

    if (checkpointViewSnapshotId !== undefined) {
        const checkpointRows = await db
            .select({ id: conversationViewSnapshotCheckpointReasonTable.id })
            .from(conversationViewSnapshotCheckpointReasonTable)
            .innerJoin(
                conversationTable,
                eq(
                    conversationTable.id,
                    conversationViewSnapshotCheckpointReasonTable.conversationId,
                ),
            )
            .where(
                and(
                    conversationFilter,
                    eq(
                        conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
                        checkpointViewSnapshotId,
                    ),
                ),
            )
            .limit(1);

        if (checkpointRows.length === 0) {
            return createEmptyAnalysisViewSelection({
                requestedView: analysisView,
                canonicalView: "system_default",
                variantsEnabled: false,
                resolvedBy: "no_analysis",
                emptyReason: "Checkpoint is not available.",
            });
        }
    }

    const viewSnapshotFilter =
        checkpointViewSnapshotId === undefined
            ? isNotNull(conversationViewSnapshotTable.activatedAt)
            : and(
                  eq(conversationViewSnapshotTable.id, checkpointViewSnapshotId),
                  isNotNull(conversationViewSnapshotTable.activatedAt),
              );

    const latestResultRows = await db
        .select({
            conversationId: conversationTable.id,
            authorId: conversationTable.authorId,
            organizationId: conversationTable.organizationId,
            preferredOpinionGroupCount:
                conversationTable.preferredOpinionGroupCount,
            aiLabelingEnabled: conversationTable.aiLabelingEnabled,
            viewSnapshotId: conversationViewSnapshotTable.id,
            surveyAggregateSnapshotId:
                conversationViewSnapshotTable.surveyAggregateSnapshotId,
            participantCount: conversationViewSnapshotTable.participantCount,
            opinionCount: conversationViewSnapshotTable.opinionCount,
            voteCount: conversationViewSnapshotTable.voteCount,
            totalOpinionCount: conversationViewSnapshotTable.totalOpinionCount,
            totalVoteCount: conversationViewSnapshotTable.totalVoteCount,
            totalParticipantCount:
                conversationViewSnapshotTable.totalParticipantCount,
            moderatedOpinionCount:
                conversationViewSnapshotTable.moderatedOpinionCount,
            hiddenOpinionCount: conversationViewSnapshotTable.hiddenOpinionCount,
            isClosed: conversationViewSnapshotTable.isClosed,
            snapshotId: analysisSnapshotTable.id,
            resultId: analysisSnapshotResultTable.id,
            outcome: analysisSnapshotResultTable.outcome,
            englishLocaleStatus: englishLocaleStatusTable.status,
            englishAiGenerationExpected:
                englishLocaleStatusTable.aiGenerationExpected,
            requestedLocaleStatus: requestedLocaleStatusTable.status,
            requestedTranslationExpected:
                requestedLocaleStatusTable.translationExpected,
        })
        .from(conversationTable)
        .innerJoin(
            conversationViewSnapshotTable,
            eq(
                conversationViewSnapshotTable.conversationId,
                conversationTable.id,
            ),
        )
        .innerJoin(
            analysisSnapshotTable,
            eq(
                analysisSnapshotTable.id,
                conversationViewSnapshotTable.analysisSnapshotId,
            ),
        )
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
            opinionGroupSpecTable,
            eq(
                opinionGroupSpecTable.id,
                analysisSnapshotResultTable.opinionGroupSpecId,
            ),
        )
        .innerJoin(
            analysisSpecTable,
            eq(analysisSpecTable.id, opinionGroupSpecTable.analysisSpecId),
        )
        .leftJoin(
            englishLocaleStatusTable,
            and(
                eq(
                    englishLocaleStatusTable.conversationViewSnapshotId,
                    conversationViewSnapshotTable.id,
                ),
                eq(englishLocaleStatusTable.locale, "en"),
            ),
        )
        .leftJoin(
            requestedLocaleStatusTable,
            and(
                eq(
                    requestedLocaleStatusTable.conversationViewSnapshotId,
                    conversationViewSnapshotTable.id,
                ),
                eq(requestedLocaleStatusTable.locale, displayLanguage),
            ),
        )
        .where(
            and(
                conversationFilter,
                eq(analysisSpecTable.analysisFamily, "opinion_groups"),
                viewSnapshotFilter,
            ),
        )
        .orderBy(
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        );

    if (latestResultRows.length === 0) {
        return createEmptyAnalysisViewSelection({
            requestedView: analysisView,
            canonicalView: "system_default",
            variantsEnabled: false,
            resolvedBy: "no_analysis",
            emptyReason: "No analysis is available yet.",
        });
    }

    const displaySelection = selectLatestOpinionGroupResultForDisplay({
        rows: latestResultRows,
        displayLanguage,
    });
    if (displaySelection === undefined) {
        const latestResult = latestResultRows[0];
        return createEmptyAnalysisViewSelection({
            requestedView: analysisView,
            canonicalView: "system_default",
            variantsEnabled: false,
            resolvedBy: "no_analysis",
            conversationViewSnapshot:
                createAnalysisConversationViewSnapshot(latestResult),
            emptyReason: "No displayable analysis is available yet.",
        });
    }

    const latestResult = displaySelection.latestResult;
    const conversationViewSnapshot = createAnalysisConversationViewSnapshot(
        latestResult,
    );
    const variantsEnabled = await hasPremiumAnalysisVariantsAccess({
        db,
        conversation: {
            authorId: latestResult.authorId,
            organizationId: latestResult.organizationId,
        },
        now: new Date(),
    });

    const candidateRows = await db
        .select({
            candidateId: opinionGroupCandidateTable.id,
            groupCount: opinionGroupVariantTable.groupCount,
            selectionScore: opinionGroupCandidateAssessmentTable.selectionScore,
        })
        .from(opinionGroupCandidateTable)
        .innerJoin(
            opinionGroupVariantTable,
            eq(
                opinionGroupVariantTable.id,
                opinionGroupCandidateTable.opinionGroupVariantId,
            ),
        )
        .leftJoin(
            opinionGroupCandidateAssessmentTable,
            eq(
                opinionGroupCandidateAssessmentTable.candidateId,
                opinionGroupCandidateTable.id,
            ),
        )
        .where(
            and(
                eq(
                    opinionGroupCandidateTable.snapshotResultId,
                    latestResult.resultId,
                ),
                eq(opinionGroupCandidateTable.outcome, "success"),
                isNull(opinionGroupCandidateAssessmentTable.hiddenReason),
            ),
        )
        .orderBy(asc(opinionGroupVariantTable.groupCount));

    const selectedCandidate = selectCandidate({ candidates: candidateRows });
    const candidatesByGroupCount = new Map(
        candidateRows.map((candidate) => [candidate.groupCount, candidate]),
    );
    const fixedGroupCount = getFixedGroupCount(analysisView);
    const canonicalView: AnalysisView = variantsEnabled
        ? analysisView
        : "system_default";
    const preferredGroupCount = latestResult.preferredOpinionGroupCount;
    const facilitatorCandidate =
        preferredGroupCount === null
            ? undefined
            : candidatesByGroupCount.get(preferredGroupCount);
    const fixedCandidate =
        fixedGroupCount === undefined
            ? undefined
            : candidatesByGroupCount.get(fixedGroupCount);

    const resolved = (() => {
        if (!variantsEnabled && analysisView !== "system_default") {
            return {
                candidate: selectedCandidate,
                resolvedBy: "locked_fallback" as const,
            };
        }

        if (canonicalView === "system_default") {
            return {
                candidate: selectedCandidate,
                resolvedBy: "system_default" as const,
            };
        }

        if (canonicalView === "facilitator_default") {
            if (facilitatorCandidate !== undefined) {
                return {
                    candidate: facilitatorCandidate,
                    resolvedBy: "facilitator_preference" as const,
                };
            }

            return {
                candidate: selectedCandidate,
                resolvedBy: "facilitator_fallback" as const,
            };
        }

        if (fixedCandidate !== undefined) {
            return {
                candidate: fixedCandidate,
                resolvedBy: "fixed_count" as const,
            };
        }

        return {
            candidate: undefined,
            resolvedBy: "unavailable_fixed_count" as const,
        };
    })();

    const viewState: AnalysisViewState = {
        requestedView: analysisView,
        canonicalView,
        resolvedGroupCount: resolved.candidate?.groupCount ?? null,
        resolvedCandidateId: resolved.candidate?.candidateId ?? null,
        resolvedBy: resolved.resolvedBy,
        variantsEnabled,
        options: buildAnalysisViewOptions({
            variantsEnabled,
            preferredGroupCount,
            candidates: candidateRows,
            systemCandidate: selectedCandidate,
        }),
    };

    if (resolved.candidate === undefined) {
        const groupCount = fixedGroupCount?.toString() ?? "selected";
        return {
            candidate: undefined,
            viewState,
            conversationViewSnapshot,
            emptyReason: `Agora could not form ${groupCount} meaningful groups for this checkpoint.`,
        };
    }

    return {
        candidate: {
            conversationId: latestResult.conversationId,
            viewSnapshotId: latestResult.viewSnapshotId,
            surveyAggregateSnapshotId: latestResult.surveyAggregateSnapshotId,
            participantCount: latestResult.participantCount,
            snapshotId: latestResult.snapshotId,
            resultId: latestResult.resultId,
            candidateId: resolved.candidate.candidateId,
            groupCount: resolved.candidate.groupCount,
            useSystemDescriptions: displaySelection.useSystemDescriptions,
        },
        conversationViewSnapshot,
        viewState,
    };
}

function createEmptyAnalysisViewSelection({
    requestedView,
    canonicalView,
    variantsEnabled,
    resolvedBy,
    conversationViewSnapshot,
    emptyReason,
}: {
    requestedView: AnalysisView;
    canonicalView: AnalysisView;
    variantsEnabled: boolean;
    resolvedBy: AnalysisViewState["resolvedBy"];
    conversationViewSnapshot?: AnalysisConversationViewSnapshot;
    emptyReason: string;
}): OpinionGroupAnalysisSelection {
    return {
        candidate: undefined,
        conversationViewSnapshot,
        emptyReason,
        viewState: {
            requestedView,
            canonicalView,
            resolvedGroupCount: null,
            resolvedCandidateId: null,
            resolvedBy,
            variantsEnabled,
            options: [],
        },
    };
}

export function buildAnalysisViewOptions({
    variantsEnabled,
    preferredGroupCount,
    candidates,
    systemCandidate,
}: {
    variantsEnabled: boolean;
    preferredGroupCount: number | null;
    candidates: SnapshotCandidateOption[];
    systemCandidate: SnapshotCandidateOption | undefined;
}): AnalysisViewOption[] {
    const candidatesByGroupCount = new Map(
        candidates.map((candidate) => [candidate.groupCount, candidate]),
    );
    const lockedReason = "Agora Pro is needed to unlock this feature.";
    const options: AnalysisViewOption[] = [
        {
            view: "facilitator_default",
            enabled: variantsEnabled,
            status: variantsEnabled ? "available" : "locked",
            reason: variantsEnabled
                ? preferredGroupCount === null
                    ? "Uses the facilitator preference, otherwise falls back to default."
                    : "Uses the facilitator preferred group count when available."
                : lockedReason,
            resolvesToView:
                getAnalysisViewForGroupCount(preferredGroupCount) ??
                "system_default",
        },
        {
            view: "system_default",
            enabled: true,
            status: "recommended",
            reason: "Agora selects the best-scoring available group count.",
            groupCount: systemCandidate?.groupCount,
            candidateId: systemCandidate?.candidateId,
            selectionScore: systemCandidate?.selectionScore,
        },
    ];

    for (const view of FIXED_ANALYSIS_VIEWS) {
        const groupCount = Number(view);
        const candidate = candidatesByGroupCount.get(groupCount);
        const status: AnalysisViewOptionStatus = !variantsEnabled
            ? "locked"
            : candidate === undefined
              ? "discouraged"
              : candidate.candidateId === systemCandidate?.candidateId
                ? "recommended"
                : "available";
        options.push({
            view,
            enabled: variantsEnabled,
            status,
            reason: !variantsEnabled
                ? lockedReason
                : candidate === undefined
                  ? `Agora could not form ${String(groupCount)} meaningful groups for this checkpoint.`
                  : undefined,
            groupCount,
            candidateId: candidate?.candidateId,
            selectionScore: candidate?.selectionScore,
        });
    }

    return options;
}

export async function getSelectedOpinionGroupMembershipsByParticipantId({
    db,
    conversationId,
    participantIds,
    displayLanguage = "en",
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    participantIds: string[];
    displayLanguage?: string;
}): Promise<Map<string, SelectedOpinionGroupMembership>> {
    if (participantIds.length === 0) {
        return new Map();
    }

    const selectedCandidate = await getSelectedOpinionGroupCandidate({
        db,
        conversationId,
        displayLanguage,
    });
    if (selectedCandidate === undefined) {
        return new Map();
    }

    const membershipRows = await db
        .select({
            participantId: opinionGroupUserTable.userId,
            groupId: opinionGroupTable.id,
            groupKey: opinionGroupTable.key,
            systemDescriptionId: opinionGroupLineageTable.systemDescriptionId,
            adminDescriptionId: opinionGroupLineageTable.adminDescriptionId,
        })
        .from(opinionGroupUserTable)
        .innerJoin(
            opinionGroupTable,
            eq(opinionGroupTable.id, opinionGroupUserTable.groupId),
        )
        .leftJoin(
            opinionGroupLineageTable,
            eq(opinionGroupLineageTable.id, opinionGroupTable.lineageId),
        )
        .where(
            and(
                eq(
                    opinionGroupUserTable.candidateId,
                    selectedCandidate.candidateId,
                ),
                inArray(opinionGroupUserTable.userId, participantIds),
            ),
        );

    const descriptionsByGroupId = await getDescriptionTextsByGroupId({
        db,
        groups: membershipRows.map((row) => ({
            groupId: row.groupId,
            systemDescriptionId: row.systemDescriptionId,
            adminDescriptionId: row.adminDescriptionId,
        })),
        displayLanguage,
        includeSystemDescriptions: selectedCandidate.useSystemDescriptions,
    });

    return new Map(
        membershipRows.map((row) => {
            const description = descriptionsByGroupId.get(row.groupId);
            return [
                row.participantId,
                {
                    groupId: row.groupId,
                    groupKey: row.groupKey,
                    groupLabel: description?.label ?? `Group ${row.groupKey}`,
                },
            ];
        }),
    );
}

export async function isUserInSelectedOpinionGroup({
    db,
    userId,
    conversationId,
}: {
    db: PostgresJsDatabase;
    userId: string;
    conversationId: number;
}): Promise<boolean> {
    const memberships = await getSelectedOpinionGroupMembershipsByParticipantId(
        {
            db,
            conversationId,
            participantIds: [userId],
        },
    );
    return memberships.has(userId);
}
