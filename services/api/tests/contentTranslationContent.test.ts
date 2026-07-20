import { describe, expect, it } from "vitest";
import {
    buildLocalizedRankingItemContent,
    buildLocalizedSurveyQuestionContent,
    hasCompleteSurveyQuestionTranslation,
    shouldQueueTranslationWork,
    toMissingContentTranslationStatus,
    type RankingItemLocalizedContentSource,
    type RankingItemTranslationSource,
    type SurveyQuestionLocalizedContentSource,
} from "../src/service/contentTranslationContent.js";

const surveyQuestionSource: SurveyQuestionLocalizedContentSource = {
    conversationSlugId: "conv1234",
    questionSlugId: "ques1234",
    contentId: 10,
    publicId: "00000000-0000-4000-8000-000000000010",
    questionText: "What should we build next?",
    sourceLanguageCode: "en",
    sourceRawLanguageCode: "en",
    sourceLanguageProvider: "lingua",
    sourceLanguageConfidence: 0.99,
    options: [
        {
            optionSlugId: "opt00001",
            contentId: 21,
            publicId: "00000000-0000-4000-8000-000000000021",
            optionText: "Parks",
            sourceLanguageCode: "en",
            sourceRawLanguageCode: "en",
            sourceLanguageProvider: "lingua",
            sourceLanguageConfidence: 0.99,
        },
        {
            optionSlugId: "opt00002",
            contentId: 22,
            publicId: "00000000-0000-4000-8000-000000000022",
            optionText: "Libraries",
            sourceLanguageCode: "en",
            sourceRawLanguageCode: "en",
            sourceLanguageProvider: "lingua",
            sourceLanguageConfidence: 0.99,
        },
    ],
};

const rankingItemSource = {
    conversationSlugId: "conv1234",
    itemSlugId: "item1234",
    contentId: 42,
    publicId: "00000000-0000-4000-8000-000000000042",
    title: "Source title",
    bodyHtml: "<p>Source body</p>",
    sourceLanguageCode: "en",
    sourceRawLanguageCode: "en",
    sourceLanguageProvider: null,
    sourceLanguageConfidence: 1,
} satisfies RankingItemLocalizedContentSource;

const rankingItemTranslation = {
    translatedTitle: "Titre traduit",
    translatedBodyHtml: "<p>Corps traduit</p>",
    sourceLanguageCode: "en",
    sourceRawLanguageCode: "en",
    sourceLanguageProvider: null,
    sourceLanguageConfidence: 1,
} satisfies RankingItemTranslationSource;

describe("content translation pure content helpers", () => {
    it("queues only when missing content is explicitly requested", () => {
        expect(
            shouldQueueTranslationWork({
                requestMode: "read_existing",
                translationExists: false,
            }),
        ).toBe(false);
        expect(
            shouldQueueTranslationWork({
                requestMode: "queue_if_missing",
                translationExists: true,
            }),
        ).toBe(false);
        expect(
            shouldQueueTranslationWork({
                requestMode: "queue_if_missing",
                translationExists: false,
            }),
        ).toBe(true);
    });

    it("does not expose completed work without content as pending", () => {
        expect(toMissingContentTranslationStatus("pending")).toBe("pending");
        expect(toMissingContentTranslationStatus("running")).toBe("running");
        expect(toMissingContentTranslationStatus("failed")).toBe("failed");
        expect(toMissingContentTranslationStatus("completed")).toBe(
            "not_requested",
        );
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

    it("returns pending original content when any survey option translation is missing", () => {
        const result = buildLocalizedSurveyQuestionContent({
            source: surveyQuestionSource,
            translation: {
                translatedQuestionText:
                    "Que devrions-nous construire ensuite ?",
                sourceLanguageCode: "en",
                sourceRawLanguageCode: "en",
                sourceLanguageProvider: "lingua",
                sourceLanguageConfidence: 0.99,
                translatedOptionsByContentId: new Map([[21, "Parcs"]]),
            },
            targetLanguageCode: "fr",
            missingTranslationStatus: "pending",
        });

        expect(result).toEqual({
            subject: {
                kind: "survey_question",
                conversationSlugId: "conv1234",
                questionSlugId: "ques1234",
            },
            content: {
                kind: "translatable",
                sourceVersion: "00000000-0000-4000-8000-000000000010",
                initialMode: "original",
                translation: {
                    targetLanguageCode: "fr",
                    sourceLanguageCode: "en",
                    sourceLanguageLabel: "English",
                    sourceLanguage: {
                        kind: "recognized",
                        languageCode: "en",
                        label: "English",
                    },
                    status: "pending",
                },
                variants: {
                    original: {
                        questionText: "What should we build next?",
                        options: [
                            { optionSlugId: "opt00001", optionText: "Parks" },
                            {
                                optionSlugId: "opt00002",
                                optionText: "Libraries",
                            },
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
                translatedQuestionText:
                    "Que devrions-nous construire ensuite ?",
                sourceLanguageCode: "en",
                sourceRawLanguageCode: "en",
                sourceLanguageProvider: "lingua",
                sourceLanguageConfidence: 0.99,
                translatedOptionsByContentId: new Map([
                    [21, "Parcs"],
                    [22, "Bibliotheques"],
                ]),
            },
            targetLanguageCode: "fr",
            missingTranslationStatus: "not_requested",
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

    it("returns completed translated ranking item content", () => {
        const result = buildLocalizedRankingItemContent({
            source: rankingItemSource,
            translation: rankingItemTranslation,
            targetLanguageCode: "fr",
            missingTranslationStatus: "not_requested",
        });

        expect(result.subject).toEqual({
            kind: "ranking_item",
            conversationSlugId: "conv1234",
            itemSlugId: "item1234",
            sourceVersion: "00000000-0000-4000-8000-000000000042",
        });
        expect(result.content).toMatchObject({
            sourceVersion: "00000000-0000-4000-8000-000000000042",
            initialMode: "translated",
            translation: { targetLanguageCode: "fr", status: "completed" },
            variants: {
                original: {
                    title: "Source title",
                    bodyHtml: "<p>Source body</p>",
                },
                translated: {
                    title: "Titre traduit",
                    bodyHtml: "<p>Corps traduit</p>",
                },
            },
        });
    });

    it("uses explicit missing ranking item translation status", () => {
        const result = buildLocalizedRankingItemContent({
            source: rankingItemSource,
            translation: undefined,
            targetLanguageCode: "fr",
            missingTranslationStatus: "failed",
        });

        expect(result.content).toMatchObject({
            initialMode: "original",
            translation: { status: "failed" },
            variants: { original: { title: "Source title" } },
        });
    });
});
