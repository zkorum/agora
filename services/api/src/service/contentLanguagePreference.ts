import {
    getDisplayLanguageFallbackChain,
    type SupportedDisplayLanguageCodes,
} from "@/shared/languages.js";

export function resolvePreferredContentLanguage({
    displayLanguage,
    defaultContentLanguage,
    configuredContentLanguages,
}: {
    displayLanguage: SupportedDisplayLanguageCodes;
    defaultContentLanguage: SupportedDisplayLanguageCodes;
    configuredContentLanguages: readonly SupportedDisplayLanguageCodes[];
}): { preferredContentLanguage: SupportedDisplayLanguageCodes } {
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

    return { preferredContentLanguage };
}
