import { describe, expect, it } from "vitest";
import { shouldSkipTranslation } from "../src/shared-backend/translate.js";

describe("shouldSkipTranslation", () => {
    it("treats raw detector language names as language codes", () => {
        expect(
            shouldSkipTranslation({
                sourceLanguageCode: "English",
                targetLanguageCode: "en",
            }),
        ).toBe(true);

        expect(
            shouldSkipTranslation({
                sourceLanguageCode: "French",
                targetLanguageCode: "en",
            }),
        ).toBe(false);
    });
});
