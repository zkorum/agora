import { log } from "@/app.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { detectLanguage } from "@/shared-backend/translate.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    ADDITIONAL_LANGUAGE_HINT_WEIGHT,
    AUTO_MAIN_LANGUAGE_HINT_WEIGHT,
    detectLanguageWithFallback,
    type LanguageDetectionHintInput,
    MANUAL_MAIN_LANGUAGE_HINT_WEIGHT,
} from "./languageDetection.js";
import {
    getConversationLanguageSetting,
    type StoredConversationLanguageSetting,
} from "./conversationLanguage.js";
import {
    getConversationMultilingualSetting,
    getUniqueConfiguredConversationLanguageCodes,
} from "./conversationMultilingual.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import type {
    ConversationLanguageSettingInput,
    SurveyConfig,
} from "@/shared/types/zod.js";

export interface ContentLanguageMetadata {
    sourceLanguageCode: string | null;
    sourceLanguageConfidence: number | null;
}

export function buildSurveyLanguageDetectionCorpus({
    surveyConfig,
}: {
    surveyConfig: SurveyConfig | null | undefined;
}): string {
    if (surveyConfig === null || surveyConfig === undefined) {
        return "";
    }
    return surveyConfig.questions
        .flatMap((question) => [
            question.questionText,
            ...(question.questionType === "choice"
                ? question.options.map((option) => option.optionText)
                : []),
        ])
        .join("\n");
}

export function buildContentBlockLanguageDetectionCorpus({
    conversationCorpus,
    surveyConfig,
}: {
    conversationCorpus: string;
    surveyConfig: SurveyConfig | null | undefined;
}): string {
    const surveyCorpus = buildSurveyLanguageDetectionCorpus({ surveyConfig });
    return [conversationCorpus, surveyCorpus]
        .map((corpus) => corpus.trim())
        .filter((corpus) => corpus.length > 0)
        .join("\n\n");
}

export function getBlockLanguageHints({
    languageSetting,
}: {
    languageSetting: ConversationLanguageSettingInput;
}): LanguageDetectionHintInput[] {
    if (languageSetting.mode !== "manual") {
        return [];
    }
    return [
        {
            languageCode: languageSetting.languageCode,
            weight: MANUAL_MAIN_LANGUAGE_HINT_WEIGHT,
        },
    ];
}

export function getPersistedBlockLanguageHints({
    languageSetting,
}: {
    languageSetting: StoredConversationLanguageSetting | undefined;
}): LanguageDetectionHintInput[] {
    if (languageSetting?.mode !== "manual" || languageSetting.languageCode === null) {
        return [];
    }
    return [
        {
            languageCode: languageSetting.languageCode,
            weight: MANUAL_MAIN_LANGUAGE_HINT_WEIGHT,
        },
    ];
}

export function getContentItemLanguageHints({
    languageSetting,
    additionalLanguageCodes,
}: {
    languageSetting: StoredConversationLanguageSetting;
    additionalLanguageCodes: readonly SupportedDisplayLanguageCodes[];
}): LanguageDetectionHintInput[] {
    const mainLanguageCode =
        languageSetting.mode === "manual"
            ? languageSetting.languageCode
            : languageSetting.detectedLanguageCode;
    const uniqueLanguageCodes = getUniqueConfiguredConversationLanguageCodes({
        mainLanguageCode,
        additionalLanguageCodes,
    });
    return uniqueLanguageCodes.map((languageCode) => {
        if (languageCode === mainLanguageCode) {
            return {
                languageCode,
                weight:
                    languageSetting.mode === "manual"
                        ? MANUAL_MAIN_LANGUAGE_HINT_WEIGHT
                        : AUTO_MAIN_LANGUAGE_HINT_WEIGHT,
            };
        }
        return {
            languageCode,
            weight: ADDITIONAL_LANGUAGE_HINT_WEIGHT,
        };
    });
}

export async function getContentLanguageHintsForConversation({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<LanguageDetectionHintInput[]> {
    const languageSetting = await getConversationLanguageSetting({
        db,
        conversationId,
    });
    if (languageSetting === undefined) {
        return [];
    }
    const multilingualSetting = await getConversationMultilingualSetting({
        db,
        conversationId,
    });
    return getContentItemLanguageHints({
        languageSetting,
        additionalLanguageCodes: multilingualSetting.additionalLanguageCodes,
    });
}

export async function resolveContentLanguageMetadata({
    text,
    googleText,
    googleCloudCredentials,
    languageHints = [],
    localLanguageDetector,
}: {
    text: string;
    googleText?: string;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
    languageHints?: readonly LanguageDetectionHintInput[];
    localLanguageDetector?: Parameters<typeof detectLanguageWithFallback>[0]["localDetector"];
}): Promise<ContentLanguageMetadata> {
    if (text.trim().length === 0) {
        return { sourceLanguageCode: null, sourceLanguageConfidence: null };
    }

    try {
        const googleDetector =
            googleCloudCredentials === undefined
                ? undefined
                : async ({ text: textToDetect }: { text: string }) =>
                      await detectLanguage({
                          client: googleCloudCredentials.client,
                          text: textToDetect,
                          projectId: googleCloudCredentials.config.projectId,
                          location: googleCloudCredentials.config.location,
                      });
        const detectionOutcome = await detectLanguageWithFallback({
            text,
            googleText,
            languageHints,
            localDetector: localLanguageDetector,
            googleDetector,
        });
        if (detectionOutcome.result === undefined) {
            return { sourceLanguageCode: null, sourceLanguageConfidence: null };
        }
        return {
            sourceLanguageCode: detectionOutcome.result.sourceLanguageCode,
            sourceLanguageConfidence: detectionOutcome.result.confidence,
        };
    } catch (error) {
        log.warn(error, "[ContentLanguageMetadata] Failed to detect content language");
        return { sourceLanguageCode: null, sourceLanguageConfidence: null };
    }
}
