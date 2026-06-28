import { createHash } from "node:crypto";
import { log } from "@/app.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { detectLanguage } from "@/shared-backend/translate.js";
import {
    detectLanguageWithFallbackOutcome,
    type GoogleLanguageDetector,
    type LanguageDetectionHintInput,
    type LanguageDetectionProvider,
    type LocalLanguageDetector,
} from "./languageDetection.js";
import { MIN_CONVERSATION_LANGUAGE_DETECTION_CHARS } from "@/shared/shared.js";
import {
    parseNormalizedLanguageOrUndefined,
    parseSupportedDisplayLanguageOrUndefined,
    type NormalizedLanguageCodes,
    type SupportedDisplayLanguageCodes,
} from "@/shared/languages.js";
import type {
    AutoLanguageDetectionStatus,
    ConversationLanguageSettingInput,
    ConversationLanguageSettingOutput,
} from "@/shared/types/zod.js";

export interface StoredConversationLanguageSetting {
    mode: "inherit" | "auto" | "manual";
    languageCode: SupportedDisplayLanguageCodes | null;
    detectedLanguageCode: SupportedDisplayLanguageCodes | null;
    detectedSourceLanguageCode: NormalizedLanguageCodes | null;
    detectedRawLanguageCode: string | null;
    detectedRawLanguageProvider: LanguageDetectionProvider | null;
    detectionConfidence: number | null;
    detectedFromCorpusHash: string | null;
    autoDetectionRetryable: boolean;
}

interface ResolveConversationLanguageSettingParams {
    request: ConversationLanguageSettingInput;
    existing: StoredConversationLanguageSetting | undefined;
    conversationTitle: string;
    bodyPlainText: string;
    supplementalPlainText?: string;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
    languageHints?: readonly LanguageDetectionHintInput[];
    localLanguageDetector?: LocalLanguageDetector;
    googleLanguageDetector?: GoogleLanguageDetector;
}

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

export function hashConversationLanguageDetectionCorpus(
    corpus: string,
): string {
    return createHash("sha256").update(corpus).digest("hex");
}

export function isConversationLanguageDetectionCorpusMeaningful(
    corpus: string,
): boolean {
    return corpus.trim().length >= MIN_CONVERSATION_LANGUAGE_DETECTION_CHARS;
}

function emptyAutoLanguageSetting(): StoredConversationLanguageSetting {
    return {
        mode: "auto",
        languageCode: null,
        detectedLanguageCode: null,
        detectedSourceLanguageCode: null,
        detectedRawLanguageCode: null,
        detectedRawLanguageProvider: null,
        detectionConfidence: null,
        detectedFromCorpusHash: null,
        autoDetectionRetryable: false,
    };
}

function shouldReuseStoredConversationLanguageDetection({
    existing,
    corpusHash,
}: {
    existing: StoredConversationLanguageSetting;
    corpusHash: string;
}): boolean {
    return (
        existing.detectedFromCorpusHash === corpusHash &&
        existing.detectedRawLanguageProvider === "google_translate"
    );
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

function autoDetectionStatusForOutput({
    setting,
}: {
    setting: StoredConversationLanguageSetting | undefined;
}): AutoLanguageDetectionStatus {
    if (setting?.mode !== "auto") {
        return "not_attempted";
    }
    if (
        setting.detectedLanguageCode !== null ||
        setting.detectedSourceLanguageCode !== null ||
        setting.detectedRawLanguageCode !== null
    ) {
        return "detected";
    }
    return setting.autoDetectionRetryable
        ? "retryable_unknown"
        : "stable_unknown";
}

export function conversationLanguageSettingToOutput({
    setting,
}: {
    setting: StoredConversationLanguageSetting | undefined;
}): ConversationLanguageSettingOutput {
    const resolvedSetting = setting ?? emptyAutoLanguageSetting();
    return {
        mode: resolvedSetting.mode,
        languageCode: resolvedSetting.languageCode,
        detectedLanguageCode: resolvedSetting.detectedLanguageCode,
        detectedSourceLanguageCode: resolvedSetting.detectedSourceLanguageCode,
        detectedRawLanguageCode: resolvedSetting.detectedRawLanguageCode,
        detectionConfidence: resolvedSetting.detectionConfidence,
        autoDetectionStatus: autoDetectionStatusForOutput({ setting }),
    };
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

async function detectConversationLanguage({
    corpus,
    googleCorpus,
    corpusHash,
    googleCloudCredentials,
    languageHints,
    localLanguageDetector,
    googleLanguageDetector,
}: {
    corpus: string;
    googleCorpus: string;
    corpusHash: string;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
    languageHints: readonly LanguageDetectionHintInput[];
    localLanguageDetector?: LocalLanguageDetector;
    googleLanguageDetector?: GoogleLanguageDetector;
}): Promise<StoredConversationLanguageSetting> {
    try {
        const resolvedGoogleLanguageDetector =
            googleLanguageDetector ??
            (googleCloudCredentials === undefined
                ? undefined
                : async ({ text }) => {
                      return await detectLanguage({
                          client: googleCloudCredentials.client,
                          text,
                          projectId: googleCloudCredentials.config.projectId,
                          location: googleCloudCredentials.config.location,
                      });
                  });

        const detectionOutcome = await detectLanguageWithFallbackOutcome({
            text: corpus,
            googleText: googleCorpus,
            languageHints,
            localDetector: localLanguageDetector,
            googleDetector: resolvedGoogleLanguageDetector,
        });
        if (detectionOutcome.kind !== "detected") {
            return {
                ...emptyAutoLanguageSetting(),
                autoDetectionRetryable:
                    detectionOutcome.kind === "retryable_unknown",
            };
        }
        const { result: detectionResult } = detectionOutcome;

        return {
            mode: "auto",
            languageCode: detectionResult.languageCode,
            detectedLanguageCode: detectionResult.languageCode,
            detectedSourceLanguageCode: detectionResult.sourceLanguageCode,
            detectedRawLanguageCode: detectionResult.rawLanguageCode,
            detectedRawLanguageProvider: detectionResult.provider,
            detectionConfidence: detectionResult.confidence,
            detectedFromCorpusHash:
                detectionResult.provider === "google_translate" ? corpusHash : null,
            autoDetectionRetryable: false,
        };
    } catch (error) {
        log.warn(error, "[ConversationLanguage] Failed to detect language");
        return emptyAutoLanguageSetting();
    }
}

export async function resolveConversationLanguageSetting({
    request,
    existing,
    conversationTitle,
    bodyPlainText,
    supplementalPlainText = "",
    googleCloudCredentials,
    languageHints = [],
    localLanguageDetector,
    googleLanguageDetector,
}: ResolveConversationLanguageSettingParams): Promise<StoredConversationLanguageSetting> {
    if (request.mode === "manual") {
        return {
            mode: "manual",
            languageCode: request.languageCode,
            detectedLanguageCode: existing?.detectedLanguageCode ?? null,
            detectedSourceLanguageCode: existing?.detectedSourceLanguageCode ?? null,
            detectedRawLanguageCode: existing?.detectedRawLanguageCode ?? null,
            detectedRawLanguageProvider: existing?.detectedRawLanguageProvider ?? null,
            detectionConfidence: existing?.detectionConfidence ?? null,
            detectedFromCorpusHash: existing?.detectedFromCorpusHash ?? null,
            autoDetectionRetryable: false,
        };
    }

    const corpus = buildConversationLanguageDetectionCorpus({
        conversationTitle,
        bodyPlainText,
        supplementalPlainText,
    });
    const googleCorpus = buildGoogleConversationLanguageDetectionCorpus({
        conversationTitle,
        bodyPlainText,
        supplementalPlainText,
    });
    const corpusHash = hashConversationLanguageDetectionCorpus(corpus);
    if (!isConversationLanguageDetectionCorpusMeaningful(corpus)) {
        return emptyAutoLanguageSetting();
    }

    if (
        existing !== undefined &&
        shouldReuseStoredConversationLanguageDetection({ existing, corpusHash })
    ) {
        return {
            ...existing,
            mode: "auto",
            languageCode: existing.detectedLanguageCode,
        };
    }

    return await detectConversationLanguage({
        corpus,
        googleCorpus,
        corpusHash,
        googleCloudCredentials,
        languageHints,
        localLanguageDetector,
        googleLanguageDetector,
    });
}
