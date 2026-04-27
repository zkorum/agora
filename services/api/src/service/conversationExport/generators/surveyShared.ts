import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import {
    conversationTable,
    maxdiffComparisonTable,
    maxdiffResultTable,
    opinionTable,
    polisClusterTable,
    polisClusterUserTable,
    surveyAnswerOptionTable,
    surveyAnswerTable,
    surveyQuestionOptionTable,
    surveyResponseTable,
    userTable,
    voteTable,
} from "@/shared-backend/schema.js";
import type {
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
import type { GeneratorParams } from "./base.js";

export const PUBLIC_SURVEY_SUPPRESSION_THRESHOLD = 5;

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
            questionSemanticVersion: question.currentSemanticVersion,
        };
        questionIdByQuestionDbId.set(question.id, questionMetadata.exportQuestionId);
        questionRows.push({
            "question-id": questionMetadata.exportQuestionId,
            "question-slug-id": questionMetadata.questionSlugId,
            "question-order": questionMetadata.questionOrder,
            "question-type": questionMetadata.questionType,
            "question-text": questionMetadata.questionText,
            "is-required": questionMetadata.isRequired,
            "question-semantic-version": questionMetadata.questionSemanticVersion,
        });

        const sortedOptions = [...question.options].sort((leftOption, rightOption) => {
            return compareByDisplayOrderAndSlugId({
                leftDisplayOrder: leftOption.displayOrder,
                rightDisplayOrder: rightOption.displayOrder,
                leftSlugId: leftOption.slugId,
                rightSlugId: rightOption.slugId,
            });
        });
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
}: {
    optionCounts: SurveyAggregateCsvOptionCount[];
    includeSuppression: boolean;
}): boolean {
    return (
        includeSuppression &&
        optionCounts.some(
            (optionCount) =>
                optionCount.count > 0 &&
                optionCount.count < PUBLIC_SURVEY_SUPPRESSION_THRESHOLD,
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
    const participantIdsWithState = new Set(
        context.participantStates.map(
            (participantState) => participantState.participantId,
        ),
    );
    let completeValid = 0;
    let needsUpdate = 0;
    let notStarted = 0;
    let inProgress = 0;

    for (const participantState of context.participantStates) {
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

async function loadSurveyParticipantIds({
    db,
    conversationId,
    surveyParticipantIds,
}: {
    db: GeneratorParams["db"];
    conversationId: number;
    surveyParticipantIds: string[];
}): Promise<Set<string>> {
    const [opinionParticipants, voteParticipants, maxdiffParticipants] =
        await Promise.all([
        db
            .select({ participantId: opinionTable.authorId })
            .from(opinionTable)
            .innerJoin(userTable, eq(opinionTable.authorId, userTable.id))
            .where(
                and(
                    eq(opinionTable.conversationId, conversationId),
                    eq(userTable.isDeleted, false),
                    eq(opinionTable.isSeed, false),
                    isNotNull(opinionTable.currentContentId),
                ),
            ),
        db
            .select({ participantId: voteTable.authorId })
            .from(voteTable)
            .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
            .innerJoin(userTable, eq(voteTable.authorId, userTable.id))
            .where(
                and(
                    eq(opinionTable.conversationId, conversationId),
                    eq(userTable.isDeleted, false),
                    isNotNull(opinionTable.currentContentId),
                    isNotNull(voteTable.currentContentId),
                ),
            ),
        db
            .select({ participantId: maxdiffResultTable.participantId })
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
                    eq(maxdiffResultTable.conversationId, conversationId),
                    eq(userTable.isDeleted, false),
                    isNull(maxdiffComparisonTable.deletedAt),
                ),
            ),
    ]);

    return new Set([
        ...surveyParticipantIds,
        ...opinionParticipants.map((row) => row.participantId),
        ...voteParticipants.map((row) => row.participantId),
        ...maxdiffParticipants.map((row) => row.participantId),
    ]);
}

export async function loadSurveyExportContext({
    db,
    conversationId,
}: Pick<
    GeneratorParams,
    "db" | "conversationId"
>): Promise<SurveyExportContext> {
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

    const responseRows = await db
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
            ),
        )
        .orderBy(asc(surveyResponseTable.createdAt));
    const allParticipantIds = await loadSurveyParticipantIds({
        db,
        conversationId,
        surveyParticipantIds: responseRows.map(
            (response) => response.participantId,
        ),
    });

    const responseIds = responseRows.map((response) => response.responseId);
    const answerRows =
        responseIds.length === 0
            ? []
            : await db
                  .select({
                      surveyResponseId: surveyAnswerTable.surveyResponseId,
                      answerId: surveyAnswerTable.id,
                      surveyQuestionId: surveyAnswerTable.surveyQuestionId,
                      answeredQuestionSemanticVersion:
                          surveyAnswerTable.answeredQuestionSemanticVersion,
                      textValueHtml: surveyAnswerTable.textValueHtml,
                  })
                  .from(surveyAnswerTable)
                  .where(
                      and(
                          inArray(
                              surveyAnswerTable.surveyResponseId,
                              responseIds,
                          ),
                          isNull(surveyAnswerTable.deletedAt),
                      ),
                  );

    const answerIds = answerRows.map((answer) => answer.answerId);
    const answerOptionRows =
        answerIds.length === 0
            ? []
            : await db
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
                              answerIds,
                          ),
                          isNull(surveyAnswerOptionTable.deletedAt),
                      ),
                  );

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
                    optionSlugIds: string[];
                }
            >();
        answersByQuestionId.set(answer.surveyQuestionId, {
            answerId: answer.answerId,
            answeredQuestionSemanticVersion:
                answer.answeredQuestionSemanticVersion,
            textValueHtml: answer.textValueHtml,
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
    const currentPolisContentRows = await db
        .select({
            currentPolisContentId: conversationTable.currentPolisContentId,
        })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId))
        .limit(1);

    const currentPolisContentId =
        currentPolisContentRows[0]?.currentPolisContentId;
    if (
        currentPolisContentId == null ||
        participantIdsWithResponse.length === 0
    ) {
        return {
            activeSurveyConfig,
            participantIds: allParticipantIds,
            participantStates,
            clusterMembershipByParticipantId: new Map(),
        };
    }

    const clusterRows = await db
        .select({
            participantId: polisClusterUserTable.userId,
            clusterId: polisClusterTable.key,
            clusterLabel: polisClusterTable.aiLabel,
        })
        .from(polisClusterUserTable)
        .innerJoin(
            polisClusterTable,
            eq(polisClusterUserTable.polisClusterId, polisClusterTable.id),
        )
        .where(
            and(
                eq(polisClusterUserTable.polisContentId, currentPolisContentId),
                inArray(
                    polisClusterUserTable.userId,
                    participantIdsWithResponse,
                ),
            ),
        );

    const clusterMembershipByParticipantId = new Map<
        string,
        SurveyClusterMembership
    >();
    for (const clusterRow of clusterRows) {
        clusterMembershipByParticipantId.set(clusterRow.participantId, {
            clusterId: clusterRow.clusterId,
            clusterLabel:
                clusterRow.clusterLabel ?? `Cluster ${clusterRow.clusterId}`,
        });
    }

    return {
        activeSurveyConfig,
        participantIds: allParticipantIds,
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
    includeSuppression,
}: {
    optionCounts: SurveyAggregatePublicOptionCount[];
    includeSuppression: boolean;
}): boolean {
    return (
        includeSuppression &&
        optionCounts.some(
            (optionCount) =>
                optionCount.count > 0 &&
                optionCount.count < PUBLIC_SURVEY_SUPPRESSION_THRESHOLD,
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
        suppressionReason: isSuppressed ? suppressionReason : undefined,
    }));
}

export function buildSurveyAggregateRows({
    context,
    includeSuppression,
}: {
    context: SurveyExportContext;
    includeSuppression: boolean;
}): PublicSurveyAggregateRow[] {
    const activeSurveyConfig = context.activeSurveyConfig;
    if (activeSurveyConfig === undefined) {
        return [];
    }
    const exportMetadata = buildSurveyExportMetadata({ activeSurveyConfig });

    const countedParticipantStates = activeSurveyConfig.isOptional
        ? context.participantStates
        : context.participantStates.filter(
              (participantState) =>
                  participantState.surveyGate.status === "complete_valid",
          );
    const rows: PublicSurveyAggregateRow[] = [];

    for (const question of exportMetadata.questionsInExportOrder) {
        if (question.questionType === "free_text") {
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

        const overallOptionCounts = question.options.map((option) => ({
            optionId: option.slugId,
            option: option.optionText,
            count: validOverallAnswerStates.filter((participantAnswer) => {
                const currentAnswer = participantAnswer.formItem.currentAnswer;
                if (
                    currentAnswer === undefined ||
                    currentAnswer.questionType === "free_text"
                ) {
                    return false;
                }

                return currentAnswer.optionSlugIds.includes(option.slugId);
            }).length,
        }));

        rows.push(
            ...buildPublicSurveyAggregateBlockRows({
                scope: "overall",
                clusterId: "",
                clusterLabel: "",
                question,
                optionCounts: overallOptionCounts,
                denominator: validOverallAnswerStates.length,
                isSuppressed: shouldSuppressPublicSurveyAggregateBlock({
                    optionCounts: overallOptionCounts,
                    includeSuppression,
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

            const optionCounts = question.options.map((option) => ({
                optionId: option.slugId,
                option: option.optionText,
                count: clusterAnswerStates.filter((participantAnswer) => {
                    const currentAnswer = participantAnswer.formItem.currentAnswer;
                    if (
                        currentAnswer === undefined ||
                        currentAnswer.questionType === "free_text"
                    ) {
                        return false;
                    }

                    return currentAnswer.optionSlugIds.includes(option.slugId);
                }).length,
            }));

            rows.push(
                ...buildPublicSurveyAggregateBlockRows({
                    scope: "cluster",
                    clusterId: clusterMembership.clusterId,
                    clusterLabel: clusterMembership.clusterLabel,
                    question,
                    optionCounts,
                    denominator: clusterAnswerStates.length,
                    isSuppressed: shouldSuppressPublicSurveyAggregateBlock({
                        optionCounts,
                        includeSuppression,
                    }),
                    suppressionReason: "cluster_deductive_disclosure",
                }),
            );
        }
    }

    return rows;
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

    const countedParticipantStates = activeSurveyConfig.isOptional
        ? context.participantStates
        : context.participantStates.filter(
              (participantState) =>
                  participantState.surveyGate.status === "complete_valid",
          );
    const rows: SurveyAggregateCsvRow[] = [];

    for (const question of exportMetadata.questionsInExportOrder) {
        if (question.questionType === "free_text") {
            continue;
        }
        const questionId = exportMetadata.questionIdByQuestionDbId.get(question.id);
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
                    count: validOverallAnswerStates.filter((participantAnswer) => {
                        const currentAnswer = participantAnswer.formItem.currentAnswer;
                        if (
                            currentAnswer === undefined ||
                            currentAnswer.questionType === "free_text"
                        ) {
                            return false;
                        }

                        return currentAnswer.optionSlugIds.includes(option.slugId);
                    }).length,
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
                scope: "overall",
                clusterId: "",
                clusterLabel: "",
                questionId,
                optionCounts: overallOptionCounts,
                denominator: validOverallAnswerStates.length,
                isSuppressed: shouldSuppressSurveyAggregateBlock({
                    optionCounts: overallOptionCounts,
                    includeSuppression,
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
                        count: clusterAnswerStates.filter((participantAnswer) => {
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
                        }).length,
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
    for (const participantState of context.participantStates) {
        const response = participantState.surveyState.response;
        if (response === undefined || participantState.surveyGate.status === "withdrawn") {
            continue;
        }

        const exportParticipantId =
            participantMap.getOrCreateExportParticipantId({
                userId: participantState.participantId,
            });

        for (const question of exportMetadata.questionsInExportOrder) {
            const questionId = exportMetadata.questionIdByQuestionDbId.get(question.id);
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
                const optionId = exportMetadata.optionIdByOptionSlugId.get(
                    optionSlugId,
                );
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
