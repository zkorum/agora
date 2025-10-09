/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";

// Master enum containing all language codes used in the metadata list
export const ZodAllLanguageCodes = z.enum([
    "en",
    "es",
    "fr",
    "en-GB",
    "ar",
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
    "sk",
    "sv",
    "ta",
    "th",
    "tr",
    "uk",
    "ur",
    "vi",
    "zh-Hans",
    "zh-Hant",
    "ja",
]);
export type AllLanguageCodes = z.infer<typeof ZodAllLanguageCodes>;

// All languages that can be processed for spoken language (derived from metadata list)
export const ZodSupportedSpokenLanguageCodes = ZodAllLanguageCodes;
export type SupportedSpokenLanguageCodes = AllLanguageCodes;

// Languages that have UI translations available
export const ZodSupportedDisplayLanguageCodes = z.enum([
    "en",
    "es",
    "fr",
    "zh-Hant",
    "zh-Hans",
    "ja",
    "ar",
]);
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
    {
        code: "zh-Hans",
        name: "简体中文",
        englishName: "Simplified Chinese",
        script: "Hans",
        displaySupported: true,
    },
    {
        code: "zh-Hant",
        name: "繁體中文",
        englishName: "Traditional Chinese",
        script: "Hant",
        displaySupported: true,
    },
    {
        code: "ja",
        name: "日本語",
        englishName: "Japanese",
        displaySupported: true,
    },
    {
        code: "ar",
        name: "العربية",
        englishName: "Arabic",
        displaySupported: true,
    },
    // Additional languages (for spoken languages only)
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
    {
        code: "th",
        name: "ไทย",
        englishName: "Thai",
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
    {
        code: "ur",
        name: "اردو",
        englishName: "Urdu",
        displaySupported: false,
    },
    {
        code: "vi",
        name: "Tiếng Việt",
        englishName: "Vietnamese",
        displaySupported: false,
    },
];

/**
 * Normalize language code to match our supported languages with Zod transform
 * e.g., 'en-US' -> 'en' (for display languages)
 */
export function parseDisplayLanguage(
    code: string,
): SupportedDisplayLanguageCodes {
    if (!code) return "en";

    // Try specific exact match first
    const exactMatch = ZodSupportedDisplayLanguageCodes.safeParse(code);
    if (exactMatch.success) return exactMatch.data;

    // Handle fallbacks
    if (code === "zh-HK" || code === "zh-TW" || code === "zh-MO") {
        return "zh-Hant";
    }
    if (code.startsWith("zh")) return "zh-Hans";

    // Try primary language match
    const primary = code.split("-")[0];
    const result = ZodSupportedDisplayLanguageCodes.safeParse(primary);
    if (result.success) return result.data;

    // Else default to English
    return "en";
}

export function parseSpokenLanguage(
    code: string,
): SupportedSpokenLanguageCodes {
    if (!code) return "en";

    // Try specific exact match first
    const exactMatch = SupportedSpokenLanguageMetadataList.find(
        (lang) => lang.code.toLowerCase() === code,
    );
    if (exactMatch !== undefined) return exactMatch.code;

    // Handle fallbacks
    if (code === "zh-HK" || code === "zh-TW" || code === "zh-MO") {
        return "zh-Hant";
    }
    if (code.startsWith("zh")) return "zh-Hans";

    // Try primary language match
    const primary = code.split("-")[0];
    const primaryMatch = SupportedSpokenLanguageMetadataList.find(
        (lang) => lang.code.toLowerCase().split("-")[0] === primary,
    );
    if (primaryMatch !== undefined) return primaryMatch.code;

    // Else default to English
    return "en";
}
