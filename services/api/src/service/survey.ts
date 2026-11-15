import { httpErrors } from "@fastify/sensible";
import {
    and,
    asc,
    eq,
    inArray,
    isNotNull,
    isNull,
    notInArray,
    or,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { generateRandomSlugId } from "@/crypto.js";
import {
    conversationContentTable,
    conversationTable,
    comparisonAnswerTable,
    comparisonResponseTable,
    opinionModerationTable,
    opinionGroupLineageTable,
    opinionGroupTable,
    opinionTable,
    rankingConversationConfigTable,
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
    userTable,
    voteTable,
} from "@/shared-backend/schema.js";
import { scheduleConversationAnalysisRefresh } from "@/shared-backend/conversationCounters.js";
import { scheduleQvStatsRefresh } from "@/shared-backend/qvStatsRefresh.js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    enqueueConversationForMathWork,
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
    countPlainTextCharacters,
    hasVisiblePlainText,
    PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD,
} from "@/shared/shared.js";
import {
    getSurveyOptionText,
    isSurveyOptionPlainTextWithinLimit,
    isSurveyOptionTextWithinLimit,
    surveyOptionTextsEqual,
    surveyOptionTextInputToHtml,
    type SurveyOptionText,
} from "@/shared/surveyChoiceText.js";
import {
    groupSurveyAnswerOptionRows,
    loadSurveyAnswerOptionRows,
} from "./surveyAnswerOptions.js";
import {
    zodSurveyQuestionConstraints,
    type AnalysisView,
    type ConversationType,
    type RankingMode,
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
import type {
    ConversationParticipationStatus,
    ConversationEmailUpdateOnboardingAction,
    SurveyAnswerSaveResponse,
    SurveyAnswerRecovery,
    SurveyStatusCheckResponse,
    SurveyResponseWithdrawResponse,
} from "@/shared/types/dto.js";
import { log } from "@/app.js";
import { logApiError } from "@/logging/privacy.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import {
    buildSurveyAggregateResultRows,
    buildSurveyCompletionCounts,
    loadSurveyExportContext,
} from "./conversationExport/generators/surveyShared.js";
import {
    checkConversationParticipation,
    getParticipationBlockedReasonFromSurveyGateStatus,
} from "./participationGate.js";
import { queueConversationSurveyUpdatedEvent } from "./realtimeEventOutbox.js";
import {
    getDescriptionTextsByGroupId,
    getSelectedOpinionGroupCandidate,
} from "./opinionGroupAnalysis.js";
import {
    getPremiumEntitlementSubjectForConversation,
    requirePremiumAccess,
} from "./premiumEntitlement.js";
import {
    buildContentBlockLanguageDetectionCorpus,
    buildSurveyLanguageDetectionCorpus,
    contentLanguageMetadataUpdateValues,
    type ContentLanguageMetadata,
    resolveContentLanguageMetadata,
    UNKNOWN_CONTENT_LANGUAGE_METADATA,
} from "./contentLanguageMetadata.js";
import {
    buildConversationLanguageDetectionCorpus,
    buildGoogleConversationLanguageDetectionCorpus,
} from "./conversationLanguage.js";
import { getConversationMultilingualSetting } from "./conversationMultilingual.js";
import type { SurveyQuestionContentSource } from "./contentTranslation.js";
import {
    htmlToCountedTextWithWarning,
    normalizeUserRichTextInput,
    type NormalizedUserRichText,
} from "./richText.js";

interface ConversationAccessContext {
    conversationId: number;
    slugId: string;
    projectId: number;
    participationMode: (typeof conversationTable.$inferSelect)["participationMode"];
    conversationType: (typeof conversationTable.$inferSelect)["conversationType"];
    rankingMode: RankingMode | null;
    prioritizationType: "comparisons" | "qv" | null;
    currentContentId: number | null;
    isClosed: boolean;
}

interface SurveyConfigUpdateEffect {
    previousRequiresSurvey: boolean;
    nextRequiresSurvey: boolean;
    didRequiredQuestionSemanticChange: boolean;
    currentQuestionSources: SurveyQuestionContentSource[];
}

async function resolveSurveyBlockLanguageMetadata({
    db,
    conversationId,
    surveyConfig,
    googleCloudCredentials,
    useGoogleLanguageDetection,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    surveyConfig: SurveyConfig;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
    useGoogleLanguageDetection: boolean;
}): Promise<ContentLanguageMetadata> {
    const conversationContentRows = await db
        .select({
            title: conversationContentTable.title,
            bodyPlainText: conversationContentTable.bodyPlainText,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .where(eq(conversationTable.id, conversationId))
        .limit(1);
    const conversationContent = conversationContentRows.at(0);
    if (conversationContent === undefined) {
        return UNKNOWN_CONTENT_LANGUAGE_METADATA;
    }
    const bodyPlainText = conversationContent.bodyPlainText ?? "";
    const surveyCorpus = buildSurveyLanguageDetectionCorpus({ surveyConfig });

    return await resolveContentLanguageMetadata({
        text: buildContentBlockLanguageDetectionCorpus({
            conversationCorpus: buildConversationLanguageDetectionCorpus({
                conversationTitle: conversationContent.title,
                bodyPlainText,
            }),
            surveyConfig,
        }),
        googleText: buildGoogleConversationLanguageDetectionCorpus({
            conversationTitle: conversationContent.title,
            bodyPlainText,
            supplementalPlainText: surveyCorpus,
        }),
        googleCloudCredentials,
        useGoogleLanguageDetection,
    });
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

interface SurveyAnalysisRefreshContextBase {
    conversationId: number;
    slugId: string;
}

export type SurveyAnalysisRefreshContext = SurveyAnalysisRefreshContextBase &
    (
        | { conversationType: "polis" }
        | {
              conversationType: "prioritizing";
              prioritizationType: "comparisons" | "qv";
          }
    );

export function buildSurveyAnalysisRefreshContext({
    conversationId,
    slugId,
    conversationType,
    rankingMode,
    prioritizationType,
}: SurveyAnalysisRefreshContextBase & {
    conversationType: ConversationType;
    rankingMode: RankingMode | null;
    prioritizationType: "comparisons" | "qv" | null;
}): SurveyAnalysisRefreshContext {
    if (conversationType === "polis") {
        return { conversationId, slugId, conversationType };
    }
    if (prioritizationType === "qv")
        return { conversationId, slugId, conversationType, prioritizationType };
    if (rankingMode === null || prioritizationType !== "comparisons") {
        throw httpErrors.internalServerError(
            "Ranking conversation is missing its ranking mode",
        );
    }
    return { conversationId, slugId, conversationType, prioritizationType };
}

async function markRankingConversationDirty({
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
        logApiError({
            logger: log,
            level: "error",
            event: {
                event: "survey_scoring_queue_failed",
                conversationId,
                conversationSlugId,
            },
            error,
        });
    }
}

async function lockConversationForSurveyEdit({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<void> {
    await db
        .select({ id: conversationTable.id })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId))
        .for("update", { of: conversationTable });
}

async function lockSurveyParticipantWrite({
    db,
    conversationId,
    participantId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    participantId: string;
}): Promise<void> {
    // KEY SHARE excludes survey editors' UPDATE lock, but is compatible with
    // other participants and the analysis scheduler's NO KEY UPDATE lock.
    await db
        .select({ id: conversationTable.id })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId))
        .for("key share");
    // Lock the owner before reading answers, including simultaneous first saves
    // for which there is no response row to lock yet.
    await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.id, participantId))
        .for("no key update");
}

export async function scheduleConversationAnalysisForSurveyChange({
    db,
    conversation,
}: {
    db: PostgresJsDatabase;
    conversation: SurveyAnalysisRefreshContext;
}): Promise<boolean> {
    if (conversation.conversationType === "prioritizing") {
        if (conversation.prioritizationType === "qv") {
            await scheduleQvStatsRefresh({
                db,
                conversationIds: [conversation.conversationId],
            });
            return true;
        }
        return true;
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
        return false;
    }

    await scheduleConversationAnalysisRefresh({
        db,
        conversationId: conversation.conversationId,
        log,
        queueStrategy: "caller_will_enqueue",
    });
    return true;
}

export async function wakeScheduledConversationAnalysisForSurveyChange({
    conversation,
    valkey,
}: {
    conversation: SurveyAnalysisRefreshContext;
    valkey: Valkey | undefined;
}): Promise<void> {
    if (conversation.conversationType === "prioritizing") {
        if (conversation.prioritizationType === "qv") return;
        await markRankingConversationDirty({
            conversationId: conversation.conversationId,
            conversationSlugId: conversation.slugId,
            valkey,
        });
        return;
    }

    enqueueConversationForMathWork({
        valkey,
        schedule: {
            conversationId: conversation.conversationId,
            conversationSlugId: conversation.slugId,
        },
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
    if (conversation.conversationType === "prioritizing") {
        if (conversation.prioritizationType === "qv") return true;
        const rows = await db
            .select({ id: comparisonResponseTable.id })
            .from(comparisonResponseTable)
            .innerJoin(
                comparisonAnswerTable,
                eq(
                    comparisonAnswerTable.comparisonResponseId,
                    comparisonResponseTable.id,
                ),
            )
            .where(
                and(
                    eq(
                        comparisonResponseTable.conversationId,
                        conversation.conversationId,
                    ),
                    eq(comparisonResponseTable.participantId, participantId),
                    isNull(comparisonAnswerTable.deletedAt),
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
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
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

async function scheduleConversationAnalysisForParticipantSurveyTransition({
    db,
    conversation,
    participantId,
}: {
    db: PostgresJsDatabase;
    conversation: SurveyAnalysisRefreshContext;
    participantId: string;
}): Promise<boolean> {
    const hasAnalysisInput = await hasParticipantAnalysisInput({
        db,
        conversation,
        participantId,
    });

    if (!hasAnalysisInput) {
        return false;
    }

    return await scheduleConversationAnalysisForSurveyChange({
        db,
        conversation,
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
    allowsText: boolean;
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
    textValuePlainText: string | null;
    optionSlugIds: string[];
    optionTextValues?: Record<string, SurveyOptionText>;
}

function getStoredSurveyAnswerPlainText(
    storedAnswer: StoredSurveyAnswer,
): string {
    return htmlToCountedTextWithWarning({
        html: storedAnswer.textValueHtml ?? "",
        context: "stored survey answer",
    });
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
        !hasVisiblePlainText(getStoredSurveyAnswerPlainText(storedAnswer))
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

async function loadSurveyAnswers({
    db,
    surveyResponseId,
}: {
    db: PostgresJsDatabase;
    surveyResponseId: number;
}): Promise<Map<number, StoredSurveyAnswer>> {
    const answerRows = await db
        .select({
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
                eq(surveyAnswerTable.surveyResponseId, surveyResponseId),
                isNull(surveyAnswerTable.deletedAt),
            ),
        );
    const optionsByAnswerId = groupSurveyAnswerOptionRows(
        await loadSurveyAnswerOptionRows({
            db,
            answerIds: answerRows.map((answer) => answer.answerId),
            includeText: true,
        }),
    );
    return new Map(
        answerRows.map((answer) => [
            answer.surveyQuestionId,
            {
                answerId: answer.answerId,
                answeredQuestionSemanticVersion:
                    answer.answeredQuestionSemanticVersion,
                textValueHtml: answer.textValueHtml,
                textValuePlainText: answer.textValuePlainText,
                optionSlugIds:
                    optionsByAnswerId.get(answer.answerId)?.optionSlugIds ?? [],
                optionTextValues: optionsByAnswerId.get(answer.answerId)
                    ?.optionTextValues,
            },
        ]),
    );
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
}) {
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
            } satisfies SurveyQuestionConfig;
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
                    allowsText: option.allowsText,
                })),
            } satisfies SurveyQuestionConfig;
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
                textValuePlainText:
                    getStoredSurveyAnswerPlainText(storedAnswer),
            };
        case "choice":
            return {
                questionType: question.questionType,
                optionSlugIds: storedAnswer.optionSlugIds,
                ...(storedAnswer.optionTextValues === undefined
                    ? {}
                    : { optionTextValues: storedAnswer.optionTextValues }),
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
    answer:
        | SurveyAnswerDraft
        | Extract<SurveyAnswerSubmission, { questionType: "choice" }>;
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

            const characterCount = countPlainTextCharacters(
                answer.textValuePlainText,
            ).characterCount;
            const effectiveMinLength = Math.max(minPlainTextLength ?? 0, 1);
            return (
                hasVisiblePlainText(answer.textValuePlainText) &&
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

            for (const [optionSlugId, textValue] of Object.entries(
                answer.optionTextValues ?? {},
            )) {
                if (
                    !uniqueOptionSlugIds.has(optionSlugId) ||
                    !isSurveyOptionTextWithinLimit(textValue)
                ) {
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

type SurveyAnswerForStorage =
    | Extract<SurveyAnswerDraft, { questionType: "free_text" }>
    | {
          questionType: "choice";
          selectedOptions: readonly {
              id: number;
              slugId: string;
              text: NormalizedUserRichText | undefined;
          }[];
      };

function normalizeSurveyRichTextContent({
    textValueHtml,
    validationMode,
}: {
    textValueHtml: string;
    validationMode: "survey" | "survey_option";
}): NormalizedUserRichText {
    try {
        const normalizationResult = normalizeUserRichTextInput({
            html: textValueHtml,
            validationMode,
        });
        if (!normalizationResult.success) {
            throw httpErrors.badRequest(normalizationResult.reason);
        }
        return normalizationResult.content;
    } catch (error) {
        if (error instanceof Error) {
            throw httpErrors.badRequest(error.message);
        }
        throw httpErrors.badRequest("Error while sanitizing survey answer");
    }
}

function normalizeSurveyAnswerForStorage({
    question,
    answer,
    storedAnswer,
}: {
    question: ActiveSurveyQuestionRecord;
    answer: SurveyAnswerSubmission;
    storedAnswer: StoredSurveyAnswer | undefined;
}): SurveyAnswerForStorage {
    if (answer.questionType !== "free_text") {
        const submittedTextValues = answer.optionTextValues;
        const selectedOptionSlugIds = new Set(answer.optionSlugIds);
        if (submittedTextValues !== undefined) {
            for (const optionSlugId of Object.keys(submittedTextValues)) {
                if (!selectedOptionSlugIds.has(optionSlugId)) {
                    throw httpErrors.badRequest(
                        "Survey option text must belong to a selected option",
                    );
                }
            }
        }
        return {
            questionType: "choice",
            selectedOptions: question.options
                .filter((option) => selectedOptionSlugIds.has(option.slugId))
                .map((option) => {
                    const previousText = getSurveyOptionText({
                        values: storedAnswer?.optionTextValues,
                        optionSlugId: option.slugId,
                    });
                    // Omitted maps from older clients retain text; an explicit map replaces it.
                    const input =
                        submittedTextValues === undefined
                            ? previousText
                            : getSurveyOptionText({
                                  values: submittedTextValues,
                                  optionSlugId: option.slugId,
                              });
                    const content =
                        input === undefined
                            ? undefined
                            : normalizeSurveyRichTextContent({
                                  textValueHtml:
                                      surveyOptionTextInputToHtml(input),
                                  validationMode: "survey_option",
                              });
                    const text =
                        content !== undefined &&
                        hasVisiblePlainText(content.plainText)
                            ? content
                            : undefined;
                    if (text !== undefined) {
                        if (
                            !isSurveyOptionPlainTextWithinLimit(text.plainText)
                        ) {
                            throw httpErrors.badRequest(
                                "Invalid survey answer",
                            );
                        }
                        if (
                            !option.allowsText &&
                            !surveyOptionTextsEqual({
                                left: { textValueHtml: text.html },
                                right: previousText,
                            })
                        ) {
                            throw httpErrors.badRequest(
                                "Survey option does not allow text input",
                            );
                        }
                    }
                    return { id: option.id, slugId: option.slugId, text };
                }),
        };
    }

    if (
        question.constraints.type === "free_text" &&
        question.constraints.inputMode === "integer"
    ) {
        return {
            ...answer,
            textValuePlainText: answer.textValueHtml,
        };
    }

    const content = normalizeSurveyRichTextContent({
        textValueHtml: answer.textValueHtml,
        validationMode: "survey",
    });
    return {
        questionType: "free_text",
        textValueHtml: content.html,
        textValuePlainText: content.plainText,
    };
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
    return resolveSurveyRoute({
        surveyState,
        surveyGate: deriveSurveyGate({ surveyState, participantId }),
    });
}

function resolveSurveyRoute({
    surveyState,
    surveyGate,
}: {
    surveyState: SurveyParticipantState;
    surveyGate: SurveyGateDetails;
}): SurveyRouteResolution {
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

function deriveSurveyStatus({
    surveyState,
    surveyGate,
}: {
    surveyState: SurveyParticipantState;
    surveyGate: SurveyGateDetails;
}): SurveyStatusCheckResponse {
    return {
        surveyGate: toSurveyGateDto({ surveyGate }),
        routeResolution: resolveSurveyRoute({ surveyState, surveyGate }),
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
            rankingMode: rankingConversationConfigTable.rankingMode,
            prioritizationType: conversationTable.prioritizationType,
            currentContentId: conversationTable.currentContentId,
            isClosed: conversationTable.isClosed,
        })
        .from(conversationTable)
        .leftJoin(
            rankingConversationConfigTable,
            eq(
                rankingConversationConfigTable.id,
                conversationTable.rankingConfigId,
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
            ),
        )
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
                      allowsText: surveyQuestionOptionTable.allowsText,
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
            allowsText: option.allowsText,
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

    return {
        activeSurveyConfig,
        response,
        answersByQuestionId: await loadSurveyAnswers({
            db,
            surveyResponseId: response.id,
        }),
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
    conversationSlugId,
    surveyConfigId,
    conversationId,
    question,
    now,
    sourceLanguageMetadata,
}: {
    db: PostgresJsDatabase;
    conversationSlugId?: string;
    surveyConfigId: number;
    conversationId: number;
    question: SurveyQuestionConfig;
    now: Date;
    sourceLanguageMetadata: ContentLanguageMetadata;
}): Promise<SurveyQuestionContentSource> {
    const questionSlugId = question.questionSlugId ?? generateRandomSlugId();
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
            ...contentLanguageMetadataUpdateValues(sourceLanguageMetadata),
            createdAt: now,
        })
        .returning({
            id: surveyQuestionContentTable.id,
            publicId: surveyQuestionContentTable.publicId,
        });

    await db
        .update(surveyQuestionTable)
        .set({ currentContentId: insertedContent[0].id })
        .where(eq(surveyQuestionTable.id, surveyQuestionId));

    const options = getSurveyQuestionConfigOptions({ question });
    const optionSources: SurveyQuestionContentSource["options"] = [];
    for (const option of options) {
        const optionSlugId = option.optionSlugId ?? generateRandomSlugId();
        const insertedOptions = await db
            .insert(surveyQuestionOptionTable)
            .values({
                slugId: optionSlugId,
                surveyQuestionId,
                currentContentId: null,
                displayOrder: option.displayOrder,
                allowsText: option.allowsText ?? false,
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
                ...contentLanguageMetadataUpdateValues(sourceLanguageMetadata),
                createdAt: now,
            })
            .returning({
                id: surveyQuestionOptionContentTable.id,
                publicId: surveyQuestionOptionContentTable.publicId,
            });

        await db
            .update(surveyQuestionOptionTable)
            .set({ currentContentId: insertedOptionContent[0].id })
            .where(eq(surveyQuestionOptionTable.id, surveyQuestionOptionId));

        optionSources.push({
            optionSlugId,
            contentId: insertedOptionContent[0].id,
            publicId: insertedOptionContent[0].publicId,
            optionText: option.optionText,
            sourceLanguageCode: sourceLanguageMetadata.sourceLanguageCode,
            sourceRawLanguageCode: sourceLanguageMetadata.sourceRawLanguageCode,
            sourceLanguageProvider:
                sourceLanguageMetadata.sourceLanguageProvider,
            sourceLanguageConfidence:
                sourceLanguageMetadata.sourceLanguageConfidence,
        });
    }

    return {
        conversationId,
        conversationSlugId: conversationSlugId ?? "",
        questionSlugId,
        questionId: surveyQuestionId,
        contentId: insertedContent[0].id,
        publicId: insertedContent[0].publicId,
        questionText: question.questionText,
        sourceLanguageCode: sourceLanguageMetadata.sourceLanguageCode,
        sourceRawLanguageCode: sourceLanguageMetadata.sourceRawLanguageCode,
        sourceLanguageProvider: sourceLanguageMetadata.sourceLanguageProvider,
        sourceLanguageConfidence:
            sourceLanguageMetadata.sourceLanguageConfidence,
        options: optionSources,
    };
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
    sourceLanguageMetadata,
}: {
    db: PostgresJsDatabase;
    surveyConfigId: number;
    surveyConfig: SurveyConfig;
    now: Date;
    sourceLanguageMetadata: ContentLanguageMetadata;
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
                sourceLanguageMetadata,
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
                sourceLanguageMetadata,
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
        const nextOptions = getSurveyQuestionConfigOptions({ question });
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
                    ...contentLanguageMetadataUpdateValues(
                        sourceLanguageMetadata,
                    ),
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
                const insertedOption = await db
                    .insert(surveyQuestionOptionTable)
                    .values({
                        slugId: optionSlugId,
                        surveyQuestionId: existingQuestion.id,
                        currentContentId: null,
                        displayOrder: option.displayOrder,
                        allowsText: option.allowsText ?? false,
                        createdAt: now,
                        updatedAt: now,
                    })
                    .returning({ id: surveyQuestionOptionTable.id });
                const insertedOptionContent = await db
                    .insert(surveyQuestionOptionContentTable)
                    .values({
                        surveyQuestionOptionId: insertedOption[0].id,
                        optionText: option.optionText,
                        ...contentLanguageMetadataUpdateValues(
                            sourceLanguageMetadata,
                        ),
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
                        allowsText: option.allowsText ?? false,
                        createdAt: now,
                        updatedAt: now,
                    })
                    .returning({ id: surveyQuestionOptionTable.id });
                const insertedOptionContent = await db
                    .insert(surveyQuestionOptionContentTable)
                    .values({
                        surveyQuestionOptionId: insertedOption[0].id,
                        optionText: option.optionText,
                        ...contentLanguageMetadataUpdateValues(
                            sourceLanguageMetadata,
                        ),
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

            const nextAllowsText =
                option.allowsText ?? existingOption.allowsText;
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
                        ...contentLanguageMetadataUpdateValues(
                            sourceLanguageMetadata,
                        ),
                        createdAt: now,
                    })
                    .returning({ id: surveyQuestionOptionContentTable.id });
                await db
                    .update(surveyQuestionOptionTable)
                    .set({
                        currentContentId: insertedOptionContent[0].id,
                        displayOrder: option.displayOrder,
                        allowsText: nextAllowsText,
                        updatedAt: now,
                    })
                    .where(eq(surveyQuestionOptionTable.id, existingOption.id));
            } else if (
                existingOption.displayOrder !== option.displayOrder ||
                existingOption.allowsText !== nextAllowsText
            ) {
                await db
                    .update(surveyQuestionOptionTable)
                    .set({
                        displayOrder: option.displayOrder,
                        allowsText: nextAllowsText,
                        updatedAt: now,
                    })
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
    conversationSlugId,
    conversationId,
    surveyConfig,
    now,
    googleCloudCredentials,
    useGoogleLanguageDetection = false,
    sourceLanguageMetadata,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    conversationId: number;
    surveyConfig: SurveyConfig | null;
    now: Date;
    googleCloudCredentials?: GoogleCloudCredentials;
    useGoogleLanguageDetection?: boolean;
    sourceLanguageMetadata?: ContentLanguageMetadata;
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
            currentQuestionSources: [],
        };
    }

    const surveySourceLanguageMetadata =
        sourceLanguageMetadata ??
        (await resolveSurveyBlockLanguageMetadata({
            db,
            conversationId,
            surveyConfig: normalizedSurveyConfig,
            googleCloudCredentials,
            useGoogleLanguageDetection,
        }));

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

        const currentQuestionSources: SurveyQuestionContentSource[] = [];
        for (const question of normalizedSurveyConfig.questions) {
            currentQuestionSources.push(
                await insertSurveyQuestion({
                    db,
                    conversationSlugId,
                    surveyConfigId: insertedSurveyConfig[0].id,
                    conversationId,
                    question,
                    now,
                    sourceLanguageMetadata: surveySourceLanguageMetadata,
                }),
            );
        }
        return {
            previousRequiresSurvey,
            nextRequiresSurvey,
            didRequiredQuestionSemanticChange: nextRequiresSurvey,
            currentQuestionSources,
        };
    }

    const { didSemanticChange } = await replaceSurveyConfigById({
        db,
        surveyConfigId: existingSurveyConfig.id,
        surveyConfig: normalizedSurveyConfig,
        now,
        sourceLanguageMetadata: surveySourceLanguageMetadata,
    });

    return {
        previousRequiresSurvey,
        nextRequiresSurvey,
        didRequiredQuestionSemanticChange: didSemanticChange,
        currentQuestionSources: [],
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

export async function fetchSurveyConfig({
    db,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
}): Promise<SurveyConfig | undefined> {
    const { conversationId } = await getConversationAccessContextBySlugId({
        db,
        conversationSlugId,
    });
    return await getSurveyConfigForConversation({ db, conversationId });
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
    surveyConfigId: number;
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
        surveyConfigId: activeSurveyConfig.id,
        currentRevision: activeSurveyConfig.currentRevision,
        questions: activeSurveyConfig.questions.map((question) =>
            deriveSurveyQuestionFormItem({
                question,
                storedAnswer: surveyState.answersByQuestionId.get(question.id),
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
    return await getSurveyParticipationStatus({
        db,
        conversationId,
        participantId,
    });
}

export async function getSurveyParticipationStatus({
    db,
    conversationId,
    participantId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    participantId: string | undefined;
}) {
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
    accessLevel,
    displayLanguage,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    analysisView: AnalysisView | undefined;
    checkpointViewSnapshotId: number | undefined;
    accessLevel: SurveyResultsAccessLevel;
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
    if (conversation.conversationType === "prioritizing") {
        const primaryDb = getPrimaryDatabase(db);
        const context = await primaryDb.transaction(
            async (tx) =>
                await loadSurveyExportContext({
                    db: tx,
                    conversationId: conversation.conversationId,
                    conversationType: conversation.conversationType,
                    includeClusterMemberships: false,
                }),
            { isolationLevel: "repeatable read", accessMode: "read only" },
        );
        if (context.activeSurveyConfig === undefined) {
            return {
                hasSurvey: false,
                accessLevel,
                suppressionThreshold: PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD,
                suppressedRows: [],
                fullRows: undefined,
            };
        }

        const aggregateRows = buildSurveyAggregateResultRows({
            context,
            includeFullRows: accessLevel === "owner",
        });

        return {
            hasSurvey: true,
            accessLevel,
            suppressionThreshold: PUBLIC_AGGREGATE_SUPPRESSION_THRESHOLD,
            suppressedRows: aggregateRows.suppressedRows,
            fullRows:
                accessLevel === "owner" &&
                aggregateRows.hasPublicAggregateSuppressionEnabled
                    ? aggregateRows.fullRows
                    : undefined,
        };
    }

    const activeSurveyConfig = await getActiveSurveyConfigRecord({
        db,
        conversationId: conversation.conversationId,
    });
    if (
        checkpointViewSnapshotId === undefined &&
        activeSurveyConfig === undefined
    ) {
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

    const context = await loadSurveyExportContext({
        db,
        conversationId: conversation.conversationId,
        conversationType: conversation.conversationType,
    });

    return {
        hasSurvey: context.activeSurveyConfig !== undefined,
        counts:
            context.activeSurveyConfig === undefined
                ? createEmptySurveyCompletionCounts()
                : buildSurveyCompletionCounts({ context }),
    };
}

async function persistSurveyAnswer({
    db,
    conversationId,
    surveyResponseId,
    question,
    previousAnswer,
    answer,
    now,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    surveyResponseId: number;
    question: ActiveSurveyQuestionRecord;
    previousAnswer: StoredSurveyAnswer | undefined;
    answer: SurveyAnswerForStorage | null;
    now: Date;
}): Promise<StoredSurveyAnswer | undefined> {
    const selectedOptions =
        answer?.questionType === "choice" ? answer.selectedOptions : [];
    const selectedSlugIds = new Set(
        selectedOptions.map((option) => option.slugId),
    );
    if (
        previousAnswer?.optionSlugIds.some(
            (slugId) => !selectedSlugIds.has(slugId),
        )
    ) {
        const selectedIds = selectedOptions.map((option) => option.id);
        await db
            .update(surveyAnswerOptionTable)
            .set({ deletedAt: now })
            .where(
                and(
                    eq(
                        surveyAnswerOptionTable.surveyAnswerId,
                        previousAnswer.answerId,
                    ),
                    isNull(surveyAnswerOptionTable.deletedAt),
                    selectedIds.length === 0
                        ? undefined
                        : notInArray(
                              surveyAnswerOptionTable.surveyQuestionOptionId,
                              selectedIds,
                          ),
                ),
            );
    }
    if (answer === null && question.isRequired) {
        if (previousAnswer !== undefined) {
            await db
                .update(surveyAnswerTable)
                .set({ deletedAt: now, updatedAt: now })
                .where(eq(surveyAnswerTable.id, previousAnswer.answerId));
        }
        return undefined;
    }

    const textValueHtml =
        answer?.questionType === "free_text" ? answer.textValueHtml : null;
    const textValuePlainText =
        answer?.questionType === "free_text" ? answer.textValuePlainText : null;
    const currentValues = {
        answeredQuestionSemanticVersion: question.currentSemanticVersion,
        textValueHtml,
        textValuePlainText,
        updatedAt: now,
    };
    const savedAnswerRows = await db
        .insert(surveyAnswerTable)
        .values({
            ...currentValues,
            surveyResponseId,
            conversationId,
            surveyQuestionId: question.id,
            createdAt: now,
        })
        .onConflictDoUpdate({
            target: [
                surveyAnswerTable.surveyResponseId,
                surveyAnswerTable.surveyQuestionId,
            ],
            targetWhere: isNull(surveyAnswerTable.deletedAt),
            set: currentValues,
        })
        .returning({ id: surveyAnswerTable.id });
    const savedAnswer = savedAnswerRows.at(0);
    if (savedAnswer === undefined)
        throw httpErrors.internalServerError(
            "Survey answer could not be saved",
        );

    const previousSelectedSlugIds = new Set(
        previousAnswer?.optionSlugIds ?? [],
    );
    const addedOptions = selectedOptions.filter(
        (option) => !previousSelectedSlugIds.has(option.slugId),
    );
    if (addedOptions.length > 0) {
        await db.insert(surveyAnswerOptionTable).values(
            addedOptions.map((option) => ({
                surveyAnswerId: savedAnswer.id,
                surveyQuestionId: question.id,
                surveyQuestionOptionId: option.id,
                textValueHtml: option.text?.html ?? null,
                textValuePlainText: option.text?.plainText ?? null,
            })),
        );
    }
    for (const option of selectedOptions) {
        if (
            previousSelectedSlugIds.has(option.slugId) &&
            option.text?.html !==
                getSurveyOptionText({
                    values: previousAnswer?.optionTextValues,
                    optionSlugId: option.slugId,
                })?.textValueHtml
        ) {
            await db
                .update(surveyAnswerOptionTable)
                .set({
                    textValueHtml: option.text?.html ?? null,
                    textValuePlainText: option.text?.plainText ?? null,
                })
                .where(
                    and(
                        eq(
                            surveyAnswerOptionTable.surveyAnswerId,
                            savedAnswer.id,
                        ),
                        eq(
                            surveyAnswerOptionTable.surveyQuestionOptionId,
                            option.id,
                        ),
                        isNull(surveyAnswerOptionTable.deletedAt),
                    ),
                );
        }
    }
    const optionTextEntries: (readonly [string, SurveyOptionText])[] = [];
    for (const option of selectedOptions) {
        if (option.text !== undefined)
            optionTextEntries.push([
                option.slugId,
                { textValueHtml: option.text.html },
            ]);
    }
    return {
        answerId: savedAnswer.id,
        answeredQuestionSemanticVersion: question.currentSemanticVersion,
        textValueHtml,
        textValuePlainText,
        optionSlugIds: selectedOptions.map((option) => option.slugId),
        optionTextValues:
            optionTextEntries.length === 0
                ? undefined
                : Object.fromEntries<SurveyOptionText>(optionTextEntries),
    };
}

function deriveSurveyAnswerRecovery({
    surveyState,
    status,
}: {
    surveyState: SurveyParticipantState;
    status: SurveyStatusCheckResponse;
}): SurveyAnswerRecovery {
    const { surveyGate, routeResolution } = status;
    const config = surveyState.activeSurveyConfig;
    if (config === undefined) {
        return {
            kind: "no_survey",
            surveyGate,
            routeResolution: { kind: "none" },
        };
    }
    return {
        kind: "survey",
        form: {
            success: true,
            surveyConfigId: config.id,
            currentRevision: config.currentRevision,
            surveyGate,
            questions: config.questions.map((question) =>
                deriveSurveyQuestionFormItem({
                    question,
                    storedAnswer: surveyState.answersByQuestionId.get(
                        question.id,
                    ),
                    surveyIsOptional: config.isOptional,
                }),
            ),
        },
        routeResolution,
    };
}

type GetSurveyEmailUpdateAction = (params: {
    database: PostgresJsDatabase;
    userId: string;
    conversationSlugId: string;
}) => Promise<ConversationEmailUpdateOnboardingAction | undefined>;

async function getSurveyWriteParticipationStatus({
    db,
    status,
    participantId,
    conversationSlugId,
    skipEmailUpdateConsent,
    getEmailUpdateOnboardingAction,
}: {
    db: PostgresJsDatabase;
    status: SurveyStatusCheckResponse;
    participantId: string;
    conversationSlugId: string;
    skipEmailUpdateConsent: boolean;
    getEmailUpdateOnboardingAction: GetSurveyEmailUpdateAction;
}): Promise<ConversationParticipationStatus> {
    const gate = status.surveyGate;
    const reason = getParticipationBlockedReasonFromSurveyGateStatus({
        surveyGateStatus: gate.status,
        isOptional: gate.isOptional,
    });
    if (reason !== undefined) {
        return {
            status: "onboarding_required",
            nextStep: {
                kind: "survey",
                routeResolution: status.routeResolution,
            },
        };
    }
    const action = skipEmailUpdateConsent
        ? undefined
        : await getEmailUpdateOnboardingAction({
              database: db,
              userId: participantId,
              conversationSlugId,
          });
    return action === undefined
        ? { status: "ready" }
        : {
              status: "onboarding_required",
              nextStep: { kind: "email_updates", action },
          };
}

export async function saveSurveyAnswer({
    db,
    conversationSlugId,
    questionSlugId,
    expectedQuestionSemanticVersion,
    knownSurveyRevision,
    answer,
    didWrite,
    userAgent,
    now,
    currentDisplayLanguage,
    valkey,
    skipEmailUpdateConsent,
    getEmailUpdateOnboardingAction,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    questionSlugId: string;
    expectedQuestionSemanticVersion: number;
    knownSurveyRevision: number;
    answer: SurveyAnswerSubmission | null;
    didWrite: string;
    userAgent: string;
    now: Date;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
    valkey?: Valkey;
    skipEmailUpdateConsent: boolean;
    getEmailUpdateOnboardingAction: GetSurveyEmailUpdateAction;
}): Promise<SurveyAnswerSaveResponse> {
    const participationCheck = await checkConversationParticipation({
        db,
        conversationSlugId,
        didWrite,
        userAgent,
        now,
        currentDisplayLanguage,
        requireCompletedSurvey: false,
    });
    if (!participationCheck.success) {
        return participationCheck;
    }

    const participantId = participationCheck.participantId;
    const conversation = buildSurveyAnalysisRefreshContext({
        conversationId: participationCheck.conversationId,
        slugId: conversationSlugId,
        conversationType: participationCheck.conversationType,
        rankingMode: participationCheck.rankingMode,
        prioritizationType: participationCheck.prioritizationType,
    });

    const surveyTransition = await db.transaction(async (tx) => {
        await lockSurveyParticipantWrite({
            db: tx,
            conversationId: conversation.conversationId,
            participantId,
        });
        const loadedSurveyState = await loadSurveyParticipantState({
            db: tx,
            conversationId: conversation.conversationId,
            participantId,
        });
        const previousSurveyGate = deriveSurveyGate({
            surveyState: loadedSurveyState,
            participantId,
        });
        const previousStatus = deriveSurveyStatus({
            surveyState: loadedSurveyState,
            surveyGate: previousSurveyGate,
        });
        const activeSurveyConfig = loadedSurveyState.activeSurveyConfig;
        const storedQuestion = activeSurveyConfig?.questions.find(
            (question) => question.slugId === questionSlugId,
        );
        async function recoverChangedSurvey() {
            const recovery = deriveSurveyAnswerRecovery({
                surveyState: loadedSurveyState,
                status:
                    storedQuestion === undefined
                        ? previousStatus
                        : {
                              ...previousStatus,
                              routeResolution: {
                                  kind: "question",
                                  questionSlugId: storedQuestion.slugId,
                              },
                          },
            });
            // Optional saved responses stay valid, but an unsaved draft must not
            // be silently reinterpreted as an answer to different wording.
            return {
                response: {
                    success: false,
                    reason: "survey_changed",
                    participationStatus:
                        await getSurveyWriteParticipationStatus({
                            db: tx,
                            status: previousStatus,
                            participantId,
                            conversationSlugId,
                            skipEmailUpdateConsent,
                            getEmailUpdateOnboardingAction,
                        }),
                    recovery,
                } satisfies SurveyAnswerSaveResponse,
                analysisRefreshScheduled: false,
            };
        }

        if (
            activeSurveyConfig === undefined ||
            storedQuestion?.currentSemanticVersion !==
                expectedQuestionSemanticVersion
        ) {
            return await recoverChangedSurvey();
        }

        const question = getParticipantSurveyQuestion({
            question: storedQuestion,
            surveyIsOptional: activeSurveyConfig.isOptional,
        });
        let normalizedAnswer: SurveyAnswerForStorage | null;
        try {
            if (
                answer?.questionType === "choice" &&
                !validateSurveyAnswer({ question, answer })
            ) {
                throw httpErrors.badRequest("Invalid survey answer payload");
            }
            normalizedAnswer =
                answer === null
                    ? null
                    : normalizeSurveyAnswerForStorage({
                          question,
                          answer,
                          storedAnswer:
                              loadedSurveyState.answersByQuestionId.get(
                                  question.id,
                              ),
                      });
            if (
                normalizedAnswer?.questionType === "free_text" &&
                !validateSurveyAnswer({ question, answer: normalizedAnswer })
            ) {
                throw httpErrors.badRequest("Invalid survey answer payload");
            }
        } catch (error) {
            // A non-semantic config change can still disable an annotation field.
            // Return its new constraints instead of trapping an old client on 400s.
            if (
                knownSurveyRevision !== activeSurveyConfig.currentRevision &&
                error instanceof httpErrors.HttpError &&
                error.statusCode === 400
            ) {
                return await recoverChangedSurvey();
            }
            throw error;
        }

        const responseRows = await tx
            .insert(surveyResponseTable)
            .values({
                participantId,
                conversationId: conversation.conversationId,
                createdAt: now,
                updatedAt: now,
            })
            .onConflictDoUpdate({
                target: [
                    surveyResponseTable.conversationId,
                    surveyResponseTable.participantId,
                ],
                set: { updatedAt: now },
            })
            .returning({
                id: surveyResponseTable.id,
                createdAt: surveyResponseTable.createdAt,
                updatedAt: surveyResponseTable.updatedAt,
                completedAt: surveyResponseTable.completedAt,
                withdrawnAt: surveyResponseTable.withdrawnAt,
            });
        const response = responseRows.at(0);
        if (response === undefined)
            throw httpErrors.internalServerError(
                "Survey response could not be saved",
            );
        const shouldResetWithdrawnResponse = response.withdrawnAt !== null;

        const finalizeSurveyAnswerSave = async (
            answersByQuestionId: Map<number, StoredSurveyAnswer>,
        ) => {
            const nextSurveyState: SurveyParticipantState = {
                activeSurveyConfig,
                response: {
                    ...response,
                    withdrawnAt: null,
                    completedAt: shouldResetWithdrawnResponse
                        ? null
                        : response.completedAt,
                },
                answersByQuestionId,
            };
            const nextSurveyGate = deriveSurveyGate({
                surveyState: nextSurveyState,
                participantId,
            });
            const status = deriveSurveyStatus({
                surveyState: nextSurveyState,
                surveyGate: nextSurveyGate,
            });
            const justCompleted =
                previousSurveyGate.status !== "complete_valid" &&
                nextSurveyGate.status === "complete_valid";

            const participationStatus = await getSurveyWriteParticipationStatus(
                {
                    db: tx,
                    status,
                    participantId,
                    conversationSlugId,
                    skipEmailUpdateConsent,
                    getEmailUpdateOnboardingAction,
                },
            );

            if (justCompleted) {
                await tx
                    .update(surveyResponseTable)
                    .set({ completedAt: now, updatedAt: now })
                    .where(eq(surveyResponseTable.id, response.id));
            }

            await queueConversationSurveyUpdatedEvent({
                db: tx,
                conversationSlugId,
                configChanged: false,
            });

            const analysisRefreshScheduled =
                shouldRecomputeAnalysisForSurveyTransition({
                    previousSurveyGateStatus: previousSurveyGate.status,
                    nextSurveyGateStatus: nextSurveyGate.status,
                    isOptional: activeSurveyConfig.isOptional,
                })
                    ? await scheduleConversationAnalysisForParticipantSurveyTransition(
                          {
                              db: tx,
                              conversation,
                              participantId,
                          },
                      )
                    : false;

            return {
                response: {
                    success: true,
                    surveyGate: status.surveyGate,
                    participationStatus,
                    justCompleted,
                    surveyConfigId: activeSurveyConfig.id,
                    currentRevision: activeSurveyConfig.currentRevision,
                    savedQuestion: deriveSurveyQuestionFormItem({
                        question: storedQuestion,
                        storedAnswer: answersByQuestionId.get(
                            storedQuestion.id,
                        ),
                        surveyIsOptional: activeSurveyConfig.isOptional,
                    }),
                    routeResolution: status.routeResolution,
                    recovery:
                        knownSurveyRevision ===
                            activeSurveyConfig.currentRevision &&
                        loadedSurveyState.response !== undefined
                            ? undefined
                            : deriveSurveyAnswerRecovery({
                                  surveyState: nextSurveyState,
                                  status,
                              }),
                } satisfies SurveyAnswerSaveResponse,
                analysisRefreshScheduled,
            };
        };

        if (shouldResetWithdrawnResponse) {
            await softDeleteSurveyResponseAnswers({
                db: tx,
                surveyResponseId: response.id,
                now,
            });
            await tx
                .update(surveyResponseTable)
                .set({ withdrawnAt: null, completedAt: null })
                .where(eq(surveyResponseTable.id, response.id));
        }
        const savedAnswer = await persistSurveyAnswer({
            db: tx,
            conversationId: conversation.conversationId,
            surveyResponseId: response.id,
            question,
            previousAnswer: loadedSurveyState.answersByQuestionId.get(
                question.id,
            ),
            answer: normalizedAnswer,
            now,
        });
        const nextAnswersByQuestionId = new Map(
            loadedSurveyState.answersByQuestionId,
        );
        if (savedAnswer === undefined)
            nextAnswersByQuestionId.delete(question.id);
        else nextAnswersByQuestionId.set(question.id, savedAnswer);
        return await finalizeSurveyAnswerSave(nextAnswersByQuestionId);
    });

    const { analysisRefreshScheduled } = surveyTransition;

    if (analysisRefreshScheduled) {
        await wakeScheduledConversationAnalysisForSurveyChange({
            conversation,
            valkey,
        });
    }

    return surveyTransition.response;
}

export async function withdrawSurveyResponse({
    db,
    conversationSlugId,
    didWrite,
    userAgent,
    now,
    currentDisplayLanguage,
    valkey,
    skipEmailUpdateConsent,
    getEmailUpdateOnboardingAction,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    didWrite: string;
    userAgent: string;
    now: Date;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
    valkey?: Valkey;
    skipEmailUpdateConsent: boolean;
    getEmailUpdateOnboardingAction: GetSurveyEmailUpdateAction;
}): Promise<SurveyResponseWithdrawResponse> {
    const participationCheck = await checkConversationParticipation({
        db,
        conversationSlugId,
        didWrite,
        userAgent,
        now,
        currentDisplayLanguage,
        requireCompletedSurvey: false,
    });
    if (!participationCheck.success) {
        return participationCheck;
    }

    const participantId = participationCheck.participantId;
    const conversation = buildSurveyAnalysisRefreshContext({
        conversationId: participationCheck.conversationId,
        slugId: conversationSlugId,
        conversationType: participationCheck.conversationType,
        rankingMode: participationCheck.rankingMode,
        prioritizationType: participationCheck.prioritizationType,
    });

    const surveyTransition = await db.transaction(async (tx) => {
        await lockSurveyParticipantWrite({
            db: tx,
            conversationId: conversation.conversationId,
            participantId,
        });
        // The absence check must use the writer too: replica lag must not turn
        // withdrawal of an existing response into a successful no-op.
        const previousSurveyState = await loadSurveyParticipantState({
            db: tx,
            conversationId: conversation.conversationId,
            participantId,
        });
        const previousSurveyGate = deriveSurveyGate({
            surveyState: previousSurveyState,
            participantId,
        });
        const previousStatus = deriveSurveyStatus({
            surveyState: previousSurveyState,
            surveyGate: previousSurveyGate,
        });
        const activeSurveyConfig = previousSurveyState.activeSurveyConfig;
        if (activeSurveyConfig === undefined) {
            // The active-form loader deliberately skips retired surveys. A
            // withdrawal still has to remove their retained participant data.
            const withdrawnRows = await tx
                .update(surveyResponseTable)
                .set({ withdrawnAt: now, completedAt: null, updatedAt: now })
                .where(
                    and(
                        eq(
                            surveyResponseTable.conversationId,
                            conversation.conversationId,
                        ),
                        eq(surveyResponseTable.participantId, participantId),
                    ),
                )
                .returning({ id: surveyResponseTable.id });
            const withdrawn = withdrawnRows.at(0);
            if (withdrawn !== undefined) {
                await softDeleteSurveyResponseAnswers({
                    db: tx,
                    surveyResponseId: withdrawn.id,
                    now,
                });
                await queueConversationSurveyUpdatedEvent({
                    db: tx,
                    conversationSlugId,
                    configChanged: false,
                });
            }
        }
        if (
            activeSurveyConfig === undefined ||
            previousSurveyState.response === undefined
        ) {
            return {
                recovery: deriveSurveyAnswerRecovery({
                    surveyState: previousSurveyState,
                    status: previousStatus,
                }),
                analysisRefreshScheduled: false,
                participationStatus: await getSurveyWriteParticipationStatus({
                    db: tx,
                    status: previousStatus,
                    participantId,
                    conversationSlugId,
                    skipEmailUpdateConsent,
                    getEmailUpdateOnboardingAction,
                }),
            };
        }
        const surveyResponseId = previousSurveyState.response.id;

        await softDeleteSurveyResponseAnswers({
            db: tx,
            surveyResponseId,
            now,
        });

        await tx
            .update(surveyResponseTable)
            .set({ withdrawnAt: now, completedAt: null, updatedAt: now })
            .where(eq(surveyResponseTable.id, surveyResponseId));

        const nextSurveyState: SurveyParticipantState = {
            activeSurveyConfig,
            response: {
                ...previousSurveyState.response,
                withdrawnAt: now,
                completedAt: null,
                updatedAt: now,
            },
            answersByQuestionId: new Map(),
        };
        const nextSurveyGate = deriveSurveyGate({
            surveyState: nextSurveyState,
            participantId,
        });
        const status = deriveSurveyStatus({
            surveyState: nextSurveyState,
            surveyGate: nextSurveyGate,
        });
        await queueConversationSurveyUpdatedEvent({
            db: tx,
            conversationSlugId,
            configChanged: false,
        });
        const analysisRefreshScheduled =
            shouldRecomputeAnalysisForSurveyTransition({
                previousSurveyGateStatus: previousSurveyGate.status,
                nextSurveyGateStatus: nextSurveyGate.status,
                isOptional: activeSurveyConfig.isOptional,
            })
                ? await scheduleConversationAnalysisForParticipantSurveyTransition(
                      {
                          db: tx,
                          conversation,
                          participantId,
                      },
                  )
                : false;
        return {
            recovery: deriveSurveyAnswerRecovery({
                surveyState: nextSurveyState,
                status,
            }),
            analysisRefreshScheduled,
            participationStatus: await getSurveyWriteParticipationStatus({
                db: tx,
                status,
                participantId,
                conversationSlugId,
                skipEmailUpdateConsent,
                getEmailUpdateOnboardingAction,
            }),
        };
    });

    const { analysisRefreshScheduled, ...surveyStatus } = surveyTransition;

    if (analysisRefreshScheduled) {
        await wakeScheduledConversationAnalysisForSurveyChange({
            conversation,
            valkey,
        });
    }

    return {
        success: true,
        ...surveyStatus,
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
    const multilingualSetting = await getConversationMultilingualSetting({
        db,
        conversationId: conversation.conversationId,
    });
    const analysisRefreshContext = buildSurveyAnalysisRefreshContext({
        conversationId: conversation.conversationId,
        slugId: conversation.slugId,
        conversationType: conversation.conversationType,
        rankingMode: conversation.rankingMode,
        prioritizationType: conversation.prioritizationType,
    });

    const surveyConfigUpdate = await db.transaction(async (tx) => {
        await lockConversationForSurveyEdit({
            db: tx,
            conversationId: conversation.conversationId,
        });
        const surveyConfigUpdateEffect = await setSurveyConfigForConversation({
            db: tx,
            conversationSlugId,
            conversationId: conversation.conversationId,
            surveyConfig,
            now,
            googleCloudCredentials,
            useGoogleLanguageDetection:
                multilingualSetting.dynamicTranslationEnabled,
        });

        const activeSurveyConfig = await getActiveSurveyConfigRecord({
            db: tx,
            conversationId: conversation.conversationId,
        });
        if (activeSurveyConfig === undefined) {
            throw httpErrors.internalServerError(
                "Survey config was not persisted",
            );
        }

        await queueConversationSurveyUpdatedEvent({
            db: tx,
            conversationSlugId,
            configChanged: true,
        });
        const analysisRefreshScheduled =
            shouldRecomputeAnalysisForSurveyConfigChange(
                surveyConfigUpdateEffect,
            ) &&
            (await scheduleConversationAnalysisForSurveyChange({
                db: tx,
                conversation: analysisRefreshContext,
            }));

        return {
            analysisRefreshScheduled,
            currentRevision: activeSurveyConfig.currentRevision,
            surveyGate: await getSurveyGateSummary({
                db: tx,
                conversationId: conversation.conversationId,
                participantId: userId,
            }),
        };
    });

    if (surveyConfigUpdate.analysisRefreshScheduled) {
        await wakeScheduledConversationAnalysisForSurveyChange({
            conversation: analysisRefreshContext,
            valkey,
        });
    }

    return {
        currentRevision: surveyConfigUpdate.currentRevision,
        surveyGate: surveyConfigUpdate.surveyGate,
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
}): Promise<{
    surveyGate: SurveyGateSummary;
}> {
    const conversation = await getConversationAccessContextBySlugId({
        db,
        conversationSlugId,
    });
    const analysisRefreshContext = buildSurveyAnalysisRefreshContext({
        conversationId: conversation.conversationId,
        slugId: conversation.slugId,
        conversationType: conversation.conversationType,
        rankingMode: conversation.rankingMode,
        prioritizationType: conversation.prioritizationType,
    });
    const surveyConfigDeleteResult = await db.transaction(async (tx) => {
        await lockConversationForSurveyEdit({
            db: tx,
            conversationId: conversation.conversationId,
        });
        const surveyConfigUpdateEffect = await setSurveyConfigForConversation({
            db: tx,
            conversationSlugId,
            conversationId: conversation.conversationId,
            surveyConfig: null,
            now,
        });
        await queueConversationSurveyUpdatedEvent({
            db: tx,
            conversationSlugId,
            configChanged: true,
        });
        const analysisRefreshScheduled =
            shouldRecomputeAnalysisForSurveyConfigChange(
                surveyConfigUpdateEffect,
            ) &&
            (await scheduleConversationAnalysisForSurveyChange({
                db: tx,
                conversation: analysisRefreshContext,
            }));

        return {
            analysisRefreshScheduled,
            surveyGate: await getSurveyGateSummary({
                db: tx,
                conversationId: conversation.conversationId,
                participantId: userId,
            }),
        };
    });

    if (surveyConfigDeleteResult.analysisRefreshScheduled) {
        await wakeScheduledConversationAnalysisForSurveyChange({
            conversation: analysisRefreshContext,
            valkey,
        });
    }

    return {
        surveyGate: surveyConfigDeleteResult.surveyGate,
    };
}

export function surveyAnswerToPlainText({
    answer,
}: {
    answer: SurveyAnswerDraft;
}): string | undefined {
    if (answer.questionType !== "free_text") {
        return undefined;
    }

    return answer.textValuePlainText;
}
