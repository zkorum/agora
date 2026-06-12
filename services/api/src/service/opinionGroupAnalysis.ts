import {
    analysisSnapshotResultTable,
    analysisSnapshotTable,
    conversationViewSnapshotTable,
    conversationViewSnapshotCheckpointReasonTable,
    analysisSpecTable,
    conversationTable,
    opinionGroupCandidateAssessmentTable,
    opinionGroupCandidateTable,
    opinionGroupDescriptionTable,
    opinionGroupDescriptionTranslationTable,
    opinionGroupDescriptionTranslationWorkTable,
    opinionGroupLineageTable,
    opinionGroupLineageDescriptionWorkTable,
    opinionGroupSpecTable,
    opinionGroupTable,
    opinionGroupUserTable,
    opinionGroupVariantTable,
} from "@/shared-backend/schema.js";
import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
    AnalysisViewOption,
    AnalysisViewOptionCandidate,
    AnalysisViewState,
} from "@/shared/types/dto.js";
import type { AnalysisView } from "@/shared/types/zod.js";
import {
    type SupportedDisplayLanguageCodes,
    ZodSupportedDisplayLanguageCodes,
} from "@/shared/languages.js";
import {
    type AnalysisDescriptionReadiness,
    buildAnalysisDescriptionReadiness,
    shouldUseSystemDescriptions,
} from "./analysisDescriptionReadiness.js";
import { isPremiumFeatureEnabledForProject } from "./projectAccess.js";

export type { AnalysisViewState };

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
    aiLabelingEnabled: boolean;
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
    silhouetteScore: number | null;
    balanceScore: number | null;
}

interface SelectableSnapshotCandidateOption extends SnapshotCandidateOption {
    selectionScore: number;
}

export interface OpinionGroupAnalysisSelection {
    candidate: SelectedOpinionGroupCandidate | undefined;
    viewState: AnalysisViewState;
    displayableGroupCounts: number[];
    conversationViewSnapshot?: AnalysisConversationViewSnapshot;
    emptyReason?: string;
}

export interface LatestOpinionGroupResultRow {
    conversationId: number;
    projectId: number;
    preferredOpinionGroupCount: number | null;
    variantsEnabled: boolean;
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

interface EmptyAnalysisSelectionContext {
    variantsEnabled: boolean;
    preferredGroupCount: number | null;
    conversationFound: boolean;
}

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
        case "facilitator_preference":
        case "auto":
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

export function getRequestedAnalysisView({
    analysisView,
}: {
    analysisView: AnalysisView | undefined;
}): AnalysisView {
    return analysisView ?? "facilitator_preference";
}

export function getCanonicalAnalysisView({
    requestedView,
    variantsEnabled,
}: {
    requestedView: AnalysisView;
    variantsEnabled: boolean;
}): AnalysisView {
    return variantsEnabled ? requestedView : "auto";
}

export function shouldFallbackToAuto({
    requestedView,
    variantsEnabled,
}: {
    requestedView: AnalysisView;
    variantsEnabled: boolean;
}): boolean {
    return !variantsEnabled && requestedView !== "auto";
}

async function getEmptyAnalysisSelectionContext({
    db,
    checkpointViewSnapshotId,
    ...selector
}: {
    db: PostgresJsDatabase;
    checkpointViewSnapshotId?: number;
} & ConversationSelector): Promise<EmptyAnalysisSelectionContext> {
    const conversationFilter =
        selector.conversationId !== undefined
            ? eq(conversationTable.id, selector.conversationId)
            : eq(conversationTable.slugId, selector.conversationSlugId);

    const rows =
        checkpointViewSnapshotId === undefined
            ? await db
                  .select({
                      projectId: conversationTable.projectId,
                      preferredGroupCount:
                          conversationTable.preferredOpinionGroupCount,
                  })
                  .from(conversationTable)
                  .where(conversationFilter)
                  .limit(1)
            : await db
                  .select({
                      projectId: conversationTable.projectId,
                      preferredGroupCount:
                          conversationViewSnapshotTable.preferredOpinionGroupCount,
                  })
                  .from(conversationTable)
                  .innerJoin(
                      conversationViewSnapshotTable,
                      and(
                          eq(
                              conversationViewSnapshotTable.conversationId,
                              conversationTable.id,
                          ),
                          eq(
                              conversationViewSnapshotTable.id,
                              checkpointViewSnapshotId,
                          ),
                          isNotNull(conversationViewSnapshotTable.activatedAt),
                      ),
                  )
                  .where(conversationFilter)
                  .limit(1);

    const conversation = rows.at(0);
    if (conversation === undefined) {
        return {
            variantsEnabled: false,
            preferredGroupCount: null,
            conversationFound: false,
        };
    }

    return {
        variantsEnabled: await isPremiumFeatureEnabledForProject({
            db,
            projectId: conversation.projectId,
            feature: "analysis_variants",
            now: new Date(),
        }),
        preferredGroupCount: conversation.preferredGroupCount,
        conversationFound: true,
    };
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

function isSelectableCandidate(
    candidate: SnapshotCandidateOption,
): candidate is SelectableSnapshotCandidateOption {
    return candidate.selectionScore !== null;
}

function createAnalysisViewOptionCandidate(
    candidate: SelectableSnapshotCandidateOption,
): AnalysisViewOptionCandidate {
    return {
        candidateId: candidate.candidateId,
        groupCount: candidate.groupCount,
        assessment: {
            selectionScore: candidate.selectionScore,
            silhouetteScore: candidate.silhouetteScore,
            balanceScore: candidate.balanceScore,
        },
    };
}

export function getDisplayableGroupCounts({
    candidates,
}: {
    candidates: SnapshotCandidateOption[];
}): number[] {
    return candidates
        .filter(isSelectableCandidate)
        .map((candidate) => candidate.groupCount);
}

function createCandidateBackedAnalysisViewOption({
    view,
    status,
    candidate,
    resolvesToView,
}: {
    view: AnalysisView;
    status: "recommended" | "available" | "discouraged";
    candidate: SelectableSnapshotCandidateOption;
    resolvesToView?: AnalysisView;
}): AnalysisViewOption {
    return {
        view,
        status,
        candidate: createAnalysisViewOptionCandidate(candidate),
        ...(resolvesToView === undefined ? {} : { resolvesToView }),
    };
}

function getCandidateBackedStatus({
    candidate,
    systemCandidate,
}: {
    candidate: SelectableSnapshotCandidateOption;
    systemCandidate: SelectableSnapshotCandidateOption | undefined;
}): "recommended" | "available" | "discouraged" {
    if (isDiscouragedCandidate(candidate)) {
        return "discouraged";
    }

    return candidate.candidateId === systemCandidate?.candidateId
        ? "recommended"
        : "available";
}

function isDiscouragedCandidate(
    candidate: SelectableSnapshotCandidateOption,
): boolean {
    const normalizedSilhouetteScore =
        candidate.silhouetteScore === null
            ? null
            : Math.max(0, Math.min(1, (candidate.silhouetteScore + 1) / 2));

    return (
        candidate.selectionScore < 0.5 ||
        (normalizedSilhouetteScore !== null &&
            normalizedSilhouetteScore < 0.45) ||
        (candidate.balanceScore !== null && candidate.balanceScore < 0.45)
    );
}

function selectCandidate({
    candidates,
}: {
    candidates: SnapshotCandidateOption[];
}): SelectableSnapshotCandidateOption | undefined {
    return candidates.filter(isSelectableCandidate).sort((a, b) => {
        if (b.selectionScore !== a.selectionScore) {
            return b.selectionScore - a.selectionScore;
        }

        return b.groupCount - a.groupCount;
    })[0];
}

async function buildDerivedAnalysisDescriptionReadiness({
    db,
    aiLabelingEnabled,
    requestedLocale,
    requiredCandidateIds,
}: {
    db: PostgresJsDatabase;
    aiLabelingEnabled: boolean;
    requestedLocale: SupportedDisplayLanguageCodes;
    requiredCandidateIds: number[];
}): Promise<AnalysisDescriptionReadiness> {
    if (!aiLabelingEnabled || requiredCandidateIds.length === 0) {
        return buildAnalysisDescriptionReadiness({
            aiLabelingEnabled,
            requestedLocale,
            englishStatus: null,
            englishExpected: false,
            requestedStatus: null,
            requestedExpected: false,
        });
    }

    const rows = await db
        .select({
            lineageId: opinionGroupLineageTable.id,
            systemDescriptionId: opinionGroupLineageTable.systemDescriptionId,
            translationId: opinionGroupDescriptionTranslationTable.id,
        })
        .from(opinionGroupCandidateTable)
        .innerJoin(
            opinionGroupTable,
            eq(opinionGroupTable.candidateId, opinionGroupCandidateTable.id),
        )
        .innerJoin(
            opinionGroupLineageTable,
            eq(opinionGroupLineageTable.id, opinionGroupTable.lineageId),
        )
        .leftJoin(
            opinionGroupLineageDescriptionWorkTable,
            eq(
                opinionGroupLineageDescriptionWorkTable.lineageId,
                opinionGroupLineageTable.id,
            ),
        )
        .leftJoin(
            opinionGroupDescriptionTranslationTable,
            and(
                eq(
                    opinionGroupDescriptionTranslationTable.descriptionId,
                    opinionGroupLineageTable.systemDescriptionId,
                ),
                eq(opinionGroupDescriptionTranslationTable.locale, requestedLocale),
            ),
        )
        .leftJoin(
            opinionGroupDescriptionTranslationWorkTable,
            and(
                eq(
                    opinionGroupDescriptionTranslationWorkTable.descriptionId,
                    opinionGroupLineageTable.systemDescriptionId,
                ),
                eq(opinionGroupDescriptionTranslationWorkTable.locale, requestedLocale),
            ),
        )
        .where(inArray(opinionGroupCandidateTable.id, requiredCandidateIds));

    const uniqueLineageRows = Array.from(
        new Map(rows.map((row) => [row.lineageId, row])).values(),
    );
    const englishExpected = uniqueLineageRows.length > 0;
    const englishReady =
        englishExpected &&
        uniqueLineageRows.every((row) => row.systemDescriptionId !== null);
    const englishStatus: AiDescriptionLocaleStatus | null = englishExpected
        ? englishReady
            ? "ready"
            : "fallback"
        : null;

    const requestedExpected =
        requestedLocale !== "en" && englishReady && uniqueLineageRows.length > 0;
    const requestedReady =
        requestedExpected && uniqueLineageRows.every((row) => row.translationId !== null);
    const requestedStatus: AiDescriptionLocaleStatus | null = requestedExpected
        ? requestedReady
            ? "ready"
            : "fallback"
        : null;

    return buildAnalysisDescriptionReadiness({
        aiLabelingEnabled,
        requestedLocale,
        englishStatus,
        englishExpected,
        requestedStatus,
        requestedExpected,
    });
}

function getDefinedIds(ids: (number | null)[]): number[] {
    return Array.from(new Set(ids.filter((id): id is number => id !== null)));
}

function getSupportedDisplayLanguage(
    displayLanguage: string,
): SupportedDisplayLanguageCodes {
    const parsed = ZodSupportedDisplayLanguageCodes.safeParse(displayLanguage);
    return parsed.success ? parsed.data : "en";
}

export async function fetchSnapshotCandidateOptions({
    db,
    resultId,
}: {
    db: PostgresJsDatabase;
    resultId: number;
}): Promise<SnapshotCandidateOption[]> {
    return db
        .select({
            candidateId: opinionGroupCandidateTable.id,
            groupCount: opinionGroupVariantTable.groupCount,
            selectionScore: opinionGroupCandidateAssessmentTable.selectionScore,
            silhouetteScore:
                opinionGroupCandidateAssessmentTable.silhouetteScore,
            balanceScore: opinionGroupCandidateAssessmentTable.balanceScore,
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
                eq(opinionGroupCandidateTable.snapshotResultId, resultId),
                eq(opinionGroupCandidateTable.outcome, "success"),
                isNull(opinionGroupCandidateAssessmentTable.hiddenReason),
            ),
        )
        .orderBy(asc(opinionGroupVariantTable.groupCount));
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
    analysisView,
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
    analysisView,
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
            const variantsEnabled = false;
            const requestedView = getRequestedAnalysisView({
                analysisView,
            });
            return createEmptyAnalysisViewSelection({
                requestedView,
                canonicalView: getCanonicalAnalysisView({
                    requestedView,
                    variantsEnabled,
                }),
                variantsEnabled,
                resolvedBy: "no_analysis",
                emptyReason: "Checkpoint is not available.",
            });
        }
    }

    const viewSnapshotFilter =
        checkpointViewSnapshotId === undefined
            ? isNotNull(conversationViewSnapshotTable.activatedAt)
            : and(
                  eq(
                      conversationViewSnapshotTable.id,
                      checkpointViewSnapshotId,
                  ),
                  isNotNull(conversationViewSnapshotTable.activatedAt),
              );

    const latestResultRows = await db
        .select({
            conversationId: conversationTable.id,
            projectId: conversationTable.projectId,
            preferredOpinionGroupCount:
                checkpointViewSnapshotId === undefined
                    ? conversationTable.preferredOpinionGroupCount
                    : conversationViewSnapshotTable.preferredOpinionGroupCount,
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
            hiddenOpinionCount:
                conversationViewSnapshotTable.hiddenOpinionCount,
            isClosed: conversationViewSnapshotTable.isClosed,
            snapshotId: analysisSnapshotTable.id,
            resultId: analysisSnapshotResultTable.id,
            outcome: analysisSnapshotResultTable.outcome,
            variantsEnabled: analysisSnapshotResultTable.variantsEnabled,
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
        )
        .limit(1);

    if (latestResultRows.length === 0) {
        const emptyContext = await getEmptyAnalysisSelectionContext({
            db,
            checkpointViewSnapshotId,
            ...selector,
        });
        const variantsEnabled = emptyContext.variantsEnabled;
        const requestedView = getRequestedAnalysisView({
            analysisView,
        });
        return createEmptyAnalysisViewSelection({
            requestedView,
            canonicalView: getCanonicalAnalysisView({
                requestedView,
                variantsEnabled,
            }),
            variantsEnabled,
            resolvedBy: "no_analysis",
            emptyReason: "No analysis is available yet.",
            options: emptyContext.conversationFound
                ? buildAnalysisViewOptions({
                      variantsEnabled,
                      preferredGroupCount: emptyContext.preferredGroupCount,
                      candidates: [],
                      systemCandidate: undefined,
                  })
                : [],
        });
    }

    const requestedLocale = getSupportedDisplayLanguage(displayLanguage);
    const latestResult = latestResultRows[0];
    if (latestResult.outcome !== "success") {
        const variantsEnabled = latestResult.variantsEnabled;
        const requestedView = getRequestedAnalysisView({
            analysisView,
        });
        return createEmptyAnalysisViewSelection({
            requestedView,
            canonicalView: getCanonicalAnalysisView({
                requestedView,
                variantsEnabled,
            }),
            variantsEnabled,
            resolvedBy: "no_analysis",
            conversationViewSnapshot:
                createAnalysisConversationViewSnapshot(latestResult),
            emptyReason: "No displayable analysis is available yet.",
        });
    }

    const conversationViewSnapshot =
        createAnalysisConversationViewSnapshot(latestResult);
    const variantsEnabled = latestResult.variantsEnabled;
    const requestedView = getRequestedAnalysisView({
        analysisView,
    });

    const candidateRows = await fetchSnapshotCandidateOptions({
        db,
        resultId: latestResult.resultId,
    });

    const selectedCandidate = selectCandidate({ candidates: candidateRows });
    const selectableCandidates = candidateRows.filter(isSelectableCandidate);
    const displayableGroupCounts = getDisplayableGroupCounts({
        candidates: candidateRows,
    });
    const candidatesByGroupCount = new Map(
        selectableCandidates.map((candidate) => [
            candidate.groupCount,
            candidate,
        ]),
    );
    const fixedGroupCount = getFixedGroupCount(requestedView);
    const canonicalView = getCanonicalAnalysisView({
        requestedView,
        variantsEnabled,
    });
    const preferredGroupCount = latestResult.preferredOpinionGroupCount;
    const facilitatorCandidate =
        preferredGroupCount === null
            ? undefined
            : candidatesByGroupCount.get(preferredGroupCount);
    const facilitatorResolvesToView: AnalysisView =
        preferredGroupCount === null
            ? "auto"
            : (getAnalysisViewForGroupCount(preferredGroupCount) ?? "auto");
    const fixedCandidate =
        fixedGroupCount === undefined
            ? undefined
            : candidatesByGroupCount.get(fixedGroupCount);

    const resolved = (() => {
        if (shouldFallbackToAuto({ requestedView, variantsEnabled })) {
            return {
                candidate: selectedCandidate,
                resolvedBy: "locked_fallback" as const,
            };
        }

        if (canonicalView === "auto") {
            return {
                candidate: selectedCandidate,
                resolvedBy: "auto" as const,
            };
        }

        if (canonicalView === "facilitator_preference") {
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
    const descriptionReadiness = await buildDerivedAnalysisDescriptionReadiness({
        db,
        aiLabelingEnabled: latestResult.aiLabelingEnabled,
        requestedLocale,
        requiredCandidateIds:
            resolved.candidate === undefined ? [] : [resolved.candidate.candidateId],
    });
    const useSystemDescriptions = shouldUseSystemDescriptions({
        aiLabelingEnabled: latestResult.aiLabelingEnabled,
        requestedLocale,
        englishStatus: descriptionReadiness.english.status,
        englishExpected: descriptionReadiness.english.expected,
        requestedStatus: descriptionReadiness.requested.status,
        requestedExpected: descriptionReadiness.requested.expected,
    });

    const viewState: AnalysisViewState = {
        requestedView,
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
            facilitatorResolvesToView,
        }),
    };

    if (resolved.candidate === undefined) {
        const groupCount = fixedGroupCount?.toString() ?? "selected";
        return {
            candidate: undefined,
            viewState,
            displayableGroupCounts,
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
            aiLabelingEnabled: latestResult.aiLabelingEnabled,
            useSystemDescriptions,
        },
        conversationViewSnapshot,
        viewState,
        displayableGroupCounts,
    };
}

function createEmptyAnalysisViewSelection({
    requestedView,
    canonicalView,
    variantsEnabled,
    resolvedBy,
    conversationViewSnapshot,
    emptyReason,
    options = [],
}: {
    requestedView: AnalysisView;
    canonicalView: AnalysisView;
    variantsEnabled: boolean;
    resolvedBy: AnalysisViewState["resolvedBy"];
    conversationViewSnapshot?: AnalysisConversationViewSnapshot;
    emptyReason: string;
    options?: AnalysisViewOption[];
}): OpinionGroupAnalysisSelection {
    return {
        candidate: undefined,
        conversationViewSnapshot,
        emptyReason,
        displayableGroupCounts: [],
        viewState: {
            requestedView,
            canonicalView,
            resolvedGroupCount: null,
            resolvedCandidateId: null,
            resolvedBy,
            variantsEnabled,
            options,
        },
    };
}

export function buildAnalysisViewOptions({
    variantsEnabled,
    preferredGroupCount,
    candidates,
    systemCandidate,
    facilitatorResolvesToView,
}: {
    variantsEnabled: boolean;
    preferredGroupCount: number | null;
    candidates: SnapshotCandidateOption[];
    systemCandidate: SnapshotCandidateOption | undefined;
    facilitatorResolvesToView?: AnalysisView;
}): AnalysisViewOption[] {
    const selectableCandidates = candidates.filter(isSelectableCandidate);
    const selectableSystemCandidate =
        systemCandidate === undefined || !isSelectableCandidate(systemCandidate)
            ? undefined
            : systemCandidate;
    const candidatesByGroupCount = new Map(
        selectableCandidates.map((candidate) => [
            candidate.groupCount,
            candidate,
        ]),
    );
    const facilitatorCandidate =
        preferredGroupCount === null
            ? undefined
            : candidatesByGroupCount.get(preferredGroupCount);
    const resolvedFacilitatorView =
        facilitatorResolvesToView ??
        (preferredGroupCount === null
            ? "auto"
            : (getAnalysisViewForGroupCount(preferredGroupCount) ?? "auto"));

    const facilitatorOption: AnalysisViewOption = (() => {
        if (!variantsEnabled) {
            return {
                view: "facilitator_preference",
                status: "locked",
                reason: "analysis_variants_not_available",
                resolvesToView: "auto",
            };
        }

        if (
            preferredGroupCount !== null &&
            facilitatorCandidate === undefined
        ) {
            return {
                view: "facilitator_preference",
                status: "unavailable",
                reason: "fixed_group_count_unavailable",
                groupCount: preferredGroupCount,
                resolvesToView: resolvedFacilitatorView,
            };
        }

        const candidate = facilitatorCandidate ?? selectableSystemCandidate;
        if (candidate === undefined) {
            return {
                view: "facilitator_preference",
                status: "unavailable",
                reason: "recommended_default_unavailable",
                resolvesToView: "auto",
            };
        }

        return createCandidateBackedAnalysisViewOption({
            view: "facilitator_preference",
            status:
                facilitatorCandidate === undefined
                    ? "available"
                    : getCandidateBackedStatus({
                          candidate,
                          systemCandidate: selectableSystemCandidate,
                      }),
            candidate,
            resolvesToView: resolvedFacilitatorView,
        });
    })();

    const recommendedDefaultOption: AnalysisViewOption =
        selectableSystemCandidate === undefined
            ? {
                  view: "auto",
                  status: "unavailable",
                  reason: "recommended_default_unavailable",
              }
            : createCandidateBackedAnalysisViewOption({
                  view: "auto",
                  status: "recommended",
                  candidate: selectableSystemCandidate,
              });

    const fixedOptions = FIXED_ANALYSIS_VIEWS.map(
        (view): AnalysisViewOption => {
            const groupCount = Number(view);
            const candidate = candidatesByGroupCount.get(groupCount);
            if (!variantsEnabled) {
                return {
                    view,
                    status: "locked",
                    reason: "analysis_variants_not_available",
                };
            }

            if (candidate === undefined) {
                return {
                    view,
                    status: "unavailable",
                    reason: "fixed_group_count_unavailable",
                    groupCount,
                };
            }

            return createCandidateBackedAnalysisViewOption({
                view,
                status: getCandidateBackedStatus({
                    candidate,
                    systemCandidate: selectableSystemCandidate,
                }),
                candidate,
            });
        },
    );

    return [facilitatorOption, recommendedDefaultOption, ...fixedOptions];
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
