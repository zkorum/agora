import { describe, expect, it } from "vitest";
import {
    getConversationOverrideTranslationTargetLanguagePolicy,
    getManualMultilingualSettingsFromEffectiveTargets,
    getManualMultilingualSettingsFromProjectLanguageSettings,
    getProjectTranslationTargetLanguagePolicy,
    normalizeConversationMultilingualSettings,
    normalizeInheritedConversationMultilingualSettings,
    normalizeProjectLanguageSettings,
    shouldTranslateContent,
} from "../src/service/translationLanguageSetting.js";

describe("translation language settings", () => {
    it("combines detected and manual target languages for overrides", () => {
        const policy = getConversationOverrideTranslationTargetLanguagePolicy({
            detectedTargetLanguageCode: "en",
            multilingualSettings: {
                dynamicTranslationEnabled: true,
                additionalLanguageCodes: ["ky", "ru"],
            },
        });

        expect(policy.effectiveTargetLanguageCodes).toEqual(["en", "ky", "ru"]);
    });

    it("deduplicates detected and manual target languages", () => {
        const policy = getConversationOverrideTranslationTargetLanguagePolicy({
            detectedTargetLanguageCode: "en",
            multilingualSettings: {
                dynamicTranslationEnabled: true,
                additionalLanguageCodes: ["en", "fr"],
            },
        });

        expect(policy.effectiveTargetLanguageCodes).toEqual(["en", "fr"]);
    });

    it("keeps inherited effective target languages when dynamic translation is disabled", () => {
        const policy = getProjectTranslationTargetLanguagePolicy({
            languageSettings: {
                dynamicTranslationEnabled: false,
                defaultLanguageCode: "en",
                targetLanguageCodes: ["fr", "es"],
            },
        });

        expect(policy.effectiveTargetLanguageCodes).toEqual(["en", "fr", "es"]);
        expect(policy.dynamicTranslationEnabled).toBe(false);
    });

    it("derives manual edit languages from effective target languages", () => {
        const setting = getManualMultilingualSettingsFromEffectiveTargets({
            effectiveMultilingualSettings: {
                dynamicTranslationEnabled: true,
                additionalLanguageCodes: ["en", "fr", "es"],
            },
            detectedTargetLanguageCode: "en",
        });

        expect(setting).toEqual({
            dynamicTranslationEnabled: true,
            additionalLanguageCodes: ["fr", "es"],
        });
    });

    it("derives premium language settings from project manual targets only", () => {
        const setting = getManualMultilingualSettingsFromProjectLanguageSettings({
            languageSettings: {
                dynamicTranslationEnabled: false,
                defaultLanguageCode: "en",
                targetLanguageCodes: [],
            },
        });

        expect(setting).toEqual({
            dynamicTranslationEnabled: false,
            additionalLanguageCodes: [],
        });
    });

    it("skips translation only for same-language source and target pairs", () => {
        expect(
            shouldTranslateContent({
                sourceLanguageCode: "fr",
                sourceRawLanguageCode: "fr",
                targetLanguageCode: "fr",
            }),
        ).toBe(false);
        expect(
            shouldTranslateContent({
                sourceLanguageCode: "fr",
                sourceRawLanguageCode: "fr",
                targetLanguageCode: "en",
            }),
        ).toBe(true);
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
