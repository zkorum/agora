import { httpErrors } from "@fastify/sensible";
import { and, asc, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { generateRandomSlugId } from "@/crypto.js";
import {
    conversationTable,
    maxdiffComparisonTable,
    maxdiffResultTable,
    opinionModerationTable,
    opinionGroupLineageTable,
    opinionGroupTable,
    opinionTable,
    surveyAggregateOptionTable,
    surveyAggregateQuestionTable,
    surveyAggregateResultTable,
    surveyAggregateSnapshotTable,
    surveyAnswerOptionTable,
    surveyAnswerTable,
    surveyConfigTable,
    surveyQuestionContentTable,
    surveyQuestionOptionContentTable,
    surveyQuestionOptionTable,
    surveyQuestionTable,
    surveyResponseTable,
    voteTable,
} from "@/shared-backend/schema.js";
import { scheduleConversationAnalysisRefresh } from "@/shared-backend/conversationCounters.js";
import {
    enqueueScheduledConversationForMathWork,
    hasActiveVotesForMathWork,
    hasSurveyResponsesForMathWork,
} from "@/shared-backend/analysisScheduler.js";
import {
    doesSurveyRequireCompletion,
    shouldRecomputeAnalysisForSurveyConfigChange,
    shouldRecomputeAnalysisForSurveyTransition,
    type SurveyGateStatus as InternalSurveyGateStatus,
} from "@/shared-backend/surveyAnalysis.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
import {
    countHtmlPlainTextCharacters,
    htmlToCountedText,
    PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD,
} from "@/shared/shared.js";
import {
    zodSurveyQuestionConstraints,
    type AnalysisView,
    type ConversationType,
    type ParticipationBlockedReason,
    type SurveyAnswerDraft,
    type SurveyAggregateRow,
    type SurveyAnswerSubmission,
    type SurveyCompletionCounts,
    type SurveyConfig,
    type SurveyChoiceDisplay,
    type SurveyGateSummary,
    type SurveyQuestionConfig,
    type SurveyQuestionConstraints,
    type SurveyQuestionFormItem,
    type SurveyQuestionOption,
    type SurveyQuestionType,
    type SurveyResultsAccessLevel,
    type SurveyRouteResolution,
} from "@/shared/types/zod.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { log } from "@/app.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import {
    getConversationViewAccessLevelForConversation,
} from "@/service/conversationAccess.js";
import { requireProjectCapability } from "@/service/projectAccess.js";
import {
    buildSurveyCompletionCounts,
    loadSurveyExportContext,
} from "./conversationExport/generators/surveyShared.js";
import { checkConversationParticipation } from "./participationGate.js";
import {
    getDescriptionTextsByGroupId,
    getSelectedOpinionGroupCandidate,
} from "./opinionGroupAnalysis.js";
import {
    getPremiumEntitlementSubjectForConversation,
    requirePremiumAccess,
} from "./premiumEntitlement.js";
import { resolveContentLanguageMetadata } from "./contentLanguageMetadata.js";

interface ConversationAccessContext {
    conversationId: number;
    slugId: string;
    projectId: number;
    participationMode: (typeof conversationTable.$inferSelect)["participationMode"];
    conversationType: (typeof conversationTable.$inferSelect)["conversationType"];
    currentContentId: number | null;
    isClosed: boolean;
    requiresEventTicket: (typeof conversationTable.$inferSelect)["requiresEventTicket"];
}

interface SurveyConfigUpdateEffect {
    previousRequiresSurvey: boolean;
    nextRequiresSurvey: boolean;
    didRequiredQuestionSemanticChange: boolean;
}

interface InternalSurveyGateSummary {
    hasSurvey: boolean;
    isOptional: boolean;
    canParticipate: boolean;
    status: InternalSurveyGateStatus;
}

interface SurveyGateDetails extends InternalSurveyGateSummary {
    requiredQuestionCount: number;
    validRequiredAnswerCount: number;
    staleRequiredQuestionCount: number;
}

interface SurveyAnalysisRefreshContext {
    conversationId: number;
    slugId: string;
    conversationType: ConversationType;
}

async function markMaxdiffConversationDirty({
    conversationId,
    conversationSlugId,
    valkey,
}: {
    conversationId: number;
    conversationSlugId: string;
    valkey: Valkey | undefined;
}): Promise<void> {
    if (valkey === undefined) {
        return;
    }

    const member = `${String(conversationId)}:${conversationSlugId}`;
    try {
        await valkey.zadd(VALKEY_QUEUE_KEYS.SCORING_DIRTY_SOLIDAGO, {
            [member]: 0,
        });
    } catch (error: unknown) {
        log.error(
            error,
            `[Survey] Failed to ZADD scoring:dirty:solidago for ${member}`,
        );
    }
}

async function refreshConversationAnalysisForSurveyChange({
    db,
    conversation,
    valkey,
}: {
    db: PostgresJsDatabase;
    conversation: SurveyAnalysisRefreshContext;
    valkey: Valkey | undefined;
}): Promise<void> {
    if (conversation.conversationType === "maxdiff") {
        await markMaxdiffConversationDirty({
            conversationId: conversation.conversationId,
            conversationSlugId: conversation.slugId,
            valkey,
        });
        return;
    }

    const hasActiveVotes = await hasActiveVotesForMathWork({
        db,
        conversationId: conversation.conversationId,
    });
    const hasSurveyResponses = await hasSurveyResponsesForMathWork({
        db,
        conversationId: conversation.conversationId,
    });
    if (!hasActiveVotes && !hasSurveyResponses) {
        log.info(
            `[Survey] Skipping math work schedule for survey change without active inputs conversationId=${String(conversation.conversationId)} conversationSlugId=${conversation.slugId}`,
        );
        return;
    }

    await scheduleConversationAnalysisRefresh({
        db,
        conversationId: conversation.conversationId,
        log,
        queueStrategy: "caller_will_enqueue",
    });
    await enqueueScheduledConversationForMathWork({
        db,
        valkey,
        conversationId: conversation.conversationId,
        log,
    });
}

async function hasParticipantAnalysisInput({
    db,
    conversation,
    participantId,
}: {
    db: PostgresJsDatabase;
    conversation: SurveyAnalysisRefreshContext;
    participantId: string;
}): Promise<boolean> {
    if (conversation.conversationType === "maxdiff") {
        const rows = await db
            .select({ id: maxdiffResultTable.id })
            .from(maxdiffResultTable)
            .innerJoin(
                maxdiffComparisonTable,
                eq(maxdiffComparisonTable.maxdiffResultId, maxdiffResultTable.id),
            )
            .where(
                and(
                    eq(
                        maxdiffResultTable.conversationId,
                        conversation.conversationId,
                    ),
                    eq(maxdiffResultTable.participantId, participantId),
                    isNull(maxdiffComparisonTable.deletedAt),
                ),
            )
            .limit(1);
        return rows.length > 0;
    }

    const rows = await db
        .select({ id: voteTable.id })
        .from(voteTable)
        .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
        .leftJoin(
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, opinionTable.id),
        )
        .where(
            and(
                eq(opinionTable.conversationId, conversation.conversationId),
                eq(voteTable.authorId, participantId),
                isNotNull(voteTable.currentContentId),
                isNotNull(opinionTable.currentContentId),
                isNull(opinionModerationTable.id),
            ),
        )
        .limit(1);
    return rows.length > 0;
}

async function refreshConversationAnalysisForParticipantSurveyTransition({
    db,
    conversation,
    participantId,
    previousSurveyGateStatus,
    nextSurveyGateStatus,
    valkey,
}: {
    db: PostgresJsDatabase;
    conversation: SurveyAnalysisRefreshContext;
    participantId: string;
    previousSurveyGateStatus: InternalSurveyGateStatus;
    nextSurveyGateStatus: InternalSurveyGateStatus;
    valkey: Valkey | undefined;
}): Promise<void> {
    const hasAnalysisInput = await hasParticipantAnalysisInput({
        db,
        conversation,
        participantId,
    });

    if (!hasAnalysisInput) {
        log.info(
            `[Survey] Skipped analysis refresh for survey transition without participant input conversationId=${String(conversation.conversationId)} conversationSlugId=${conversation.slugId} conversationType=${conversation.conversationType} participantId=${participantId} previousSurveyGateStatus=${previousSurveyGateStatus} nextSurveyGateStatus=${nextSurveyGateStatus}`,
        );
        return;
    }

    log.info(
        `[Survey] Scheduling analysis refresh for participant survey transition conversationId=${String(conversation.conversationId)} conversationSlugId=${conversation.slugId} conversationType=${conversation.conversationType} participantId=${participantId} previousSurveyGateStatus=${previousSurveyGateStatus} nextSurveyGateStatus=${nextSurveyGateStatus}`,
    );
    await refreshConversationAnalysisForSurveyChange({
        db,
        conversation,
        valkey,
    });
}

function createEmptySurveyCompletionCounts(): SurveyCompletionCounts {
    return {
        total: 0,
        completeValid: 0,
        needsUpdate: 0,
        notStarted: 0,
        inProgress: 0,
    };
}

function toSurveyGateDto({
    surveyGate,
}: {
    surveyGate: SurveyGateDetails;
}): SurveyGateSummary {
    return {
        hasSurvey: surveyGate.hasSurvey,
        isOptional: surveyGate.isOptional,
        canParticipate: surveyGate.canParticipate,
        status:
            surveyGate.status === "withdrawn"
                ? "not_started"
                : surveyGate.status,
    };
}

export interface ActiveSurveyOptionRecord {
    id: number;
    slugId: string;
    currentContentId?: number | null;
    displayOrder: number;
    optionText: string;
    sourceLanguageCode?: string | null;
    sourceLanguageConfidence?: number | null;
}

export interface ActiveSurveyQuestionRecord {
    id: number;
    slugId: string;
    questionType: SurveyQuestionType;
    choiceDisplay: SurveyChoiceDisplay;
    currentContentId?: number | null;
    currentSemanticVersion: number;
    displayOrder: number;
    isRequired: boolean;
    isPublicAggregateSuppressionEnabled: boolean;
    questionText: string;
    constraints: SurveyQuestionConstraints;
    sourceLanguageCode?: string | null;
    sourceLanguageConfidence?: number | null;
    options: ActiveSurveyOptionRecord[];
}

export interface ActiveSurveyConfigRecord {
    id: number;
    currentRevision: number;
    isOptional: boolean;
    questions: ActiveSurveyQuestionRecord[];
}

export interface StoredSurveyAnswer {
    answerId: number;
    answeredQuestionSemanticVersion: number;
    textValueHtml: string | null;
    optionSlugIds: string[];
}

function isStoredSurveyAnswerPassed({
    question,
    storedAnswer,
}: {
    question: ActiveSurveyQuestionRecord;
    storedAnswer: StoredSurveyAnswer;
}): boolean {
    if (question.isRequired) {
        return false;
    }

    return (
        storedAnswer.optionSlugIds.length === 0 &&
        htmlToCountedText(storedAnswer.textValueHtml ?? "").length === 0
    );
}

function getParticipantSurveyQuestion({
    question,
    surveyIsOptional,
}: {
    question: ActiveSurveyQuestionRecord;
    surveyIsOptional: boolean;
}): ActiveSurveyQuestionRecord {
    if (!surveyIsOptional || !question.isRequired) {
        return question;
    }

    return {
        ...question,
        isRequired: false,
    };
}

function isSurveyQuestionCompleted({
    question,
    storedAnswer,
}: {
    question: ActiveSurveyQuestionRecord;
    storedAnswer: StoredSurveyAnswer | undefined;
}): boolean {
    if (storedAnswer === undefined) {
        return false;
    }

    if (isStoredSurveyAnswerPassed({ question, storedAnswer })) {
        return true;
    }

    return validateSurveyAnswer({
        question,
        answer: storedSurveyAnswerToAnswerDraft({ question, storedAnswer }),
    });
}

export interface SurveyParticipantState {
    activeSurveyConfig: ActiveSurveyConfigRecord | undefined;
    response:
        | {
              id: number;
              createdAt: Date;
              updatedAt: Date;
              completedAt: Date | null;
              withdrawnAt: Date | null;
          }
        | undefined;
    answersByQuestionId: Map<number, StoredSurveyAnswer>;
}

function normalizeSurveyConfigInput({
    surveyConfig,
}: {
    surveyConfig: SurveyConfig | null;
}): SurveyConfig | null {
    if (surveyConfig === null || surveyConfig.questions.length === 0) {
        return null;
    }
    return surveyConfig;
}

export function surveyQuestionToConfig({
    question,
}: {
    question: ActiveSurveyQuestionRecord;
}): SurveyQuestionConfig {
    const baseQuestion = {
        questionSlugId: question.slugId,
        questionText: question.questionText,
        isRequired: question.isRequired,
        displayOrder: question.displayOrder,
    };

    switch (question.questionType) {
        case "free_text":
            if (question.constraints.type !== "free_text") {
                throw httpErrors.internalServerError(
                    "Survey free text question has invalid constraints",
                );
            }

            return {
                ...baseQuestion,
                questionType: "free_text",
                constraints: question.constraints,
            };
        case "choice":
            if (question.constraints.type !== "choice") {
                throw httpErrors.internalServerError(
                    "Survey choice question has invalid constraints",
                );
            }

            return {
                ...baseQuestion,
                questionType: "choice",
                choiceDisplay: question.choiceDisplay,
                isPublicAggregateSuppressionEnabled:
                    question.isPublicAggregateSuppressionEnabled,
                constraints: question.constraints,
                options: question.options.map((option) => ({
                    optionSlugId: option.slugId,
                    optionText: option.optionText,
                    displayOrder: option.displayOrder,
                })),
            };
    }
}

function getSurveyQuestionConfigOptions({
    question,
}: {
    question: SurveyQuestionConfig;
}): readonly SurveyQuestionOption[] {
    return question.questionType === "free_text" ? [] : question.options;
}

function storedSurveyAnswerToAnswerDraft({
    question,
    storedAnswer,
}: {
    question: ActiveSurveyQuestionRecord;
    storedAnswer: StoredSurveyAnswer;
}): SurveyAnswerDraft {
    switch (question.questionType) {
        case "free_text":
            return {
                questionType: question.questionType,
                textValueHtml: storedAnswer.textValueHtml ?? "",
            };
        case "choice":
            return {
                questionType: question.questionType,
                optionSlugIds: storedAnswer.optionSlugIds,
            };
    }
}

export function surveyQuestionToAnswerDraft({
    question,
    storedAnswer,
}: {
    question: ActiveSurveyQuestionRecord;
    storedAnswer: StoredSurveyAnswer;
}): SurveyAnswerDraft | undefined {
    if (isStoredSurveyAnswerPassed({ question, storedAnswer })) {
        return undefined;
    }

    return storedSurveyAnswerToAnswerDraft({ question, storedAnswer });
}

function isStoredSurveyAnswerCurrentAndValid({
    question,
    storedAnswer,
}: {
    question: ActiveSurveyQuestionRecord;
    storedAnswer: StoredSurveyAnswer;
}): boolean {
    if (
        storedAnswer.answeredQuestionSemanticVersion !==
        question.currentSemanticVersion
    ) {
        return false;
    }

    if (isStoredSurveyAnswerPassed({ question, storedAnswer })) {
        return false;
    }

    return validateSurveyAnswer({
        question,
        answer: storedSurveyAnswerToAnswerDraft({ question, storedAnswer }),
    });
}

function getRequiredQuestionValidationState({
    question,
    storedAnswer,
}: {
    question: ActiveSurveyQuestionRecord;
    storedAnswer: StoredSurveyAnswer | undefined;
}): "missing" | "valid" | "stale" {
    if (storedAnswer === undefined) {
        return "missing";
    }

    return isStoredSurveyAnswerCurrentAndValid({ question, storedAnswer })
        ? "valid"
        : "stale";
}

function validateIntegerSurveyTextAnswer({
    textValueHtml,
    minValue,
    maxValue,
}: {
    textValueHtml: string;
    minValue: number;
    maxValue: number | undefined;
}): boolean {
    if (!/^\d+$/.test(textValueHtml)) {
        return false;
    }

    const parsedValue = Number(textValueHtml);
    if (!Number.isSafeInteger(parsedValue)) {
        return false;
    }

    return (
        parsedValue >= minValue &&
        (maxValue === undefined || parsedValue <= maxValue)
    );
}

export function validateSurveyAnswer({
    question,
    answer,
}: {
    question: ActiveSurveyQuestionRecord;
    answer: SurveyAnswerSubmission;
}): boolean {
    if (question.questionType !== answer.questionType) {
        return false;
    }

    switch (answer.questionType) {
        case "free_text": {
            if (question.constraints.type !== "free_text") {
                return false;
            }

            if (question.constraints.inputMode === "integer") {
                return validateIntegerSurveyTextAnswer({
                    textValueHtml: answer.textValueHtml,
                    minValue: question.constraints.minValue,
                    maxValue: question.constraints.maxValue,
                });
            }

            const { maxHtmlLength, maxPlainTextLength, minPlainTextLength } =
                question.constraints;
            if (answer.textValueHtml.length > maxHtmlLength) {
                return false;
            }

            const { characterCount } = countHtmlPlainTextCharacters(
                answer.textValueHtml,
            );
            const effectiveMinLength = Math.max(minPlainTextLength ?? 0, 1);
            return (
                characterCount >= effectiveMinLength &&
                characterCount <= maxPlainTextLength
            );
        }
        case "choice": {
            if (question.constraints.type !== "choice") {
                return false;
            }

            const currentOptionSlugIds = new Set(
                question.options.map((option) => option.slugId),
            );
            const uniqueOptionSlugIds = new Set(answer.optionSlugIds);
            if (uniqueOptionSlugIds.size !== answer.optionSlugIds.length) {
                return false;
            }

            for (const optionSlugId of answer.optionSlugIds) {
                if (!currentOptionSlugIds.has(optionSlugId)) {
                    return false;
                }
            }

            const { minSelections, maxSelections } = question.constraints;
            if (answer.optionSlugIds.length < minSelections) {
                return false;
            }
            if (
                maxSelections !== undefined &&
                answer.optionSlugIds.length > maxSelections
            ) {
                return false;
            }
            return true;
        }
    }
}

export function deriveSurveyQuestionFormItem({
    question,
    storedAnswer,
    surveyIsOptional = false,
}: {
    question: ActiveSurveyQuestionRecord;
    storedAnswer: StoredSurveyAnswer | undefined;
    surveyIsOptional?: boolean;
}): SurveyQuestionFormItem {
    const effectiveQuestion = getParticipantSurveyQuestion({
        question,
        surveyIsOptional,
    });
    const candidateAnswer =
        storedAnswer === undefined
            ? undefined
            : surveyQuestionToAnswerDraft({
                  question: effectiveQuestion,
                  storedAnswer,
              });
    const isPassed =
        storedAnswer !== undefined &&
        isStoredSurveyAnswerPassed({
            question: effectiveQuestion,
            storedAnswer,
        });
    const isStale =
        effectiveQuestion.isRequired &&
        storedAnswer !== undefined &&
        !isPassed &&
        candidateAnswer !== undefined &&
        (storedAnswer.answeredQuestionSemanticVersion !==
            effectiveQuestion.currentSemanticVersion ||
            !validateSurveyAnswer({
                question: effectiveQuestion,
                answer: candidateAnswer,
            }));
    const currentAnswer = isStale ? undefined : candidateAnswer;
    const isCurrentAnswerValid =
        currentAnswer !== undefined &&
        validateSurveyAnswer({
            question: effectiveQuestion,
            answer: currentAnswer,
        });

    return {
        ...surveyQuestionToConfig({ question: effectiveQuestion }),
        currentAnswer,
        isPassed,
        isMissingRequired:
            effectiveQuestion.isRequired && !isCurrentAnswerValid && !isStale,
        isStale,
        isCurrentAnswerValid,
        currentSemanticVersion: effectiveQuestion.currentSemanticVersion,
        answeredQuestionSemanticVersion: isStale
            ? undefined
            : storedAnswer?.answeredQuestionSemanticVersion,
    };
}

export function deriveSurveyGate({
    surveyState,
    participantId,
}: {
    surveyState: SurveyParticipantState;
    participantId: string | undefined;
}): SurveyGateDetails {
    const { activeSurveyConfig, response, answersByQuestionId } = surveyState;
    if (activeSurveyConfig === undefined) {
        return {
            hasSurvey: false,
            isOptional: false,
            canParticipate: true,
            status: "no_survey",
            requiredQuestionCount: 0,
            validRequiredAnswerCount: 0,
            staleRequiredQuestionCount: 0,
        };
    }

    const surveyIsOptional = activeSurveyConfig.isOptional;
    const requiredQuestions = activeSurveyConfig.questions.filter(
        (question) => question.isRequired,
    );
    const requiresSurveyCompletion = doesSurveyRequireCompletion({
        isOptional: surveyIsOptional,
        requiredQuestionCount: requiredQuestions.length,
    });

    if (!requiresSurveyCompletion) {
        const completedQuestionCount = activeSurveyConfig.questions.filter(
            (question) => {
                return isSurveyQuestionCompleted({
                    question: getParticipantSurveyQuestion({
                        question,
                        surveyIsOptional,
                    }),
                    storedAnswer: answersByQuestionId.get(question.id),
                });
            },
        ).length;

        const status =
            response?.withdrawnAt !== null &&
            response?.withdrawnAt !== undefined
                ? "withdrawn"
                : completedQuestionCount ===
                        activeSurveyConfig.questions.length &&
                    activeSurveyConfig.questions.length > 0
                  ? "complete_valid"
                  : answersByQuestionId.size > 0
                    ? "in_progress"
                    : "not_started";
        return {
            hasSurvey: true,
            isOptional: surveyIsOptional,
            canParticipate: true,
            status,
            requiredQuestionCount: 0,
            validRequiredAnswerCount: 0,
            staleRequiredQuestionCount: 0,
        };
    }

    if (participantId === undefined) {
        return {
            hasSurvey: true,
            isOptional: surveyIsOptional,
            canParticipate: false,
            status: "not_started",
            requiredQuestionCount: requiredQuestions.length,
            validRequiredAnswerCount: 0,
            staleRequiredQuestionCount: 0,
        };
    }

    if (response?.withdrawnAt !== null && response?.withdrawnAt !== undefined) {
        return {
            hasSurvey: true,
            isOptional: surveyIsOptional,
            canParticipate: false,
            status: "withdrawn",
            requiredQuestionCount: requiredQuestions.length,
            validRequiredAnswerCount: 0,
            staleRequiredQuestionCount: requiredQuestions.length,
        };
    }

    let validRequiredAnswerCount = 0;
    let staleRequiredQuestionCount = 0;
    for (const question of requiredQuestions) {
        const validationState = getRequiredQuestionValidationState({
            question,
            storedAnswer: answersByQuestionId.get(question.id),
        });

        if (validationState === "missing") {
            continue;
        }

        if (validationState === "valid") {
            validRequiredAnswerCount += 1;
        } else {
            staleRequiredQuestionCount += 1;
        }
    }

    let status: InternalSurveyGateStatus;
    if (staleRequiredQuestionCount > 0) {
        status = "needs_update";
    } else if (validRequiredAnswerCount === requiredQuestions.length) {
        status = "complete_valid";
    } else if (answersByQuestionId.size > 0) {
        status = "in_progress";
    } else {
        status = "not_started";
    }

    return {
        hasSurvey: true,
        isOptional: surveyIsOptional,
        canParticipate: status === "complete_valid",
        status,
        requiredQuestionCount: requiredQuestions.length,
        validRequiredAnswerCount,
        staleRequiredQuestionCount,
    };
}

export function deriveSurveyRouteResolution({
    surveyState,
    participantId,
}: {
    surveyState: SurveyParticipantState;
    participantId: string | undefined;
}): SurveyRouteResolution {
    const surveyGate = deriveSurveyGate({ surveyState, participantId });

    if (surveyGate.status === "no_survey") {
        return { kind: "none" };
    }

    if (surveyGate.requiredQuestionCount === 0) {
        if (surveyGate.status === "complete_valid") {
            return { kind: "summary" };
        }

        if (surveyState.activeSurveyConfig === undefined) {
            return { kind: "none" };
        }

        for (const question of surveyState.activeSurveyConfig.questions) {
            const questionFormItem = deriveSurveyQuestionFormItem({
                question,
                storedAnswer: surveyState.answersByQuestionId.get(question.id),
                surveyIsOptional: surveyState.activeSurveyConfig.isOptional,
            });
            if (
                !questionFormItem.isCurrentAnswerValid &&
                !questionFormItem.isPassed
            ) {
                return {
                    kind: "question",
                    questionSlugId: question.slugId,
                };
            }
        }

        return { kind: "none" };
    }

    if (surveyGate.status === "complete_valid") {
        return { kind: "summary" };
    }

    if (surveyState.activeSurveyConfig === undefined) {
        return { kind: "none" };
    }

    for (const question of surveyState.activeSurveyConfig.questions) {
        const questionFormItem = deriveSurveyQuestionFormItem({
            question,
            storedAnswer: surveyState.answersByQuestionId.get(question.id),
            surveyIsOptional: surveyState.activeSurveyConfig.isOptional,
        });
        if (
            !questionFormItem.isCurrentAnswerValid &&
            !questionFormItem.isPassed
        ) {
            return {
                kind: "question",
                questionSlugId: question.slugId,
            };
        }
    }

    const firstQuestion = surveyState.activeSurveyConfig.questions.at(0);
    if (firstQuestion === undefined) {
        return { kind: "none" };
    }

    return {
        kind: "question",
        questionSlugId: firstQuestion.slugId,
    };
}

async function getConversationAccessContextBySlugId({
    db,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
}): Promise<ConversationAccessContext> {
    const rows = await db
        .select({
            conversationId: conversationTable.id,
            slugId: conversationTable.slugId,
            projectId: conversationTable.projectId,
            participationMode: conversationTable.participationMode,
            conversationType: conversationTable.conversationType,
            currentContentId: conversationTable.currentContentId,
            isClosed: conversationTable.isClosed,
            requiresEventTicket: conversationTable.requiresEventTicket,
        })
        .from(conversationTable)
        .where(eq(conversationTable.slugId, conversationSlugId))
        .limit(1);

    const conversation = rows.at(0);
    if (conversation === undefined) {
        throw httpErrors.notFound("Conversation not found");
    }

    return conversation;
}

export async function getActiveSurveyConfigRecord({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<ActiveSurveyConfigRecord | undefined> {
    const surveyConfigRows = await db
        .select({
            id: surveyConfigTable.id,
            currentRevision: surveyConfigTable.currentRevision,
            isOptional: surveyConfigTable.isOptional,
        })
        .from(surveyConfigTable)
        .where(
            and(
                eq(surveyConfigTable.conversationId, conversationId),
                isNull(surveyConfigTable.deletedAt),
            ),
        )
        .limit(1);

    const surveyConfig = surveyConfigRows.at(0);
    if (surveyConfig === undefined) {
        return undefined;
    }

    const questionRows = await db
        .select({
            questionId: surveyQuestionTable.id,
            questionSlugId: surveyQuestionTable.slugId,
            questionType: surveyQuestionTable.questionType,
            choiceDisplay: surveyQuestionTable.choiceDisplay,
            currentContentId: surveyQuestionTable.currentContentId,
            currentSemanticVersion: surveyQuestionTable.currentSemanticVersion,
            displayOrder: surveyQuestionTable.displayOrder,
            isRequired: surveyQuestionTable.isRequired,
            isPublicAggregateSuppressionEnabled:
                surveyQuestionTable.isPublicAggregateSuppressionEnabled,
            questionText: surveyQuestionContentTable.questionText,
            constraints: surveyQuestionContentTable.constraints,
            sourceLanguageCode: surveyQuestionContentTable.sourceLanguageCode,
            sourceLanguageConfidence:
                surveyQuestionContentTable.sourceLanguageConfidence,
        })
        .from(surveyQuestionTable)
        .innerJoin(
            surveyQuestionContentTable,
            eq(
                surveyQuestionTable.currentContentId,
                surveyQuestionContentTable.id,
            ),
        )
        .where(
            and(
                eq(surveyQuestionTable.surveyConfigId, surveyConfig.id),
                isNotNull(surveyQuestionTable.currentContentId),
            ),
        )
        .orderBy(asc(surveyQuestionTable.displayOrder));

    const questionIds = questionRows.map((question) => question.questionId);
    const optionRows =
        questionIds.length === 0
            ? []
            : await db
                  .select({
                      questionId: surveyQuestionOptionTable.surveyQuestionId,
                      optionId: surveyQuestionOptionTable.id,
                      optionSlugId: surveyQuestionOptionTable.slugId,
                      currentContentId:
                          surveyQuestionOptionTable.currentContentId,
                      displayOrder: surveyQuestionOptionTable.displayOrder,
                      optionText: surveyQuestionOptionContentTable.optionText,
                      sourceLanguageCode:
                          surveyQuestionOptionContentTable.sourceLanguageCode,
                      sourceLanguageConfidence:
                          surveyQuestionOptionContentTable.sourceLanguageConfidence,
                  })
                  .from(surveyQuestionOptionTable)
                  .innerJoin(
                      surveyQuestionOptionContentTable,
                      eq(
                          surveyQuestionOptionTable.currentContentId,
                          surveyQuestionOptionContentTable.id,
                      ),
                  )
                  .where(
                      and(
                          inArray(
                              surveyQuestionOptionTable.surveyQuestionId,
                              questionIds,
                          ),
                          isNotNull(surveyQuestionOptionTable.currentContentId),
                      ),
                  )
                  .orderBy(asc(surveyQuestionOptionTable.displayOrder));

    const optionsByQuestionId = new Map<number, ActiveSurveyOptionRecord[]>();
    for (const option of optionRows) {
        const existingOptions =
            optionsByQuestionId.get(option.questionId) ?? [];
        existingOptions.push({
            id: option.optionId,
            slugId: option.optionSlugId,
            currentContentId: option.currentContentId,
            displayOrder: option.displayOrder,
            optionText: option.optionText,
            sourceLanguageCode: option.sourceLanguageCode,
            sourceLanguageConfidence: option.sourceLanguageConfidence,
        });
        optionsByQuestionId.set(option.questionId, existingOptions);
    }

    return {
        id: surveyConfig.id,
        currentRevision: surveyConfig.currentRevision,
        isOptional: surveyConfig.isOptional,
        questions: questionRows.map((question) => ({
            id: question.questionId,
            slugId: question.questionSlugId,
            questionType: question.questionType,
            choiceDisplay: question.choiceDisplay,
            currentContentId: question.currentContentId,
            currentSemanticVersion: question.currentSemanticVersion,
            displayOrder: question.displayOrder,
            isRequired: question.isRequired,
            isPublicAggregateSuppressionEnabled:
                question.isPublicAggregateSuppressionEnabled,
            questionText: question.questionText,
            constraints: zodSurveyQuestionConstraints.parse(
                question.constraints,
            ),
            sourceLanguageCode: question.sourceLanguageCode,
            sourceLanguageConfidence: question.sourceLanguageConfidence,
            options: optionsByQuestionId.get(question.questionId) ?? [],
        })),
    };
}

export async function loadSurveyParticipantState({
    db,
    conversationId,
    participantId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    participantId: string | undefined;
}): Promise<SurveyParticipantState> {
    const activeSurveyConfig = await getActiveSurveyConfigRecord({
        db,
        conversationId,
    });

    if (activeSurveyConfig === undefined || participantId === undefined) {
        return {
            activeSurveyConfig,
            response: undefined,
            answersByQuestionId: new Map(),
        };
    }

    const responseRows = await db
        .select({
            id: surveyResponseTable.id,
            createdAt: surveyResponseTable.createdAt,
            updatedAt: surveyResponseTable.updatedAt,
            completedAt: surveyResponseTable.completedAt,
            withdrawnAt: surveyResponseTable.withdrawnAt,
        })
        .from(surveyResponseTable)
        .where(
            and(
                eq(surveyResponseTable.conversationId, conversationId),
                eq(surveyResponseTable.participantId, participantId),
            ),
        )
        .limit(1);
    const response = responseRows.at(0);

    if (response === undefined) {
        return {
            activeSurveyConfig,
            response: undefined,
            answersByQuestionId: new Map(),
        };
    }

    if (response.withdrawnAt !== null) {
        return {
            activeSurveyConfig,
            response,
            answersByQuestionId: new Map(),
        };
    }

    const answerRows = await db
        .select({
            answerId: surveyAnswerTable.id,
            surveyQuestionId: surveyAnswerTable.surveyQuestionId,
            answeredQuestionSemanticVersion:
                surveyAnswerTable.answeredQuestionSemanticVersion,
            textValueHtml: surveyAnswerTable.textValueHtml,
        })
        .from(surveyAnswerTable)
        .where(
            and(
                eq(surveyAnswerTable.surveyResponseId, response.id),
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
                  )
                  .orderBy(
                      asc(surveyAnswerOptionTable.surveyAnswerId),
                      asc(surveyQuestionOptionTable.displayOrder),
                  );

    const optionSlugIdsByAnswerId = new Map<number, string[]>();
    for (const answerOption of answerOptionRows) {
        const optionSlugIds =
            optionSlugIdsByAnswerId.get(answerOption.surveyAnswerId) ?? [];
        optionSlugIds.push(answerOption.optionSlugId);
        optionSlugIdsByAnswerId.set(answerOption.surveyAnswerId, optionSlugIds);
    }

    const answersByQuestionId = new Map<number, StoredSurveyAnswer>();
    for (const answer of answerRows) {
        answersByQuestionId.set(answer.surveyQuestionId, {
            answerId: answer.answerId,
            answeredQuestionSemanticVersion:
                answer.answeredQuestionSemanticVersion,
            textValueHtml: answer.textValueHtml,
            optionSlugIds: optionSlugIdsByAnswerId.get(answer.answerId) ?? [],
        });
    }

    return {
        activeSurveyConfig,
        response,
        answersByQuestionId,
    };
}

async function softDeleteSurveyResponseAnswers({
    db,
    surveyResponseId,
    now,
}: {
    db: PostgresJsDatabase;
    surveyResponseId: number;
    now: Date;
}): Promise<void> {
    const answerRows = await db
        .select({ id: surveyAnswerTable.id })
        .from(surveyAnswerTable)
        .where(
            and(
                eq(surveyAnswerTable.surveyResponseId, surveyResponseId),
                isNull(surveyAnswerTable.deletedAt),
            ),
        );

    const answerIds = answerRows.map((answer) => answer.id);
    if (answerIds.length === 0) {
        return;
    }

    await db
        .update(surveyAnswerOptionTable)
        .set({ deletedAt: now })
        .where(
            and(
                inArray(surveyAnswerOptionTable.surveyAnswerId, answerIds),
                isNull(surveyAnswerOptionTable.deletedAt),
            ),
        );

    await db
        .update(surveyAnswerTable)
        .set({ deletedAt: now, updatedAt: now })
        .where(
            and(
                inArray(surveyAnswerTable.id, answerIds),
                isNull(surveyAnswerTable.deletedAt),
            ),
        );
}

async function insertSurveyQuestion({
    db,
    surveyConfigId,
    conversationId,
    question,
    now,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    surveyConfigId: number;
    conversationId: number;
    question: SurveyQuestionConfig;
    now: Date;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<void> {
    const questionSlugId = question.questionSlugId ?? generateRandomSlugId();
    const questionLanguageMetadata = await resolveContentLanguageMetadata({
        text: question.questionText,
        googleCloudCredentials,
    });
    const insertedQuestions = await db
        .insert(surveyQuestionTable)
        .values({
            slugId: questionSlugId,
            surveyConfigId,
            conversationId,
            questionType: question.questionType,
            choiceDisplay:
                question.questionType === "free_text"
                    ? "auto"
                    : question.choiceDisplay,
            currentContentId: null,
            currentSemanticVersion: 1,
            displayOrder: question.displayOrder,
            isRequired: question.isRequired,
            isPublicAggregateSuppressionEnabled:
                question.questionType === "choice"
                    ? question.isPublicAggregateSuppressionEnabled
                    : false,
            createdAt: now,
            updatedAt: now,
        })
        .returning({ id: surveyQuestionTable.id });
    const surveyQuestionId = insertedQuestions[0].id;

    const insertedContent = await db
        .insert(surveyQuestionContentTable)
        .values({
            surveyQuestionId,
            questionText: question.questionText,
            constraints: question.constraints,
            sourceLanguageCode: questionLanguageMetadata.sourceLanguageCode,
            sourceLanguageConfidence:
                questionLanguageMetadata.sourceLanguageConfidence,
            createdAt: now,
        })
        .returning({ id: surveyQuestionContentTable.id });

    await db
        .update(surveyQuestionTable)
        .set({ currentContentId: insertedContent[0].id })
        .where(eq(surveyQuestionTable.id, surveyQuestionId));

    const options = getSurveyQuestionConfigOptions({ question });
    for (const option of options) {
        const optionSlugId = option.optionSlugId ?? generateRandomSlugId();
        const optionLanguageMetadata = await resolveContentLanguageMetadata({
            text: option.optionText,
            googleCloudCredentials,
        });
        const insertedOptions = await db
            .insert(surveyQuestionOptionTable)
            .values({
                slugId: optionSlugId,
                surveyQuestionId,
                currentContentId: null,
                displayOrder: option.displayOrder,
                createdAt: now,
                updatedAt: now,
            })
            .returning({ id: surveyQuestionOptionTable.id });

        const surveyQuestionOptionId = insertedOptions[0].id;
        const insertedOptionContent = await db
            .insert(surveyQuestionOptionContentTable)
            .values({
                surveyQuestionOptionId,
                optionText: option.optionText,
                sourceLanguageCode: optionLanguageMetadata.sourceLanguageCode,
                sourceLanguageConfidence:
                    optionLanguageMetadata.sourceLanguageConfidence,
                createdAt: now,
            })
            .returning({ id: surveyQuestionOptionContentTable.id });

        await db
            .update(surveyQuestionOptionTable)
            .set({ currentContentId: insertedOptionContent[0].id })
            .where(eq(surveyQuestionOptionTable.id, surveyQuestionOptionId));
    }
}

function constraintsAreEqual({
    left,
    right,
}: {
    left: SurveyQuestionConstraints;
    right: SurveyQuestionConstraints;
}): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

async function replaceSurveyConfigById({
    db,
    surveyConfigId,
    surveyConfig,
    now,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    surveyConfigId: number;
    surveyConfig: SurveyConfig;
    now: Date;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<{ didSemanticChange: boolean }> {
    const surveyConfigRows = await db
        .select({ conversationId: surveyConfigTable.conversationId })
        .from(surveyConfigTable)
        .where(eq(surveyConfigTable.id, surveyConfigId))
        .limit(1);
    const surveyConfigRow = surveyConfigRows.at(0);
    if (surveyConfigRow === undefined) {
        throw httpErrors.notFound("Survey config not found");
    }

    const existingSurveyConfig = await getActiveSurveyConfigRecord({
        db,
        conversationId: surveyConfigRow.conversationId,
    });
    if (existingSurveyConfig === undefined) {
        throw httpErrors.notFound("Survey config not found");
    }

    const existingQuestionsBySlugId = new Map(
        existingSurveyConfig.questions.map((question) => [
            question.slugId,
            question,
        ]),
    );
    let didSemanticChange = false;

    // Temporarily move active rows away from their current display orders so
    // reorders and inserts cannot collide with the partial unique indexes.
    for (const [
        index,
        existingQuestion,
    ] of existingSurveyConfig.questions.entries()) {
        await db
            .update(surveyQuestionTable)
            .set({ displayOrder: -(index + 1) })
            .where(eq(surveyQuestionTable.id, existingQuestion.id));

        for (const [
            optionIndex,
            existingOption,
        ] of existingQuestion.options.entries()) {
            await db
                .update(surveyQuestionOptionTable)
                .set({ displayOrder: -(optionIndex + 1) })
                .where(eq(surveyQuestionOptionTable.id, existingOption.id));
        }
    }

    for (const question of surveyConfig.questions) {
        if (question.questionSlugId === undefined) {
            if (question.isRequired) {
                didSemanticChange = true;
            }
            await insertSurveyQuestion({
                db,
                surveyConfigId,
                conversationId: surveyConfigRow.conversationId,
                question,
                now,
                googleCloudCredentials,
            });
            continue;
        }

        const existingQuestion = existingQuestionsBySlugId.get(
            question.questionSlugId,
        );
        if (existingQuestion === undefined) {
            if (question.isRequired) {
                didSemanticChange = true;
            }
            await insertSurveyQuestion({
                db,
                surveyConfigId,
                conversationId: surveyConfigRow.conversationId,
                question,
                now,
                googleCloudCredentials,
            });
            continue;
        }

        if (
            existingQuestion.questionType === "choice" &&
            existingQuestion.isPublicAggregateSuppressionEnabled &&
            (question.questionType !== "choice" ||
                !question.isPublicAggregateSuppressionEnabled)
        ) {
            throw httpErrors.badRequest(
                "Public aggregate suppression cannot be disabled after it was enabled",
            );
        }

        let semanticChanged = false;
        const questionAffectsEligibility =
            existingQuestion.isRequired || question.isRequired;
        const constraintsChanged = !constraintsAreEqual({
            left: existingQuestion.constraints,
            right: question.constraints,
        });
        if (
            existingQuestion.questionType !== question.questionType ||
            constraintsChanged
        ) {
            semanticChanged = true;
            if (questionAffectsEligibility) {
                didSemanticChange = true;
            }
        }

        if (
            existingQuestion.isRequired !== question.isRequired &&
            questionAffectsEligibility
        ) {
            didSemanticChange = true;
        }

        const questionTextChanged =
            existingQuestion.questionText !== question.questionText;
        if (questionTextChanged && question.textChangeIsSemantic === true) {
            semanticChanged = true;
            if (questionAffectsEligibility) {
                didSemanticChange = true;
            }
        }

        if (questionTextChanged || constraintsChanged) {
            const questionLanguageMetadata = await resolveContentLanguageMetadata({
                text: question.questionText,
                googleCloudCredentials,
            });
            const insertedContent = await db
                .insert(surveyQuestionContentTable)
                .values({
                    surveyQuestionId: existingQuestion.id,
                    questionText: question.questionText,
                    constraints: question.constraints,
                    sourceLanguageCode: questionLanguageMetadata.sourceLanguageCode,
                    sourceLanguageConfidence:
                        questionLanguageMetadata.sourceLanguageConfidence,
                    createdAt: now,
                })
                .returning({ id: surveyQuestionContentTable.id });

            await db
                .update(surveyQuestionTable)
                .set({ currentContentId: insertedContent[0].id })
                .where(eq(surveyQuestionTable.id, existingQuestion.id));
        }

        const existingOptionsBySlugId = new Map(
            existingQuestion.options.map((option) => [option.slugId, option]),
        );
        const nextOptions = getSurveyQuestionConfigOptions({ question });
        const nextOptionSlugIds = new Set(
            nextOptions
                .map((option) => option.optionSlugId)
                .filter(
                    (optionSlugId): optionSlugId is string =>
                        optionSlugId !== undefined,
                ),
        );

        for (const existingOption of existingQuestion.options) {
            if (!nextOptionSlugIds.has(existingOption.slugId)) {
                semanticChanged = true;
                if (questionAffectsEligibility) {
                    didSemanticChange = true;
                }
                await db
                    .update(surveyQuestionOptionTable)
                    .set({
                        currentContentId: null,
                        displayOrder: existingOption.displayOrder,
                        updatedAt: now,
                    })
                    .where(eq(surveyQuestionOptionTable.id, existingOption.id));
            }
        }

        for (const option of nextOptions) {
            if (option.optionSlugId === undefined) {
                semanticChanged = true;
                if (questionAffectsEligibility) {
                    didSemanticChange = true;
                }
                const optionSlugId = generateRandomSlugId();
                const optionLanguageMetadata = await resolveContentLanguageMetadata({
                    text: option.optionText,
                    googleCloudCredentials,
                });
                const insertedOption = await db
                    .insert(surveyQuestionOptionTable)
                    .values({
                        slugId: optionSlugId,
                        surveyQuestionId: existingQuestion.id,
                        currentContentId: null,
                        displayOrder: option.displayOrder,
                        createdAt: now,
                        updatedAt: now,
                    })
                    .returning({ id: surveyQuestionOptionTable.id });
                const insertedOptionContent = await db
                    .insert(surveyQuestionOptionContentTable)
                    .values({
                        surveyQuestionOptionId: insertedOption[0].id,
                        optionText: option.optionText,
                        sourceLanguageCode: optionLanguageMetadata.sourceLanguageCode,
                        sourceLanguageConfidence:
                            optionLanguageMetadata.sourceLanguageConfidence,
                        createdAt: now,
                    })
                    .returning({ id: surveyQuestionOptionContentTable.id });
                await db
                    .update(surveyQuestionOptionTable)
                    .set({ currentContentId: insertedOptionContent[0].id })
                    .where(
                        eq(surveyQuestionOptionTable.id, insertedOption[0].id),
                    );
                continue;
            }

            const existingOption = existingOptionsBySlugId.get(
                option.optionSlugId,
            );
            if (existingOption === undefined) {
                semanticChanged = true;
                const optionLanguageMetadata = await resolveContentLanguageMetadata({
                    text: option.optionText,
                    googleCloudCredentials,
                });
                if (questionAffectsEligibility) {
                    didSemanticChange = true;
                }
                const insertedOption = await db
                    .insert(surveyQuestionOptionTable)
                    .values({
                        slugId: option.optionSlugId,
                        surveyQuestionId: existingQuestion.id,
                        currentContentId: null,
                        displayOrder: option.displayOrder,
                        createdAt: now,
                        updatedAt: now,
                    })
                    .returning({ id: surveyQuestionOptionTable.id });
                const insertedOptionContent = await db
                    .insert(surveyQuestionOptionContentTable)
                    .values({
                        surveyQuestionOptionId: insertedOption[0].id,
                        optionText: option.optionText,
                        sourceLanguageCode: optionLanguageMetadata.sourceLanguageCode,
                        sourceLanguageConfidence:
                            optionLanguageMetadata.sourceLanguageConfidence,
                        createdAt: now,
                    })
                    .returning({ id: surveyQuestionOptionContentTable.id });
                await db
                    .update(surveyQuestionOptionTable)
                    .set({ currentContentId: insertedOptionContent[0].id })
                    .where(
                        eq(surveyQuestionOptionTable.id, insertedOption[0].id),
                    );
                continue;
            }

            if (existingOption.optionText !== option.optionText) {
                const optionLanguageMetadata = await resolveContentLanguageMetadata({
                    text: option.optionText,
                    googleCloudCredentials,
                });
                if (option.textChangeIsSemantic === true) {
                    semanticChanged = true;
                    if (questionAffectsEligibility) {
                        didSemanticChange = true;
                    }
                }
                const insertedOptionContent = await db
                    .insert(surveyQuestionOptionContentTable)
                    .values({
                        surveyQuestionOptionId: existingOption.id,
                        optionText: option.optionText,
                        sourceLanguageCode: optionLanguageMetadata.sourceLanguageCode,
                        sourceLanguageConfidence:
                            optionLanguageMetadata.sourceLanguageConfidence,
                        createdAt: now,
                    })
                    .returning({ id: surveyQuestionOptionContentTable.id });
                await db
                    .update(surveyQuestionOptionTable)
                    .set({
                        currentContentId: insertedOptionContent[0].id,
                        displayOrder: option.displayOrder,
                        updatedAt: now,
                    })
                    .where(eq(surveyQuestionOptionTable.id, existingOption.id));
            } else if (existingOption.displayOrder !== option.displayOrder) {
                await db
                    .update(surveyQuestionOptionTable)
                    .set({ displayOrder: option.displayOrder, updatedAt: now })
                    .where(eq(surveyQuestionOptionTable.id, existingOption.id));
            } else {
                await db
                    .update(surveyQuestionOptionTable)
                    .set({ displayOrder: option.displayOrder })
                    .where(eq(surveyQuestionOptionTable.id, existingOption.id));
            }
        }

        await db
            .update(surveyQuestionTable)
            .set({
                questionType: question.questionType,
                choiceDisplay:
                    question.questionType === "free_text"
                        ? "auto"
                        : question.choiceDisplay,
                currentSemanticVersion: semanticChanged
                    ? existingQuestion.currentSemanticVersion + 1
                    : existingQuestion.currentSemanticVersion,
                displayOrder: question.displayOrder,
                isRequired: question.isRequired,
                isPublicAggregateSuppressionEnabled:
                    question.questionType === "choice"
                        ? question.isPublicAggregateSuppressionEnabled
                        : false,
                updatedAt: now,
            })
            .where(eq(surveyQuestionTable.id, existingQuestion.id));
    }

    const nextQuestionSlugIds = new Set(
        surveyConfig.questions
            .map((question) => question.questionSlugId)
            .filter(
                (questionSlugId): questionSlugId is string =>
                    questionSlugId !== undefined,
            ),
    );
    for (const existingQuestion of existingSurveyConfig.questions) {
        if (!nextQuestionSlugIds.has(existingQuestion.slugId)) {
            if (existingQuestion.isRequired) {
                didSemanticChange = true;
            }
            await db
                .update(surveyQuestionTable)
                .set({
                    currentContentId: null,
                    displayOrder: existingQuestion.displayOrder,
                    updatedAt: now,
                })
                .where(eq(surveyQuestionTable.id, existingQuestion.id));
        }
    }

    await db
        .update(surveyConfigTable)
        .set({
            currentRevision: existingSurveyConfig.currentRevision + 1,
            isOptional: surveyConfig.isOptional,
            updatedAt: now,
        })
        .where(eq(surveyConfigTable.id, surveyConfigId));

    return { didSemanticChange };
}

export async function setSurveyConfigForConversation({
    db,
    conversationId,
    surveyConfig,
    now,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    surveyConfig: SurveyConfig | null;
    now: Date;
    googleCloudCredentials?: GoogleCloudCredentials;
}): Promise<SurveyConfigUpdateEffect> {
    const normalizedSurveyConfig = normalizeSurveyConfigInput({ surveyConfig });
    const previousSurveyConfig = await getActiveSurveyConfigRecord({
        db,
        conversationId,
    });
    const existingSurveyConfigRows = await db
        .select({ id: surveyConfigTable.id })
        .from(surveyConfigTable)
        .where(
            and(
                eq(surveyConfigTable.conversationId, conversationId),
                isNull(surveyConfigTable.deletedAt),
            ),
        )
        .limit(1);
    const existingSurveyConfig = existingSurveyConfigRows.at(0);
    const previousRequiresSurvey = doesSurveyRequireCompletion({
        isOptional: previousSurveyConfig?.isOptional ?? false,
        requiredQuestionCount:
            previousSurveyConfig?.questions.filter(
                (question) => question.isRequired,
            ).length ?? 0,
    });
    const nextRequiresSurvey = doesSurveyRequireCompletion({
        isOptional: normalizedSurveyConfig?.isOptional ?? false,
        requiredQuestionCount:
            normalizedSurveyConfig?.questions.filter(
                (question) => question.isRequired,
            ).length ?? 0,
    });

    if (normalizedSurveyConfig === null) {
        if (existingSurveyConfig !== undefined) {
            await db
                .update(surveyConfigTable)
                .set({ deletedAt: now, updatedAt: now })
                .where(eq(surveyConfigTable.id, existingSurveyConfig.id));
        }
        return {
            previousRequiresSurvey,
            nextRequiresSurvey,
            didRequiredQuestionSemanticChange: previousRequiresSurvey,
        };
    }

    if (existingSurveyConfig === undefined) {
        const insertedSurveyConfig = await db
            .insert(surveyConfigTable)
            .values({
                conversationId,
                currentRevision: 1,
                isOptional: normalizedSurveyConfig.isOptional,
                createdAt: now,
                updatedAt: now,
                deletedAt: null,
            })
            .returning({ id: surveyConfigTable.id });

        for (const question of normalizedSurveyConfig.questions) {
            await insertSurveyQuestion({
                db,
                surveyConfigId: insertedSurveyConfig[0].id,
                conversationId,
                question,
                now,
                googleCloudCredentials,
            });
        }
        return {
            previousRequiresSurvey,
            nextRequiresSurvey,
            didRequiredQuestionSemanticChange: nextRequiresSurvey,
        };
    }

    const { didSemanticChange } = await replaceSurveyConfigById({
        db,
        surveyConfigId: existingSurveyConfig.id,
        surveyConfig: normalizedSurveyConfig,
        now,
        googleCloudCredentials,
    });

    return {
        previousRequiresSurvey,
        nextRequiresSurvey,
        didRequiredQuestionSemanticChange: didSemanticChange,
    };
}

export async function getSurveyConfigForConversation({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<SurveyConfig | undefined> {
    const activeSurveyConfig = await getActiveSurveyConfigRecord({
        db,
        conversationId,
    });
    if (activeSurveyConfig === undefined) {
        return undefined;
    }

    return {
        isOptional: activeSurveyConfig.isOptional,
        questions: activeSurveyConfig.questions.map((question) =>
            surveyQuestionToConfig({ question }),
        ),
    };
}

export async function getSurveyGateSummary({
    db,
    conversationId,
    participantId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    participantId: string | undefined;
}): Promise<SurveyGateSummary> {
    const surveyState = await loadSurveyParticipantState({
        db,
        conversationId,
        participantId,
    });
    return toSurveyGateDto({
        surveyGate: deriveSurveyGate({ surveyState, participantId }),
    });
}

export async function fetchSurveyForm({
    db,
    conversationSlugId,
    participantId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    participantId: string | undefined;
}): Promise<{
    currentRevision: number;
    questions: SurveyQuestionFormItem[];
    surveyGate: SurveyGateSummary;
}> {
    const { conversationId } = await getConversationAccessContextBySlugId({
        db,
        conversationSlugId,
    });
    const surveyState = await loadSurveyParticipantState({
        db,
        conversationId,
        participantId,
    });
    if (surveyState.activeSurveyConfig === undefined) {
        throw httpErrors.notFound("Survey not found");
    }
    const activeSurveyConfig = surveyState.activeSurveyConfig;
    const surveyGate = deriveSurveyGate({
        surveyState,
        participantId,
    });

    return {
        currentRevision: activeSurveyConfig.currentRevision,
        questions: activeSurveyConfig.questions.map((question) =>
            deriveSurveyQuestionFormItem({
                question,
                storedAnswer: surveyState.answersByQuestionId.get(
                    question.id,
                ),
                surveyIsOptional: activeSurveyConfig.isOptional,
            }),
        ),
        surveyGate: toSurveyGateDto({ surveyGate }),
    };
}

export async function checkSurveyStatus({
    db,
    conversationSlugId,
    participantId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    participantId: string | undefined;
}): Promise<{
    surveyGate: SurveyGateSummary;
    routeResolution: SurveyRouteResolution;
}> {
    const { conversationId } = await getConversationAccessContextBySlugId({
        db,
        conversationSlugId,
    });
    const surveyState = await loadSurveyParticipantState({
        db,
        conversationId,
        participantId,
    });
    const surveyGate = deriveSurveyGate({ surveyState, participantId });
    return {
        surveyGate: toSurveyGateDto({ surveyGate }),
        routeResolution: deriveSurveyRouteResolution({
            surveyState,
            participantId,
        }),
    };
}

interface SurveyAggregateRowsFromSnapshot {
    suppressedRows: SurveyAggregateRow[];
    fullRows: SurveyAggregateRow[];
    hasPublicAggregateSuppressionEnabled: boolean;
}

async function fetchSurveyAggregateRowsFromSnapshot({
    db,
    surveyAggregateSnapshotId,
    selectedCandidateId,
    displayLanguage,
    useSystemDescriptions,
    currentPublicSuppressionByQuestionId,
}: {
    db: PostgresJsDatabase;
    surveyAggregateSnapshotId: number;
    selectedCandidateId: number;
    displayLanguage: SupportedDisplayLanguageCodes;
    useSystemDescriptions: boolean;
    currentPublicSuppressionByQuestionId: Map<string, boolean> | undefined;
}): Promise<SurveyAggregateRowsFromSnapshot> {
    const aggregateRows = await db
        .select({
            scope: surveyAggregateResultTable.scope,
            groupId: surveyAggregateResultTable.groupId,
            groupKey: opinionGroupTable.key,
            systemDescriptionId: opinionGroupLineageTable.systemDescriptionId,
            adminDescriptionId: opinionGroupLineageTable.adminDescriptionId,
            questionId: surveyAggregateQuestionTable.questionSlugId,
            questionType: surveyAggregateQuestionTable.questionType,
            question: surveyAggregateQuestionTable.questionText,
            questionOrder: surveyAggregateQuestionTable.questionOrder,
            isPublicAggregateSuppressionEnabled:
                surveyAggregateQuestionTable.isPublicAggregateSuppressionEnabled,
            optionId: surveyAggregateOptionTable.optionSlugId,
            option: surveyAggregateOptionTable.optionText,
            optionOrder: surveyAggregateOptionTable.optionOrder,
            suppressedCount: surveyAggregateResultTable.suppressedCount,
            suppressedPercentage:
                surveyAggregateResultTable.suppressedPercentage,
            fullCount: surveyAggregateResultTable.fullCount,
            fullPercentage: surveyAggregateResultTable.fullPercentage,
            isSuppressed: surveyAggregateResultTable.isSuppressed,
            suppressionReason: surveyAggregateResultTable.suppressionReason,
        })
        .from(surveyAggregateResultTable)
        .innerJoin(
            surveyAggregateQuestionTable,
            eq(
                surveyAggregateQuestionTable.id,
                surveyAggregateResultTable.surveyAggregateQuestionId,
            ),
        )
        .innerJoin(
            surveyAggregateOptionTable,
            eq(
                surveyAggregateOptionTable.id,
                surveyAggregateResultTable.surveyAggregateOptionId,
            ),
        )
        .leftJoin(
            opinionGroupTable,
            eq(opinionGroupTable.id, surveyAggregateResultTable.groupId),
        )
        .leftJoin(
            opinionGroupLineageTable,
            eq(opinionGroupLineageTable.id, opinionGroupTable.lineageId),
        )
        .where(
            and(
                eq(
                    surveyAggregateResultTable.surveyAggregateSnapshotId,
                    surveyAggregateSnapshotId,
                ),
                or(
                    eq(surveyAggregateResultTable.scope, "overall"),
                    and(
                        eq(surveyAggregateResultTable.scope, "opinion_group"),
                        eq(
                            surveyAggregateResultTable.candidateId,
                            selectedCandidateId,
                        ),
                    ),
                ),
            ),
        )
        .orderBy(
            asc(surveyAggregateQuestionTable.questionOrder),
            asc(surveyAggregateQuestionTable.questionSlugId),
            asc(surveyAggregateResultTable.scope),
            asc(opinionGroupTable.key),
            asc(surveyAggregateOptionTable.optionOrder),
            asc(surveyAggregateOptionTable.optionSlugId),
        );

    const groupsById = new Map<
        number,
        {
            groupId: number;
            systemDescriptionId: number | null;
            adminDescriptionId: number | null;
        }
    >();
    for (const row of aggregateRows) {
        if (row.scope !== "opinion_group") {
            continue;
        }
        if (row.groupId === null || row.groupKey === null) {
            throw httpErrors.internalServerError(
                "Survey aggregate group row is missing opinion group metadata",
            );
        }
        groupsById.set(row.groupId, {
            groupId: row.groupId,
            systemDescriptionId: row.systemDescriptionId,
            adminDescriptionId: row.adminDescriptionId,
        });
    }

    const descriptionsByGroupId = await getDescriptionTextsByGroupId({
        db,
        groups: Array.from(groupsById.values()),
        displayLanguage,
        includeSystemDescriptions: useSystemDescriptions,
    });

    const suppressedRows: SurveyAggregateRow[] = [];
    const fullRows: SurveyAggregateRow[] = [];
    let hasPublicAggregateSuppressionEnabled = false;

    for (const row of aggregateRows) {
        const isPublicAggregateSuppressionEnabled =
            currentPublicSuppressionByQuestionId?.get(row.questionId) ??
            row.isPublicAggregateSuppressionEnabled;
        hasPublicAggregateSuppressionEnabled ||=
            isPublicAggregateSuppressionEnabled;

        const fullCount = row.fullCount;
        const fullPercentage = row.fullPercentage ?? undefined;
        let suppressedCount: number | undefined;
        let suppressedPercentage: number | undefined;
        let suppressedReason: SurveyAggregateRow["suppressionReason"];
        if (row.isSuppressed) {
            if (row.suppressionReason === null) {
                throw httpErrors.internalServerError(
                    "Suppressed survey aggregate row is missing suppression reason",
                );
            }
            suppressedReason = row.suppressionReason;
        } else {
            if (row.suppressedCount === null) {
                throw httpErrors.internalServerError(
                    "Unsuppressed survey aggregate row is missing count",
                );
            }
            suppressedCount = row.suppressedCount;
            suppressedPercentage = row.suppressedPercentage ?? undefined;
        }

        const displayedCount = isPublicAggregateSuppressionEnabled
            ? suppressedCount
            : fullCount;
        const displayedPercentage = isPublicAggregateSuppressionEnabled
            ? suppressedPercentage
            : fullPercentage;
        const displayedIsSuppressed =
            isPublicAggregateSuppressionEnabled && row.isSuppressed;
        const displayedSuppressionReason = isPublicAggregateSuppressionEnabled
            ? suppressedReason
            : undefined;

        if (row.scope === "overall") {
            suppressedRows.push({
                scope: "overall",
                clusterId: "",
                clusterLabel: "",
                questionId: row.questionId,
                questionType: row.questionType,
                question: row.question,
                optionId: row.optionId,
                option: row.option,
                count: displayedCount,
                percentage: displayedPercentage,
                isSuppressed: displayedIsSuppressed,
                isPublicAggregateSuppressionEnabled,
                suppressionReason: displayedSuppressionReason,
            });
            fullRows.push({
                scope: "overall",
                clusterId: "",
                clusterLabel: "",
                questionId: row.questionId,
                questionType: row.questionType,
                question: row.question,
                optionId: row.optionId,
                option: row.option,
                count: fullCount,
                percentage: fullPercentage,
                isSuppressed: false,
                isPublicAggregateSuppressionEnabled,
                suppressionReason: undefined,
            });
            continue;
        }

        if (row.groupId === null || row.groupKey === null) {
            throw httpErrors.internalServerError(
                "Survey aggregate group row is missing opinion group metadata",
            );
        }

        const description = descriptionsByGroupId.get(row.groupId);
        const clusterLabel = description?.label ?? `Group ${row.groupKey}`;
        suppressedRows.push({
            scope: "cluster",
            clusterId: row.groupKey,
            clusterLabel,
            questionId: row.questionId,
            questionType: row.questionType,
            question: row.question,
            optionId: row.optionId,
            option: row.option,
            count: displayedCount,
            percentage: displayedPercentage,
            isSuppressed: displayedIsSuppressed,
            isPublicAggregateSuppressionEnabled,
            suppressionReason: displayedSuppressionReason,
        });
        fullRows.push({
            scope: "cluster",
            clusterId: row.groupKey,
            clusterLabel,
            questionId: row.questionId,
            questionType: row.questionType,
            question: row.question,
            optionId: row.optionId,
            option: row.option,
            count: fullCount,
            percentage: fullPercentage,
            isSuppressed: false,
            isPublicAggregateSuppressionEnabled,
            suppressionReason: undefined,
        });
    }

    return {
        suppressedRows,
        fullRows,
        hasPublicAggregateSuppressionEnabled,
    };
}

function getCurrentPublicSuppressionByQuestionId({
    activeSurveyConfig,
}: {
    activeSurveyConfig: ActiveSurveyConfigRecord;
}): Map<string, boolean> {
    return new Map(
        activeSurveyConfig.questions
            .filter((question) => question.questionType === "choice")
            .map((question) => [
                question.slugId,
                question.isPublicAggregateSuppressionEnabled,
            ]),
    );
}

export async function fetchSurveyAggregatedResults({
    db,
    conversationSlugId,
    analysisView,
    checkpointViewSnapshotId,
    userId,
    displayLanguage,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    analysisView: AnalysisView | undefined;
    checkpointViewSnapshotId: number | undefined;
    userId: string | undefined;
    displayLanguage: SupportedDisplayLanguageCodes;
}): Promise<{
    hasSurvey: boolean;
    accessLevel: SurveyResultsAccessLevel;
    suppressionThreshold: number;
    suppressedRows: SurveyAggregateRow[];
    fullRows: SurveyAggregateRow[] | undefined;
}> {
    const conversation = await getConversationAccessContextBySlugId({
        db,
        conversationSlugId,
    });
    const accessLevel = await getConversationViewAccessLevelForConversation({
        db,
        userId,
        projectId: conversation.projectId,
    });
    const activeSurveyConfig = await getActiveSurveyConfigRecord({
        db,
        conversationId: conversation.conversationId,
    });
    if (checkpointViewSnapshotId === undefined && activeSurveyConfig === undefined) {
        return {
            hasSurvey: false,
            accessLevel,
            suppressionThreshold: PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD,
            suppressedRows: [],
            fullRows: undefined,
        };
    }

    const selectedCandidate = await getSelectedOpinionGroupCandidate({
        db,
        conversationId: conversation.conversationId,
        analysisView,
        checkpointViewSnapshotId,
        displayLanguage,
    });
    if (selectedCandidate?.surveyAggregateSnapshotId == null) {
        return {
            hasSurvey: false,
            accessLevel,
            suppressionThreshold: PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD,
            suppressedRows: [],
            fullRows: undefined,
        };
    }

    const snapshotRows = await db
        .select({
            suppressionThreshold:
                surveyAggregateSnapshotTable.suppressionThreshold,
        })
        .from(surveyAggregateSnapshotTable)
        .where(
            eq(
                surveyAggregateSnapshotTable.id,
                selectedCandidate.surveyAggregateSnapshotId,
            ),
        )
        .limit(1);
    if (snapshotRows.length === 0) {
        return {
            hasSurvey: false,
            accessLevel,
            suppressionThreshold: PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD,
            suppressedRows: [],
            fullRows: undefined,
        };
    }

    const aggregateRows = await fetchSurveyAggregateRowsFromSnapshot({
        db,
        surveyAggregateSnapshotId: selectedCandidate.surveyAggregateSnapshotId,
        selectedCandidateId: selectedCandidate.candidateId,
        displayLanguage,
        useSystemDescriptions: selectedCandidate.useSystemDescriptions,
        currentPublicSuppressionByQuestionId:
            activeSurveyConfig === undefined
                ? undefined
                : getCurrentPublicSuppressionByQuestionId({
                      activeSurveyConfig,
                  }),
    });

    return {
        hasSurvey: true,
        accessLevel,
        suppressionThreshold: snapshotRows[0].suppressionThreshold,
        suppressedRows: aggregateRows.suppressedRows,
        fullRows:
            accessLevel === "owner" &&
            aggregateRows.hasPublicAggregateSuppressionEnabled
                ? aggregateRows.fullRows
                : undefined,
    };
}

export async function fetchSurveyCompletionCounts({
    db,
    conversationSlugId,
    userId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    userId: string;
}): Promise<{
    hasSurvey: boolean;
    counts: SurveyCompletionCounts;
}> {
    const conversation = await getConversationAccessContextBySlugId({
        db,
        conversationSlugId,
    });
    const accessLevel = await getConversationViewAccessLevelForConversation({
        db,
        userId,
        projectId: conversation.projectId,
    });
    if (accessLevel !== "owner") {
        throw httpErrors.forbidden(
            "Missing conversation_update capability",
        );
    }

    const context = await loadSurveyExportContext({
        db,
        conversationId: conversation.conversationId,
    });

    return {
        hasSurvey: context.activeSurveyConfig !== undefined,
        counts:
            context.activeSurveyConfig === undefined
                ? createEmptySurveyCompletionCounts()
                : buildSurveyCompletionCounts({ context }),
    };
}

export async function saveSurveyAnswer({
    db,
    conversationSlugId,
    questionSlugId,
    answer,
    didWrite,
    userAgent,
    now,
    valkey,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    questionSlugId: string;
    answer: SurveyAnswerSubmission | null;
    didWrite: string;
    userAgent: string;
    now: Date;
    valkey?: Valkey;
}): Promise<
    | {
          success: true;
          surveyGate: SurveyGateSummary;
          justCompleted: boolean;
      }
    | {
          success: false;
          reason: ParticipationBlockedReason;
      }
> {
    const participationCheck = await checkConversationParticipation({
        db,
        conversationSlugId,
        didWrite,
        userAgent,
        now,
        requireCompletedSurvey: false,
    });
    if (!participationCheck.success) {
        return participationCheck;
    }

    const participantId = participationCheck.participantId;
    const conversation = {
        conversationId: participationCheck.conversationId,
        slugId: conversationSlugId,
        conversationType: participationCheck.conversationType,
    };

    const previousSurveyState = await loadSurveyParticipantState({
        db,
        conversationId: conversation.conversationId,
        participantId,
    });
    const previousSurveyGate = deriveSurveyGate({
        surveyState: previousSurveyState,
        participantId,
    });
    const shouldResetWithdrawnResponse =
        previousSurveyState.response?.withdrawnAt !== null &&
        previousSurveyState.response?.withdrawnAt !== undefined;
    const activeSurveyConfig = previousSurveyState.activeSurveyConfig;
    if (activeSurveyConfig === undefined) {
        throw httpErrors.notFound("Survey not found");
    }

    const storedQuestion = activeSurveyConfig.questions.find(
        (currentQuestion) => currentQuestion.slugId === questionSlugId,
    );
    if (storedQuestion === undefined) {
        throw httpErrors.notFound("Survey question not found");
    }
    const question = getParticipantSurveyQuestion({
        question: storedQuestion,
        surveyIsOptional: activeSurveyConfig.isOptional,
    });

    if (answer !== null && !validateSurveyAnswer({ question, answer })) {
        throw httpErrors.badRequest("Invalid survey answer payload");
    }

    await db.transaction(async (tx) => {
        const surveyResponseRows = await tx
            .select({
                id: surveyResponseTable.id,
            })
            .from(surveyResponseTable)
            .where(
                and(
                    eq(
                        surveyResponseTable.conversationId,
                        conversation.conversationId,
                    ),
                    eq(surveyResponseTable.participantId, participantId),
                ),
            )
            .limit(1);

        let surveyResponseId = surveyResponseRows.at(0)?.id;
        if (surveyResponseId === undefined) {
            const insertedSurveyResponse = await tx
                .insert(surveyResponseTable)
                .values({
                    participantId,
                    conversationId: conversation.conversationId,
                    completedAt: null,
                    withdrawnAt: null,
                    createdAt: now,
                    updatedAt: now,
                })
                .returning({ id: surveyResponseTable.id });
            surveyResponseId = insertedSurveyResponse[0].id;
        } else {
            if (shouldResetWithdrawnResponse) {
                await softDeleteSurveyResponseAnswers({
                    db: tx,
                    surveyResponseId,
                    now,
                });
            }

            const responseUpdate = shouldResetWithdrawnResponse
                ? {
                      withdrawnAt: null,
                      completedAt: null,
                      updatedAt: now,
                  }
                : {
                      withdrawnAt: null,
                      updatedAt: now,
                  };

            await tx
                .update(surveyResponseTable)
                .set(responseUpdate)
                .where(eq(surveyResponseTable.id, surveyResponseId));
        }

        const existingAnswerRows = await tx
            .select({ id: surveyAnswerTable.id })
            .from(surveyAnswerTable)
            .where(
                and(
                    eq(surveyAnswerTable.surveyResponseId, surveyResponseId),
                    eq(surveyAnswerTable.surveyQuestionId, question.id),
                    isNull(surveyAnswerTable.deletedAt),
                ),
            )
            .limit(1);
        const existingAnswerId = existingAnswerRows.at(0)?.id;

        if (answer === null) {
            if (question.isRequired) {
                if (existingAnswerId !== undefined) {
                    await tx
                        .update(surveyAnswerOptionTable)
                        .set({ deletedAt: now })
                        .where(
                            and(
                                eq(
                                    surveyAnswerOptionTable.surveyAnswerId,
                                    existingAnswerId,
                                ),
                                isNull(surveyAnswerOptionTable.deletedAt),
                            ),
                        );
                    await tx
                        .update(surveyAnswerTable)
                        .set({ deletedAt: now, updatedAt: now })
                        .where(eq(surveyAnswerTable.id, existingAnswerId));
                }
                return;
            }

            let surveyAnswerId = existingAnswerId;
            if (surveyAnswerId === undefined) {
                const insertedAnswer = await tx
                    .insert(surveyAnswerTable)
                    .values({
                        surveyResponseId,
                        conversationId: conversation.conversationId,
                        surveyQuestionId: question.id,
                        answeredQuestionSemanticVersion:
                            question.currentSemanticVersion,
                        textValueHtml: null,
                        deletedAt: null,
                        createdAt: now,
                        updatedAt: now,
                    })
                    .returning({ id: surveyAnswerTable.id });
                surveyAnswerId = insertedAnswer[0].id;
            } else {
                await tx
                    .update(surveyAnswerTable)
                    .set({
                        answeredQuestionSemanticVersion:
                            question.currentSemanticVersion,
                        textValueHtml: null,
                        deletedAt: null,
                        updatedAt: now,
                    })
                    .where(eq(surveyAnswerTable.id, surveyAnswerId));
            }

            await tx
                .update(surveyAnswerOptionTable)
                .set({ deletedAt: now })
                .where(
                    and(
                        eq(
                            surveyAnswerOptionTable.surveyAnswerId,
                            surveyAnswerId,
                        ),
                        isNull(surveyAnswerOptionTable.deletedAt),
                    ),
                );
            return;
        }

        const textValueHtml =
            answer.questionType === "free_text" ? answer.textValueHtml : null;
        let surveyAnswerId = existingAnswerId;
        if (surveyAnswerId === undefined) {
            const insertedAnswer = await tx
                .insert(surveyAnswerTable)
                .values({
                    surveyResponseId,
                    conversationId: conversation.conversationId,
                    surveyQuestionId: question.id,
                    answeredQuestionSemanticVersion:
                        question.currentSemanticVersion,
                    textValueHtml,
                    deletedAt: null,
                    createdAt: now,
                    updatedAt: now,
                })
                .returning({ id: surveyAnswerTable.id });
            surveyAnswerId = insertedAnswer[0].id;
        } else {
            await tx
                .update(surveyAnswerTable)
                .set({
                    answeredQuestionSemanticVersion:
                        question.currentSemanticVersion,
                    textValueHtml,
                    deletedAt: null,
                    updatedAt: now,
                })
                .where(eq(surveyAnswerTable.id, surveyAnswerId));
            await tx
                .update(surveyAnswerOptionTable)
                .set({ deletedAt: now })
                .where(
                    and(
                        eq(
                            surveyAnswerOptionTable.surveyAnswerId,
                            surveyAnswerId,
                        ),
                        isNull(surveyAnswerOptionTable.deletedAt),
                    ),
                );
        }

        if (answer.questionType !== "free_text") {
            const optionIdsBySlugId = new Map(
                question.options.map((option) => [option.slugId, option.id]),
            );
            if (answer.optionSlugIds.length > 0) {
                await tx.insert(surveyAnswerOptionTable).values(
                    answer.optionSlugIds.map((optionSlugId) => {
                        const surveyQuestionOptionId =
                            optionIdsBySlugId.get(optionSlugId);
                        if (surveyQuestionOptionId === undefined) {
                            throw httpErrors.badRequest(
                                "Survey option not found",
                            );
                        }
                        return {
                            surveyAnswerId,
                            surveyQuestionId: question.id,
                            surveyQuestionOptionId,
                            deletedAt: null,
                        };
                    }),
                );
            }
        }
    });

    const nextSurveyState = await loadSurveyParticipantState({
        db,
        conversationId: conversation.conversationId,
        participantId,
    });
    const nextSurveyGate = deriveSurveyGate({
        surveyState: nextSurveyState,
        participantId,
    });
    const justCompleted =
        previousSurveyGate.status !== "complete_valid" &&
        nextSurveyGate.status === "complete_valid";

    if (justCompleted && nextSurveyState.response !== undefined) {
        await db
            .update(surveyResponseTable)
            .set({ completedAt: now, updatedAt: now })
            .where(eq(surveyResponseTable.id, nextSurveyState.response.id));
    }

    if (
        shouldRecomputeAnalysisForSurveyTransition({
            previousSurveyGateStatus: previousSurveyGate.status,
            nextSurveyGateStatus: nextSurveyGate.status,
            isOptional: activeSurveyConfig.isOptional,
        })
    ) {
        await refreshConversationAnalysisForParticipantSurveyTransition({
            db,
            conversation,
            participantId,
            previousSurveyGateStatus: previousSurveyGate.status,
            nextSurveyGateStatus: nextSurveyGate.status,
            valkey,
        });
    }

    return {
        success: true,
        surveyGate: toSurveyGateDto({ surveyGate: nextSurveyGate }),
        justCompleted,
    };
}

export async function withdrawSurveyResponse({
    db,
    conversationSlugId,
    didWrite,
    userAgent,
    now,
    valkey,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    didWrite: string;
    userAgent: string;
    now: Date;
    valkey?: Valkey;
}): Promise<
    | {
          success: true;
          surveyGate: SurveyGateSummary;
      }
    | {
          success: false;
          reason: ParticipationBlockedReason;
      }
> {
    const participationCheck = await checkConversationParticipation({
        db,
        conversationSlugId,
        didWrite,
        userAgent,
        now,
        requireCompletedSurvey: false,
    });
    if (!participationCheck.success) {
        return participationCheck;
    }

    const participantId = participationCheck.participantId;
    const conversation = {
        conversationId: participationCheck.conversationId,
        slugId: conversationSlugId,
        conversationType: participationCheck.conversationType,
    };

    const previousSurveyState = await loadSurveyParticipantState({
        db,
        conversationId: conversation.conversationId,
        participantId,
    });
    const previousSurveyGate = deriveSurveyGate({
        surveyState: previousSurveyState,
        participantId,
    });
    if (previousSurveyState.activeSurveyConfig === undefined) {
        throw httpErrors.notFound("Survey not found");
    }
    if (previousSurveyState.response === undefined) {
        return {
            success: true,
            surveyGate: toSurveyGateDto({ surveyGate: previousSurveyGate }),
        };
    }
    const surveyResponseId = previousSurveyState.response.id;

    await db.transaction(async (tx) => {
        await softDeleteSurveyResponseAnswers({
            db: tx,
            surveyResponseId,
            now,
        });

        await tx
            .update(surveyResponseTable)
            .set({ withdrawnAt: now, completedAt: null, updatedAt: now })
            .where(eq(surveyResponseTable.id, surveyResponseId));
    });

    const nextSurveyState = await loadSurveyParticipantState({
        db,
        conversationId: conversation.conversationId,
        participantId,
    });
    const nextSurveyGate = deriveSurveyGate({
        surveyState: nextSurveyState,
        participantId,
    });

    if (
        shouldRecomputeAnalysisForSurveyTransition({
            previousSurveyGateStatus: previousSurveyGate.status,
            nextSurveyGateStatus: nextSurveyGate.status,
            isOptional: previousSurveyState.activeSurveyConfig.isOptional,
        })
    ) {
        await refreshConversationAnalysisForParticipantSurveyTransition({
            db,
            conversation,
            participantId,
            previousSurveyGateStatus: previousSurveyGate.status,
            nextSurveyGateStatus: nextSurveyGate.status,
            valkey,
        });
    }

    return {
        success: true,
        surveyGate: toSurveyGateDto({ surveyGate: nextSurveyGate }),
    };
}

export async function updateSurveyConfigByAuthor({
    db,
    conversationSlugId,
    userId,
    surveyConfig,
    now,
    googleCloudCredentials,
    valkey,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    userId: string;
    surveyConfig: SurveyConfig;
    now: Date;
    googleCloudCredentials?: GoogleCloudCredentials;
    valkey?: Valkey;
}): Promise<{
    currentRevision: number;
    surveyGate: SurveyGateSummary;
}> {
    const conversation = await getConversationAccessContextBySlugId({
        db,
        conversationSlugId,
    });
    await requireProjectCapability({
        db,
        userId,
        projectId: conversation.projectId,
        capability: "conversation_update",
        message: "Missing conversation_update capability",
    });
    const existingSurveyConfig = await getActiveSurveyConfigRecord({
        db,
        conversationId: conversation.conversationId,
    });
    await requirePremiumAccess({
        db,
        subject: getPremiumEntitlementSubjectForConversation({
            conversation: { projectId: conversation.projectId, userId },
        }),
        features: ["survey"],
        mode: existingSurveyConfig === undefined ? "creation" : "edit",
        now,
    });

    const surveyConfigUpdateEffect = await db.transaction(async (tx) => {
        return await setSurveyConfigForConversation({
            db: tx,
            conversationId: conversation.conversationId,
            surveyConfig,
            now,
            googleCloudCredentials,
        });
    });

    if (
        shouldRecomputeAnalysisForSurveyConfigChange(surveyConfigUpdateEffect)
    ) {
        await refreshConversationAnalysisForSurveyChange({
            db,
            conversation,
            valkey,
        });
    }

    const activeSurveyConfig = await getActiveSurveyConfigRecord({
        db,
        conversationId: conversation.conversationId,
    });
    if (activeSurveyConfig === undefined) {
        throw httpErrors.internalServerError("Survey config was not persisted");
    }

    return {
        currentRevision: activeSurveyConfig.currentRevision,
        surveyGate: await getSurveyGateSummary({
            db,
            conversationId: conversation.conversationId,
            participantId: userId,
        }),
    };
}

export async function deleteSurveyConfigByAuthor({
    db,
    conversationSlugId,
    userId,
    now,
    valkey,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    userId: string;
    now: Date;
    valkey?: Valkey;
}): Promise<void> {
    const conversation = await getConversationAccessContextBySlugId({
        db,
        conversationSlugId,
    });
    await requireProjectCapability({
        db,
        userId,
        projectId: conversation.projectId,
        capability: "conversation_update",
        message: "Missing conversation_update capability",
    });
    const surveyConfigUpdateEffect = await db.transaction(async (tx) => {
        return await setSurveyConfigForConversation({
            db: tx,
            conversationId: conversation.conversationId,
            surveyConfig: null,
            now,
        });
    });

    if (
        shouldRecomputeAnalysisForSurveyConfigChange(surveyConfigUpdateEffect)
    ) {
        await refreshConversationAnalysisForSurveyChange({
            db,
            conversation,
            valkey,
        });
    }
}

export function surveyAnswerToPlainText({
    answer,
}: {
    answer: SurveyAnswerDraft;
}): string | undefined {
    if (answer.questionType !== "free_text") {
        return undefined;
    }

    return htmlToCountedText(answer.textValueHtml);
}
