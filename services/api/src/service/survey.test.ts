import { beforeEach, describe, expect, it, vi } from "vitest";

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
