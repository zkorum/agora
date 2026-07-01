import { describe, expect, it } from "vitest";
import {
    detectLanguageWithFallback,
    hasMeaningfulCyrillicText,
    inferChineseScriptLanguage,
    LINGUA_LANGUAGE_TO_SOURCE_CODE_ENTRIES,
    resolveHintedLanguageDetection,
    type GoogleLanguageDetector,
    type LanguageDetectionResult,
    type LocalLanguageDetector,
} from "./languageDetection.js";
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

function detection({
    sourceLanguageCode,
    confidence,
    provider = "lingua",
}: {
    sourceLanguageCode: LanguageDetectionResult["sourceLanguageCode"];
    confidence: number | null;
    provider?: "lingua" | "google_translate";
}): LanguageDetectionResult {
    return {
        languageCode:
            sourceLanguageCode === "en" ||
            sourceLanguageCode === "es" ||
            sourceLanguageCode === "fr" ||
            sourceLanguageCode === "zh-Hans" ||
            sourceLanguageCode === "zh-Hant"
                ? sourceLanguageCode
                : null,
        sourceLanguageCode,
        rawLanguageCode: sourceLanguageCode ?? "unknown",
        provider,
        confidence,
    };
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

            expect(outcome, languageName).toStrictEqual({
                languageCode:
                    parseSupportedDisplayLanguageOrUndefined(sourceLanguageCode) ?? null,
                sourceLanguageCode,
                rawLanguageCode: languageName,
                provider: "lingua",
                confidence: 1,
            });
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

        expect(traditionalOutcome).toMatchObject({
            languageCode: "zh-Hant",
            sourceLanguageCode: "zh-Hant",
            rawLanguageCode: "Chinese",
            provider: "lingua",
        });
        expect(simplifiedOutcome).toMatchObject({
            languageCode: "zh-Hans",
            sourceLanguageCode: "zh-Hans",
            rawLanguageCode: "Chinese",
            provider: "lingua",
        });
    });
});

describe("resolveHintedLanguageDetection", () => {
    it("keeps a strong global result even when it is outside hints", () => {
        const globalResult = detection({ sourceLanguageCode: "fr", confidence: 0.9 });

        expect(
            resolveHintedLanguageDetection({
                globalResult,
                hintedResults: [
                    detection({ sourceLanguageCode: "en", confidence: 0.6 }),
                    detection({ sourceLanguageCode: "es", confidence: 0.7 }),
                ],
            }),
        ).toStrictEqual({ result: globalResult, reason: "strong_global" });
    });

    it("lets a strong hinted language override a weak global result", () => {
        const hintedResult = detection({ sourceLanguageCode: "en", confidence: 0.53 });

        expect(
            resolveHintedLanguageDetection({
                globalResult: detection({ sourceLanguageCode: "nl", confidence: 0.43 }),
                hintedResults: [
                    hintedResult,
                    detection({ sourceLanguageCode: "es", confidence: 0.2 }),
                ],
            }),
        ).toStrictEqual({
            result: hintedResult,
            reason: "hint_overrode_global",
        });
    });

    it("keeps a weak global result when hints are below the hint threshold", () => {
        const globalResult = detection({ sourceLanguageCode: "fr", confidence: 0.48 });

        expect(
            resolveHintedLanguageDetection({
                globalResult,
                hintedResults: [
                    detection({ sourceLanguageCode: "en", confidence: 0.44 }),
                    detection({ sourceLanguageCode: "es", confidence: 0.2 }),
                ],
            }),
        ).toStrictEqual({ result: globalResult, reason: "weak_global" });
    });

    it("keeps global over hints when hinted languages do not have enough margin", () => {
        const globalResult = detection({ sourceLanguageCode: "it", confidence: 0.43 });

        expect(
            resolveHintedLanguageDetection({
                globalResult,
                hintedResults: [
                    detection({ sourceLanguageCode: "es", confidence: 0.51 }),
                    detection({ sourceLanguageCode: "en", confidence: 0.45 }),
                ],
            }),
        ).toStrictEqual({ result: globalResult, reason: "weak_global" });
    });

    it("accepts a strong hinted language when global detection is unknown", () => {
        const hintedResult = detection({ sourceLanguageCode: "en", confidence: 0.58 });

        expect(
            resolveHintedLanguageDetection({
                globalResult: undefined,
                hintedResults: [
                    hintedResult,
                    detection({ sourceLanguageCode: "es", confidence: 0.2 }),
                ],
            }),
        ).toStrictEqual({
            result: hintedResult,
            reason: "hint_without_global",
        });
    });

    it("rejects weak or close hinted languages when global detection is unknown", () => {
        expect(
            resolveHintedLanguageDetection({
                globalResult: undefined,
                hintedResults: [
                    detection({ sourceLanguageCode: "en", confidence: 0.49 }),
                    detection({ sourceLanguageCode: "es", confidence: 0.45 }),
                ],
            }),
        ).toStrictEqual({ result: undefined, reason: "unknown" });
    });

    it("does not treat null confidence hinted languages as strong", () => {
        expect(
            resolveHintedLanguageDetection({
                globalResult: undefined,
                hintedResults: [
                    detection({ sourceLanguageCode: "en", confidence: null }),
                    detection({ sourceLanguageCode: "es", confidence: 0.2 }),
                ],
            }),
        ).toStrictEqual({ result: undefined, reason: "unknown" });
    });

    it("preserves exact Chinese script variants", () => {
        const traditionalResult = detection({
            sourceLanguageCode: "zh-Hant",
            confidence: 0.58,
        });

        expect(
            resolveHintedLanguageDetection({
                globalResult: undefined,
                hintedResults: [
                    traditionalResult,
                    detection({ sourceLanguageCode: "zh-Hans", confidence: 0.2 }),
                ],
            }),
        ).toStrictEqual({
            result: traditionalResult,
            reason: "hint_without_global",
        });
    });

    it("keeps a strong different-language global result over a weighted main hint", () => {
        const globalResult = detection({ sourceLanguageCode: "fr", confidence: 0.7 });
        const hintedResult = detection({ sourceLanguageCode: "en", confidence: 0.62 });

        expect(
            resolveHintedLanguageDetection({
                globalResult,
                hintedResults: [{ result: hintedResult, score: 0.7 }],
            }),
        ).toStrictEqual({ result: globalResult, reason: "strong_global" });
    });

    it("lets a weighted manual-main hint break an ambiguous global result", () => {
        const hintedResult = detection({ sourceLanguageCode: "en", confidence: 0.5 });

        expect(
            resolveHintedLanguageDetection({
                globalResult: detection({ sourceLanguageCode: "nl", confidence: 0.49 }),
                hintedResults: [{ result: hintedResult, score: 0.58 }],
            }),
        ).toStrictEqual({
            result: hintedResult,
            reason: "hint_overrode_global",
        });
    });

    it("does not let hint weight turn weak raw confidence into a known source", () => {
        expect(
            resolveHintedLanguageDetection({
                globalResult: undefined,
                hintedResults: [
                    {
                        result: detection({
                            sourceLanguageCode: "en",
                            confidence: 0.49,
                        }),
                        score: 0.57,
                    },
                ],
            }),
        ).toStrictEqual({ result: undefined, reason: "unknown" });
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

            expect(outcome, testCase.rawCode).toStrictEqual({
                languageCode: testCase.displayCode,
                sourceLanguageCode: testCase.sourceCode,
                rawLanguageCode: testCase.rawCode,
                provider: "google_translate",
                confidence: 1,
            });
        }
    });

    it("keeps broad non-display Google outputs as normalized source languages", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "Aloha kakou. Pehea kakou e malama ai i ka aina a me na kai o ko kakou kulanakauhale?",
            localDetector: { detect: () => Promise.resolve(undefined) },
            googleDetector: createGoogleDetector({
                languageCode: "haw",
                confidence: 0.91,
            }),
        });

        expect(outcome).toStrictEqual({
            languageCode: null,
            sourceLanguageCode: "haw",
            rawLanguageCode: "haw",
            provider: "google_translate",
            confidence: 0.91,
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
            languageCode: "ky",
            sourceLanguageCode: "ky",
            rawLanguageCode: "ky",
            provider: "google_translate",
            confidence: 0.92,
        });
    });

    it("returns unknown when Cyrillic Google fallback fails", async () => {
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

        expect(outcome).toBeUndefined();
        expect(localDetectorCalled).toBe(false);
    });

    it("returns unknown for meaningful Cyrillic when Google is unavailable", async () => {
        let localDetectorCalled = false;
        const localDetector: LocalLanguageDetector = {
            detect: () => {
                localDetectorCalled = true;
                return Promise.resolve({ rawLanguageCode: "Russian", confidence: 1 });
            },
        };

        const outcome = await detectLanguageWithFallback({
            text: "Шаарыбыздагы коомдук транспортту кантип жакшырта алабыз?",
            localDetector,
        });

        expect(outcome).toBeUndefined();
        expect(localDetectorCalled).toBe(false);
    });

    it("keeps supported non-display local source languages", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "Com podem millorar el transport public de la ciutat i mantenir-lo assequible per a tothom?",
            localDetector: createLocalDetector({
                rawLanguageCode: "Catalan",
                confidence: 1,
            }),
        });

        expect(outcome).toStrictEqual({
            languageCode: null,
            sourceLanguageCode: "ca",
            rawLanguageCode: "Catalan",
            provider: "lingua",
            confidence: 1,
        });
    });

    it("falls back to Simplified for confirmed Chinese with ambiguous script", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "公共交通",
            localDetector: createLocalDetector({
                rawLanguageCode: "Chinese",
                confidence: 1,
            }),
        });

        expect(outcome).toStrictEqual({
            languageCode: "zh-Hans",
            sourceLanguageCode: "zh-Hans",
            rawLanguageCode: "Chinese",
            provider: "lingua",
            confidence: 1,
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
            languageCode: null,
            sourceLanguageCode: null,
            rawLanguageCode: "ky",
            provider: "google_translate",
            confidence: 0.3,
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
            languageCode: null,
            sourceLanguageCode: "haw",
            rawLanguageCode: "haw",
            provider: "google_translate",
            confidence: 0.91,
        });
    });

    it("returns unknown when Google fallback fails after weak local attribution", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "Aloha kakou. Pehea kakou e malama ai i ka aina a me na kai o ko kakou kulanakauhale?",
            localDetector: createLocalDetector({
                rawLanguageCode: "Sotho",
                confidence: 0.35,
            }),
            googleDetector: () => Promise.reject(new Error("Google unavailable")),
        });

        expect(outcome).toBeUndefined();
    });

    it("real local detector returns unknown for unsupported languages", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "jan ale li kama pona. mi wile e ni: jan li toki pona li pali pona lon ma tomo.",
        });

        expect(outcome).toBeUndefined();
    });

    it("real local detector returns unknown instead of low-confidence misattribution", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "Aloha kakou. Pehea kakou e malama ai i ka aina a me na kai o ko kakou kulanakauhale?",
        });

        expect(outcome?.languageCode ?? null).toBeNull();
        expect(outcome?.sourceLanguageCode ?? null).toBeNull();
    });

    it("real local detector detects supported non-display source languages", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "Com podem millorar el transport public de la ciutat i mantenir-lo assequible per a tothom?",
        });

        expect(outcome).toMatchObject({
            languageCode: null,
            sourceLanguageCode: "ca",
        });
    });

    it("real local detector keeps Haitian Creole unknown instead of a low-confidence misattribution", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "Kijan nou ka amelyore transpo piblik nan vil la epi kenbe li abodab pou tout moun?",
        });

        expect(outcome?.languageCode ?? null).toBeNull();
        expect(outcome?.sourceLanguageCode ?? null).toBeNull();
    });

    it("real local detector detects short unaccented French statements", async () => {
        const outcome = await detectLanguageWithFallback({
            text: "ceci est un message en francais",
        });

        expect(outcome).toMatchObject({
            languageCode: "fr",
            sourceLanguageCode: "fr",
        });
    });
});
