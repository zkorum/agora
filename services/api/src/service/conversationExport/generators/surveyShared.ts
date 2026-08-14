import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import {
    maxdiffComparisonTable,
    maxdiffResultTable,
    opinionModerationTable,
    opinionTable,
    surveyAnswerOptionTable,
    surveyAnswerTable,
    surveyQuestionOptionTable,
    surveyResponseTable,
    userTable,
    voteTable,
} from "@/shared-backend/schema.js";
import { PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD } from "@/shared/shared.js";
import type {
    ConversationType,
    SurveyAggregateRow as PublicSurveyAggregateRow,
    SurveyQuestionType,
} from "@/shared/types/zod.js";
import {
    deriveSurveyGate,
    deriveSurveyQuestionFormItem,
    getActiveSurveyConfigRecord,
    surveyAnswerToPlainText,
    type ActiveSurveyConfigRecord,
    type StoredSurveyAnswer,
    type SurveyParticipantState,
} from "@/service/survey.js";
import {
    getSelectedOpinionGroupMembershipsByParticipantId,
    type SelectedOpinionGroupMembership,
} from "@/service/opinionGroupAnalysis.js";
import type { GeneratorParams } from "./base.js";

type CsvValue = string | number | null;
type CsvRow = Record<string, CsvValue>;

export interface SurveyParticipantExportState {
    participantId: string;
    surveyState: SurveyParticipantState;
    surveyGate: ReturnType<typeof deriveSurveyGate>;
}

export interface SurveyClusterMembership {
    clusterId: string;
    clusterLabel: string;
}

export interface SurveyExportContext {
    activeSurveyConfig: ActiveSurveyConfigRecord | undefined;
    participantIds: Set<string>;
    participantStates: SurveyParticipantExportState[];
    clusterMembershipByParticipantId: Map<string, SurveyClusterMembership>;
}

export interface SurveyAggregateCsvRow {
    scope: "overall" | "cluster";
    clusterId: string;
    clusterLabel: string;
    questionId: number;
    optionId: number;
    count: number | undefined;
    percentage: number | undefined;
    isSuppressed: 0 | 1;
    suppressionReason:
        | "count_below_threshold"
        | "cluster_deductive_disclosure"
        | undefined;
}

export interface SurveyCompletionCounts {
    total: number;
    completeValid: number;
    needsUpdate: number;
    notStarted: number;
    inProgress: number;
}

interface SurveyQuestionExportMetadata {
    exportQuestionId: number;
    questionSlugId: string;
    questionOrder: number;
    questionType: SurveyQuestionType;
    questionText: string;
    isRequired: 0 | 1;
    isPublicAggregateSuppressionEnabled: 0 | 1;
    questionSemanticVersion: number;
}

interface SurveyOptionExportMetadata {
    exportOptionId: number;
    optionSlugId: string;
    exportQuestionId: number;
    optionOrder: number;
    optionText: string;
}

interface SurveyExportMetadata {
    questionsInExportOrder: ActiveSurveyConfigRecord["questions"];
    questionRows: CsvRow[];
    optionRows: CsvRow[];
    questionIdByQuestionDbId: Map<number, number>;
    optionIdByOptionSlugId: Map<string, number>;
}

function formatPercentage({
    numerator,
    denominator,
}: {
    numerator: number;
    denominator: number;
}): number | undefined {
    if (denominator === 0) {
        return undefined;
    }

    return Number(((numerator / denominator) * 100).toFixed(2));
}

interface SurveyAggregateCsvOptionCount {
    optionId: number;
    count: number;
}

function compareByDisplayOrderAndSlugId({
    leftDisplayOrder,
    rightDisplayOrder,
    leftSlugId,
    rightSlugId,
}: {
    leftDisplayOrder: number;
    rightDisplayOrder: number;
    leftSlugId: string;
    rightSlugId: string;
}): number {
    if (leftDisplayOrder !== rightDisplayOrder) {
        return leftDisplayOrder - rightDisplayOrder;
    }

    return leftSlugId.localeCompare(rightSlugId);
}

function buildSurveyExportMetadata({
    activeSurveyConfig,
}: {
    activeSurveyConfig: ActiveSurveyConfigRecord;
}): SurveyExportMetadata {
    const questionsInExportOrder = [...activeSurveyConfig.questions].sort(
        (leftQuestion, rightQuestion) => {
            return compareByDisplayOrderAndSlugId({
                leftDisplayOrder: leftQuestion.displayOrder,
                rightDisplayOrder: rightQuestion.displayOrder,
                leftSlugId: leftQuestion.slugId,
                rightSlugId: rightQuestion.slugId,
            });
        },
    );
    const questionRows: CsvRow[] = [];
    const optionRows: CsvRow[] = [];
    const questionIdByQuestionDbId = new Map<number, number>();
    const optionIdByOptionSlugId = new Map<string, number>();
    let nextOptionId = 0;

    for (const [questionIndex, question] of questionsInExportOrder.entries()) {
        const questionMetadata: SurveyQuestionExportMetadata = {
            exportQuestionId: questionIndex,
            questionSlugId: question.slugId,
            questionOrder: questionIndex + 1,
            questionType: question.questionType,
            questionText: question.questionText,
            isRequired: question.isRequired ? 1 : 0,
            isPublicAggregateSuppressionEnabled:
                question.isPublicAggregateSuppressionEnabled ? 1 : 0,
            questionSemanticVersion: question.currentSemanticVersion,
        };
        questionIdByQuestionDbId.set(
            question.id,
            questionMetadata.exportQuestionId,
        );
        questionRows.push({
            "question-id": questionMetadata.exportQuestionId,
            "question-slug-id": questionMetadata.questionSlugId,
            "question-order": questionMetadata.questionOrder,
            "question-type": questionMetadata.questionType,
            "question-text": questionMetadata.questionText,
            "is-required": questionMetadata.isRequired,
            "is-public-aggregate-suppression-enabled":
                questionMetadata.isPublicAggregateSuppressionEnabled,
            "question-semantic-version":
                questionMetadata.questionSemanticVersion,
        });

        const sortedOptions = [...question.options].sort(
            (leftOption, rightOption) => {
                return compareByDisplayOrderAndSlugId({
                    leftDisplayOrder: leftOption.displayOrder,
                    rightDisplayOrder: rightOption.displayOrder,
                    leftSlugId: leftOption.slugId,
                    rightSlugId: rightOption.slugId,
                });
            },
        );
        for (const [optionIndex, option] of sortedOptions.entries()) {
            const optionMetadata: SurveyOptionExportMetadata = {
                exportOptionId: nextOptionId,
                optionSlugId: option.slugId,
                exportQuestionId: questionMetadata.exportQuestionId,
                optionOrder: optionIndex + 1,
                optionText: option.optionText,
            };
            nextOptionId += 1;
            optionIdByOptionSlugId.set(
                optionMetadata.optionSlugId,
                optionMetadata.exportOptionId,
            );
            optionRows.push({
                "option-id": optionMetadata.exportOptionId,
                "option-slug-id": optionMetadata.optionSlugId,
                "question-id": optionMetadata.exportQuestionId,
                "option-order": optionMetadata.optionOrder,
                "option-text": optionMetadata.optionText,
            });
        }
    }

    return {
        questionsInExportOrder,
        questionRows,
        optionRows,
        questionIdByQuestionDbId,
        optionIdByOptionSlugId,
    };
}

function shouldSuppressSurveyAggregateBlock({
    optionCounts,
    includeSuppression,
    isPublicAggregateSuppressionEnabled,
}: {
    optionCounts: SurveyAggregateCsvOptionCount[];
    includeSuppression: boolean;
    isPublicAggregateSuppressionEnabled: boolean;
}): boolean {
    return (
        includeSuppression &&
        isPublicAggregateSuppressionEnabled &&
        optionCounts.some(
            (optionCount) =>
                optionCount.count > 0 &&
                optionCount.count < PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD,
        )
    );
}

function buildSurveyAggregateCsvBlockRows({
    scope,
    clusterId,
    clusterLabel,
    questionId,
    optionCounts,
    denominator,
    isSuppressed,
    suppressionReason,
}: {
    scope: SurveyAggregateCsvRow["scope"];
    clusterId: string;
    clusterLabel: string;
    questionId: number;
    optionCounts: SurveyAggregateCsvOptionCount[];
    denominator: number;
    isSuppressed: boolean;
    suppressionReason: SurveyAggregateCsvRow["suppressionReason"];
}): SurveyAggregateCsvRow[] {
    return optionCounts.map((optionCount) => ({
        scope,
        clusterId,
        clusterLabel,
        questionId,
        optionId: optionCount.optionId,
        count: isSuppressed ? undefined : optionCount.count,
        percentage: isSuppressed
            ? undefined
            : formatPercentage({
                  numerator: optionCount.count,
                  denominator,
              }),
        isSuppressed: isSuppressed ? 1 : 0,
        suppressionReason: isSuppressed ? suppressionReason : undefined,
    }));
}

export function buildSurveyCompletionCounts({
    context,
}: {
    context: SurveyExportContext;
}): SurveyCompletionCounts {
    const participantStates = getCountedParticipantStates({ context });
    const participantIdsWithState = new Set(
        participantStates.map(
            (participantState) => participantState.participantId,
        ),
    );
    let completeValid = 0;
    let needsUpdate = 0;
    let notStarted = 0;
    let inProgress = 0;

    for (const participantState of participantStates) {
        switch (participantState.surveyGate.status) {
            case "complete_valid":
                completeValid += 1;
                break;
            case "needs_update":
                needsUpdate += 1;
                break;
            case "not_started":
                notStarted += 1;
                break;
            case "in_progress":
                inProgress += 1;
                break;
            case "withdrawn":
                notStarted += 1;
                break;
            case "no_survey":
                break;
        }
    }

    return {
        total: context.participantIds.size,
        completeValid,
        needsUpdate,
        notStarted:
            notStarted +
            context.participantIds.size -
            participantIdsWithState.size,
        inProgress,
    };
}

export function buildSurveyQuestionRows({
    context,
}: {
    context: SurveyExportContext;
}): CsvRow[] {
    const activeSurveyConfig = context.activeSurveyConfig;
    if (activeSurveyConfig === undefined) {
        return [];
    }

    return buildSurveyExportMetadata({ activeSurveyConfig }).questionRows;
}

export function buildSurveyQuestionOptionRows({
    context,
}: {
    context: SurveyExportContext;
}): CsvRow[] {
    const activeSurveyConfig = context.activeSurveyConfig;
    if (activeSurveyConfig === undefined) {
        return [];
    }

    return buildSurveyExportMetadata({ activeSurveyConfig }).optionRows;
}

async function loadSurveyCountedParticipantIds({
    db,
    conversationId,
    conversationType,
}: {
    db: GeneratorParams["db"];
    conversationId: number;
    conversationType: ConversationType;
}): Promise<Set<string>> {
    const participantRows =
        conversationType === "ranking"
            ? await db
                  .selectDistinct({
                      participantId: maxdiffResultTable.participantId,
                  })
                  .from(maxdiffResultTable)
                  .innerJoin(
                      maxdiffComparisonTable,
                      eq(
                          maxdiffComparisonTable.maxdiffResultId,
                          maxdiffResultTable.id,
                      ),
                  )
                  .innerJoin(
                      userTable,
                      eq(maxdiffResultTable.participantId, userTable.id),
                  )
                  .where(
                      and(
                          eq(
                              maxdiffResultTable.conversationId,
                              conversationId,
                          ),
                          eq(userTable.isDeleted, false),
                          isNull(maxdiffComparisonTable.deletedAt),
                      ),
                  )
            : await db
                  .selectDistinct({ participantId: voteTable.authorId })
            .from(voteTable)
            .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
            .innerJoin(userTable, eq(voteTable.authorId, userTable.id))
            .leftJoin(
                opinionModerationTable,
                and(
                    eq(opinionModerationTable.opinionId, opinionTable.id),
                    isNull(opinionModerationTable.deletedAt),
                ),
            )
            .where(
                and(
                    eq(opinionTable.conversationId, conversationId),
                    eq(userTable.isDeleted, false),
                    isNull(opinionModerationTable.id),
                    isNotNull(opinionTable.currentContentId),
                    isNotNull(voteTable.currentContentId),
                ),
            );

    return new Set(participantRows.map((row) => row.participantId));
}

function getCountedParticipantStates({
    context,
}: {
    context: SurveyExportContext;
}): SurveyParticipantExportState[] {
    return context.participantStates.filter((participantState) =>
        context.participantIds.has(participantState.participantId),
    );
}

const SURVEY_QUERY_ID_BATCH_SIZE = 10_000;

async function loadRowsInIdBatches<Id extends string | number, Row>({
    ids,
    loadBatch,
}: {
    ids: Id[];
    loadBatch: (ids: Id[]) => Promise<Row[]>;
}): Promise<Row[]> {
    const rows: Row[] = [];
    for (let offset = 0; offset < ids.length; offset += SURVEY_QUERY_ID_BATCH_SIZE) {
        rows.push(
            ...(await loadBatch(
                ids.slice(offset, offset + SURVEY_QUERY_ID_BATCH_SIZE),
            )),
        );
    }
    return rows;
}

export async function loadSurveyExportContext({
    db,
    conversationId,
    conversationType = "polis",
    includeClusterMemberships = true,
}: Pick<GeneratorParams, "db" | "conversationId"> & {
    conversationType?: ConversationType;
    includeClusterMemberships?: boolean;
}): Promise<SurveyExportContext> {
    const activeSurveyConfig = await getActiveSurveyConfigRecord({
        db,
        conversationId,
    });

    if (activeSurveyConfig === undefined) {
        return {
            activeSurveyConfig: undefined,
            participantIds: new Set(),
            participantStates: [],
            clusterMembershipByParticipantId: new Map(),
        };
    }

    const countedParticipantIds = await loadSurveyCountedParticipantIds({
        db,
        conversationId,
        conversationType,
    });
    if (countedParticipantIds.size === 0) {
        return {
            activeSurveyConfig,
            participantIds: countedParticipantIds,
            participantStates: [],
            clusterMembershipByParticipantId: new Map(),
        };
    }

    const responseRows = await loadRowsInIdBatches({
        ids: Array.from(countedParticipantIds),
        loadBatch: async (participantIds) =>
            await db
                .select({
                    responseId: surveyResponseTable.id,
                    participantId: surveyResponseTable.participantId,
                    createdAt: surveyResponseTable.createdAt,
                    updatedAt: surveyResponseTable.updatedAt,
                    completedAt: surveyResponseTable.completedAt,
                    withdrawnAt: surveyResponseTable.withdrawnAt,
                })
                .from(surveyResponseTable)
                .innerJoin(
                    userTable,
                    eq(surveyResponseTable.participantId, userTable.id),
                )
                .where(
                    and(
                        eq(surveyResponseTable.conversationId, conversationId),
                        eq(userTable.isDeleted, false),
                        inArray(surveyResponseTable.participantId, participantIds),
                    ),
                ),
    });
    responseRows.sort(
        (left, right) =>
            left.createdAt.getTime() - right.createdAt.getTime() ||
            left.responseId - right.responseId,
    );

    const responseIds = responseRows.map((response) => response.responseId);
    const answerRows = await loadRowsInIdBatches({
        ids: responseIds,
        loadBatch: async (surveyResponseIds) =>
            await db
                .select({
                    surveyResponseId: surveyAnswerTable.surveyResponseId,
                    answerId: surveyAnswerTable.id,
                    surveyQuestionId: surveyAnswerTable.surveyQuestionId,
                    answeredQuestionSemanticVersion:
                        surveyAnswerTable.answeredQuestionSemanticVersion,
                    textValueHtml: surveyAnswerTable.textValueHtml,
                    textValuePlainText: surveyAnswerTable.textValuePlainText,
                })
                .from(surveyAnswerTable)
                .where(
                    and(
                        inArray(
                            surveyAnswerTable.surveyResponseId,
                            surveyResponseIds,
                        ),
                        isNull(surveyAnswerTable.deletedAt),
                    ),
                ),
    });

    const answerIds = answerRows.map((answer) => answer.answerId);
    const answerOptionRows = await loadRowsInIdBatches({
        ids: answerIds,
        loadBatch: async (surveyAnswerIds) =>
            await db
                .select({
                    surveyAnswerId: surveyAnswerOptionTable.surveyAnswerId,
                    optionSlugId: surveyQuestionOptionTable.slugId,
                })
                .from(surveyAnswerOptionTable)
                .innerJoin(
                    surveyQuestionOptionTable,
                    eq(
                        surveyAnswerOptionTable.surveyQuestionOptionId,
                        surveyQuestionOptionTable.id,
                    ),
                )
                .where(
                    and(
                        inArray(
                            surveyAnswerOptionTable.surveyAnswerId,
                            surveyAnswerIds,
                        ),
                        isNull(surveyAnswerOptionTable.deletedAt),
                    ),
                ),
    });

    const optionSlugIdsByAnswerId = new Map<number, string[]>();
    for (const answerOption of answerOptionRows) {
        const optionSlugIds =
            optionSlugIdsByAnswerId.get(answerOption.surveyAnswerId) ?? [];
        optionSlugIds.push(answerOption.optionSlugId);
        optionSlugIdsByAnswerId.set(answerOption.surveyAnswerId, optionSlugIds);
    }

    const answersByResponseId = new Map<
        number,
        Map<
            number,
            {
                answerId: number;
                answeredQuestionSemanticVersion: number;
                textValueHtml: string | null;
                textValuePlainText: string | null;
                optionSlugIds: string[];
            }
        >
    >();
    for (const answer of answerRows) {
        const answersByQuestionId =
            answersByResponseId.get(answer.surveyResponseId) ??
            new Map<
                number,
                {
                    answerId: number;
                    answeredQuestionSemanticVersion: number;
                    textValueHtml: string | null;
                    textValuePlainText: string | null;
                    optionSlugIds: string[];
                }
            >();
        answersByQuestionId.set(answer.surveyQuestionId, {
            answerId: answer.answerId,
            answeredQuestionSemanticVersion:
                answer.answeredQuestionSemanticVersion,
            textValueHtml: answer.textValueHtml,
            textValuePlainText: answer.textValuePlainText,
            optionSlugIds: optionSlugIdsByAnswerId.get(answer.answerId) ?? [],
        });
        answersByResponseId.set(answer.surveyResponseId, answersByQuestionId);
    }

    const participantStates = responseRows.map((response) => {
        const surveyState: SurveyParticipantState = {
            activeSurveyConfig,
            response: {
                id: response.responseId,
                createdAt: response.createdAt,
                updatedAt: response.updatedAt,
                completedAt: response.completedAt,
                withdrawnAt: response.withdrawnAt,
            },
            answersByQuestionId:
                answersByResponseId.get(response.responseId) ??
                new Map<number, StoredSurveyAnswer>(),
        };

        return {
            participantId: response.participantId,
            surveyState,
            surveyGate: deriveSurveyGate({
                surveyState,
                participantId: response.participantId,
            }),
        };
    });

    const participantIdsWithResponse = participantStates.map(
        (state) => state.participantId,
    );
    const selectedGroupMemberships = includeClusterMemberships
        ? await getSelectedOpinionGroupMembershipsByParticipantId({
              db,
              conversationId,
              participantIds: participantIdsWithResponse,
          })
        : new Map<string, SelectedOpinionGroupMembership>();
    const clusterMembershipByParticipantId = new Map(
        Array.from(selectedGroupMemberships.entries()).map(
            ([participantId, membership]) => [
                participantId,
                {
                    clusterId: membership.groupKey,
                    clusterLabel: membership.groupLabel,
                },
            ],
        ),
    );

    return {
        activeSurveyConfig,
        participantIds: countedParticipantIds,
        participantStates,
        clusterMembershipByParticipantId,
    };
}

interface SurveyAggregatePublicOptionCount {
    optionId: string;
    option: string;
    count: number;
}

function shouldSuppressPublicSurveyAggregateBlock({
    optionCounts,
    isPublicAggregateSuppressionEnabled,
}: {
    optionCounts: SurveyAggregatePublicOptionCount[];
    isPublicAggregateSuppressionEnabled: boolean;
}): boolean {
    return (
        isPublicAggregateSuppressionEnabled &&
        optionCounts.some(
            (optionCount) =>
                optionCount.count > 0 &&
                optionCount.count < PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD,
        )
    );
}

function buildPublicSurveyAggregateBlockRows({
    scope,
    clusterId,
    clusterLabel,
    question,
    optionCounts,
    denominator,
    isSuppressed,
    suppressionReason,
}: {
    scope: PublicSurveyAggregateRow["scope"];
    clusterId: string;
    clusterLabel: string;
    question: ActiveSurveyConfigRecord["questions"][number];
    optionCounts: SurveyAggregatePublicOptionCount[];
    denominator: number;
    isSuppressed: boolean;
    suppressionReason: PublicSurveyAggregateRow["suppressionReason"];
}): PublicSurveyAggregateRow[] {
    return optionCounts.map((optionCount) => ({
        scope,
        clusterId,
        clusterLabel,
        questionId: question.slugId,
        questionType: question.questionType,
        question: question.questionText,
        optionId: optionCount.optionId,
        option: optionCount.option,
        count: isSuppressed ? undefined : optionCount.count,
        percentage: isSuppressed
            ? undefined
            : formatPercentage({
                  numerator: optionCount.count,
                  denominator,
        }),
        isSuppressed,
        isPublicAggregateSuppressionEnabled:
            question.isPublicAggregateSuppressionEnabled,
        suppressionReason: isSuppressed ? suppressionReason : undefined,
    }));
}

interface SurveyChoiceParticipantAnswer {
    participantId: string;
    optionSlugIds: string[];
}

function buildSurveyOptionCounts({
    options,
    participantAnswers,
}: {
    options: ActiveSurveyConfigRecord["questions"][number]["options"];
    participantAnswers: SurveyChoiceParticipantAnswer[];
}): SurveyAggregatePublicOptionCount[] {
    const countsByOptionSlugId = new Map(
        options.map((option) => [option.slugId, 0]),
    );
    for (const participantAnswer of participantAnswers) {
        for (const optionSlugId of participantAnswer.optionSlugIds) {
            const currentCount = countsByOptionSlugId.get(optionSlugId);
            if (currentCount !== undefined) {
                countsByOptionSlugId.set(optionSlugId, currentCount + 1);
            }
        }
    }
    return options.map((option) => ({
        optionId: option.slugId,
        option: option.optionText,
        count: countsByOptionSlugId.get(option.slugId) ?? 0,
    }));
}

export function buildSurveyAggregateResultRows({
    context,
    includeFullRows,
}: {
    context: SurveyExportContext;
    includeFullRows: boolean;
}): {
    suppressedRows: PublicSurveyAggregateRow[];
    fullRows: PublicSurveyAggregateRow[];
    hasPublicAggregateSuppressionEnabled: boolean;
} {
    const activeSurveyConfig = context.activeSurveyConfig;
    if (activeSurveyConfig === undefined) {
        return {
            suppressedRows: [],
            fullRows: [],
            hasPublicAggregateSuppressionEnabled: false,
        };
    }
    const exportMetadata = buildSurveyExportMetadata({ activeSurveyConfig });

    const participantStates = getCountedParticipantStates({ context });
    const countedParticipantStates = activeSurveyConfig.isOptional
        ? participantStates
        : participantStates.filter(
              (participantState) =>
                  participantState.surveyGate.status === "complete_valid",
          );
    const suppressedRows: PublicSurveyAggregateRow[] = [];
    const fullRows: PublicSurveyAggregateRow[] = [];
    const clusterMembershipById = new Map(
        Array.from(context.clusterMembershipByParticipantId.values()).map(
            (membership) => [membership.clusterId, membership],
        ),
    );
    let hasPublicAggregateSuppressionEnabled = false;

    for (const question of exportMetadata.questionsInExportOrder) {
        if (question.questionType === "free_text") {
            continue;
        }

        const validOverallAnswerStates: SurveyChoiceParticipantAnswer[] = [];
        for (const participantState of countedParticipantStates) {
            const formItem = deriveSurveyQuestionFormItem({
                    question,
                    storedAnswer:
                        participantState.surveyState.answersByQuestionId.get(
                            question.id,
                        ),
                    surveyIsOptional: activeSurveyConfig.isOptional,
                });
            if (
                formItem.isCurrentAnswerValid &&
                formItem.currentAnswer?.questionType === "choice"
            ) {
                validOverallAnswerStates.push({
                    participantId: participantState.participantId,
                    optionSlugIds: formItem.currentAnswer.optionSlugIds,
                });
            }
        }

        const overallOptionCounts = buildSurveyOptionCounts({
            options: question.options,
            participantAnswers: validOverallAnswerStates,
        });

        hasPublicAggregateSuppressionEnabled ||=
            question.isPublicAggregateSuppressionEnabled;
        const isOverallSuppressed = shouldSuppressPublicSurveyAggregateBlock({
            optionCounts: overallOptionCounts,
            isPublicAggregateSuppressionEnabled:
                question.isPublicAggregateSuppressionEnabled,
        });
        suppressedRows.push(
            ...buildPublicSurveyAggregateBlockRows({
                scope: "overall",
                clusterId: "",
                clusterLabel: "",
                question,
                optionCounts: overallOptionCounts,
                denominator: validOverallAnswerStates.length,
                isSuppressed: isOverallSuppressed,
                suppressionReason: "count_below_threshold",
            }),
        );
        if (includeFullRows) {
            fullRows.push(
                ...buildPublicSurveyAggregateBlockRows({
                    scope: "overall",
                    clusterId: "",
                    clusterLabel: "",
                    question,
                    optionCounts: overallOptionCounts,
                    denominator: validOverallAnswerStates.length,
                    isSuppressed: false,
                    suppressionReason: "count_below_threshold",
                }),
            );
        }

        const clusterAnswerStatesById = new Map<
            string,
            SurveyChoiceParticipantAnswer[]
        >();
        for (const participantAnswer of validOverallAnswerStates) {
            const clusterId = context.clusterMembershipByParticipantId.get(
                participantAnswer.participantId,
            )?.clusterId;
            if (clusterId === undefined) {
                continue;
            }
            const clusterAnswers = clusterAnswerStatesById.get(clusterId) ?? [];
            clusterAnswers.push(participantAnswer);
            clusterAnswerStatesById.set(clusterId, clusterAnswers);
        }

        for (const [clusterId, clusterMembership] of clusterMembershipById) {
            const clusterAnswerStates =
                clusterAnswerStatesById.get(clusterId) ?? [];
            const optionCounts = buildSurveyOptionCounts({
                options: question.options,
                participantAnswers: clusterAnswerStates,
            });

            const isClusterSuppressed =
                shouldSuppressPublicSurveyAggregateBlock({
                    optionCounts,
                    isPublicAggregateSuppressionEnabled:
                        question.isPublicAggregateSuppressionEnabled,
                });
            suppressedRows.push(
                ...buildPublicSurveyAggregateBlockRows({
                    scope: "cluster",
                    clusterId: clusterMembership.clusterId,
                    clusterLabel: clusterMembership.clusterLabel,
                    question,
                    optionCounts,
                    denominator: clusterAnswerStates.length,
                    isSuppressed: isClusterSuppressed,
                    suppressionReason: "cluster_deductive_disclosure",
                }),
            );
            if (includeFullRows) {
                fullRows.push(
                    ...buildPublicSurveyAggregateBlockRows({
                        scope: "cluster",
                        clusterId: clusterMembership.clusterId,
                        clusterLabel: clusterMembership.clusterLabel,
                        question,
                        optionCounts,
                        denominator: clusterAnswerStates.length,
                        isSuppressed: false,
                        suppressionReason: "cluster_deductive_disclosure",
                    }),
                );
            }
        }
    }

    return {
        suppressedRows,
        fullRows,
        hasPublicAggregateSuppressionEnabled,
    };
}

export function buildSurveyAggregateCsvRows({
    context,
    includeSuppression,
}: {
    context: SurveyExportContext;
    includeSuppression: boolean;
}): SurveyAggregateCsvRow[] {
    const activeSurveyConfig = context.activeSurveyConfig;
    if (activeSurveyConfig === undefined) {
        return [];
    }
    const exportMetadata = buildSurveyExportMetadata({ activeSurveyConfig });

    const participantStates = getCountedParticipantStates({ context });
    const countedParticipantStates = activeSurveyConfig.isOptional
        ? participantStates
        : participantStates.filter(
              (participantState) =>
                  participantState.surveyGate.status === "complete_valid",
          );
    const rows: SurveyAggregateCsvRow[] = [];

    for (const question of exportMetadata.questionsInExportOrder) {
        if (question.questionType === "free_text") {
            continue;
        }
        const questionId = exportMetadata.questionIdByQuestionDbId.get(
            question.id,
        );
        if (questionId === undefined) {
            continue;
        }

        const validOverallAnswerStates = countedParticipantStates
            .map((participantState) => ({
                participantId: participantState.participantId,
                formItem: deriveSurveyQuestionFormItem({
                    question,
                    storedAnswer:
                        participantState.surveyState.answersByQuestionId.get(
                            question.id,
                        ),
                    surveyIsOptional: activeSurveyConfig.isOptional,
                }),
            }))
            .filter(
                (participantAnswer) =>
                    participantAnswer.formItem.isCurrentAnswerValid,
            );

        const overallOptionCounts = question.options
            .map((option) => {
                const optionId = exportMetadata.optionIdByOptionSlugId.get(
                    option.slugId,
                );
                if (optionId === undefined) {
                    return undefined;
                }

                return {
                    optionId,
                    count: validOverallAnswerStates.filter(
                        (participantAnswer) => {
                            const currentAnswer =
                                participantAnswer.formItem.currentAnswer;
                            if (
                                currentAnswer === undefined ||
                                currentAnswer.questionType === "free_text"
                            ) {
                                return false;
                            }

                            return currentAnswer.optionSlugIds.includes(
                                option.slugId,
                            );
                        },
                    ).length,
                };
            })
            .filter(
                (optionCount): optionCount is SurveyAggregateCsvOptionCount =>
                    optionCount !== undefined,
            );

        rows.push(
            ...buildSurveyAggregateCsvBlockRows({
                scope: "overall",
                clusterId: "",
                clusterLabel: "",
                questionId,
                optionCounts: overallOptionCounts,
                denominator: validOverallAnswerStates.length,
                isSuppressed: shouldSuppressSurveyAggregateBlock({
                    optionCounts: overallOptionCounts,
                    includeSuppression,
                    isPublicAggregateSuppressionEnabled:
                        question.isPublicAggregateSuppressionEnabled,
                }),
                suppressionReason: "count_below_threshold",
            }),
        );

        const clusterIds = new Set(
            countedParticipantStates
                .map((participantState) =>
                    context.clusterMembershipByParticipantId.get(
                        participantState.participantId,
                    ),
                )
                .filter(
                    (
                        clusterMembership,
                    ): clusterMembership is SurveyClusterMembership =>
                        clusterMembership !== undefined,
                )
                .map((clusterMembership) => clusterMembership.clusterId),
        );

        for (const clusterId of clusterIds) {
            const clusterMembership = Array.from(
                context.clusterMembershipByParticipantId.values(),
            ).find((entry) => entry.clusterId === clusterId);
            if (clusterMembership === undefined) {
                continue;
            }

            const clusterAnswerStates = validOverallAnswerStates.filter(
                (participantAnswer) =>
                    context.clusterMembershipByParticipantId.get(
                        participantAnswer.participantId,
                    )?.clusterId === clusterId,
            );

            const optionCounts = question.options
                .map((option) => {
                    const optionId = exportMetadata.optionIdByOptionSlugId.get(
                        option.slugId,
                    );
                    if (optionId === undefined) {
                        return undefined;
                    }

                    return {
                        optionId,
                        count: clusterAnswerStates.filter(
                            (participantAnswer) => {
                                const currentAnswer =
                                    participantAnswer.formItem.currentAnswer;
                                if (
                                    currentAnswer === undefined ||
                                    currentAnswer.questionType === "free_text"
                                ) {
                                    return false;
                                }

                                return currentAnswer.optionSlugIds.includes(
                                    option.slugId,
                                );
                            },
                        ).length,
                    };
                })
                .filter(
                    (
                        optionCount,
                    ): optionCount is SurveyAggregateCsvOptionCount =>
                        optionCount !== undefined,
                );

            rows.push(
                ...buildSurveyAggregateCsvBlockRows({
                    scope: "cluster",
                    clusterId: clusterMembership.clusterId,
                    clusterLabel: clusterMembership.clusterLabel,
                    questionId,
                    optionCounts,
                    denominator: clusterAnswerStates.length,
                    isSuppressed: shouldSuppressSurveyAggregateBlock({
                        optionCounts,
                        includeSuppression,
                        isPublicAggregateSuppressionEnabled:
                            question.isPublicAggregateSuppressionEnabled,
                    }),
                    suppressionReason: "cluster_deductive_disclosure",
                }),
            );
        }
    }

    return rows;
}

export function buildSurveyParticipantResponseRows({
    context,
    participantMap,
}: {
    context: SurveyExportContext;
    participantMap: GeneratorParams["participantMap"];
}): CsvRow[] {
    const activeSurveyConfig = context.activeSurveyConfig;
    if (activeSurveyConfig === undefined) {
        return [];
    }
    const exportMetadata = buildSurveyExportMetadata({ activeSurveyConfig });

    const rows: CsvRow[] = [];
    for (const participantState of getCountedParticipantStates({ context })) {
        const response = participantState.surveyState.response;
        if (
            response === undefined ||
            participantState.surveyGate.status === "withdrawn"
        ) {
            continue;
        }

        const exportParticipantId =
            participantMap.getOrCreateExportParticipantId({
                userId: participantState.participantId,
            });

        for (const question of exportMetadata.questionsInExportOrder) {
            const questionId = exportMetadata.questionIdByQuestionDbId.get(
                question.id,
            );
            if (questionId === undefined) {
                continue;
            }
            const questionFormItem = deriveSurveyQuestionFormItem({
                question,
                storedAnswer:
                    participantState.surveyState.answersByQuestionId.get(
                        question.id,
                    ),
                surveyIsOptional: activeSurveyConfig.isOptional,
            });

            const baseRow = {
                "participant-id": exportParticipantId,
                "response-status": participantState.surveyGate.status,
                "is-currently-counted":
                    activeSurveyConfig.isOptional ||
                    participantState.surveyGate.status === "complete_valid"
                        ? 1
                        : 0,
                "created-at": response.createdAt.toISOString(),
                "updated-at": response.updatedAt.toISOString(),
                "completed-at": response.completedAt?.toISOString() ?? "",
                "question-id": questionId,
                "answer-semantic-version":
                    questionFormItem.answeredQuestionSemanticVersion ?? "",
            };

            const currentAnswer = questionFormItem.currentAnswer;
            if (currentAnswer === undefined) {
                rows.push({
                    ...baseRow,
                    "option-id": "",
                    "answer-text-html": "",
                    "answer-text-plain": "",
                });
                continue;
            }

            if (currentAnswer.questionType === "free_text") {
                rows.push({
                    ...baseRow,
                    "option-id": "",
                    "answer-text-html": currentAnswer.textValueHtml,
                    "answer-text-plain":
                        surveyAnswerToPlainText({ answer: currentAnswer }) ??
                        "",
                });
                continue;
            }

            if (currentAnswer.optionSlugIds.length === 0) {
                rows.push({
                    ...baseRow,
                    "option-id": "",
                    "answer-text-html": "",
                    "answer-text-plain": "",
                });
                continue;
            }

            for (const optionSlugId of currentAnswer.optionSlugIds) {
                const optionId =
                    exportMetadata.optionIdByOptionSlugId.get(optionSlugId);
                if (optionId === undefined) {
                    continue;
                }
                rows.push({
                    ...baseRow,
                    "option-id": optionId,
                    "answer-text-html": "",
                    "answer-text-plain": "",
                });
            }
        }
    }

    return rows;
}
