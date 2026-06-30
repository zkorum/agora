import {
    getDisplayLanguageFallbackChain,
    parseDisplayLanguage,
    type SupportedDisplayLanguageCodes,
} from "@/shared/languages.js";

export interface OrganizationLocalizationRow {
    languageCode: SupportedDisplayLanguageCodes;
    displayName: string;
    description: string;
    websiteUrl: string | null;
    imagePath: string | null;
    isFullImagePath: boolean;
}

export function getImplicitDefaultDisplayLanguage(): SupportedDisplayLanguageCodes {
    return parseDisplayLanguage("");
}

export function getAutoProvisionedDefaultLanguage({
    storedUserDisplayLanguage,
    currentDisplayLanguage,
}: {
    storedUserDisplayLanguage: SupportedDisplayLanguageCodes | undefined;
    currentDisplayLanguage: SupportedDisplayLanguageCodes | undefined;
}): SupportedDisplayLanguageCodes {
    return (
        storedUserDisplayLanguage ??
        currentDisplayLanguage ??
        getImplicitDefaultDisplayLanguage()
    );
}

export function resolveOrganizationLocalizationRow({
    defaultRow,
    additionalRows,
    effectiveLanguageCode,
}: {
    defaultRow: OrganizationLocalizationRow;
    additionalRows: readonly OrganizationLocalizationRow[];
    effectiveLanguageCode: SupportedDisplayLanguageCodes;
}): OrganizationLocalizationRow {
    const rowsByLanguageCode = new Map(
        [defaultRow, ...additionalRows].map((row) => [row.languageCode, row]),
    );

    for (const fallbackLanguageCode of getDisplayLanguageFallbackChain({
        languageCode: effectiveLanguageCode,
    })) {
        const row = rowsByLanguageCode.get(fallbackLanguageCode);
        if (row !== undefined) {
            return row;
        }
    }

    return defaultRow;
}
