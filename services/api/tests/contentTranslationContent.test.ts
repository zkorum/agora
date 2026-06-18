import { describe, expect, it } from "vitest";
import {
    buildLocalizedSurveyQuestionContent,
    buildSurveyQuestionSourceVersion,
    hasCompleteSurveyQuestionTranslation,
    shouldQueueTranslationWork,
} from "../src/service/contentTranslationContent.js";

const surveyQuestionSource = {
    conversationSlugId: "conv1234",
    questionSlugId: "ques1234",
    contentId: 10,
    questionText: "What should we build next?",
    sourceLanguageCode: "en",
    options: [
        { optionSlugId: "opt00001", contentId: 21, optionText: "Parks" },
        { optionSlugId: "opt00002", contentId: 22, optionText: "Libraries" },
    ],
};

describe("content translation pure content helpers", () => {
    it("queues only when non-original content is missing", () => {
        expect(
            shouldQueueTranslationWork({ include: "original", translationExists: false }),
        ).toBe(false);
        expect(
            shouldQueueTranslationWork({ include: "translation", translationExists: true }),
        ).toBe(false);
        expect(
            shouldQueueTranslationWork({ include: "translation", translationExists: false }),
        ).toBe(true);
        expect(
            shouldQueueTranslationWork({ include: "both", translationExists: false }),
        ).toBe(true);
    });

    it("requires question and every current option translation", () => {
        expect(
            hasCompleteSurveyQuestionTranslation({
                questionTranslationExists: false,
                optionContentIds: [21, 22],
                translatedOptionContentIds: new Set([21, 22]),
            }),
        ).toBe(false);
        expect(
            hasCompleteSurveyQuestionTranslation({
                questionTranslationExists: true,
                optionContentIds: [21, 22],
                translatedOptionContentIds: new Set([21]),
            }),
        ).toBe(false);
        expect(
            hasCompleteSurveyQuestionTranslation({
                questionTranslationExists: true,
                optionContentIds: [21, 22],
                translatedOptionContentIds: new Set([21, 22, 99]),
            }),
        ).toBe(true);
    });

    it("builds survey source versions from question and ordered option content ids", () => {
        expect(
            buildSurveyQuestionSourceVersion({
                surveyQuestionContentId: 10,
                optionContentIds: [21, 22],
            }),
        ).toBe("survey_question_content:10:option_content:21,22");
    });

    it("returns pending original content when any survey option translation is missing", () => {
        const result = buildLocalizedSurveyQuestionContent({
            source: surveyQuestionSource,
            translation: {
                translatedQuestionText: "Que devrions-nous construire ensuite ?",
                translatedOptionsByContentId: new Map([[21, "Parcs"]]),
            },
            targetLanguageCode: "fr",
            include: "translation",
        });

        expect(result).toEqual({
            subject: {
                kind: "survey_question",
                conversationSlugId: "conv1234",
                questionSlugId: "ques1234",
            },
            content: {
                kind: "translatable",
                sourceVersion: "survey_question_content:10:option_content:21,22",
                initialMode: "original",
                translation: {
                    targetLanguageCode: "fr",
                    sourceLanguageLabel: "English",
                    status: "pending",
                },
                variants: {
                    original: {
                        questionText: "What should we build next?",
                        options: [
                            { optionSlugId: "opt00001", optionText: "Parks" },
                            { optionSlugId: "opt00002", optionText: "Libraries" },
                        ],
                    },
                },
            },
        });
    });

    it("returns one completed translated survey payload when all options are translated", () => {
        const result = buildLocalizedSurveyQuestionContent({
            source: surveyQuestionSource,
            translation: {
                translatedQuestionText: "Que devrions-nous construire ensuite ?",
                translatedOptionsByContentId: new Map([
                    [21, "Parcs"],
                    [22, "Bibliotheques"],
                ]),
            },
            targetLanguageCode: "fr",
            include: "both",
        });

        expect(result.content.initialMode).toBe("translated");
        if (result.content.kind !== "translatable") {
            throw new Error("Expected translatable survey content");
        }
        expect(result.content.translation.status).toBe("completed");
        expect(result.content.variants).toEqual({
            original: {
                questionText: "What should we build next?",
                options: [
                    { optionSlugId: "opt00001", optionText: "Parks" },
                    { optionSlugId: "opt00002", optionText: "Libraries" },
                ],
            },
            translated: {
                questionText: "Que devrions-nous construire ensuite ?",
                options: [
                    { optionSlugId: "opt00001", optionText: "Parcs" },
                    { optionSlugId: "opt00002", optionText: "Bibliotheques" },
                ],
            },
        });
    });
});
