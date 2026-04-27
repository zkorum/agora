import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";
import {
    surveyAnswerOptionTable,
    surveyAnswerTable,
    surveyConfigTable,
    surveyQuestionContentTable,
    surveyQuestionOptionContentTable,
    surveyQuestionOptionTable,
    surveyQuestionTable,
    surveyResponseTable,
} from "./schema.js";

export type SurveyQuestionType = "choice" | "free_text";

export type SurveyGateStatus =
    | "no_survey"
    | "not_started"
    | "in_progress"
    | "needs_update"
    | "complete_valid"
    | "withdrawn";

const surveyQuestionConstraintsSchema = z.union([
    z
        .object({
            type: z.literal("choice"),
            minSelections: z.number().int().nonnegative().min(1),
            maxSelections: z.number().int().nonnegative().min(1).optional(),
        })
        .strict(),
    z
        .object({
            type: z.literal("free_text"),
            inputMode: z.literal("rich_text").optional().default("rich_text"),
            minPlainTextLength: z.number().int().nonnegative().optional(),
            maxPlainTextLength: z.number().int().positive(),
            maxHtmlLength: z.number().int().positive(),
        })
        .strict(),
    z
        .object({
            type: z.literal("free_text"),
            inputMode: z.literal("integer"),
            minValue: z.number().int().min(1),
            maxValue: z.number().int().min(1).optional(),
        })
        .strict(),
]);

export type SurveyQuestionConstraints = z.infer<
    typeof surveyQuestionConstraintsSchema
>;

export interface SurveyQuestionAnalysisRecord {
    questionId: number;
    questionType: SurveyQuestionType;
    currentSemanticVersion: number;
    isRequired: boolean;
    constraints: SurveyQuestionConstraints;
    optionSlugIds: string[];
}

export interface SurveyStoredAnswerAnalysisRecord {
    answeredQuestionSemanticVersion: number;
    textValueHtml: string | null;
    optionSlugIds: string[];
}

export function isSurveyAnswerPassedForAnalysis({
    question,
    answer,
}: {
    question: SurveyQuestionAnalysisRecord;
    answer: SurveyStoredAnswerAnalysisRecord;
}): boolean {
    if (question.isRequired) {
        return false;
    }

    return (
        answer.optionSlugIds.length === 0 &&
        htmlToCountedText(answer.textValueHtml ?? "").length === 0
    );
}

export function isSurveyQuestionCompletedForAnalysis({
    question,
    answer,
}: {
    question: SurveyQuestionAnalysisRecord;
    answer: SurveyStoredAnswerAnalysisRecord | undefined;
}): boolean {
    if (answer === undefined) {
        return false;
    }

    return (
        isSurveyAnswerPassedForAnalysis({ question, answer }) ||
        (question.isRequired
            ? validateSurveyAnswerForAnalysis({ question, answer })
            : validateSurveyAnswerContentForAnalysis({ question, answer }))
    );
}

function htmlToCountedText(htmlString: string): string {
    let plainText = htmlString
        .replace(/&nbsp;/g, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/h[1-6]>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<li>/gi, "- ")
        .replace(/<[^>]*>/g, "")
        .replace(/\n{2,}/g, "\n")
        .trim();
    plainText = plainText.replace(/<[^>]*$/, "");
    return plainText.replace(/\n$/, "");
}

export function validateSurveyAnswerForAnalysis({
    question,
    answer,
}: {
    question: SurveyQuestionAnalysisRecord;
    answer: SurveyStoredAnswerAnalysisRecord;
}): boolean {
    if (answer.answeredQuestionSemanticVersion !== question.currentSemanticVersion) {
        return false;
    }

    return validateSurveyAnswerContentForAnalysis({ question, answer });
}

function validateSurveyAnswerContentForAnalysis({
    question,
    answer,
}: {
    question: SurveyQuestionAnalysisRecord;
    answer: SurveyStoredAnswerAnalysisRecord;
}): boolean {
    switch (question.questionType) {
        case "free_text": {
            if (question.constraints.type !== "free_text") {
                return false;
            }

            const textValueHtml = answer.textValueHtml ?? "";
            if (question.constraints.inputMode === "integer") {
                if (!/^\d+$/.test(textValueHtml)) {
                    return false;
                }

                const parsedValue = Number(textValueHtml);
                if (!Number.isSafeInteger(parsedValue)) {
                    return false;
                }

                return (
                    parsedValue >= question.constraints.minValue &&
                    (question.constraints.maxValue === undefined ||
                        parsedValue <= question.constraints.maxValue)
                );
            }

            if (textValueHtml.length > question.constraints.maxHtmlLength) {
                return false;
            }

            const plainTextLength = htmlToCountedText(textValueHtml).length;
            const minPlainTextLength = Math.max(
                question.constraints.minPlainTextLength ?? 0,
                1,
            );
            return (
                plainTextLength >= minPlainTextLength &&
                plainTextLength <= question.constraints.maxPlainTextLength
            );
        }
        case "choice": {
            if (question.constraints.type !== "choice") {
                return false;
            }
            const uniqueOptionSlugIds = new Set(answer.optionSlugIds);
            if (uniqueOptionSlugIds.size !== answer.optionSlugIds.length) {
                return false;
            }
            if (
                answer.optionSlugIds.length < question.constraints.minSelections
            ) {
                return false;
            }
            if (
                question.constraints.maxSelections !== undefined &&
                answer.optionSlugIds.length > question.constraints.maxSelections
            ) {
                return false;
            }
            return answer.optionSlugIds.every((optionSlugId) =>
                question.optionSlugIds.includes(optionSlugId),
            );
        }
    }
}

export function deriveSurveyGateStatusForAnalysis({
    hasSurvey,
    isOptional = false,
    questions,
    answersByQuestionId,
    withdrawnAt,
}: {
    hasSurvey: boolean;
    isOptional?: boolean;
    questions: SurveyQuestionAnalysisRecord[];
    answersByQuestionId: Map<number, SurveyStoredAnswerAnalysisRecord>;
    withdrawnAt: Date | null;
}): SurveyGateStatus {
    if (!hasSurvey) {
        return "no_survey";
    }

    if (withdrawnAt !== null) {
        return "withdrawn";
    }

    const effectiveQuestions = isOptional
        ? questions.map((question) => ({ ...question, isRequired: false }))
        : questions;
    const requiredQuestions = effectiveQuestions.filter(
        (question) => question.isRequired,
    );
    if (requiredQuestions.length === 0) {
        const completedQuestionCount = effectiveQuestions.filter((question) => {
            return isSurveyQuestionCompletedForAnalysis({
                question,
                answer: answersByQuestionId.get(question.questionId),
            });
        }).length;

        if (
            completedQuestionCount === effectiveQuestions.length &&
            effectiveQuestions.length > 0
        ) {
            return "complete_valid";
        }

        if (answersByQuestionId.size > 0) {
            return "in_progress";
        }

        return "not_started";
    }

    let validRequiredAnswerCount = 0;
    let staleRequiredQuestionCount = 0;
    for (const question of requiredQuestions) {
        const storedAnswer = answersByQuestionId.get(question.questionId);
        if (storedAnswer === undefined) {
            continue;
        }

        if (validateSurveyAnswerForAnalysis({ question, answer: storedAnswer })) {
            validRequiredAnswerCount += 1;
        } else {
            staleRequiredQuestionCount += 1;
        }
    }

    if (staleRequiredQuestionCount > 0) {
        return "needs_update";
    }
    if (validRequiredAnswerCount === requiredQuestions.length) {
        return "complete_valid";
    }
    if (answersByQuestionId.size > 0) {
        return "in_progress";
    }
    return "not_started";
}

export function isSurveyGateStatusEligibleForAnalysis({
    surveyGateStatus,
    isOptional = false,
}: {
    surveyGateStatus: SurveyGateStatus;
    isOptional?: boolean;
}): boolean {
    if (isOptional) {
        return true;
    }

    return (
        surveyGateStatus === "no_survey" ||
        surveyGateStatus === "complete_valid"
    );
}

export function shouldRecomputeAnalysisForSurveyTransition({
    previousSurveyGateStatus,
    nextSurveyGateStatus,
    isOptional = false,
}: {
    previousSurveyGateStatus: SurveyGateStatus;
    nextSurveyGateStatus: SurveyGateStatus;
    isOptional?: boolean;
}): boolean {
    return (
        isSurveyGateStatusEligibleForAnalysis({
            surveyGateStatus: previousSurveyGateStatus,
            isOptional,
        }) !==
        isSurveyGateStatusEligibleForAnalysis({
            surveyGateStatus: nextSurveyGateStatus,
            isOptional,
        })
    );
}

export function shouldRecomputeAnalysisForSurveyConfigChange({
    previousRequiresSurvey,
    nextRequiresSurvey,
    didRequiredQuestionSemanticChange,
}: {
    previousRequiresSurvey: boolean;
    nextRequiresSurvey: boolean;
    didRequiredQuestionSemanticChange: boolean;
}): boolean {
    if (previousRequiresSurvey !== nextRequiresSurvey) {
        return true;
    }
    if (!previousRequiresSurvey && !nextRequiresSurvey) {
        return false;
    }
    return didRequiredQuestionSemanticChange;
}

export function doesSurveyRequireCompletion({
    isOptional = false,
    requiredQuestionCount,
}: {
    isOptional?: boolean;
    requiredQuestionCount: number;
}): boolean {
    if (isOptional) {
        return false;
    }

    return requiredQuestionCount > 0;
}

export async function getEligibleParticipantIdsForAnalysis({
    db,
    conversationId,
    candidateParticipantIds,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    candidateParticipantIds: string[];
}): Promise<Set<string> | undefined> {
    const surveyConfigRows = await db
        .select({
            id: surveyConfigTable.id,
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

    if (surveyConfigRows.length === 0) {
        return undefined;
    }
    const activeSurveyConfig = surveyConfigRows[0];
    if (candidateParticipantIds.length === 0) {
        return new Set();
    }
    if (activeSurveyConfig.isOptional) {
        return new Set(candidateParticipantIds);
    }

    const questionRows = await db
        .select({
            questionId: surveyQuestionTable.id,
            questionType: surveyQuestionTable.questionType,
            currentSemanticVersion: surveyQuestionTable.currentSemanticVersion,
            isRequired: surveyQuestionTable.isRequired,
            constraints: surveyQuestionContentTable.constraints,
        })
        .from(surveyQuestionTable)
        .innerJoin(
            surveyQuestionContentTable,
            eq(surveyQuestionTable.currentContentId, surveyQuestionContentTable.id),
        )
        .where(
            and(
                eq(surveyQuestionTable.surveyConfigId, activeSurveyConfig.id),
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
                      optionSlugId: surveyQuestionOptionTable.slugId,
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
                  );

    const optionSlugIdsByQuestionId = new Map<number, string[]>();
    for (const option of optionRows) {
        const optionSlugIds =
            optionSlugIdsByQuestionId.get(option.questionId) ?? [];
        optionSlugIds.push(option.optionSlugId);
        optionSlugIdsByQuestionId.set(option.questionId, optionSlugIds);
    }

    const questions = questionRows.map((question) => ({
        questionId: question.questionId,
        questionType: question.questionType,
        currentSemanticVersion: question.currentSemanticVersion,
        isRequired: question.isRequired,
        constraints: surveyQuestionConstraintsSchema.parse(question.constraints),
        optionSlugIds: optionSlugIdsByQuestionId.get(question.questionId) ?? [],
    }));
    if (!doesSurveyRequireCompletion({
        isOptional: activeSurveyConfig.isOptional,
        requiredQuestionCount: questions.filter((question) => question.isRequired)
            .length,
    })) {
        return new Set(candidateParticipantIds);
    }

    const responseRows = await db
        .select({
            responseId: surveyResponseTable.id,
            participantId: surveyResponseTable.participantId,
            withdrawnAt: surveyResponseTable.withdrawnAt,
        })
        .from(surveyResponseTable)
        .where(
            and(
                eq(surveyResponseTable.conversationId, conversationId),
                inArray(surveyResponseTable.participantId, candidateParticipantIds),
            ),
        );

    if (responseRows.length === 0) {
        return new Set();
    }

    const responseIds = responseRows.map((response) => response.responseId);
    const answerRows = await db
        .select({
            responseId: surveyAnswerTable.surveyResponseId,
            answerId: surveyAnswerTable.id,
            questionId: surveyAnswerTable.surveyQuestionId,
            answeredQuestionSemanticVersion:
                surveyAnswerTable.answeredQuestionSemanticVersion,
            textValueHtml: surveyAnswerTable.textValueHtml,
        })
        .from(surveyAnswerTable)
        .where(
            and(
                inArray(surveyAnswerTable.surveyResponseId, responseIds),
                isNull(surveyAnswerTable.deletedAt),
            ),
        );

    const answerIds = answerRows.map((answer) => answer.answerId);
    const answerOptionRows =
        answerIds.length === 0
            ? []
            : await db
                  .select({
                      answerId: surveyAnswerOptionTable.surveyAnswerId,
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
                          inArray(surveyAnswerOptionTable.surveyAnswerId, answerIds),
                          isNull(surveyAnswerOptionTable.deletedAt),
                      ),
                  );

    const optionSlugIdsByAnswerId = new Map<number, string[]>();
    for (const answerOption of answerOptionRows) {
        const optionSlugIds =
            optionSlugIdsByAnswerId.get(answerOption.answerId) ?? [];
        optionSlugIds.push(answerOption.optionSlugId);
        optionSlugIdsByAnswerId.set(answerOption.answerId, optionSlugIds);
    }

    const answersByResponseId = new Map<
        number,
        Map<number, SurveyStoredAnswerAnalysisRecord>
    >();
    for (const answer of answerRows) {
        const answersByQuestionId =
            answersByResponseId.get(answer.responseId) ??
            new Map<number, SurveyStoredAnswerAnalysisRecord>();
        answersByQuestionId.set(answer.questionId, {
            answeredQuestionSemanticVersion:
                answer.answeredQuestionSemanticVersion,
            textValueHtml: answer.textValueHtml,
            optionSlugIds: optionSlugIdsByAnswerId.get(answer.answerId) ?? [],
        });
        answersByResponseId.set(answer.responseId, answersByQuestionId);
    }

    const eligibleParticipantIds = new Set<string>();
    for (const response of responseRows) {
        const surveyGateStatus = deriveSurveyGateStatusForAnalysis({
            hasSurvey: true,
            isOptional: activeSurveyConfig.isOptional,
            questions,
            answersByQuestionId:
                answersByResponseId.get(response.responseId) ??
                new Map<number, SurveyStoredAnswerAnalysisRecord>(),
            withdrawnAt: response.withdrawnAt,
        });
        if (
            isSurveyGateStatusEligibleForAnalysis({
                surveyGateStatus,
                isOptional: activeSurveyConfig.isOptional,
            })
        ) {
            eligibleParticipantIds.add(response.participantId);
        }
    }

    return eligibleParticipantIds;
}
