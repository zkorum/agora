/**
 * Translation abstraction layer for AI-generated cluster labels and summaries
 * Uses Google Cloud Translation API v3 with LLM support
 */

import { v3 } from "@google-cloud/translate";
import pLimit from "p-limit";

type TranslationServiceClient = v3.TranslationServiceClient;

/**
 * Convert BCP 47 language codes to Google Cloud Translation language codes
 * Most codes are the same, but Chinese variants use different formats
 */
function convertToGoogleLanguageCode(bcp47Code: string): string {
    const codeMap: Record<string, string> = {
        "zh-Hans": "zh-CN", // Simplified Chinese
        "zh-Hant": "zh-TW", // Traditional Chinese
        en: "en",
        es: "es",
        fr: "fr",
        ja: "ja",
        ar: "ar",
    };

    const googleCode = codeMap[bcp47Code];
    if (!googleCode) {
        throw new Error(
            `Unsupported language code for Google Cloud Translation: ${bcp47Code}`,
        );
    }

    return googleCode;
}

/**
 * Translate text from source language to target language using Google Cloud Translation with LLM
 * @param client - Google TranslationServiceClient instance
 * @param text - Text to translate
 * @param sourceLanguageCode - BCP 47 source language code (e.g., "en")
 * @param targetLanguageCode - BCP 47 target language code (e.g., "es", "fr", "zh-Hans")
 * @param projectId - Google Cloud project ID
 * @param location - Google Cloud location (e.g., "global", "us-central1")
 * @returns Translated text
 */
export async function translateText(
    client: TranslationServiceClient,
    text: string,
    sourceLanguageCode: string,
    targetLanguageCode: string,
    projectId: string,
    location: string,
): Promise<string> {
    // Convert BCP 47 codes to Google Cloud Translation language codes
    const googleSourceCode = convertToGoogleLanguageCode(sourceLanguageCode);
    const googleTargetCode = convertToGoogleLanguageCode(targetLanguageCode);

    const request = {
        parent: `projects/${projectId}/locations/${location}`,
        contents: [text],
        mimeType: "text/plain" as const,
        sourceLanguageCode: googleSourceCode,
        targetLanguageCode: googleTargetCode,
        // Use Translation LLM for better quality on conversational/social media text
        model: `projects/${projectId}/locations/${location}/models/general/translation-llm`,
    };

    const [response] = await client.translateText(request);

    if (
        !response.translations ||
        response.translations.length === 0 ||
        !response.translations[0].translatedText
    ) {
        throw new Error(
            `Translation failed: no translated text returned for "${text}"`,
        );
    }

    return response.translations[0].translatedText;
}

/**
 * Batch translate multiple texts from source to target language with concurrency control
 * @param client - Google TranslationServiceClient instance
 * @param texts - Array of texts to translate
 * @param sourceLanguageCode - BCP 47 source language code (e.g., "en")
 * @param targetLanguageCode - BCP 47 target language code (e.g., "es", "fr", "zh-Hans")
 * @param projectId - Google Cloud project ID
 * @param location - Google Cloud location (e.g., "global", "us-central1")
 * @param concurrencyLimit - Maximum number of concurrent translation requests (default: 10)
 * @returns Array of translated texts in the same order
 */
export async function batchTranslateTexts(
    client: TranslationServiceClient,
    texts: string[],
    sourceLanguageCode: string,
    targetLanguageCode: string,
    projectId: string,
    location: string,
    concurrencyLimit: number = 10,
): Promise<string[]> {
    const limit = pLimit(concurrencyLimit);

    return Promise.all(
        texts.map((text) =>
            limit(() =>
                translateText(
                    client,
                    text,
                    sourceLanguageCode,
                    targetLanguageCode,
                    projectId,
                    location,
                ),
            ),
        ),
    );
}
