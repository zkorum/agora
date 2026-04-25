import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
    ActiveSurveyQuestionRecord,
    StoredSurveyAnswer,
    SurveyParticipantState,
} from "./survey.js";

process.env.NODE_ENV = "test";
process.env.CORS_ORIGIN_LIST = "http://localhost:9000";
process.env.PEPPERS = Buffer.from(
    "0123456789abcdef0123456789abcdef",
).toString("base64");
process.env.VERIFICATOR_SVC_BASE_URL = "http://localhost:3000";

const { checkConversationParticipationMock } = vi.hoisted(() => ({
    checkConversationParticipationMock: vi.fn(),
}));

vi.mock("./participationGate.js", () => ({
    checkConversationParticipation: checkConversationParticipationMock,
}));

const surveyModulePromise = import("./survey.js");

function createSurveyDbStub(): {
    db: Parameters<Awaited<typeof surveyModulePromise>["saveSurveyAnswer"]>[0]["db"];
    transactionMock: ReturnType<typeof vi.fn>;
} {
    const transactionMock = vi.fn();

    return {
        db: {
            transaction: transactionMock,
        } as unknown as Parameters<
            Awaited<typeof surveyModulePromise>["saveSurveyAnswer"]
        >[0]["db"],
        transactionMock,
    };
}

function createFreeTextQuestion({
    id,
    slugId,
    isRequired,
    displayOrder,
}: {
    id: number;
    slugId: string;
    isRequired: boolean;
    displayOrder: number;
}): ActiveSurveyQuestionRecord {
    return {
        id,
        slugId,
        questionType: "free_text",
        choiceDisplay: "auto",
        currentSemanticVersion: 1,
        displayOrder,
        isRequired,
        questionText: slugId,
        constraints: {
            type: "free_text",
            maxPlainTextLength: 100,
            maxHtmlLength: 1_000,
        },
        options: [],
    };
}

function createPassedAnswer({
    question,
}: {
    question: ActiveSurveyQuestionRecord;
}): StoredSurveyAnswer {
    return {
        answerId: question.id * 100,
        answeredQuestionSemanticVersion: question.currentSemanticVersion,
        textValueHtml: null,
        optionSlugIds: [],
    };
}

function createSurveyState({
    questions,
    answersByQuestionId = new Map(),
}: {
    questions: ActiveSurveyQuestionRecord[];
    answersByQuestionId?: Map<number, StoredSurveyAnswer>;
}): SurveyParticipantState {
    return {
        activeSurveyConfig: {
            id: 1,
            currentRevision: 1,
            questions,
        },
        response: undefined,
        answersByQuestionId,
    };
}

describe("deriveSurveyRouteResolution", () => {
    it("routes to the first untouched optional question before later required questions", async () => {
        const { deriveSurveyRouteResolution } = await surveyModulePromise;
        const optionalQuestion = createFreeTextQuestion({
            id: 1,
            slugId: "optional-first",
            isRequired: false,
            displayOrder: 0,
        });
        const requiredQuestion = createFreeTextQuestion({
            id: 2,
            slugId: "required-second",
            isRequired: true,
            displayOrder: 1,
        });

        const result = deriveSurveyRouteResolution({
            surveyState: createSurveyState({
                questions: [optionalQuestion, requiredQuestion],
            }),
            participantId: "participant-1",
        });

        expect(result).toEqual({
            kind: "question",
            questionSlugId: "optional-first",
        });
    });

    it("routes to the required question once the earlier optional question is passed", async () => {
        const { deriveSurveyRouteResolution } = await surveyModulePromise;
        const optionalQuestion = createFreeTextQuestion({
            id: 1,
            slugId: "optional-first",
            isRequired: false,
            displayOrder: 0,
        });
        const requiredQuestion = createFreeTextQuestion({
            id: 2,
            slugId: "required-second",
            isRequired: true,
            displayOrder: 1,
        });

        const result = deriveSurveyRouteResolution({
            surveyState: createSurveyState({
                questions: [optionalQuestion, requiredQuestion],
                answersByQuestionId: new Map([
                    [
                        optionalQuestion.id,
                        createPassedAnswer({ question: optionalQuestion }),
                    ],
                ]),
            }),
            participantId: "participant-1",
        });

        expect(result).toEqual({
            kind: "question",
            questionSlugId: "required-second",
        });
    });
});

describe("saveSurveyAnswer", () => {
    beforeEach(() => {
        checkConversationParticipationMock.mockReset();
    });

    it("uses shared participation checks without requiring a completed survey", async () => {
        const { saveSurveyAnswer } = await surveyModulePromise;
        const { db, transactionMock } = createSurveyDbStub();

        checkConversationParticipationMock.mockResolvedValue({
            success: false,
            reason: "account_required",
        });

        const result = await saveSurveyAnswer({
            db,
            conversationSlugId: "conv-1",
            questionSlugId: "question-1",
            answer: null,
            didWrite: "did:test:1",
            userAgent: "Vitest",
            now: new Date("2026-01-01T00:00:00.000Z"),
        });

        expect(result).toEqual({
            success: false,
            reason: "account_required",
        });
        expect(checkConversationParticipationMock).toHaveBeenCalledWith({
            db,
            conversationSlugId: "conv-1",
            didWrite: "did:test:1",
            userAgent: "Vitest",
            now: new Date("2026-01-01T00:00:00.000Z"),
            requireCompletedSurvey: false,
        });
        expect(transactionMock).not.toHaveBeenCalled();
    });
});

describe("withdrawSurveyResponse", () => {
    beforeEach(() => {
        checkConversationParticipationMock.mockReset();
    });

    it("reuses the shared participation gate before withdrawing", async () => {
        const { withdrawSurveyResponse } = await surveyModulePromise;
        const { db, transactionMock } = createSurveyDbStub();

        checkConversationParticipationMock.mockResolvedValue({
            success: false,
            reason: "event_ticket_required",
        });

        const result = await withdrawSurveyResponse({
            db,
            conversationSlugId: "conv-2",
            didWrite: "did:test:2",
            userAgent: "Vitest",
            now: new Date("2026-01-02T00:00:00.000Z"),
        });

        expect(result).toEqual({
            success: false,
            reason: "event_ticket_required",
        });
        expect(checkConversationParticipationMock).toHaveBeenCalledWith({
            db,
            conversationSlugId: "conv-2",
            didWrite: "did:test:2",
            userAgent: "Vitest",
            now: new Date("2026-01-02T00:00:00.000Z"),
            requireCompletedSurvey: false,
        });
        expect(transactionMock).not.toHaveBeenCalled();
    });
});

describe("validateSurveyAnswer", () => {
    it("accepts integer free-text answers only when they are whole numbers in range", async () => {
        const { validateSurveyAnswer } = await surveyModulePromise;

        const question = {
            id: 1,
            slugId: "question1",
            questionType: "free_text" as const,
            choiceDisplay: "auto" as const,
            currentContentId: 10,
            currentSemanticVersion: 1,
            displayOrder: 0,
            isRequired: true,
            questionText: "What is your age?",
            constraints: {
                type: "free_text" as const,
                inputMode: "integer" as const,
                minValue: 1,
                maxValue: 120,
            },
            sourceLanguageCode: "en",
            sourceLanguageConfidence: 0.99,
            options: [],
        };

        expect(
            validateSurveyAnswer({
                question,
                answer: {
                    questionType: "free_text",
                    textValueHtml: "34",
                },
            }),
        ).toBe(true);

        expect(
            validateSurveyAnswer({
                question,
                answer: {
                    questionType: "free_text",
                    textValueHtml: "34.5",
                },
            }),
        ).toBe(false);

        expect(
            validateSurveyAnswer({
                question,
                answer: {
                    questionType: "free_text",
                    textValueHtml: "0",
                },
            }),
        ).toBe(false);
    });
});
