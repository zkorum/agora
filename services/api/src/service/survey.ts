import { httpErrors } from "@fastify/sensible";
import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { generateRandomSlugId } from "@/crypto.js";
import {
    conversationTable,
    organizationTable,
    surveyAnswerOptionTable,
    surveyAnswerTable,
    surveyConfigTable,
    surveyQuestionContentTable,
    surveyQuestionContentTranslationTable,
    surveyQuestionOptionContentTable,
    surveyQuestionOptionContentTranslationTable,
    surveyQuestionOptionTable,
    surveyQuestionTable,
    surveyResponseTable,
} from "@/shared-backend/schema.js";
import { reconcileConversationCounters } from "@/shared-backend/conversationCounters.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import {
    getSurveyQuestionContentTranslations,
    getSurveyQuestionOptionContentTranslations,
} from "@/shared-backend/surveyTranslation.js";
import {
    batchTranslateTexts,
    detectLanguage,
    type DetectedLanguageResult,
    shouldSkipTranslation,
} from "@/shared-backend/translate.js";
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
} from "@/shared/shared.js";
import {
    zodSurveyQuestionConstraints,
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
import {
    ZodSupportedDisplayLanguageCodes,
    type SupportedDisplayLanguageCodes,
} from "@/shared/languages.js";
import { config, log } from "@/app.js";
import { checkFeatureManagementAccess } from "@/shared-app-api/featureAccess.js";
import { getConversationViewAccessLevel } from "@/service/conversationAccess.js";
import {
    PUBLIC_SURVEY_SUPPRESSION_THRESHOLD,
    buildSurveyAggregateRows,
    buildSurveyCompletionCounts,
    loadSurveyExportContext,
    type SurveyExportContext,
} from "./conversationExport/generators/surveyShared.js";
import { checkConversationParticipation } from "./participationGate.js";

interface ConversationAccessContext {
    conversationId: number;
    slugId: string;
    authorId: string;
    organizationName: string | null;
    participationMode: (typeof conversationTable.$inferSelect)["participationMode"];
    conversationType: (typeof conversationTable.$inferSelect)["conversationType"];
    currentContentId: number | null;
    isClosed: boolean;
    requiresEventTicket: (typeof conversationTable.$inferSelect)["requiresEventTicket"];
}

function assertSurveyFeatureAllowed({
    conversation,
    hasExistingSurvey,
    userId,
}: {
    conversation: ConversationAccessContext;
    hasExistingSurvey: boolean;
    userId: string;
}): void {
    const surveyAccess = checkFeatureManagementAccess({
        hasExistingFeature: hasExistingSurvey,
        featureEnabled: config.SURVEY_ENABLED,
        isOrgOnly: config.IS_SURVEY_ORG_ONLY,
        allowedOrgs: config.SURVEY_ALLOWED_ORGS,
        allowedUsers: config.SURVEY_ALLOWED_USERS,
        postAsOrganization: conversation.organizationName !== null,
        organizationName: conversation.organizationName ?? "",
        userId,
    });
    if (surveyAccess.allowed) {
        return;
    }

    switch (surveyAccess.reason) {
        case "disabled":
            throw httpErrors.serviceUnavailable(
                "Survey feature is currently disabled",
            );
        case "org_required":
            throw httpErrors.forbidden(
                "Survey configuration is restricted to organization conversations",
            );
        case "org_not_in_whitelist":
            throw httpErrors.forbidden(
                "This organization is not allowed to configure surveys",
            );
        case "user_not_in_whitelist":
            throw httpErrors.forbidden(
                "This user is not allowed to configure surveys",
            );
    }
}

interface SurveyConfigUpdateEffect {
    previousRequiresSurvey: boolean;
    nextRequiresSurvey: boolean;
    didRequiredQuestionSemanticChange: boolean;
}

interface InternalSurveyGateSummary {
    hasSurvey: boolean;
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

    await reconcileConversationCounters({
        db,
        conversationId: conversation.conversationId,
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
    questionText: string;
    constraints: SurveyQuestionConstraints;
    sourceLanguageCode?: string | null;
    sourceLanguageConfidence?: number | null;
    options: ActiveSurveyOptionRecord[];
}

export interface ActiveSurveyConfigRecord {
    id: number;
    currentRevision: number;
    questions: ActiveSurveyQuestionRecord[];
}

export interface StoredSurveyAnswer {
    answerId: number;
    answeredQuestionSemanticVersion: number;
    textValueHtml: string | null;
    optionSlugIds: string[];
}

const SURVEY_TRANSLATION_FETCH_TIMEOUT_MS = 1500;

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

    return parsedValue >= minValue && (maxValue === undefined || parsedValue <= maxValue);
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
}: {
    question: ActiveSurveyQuestionRecord;
    storedAnswer: StoredSurveyAnswer | undefined;
}): SurveyQuestionFormItem {
    const candidateAnswer =
        storedAnswer === undefined
            ? undefined
            : surveyQuestionToAnswerDraft({
                  question,
                  storedAnswer,
              });
    const isPassed =
        storedAnswer !== undefined &&
        isStoredSurveyAnswerPassed({ question, storedAnswer });
    const isStale =
        storedAnswer !== undefined &&
        !isPassed &&
        candidateAnswer !== undefined &&
        (storedAnswer.answeredQuestionSemanticVersion !==
            question.currentSemanticVersion ||
            !validateSurveyAnswer({ question, answer: candidateAnswer }));
    const currentAnswer = isStale ? undefined : candidateAnswer;
    const isCurrentAnswerValid =
        currentAnswer !== undefined &&
        validateSurveyAnswer({ question, answer: currentAnswer });

    return {
        ...surveyQuestionToConfig({ question }),
        currentAnswer,
        isPassed,
        isMissingRequired:
            question.isRequired && !isCurrentAnswerValid && !isStale,
        isStale,
        isCurrentAnswerValid,
        currentSemanticVersion: question.currentSemanticVersion,
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
            canParticipate: true,
            status: "no_survey",
            requiredQuestionCount: 0,
            validRequiredAnswerCount: 0,
            staleRequiredQuestionCount: 0,
        };
    }

    const requiredQuestions = activeSurveyConfig.questions.filter(
        (question) => question.isRequired,
    );
    const requiresSurveyCompletion = doesSurveyRequireCompletion({
        requiredQuestionCount: requiredQuestions.length,
    });

    if (!requiresSurveyCompletion) {
        const completedQuestionCount = activeSurveyConfig.questions.filter(
            (question) => {
                return isSurveyQuestionCompleted({
                    question,
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
        canParticipate: status === "complete_valid",
        status,
        requiredQuestionCount: requiredQuestions.length,
        validRequiredAnswerCount,
        staleRequiredQuestionCount,
    };
}

function deriveSurveyRouteResolution({
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
        if (!question.isRequired) {
            continue;
        }
        const questionFormItem = deriveSurveyQuestionFormItem({
            question,
            storedAnswer: surveyState.answersByQuestionId.get(question.id),
        });
        if (!questionFormItem.isCurrentAnswerValid) {
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
            authorId: conversationTable.authorId,
            organizationName: organizationTable.name,
            participationMode: conversationTable.participationMode,
            conversationType: conversationTable.conversationType,
            currentContentId: conversationTable.currentContentId,
            isClosed: conversationTable.isClosed,
            requiresEventTicket: conversationTable.requiresEventTicket,
        })
        .from(conversationTable)
        .leftJoin(
            organizationTable,
            eq(conversationTable.organizationId, organizationTable.id),
        )
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
                       currentContentId: surveyQuestionOptionTable.currentContentId,
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
        questions: questionRows.map((question) => ({
            id: question.questionId,
            slugId: question.questionSlugId,
            questionType: question.questionType,
            choiceDisplay: question.choiceDisplay,
            currentContentId: question.currentContentId,
            currentSemanticVersion: question.currentSemanticVersion,
            displayOrder: question.displayOrder,
            isRequired: question.isRequired,
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

function collectSurveyQuestionContentIds({
    activeSurveyConfig,
}: {
    activeSurveyConfig: ActiveSurveyConfigRecord;
}): number[] {
    return activeSurveyConfig.questions.flatMap((question) =>
        question.currentContentId == null ? [] : [question.currentContentId],
    );
}

function collectSurveyQuestionOptionContentIds({
    activeSurveyConfig,
}: {
    activeSurveyConfig: ActiveSurveyConfigRecord;
}): number[] {
    return activeSurveyConfig.questions.flatMap((question) =>
        question.options.flatMap((option) =>
            option.currentContentId == null ? [] : [option.currentContentId],
        ),
    );
}

function hasLexicalSurveyContent({ text }: { text: string }): boolean {
    return /\p{L}/u.test(text);
}

function buildSurveyDetectionCorpus({
    activeSurveyConfig,
}: {
    activeSurveyConfig: ActiveSurveyConfigRecord;
}): string {
    const texts = activeSurveyConfig.questions.flatMap((question) => [
        question.questionText,
        ...question.options
            .map((option) => option.optionText)
            .filter((optionText) => hasLexicalSurveyContent({ text: optionText })),
    ]);

    return texts
        .map((text) => text.trim())
        .filter((text) => text.length > 0)
        .join("\n\n");
}

function getStoredSurveySourceLanguageMetadata({
    activeSurveyConfig,
}: {
    activeSurveyConfig: ActiveSurveyConfigRecord;
}): DetectedLanguageResult | undefined {
    for (const question of activeSurveyConfig.questions) {
        if (question.sourceLanguageCode != null) {
            return {
                languageCode: question.sourceLanguageCode,
                confidence: question.sourceLanguageConfidence ?? 0,
            };
        }

        for (const option of question.options) {
            if (option.sourceLanguageCode != null) {
                return {
                    languageCode: option.sourceLanguageCode,
                    confidence: option.sourceLanguageConfidence ?? 0,
                };
            }
        }
    }

    return undefined;
}

async function persistSurveySourceLanguageMetadata({
    db,
    activeSurveyConfig,
    sourceLanguage,
}: {
    db: PostgresJsDatabase;
    activeSurveyConfig: ActiveSurveyConfigRecord;
    sourceLanguage: DetectedLanguageResult;
}): Promise<void> {
    const questionContentIds = collectSurveyQuestionContentIds({
        activeSurveyConfig,
    });
    const optionContentIds = collectSurveyQuestionOptionContentIds({
        activeSurveyConfig,
    });

    if (questionContentIds.length > 0) {
        await db
            .update(surveyQuestionContentTable)
            .set({
                sourceLanguageCode: sourceLanguage.languageCode,
                sourceLanguageConfidence: sourceLanguage.confidence,
            })
            .where(inArray(surveyQuestionContentTable.id, questionContentIds));
    }

    if (optionContentIds.length > 0) {
        await db
            .update(surveyQuestionOptionContentTable)
            .set({
                sourceLanguageCode: sourceLanguage.languageCode,
                sourceLanguageConfidence: sourceLanguage.confidence,
            })
            .where(
                inArray(surveyQuestionOptionContentTable.id, optionContentIds),
            );
    }
}

function applySurveyTranslationsToActiveSurveyConfig({
    activeSurveyConfig,
    questionTranslations,
    optionTranslations,
}: {
    activeSurveyConfig: ActiveSurveyConfigRecord;
    questionTranslations: Map<number, string>;
    optionTranslations: Map<number, string>;
}): ActiveSurveyConfigRecord {
    return {
        ...activeSurveyConfig,
        questions: activeSurveyConfig.questions.map((question) => ({
            ...question,
            questionText:
                question.currentContentId == null
                    ? question.questionText
                    : questionTranslations.get(question.currentContentId) ??
                      question.questionText,
            options: question.options.map((option) => ({
                ...option,
                optionText:
                    option.currentContentId == null
                        ? option.optionText
                        : optionTranslations.get(option.currentContentId) ??
                          option.optionText,
            })),
        })),
    };
}

async function ensureSurveyTranslations({
    db,
    activeSurveyConfig,
    displayLanguageCodes,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    activeSurveyConfig: ActiveSurveyConfigRecord;
    displayLanguageCodes: SupportedDisplayLanguageCodes[];
    googleCloudCredentials: GoogleCloudCredentials;
}): Promise<void> {
    let sourceLanguage = getStoredSurveySourceLanguageMetadata({
        activeSurveyConfig,
    });

    if (sourceLanguage === undefined) {
        const detectionCorpus = buildSurveyDetectionCorpus({ activeSurveyConfig });
        if (detectionCorpus.length > 0) {
            sourceLanguage = await detectLanguage({
                client: googleCloudCredentials.client,
                text: detectionCorpus,
                projectId: googleCloudCredentials.config.projectId,
                location: googleCloudCredentials.config.location,
            });
        }

        if (sourceLanguage !== undefined) {
            await persistSurveySourceLanguageMetadata({
                db,
                activeSurveyConfig,
                sourceLanguage,
            });
        }
    }

    for (const displayLanguageCode of displayLanguageCodes) {
        if (
            sourceLanguage !== undefined &&
            shouldSkipTranslation({
                sourceLanguageCode: sourceLanguage.languageCode,
                targetLanguageCode: displayLanguageCode,
            })
        ) {
            continue;
        }

        const questionTranslations = await getSurveyQuestionContentTranslations({
            db,
            surveyQuestionContentIds: collectSurveyQuestionContentIds({
                activeSurveyConfig,
            }),
            displayLanguageCode,
        });
        const optionTranslations =
            await getSurveyQuestionOptionContentTranslations({
                db,
                surveyQuestionOptionContentIds:
                    collectSurveyQuestionOptionContentIds({ activeSurveyConfig }),
                displayLanguageCode,
            });

        const missingQuestionTranslations = activeSurveyConfig.questions.filter(
            (question) =>
                question.currentContentId != null &&
                !questionTranslations.has(question.currentContentId),
        );
        const missingOptionTranslations = activeSurveyConfig.questions.flatMap(
            (question) =>
                question.options.filter(
                    (option) =>
                        option.currentContentId != null &&
                        !optionTranslations.has(option.currentContentId),
                ),
        );

        if (
            missingQuestionTranslations.length === 0 &&
            missingOptionTranslations.length === 0
        ) {
            continue;
        }

        const now = new Date();

        if (missingQuestionTranslations.length > 0) {
            const translatedQuestionTexts = await batchTranslateTexts({
                client: googleCloudCredentials.client,
                texts: missingQuestionTranslations.map(
                    (question) => question.questionText,
                ),
                sourceLanguageCode: sourceLanguage?.languageCode,
                targetLanguageCode: displayLanguageCode,
                projectId: googleCloudCredentials.config.projectId,
                location: googleCloudCredentials.config.location,
                contentKind: "survey_prompt",
            });

            await db
                .insert(surveyQuestionContentTranslationTable)
                .values(
                    missingQuestionTranslations.flatMap((question, index) =>
                        question.currentContentId == null
                            ? []
                            : [
                                  {
                                      surveyQuestionContentId:
                                          question.currentContentId,
                                      displayLanguageCode,
                                      translatedQuestionText:
                                          translatedQuestionTexts[index],
                                      createdAt: now,
                                      updatedAt: now,
                                  },
                              ],
                    ),
                )
                .onConflictDoNothing({
                    target: [
                        surveyQuestionContentTranslationTable.surveyQuestionContentId,
                        surveyQuestionContentTranslationTable.displayLanguageCode,
                    ],
                });
        }

        if (missingOptionTranslations.length > 0) {
            const translatedOptionTexts = await batchTranslateTexts({
                client: googleCloudCredentials.client,
                texts: missingOptionTranslations.map((option) => option.optionText),
                sourceLanguageCode: sourceLanguage?.languageCode,
                targetLanguageCode: displayLanguageCode,
                projectId: googleCloudCredentials.config.projectId,
                location: googleCloudCredentials.config.location,
                contentKind: "survey_option",
            });

            await db
                .insert(surveyQuestionOptionContentTranslationTable)
                .values(
                    missingOptionTranslations.flatMap((option, index) =>
                        option.currentContentId == null
                            ? []
                            : [
                                  {
                                      surveyQuestionOptionContentId:
                                          option.currentContentId,
                                      displayLanguageCode,
                                      translatedOptionText:
                                          translatedOptionTexts[index],
                                      createdAt: now,
                                      updatedAt: now,
                                  },
                              ],
                    ),
                )
                .onConflictDoNothing({
                    target: [
                        surveyQuestionOptionContentTranslationTable.surveyQuestionOptionContentId,
                        surveyQuestionOptionContentTranslationTable.displayLanguageCode,
                    ],
                });
        }
    }
}

async function localizeActiveSurveyConfigRecord({
    db,
    activeSurveyConfig,
    displayLanguage,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    activeSurveyConfig: ActiveSurveyConfigRecord;
    displayLanguage: SupportedDisplayLanguageCodes;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<ActiveSurveyConfigRecord> {
    const loadTranslations = async (): Promise<{
        questionTranslations: Map<number, string>;
        optionTranslations: Map<number, string>;
    }> => ({
        questionTranslations: await getSurveyQuestionContentTranslations({
            db,
            surveyQuestionContentIds: collectSurveyQuestionContentIds({
                activeSurveyConfig,
            }),
            displayLanguageCode: displayLanguage,
        }),
        optionTranslations: await getSurveyQuestionOptionContentTranslations({
            db,
            surveyQuestionOptionContentIds: collectSurveyQuestionOptionContentIds({
                activeSurveyConfig,
            }),
            displayLanguageCode: displayLanguage,
        }),
    });

    let { questionTranslations, optionTranslations } = await loadTranslations();

    const hasMissingQuestionTranslation = activeSurveyConfig.questions.some(
        (question) =>
            question.currentContentId != null &&
            !questionTranslations.has(question.currentContentId),
    );
    const hasMissingOptionTranslation = activeSurveyConfig.questions.some(
        (question) =>
            question.options.some(
                (option) =>
                    option.currentContentId != null &&
                    !optionTranslations.has(option.currentContentId),
            ),
    );

    if (
        googleCloudCredentials !== undefined &&
        (hasMissingQuestionTranslation || hasMissingOptionTranslation)
    ) {
        try {
            await Promise.race([
                ensureSurveyTranslations({
                    db,
                    activeSurveyConfig,
                    displayLanguageCodes: [displayLanguage],
                    googleCloudCredentials,
                }),
                new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error("survey_translation_timeout"));
                    }, SURVEY_TRANSLATION_FETCH_TIMEOUT_MS);
                }),
            ]);

            ({ questionTranslations, optionTranslations } =
                await loadTranslations());
        } catch (error: unknown) {
            if (
                error instanceof Error &&
                error.message === "survey_translation_timeout"
            ) {
                log.warn(
                    `[Survey Translation] Timed out localizing survey for ${displayLanguage}`,
                );
            } else {
                log.warn(
                    error,
                    `[Survey Translation] Failed to localize survey for ${displayLanguage}`,
                );
            }
        }
    }

    return applySurveyTranslationsToActiveSurveyConfig({
        activeSurveyConfig,
        questionTranslations,
        optionTranslations,
    });
}

export async function warmSurveyTranslationsForConversation({
    db,
    conversationId,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<void> {
    if (googleCloudCredentials === undefined) {
        return;
    }

    const activeSurveyConfig = await getActiveSurveyConfigRecord({
        db,
        conversationId,
    });
    if (activeSurveyConfig === undefined) {
        return;
    }

    await ensureSurveyTranslations({
        db,
        activeSurveyConfig,
        displayLanguageCodes: ZodSupportedDisplayLanguageCodes.options,
        googleCloudCredentials,
    });
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
}: {
    db: PostgresJsDatabase;
    surveyConfigId: number;
    conversationId: number;
    question: SurveyQuestionConfig;
    now: Date;
}): Promise<void> {
    const questionSlugId = question.questionSlugId ?? generateRandomSlugId();
    const insertedQuestions = await db
        .insert(surveyQuestionTable)
        .values({
            slugId: questionSlugId,
            surveyConfigId,
            conversationId,
            questionType: question.questionType,
            choiceDisplay:
                question.questionType === "free_text" ? "auto" : question.choiceDisplay,
            currentContentId: null,
            currentSemanticVersion: 1,
            displayOrder: question.displayOrder,
            isRequired: question.isRequired,
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
}: {
    db: PostgresJsDatabase;
    surveyConfigId: number;
    surveyConfig: SurveyConfig;
    now: Date;
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
            });
            continue;
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
            existingQuestion.isRequired !== question.isRequired ||
            constraintsChanged
        ) {
            semanticChanged = true;
            if (questionAffectsEligibility) {
                didSemanticChange = true;
            }
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
            const insertedContent = await db
                .insert(surveyQuestionContentTable)
                .values({
                    surveyQuestionId: existingQuestion.id,
                    questionText: question.questionText,
                    constraints: question.constraints,
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
                    .set({ currentContentId: null, updatedAt: now })
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
                .set({ currentContentId: null, updatedAt: now })
                .where(eq(surveyQuestionTable.id, existingQuestion.id));
        }
    }

    await db
        .update(surveyConfigTable)
        .set({
            currentRevision: existingSurveyConfig.currentRevision + 1,
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
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    surveyConfig: SurveyConfig | null;
    now: Date;
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
        requiredQuestionCount:
            previousSurveyConfig?.questions.filter(
                (question) => question.isRequired,
            ).length ?? 0,
    });
    const nextRequiresSurvey = doesSurveyRequireCompletion({
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
    displayLanguage,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    participantId: string | undefined;
    displayLanguage: SupportedDisplayLanguageCodes;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
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
    const localizedActiveSurveyConfig = await localizeActiveSurveyConfigRecord({
        db,
        activeSurveyConfig: surveyState.activeSurveyConfig,
        displayLanguage,
        googleCloudCredentials,
    });
    const localizedSurveyState: SurveyParticipantState = {
        ...surveyState,
        activeSurveyConfig: localizedActiveSurveyConfig,
    };
    const surveyGate = deriveSurveyGate({
        surveyState: localizedSurveyState,
        participantId,
    });

    return {
        currentRevision: localizedActiveSurveyConfig.currentRevision,
        questions: localizedActiveSurveyConfig.questions.map((question) =>
            deriveSurveyQuestionFormItem({
                question,
                storedAnswer: localizedSurveyState.answersByQuestionId.get(
                    question.id,
                ),
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

export async function fetchSurveyAggregatedResults({
    db,
    conversationSlugId,
    userId,
    displayLanguage,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    userId: string | undefined;
    displayLanguage: SupportedDisplayLanguageCodes;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
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
    const accessLevel = await getConversationViewAccessLevel({
        db,
        conversationId: conversation.conversationId,
        userId,
    });
    const context = await loadSurveyExportContext({
        db,
        conversationId: conversation.conversationId,
    });
    const localizedActiveSurveyConfig =
        context.activeSurveyConfig === undefined
            ? undefined
            : await localizeActiveSurveyConfigRecord({
                  db,
                  activeSurveyConfig: context.activeSurveyConfig,
                  displayLanguage,
                  googleCloudCredentials,
              });
    const localizedContext = {
        ...context,
        activeSurveyConfig: localizedActiveSurveyConfig,
    } satisfies SurveyExportContext;

    return {
        hasSurvey: localizedContext.activeSurveyConfig !== undefined,
        accessLevel,
        suppressionThreshold: PUBLIC_SURVEY_SUPPRESSION_THRESHOLD,
        suppressedRows: buildSurveyAggregateRows({
            context: localizedContext,
            includeSuppression: true,
        }),
        fullRows:
            accessLevel === "owner"
                ? buildSurveyAggregateRows({
                      context: localizedContext,
                      includeSuppression: false,
                  })
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
    const accessLevel = await getConversationViewAccessLevel({
        db,
        conversationId: conversation.conversationId,
        userId,
    });
    if (accessLevel !== "owner") {
        throw httpErrors.forbidden(
            "Only the conversation author or facilitator can view survey completion counts",
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

    const question = activeSurveyConfig.questions.find(
        (currentQuestion) => currentQuestion.slugId === questionSlugId,
    );
    if (question === undefined) {
        throw httpErrors.notFound("Survey question not found");
    }

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
        })
    ) {
        await refreshConversationAnalysisForSurveyChange({
            db,
            conversation,
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
        })
    ) {
        await refreshConversationAnalysisForSurveyChange({
            db,
            conversation,
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
    valkey,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    userId: string;
    surveyConfig: SurveyConfig;
    now: Date;
    valkey?: Valkey;
    googleCloudCredentials?: GoogleCloudCredentials;
}): Promise<{
    currentRevision: number;
}> {
    const conversation = await getConversationAccessContextBySlugId({
        db,
        conversationSlugId,
    });
    if (conversation.authorId !== userId) {
        throw httpErrors.forbidden(
            "Only the conversation author can edit the survey",
        );
    }
    const existingSurveyConfig = await getActiveSurveyConfigRecord({
        db,
        conversationId: conversation.conversationId,
    });
    assertSurveyFeatureAllowed({
        conversation,
        hasExistingSurvey: existingSurveyConfig !== undefined,
        userId,
    });

    const surveyConfigUpdateEffect = await db.transaction(async (tx) => {
        return await setSurveyConfigForConversation({
            db: tx,
            conversationId: conversation.conversationId,
            surveyConfig,
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

    const activeSurveyConfig = await getActiveSurveyConfigRecord({
        db,
        conversationId: conversation.conversationId,
    });
    if (activeSurveyConfig === undefined) {
        throw httpErrors.internalServerError("Survey config was not persisted");
    }

    void warmSurveyTranslationsForConversation({
        db,
        conversationId: conversation.conversationId,
        googleCloudCredentials,
    }).catch((error: unknown) => {
        log.warn(
            error,
            `[Survey Translation] Async warm-up failed for conversation ${conversationSlugId}`,
        );
    });

    return {
        currentRevision: activeSurveyConfig.currentRevision,
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
    if (conversation.authorId !== userId) {
        throw httpErrors.forbidden(
            "Only the conversation author can delete the survey",
        );
    }
    const existingSurveyConfig = await getActiveSurveyConfigRecord({
        db,
        conversationId: conversation.conversationId,
    });
    assertSurveyFeatureAllowed({
        conversation,
        hasExistingSurvey: existingSurveyConfig !== undefined,
        userId,
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
