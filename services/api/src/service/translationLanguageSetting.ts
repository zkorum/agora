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

export interface TranslationTargetLanguagePolicy {
    dynamicTranslationEnabled: boolean;
    detectedTargetLanguageCode: SupportedDisplayLanguageCodes | null;
    manualTargetLanguageCodes: SupportedDisplayLanguageCodes[];
    effectiveTargetLanguageCodes: SupportedDisplayLanguageCodes[];
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

function uniqueDisplayLanguageCodes(
    languageCodes: readonly SupportedDisplayLanguageCodes[],
): SupportedDisplayLanguageCodes[] {
    return Array.from(new Set(languageCodes));
}

export function getEffectiveTargetLanguageCodes({
    detectedTargetLanguageCode,
    manualTargetLanguageCodes,
}: {
    detectedTargetLanguageCode: SupportedDisplayLanguageCodes | null;
    manualTargetLanguageCodes: readonly SupportedDisplayLanguageCodes[];
}): SupportedDisplayLanguageCodes[] {
    return uniqueDisplayLanguageCodes([
        ...(detectedTargetLanguageCode === null ? [] : [detectedTargetLanguageCode]),
        ...manualTargetLanguageCodes,
    ]).slice(0, 3);
}

export function buildTranslationTargetLanguagePolicy({
    dynamicTranslationEnabled,
    detectedTargetLanguageCode,
    manualTargetLanguageCodes,
}: {
    dynamicTranslationEnabled: boolean;
    detectedTargetLanguageCode: SupportedDisplayLanguageCodes | null;
    manualTargetLanguageCodes: readonly SupportedDisplayLanguageCodes[];
}): TranslationTargetLanguagePolicy {
    const normalizedManualTargetLanguageCodes = uniqueDisplayLanguageCodes(
        manualTargetLanguageCodes,
    ).slice(0, 2);
    return {
        dynamicTranslationEnabled,
        detectedTargetLanguageCode,
        manualTargetLanguageCodes: normalizedManualTargetLanguageCodes,
        effectiveTargetLanguageCodes: getEffectiveTargetLanguageCodes({
            detectedTargetLanguageCode,
            manualTargetLanguageCodes: normalizedManualTargetLanguageCodes,
        }),
    };
}

export function isConfiguredTranslationTargetLanguage({
    policy,
    targetLanguageCode,
}: {
    policy: TranslationTargetLanguagePolicy;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): boolean {
    return policy.effectiveTargetLanguageCodes.includes(targetLanguageCode);
}

export function getManualMultilingualSettingsFromEffectiveTargets({
    effectiveMultilingualSettings,
    detectedTargetLanguageCode,
}: {
    effectiveMultilingualSettings: ConversationMultilingualSettingsInput;
    detectedTargetLanguageCode: SupportedDisplayLanguageCodes | null;
}): ConversationMultilingualSettings {
    return {
        dynamicTranslationEnabled:
            effectiveMultilingualSettings.dynamicTranslationEnabled,
        additionalLanguageCodes: uniqueDisplayLanguageCodes(
            effectiveMultilingualSettings.additionalLanguageCodes.filter(
                (languageCode) => languageCode !== detectedTargetLanguageCode,
            ),
        ).slice(0, 2),
    };
}

export function getManualMultilingualSettingsFromProjectLanguageSettings({
    languageSettings,
}: {
    languageSettings: InheritableProjectLanguageSettingsInput;
}): ConversationMultilingualSettings {
    return {
        dynamicTranslationEnabled: languageSettings.dynamicTranslationEnabled,
        additionalLanguageCodes: uniqueDisplayLanguageCodes(
            languageSettings.targetLanguageCodes,
        ).slice(0, 2),
    };
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

    const targetLanguageCodes = uniqueDisplayLanguageCodes(
        languageSettings.targetLanguageCodes,
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
    const policy = getProjectTranslationTargetLanguagePolicy({ languageSettings });
    return {
        dynamicTranslationEnabled: languageSettings.dynamicTranslationEnabled,
        // Legacy read shape. New code should use the explicit policy helpers instead.
        additionalLanguageCodes: policy.effectiveTargetLanguageCodes,
    };
}

export function getProjectTranslationTargetLanguagePolicy({
    languageSettings,
}: {
    languageSettings: InheritableProjectLanguageSettingsInput;
}): TranslationTargetLanguagePolicy {
    return buildTranslationTargetLanguagePolicy({
        dynamicTranslationEnabled: languageSettings.dynamicTranslationEnabled,
        detectedTargetLanguageCode: languageSettings.defaultLanguageCode,
        manualTargetLanguageCodes: languageSettings.targetLanguageCodes,
    });
}

export function getConversationOverrideTranslationTargetLanguagePolicy({
    multilingualSettings,
    detectedTargetLanguageCode,
}: {
    multilingualSettings: ConversationMultilingualSettings;
    detectedTargetLanguageCode: SupportedDisplayLanguageCodes | null;
}): TranslationTargetLanguagePolicy {
    return buildTranslationTargetLanguagePolicy({
        dynamicTranslationEnabled: multilingualSettings.dynamicTranslationEnabled,
        detectedTargetLanguageCode,
        manualTargetLanguageCodes: multilingualSettings.additionalLanguageCodes,
    });
}
