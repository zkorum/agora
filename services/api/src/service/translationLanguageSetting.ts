import {
    parseSupportedDisplayLanguageOrUndefined,
    type SupportedDisplayLanguageCodes,
    type SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";

export interface ProjectLanguageSettingsInput {
    dynamicTranslationEnabled: boolean;
    targetLanguageCodes: readonly SupportedDisplayLanguageCodes[];
}

export interface ProjectLanguageSettings {
    dynamicTranslationEnabled: boolean;
    targetLanguageCodes: SupportedDisplayLanguageCodes[];
}

export interface ConversationMultilingualSettingsInput {
    dynamicTranslationEnabled: boolean;
    additionalLanguageCodes: readonly SupportedDisplayLanguageCodes[];
}

export interface ConversationMultilingualSettings {
    dynamicTranslationEnabled: boolean;
    additionalLanguageCodes: SupportedDisplayLanguageCodes[];
}

export interface InheritedConversationMultilingualSettings {
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

export function normalizeProjectLanguageSettings({
    languageSettings,
    canUseDynamicTranslation,
    sourceLanguageCode,
}: {
    languageSettings: ProjectLanguageSettingsInput;
    canUseDynamicTranslation: boolean;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
}): ProjectLanguageSettings {
    if (!canUseDynamicTranslation) {
        return {
            dynamicTranslationEnabled: false,
            targetLanguageCodes: [],
        };
    }

    const sourceDisplayLanguageCode = sourceLanguageToDisplayLanguage({
        sourceLanguageCode,
    });
    const targetLanguageCodes = Array.from(
        new Set(languageSettings.targetLanguageCodes),
    )
        .filter((languageCode) => languageCode !== sourceDisplayLanguageCode)
        .slice(0, 2);

    return {
        dynamicTranslationEnabled: languageSettings.dynamicTranslationEnabled,
        targetLanguageCodes,
    };
}

export function normalizeConversationMultilingualSettings({
    multilingualSettings,
    canUseDynamicTranslation,
    sourceLanguageCode,
}: {
    multilingualSettings: ConversationMultilingualSettingsInput;
    canUseDynamicTranslation: boolean;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
}): ConversationMultilingualSettings {
    const normalizedProjectLanguageSettings = normalizeProjectLanguageSettings({
        languageSettings: {
            dynamicTranslationEnabled:
                multilingualSettings.dynamicTranslationEnabled,
            targetLanguageCodes: multilingualSettings.additionalLanguageCodes,
        },
        canUseDynamicTranslation,
        sourceLanguageCode,
    });

    return {
        dynamicTranslationEnabled:
            normalizedProjectLanguageSettings.dynamicTranslationEnabled,
        additionalLanguageCodes:
            normalizedProjectLanguageSettings.targetLanguageCodes,
    };
}

export function normalizeInheritedConversationMultilingualSettings({
    languageSettings,
}: {
    languageSettings: ProjectLanguageSettingsInput;
}): InheritedConversationMultilingualSettings {
    return {
        dynamicTranslationEnabled: languageSettings.dynamicTranslationEnabled,
        additionalLanguageCodes: Array.from(
            new Set(languageSettings.targetLanguageCodes),
        ),
    };
}
