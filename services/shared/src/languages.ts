import { z } from "zod";

// Canonical product-level spoken/source languages. Regional variants are
// normalized to these values before product decisions such as translation skip.
const SUPPORTED_SPOKEN_LANGUAGE_CODES = [
    "af",
    "ak",
    "am",
    "ar",
    "as",
    "ay",
    "az",
    "be",
    "bg",
    "bho",
    "bm",
    "bn",
    "bs",
    "ca",
    "ceb",
    "ckb",
    "co",
    "cs",
    "cy",
    "da",
    "de",
    "doi",
    "dv",
    "ee",
    "el",
    "en",
    "eo",
    "es",
    "et",
    "eu",
    "fa",
    "fi",
    "fil",
    "fr",
    "fy",
    "ga",
    "gd",
    "gl",
    "gn",
    "gom",
    "gu",
    "ha",
    "haw",
    "he",
    "hi",
    "hmn",
    "hr",
    "ht",
    "hu",
    "hy",
    "id",
    "ig",
    "ilo",
    "is",
    "it",
    "ja",
    "jv",
    "ka",
    "kk",
    "km",
    "kn",
    "ko",
    "kri",
    "ku",
    "ky",
    "la",
    "lb",
    "lg",
    "ln",
    "lo",
    "lt",
    "lus",
    "lv",
    "mai",
    "mg",
    "mi",
    "mk",
    "ml",
    "mn",
    "mni-Mtei",
    "mr",
    "ms",
    "mt",
    "my",
    "nb",
    "ne",
    "nl",
    "nn",
    "no",
    "nso",
    "ny",
    "om",
    "or",
    "pa",
    "pl",
    "ps",
    "pt",
    "qu",
    "ro",
    "ru",
    "rw",
    "sa",
    "sd",
    "si",
    "sk",
    "sl",
    "sm",
    "sn",
    "so",
    "sq",
    "sr",
    "st",
    "su",
    "sv",
    "sw",
    "ta",
    "te",
    "tg",
    "th",
    "ti",
    "tk",
    "tn",
    "tr",
    "ts",
    "tt",
    "ug",
    "uk",
    "ur",
    "uz",
    "vi",
    "xh",
    "yi",
    "yo",
    "zh-Hans",
    "zh-Hant",
    "zu",
] as const;
export const ZodSupportedSpokenLanguageCodes = z.enum(
    SUPPORTED_SPOKEN_LANGUAGE_CODES,
);
export type SupportedSpokenLanguageCodes = z.infer<
    typeof ZodSupportedSpokenLanguageCodes
>;

export const ZodDetectedSourceLanguageCode = ZodSupportedSpokenLanguageCodes;
export type DetectedSourceLanguageCode = SupportedSpokenLanguageCodes;

// Normalized source-language codes we intentionally recognize from detectors.
// Raw provider outputs may be broader and should stay as strings at boundaries.
export const ZodNormalizedLanguageCodes = ZodSupportedSpokenLanguageCodes;
export type NormalizedLanguageCodes = z.infer<typeof ZodNormalizedLanguageCodes>;

const RTL_LANGUAGE_CODES: readonly string[] = ["ar", "fa", "he", "ur"];

export type LanguageTextDirection = "ltr" | "rtl";

export function getLanguageTextDirection(
    languageCode: string,
): LanguageTextDirection {
    const primaryLanguageCode = languageCode.split("-")[0] ?? languageCode;
    return RTL_LANGUAGE_CODES.includes(primaryLanguageCode) ? "rtl" : "ltr";
}

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
    "ky",
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
]);
export type AllLanguageCodes = z.infer<typeof ZodAllLanguageCodes>;

// Languages that have UI translations available
export const ZodSupportedDisplayLanguageCodes =
    ZodSupportedSpokenLanguageCodes.extract([
        "en",
        "es",
        "fr",
        "zh-Hant",
        "zh-Hans",
        "ja",
        "ar",
        "fa",
        "he",
        "ky",
        "ru",
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

export function getDisplayLanguageFallbackChain({
    languageCode,
}: {
    languageCode: SupportedDisplayLanguageCodes;
}): SupportedDisplayLanguageCodes[] {
    switch (languageCode) {
        case "zh-Hant":
            return ["zh-Hant", "zh-Hans", "en"];
        case "zh-Hans":
            return ["zh-Hans", "zh-Hant", "en"];
        case "fa":
            return ["fa", "ar", "en"];
        case "ky":
            return ["ky", "ru", "en"];
        case "en":
            return ["en"];
        default:
            return [languageCode, "en"];
    }
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
        displaySupported: true,
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
        code: "ky",
        name: "кыргызча",
        englishName: "Kyrgyz",
        displaySupported: true,
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
        displaySupported: true,
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
        displaySupported: true,
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

export function parseSupportedDisplayLanguageOrUndefined(
    code: string,
): SupportedDisplayLanguageCodes | undefined {
    const trimmedCode = code.trim();
    if (trimmedCode.length === 0) return undefined;

    const exactMatch = ZodSupportedDisplayLanguageCodes.safeParse(trimmedCode);
    if (exactMatch.success) return exactMatch.data;

    let normalizedCode = trimmedCode;
    try {
        normalizedCode = Intl.getCanonicalLocales(trimmedCode)[0] ?? trimmedCode;
    } catch {
        normalizedCode = trimmedCode;
    }

    const normalizedExactMatch =
        ZodSupportedDisplayLanguageCodes.safeParse(normalizedCode);
    if (normalizedExactMatch.success) return normalizedExactMatch.data;

    if (
        normalizedCode === "zh-HK" ||
        normalizedCode === "zh-TW" ||
        normalizedCode === "zh-MO"
    ) {
        return "zh-Hant";
    }
    if (normalizedCode.startsWith("zh")) return "zh-Hans";

    const primary = normalizedCode.split("-")[0];
    const primaryMatch = ZodSupportedDisplayLanguageCodes.safeParse(primary);
    if (primaryMatch.success) return primaryMatch.data;

    return undefined;
}

export function parseNormalizedLanguageOrUndefined(
    code: string,
): NormalizedLanguageCodes | undefined {
    return parseSupportedSpokenLanguageOrUndefined(code);
}

export function parseSupportedSpokenLanguageOrUndefined(
    code: string,
): SupportedSpokenLanguageCodes | undefined {
    const trimmedCode = code.trim().replaceAll("_", "-");
    if (trimmedCode.length === 0) return undefined;

    const exactMatch = ZodSupportedSpokenLanguageCodes.safeParse(trimmedCode);
    if (exactMatch.success) return exactMatch.data;

    let normalizedCode = trimmedCode;
    try {
        normalizedCode = Intl.getCanonicalLocales(trimmedCode)[0] ?? trimmedCode;
    } catch {
        normalizedCode = trimmedCode;
    }

    if (
        normalizedCode === "zh-HK" ||
        normalizedCode === "zh-TW" ||
        normalizedCode === "zh-MO"
    ) {
        return "zh-Hant";
    }
    if (normalizedCode.startsWith("zh")) return "zh-Hans";

    const normalizedExactMatch =
        ZodSupportedSpokenLanguageCodes.safeParse(normalizedCode);
    if (normalizedExactMatch.success) return normalizedExactMatch.data;

    const primary = normalizedCode.split("-")[0];
    const primaryMatch = ZodSupportedSpokenLanguageCodes.safeParse(primary);
    if (primaryMatch.success) return primaryMatch.data;

    return undefined;
}

export function parseDetectedSourceLanguageOrUndefined(
    code: string,
): DetectedSourceLanguageCode | undefined {
    return parseSupportedSpokenLanguageOrUndefined(code);
}

export function parseSpokenLanguage(
    code: string,
): SupportedSpokenLanguageCodes {
    return parseSupportedSpokenLanguageOrUndefined(code) ?? "en";
}
