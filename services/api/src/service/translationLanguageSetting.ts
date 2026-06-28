import {
    parseSupportedDisplayLanguageOrUndefined,
    type SupportedDisplayLanguageCodes,
    type SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";

export interface TranslationLanguageSettingInput {
    dynamicTranslationEnabled: boolean;
    additionalLanguageCodes: readonly SupportedDisplayLanguageCodes[];
}

export interface TranslationLanguageSetting {
    dynamicTranslationEnabled: boolean;
    additionalLanguageCodes: SupportedDisplayLanguageCodes[];
}

export function sourceLanguageToDisplayLanguage({
    sourceLanguageCode,
}: {
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
}): SupportedDisplayLanguageCodes | null {
    if (sourceLanguageCode === null) {
        return null;
    }
    return parseSupportedDisplayLanguageOrUndefined(sourceLanguageCode) ?? null;
}

export function normalizeTranslationLanguageSetting({
    setting,
    canUseDynamicTranslation,
    sourceLanguageCode,
}: {
    setting: TranslationLanguageSettingInput;
    canUseDynamicTranslation: boolean;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
}): TranslationLanguageSetting {
    if (!canUseDynamicTranslation) {
        return {
            dynamicTranslationEnabled: false,
            additionalLanguageCodes: [],
        };
    }

    const sourceDisplayLanguageCode = sourceLanguageToDisplayLanguage({
        sourceLanguageCode,
    });
    const additionalLanguageCodes = Array.from(
        new Set(setting.additionalLanguageCodes),
    )
        .filter((languageCode) => languageCode !== sourceDisplayLanguageCode)
        .slice(0, 2);

    return {
        dynamicTranslationEnabled: setting.dynamicTranslationEnabled,
        additionalLanguageCodes,
    };
}
