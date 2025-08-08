/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MOFIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";

export const ZodSupportedDisplayLanguageCodes = z.enum(["en", "es", "fr"]);
export type SupportedDisplayLanguageCodes = z.infer<
    typeof ZodSupportedDisplayLanguageCodes
>;
export const ZodSupportedAllLanguageCodes = z.enum([
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "nl",
    "ru",
    "zh",
    "ja",
    "ko",
    "ar",
    "hi",
    "bn",
    "pa",
    "tr",
    "vi",
    "pl",
    "uk",
    "ro",
    "el",
    "he",
    "sv",
    "no",
    "da",
    "fi",
    "cs",
    "hu",
    "th",
    "id",
    "ms",
]);
export type SupportedAllLanguageCodes = z.infer<
    typeof ZodSupportedAllLanguageCodes
>;

// Full language data with BCP 47 codes
export interface Language {
    code: string; // BCP 47 format (e.g., 'en', 'en-GB', 'zh-Hans')
    name: string; // Native name (e.g., 'English', 'Español', '中文')
    englishName: string; // English name for searching
    script?: string; // Optional script code
    region?: string; // Optional region code
    variant?: string; // Optional variant
    displaySupported: boolean; // Whether this can be used as display language
}

// Comprehensive language list for spoken languages
export const languages: Language[] = [
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
export function getLanguageByCode(code: string): Language | undefined {
    return languages.find((lang) => lang.code === code);
}

export function getDisplayLanguages(): Language[] {
    return languages.filter((lang) => lang.displaySupported);
}

export function getSpokenLanguages(): Language[] {
    return languages; // All languages can be spoken languages
}

/**
 * Normalize language code to match our supported languages
 * e.g., 'en-US' -> 'en' (for display languages)
 */
export function normalizeLanguageCode(
    code: string,
    forDisplay: boolean = false,
): SupportedDisplayLanguageCodes | SupportedAllLanguageCodes {
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
    const exactMatch = languages.find(
        (lang) => lang.code.toLowerCase() === lowered,
    );
    if (exactMatch) return exactMatch.code as SupportedAllLanguageCodes;

    // Try primary language match
    const primary = lowered.split("-")[0];
    const primaryMatch = languages.find(
        (lang) => lang.code.toLowerCase().split("-")[0] === primary,
    );
    if (primaryMatch) return primaryMatch.code as SupportedAllLanguageCodes;

    return "en"; // Default
}

/**
 * Parse browser language to our supported format
 */
export function parseBrowserLanguage(browserLang: string): {
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedAllLanguageCodes[];
} {
    const normalized = normalizeLanguageCode(
        browserLang,
        true,
    ) as SupportedDisplayLanguageCodes;
    const spoken = normalizeLanguageCode(
        browserLang,
        false,
    ) as SupportedAllLanguageCodes;

    return {
        displayLanguage: normalized,
        spokenLanguages: [spoken],
    };
}

/**
 * Sort languages alphabetically by their English name
 */
export function sortLanguagesByEnglishName(langs: Language[]): Language[] {
    return [...langs].sort((a, b) =>
        a.englishName.localeCompare(b.englishName),
    );
}

/**
 * Sort languages alphabetically by their native name
 */
export function sortLanguagesByNativeName(langs: Language[]): Language[] {
    return [...langs].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Search languages by name (native or English)
 */
export function searchLanguages(
    query: string,
    langs: Language[] = languages,
): Language[] {
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
    return languages.some((lang) => lang.code === code);
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
 * Validate and return a SupportedAllLanguageCodes if the code is valid, otherwise undefined
 */
export function toSupportedAllLanguageCode(
    code: string,
): SupportedAllLanguageCodes | undefined {
    const result = ZodSupportedAllLanguageCodes.safeParse(code);
    return result.success ? result.data : undefined;
}
