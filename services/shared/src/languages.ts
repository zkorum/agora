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
    flagCode?: string; // ISO 3166-1 alpha-2 country code for flag
    flagCountryName?: string; // Country name for accessibility
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
        flagCode: "us",
        flagCountryName: "United States",
    },
    {
        code: "es",
        name: "español",
        englishName: "Spanish",
        displaySupported: true,
        flagCode: "es",
        flagCountryName: "Spain",
    },
    {
        code: "fr",
        name: "français",
        englishName: "French",
        displaySupported: true,
        flagCode: "fr",
        flagCountryName: "France",
    },

    // Additional languages (for spoken languages only)
    {
        code: "en-GB",
        name: "British English",
        englishName: "British English",
        region: "GB",
        displaySupported: false,
        flagCode: "gb",
        flagCountryName: "United Kingdom",
    },
    {
        code: "ar",
        name: "العربية",
        englishName: "Arabic",
        displaySupported: false,
        flagCode: "sa",
        flagCountryName: "Saudi Arabia",
    },
    {
        code: "ar-fem",
        name: "العربية (مؤنث)",
        englishName: "Arabic (Feminine)",
        variant: "fem",
        displaySupported: false,
        flagCode: "sa",
        flagCountryName: "Saudi Arabia",
    },
    {
        code: "bn",
        name: "বাংলা",
        englishName: "Bangla",
        displaySupported: false,
        flagCode: "bd",
        flagCountryName: "Bangladesh",
    },
    {
        code: "eu",
        name: "euskara",
        englishName: "Basque",
        displaySupported: false,
        flagCode: "es",
        flagCountryName: "Spain (Basque)",
    },
    {
        code: "bg",
        name: "български",
        englishName: "Bulgarian",
        displaySupported: false,
        flagCode: "bg",
        flagCountryName: "Bulgaria",
    },
    {
        code: "ca",
        name: "català",
        englishName: "Catalan",
        displaySupported: false,
        flagCode: "es",
        flagCountryName: "Spain (Catalan)",
    },
    {
        code: "hr",
        name: "hrvatski",
        englishName: "Croatian",
        displaySupported: false,
        flagCode: "hr",
        flagCountryName: "Croatia",
    },
    {
        code: "cs",
        name: "čeština",
        englishName: "Czech",
        displaySupported: false,
        flagCode: "cz",
        flagCountryName: "Czech Republic",
    },
    {
        code: "da",
        name: "dansk",
        englishName: "Danish",
        displaySupported: false,
        flagCode: "dk",
        flagCountryName: "Denmark",
    },
    {
        code: "nl",
        name: "Nederlands",
        englishName: "Dutch",
        displaySupported: false,
        flagCode: "nl",
        flagCountryName: "Netherlands",
    },
    {
        code: "fil",
        name: "Filipino",
        englishName: "Filipino",
        displaySupported: false,
        flagCode: "ph",
        flagCountryName: "Philippines",
    },
    {
        code: "fi",
        name: "suomi",
        englishName: "Finnish",
        displaySupported: false,
        flagCode: "fi",
        flagCountryName: "Finland",
    },
    {
        code: "gl",
        name: "galego",
        englishName: "Galician",
        displaySupported: false,
        flagCode: "es",
        flagCountryName: "Spain (Galician)",
    },
    {
        code: "de",
        name: "Deutsch",
        englishName: "German",
        displaySupported: false,
        flagCode: "de",
        flagCountryName: "Germany",
    },
    {
        code: "el",
        name: "Ελληνικά",
        englishName: "Greek",
        displaySupported: false,
        flagCode: "gr",
        flagCountryName: "Greece",
    },
    {
        code: "gu",
        name: "ગુજરાતી",
        englishName: "Gujarati",
        displaySupported: false,
        flagCode: "in",
        flagCountryName: "India (Gujarati)",
    },
    {
        code: "he",
        name: "עברית",
        englishName: "Hebrew",
        displaySupported: false,
        flagCode: "il",
        flagCountryName: "Israel",
    },
    {
        code: "hi",
        name: "हिन्दी",
        englishName: "Hindi",
        displaySupported: false,
        flagCode: "in",
        flagCountryName: "India",
    },
    {
        code: "hu",
        name: "magyar",
        englishName: "Hungarian",
        displaySupported: false,
        flagCode: "hu",
        flagCountryName: "Hungary",
    },
    {
        code: "id",
        name: "Indonesia",
        englishName: "Indonesian",
        displaySupported: false,
        flagCode: "id",
        flagCountryName: "Indonesia",
    },
    {
        code: "ga",
        name: "Gaeilge",
        englishName: "Irish",
        displaySupported: false,
        flagCode: "ie",
        flagCountryName: "Ireland",
    },
    {
        code: "it",
        name: "italiano",
        englishName: "Italian",
        displaySupported: false,
        flagCode: "it",
        flagCountryName: "Italy",
    },
    {
        code: "ja",
        name: "日本語",
        englishName: "Japanese",
        displaySupported: false,
        flagCode: "jp",
        flagCountryName: "Japan",
    },
    {
        code: "kn",
        name: "ಕನ್ನಡ",
        englishName: "Kannada",
        displaySupported: false,
        flagCode: "in",
        flagCountryName: "India (Kannada)",
    },
    {
        code: "ko",
        name: "한국어",
        englishName: "Korean",
        displaySupported: false,
        flagCode: "kr",
        flagCountryName: "South Korea",
    },
    {
        code: "ms",
        name: "Melayu",
        englishName: "Malay",
        displaySupported: false,
        flagCode: "my",
        flagCountryName: "Malaysia",
    },
    {
        code: "mr",
        name: "मराठी",
        englishName: "Marathi",
        displaySupported: false,
        flagCode: "in",
        flagCountryName: "India (Marathi)",
    },
    {
        code: "no",
        name: "norsk",
        englishName: "Norwegian",
        displaySupported: false,
        flagCode: "no",
        flagCountryName: "Norway",
    },
    {
        code: "fa",
        name: "فارسی",
        englishName: "Persian",
        displaySupported: false,
        flagCode: "ir",
        flagCountryName: "Iran",
    },
    {
        code: "pl",
        name: "polski",
        englishName: "Polish",
        displaySupported: false,
        flagCode: "pl",
        flagCountryName: "Poland",
    },
    {
        code: "pt",
        name: "português",
        englishName: "Portuguese",
        displaySupported: false,
        flagCode: "pt",
        flagCountryName: "Portugal",
    },
    {
        code: "ro",
        name: "română",
        englishName: "Romanian",
        displaySupported: false,
        flagCode: "ro",
        flagCountryName: "Romania",
    },
    {
        code: "ru",
        name: "русский",
        englishName: "Russian",
        displaySupported: false,
        flagCode: "ru",
        flagCountryName: "Russia",
    },
    {
        code: "sr",
        name: "српски",
        englishName: "Serbian",
        displaySupported: false,
        flagCode: "rs",
        flagCountryName: "Serbia",
    },
    {
        code: "zh-Hans",
        name: "简体中文",
        englishName: "Simplified Chinese",
        script: "Hans",
        displaySupported: false,
        flagCode: "cn",
        flagCountryName: "China",
    },
    {
        code: "sk",
        name: "slovenčina",
        englishName: "Slovak",
        displaySupported: false,
        flagCode: "sk",
        flagCountryName: "Slovakia",
    },
    {
        code: "sv",
        name: "svenska",
        englishName: "Swedish",
        displaySupported: false,
        flagCode: "se",
        flagCountryName: "Sweden",
    },
    {
        code: "ta",
        name: "தமிழ்",
        englishName: "Tamil",
        displaySupported: false,
        flagCode: "in",
        flagCountryName: "India (Tamil)",
    },
    {
        code: "th",
        name: "ไทย",
        englishName: "Thai",
        displaySupported: false,
        flagCode: "th",
        flagCountryName: "Thailand",
    },
    {
        code: "zh-Hant",
        name: "繁體中文",
        englishName: "Traditional Chinese",
        script: "Hant",
        displaySupported: false,
        flagCode: "tw",
        flagCountryName: "Taiwan",
    },
    {
        code: "tr",
        name: "Türkçe",
        englishName: "Turkish",
        displaySupported: false,
        flagCode: "tr",
        flagCountryName: "Turkey",
    },
    {
        code: "uk",
        name: "українська",
        englishName: "Ukrainian",
        displaySupported: false,
        flagCode: "ua",
        flagCountryName: "Ukraine",
    },
    {
        code: "ur",
        name: "اردو",
        englishName: "Urdu",
        displaySupported: false,
        flagCode: "pk",
        flagCountryName: "Pakistan",
    },
    {
        code: "vi",
        name: "Tiếng Việt",
        englishName: "Vietnamese",
        displaySupported: false,
        flagCode: "vn",
        flagCountryName: "Vietnam",
    },
];

/**
 * Normalize language code to match our supported languages with Zod transform
 * e.g., 'en-US' -> 'en' (for display languages)
 */
export const ZodNormalizeDisplayLanguageCode = z.string().transform((code) => {
    if (!code) return "en";

    const lowered = code.toLowerCase();
    const primary = lowered.split("-")[0];

    const result = ZodSupportedDisplayLanguageCodes.safeParse(primary);
    return result.success ? result.data : "en";
});

export const ZodNormalizeSpokenLanguageCode = z.string().transform((code) => {
    if (!code) return "en";

    const lowered = code.toLowerCase();

    // Try exact match first
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

    return "en";
});

/**
 * Parse browser language to our supported format with Zod
 */
export const ZodParseBrowserLanguage = z.string().transform((browserLang) => {
    const displayLanguage = ZodNormalizeDisplayLanguageCode.parse(browserLang);
    const spokenLanguage = ZodNormalizeSpokenLanguageCode.parse(browserLang);

    return {
        displayLanguage,
        spokenLanguages: [spokenLanguage] as SupportedSpokenLanguageCodes[],
    };
});
