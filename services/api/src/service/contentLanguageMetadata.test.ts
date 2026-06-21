import { describe, expect, it } from "vitest";
import { resolveContentLanguageMetadata } from "./contentLanguageMetadata.js";

describe("resolveContentLanguageMetadata", () => {
    it("keeps unknown source when detection cannot identify content", async () => {
        const metadata = await resolveContentLanguageMetadata({
            text: "2323",
            googleCloudCredentials: undefined,
            useGoogleLanguageDetection: false,
            localLanguageDetector: {
                detect: () => Promise.resolve(undefined),
                computeLanguageConfidence: () => Promise.resolve(0.2),
            },
        });

        expect(metadata).toEqual({
            sourceLanguageCode: null,
            sourceRawLanguageCode: null,
            sourceLanguageProvider: null,
            sourceLanguageConfidence: null,
        });
    });

    it("keeps detected source language before hints", async () => {
        const metadata = await resolveContentLanguageMetadata({
            text: "bonjour tout le monde",
            googleCloudCredentials: undefined,
            useGoogleLanguageDetection: false,
            languageHints: ["en", "es"],
            localLanguageDetector: {
                detect: () => Promise.resolve({
                    rawLanguageCode: "fr",
                    confidence: 0.99,
                }),
            },
        });

        expect(metadata).toEqual({
            sourceLanguageCode: "fr",
            sourceRawLanguageCode: "fr",
            sourceLanguageProvider: "lingua",
            sourceLanguageConfidence: 0.99,
        });
    });

    it("uses a strong language hint when global detection is unknown", async () => {
        const metadata = await resolveContentLanguageMetadata({
            text: "short civic text",
            googleCloudCredentials: undefined,
            useGoogleLanguageDetection: false,
            languageHints: ["en", "es"],
            localLanguageDetector: {
                detect: () => Promise.resolve(undefined),
                computeLanguageConfidence: ({ rawLanguageCode }) =>
                    Promise.resolve(rawLanguageCode === "English" ? 0.6 : 0.2),
            },
        });

        expect(metadata).toEqual({
            sourceLanguageCode: "en",
            sourceRawLanguageCode: "English",
            sourceLanguageProvider: "lingua",
            sourceLanguageConfidence: 0.6,
        });
    });
});
