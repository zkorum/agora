import {
    parseNormalizedLanguageOrUndefined,
    parseSupportedDisplayLanguageOrUndefined,
    type NormalizedLanguageCodes,
    type SupportedDisplayLanguageCodes,
} from "@/shared/languages.js";
import type {
    AutoLanguageDetectionStatus,
    ContentLanguageMetadataOutput,
    ConversationLanguageSettingOutput,
} from "@/shared/types/zod.js";

const GOOGLE_CONVERSATION_LANGUAGE_DETECTION_BODY_CHARS = 400;

export function buildConversationLanguageDetectionCorpus({
    conversationTitle,
    bodyPlainText,
    supplementalPlainText = "",
}: {
    conversationTitle: string;
    bodyPlainText: string;
    supplementalPlainText?: string;
}): string {
    const bodyAndSupplemental = [bodyPlainText, supplementalPlainText]
        .map((text) => text.trim())
        .filter((text) => text.length > 0)
        .join("\n\n");
    if (bodyAndSupplemental.length === 0) {
        return conversationTitle;
    }
    return `${conversationTitle}\n\n${bodyAndSupplemental}`;
}

export function buildGoogleConversationLanguageDetectionCorpus({
    conversationTitle,
    bodyPlainText,
    supplementalPlainText = "",
}: {
    conversationTitle: string;
    bodyPlainText: string;
    supplementalPlainText?: string;
}): string {
    const bodyAndSupplemental = [bodyPlainText, supplementalPlainText]
        .map((text) => text.trim())
        .filter((text) => text.length > 0)
        .join("\n\n");
    const croppedBody = bodyAndSupplemental.slice(
        0,
        GOOGLE_CONVERSATION_LANGUAGE_DETECTION_BODY_CHARS,
    );
    if (croppedBody.length === 0) {
        return conversationTitle;
    }
    return `${conversationTitle}\n\n${croppedBody}`;
}

function normalizeLanguageCodeForOutput(
    languageCode: string | null,
): SupportedDisplayLanguageCodes | null {
    if (languageCode === null) {
        return null;
    }
    return parseSupportedDisplayLanguageOrUndefined(languageCode) ?? null;
}

function normalizeSourceLanguageCodeForOutput(
    languageCode: string | null,
): NormalizedLanguageCodes | null {
    if (languageCode === null) {
        return null;
    }
    return parseNormalizedLanguageOrUndefined(languageCode) ?? null;
}

export function conversationContentSourceMetadataToLanguageSettingOutput({
    sourceLanguageCode,
    sourceRawLanguageCode,
    sourceLanguageConfidence,
}: {
    sourceLanguageCode: string | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageConfidence: number | null;
}): ConversationLanguageSettingOutput {
    const detectedLanguageCode = normalizeLanguageCodeForOutput(sourceLanguageCode);
    const detectedSourceLanguageCode = normalizeSourceLanguageCodeForOutput(
        sourceLanguageCode,
    );
    const autoDetectionStatus: AutoLanguageDetectionStatus =
        sourceLanguageCode !== null || sourceRawLanguageCode !== null
            ? "detected"
            : "stable_unknown";

    return {
        mode: "auto",
        languageCode: null,
        detectedLanguageCode,
        detectedSourceLanguageCode,
        detectedRawLanguageCode: sourceRawLanguageCode,
        detectionConfidence: sourceLanguageConfidence,
        autoDetectionStatus,
    };
}

export function conversationContentSourceMetadataToContentLanguageMetadataOutput({
    sourceLanguageCode,
    sourceRawLanguageCode,
    sourceLanguageConfidence,
}: {
    sourceLanguageCode: string | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageConfidence: number | null;
}): ContentLanguageMetadataOutput {
    const detectedDisplayLanguageCode = normalizeLanguageCodeForOutput(
        sourceLanguageCode,
    );
    const detectedSourceLanguageCode = normalizeSourceLanguageCodeForOutput(
        sourceLanguageCode,
    );
    const autoDetectionStatus: AutoLanguageDetectionStatus =
        sourceLanguageCode !== null || sourceRawLanguageCode !== null
            ? "detected"
            : "stable_unknown";

    return {
        detectedDisplayLanguageCode,
        detectedSourceLanguageCode,
        detectedRawLanguageCode: sourceRawLanguageCode,
        detectionConfidence: sourceLanguageConfidence,
        autoDetectionStatus,
    };
}
