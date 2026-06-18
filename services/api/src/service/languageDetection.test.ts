import { describe, expect, it } from "vitest";
import {
    detectLanguageWithFallback,
    hasMeaningfulCyrillicText,
    inferChineseScriptLanguage,
    type GoogleLanguageDetector,
    type LocalLanguageDetector,
} from "./languageDetection.js";
import { resolveConversationLanguageSetting } from "./conversationLanguage.js";

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
                sourceLanguageCode: "haw",
                rawLanguageCode: "haw",
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
            detectedRawLanguageCode: null,
            detectionConfidence: null,
            detectedFromCorpusHash: null,
        });
    });
});
