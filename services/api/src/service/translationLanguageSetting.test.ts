import { describe, expect, it } from "vitest";

import {
    getConversationOverrideTranslationTargetLanguagePolicy,
    getManualMultilingualSettingsFromEffectiveTargets,
    getManualMultilingualSettingsFromProjectLanguageSettings,
    getProjectTranslationTargetLanguagePolicy,
    isConfiguredTranslationTargetLanguage,
    shouldTranslateContent,
} from "./translationLanguageSetting.js";

describe("translation target language policy", () => {
    it("uses project detected target plus manual targets", () => {
        const policy = getProjectTranslationTargetLanguagePolicy({
            languageSettings: {
                dynamicTranslationEnabled: true,
                defaultLanguageCode: "fr",
                targetLanguageCodes: ["ky", "ru"],
            },
        });

        expect(policy).toMatchObject({
            dynamicTranslationEnabled: true,
            detectedTargetLanguageCode: "fr",
            manualTargetLanguageCodes: ["ky", "ru"],
            effectiveTargetLanguageCodes: ["fr", "ky", "ru"],
        });
    });

    it("keeps project effective targets when dynamic translation is disabled", () => {
        const policy = getProjectTranslationTargetLanguagePolicy({
            languageSettings: {
                dynamicTranslationEnabled: false,
                defaultLanguageCode: "en",
                targetLanguageCodes: ["fr", "es"],
            },
        });

        expect(policy).toMatchObject({
            dynamicTranslationEnabled: false,
            detectedTargetLanguageCode: "en",
            manualTargetLanguageCodes: ["fr", "es"],
            effectiveTargetLanguageCodes: ["en", "fr", "es"],
        });
    });

    it("uses conversation detected target plus manual targets for overrides", () => {
        const policy = getConversationOverrideTranslationTargetLanguagePolicy({
            multilingualSettings: {
                dynamicTranslationEnabled: true,
                additionalLanguageCodes: ["ky", "ru"],
            },
            detectedTargetLanguageCode: "fr",
        });

        expect(policy.effectiveTargetLanguageCodes).toEqual(["fr", "ky", "ru"]);
    });

    it("reconstructs manual edit settings from effective targets", () => {
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

    it("keeps effective targets as manual edit settings when auto is unknown", () => {
        const setting = getManualMultilingualSettingsFromEffectiveTargets({
            effectiveMultilingualSettings: {
                dynamicTranslationEnabled: true,
                additionalLanguageCodes: ["en", "fr", "es"],
            },
            detectedTargetLanguageCode: null,
        });

        expect(setting).toEqual({
            dynamicTranslationEnabled: true,
            additionalLanguageCodes: ["en", "fr"],
        });
    });

    it("derives premium settings from project manual targets only", () => {
        const setting = getManualMultilingualSettingsFromProjectLanguageSettings({
            languageSettings: {
                dynamicTranslationEnabled: false,
                defaultLanguageCode: "en",
                targetLanguageCodes: ["fr", "es"],
            },
        });

        expect(setting).toEqual({
            dynamicTranslationEnabled: false,
            additionalLanguageCodes: ["fr", "es"],
        });
    });

    it("does not count project default language as a manual premium language", () => {
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

    it("checks display target eligibility independently from content source", () => {
        const policy = getProjectTranslationTargetLanguagePolicy({
            languageSettings: {
                dynamicTranslationEnabled: true,
                defaultLanguageCode: "fr",
                targetLanguageCodes: ["ky", "ru"],
            },
        });

        expect(
            isConfiguredTranslationTargetLanguage({
                policy,
                targetLanguageCode: "en",
            }),
        ).toBe(false);
        expect(
            shouldTranslateContent({
                sourceLanguageCode: "en",
                sourceRawLanguageCode: null,
                targetLanguageCode: "fr",
            }),
        ).toBe(true);
    });
});
