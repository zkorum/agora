import { describe, expect, it } from "vitest";
import type {
    LocalizedContentTranslationStatus,
    LocalizedConversationContent,
} from "@/shared/types/zod.js";
import {
    getInitialConversationContentMode,
    toConversationContentFetchResponse,
} from "./conversationContent.js";

const content = {
    kind: "translatable",
    sourceVersion: "00000000-0000-4000-8000-000000000001",
    initialMode: "translated",
    translation: {
        targetLanguageCode: "en",
        sourceLanguageCode: "ky",
        sourceLanguage: {
            kind: "recognized",
            languageCode: "ky",
            label: "Kyrgyz",
        },
        status: "completed",
    },
    variants: {
        original: { title: "Кыргызча аталыш" },
        translated: { title: "English title" },
    },
} satisfies LocalizedConversationContent;

describe("displayed content language invariant", () => {
    it("does not initially select a fallback translation for another language", () => {
        expect(
            getInitialConversationContentMode({
                content,
                translationAllowed: true,
                displayLanguage: "fr",
                spokenLanguages: [],
            }),
        ).toBe("original");
    });

    it("never exposes another language's translation or toggle", () => {
        const response = toConversationContentFetchResponse({
            content,
            mode: "original",
            translationAllowed: true,
            displayLanguage: "fr",
            spokenLanguages: [],
        });

        expect(response).toMatchObject({
            status: "available",
            mode: "original",
            content: content.variants.original,
            translationControl: null,
        });
    });

    it("does not serve a mismatched translation even when explicitly requested", () => {
        const response = toConversationContentFetchResponse({
            content,
            mode: "translated",
            translationAllowed: true,
            displayLanguage: "fr",
            spokenLanguages: [],
        });

        expect(response).toMatchObject({
            status: "available",
            mode: "original",
            content: content.variants.original,
            translationControl: null,
        });
    });

    it("preserves the toggle in both directions for the exact supported target", () => {
        for (const mode of ["original", "translated"] satisfies (
            | "original"
            | "translated"
        )[]) {
            const response = toConversationContentFetchResponse({
                content,
                mode,
                translationAllowed: true,
                displayLanguage: "en",
                spokenLanguages: [],
            });

            expect(response).toMatchObject({
                status: "available",
                mode,
                content: content.variants[mode],
                translationControl: {
                    status: "completed",
                    alternateMode:
                        mode === "original" ? "translated" : "original",
                },
            });
        }
    });

    it("returns the original when policy disables a cached translation", () => {
        expect(
            toConversationContentFetchResponse({
                content,
                mode: "translated",
                translationAllowed: false,
                displayLanguage: "en",
                spokenLanguages: [],
            }),
        ).toMatchObject({
            status: "available",
            mode: "original",
            content: content.variants.original,
            translationControl: null,
        });
    });

    it("does not offer translation when the source is already the display language", () => {
        expect(
            toConversationContentFetchResponse({
                content: {
                    ...content,
                    translation: {
                        ...content.translation,
                        targetLanguageCode: "ky",
                    },
                },
                mode: "translated",
                translationAllowed: true,
                displayLanguage: "ky",
                spokenLanguages: [],
            }),
        ).toMatchObject({
            status: "available",
            mode: "original",
            translationControl: null,
        });
    });

    it.each([
        "not_requested",
        "pending",
        "running",
        "failed",
        "completed",
    ] satisfies LocalizedContentTranslationStatus[])(
        "hides unsupported translation regardless of work status (%s)",
        (status) => {
            const incompleteContent = {
                ...content,
                initialMode: "original",
                translation: { ...content.translation, status },
                variants: { original: content.variants.original },
            } satisfies LocalizedConversationContent;
            expect(
                toConversationContentFetchResponse({
                    content: incompleteContent,
                    mode: "translated",
                    translationAllowed: false,
                    displayLanguage: "fr",
                    spokenLanguages: [],
                }),
            ).toMatchObject({
                status: "available",
                mode: "original",
                content: content.variants.original,
                translationControl: null,
            });
        },
    );

    it("does not leak a translated-only variant when its original is unavailable", () => {
        const translatedOnly = {
            ...content,
            variants: { translated: content.variants.translated },
        } satisfies LocalizedConversationContent;
        expect(
            toConversationContentFetchResponse({
                content: translatedOnly,
                mode: "translated",
                translationAllowed: true,
                displayLanguage: "fr",
                spokenLanguages: [],
            }),
        ).toEqual({
            sourceVersion: content.sourceVersion,
            status: "not_requested",
            translationControl: null,
        });
    });
});
