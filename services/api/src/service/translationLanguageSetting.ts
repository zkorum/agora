import {
    parseSupportedDisplayLanguageOrUndefined,
    type SupportedDisplayLanguageCodes,
    type SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import { shouldSkipTranslation } from "@/shared-backend/translate.js";

export interface ProjectLanguageSettingsInput {
    dynamicTranslationEnabled: boolean;
    targetLanguageCodes: readonly SupportedDisplayLanguageCodes[];
}

export interface InheritableProjectLanguageSettingsInput
    extends ProjectLanguageSettingsInput {
    defaultLanguageCode: SupportedDisplayLanguageCodes;
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

export function getConfiguredTranslationDisplayLanguageCodes({
    sourceLanguageCode,
    targetLanguageCodes,
}: {
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    targetLanguageCodes: readonly SupportedDisplayLanguageCodes[];
}): ReadonlySet<SupportedDisplayLanguageCodes> {
    const sourceDisplayLanguageCode = sourceLanguageToDisplayLanguage({
        sourceLanguageCode,
    });
    return new Set(
        sourceDisplayLanguageCode === null
            ? targetLanguageCodes
            : [sourceDisplayLanguageCode, ...targetLanguageCodes],
    );
}

export function shouldTranslateContent({
    sourceLanguageCode,
    sourceRawLanguageCode,
    targetLanguageCode,
}: {
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): boolean {
    return !shouldSkipTranslation({
        sourceLanguageCode: sourceLanguageCode ?? sourceRawLanguageCode ?? undefined,
        targetLanguageCode,
    });
}

export function normalizeProjectLanguageSettings({
    languageSettings,
    canUseDynamicTranslation,
}: {
    languageSettings: ProjectLanguageSettingsInput;
    canUseDynamicTranslation: boolean;
}): ProjectLanguageSettings {
    if (!canUseDynamicTranslation) {
        return {
            dynamicTranslationEnabled: false,
            targetLanguageCodes: [],
        };
    }

    const targetLanguageCodes = Array.from(
        new Set(languageSettings.targetLanguageCodes),
    ).slice(0, 2);

    return {
        dynamicTranslationEnabled: languageSettings.dynamicTranslationEnabled,
        targetLanguageCodes,
    };
}

export function normalizeConversationMultilingualSettings({
    multilingualSettings,
    canUseDynamicTranslation,
}: {
    multilingualSettings: ConversationMultilingualSettingsInput;
    canUseDynamicTranslation: boolean;
}): ConversationMultilingualSettings {
    const normalizedProjectLanguageSettings = normalizeProjectLanguageSettings({
        languageSettings: {
            dynamicTranslationEnabled:
                multilingualSettings.dynamicTranslationEnabled,
            targetLanguageCodes: multilingualSettings.additionalLanguageCodes,
        },
        canUseDynamicTranslation,
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
    languageSettings: InheritableProjectLanguageSettingsInput;
}): InheritedConversationMultilingualSettings {
    return {
        dynamicTranslationEnabled: languageSettings.dynamicTranslationEnabled,
        additionalLanguageCodes: Array.from(
            new Set(
                languageSettings.dynamicTranslationEnabled
                    ? [
                          languageSettings.defaultLanguageCode,
                          ...languageSettings.targetLanguageCodes,
                      ]
                    : languageSettings.targetLanguageCodes,
            ),
        ),
    };
}
