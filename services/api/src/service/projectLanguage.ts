import {
    getDisplayLanguageFallbackChain,
    parseDisplayLanguage,
    type SupportedDisplayLanguageCodes,
} from "@/shared/languages.js";

export interface ProjectDisplayLanguageResolution {
    selectedProjectDisplayLanguage: SupportedDisplayLanguageCodes | undefined;
    effectiveProjectDisplayLanguage: SupportedDisplayLanguageCodes;
}

export interface ProjectSupportedDisplayLanguages {
    defaultLanguageCode: SupportedDisplayLanguageCodes;
    additionalLanguageCodes: readonly SupportedDisplayLanguageCodes[];
}

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

export function resolveEffectiveProjectDisplayLanguage({
    projectSupportedDisplayLanguages,
    storedProjectDisplayLanguage,
    storedUserDisplayLanguage,
    currentDisplayLanguage,
}: {
    projectSupportedDisplayLanguages: ProjectSupportedDisplayLanguages;
    storedProjectDisplayLanguage: SupportedDisplayLanguageCodes | undefined;
    storedUserDisplayLanguage: SupportedDisplayLanguageCodes | undefined;
    currentDisplayLanguage: SupportedDisplayLanguageCodes | undefined;
}): ProjectDisplayLanguageResolution {
    const supportedLanguageCodes = new Set<SupportedDisplayLanguageCodes>([
        projectSupportedDisplayLanguages.defaultLanguageCode,
        ...projectSupportedDisplayLanguages.additionalLanguageCodes,
    ]);

    const candidates = [
        storedProjectDisplayLanguage,
        storedUserDisplayLanguage,
        currentDisplayLanguage,
    ];
    for (const candidate of candidates) {
        if (candidate === undefined) {
            continue;
        }
        for (const fallbackLanguageCode of getDisplayLanguageFallbackChain({
            languageCode: candidate,
        })) {
            if (supportedLanguageCodes.has(fallbackLanguageCode)) {
                return {
                    selectedProjectDisplayLanguage: storedProjectDisplayLanguage,
                    effectiveProjectDisplayLanguage: fallbackLanguageCode,
                };
            }
        }
    }

    return {
        selectedProjectDisplayLanguage: storedProjectDisplayLanguage,
        effectiveProjectDisplayLanguage:
            projectSupportedDisplayLanguages.defaultLanguageCode,
    };
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
