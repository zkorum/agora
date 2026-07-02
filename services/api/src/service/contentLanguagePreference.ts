import {
    getDisplayLanguageFallbackChain,
    type SupportedDisplayLanguageCodes,
    type SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import {
    getEffectiveTargetLanguageCodes,
    sourceLanguageToDisplayLanguage,
} from "./translationLanguageSetting.js";

export interface PreferredContentLanguageResolution {
    displayLanguage: SupportedDisplayLanguageCodes;
    contentLanguageFallbackChain: readonly SupportedDisplayLanguageCodes[];
    preferredContentLanguage: SupportedDisplayLanguageCodes;
}

export function resolvePreferredContentLanguage({
    displayLanguage,
    defaultContentLanguage,
    configuredContentLanguages,
}: {
    displayLanguage: SupportedDisplayLanguageCodes;
    defaultContentLanguage: SupportedDisplayLanguageCodes;
    configuredContentLanguages: readonly SupportedDisplayLanguageCodes[];
}): PreferredContentLanguageResolution {
    const contentLanguageFallbackChain = getDisplayLanguageFallbackChain({
        languageCode: displayLanguage,
    });
    const configuredLanguageSet = new Set<SupportedDisplayLanguageCodes>([
        defaultContentLanguage,
        ...configuredContentLanguages,
    ]);

    const preferredContentLanguage =
        contentLanguageFallbackChain.find((languageCode) =>
            configuredLanguageSet.has(languageCode),
        ) ?? defaultContentLanguage;

    return {
        displayLanguage,
        contentLanguageFallbackChain,
        preferredContentLanguage,
    };
}

export function resolvePreferredContentLanguageFromSettings({
    displayLanguage,
    sourceLanguageCode,
    targetLanguageCodes,
    fallbackContentLanguage,
}: {
    displayLanguage: SupportedDisplayLanguageCodes;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    targetLanguageCodes: readonly SupportedDisplayLanguageCodes[];
    fallbackContentLanguage: SupportedDisplayLanguageCodes;
}): PreferredContentLanguageResolution {
    const sourceDisplayLanguage = sourceLanguageToDisplayLanguage({
        sourceLanguageCode,
    });
    const defaultContentLanguage = sourceDisplayLanguage ?? fallbackContentLanguage;
    const configuredContentLanguages = getEffectiveTargetLanguageCodes({
        detectedTargetLanguageCode: defaultContentLanguage,
        manualTargetLanguageCodes: targetLanguageCodes,
    });

    return resolvePreferredContentLanguage({
        displayLanguage,
        defaultContentLanguage,
        configuredContentLanguages,
    });
}
