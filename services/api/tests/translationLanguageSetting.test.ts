import { describe, expect, it } from "vitest";
import { getConfiguredTranslationDisplayLanguageCodes } from "../src/service/translationLanguageSetting.js";

describe("translation language settings", () => {
    it("includes the source display language with configured target languages", () => {
        const languageCodes = getConfiguredTranslationDisplayLanguageCodes({
            sourceLanguageCode: "en",
            targetLanguageCodes: ["ky", "ru"],
        });

        expect(languageCodes).toEqual(new Set(["en", "ky", "ru"]));
    });

    it("deduplicates source and target languages", () => {
        const languageCodes = getConfiguredTranslationDisplayLanguageCodes({
            sourceLanguageCode: "en",
            targetLanguageCodes: ["en", "fr"],
        });

        expect(languageCodes).toEqual(new Set(["en", "fr"]));
    });
});
