import { describe, expect, it } from "vitest";
import {
    detectLanguageWithFallback,
    hasMeaningfulCyrillicText,
    inferChineseScriptLanguage,
    LINGUA_LANGUAGE_TO_SOURCE_CODE_ENTRIES,
    type GoogleLanguageDetector,
    type LocalLanguageDetector,
} from "./languageDetection.js";
import { resolveConversationLanguageSetting } from "./conversationLanguage.js";
import {
    parseNormalizedLanguageOrUndefined,
    parseSupportedDisplayLanguageOrUndefined,
} from "@/shared/languages.js";

const LINGUA_LANGUAGE_NAMES = [
    "Afrikaans",
    "Albanian",
    "Arabic",
    "Armenian",
    "Azerbaijani",
    "Basque",
    "Belarusian",
    "Bengali",
    "Bokmal",
    "Bosnian",
    "Bulgarian",
    "Catalan",
    "Chinese",
    "Croatian",
    "Czech",
    "Danish",
    "Dutch",
    "English",
    "Esperanto",
    "Estonian",
    "Finnish",
    "French",
    "Ganda",
    "Georgian",
    "German",
    "Greek",
    "Gujarati",
    "Hebrew",
    "Hindi",
    "Hungarian",
    "Icelandic",
    "Indonesian",
    "Irish",
    "Italian",
    "Japanese",
    "Kazakh",
    "Korean",
    "Latin",
    "Latvian",
    "Lithuanian",
    "Macedonian",
    "Malay",
    "Maori",
    "Marathi",
    "Mongolian",
    "Nynorsk",
    "Persian",
    "Polish",
    "Portuguese",
    "Punjabi",
    "Romanian",
    "Russian",
    "Serbian",
    "Shona",
    "Slovak",
    "Slovene",
    "Somali",
    "Sotho",
    "Spanish",
    "Swahili",
    "Swedish",
    "Tagalog",
    "Tamil",
    "Telugu",
    "Thai",
    "Tsonga",
    "Tswana",
    "Turkish",
    "Ukrainian",
    "Urdu",
    "Vietnamese",
    "Welsh",
    "Xhosa",
    "Yoruba",
    "Zulu",
] as const;

function createLocalDetector({
    rawLanguageCode,
    confidence,
}: {
    rawLanguageCode: string;
    confidence: number | null;
}): LocalLanguageDetector {
    return {
        detect: () => Promise.resolve({ rawLanguageCode, confidence }),
    };
}

function createGoogleDetector({
    languageCode,
    confidence,
}: {
    languageCode: string;
    confidence: number;
}): GoogleLanguageDetector {
    return () => Promise.resolve({ languageCode, confidence });
}

describe("inferChineseScriptLanguage", () => {
    it("detects simplified and traditional script hints", () => {
        expect(
            inferChineseScriptLanguage({
                text: "我们应该如何改善城市公共交通，同时让所有人都能负担得起费用？",
            }),
        ).toBe("zh-Hans");
        expect(
            inferChineseScriptLanguage({
                text: "我們應該如何改善城市公共交通，同時讓所有人都能負擔得起費用？",
            }),
        ).toBe("zh-Hant");
    });

    it("returns unknown for ambiguous shared Chinese characters", () => {
        expect(inferChineseScriptLanguage({ text: "公共交通" })).toBeUndefined();
    });
});

describe("hasMeaningfulCyrillicText", () => {
    it("ignores tiny Cyrillic snippets", () => {
        expect(hasMeaningfulCyrillicText({ text: "Салам" })).toBe(false);
    });

    it("detects meaningful Cyrillic text", () => {
        expect(
            hasMeaningfulCyrillicText({
                text: "Шаарыбыздагы коомдук транспортту кантип жакшырта алабыз?",
            }),
        ).toBe(true);
    });
});

describe("Lingua normalization assumptions", () => {
    it("maps every known Lingua language name except Chinese through the source-code table", () => {
        const mappedLanguageNames = new Set(
            LINGUA_LANGUAGE_TO_SOURCE_CODE_ENTRIES.map(([languageName]) =>
                languageName,
            ),
        );
        const specialCaseLanguageNames = new Set(["Chinese"]);

        for (const languageName of LINGUA_LANGUAGE_NAMES) {
            if (specialCaseLanguageNames.has(languageName)) {
                continue;
            }
            expect(mappedLanguageNames.has(languageName), languageName).toBe(true);
        }
    });

    it("maps every Lingua source code to the normalized source-language enum", () => {
        for (const [languageName, sourceLanguageCode] of LINGUA_LANGUAGE_TO_SOURCE_CODE_ENTRIES) {
            expect(
                parseNormalizedLanguageOrUndefined(sourceLanguageCode),
                languageName,
            ).toBe(sourceLanguageCode);
        }
    });

    it("preserves Lingua raw language names and records the Lingua provider", async () => {
        for (const [languageName, sourceLanguageCode] of LINGUA_LANGUAGE_TO_SOURCE_CODE_ENTRIES) {
            const outcome = await detectLanguageWithFallback({
                text: `${languageName} civic transit discussion text with enough context`,
                localDetector: createLocalDetector({
                    rawLanguageCode: languageName,
                    confidence: 1,
                }),
            });

            expect(outcome.result, languageName).toStrictEqual({
                languageCode:
                    parseSupportedDisplayLanguageOrUndefined(sourceLanguageCode) ?? null,
                sourceLanguageCode,
                rawLanguageCode: languageName,
                provider: "lingua",
                confidence: 1,
            });
            expect(outcome.cacheable, languageName).toBe(true);
        }
    });

    it("normalizes Lingua Chinese detections using script hints", async () => {
        const traditionalOutcome = await detectLanguageWithFallback({
            text: "我們應該如何改善城市公共交通，同時讓所有人都能負擔得起費用？",
            localDetector: createLocalDetector({
                rawLanguageCode: "Chinese",
                confidence: 1,
            }),
        });
        const simplifiedOutcome = await detectLanguageWithFallback({
            text: "我们应该如何改善城市公共交通，同时让所有人都能负担得起费用？",
            localDetector: createLocalDetector({
                rawLanguageCode: "Chinese",
                confidence: 1,
            }),
        });

        expect(traditionalOutcome.result).toMatchObject({
            languageCode: "zh-Hant",
            sourceLanguageCode: "zh-Hant",
            rawLanguageCode: "Chinese",
            provider: "lingua",
        });
        expect(simplifiedOutcome.result).toMatchObject({
            languageCode: "zh-Hans",
            sourceLanguageCode: "zh-Hans",
            rawLanguageCode: "Chinese",
            provider: "lingua",
        });
    });
});

describe("Google normalization assumptions", () => {
    it("normalizes Google aliases without calling the live API", async () => {
        const cases = [
            { rawCode: "iw", sourceCode: "he", displayCode: "he" },
            { rawCode: "zh-CN", sourceCode: "zh-Hans", displayCode: "zh-Hans" },
            { rawCode: "zh-SG", sourceCode: "zh-Hans", displayCode: "zh-Hans" },
            { rawCode: "zh-TW", sourceCode: "zh-Hant", displayCode: "zh-Hant" },
            { rawCode: "zh-HK", sourceCode: "zh-Hant", displayCode: "zh-Hant" },
            { rawCode: "fil", sourceCode: "fil", displayCode: null },
            { rawCode: "tl", sourceCode: "fil", displayCode: null },
            { rawCode: "nb", sourceCode: "nb", displayCode: null },
            { rawCode: "nn", sourceCode: "nn", displayCode: null },
        ];

        for (const testCase of cases) {
            const outcome = await detectLanguageWithFallback({
                text: "Public transit discussion text with enough context",
                localDetector: { detect: () => Promise.resolve(undefined) },
                googleDetector: createGoogleDetector({
                    languageCode: testCase.rawCode,
                    confidence: 1,
                }),
            });

            expect(outcome.result, testCase.rawCode).toStrictEqual({
                languageCode: testCase.displayCode,
                sourceLanguageCode: testCase.sourceCode,
                rawLanguageCode: testCase.rawCode,
                provider: "google",
                confidence: 1,
            });
            expect(outcome.cacheable, testCase.rawCode).toBe(true);
        }
    });

    it("keeps unknown Google outputs raw without creating a normalized source code", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "Aloha kakou. Pehea kakou e malama ai i ka aina a me na kai o ko kakou kulanakauhale?",
            localDetector: { detect: () => Promise.resolve(undefined) },
            googleDetector: createGoogleDetector({
                languageCode: "haw",
                confidence: 0.91,
            }),
        });

        expect(outcome).toStrictEqual({
            result: {
                languageCode: null,
                sourceLanguageCode: null,
                rawLanguageCode: "haw",
                provider: "google",
                confidence: 0.91,
            },
            cacheable: true,
        });
    });
});

describe("detectLanguageWithFallback", () => {
    it("falls back to Google for meaningful Cyrillic text", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "Шаарыбыздагы коомдук транспортту кантип жакшырта алабыз?",
            localDetector: createLocalDetector({
                rawLanguageCode: "Kazakh",
                confidence: 0.97,
            }),
            googleDetector: createGoogleDetector({
                languageCode: "ky",
                confidence: 0.92,
            }),
        });

        expect(outcome).toStrictEqual({
            result: {
                languageCode: "ky",
                sourceLanguageCode: "ky",
                rawLanguageCode: "ky",
                provider: "google",
                confidence: 0.92,
            },
            cacheable: true,
        });
    });

    it("returns non-cacheable unknown when Cyrillic Google fallback fails", async () => {
        let localDetectorCalled = false;
        const localDetector: LocalLanguageDetector = {
            detect: () => {
                localDetectorCalled = true;
                return Promise.resolve({ rawLanguageCode: "Russian", confidence: 1 });
            },
        };
        const googleDetector: GoogleLanguageDetector = () =>
            Promise.reject(new Error("Google unavailable"));

        const outcome = await detectLanguageWithFallback({
            text: "Шаарыбыздагы коомдук транспортту кантип жакшырта алабыз?",
            localDetector,
            googleDetector,
        });

        expect(outcome).toStrictEqual({ result: undefined, cacheable: false });
        expect(localDetectorCalled).toBe(false);
    });

    it("keeps supported non-display local source languages", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "Қаладағы қоғамдық көлікті қалай жақсарта аламыз?",
            localDetector: createLocalDetector({
                rawLanguageCode: "Kazakh",
                confidence: 1,
            }),
        });

        expect(outcome).toStrictEqual({
            result: {
                languageCode: null,
                sourceLanguageCode: "kk",
                rawLanguageCode: "Kazakh",
                provider: "lingua",
                confidence: 1,
            },
            cacheable: true,
        });
    });

    it("returns unknown for ambiguous Chinese script", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "公共交通",
            localDetector: createLocalDetector({
                rawLanguageCode: "Chinese",
                confidence: 1,
            }),
        });

        expect(outcome).toStrictEqual({
            result: {
                languageCode: null,
                sourceLanguageCode: null,
                rawLanguageCode: "Chinese",
                provider: "lingua",
                confidence: 1,
            },
            cacheable: true,
        });
    });

    it("ignores low-confidence Google supported results", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "Shaarybyzdagy koomduk transporttu kantip jakshyrta alabız?",
            localDetector: {
                detect: () => Promise.resolve(undefined),
            },
            googleDetector: createGoogleDetector({
                languageCode: "ky",
                confidence: 0.3,
            }),
        });

        expect(outcome).toStrictEqual({
            result: {
                languageCode: null,
                sourceLanguageCode: null,
                rawLanguageCode: "ky",
                provider: "google",
                confidence: 0.3,
            },
            cacheable: true,
        });
    });

    it("falls back to Google for low-confidence local misattribution", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "Aloha kakou. Pehea kakou e malama ai i ka aina a me na kai o ko kakou kulanakauhale?",
            localDetector: createLocalDetector({
                rawLanguageCode: "Sotho",
                confidence: 0.35,
            }),
            googleDetector: createGoogleDetector({
                languageCode: "haw",
                confidence: 0.91,
            }),
        });

        expect(outcome).toStrictEqual({
            result: {
                languageCode: null,
                sourceLanguageCode: null,
                rawLanguageCode: "haw",
                provider: "google",
                confidence: 0.91,
            },
            cacheable: true,
        });
    });

    it("real local detector returns unknown for unsupported languages", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "jan ale li kama pona. mi wile e ni: jan li toki pona li pali pona lon ma tomo.",
        });

        expect(outcome).toStrictEqual({ result: undefined, cacheable: true });
    });

    it("real local detector returns unknown instead of low-confidence misattribution", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "Aloha kakou. Pehea kakou e malama ai i ka aina a me na kai o ko kakou kulanakauhale?",
        });

        expect(outcome.result?.languageCode ?? null).toBeNull();
        expect(outcome.result?.sourceLanguageCode ?? null).toBeNull();
        expect(outcome.cacheable).toBe(true);
    });

    it("real local detector detects supported non-display source languages", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "Wie koennen wir den oeffentlichen Nahverkehr in unserer Stadt verbessern und bezahlbar halten?",
        });

        expect(outcome.result).toMatchObject({
            languageCode: null,
            sourceLanguageCode: "de",
        });
        expect(outcome.cacheable).toBe(true);
    });

    it("real local detector detects short unaccented French statements", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "ceci est un message en francais",
        });

        expect(outcome.result).toMatchObject({
            languageCode: "fr",
            sourceLanguageCode: "fr",
        });
        expect(outcome.cacheable).toBe(true);
    });
});

describe("resolveConversationLanguageSetting", () => {
    it("does not cache detector failures", async () => {
        const setting = await resolveConversationLanguageSetting({
            request: { mode: "auto" },
            existing: undefined,
            conversationTitle: "Transit",
            bodyPlainText: "How can we improve public transportation?",
            googleCloudCredentials: undefined,
            localLanguageDetector: {
                detect: () => {
                    throw new Error("detector failed");
                },
            },
        });

        expect(setting).toMatchObject({
            mode: "auto",
            languageCode: null,
            detectedLanguageCode: null,
            detectedSourceLanguageCode: null,
            detectedRawLanguageCode: null,
            detectedRawLanguageProvider: null,
            detectionConfidence: null,
            detectedFromCorpusHash: null,
        });
    });
});
