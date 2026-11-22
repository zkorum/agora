import {
    analysisSnapshotResultTable,
    analysisSnapshotTable,
    conversationViewSnapshotTable,
    conversationViewSnapshotCheckpointReasonTable,
    analysisSpecTable,
    conversationAnalysisCloseTable,
    conversationTable,
    polisAnalysisCloseGenerationTable,
    polisAnalysisCloseTable,
    polisConversationConfigTable,
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
import {
    and,
    asc,
    desc,
    eq,
    exists,
    inArray,
    isNotNull,
    isNull,
    notExists,
    sql,
    type SQLWrapper,
} from "drizzle-orm";
import { hasSwitchablePolisCloseEvidence } from "@/shared-backend/analysisScheduler.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { alias } from "drizzle-orm/pg-core";
import type {
    AnalysisViewOption,
    AnalysisViewOptionCandidate,
    AnalysisViewState,
    ClosedAnalysisSelection,
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
import {
    currentAnalysisCloseCondition,
    hasFailedPolisWork,
    readableAnalysisConversationCondition,
} from "./closedAnalysisQueries.js";
import { describeClosedAnalysisSelection } from "./closedAnalysisSelectionState.js";
import { isPremiumFeatureEnabledForProject } from "./projectAccess.js";

export type { AnalysisViewState };

function activatedPolisLiveViewCondition() {
    return and(
        isNull(conversationViewSnapshotTable.closeReplacementGeneration),
        isNotNull(conversationViewSnapshotTable.activatedAt),
    );
}

export function publishedPolisLiveView({
    db,
    conversationId,
    revision,
}: {
    db: PostgresJsDatabase;
    conversationId: number | SQLWrapper;
    revision: number | SQLWrapper;
}) {
    const snapshot = analysisSnapshotTable;
    const view = conversationViewSnapshotTable;
    return db
        .select({ id: view.id })
        .from(snapshot)
        .innerJoin(
            view,
            and(
                eq(view.analysisSnapshotId, snapshot.id),
                eq(view.conversationId, snapshot.conversationId),
            ),
        )
        .innerJoin(
            analysisSnapshotResultTable,
            and(
                eq(analysisSnapshotResultTable.analysisSnapshotId, snapshot.id),
                eq(
                    analysisSnapshotResultTable.opinionGroupSpecId,
                    view.opinionGroupSpecId,
                ),
            ),
        )
        .innerJoin(
            opinionGroupSpecTable,
            eq(opinionGroupSpecTable.id, view.opinionGroupSpecId),
        )
        .innerJoin(
            analysisSpecTable,
            eq(analysisSpecTable.id, opinionGroupSpecTable.analysisSpecId),
        )
        .where(
            and(
                eq(snapshot.conversationId, conversationId),
                eq(snapshot.dataGeneration, revision),
                eq(analysisSpecTable.analysisFamily, "opinion_groups"),
                activatedPolisLiveViewCondition(),
            ),
        )
        .orderBy(desc(view.createdAt), desc(view.id))
        .limit(1);
}

type AiDescriptionLocaleStatus = "pending" | "ready" | "fallback";

export interface SelectedOpinionGroupCandidate {
    conversationId: number;
    viewSnapshotId: number;
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
    closedAnalysisSelection?: ClosedAnalysisSelection;
    surveySource?: PolisSurveySource;
    emptyReason?: string;
}

type PolisSurveySource =
    | { kind: "frame"; aggregateSnapshotId: number }
    | { kind: "closing_replacement" };

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
    const conversationFilter = and(
        readableAnalysisConversationCondition(db),
        selector.conversationId !== undefined
            ? eq(conversationTable.id, selector.conversationId)
            : eq(conversationTable.slugId, selector.conversationSlugId),
    );

    const rows =
        checkpointViewSnapshotId === undefined
            ? await db
                  .select({
                      projectId: conversationTable.projectId,
                      preferredGroupCount:
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
            opinionGroupDescriptionTranslationTable,
            and(
                eq(
                    opinionGroupDescriptionTranslationTable.descriptionId,
                    opinionGroupLineageTable.systemDescriptionId,
                ),
                eq(
                    opinionGroupDescriptionTranslationTable.locale,
                    requestedLocale,
                ),
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
        requestedLocale !== "en" &&
        englishReady &&
        uniqueLineageRows.length > 0;
    const requestedReady =
        requestedExpected &&
        uniqueLineageRows.every((row) => row.translationId !== null);
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
}: {
    adminDescriptionId: number | null;
    systemDescriptionId: number | null;
    descriptionsById: Map<number, { label: string; summary: string }>;
}): DescriptionText {
    const getDescription = (
        descriptionId: number | null,
    ): { label: string; summary: string } | undefined => {
        if (descriptionId === null) {
            return undefined;
        }

        return descriptionsById.get(descriptionId);
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
    displayLanguage: SupportedDisplayLanguageCodes;
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
                      translatedLabel:
                          opinionGroupDescriptionTranslationTable.label,
                      translatedSummary:
                          opinionGroupDescriptionTranslationTable.summary,
                  })
                  .from(opinionGroupDescriptionTable)
                  .leftJoin(
                      opinionGroupDescriptionTranslationTable,
                      and(
                          eq(
                              opinionGroupDescriptionTranslationTable.descriptionId,
                              opinionGroupDescriptionTable.id,
                          ),
                          eq(
                              opinionGroupDescriptionTranslationTable.locale,
                              displayLanguage,
                          ),
                      ),
                  )
                  .where(
                      inArray(opinionGroupDescriptionTable.id, descriptionIds),
                  );
    const descriptionsById = new Map(
        descriptionRows.map((row) => [
            row.id,
            {
                label: row.translatedLabel ?? row.label,
                summary: row.translatedSummary ?? row.summary,
            },
        ]),
    );

    return new Map(
        groups.map((group) => [
            group.groupId,
            resolveDescriptionText({
                adminDescriptionId: group.adminDescriptionId,
                systemDescriptionId: group.systemDescriptionId,
                descriptionsById,
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
    const conversationFilter = and(
        readableAnalysisConversationCondition(db),
        selector.conversationId !== undefined
            ? eq(conversationTable.id, selector.conversationId)
            : eq(conversationTable.slugId, selector.conversationSlugId),
    );

    const close = conversationAnalysisCloseTable;
    const nativeClose = polisAnalysisCloseTable;
    const generation = polisAnalysisCloseGenerationTable;
    const view = conversationViewSnapshotTable;
    let checkpointReplacementViewId: number | undefined;
    if (checkpointViewSnapshotId !== undefined) {
        const reason = conversationViewSnapshotCheckpointReasonTable;
        // A close's anchored link follows only completely published Closing
        // generations. Reopening fences publication, so no freeze write is needed.
        const latestClosingView = db
            .select({ viewId: view.id })
            .from(generation)
            .innerJoin(
                view,
                and(
                    eq(view.conversationId, generation.conversationId),
                    eq(view.opinionGroupSpecId, nativeClose.opinionGroupSpecId),
                    eq(
                        view.closeReplacementGeneration,
                        generation.dataGeneration,
                    ),
                ),
            )
            .where(
                and(
                    eq(generation.closeId, nativeClose.closeId),
                    isNotNull(generation.publishedAt),
                ),
            )
            .orderBy(desc(generation.dataGeneration))
            .limit(1)
            .as("latest_checkpoint_closing_view");
        const checkpointRows = await db
            .select({ replacementViewId: latestClosingView.viewId })
            .from(reason)
            .innerJoin(
                conversationTable,
                eq(conversationTable.id, reason.conversationId),
            )
            .leftJoin(
                nativeClose,
                and(
                    eq(
                        nativeClose.originalViewSnapshotId,
                        reason.conversationViewSnapshotId,
                    ),
                    eq(nativeClose.conversationId, reason.conversationId),
                    eq(reason.reason, "conversation_closed"),
                ),
            )
            .leftJoinLateral(latestClosingView, sql`true`)
            .where(
                and(
                    conversationFilter,
                    eq(
                        conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
                        checkpointViewSnapshotId,
                    ),
                ),
            )
            .orderBy(isNull(nativeClose.closeId))
            .limit(1);

        const checkpoint = checkpointRows.at(0);
        if (checkpoint === undefined) {
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
        checkpointReplacementViewId = checkpoint.replacementViewId ?? undefined;
    }

    const currentCloseQuery = db
        .select({
            id: close.id,
            conversationId: close.conversationId,
            servedInputMode: close.servedInputMode,
            servedResultRevision: close.servedResultRevision,
            selectedInputMode: close.selectedInputMode,
            requestedResultRevision: close.requestedResultRevision,
            selectionRevision: close.selectionRevision,
        })
        .from(conversationTable)
        .innerJoin(close, currentAnalysisCloseCondition())
        .where(
            and(
                conversationFilter,
                exists(
                    db
                        .select({ closeId: nativeClose.closeId })
                        .from(nativeClose)
                        .where(eq(nativeClose.closeId, close.id)),
                ),
            ),
        );
    const currentClose = currentCloseQuery.as("current_polis_close");
    // Failure belongs to an unfinished requested generation, not the result
    // readers are still seeing. Don't expose error details or lease state.
    const failedRequest = hasFailedPolisWork({
        db,
        conversationId: currentClose.conversationId,
        revision: currentClose.requestedResultRevision,
        usesClosingInputs: sql`(${eq(currentClose.selectedInputMode, "closing")})`,
    });

    const resultQuery = (includeCloseSelection: boolean) =>
        db
            .select({
                conversationId: sql<number>`${conversationTable.id}`.as(
                    "conversation_id",
                ),
                projectId: conversationTable.projectId,
                preferredOpinionGroupCount:
                    checkpointViewSnapshotId === undefined
                        ? polisConversationConfigTable.preferredOpinionGroupCount
                        : conversationViewSnapshotTable.preferredOpinionGroupCount,
                aiLabelingEnabled:
                    polisConversationConfigTable.aiLabelingEnabled,
                viewSnapshotId: sql<number>`${view.id}`.as("view_snapshot_id"),
                surveyAggregateSnapshotId:
                    conversationViewSnapshotTable.surveyAggregateSnapshotId,
                participantCount:
                    conversationViewSnapshotTable.participantCount,
                opinionCount: conversationViewSnapshotTable.opinionCount,
                voteCount: conversationViewSnapshotTable.voteCount,
                totalOpinionCount:
                    conversationViewSnapshotTable.totalOpinionCount,
                totalVoteCount: conversationViewSnapshotTable.totalVoteCount,
                totalParticipantCount:
                    conversationViewSnapshotTable.totalParticipantCount,
                moderatedOpinionCount:
                    conversationViewSnapshotTable.moderatedOpinionCount,
                hiddenOpinionCount:
                    conversationViewSnapshotTable.hiddenOpinionCount,
                isClosed: conversationViewSnapshotTable.isClosed,
                snapshotId: sql<number>`${analysisSnapshotTable.id}`.as(
                    "analysis_snapshot_id",
                ),
                resultId: sql<number>`${analysisSnapshotResultTable.id}`.as(
                    "result_id",
                ),
                outcome: analysisSnapshotResultTable.outcome,
                variantsEnabled: analysisSnapshotResultTable.variantsEnabled,
                closeId: sql<number | null>`${currentClose.id}`.as("close_id"),
                selectedInputMode: currentClose.selectedInputMode,
                servedInputMode: currentClose.servedInputMode,
                requestedResultRevision: currentClose.requestedResultRevision,
                servedResultRevision: currentClose.servedResultRevision,
                selectionRevision: currentClose.selectionRevision,
                failedRequest: sql<boolean>`${failedRequest}`.as(
                    "failed_request",
                ),
                isSwitchable:
                    sql<boolean>`${hasSwitchablePolisCloseEvidence({ db, closeId: currentClose.id })}`.as(
                        "is_switchable",
                    ),
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
                polisConversationConfigTable,
                eq(
                    polisConversationConfigTable.id,
                    conversationTable.polisConfigId,
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
                currentClose,
                includeCloseSelection
                    ? eq(currentClose.conversationId, conversationTable.id)
                    : sql`false`,
            )
            .$dynamic();

    const takeResult = ({
        query,
        filter,
    }: {
        query: ReturnType<typeof resultQuery>;
        filter: ReturnType<typeof and>;
    }) =>
        query
            .where(
                and(
                    conversationFilter,
                    eq(analysisSpecTable.analysisFamily, "opinion_groups"),
                    filter,
                ),
            )
            .orderBy(desc(view.createdAt), desc(view.id))
            .limit(1);

    const activated = activatedPolisLiveViewCondition();
    const latestResultRows = await (() => {
        if (checkpointViewSnapshotId !== undefined) {
            return takeResult({
                query: resultQuery(false),
                filter:
                    checkpointReplacementViewId === undefined
                        ? and(eq(view.id, checkpointViewSnapshotId), activated)
                        : eq(view.id, checkpointReplacementViewId),
            });
        }
        // The two branches are mutually exclusive. Keep the ordinary active
        // index usable and resolve a close by its bound specs, not view history.
        const ordinary = takeResult({
            query: resultQuery(false),
            filter: and(notExists(currentCloseQuery), activated),
        });
        const replacement = alias(view, "published_close_view");
        // A point lookup per bound spec prevents PostgreSQL from walking the
        // conversation's view history and testing the chosen id on every row.
        const boundView = db
            .select({ id: view.id, createdAt: view.createdAt })
            .from(view)
            .where(
                eq(
                    view.id,
                    sql<number>`case when ${currentClose.servedResultRevision} is null
                then ${nativeClose.originalViewSnapshotId} else ${replacement.id} end`,
                ),
            )
            .limit(1)
            .as("bound_polis_view");
        const finalizedViewId = db
            .select({ id: boundView.id })
            .from(currentClose)
            .innerJoin(nativeClose, eq(nativeClose.closeId, currentClose.id))
            .innerJoin(
                opinionGroupSpecTable,
                eq(opinionGroupSpecTable.id, nativeClose.opinionGroupSpecId),
            )
            .innerJoin(
                analysisSpecTable,
                eq(analysisSpecTable.id, opinionGroupSpecTable.analysisSpecId),
            )
            .leftJoin(
                generation,
                and(
                    eq(generation.conversationId, currentClose.conversationId),
                    eq(
                        generation.dataGeneration,
                        currentClose.servedResultRevision,
                    ),
                    eq(generation.closeId, currentClose.id),
                    isNotNull(generation.publishedAt),
                ),
            )
            .leftJoin(
                replacement,
                and(
                    eq(replacement.conversationId, nativeClose.conversationId),
                    eq(
                        replacement.opinionGroupSpecId,
                        nativeClose.opinionGroupSpecId,
                    ),
                    eq(
                        replacement.closeReplacementGeneration,
                        generation.dataGeneration,
                    ),
                ),
            )
            .innerJoinLateral(boundView, sql`true`)
            .where(
                and(
                    eq(analysisSpecTable.analysisFamily, "opinion_groups"),
                    eq(currentClose.servedInputMode, "closing"),
                ),
            )
            .orderBy(desc(boundView.createdAt), desc(boundView.id))
            .limit(1);
        const liveView = publishedPolisLiveView({
            db,
            conversationId: currentClose.conversationId,
            revision: currentClose.servedResultRevision,
        }).as("served_polis_live_view");
        const liveViewId = db
            .select({ id: liveView.id })
            .from(currentClose)
            .innerJoinLateral(liveView, sql`true`)
            .where(eq(currentClose.servedInputMode, "live"));
        return ordinary.unionAll(
            takeResult({
                query: resultQuery(true),
                filter: eq(view.id, finalizedViewId.unionAll(liveViewId)),
            }),
        );
    })();

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
    const {
        closeId,
        selectionRevision,
        selectedInputMode,
        servedInputMode,
        requestedResultRevision,
        servedResultRevision,
    } = latestResult;
    let closedAnalysisSelection: ClosedAnalysisSelection | undefined;
    if (
        closeId !== null &&
        selectionRevision !== null &&
        selectedInputMode !== null &&
        servedInputMode !== null
    ) {
        closedAnalysisSelection = describeClosedAnalysisSelection({
            closeId,
            selectionRevision,
            isSwitchable: latestResult.isSwitchable,
            selectedInputMode,
            servedInputMode,
            requestedResultRevision,
            servedResultRevision,
            failed: latestResult.failedRequest,
        });
    }
    const surveySource: PolisSurveySource | undefined =
        latestResult.surveyAggregateSnapshotId !== null
            ? {
                  kind: "frame",
                  aggregateSnapshotId: latestResult.surveyAggregateSnapshotId,
              }
            : checkpointReplacementViewId !== undefined ||
                (servedInputMode === "closing" && servedResultRevision !== null)
              ? { kind: "closing_replacement" }
              : undefined;
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
            closedAnalysisSelection,
            surveySource,
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
    const descriptionReadiness = await buildDerivedAnalysisDescriptionReadiness(
        {
            db,
            aiLabelingEnabled: latestResult.aiLabelingEnabled,
            requestedLocale,
            requiredCandidateIds:
                resolved.candidate === undefined
                    ? []
                    : [resolved.candidate.candidateId],
        },
    );
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
            closedAnalysisSelection,
            surveySource,
            emptyReason: `Agora could not form ${groupCount} meaningful groups for this checkpoint.`,
        };
    }

    return {
        candidate: {
            conversationId: latestResult.conversationId,
            viewSnapshotId: latestResult.viewSnapshotId,
            participantCount: latestResult.participantCount,
            snapshotId: latestResult.snapshotId,
            resultId: latestResult.resultId,
            candidateId: resolved.candidate.candidateId,
            groupCount: resolved.candidate.groupCount,
            aiLabelingEnabled: latestResult.aiLabelingEnabled,
            useSystemDescriptions,
        },
        conversationViewSnapshot,
        closedAnalysisSelection,
        surveySource,
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
    closedAnalysisSelection,
    surveySource,
    emptyReason,
    options = [],
}: {
    requestedView: AnalysisView;
    canonicalView: AnalysisView;
    variantsEnabled: boolean;
    resolvedBy: AnalysisViewState["resolvedBy"];
    conversationViewSnapshot?: AnalysisConversationViewSnapshot;
    closedAnalysisSelection?: ClosedAnalysisSelection;
    surveySource?: PolisSurveySource;
    emptyReason: string;
    options?: AnalysisViewOption[];
}): OpinionGroupAnalysisSelection {
    return {
        candidate: undefined,
        conversationViewSnapshot,
        closedAnalysisSelection,
        surveySource,
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
    const requestedLocale = getSupportedDisplayLanguage(displayLanguage);

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
        displayLanguage: requestedLocale,
        includeSystemDescriptions: selectedCandidate.useSystemDescriptions,
    });

    const memberships = new Map<string, SelectedOpinionGroupMembership>();
    for (const row of membershipRows) {
        if (row.participantId === null) continue;
        const description = descriptionsByGroupId.get(row.groupId);
        memberships.set(row.participantId, {
            groupId: row.groupId,
            groupKey: row.groupKey,
            groupLabel: description?.label ?? `Group ${row.groupKey}`,
        });
    }
    return memberships;
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
