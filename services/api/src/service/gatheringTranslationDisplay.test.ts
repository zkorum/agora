import { describe, expect, it } from "vitest";
import type { gatheringAnswerTranslationTable } from "@/shared-backend/schema.js";
import { assembleGatheringResponseTranslation } from "./gatheringTranslationDisplay.js";

const fieldA = "00000000-0000-4000-8000-000000000001";
const fieldB = "00000000-0000-4000-8000-000000000002";
type Translation = typeof gatheringAnswerTranslationTable.$inferSelect;
function translation(fieldId: string): Translation {
    return {
        contentId: 1,
        fieldId,
        displayLanguageCode: "fr",
        translatedValue: `Translated ${fieldId}`,
        sourceLanguageCode: "en",
    };
}
const original = [
    { fieldId: fieldA, value: "Original" },
    { fieldId: fieldB, value: "" },
];

describe("Gathering translated answer assembly", () => {
    it("matches identities in original order and ignores blank answers when describing the source language", () => {
        expect(
            assembleGatheringResponseTranslation({
                original,
                translations: [
                    {
                        ...translation(fieldB),
                        translatedValue: "",
                        sourceLanguageCode: null,
                    },
                    translation(fieldA),
                ],
            }),
        ).toEqual({
            answers: [
                { fieldId: fieldA, value: `Translated ${fieldA}` },
                { fieldId: fieldB, value: "" },
            ],
            sourceLanguageCode: "en",
        });
    });
    it("does not turn missing translations into empty answers", () => {
        expect(
            assembleGatheringResponseTranslation({
                original,
                translations: [translation(fieldA)],
            }),
        ).toBeUndefined();
        expect(
            assembleGatheringResponseTranslation({
                original,
                translations: [translation(fieldA), translation(fieldA)],
            }),
        ).toBeUndefined();
        expect(
            assembleGatheringResponseTranslation({
                original: [],
                translations: [],
            }),
        ).toBeUndefined();
    });
});
