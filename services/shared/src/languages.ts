import { z } from "zod";

// Master enum containing all language codes used in the metadata list
export const ZodAllLanguageCodes = z.enum([
    "en",
    "es",
    "fr",
    "en-GB",
    "ar",
    "ar-fem",
    "bn",
    "eu",
    "bg",
    "ca",
    "hr",
    "cs",
    "da",
    "nl",
    "fil",
    "fi",
    "gl",
    "de",
    "el",
    "gu",
    "he",
    "hi",
    "hu",
    "id",
    "ga",
    "it",
    "ja",
    "kn",
    "ko",
    "ms",
    "mr",
    "no",
    "fa",
    "pl",
    "pt",
    "ro",
    "ru",
    "sr",
    "zh-Hans",
    "sk",
    "sv",
    "ta",
    "th",
    "zh-Hant",
    "tr",
    "uk",
    "ur",
    "vi",
]);
export type AllLanguageCodes = z.infer<typeof ZodAllLanguageCodes>;

// All languages that can be processed for spoken language (derived from metadata list)
export const ZodSupportedSpokenLanguageCodes = ZodAllLanguageCodes;
export type SupportedSpokenLanguageCodes = AllLanguageCodes;

// Languages that have UI translations available
export const ZodSupportedDisplayLanguageCodes = z.enum(["en", "es", "fr"]);
export type SupportedDisplayLanguageCodes = z.infer<
    typeof ZodSupportedDisplayLanguageCodes
>;

// Full language data with BCP 47 codes
export interface LanguageMetadata {
    code: AllLanguageCodes; // BCP 47 format (e.g., 'en', 'en-GB', 'zh-Hans')
    name: string; // Native name (e.g., 'English', 'Español', '中文')
    englishName: string; // English name for searching
    script?: string; // Optional script code
    region?: string; // Optional region code
    variant?: string; // Optional variant
    displaySupported: boolean; // Whether this can be used as display language
}

// Type-safe interface for display languages only
export interface DisplayLanguageMetadata extends LanguageMetadata {
    code: SupportedDisplayLanguageCodes;
    displaySupported: true;
}

// Comprehensive language list for spoken languages
export const SupportedSpokenLanguageMetadataList: LanguageMetadata[] = [
    // Display-supported languages (UI translations available)
    {
        code: "en",
        name: "English",
        englishName: "English",
        displaySupported: true,
    },
    {
        code: "es",
        name: "español",
        englishName: "Spanish",
        displaySupported: true,
    },
    {
        code: "fr",
        name: "français",
        englishName: "French",
        displaySupported: true,
    },

    // Additional languages (for spoken languages only)
    {
        code: "en-GB",
        name: "British English",
        englishName: "British English",
        region: "GB",
        displaySupported: false,
    },
    {
        code: "ar",
        name: "العربية",
        englishName: "Arabic",
        displaySupported: false,
    },
    {
        code: "ar-fem",
        name: "العربية (مؤنث)",
        englishName: "Arabic (Feminine)",
        variant: "fem",
        displaySupported: false,
    },
    {
        code: "bn",
        name: "বাংলা",
        englishName: "Bangla",
        displaySupported: false,
    },
    {
        code: "eu",
        name: "euskara",
        englishName: "Basque",
        displaySupported: false,
    },
    {
        code: "bg",
        name: "български",
        englishName: "Bulgarian",
        displaySupported: false,
    },
    {
        code: "ca",
        name: "català",
        englishName: "Catalan",
        displaySupported: false,
    },
    {
        code: "hr",
        name: "hrvatski",
        englishName: "Croatian",
        displaySupported: false,
    },
    {
        code: "cs",
        name: "čeština",
        englishName: "Czech",
        displaySupported: false,
    },
    {
        code: "da",
        name: "dansk",
        englishName: "Danish",
        displaySupported: false,
    },
    {
        code: "nl",
        name: "Nederlands",
        englishName: "Dutch",
        displaySupported: false,
    },
    {
        code: "fil",
        name: "Filipino",
        englishName: "Filipino",
        displaySupported: false,
    },
    {
        code: "fi",
        name: "suomi",
        englishName: "Finnish",
        displaySupported: false,
    },
    {
        code: "gl",
        name: "galego",
        englishName: "Galician",
        displaySupported: false,
    },
    {
        code: "de",
        name: "Deutsch",
        englishName: "German",
        displaySupported: false,
    },
    {
        code: "el",
        name: "Ελληνικά",
        englishName: "Greek",
        displaySupported: false,
    },
    {
        code: "gu",
        name: "ગુજરાતી",
        englishName: "Gujarati",
        displaySupported: false,
    },
    {
        code: "he",
        name: "עברית",
        englishName: "Hebrew",
        displaySupported: false,
    },
    {
        code: "hi",
        name: "हिन्दी",
        englishName: "Hindi",
        displaySupported: false,
    },
    {
        code: "hu",
        name: "magyar",
        englishName: "Hungarian",
        displaySupported: false,
    },
    {
        code: "id",
        name: "Indonesia",
        englishName: "Indonesian",
        displaySupported: false,
    },
    {
        code: "ga",
        name: "Gaeilge",
        englishName: "Irish",
        displaySupported: false,
    },
    {
        code: "it",
        name: "italiano",
        englishName: "Italian",
        displaySupported: false,
    },
    {
        code: "ja",
        name: "日本語",
        englishName: "Japanese",
        displaySupported: false,
    },
    {
        code: "kn",
        name: "ಕನ್ನಡ",
        englishName: "Kannada",
        displaySupported: false,
    },
    {
        code: "ko",
        name: "한국어",
        englishName: "Korean",
        displaySupported: false,
    },
    {
        code: "ms",
        name: "Melayu",
        englishName: "Malay",
        displaySupported: false,
    },
    {
        code: "mr",
        name: "मराठी",
        englishName: "Marathi",
        displaySupported: false,
    },
    {
        code: "no",
        name: "norsk",
        englishName: "Norwegian",
        displaySupported: false,
    },
    {
        code: "fa",
        name: "فارسی",
        englishName: "Persian",
        displaySupported: false,
    },
    {
        code: "pl",
        name: "polski",
        englishName: "Polish",
        displaySupported: false,
    },
    {
        code: "pt",
        name: "português",
        englishName: "Portuguese",
        displaySupported: false,
    },
    {
        code: "ro",
        name: "română",
        englishName: "Romanian",
        displaySupported: false,
    },
    {
        code: "ru",
        name: "русский",
        englishName: "Russian",
        displaySupported: false,
    },
    {
        code: "sr",
        name: "српски",
        englishName: "Serbian",
        displaySupported: false,
    },
    {
        code: "zh-Hans",
        name: "简体中文",
        englishName: "Simplified Chinese",
        script: "Hans",
        displaySupported: false,
    },
    {
        code: "sk",
        name: "slovenčina",
        englishName: "Slovak",
        displaySupported: false,
    },
    {
        code: "sv",
        name: "svenska",
        englishName: "Swedish",
        displaySupported: false,
    },
    {
        code: "ta",
        name: "தமிழ்",
        englishName: "Tamil",
        displaySupported: false,
    },
    { code: "th", name: "ไทย", englishName: "Thai", displaySupported: false },
    {
        code: "zh-Hant",
        name: "繁體中文",
        englishName: "Traditional Chinese",
        script: "Hant",
        displaySupported: false,
    },
    {
        code: "tr",
        name: "Türkçe",
        englishName: "Turkish",
        displaySupported: false,
    },
    {
        code: "uk",
        name: "українська",
        englishName: "Ukrainian",
        displaySupported: false,
    },
    { code: "ur", name: "اردو", englishName: "Urdu", displaySupported: false },
    {
        code: "vi",
        name: "Tiếng Việt",
        englishName: "Vietnamese",
        displaySupported: false,
    },
];

// Helper functions
export function getLanguageByCode(code: string): LanguageMetadata | undefined {
    return SupportedSpokenLanguageMetadataList.find(
        (lang) => lang.code === code,
    );
}

export function getDisplayLanguages(): DisplayLanguageMetadata[] {
    return SupportedSpokenLanguageMetadataList.filter(
        (lang): lang is DisplayLanguageMetadata =>
            lang.displaySupported &&
            ZodSupportedDisplayLanguageCodes.options.includes(
                lang.code as SupportedDisplayLanguageCodes,
            ),
    );
}

export function getSpokenLanguages(): LanguageMetadata[] {
    return SupportedSpokenLanguageMetadataList; // All languages can be spoken languages
}

/**
 * Normalize language code to match our supported languages
 * e.g., 'en-US' -> 'en' (for display languages)
 */
export function normalizeLanguageCode(
    code: string,
    forDisplay: true,
): SupportedDisplayLanguageCodes;
export function normalizeLanguageCode(
    code: string,
    forDisplay?: false,
): SupportedSpokenLanguageCodes;
export function normalizeLanguageCode(
    code: string,
    forDisplay = false,
): SupportedDisplayLanguageCodes | SupportedSpokenLanguageCodes {
    if (!code) return "en";

    const lowered = code.toLowerCase();

    // For display languages, simplify to primary language
    if (forDisplay) {
        const primary = lowered.split("-")[0];
        if (
            ZodSupportedDisplayLanguageCodes.options.includes(
                primary as SupportedDisplayLanguageCodes,
            )
        ) {
            return primary as SupportedDisplayLanguageCodes;
        }
        return "en"; // Default
    }

    // For spoken languages, try exact match first
    const exactMatch = SupportedSpokenLanguageMetadataList.find(
        (lang) => lang.code.toLowerCase() === lowered,
    );
    if (exactMatch) return exactMatch.code;

    // Try primary language match
    const primary = lowered.split("-")[0];
    const primaryMatch = SupportedSpokenLanguageMetadataList.find(
        (lang) => lang.code.toLowerCase().split("-")[0] === primary,
    );
    if (primaryMatch) return primaryMatch.code;

    return "en"; // Default
}

/**
 * Parse browser language to our supported format
 */
export function parseBrowserLanguage(browserLang: string): {
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
} {
    const normalized = normalizeLanguageCode(browserLang, true);
    const spoken = normalizeLanguageCode(browserLang, false);

    return {
        displayLanguage: normalized,
        spokenLanguages: [spoken],
    };
}

/**
 * Sort languages alphabetically by their English name
 */
export function sortLanguagesByEnglishName(
    langs: LanguageMetadata[],
): LanguageMetadata[] {
    return [...langs].sort((a, b) =>
        a.englishName.localeCompare(b.englishName),
    );
}

/**
 * Sort languages alphabetically by their native name
 */
export function sortLanguagesByNativeName(
    langs: LanguageMetadata[],
): LanguageMetadata[] {
    return [...langs].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Search languages by name (native or English)
 */
export function searchLanguages(
    query: string,
    langs: LanguageMetadata[] = SupportedSpokenLanguageMetadataList,
): LanguageMetadata[] {
    const lowerQuery = query.toLowerCase();
    return langs.filter(
        (lang) =>
            lang.name.toLowerCase().includes(lowerQuery) ||
            lang.englishName.toLowerCase().includes(lowerQuery) ||
            lang.code.toLowerCase().includes(lowerQuery),
    );
}

/**
 * Validate if a language code exists in our supported list
 */
export function isValidLanguageCode(code: string): boolean {
    return SupportedSpokenLanguageMetadataList.some(
        (lang) => lang.code === code,
    );
}

/**
 * Validate if a language code is a valid display language
 */
export function isValidDisplayLanguageCode(code: string): boolean {
    return ZodSupportedDisplayLanguageCodes.safeParse(code).success;
}

/**
 * Validate and return a SupportedDisplayLanguageCodes if the code is valid, otherwise undefined
 */
export function toSupportedDisplayLanguageCode(
    code: string,
): SupportedDisplayLanguageCodes | undefined {
    const result = ZodSupportedDisplayLanguageCodes.safeParse(code);
    return result.success ? result.data : undefined;
}

/**
 * Validate and return a SupportedSpokenLanguageCodes if the code is valid, otherwise undefined
 */
export function toSupportedSpokenLanguageCode(
    code: string,
): SupportedSpokenLanguageCodes | undefined {
    const result = ZodSupportedSpokenLanguageCodes.safeParse(code);
    return result.success ? result.data : undefined;
}

/**
 * Validate that display language metadata is consistent
 * Internal function to ensure data integrity
 */
function validateDisplayLanguageConsistency(): void {
    const displayLanguages = SupportedSpokenLanguageMetadataList.filter(
        (lang) => lang.displaySupported,
    );
    const invalidDisplayLanguages = displayLanguages.filter(
        (lang) =>
            !ZodSupportedDisplayLanguageCodes.options.includes(
                lang.code as SupportedDisplayLanguageCodes,
            ),
    );

    if (invalidDisplayLanguages.length > 0) {
        console.warn(
            `Warning: Found languages marked as displaySupported but not in SupportedDisplayLanguageCodes:`,
            invalidDisplayLanguages.map((lang) => lang.code),
        );
    }
}

/**
 * Get display language metadata by code (type-safe)
 */
export function getDisplayLanguageByCode(
    code: SupportedDisplayLanguageCodes,
): DisplayLanguageMetadata | undefined {
    return getDisplayLanguages().find((lang) => lang.code === code);
}

// Run validation in development
if (process.env.NODE_ENV !== "production") {
    validateDisplayLanguageConsistency();
}
