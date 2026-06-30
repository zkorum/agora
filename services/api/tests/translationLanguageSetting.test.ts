import { describe, expect, it } from "vitest";
import {
    getConfiguredTranslationDisplayLanguageCodes,
    normalizeConversationMultilingualSettings,
    normalizeInheritedConversationMultilingualSettings,
    normalizeProjectLanguageSettings,
} from "../src/service/translationLanguageSetting.js";

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

    it("preserves project target languages even when they match detected source", () => {
        const setting = normalizeProjectLanguageSettings({
            languageSettings: {
                dynamicTranslationEnabled: true,
                targetLanguageCodes: ["en", "fr", "en"],
            },
            canUseDynamicTranslation: true,
        });

        expect(setting).toEqual({
            dynamicTranslationEnabled: true,
            targetLanguageCodes: ["en", "fr"],
        });
    });

    it("preserves conversation target languages even when they match detected source", () => {
        const setting = normalizeConversationMultilingualSettings({
            multilingualSettings: {
                dynamicTranslationEnabled: true,
                additionalLanguageCodes: ["en", "fr", "en"],
            },
            canUseDynamicTranslation: true,
        });

        expect(setting).toEqual({
            dynamicTranslationEnabled: true,
            additionalLanguageCodes: ["en", "fr"],
        });
    });

    it("includes the project default language when inheriting dynamic translation settings", () => {
        const setting = normalizeInheritedConversationMultilingualSettings({
            languageSettings: {
                dynamicTranslationEnabled: true,
                defaultLanguageCode: "en",
                targetLanguageCodes: ["fr", "es"],
            },
        });

        expect(setting).toEqual({
            dynamicTranslationEnabled: true,
            additionalLanguageCodes: ["en", "fr", "es"],
        });
    });
});
