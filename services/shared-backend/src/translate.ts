/**
 * Shared Google Cloud Translation helpers.
 * The model routing here is intentionally content-aware so short labels/options
 * can stay on NMT while longer user-facing copy uses Translation LLM.
 */

import { v3 } from "@google-cloud/translate";
import pLimit from "p-limit";

type TranslationServiceClient = v3.TranslationServiceClient;

export const SHORT_TEXT_NMT_THRESHOLD = 24;

export type TranslationContentKind =
    | "ai_label"
    | "ai_summary"
    | "survey_prompt"
    | "survey_option";

export interface DetectedLanguageResult {
    languageCode: string;
    confidence: number;
}

const DISPLAY_LANGUAGE_TO_GOOGLE_CODE: Partial<Record<string, string>> = {
    ar: "ar",
    en: "en",
    es: "es",
    fa: "fa",
    fr: "fr",
    he: "he",
    ja: "ja",
    ky: "ky",
    ru: "ru",
    "zh-Hans": "zh-CN",
    "zh-Hant": "zh-TW",
};

function canonicalizeLanguageCode({
    languageCode,
}: {
    languageCode: string;
}): string | undefined {
    const trimmedLanguageCode = languageCode.trim();
    if (trimmedLanguageCode.length === 0) {
        return undefined;
    }

    try {
        return Intl.getCanonicalLocales(trimmedLanguageCode)[0];
    } catch {
        if (/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(trimmedLanguageCode)) {
            return trimmedLanguageCode;
        }
        return undefined;
    }
}

function normalizeSourceLanguageCodeForGoogle({
    sourceLanguageCode,
}: {
    sourceLanguageCode: string;
}): string {
    const canonicalLanguageCode = canonicalizeLanguageCode({
        languageCode: sourceLanguageCode,
    });
    const normalizedLanguageCode = canonicalLanguageCode ?? sourceLanguageCode;

    if (
        normalizedLanguageCode === "zh-Hans" ||
        normalizedLanguageCode === "zh-CN"
    ) {
        return "zh-CN";
    }

    if (
        normalizedLanguageCode === "zh-Hant" ||
        normalizedLanguageCode === "zh-TW"
    ) {
        return "zh-TW";
    }

    if (normalizedLanguageCode.startsWith("zh-")) {
        const locale = new Intl.Locale(normalizedLanguageCode);
        if (locale.script === "Hant") {
            return "zh-TW";
        }
        if (locale.region === "TW" || locale.region === "HK") {
            return "zh-TW";
        }
        return "zh-CN";
    }

    return normalizedLanguageCode;
}

function normalizeTargetLanguageCodeForGoogle({
    targetLanguageCode,
}: {
    targetLanguageCode: string;
}): string {
    const mappedLanguageCode = DISPLAY_LANGUAGE_TO_GOOGLE_CODE[targetLanguageCode];
    if (mappedLanguageCode !== undefined) {
        return mappedLanguageCode;
    }

    return normalizeSourceLanguageCodeForGoogle({
        sourceLanguageCode: targetLanguageCode,
    });
}

function getLanguageComparisonKey({ languageCode }: { languageCode: string }): string {
    const normalizedLanguageCode = normalizeSourceLanguageCodeForGoogle({
        sourceLanguageCode: languageCode,
    });
    if (
        normalizedLanguageCode === "zh-CN" ||
        normalizedLanguageCode === "zh-TW"
    ) {
        return normalizedLanguageCode;
    }

    return normalizedLanguageCode.split("-")[0] ?? normalizedLanguageCode;
}

export function shouldSkipTranslation({
    sourceLanguageCode,
    targetLanguageCode,
}: {
    sourceLanguageCode: string | undefined;
    targetLanguageCode: string;
}): boolean {
    if (sourceLanguageCode === undefined) {
        return false;
    }

    return (
        getLanguageComparisonKey({ languageCode: sourceLanguageCode }) ===
        getLanguageComparisonKey({ languageCode: targetLanguageCode })
    );
}

function getTranslationModelName({
    contentKind,
    text,
}: {
    contentKind: TranslationContentKind;
    text: string;
}): "general/nmt" | "general/translation-llm" {
    switch (contentKind) {
        case "ai_label":
            return "general/nmt";
        case "ai_summary":
        case "survey_prompt":
            return "general/translation-llm";
        case "survey_option":
            return text.trim().length <= SHORT_TEXT_NMT_THRESHOLD
                ? "general/nmt"
                : "general/translation-llm";
    }
}

function buildModelPath({
    modelName,
    projectId,
    location,
}: {
    modelName: "general/nmt" | "general/translation-llm";
    projectId: string;
    location: string;
}): string {
    return `projects/${projectId}/locations/${location}/models/${modelName}`;
}

export async function detectLanguage({
    client,
    text,
    projectId,
    location,
}: {
    client: TranslationServiceClient;
    text: string;
    projectId: string;
    location: string;
}): Promise<DetectedLanguageResult | undefined> {
    if (text.trim().length === 0) {
        return undefined;
    }

    const [response] = await client.detectLanguage({
        parent: `projects/${projectId}/locations/${location}`,
        content: text,
        mimeType: "text/plain",
    });

    const detectedLanguage = response.languages?.[0];
    if (detectedLanguage?.languageCode == null) {
        return undefined;
    }

    const canonicalLanguageCode = canonicalizeLanguageCode({
        languageCode: detectedLanguage.languageCode,
    });
    if (canonicalLanguageCode === undefined) {
        return undefined;
    }

    return {
        languageCode: canonicalLanguageCode,
        confidence: detectedLanguage.confidence ?? 0,
    };
}

export async function translateText({
    client,
    text,
    sourceLanguageCode,
    targetLanguageCode,
    projectId,
    location,
    contentKind,
}: {
    client: TranslationServiceClient;
    text: string;
    sourceLanguageCode: string | undefined;
    targetLanguageCode: string;
    projectId: string;
    location: string;
    contentKind: TranslationContentKind;
}): Promise<string> {
    if (text.length === 0) {
        return "";
    }

    if (
        shouldSkipTranslation({
            sourceLanguageCode,
            targetLanguageCode,
        })
    ) {
        return text;
    }

    const googleSourceCode =
        sourceLanguageCode === undefined
            ? undefined
            : normalizeSourceLanguageCodeForGoogle({
                  sourceLanguageCode,
              });
    const googleTargetCode = normalizeTargetLanguageCodeForGoogle({
        targetLanguageCode,
    });
    const modelName = getTranslationModelName({ contentKind, text });

    if (googleTargetCode === "zh-TW") {
        if (googleSourceCode === "zh-CN") {
            const [response] = await client.translateText({
                parent: `projects/${projectId}/locations/${location}`,
                contents: [text],
                mimeType: "text/plain",
                sourceLanguageCode: "zh-CN",
                targetLanguageCode: "zh-TW",
            });

            const translatedText = response.translations?.[0]?.translatedText;
            if (translatedText == null) {
                throw new Error(
                    `Translation failed for zh-CN -> zh-TW conversion: "${text}"`,
                );
            }

            return translatedText;
        }

        const [simplifiedResponse] = await client.translateText({
            parent: `projects/${projectId}/locations/${location}`,
            contents: [text],
            mimeType: "text/plain",
            targetLanguageCode: "zh-CN",
            model: buildModelPath({ modelName, projectId, location }),
            ...(googleSourceCode !== undefined && {
                sourceLanguageCode: googleSourceCode,
            }),
        });

        const simplifiedText = simplifiedResponse.translations?.[0]?.translatedText;
        if (simplifiedText == null) {
            throw new Error(
                `Translation failed at Simplified Chinese step for "${text}"`,
            );
        }

        const [traditionalResponse] = await client.translateText({
            parent: `projects/${projectId}/locations/${location}`,
            contents: [simplifiedText],
            mimeType: "text/plain",
            sourceLanguageCode: "zh-CN",
            targetLanguageCode: "zh-TW",
        });

        const traditionalText =
            traditionalResponse.translations?.[0]?.translatedText;
        if (traditionalText == null) {
            throw new Error(
                `Translation failed at Traditional Chinese conversion step for "${simplifiedText}"`,
            );
        }

        return traditionalText;
    }

    const [response] = await client.translateText({
        parent: `projects/${projectId}/locations/${location}`,
        contents: [text],
        mimeType: "text/plain",
        targetLanguageCode: googleTargetCode,
        model: buildModelPath({ modelName, projectId, location }),
        ...(googleSourceCode !== undefined && {
            sourceLanguageCode: googleSourceCode,
        }),
    });

    const translatedText = response.translations?.[0]?.translatedText;
    if (translatedText == null) {
        throw new Error(
            `Translation failed: no translated text returned for "${text}"`,
        );
    }

    return translatedText;
}

export async function batchTranslateTexts({
    client,
    texts,
    sourceLanguageCode,
    targetLanguageCode,
    projectId,
    location,
    contentKind,
    concurrencyLimit = 10,
}: {
    client: TranslationServiceClient;
    texts: string[];
    sourceLanguageCode: string | undefined;
    targetLanguageCode: string;
    projectId: string;
    location: string;
    contentKind: TranslationContentKind;
    concurrencyLimit?: number;
}): Promise<string[]> {
    const limit = pLimit(concurrencyLimit);

    return Promise.all(
        texts.map((text) =>
            limit(() =>
                translateText({
                    client,
                    text,
                    sourceLanguageCode,
                    targetLanguageCode,
                    projectId,
                    location,
                    contentKind,
                }),
            ),
        ),
    );
}
