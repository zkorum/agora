import {
    analysisSnapshotResultTable,
    analysisSnapshotTable,
    conversationViewSnapshotTable,
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

interface SnapshotCandidateOption {
    candidateId: number;
    groupCount: number;
    selectionScore: number | null;
}

export interface LatestOpinionGroupResultRow {
    conversationId: number;
    aiLabelingEnabled: boolean;
    viewSnapshotId: number;
    surveyAggregateSnapshotId: number | null;
    participantCount: number;
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
} & ConversationSelector;

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
    ...selector
}: GetSelectedOpinionGroupCandidateParams): Promise<
    SelectedOpinionGroupCandidate | undefined
> {
    const conversationFilter =
        selector.conversationId !== undefined
            ? eq(conversationTable.id, selector.conversationId)
            : eq(conversationTable.slugId, selector.conversationSlugId);

    const latestResultRows = await db
        .select({
            conversationId: conversationTable.id,
            aiLabelingEnabled: conversationTable.aiLabelingEnabled,
            viewSnapshotId: conversationViewSnapshotTable.id,
            surveyAggregateSnapshotId:
                conversationViewSnapshotTable.surveyAggregateSnapshotId,
            participantCount: conversationViewSnapshotTable.participantCount,
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
                isNotNull(conversationViewSnapshotTable.activatedAt),
            ),
        )
        .orderBy(
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        );

    if (latestResultRows.length === 0) {
        return undefined;
    }

    const displaySelection = selectLatestOpinionGroupResultForDisplay({
        rows: latestResultRows,
        displayLanguage,
    });
    if (displaySelection === undefined) {
        return undefined;
    }

    const latestResult = displaySelection.latestResult;

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
    if (selectedCandidate === undefined) {
        return undefined;
    }

    return {
        conversationId: latestResult.conversationId,
        viewSnapshotId: latestResult.viewSnapshotId,
        surveyAggregateSnapshotId: latestResult.surveyAggregateSnapshotId,
        participantCount: latestResult.participantCount,
        snapshotId: latestResult.snapshotId,
        resultId: latestResult.resultId,
        candidateId: selectedCandidate.candidateId,
        groupCount: selectedCandidate.groupCount,
        useSystemDescriptions: displaySelection.useSystemDescriptions,
    };
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
