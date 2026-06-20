import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { log } from "@/app.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { conversationLanguageSettingTable } from "@/shared-backend/schema.js";
import { detectLanguage } from "@/shared-backend/translate.js";
import {
    detectLanguageWithFallback,
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
    ConversationLanguageSettingInput,
    ConversationLanguageSettingOutput,
} from "@/shared/types/zod.js";

export interface StoredConversationLanguageSetting {
    mode: "auto" | "manual";
    languageCode: SupportedDisplayLanguageCodes | null;
    detectedLanguageCode: SupportedDisplayLanguageCodes | null;
    detectedSourceLanguageCode: NormalizedLanguageCodes | null;
    detectedRawLanguageCode: string | null;
    detectedRawLanguageProvider: LanguageDetectionProvider | null;
    detectionConfidence: number | null;
    detectedFromCorpusHash: string | null;
}

interface ConversationLanguageSettingRow {
    mode: "auto" | "manual";
    languageCode: string | null;
    detectedLanguageCode: string | null;
    detectedSourceLanguageCode: string | null;
    detectedRawLanguageCode: string | null;
    detectedRawLanguageProvider: LanguageDetectionProvider | null;
    detectionConfidence: number | null;
    detectedFromCorpusHash: string | null;
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

function emptyAutoLanguageSetting({
    corpusHash,
}: {
    corpusHash: string | null;
}): StoredConversationLanguageSetting {
    return {
        mode: "auto",
        languageCode: null,
        detectedLanguageCode: null,
        detectedSourceLanguageCode: null,
        detectedRawLanguageCode: null,
        detectedRawLanguageProvider: null,
        detectionConfidence: null,
        detectedFromCorpusHash: corpusHash,
    };
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

export function normalizeConversationLanguageSettingRow(
    row: ConversationLanguageSettingRow | undefined,
): StoredConversationLanguageSetting | undefined {
    if (row === undefined) {
        return undefined;
    }

    const languageCode = normalizeLanguageCodeForOutput(row.languageCode);
    const detectedLanguageCode = normalizeLanguageCodeForOutput(
        row.detectedLanguageCode,
    );
    const detectedSourceLanguageCode = normalizeSourceLanguageCodeForOutput(
        row.detectedSourceLanguageCode,
    );

    return {
        mode: row.mode,
        languageCode,
        detectedLanguageCode,
        detectedSourceLanguageCode,
        detectedRawLanguageCode: row.detectedRawLanguageCode,
        detectedRawLanguageProvider: row.detectedRawLanguageProvider,
        detectionConfidence: row.detectionConfidence,
        detectedFromCorpusHash: row.detectedFromCorpusHash,
    };
}

export function conversationLanguageSettingToOutput({
    setting,
}: {
    setting: StoredConversationLanguageSetting | undefined;
}): ConversationLanguageSettingOutput {
    const resolvedSetting =
        setting ?? emptyAutoLanguageSetting({ corpusHash: null });
    return {
        mode: resolvedSetting.mode,
        languageCode: resolvedSetting.languageCode,
        detectedLanguageCode: resolvedSetting.detectedLanguageCode,
        detectedSourceLanguageCode: resolvedSetting.detectedSourceLanguageCode,
        detectedRawLanguageCode: resolvedSetting.detectedRawLanguageCode,
        detectedRawLanguageProvider: resolvedSetting.detectedRawLanguageProvider,
        detectionConfidence: resolvedSetting.detectionConfidence,
    };
}

export function conversationLanguageSettingToSourceMetadata({
    setting,
}: {
    setting: StoredConversationLanguageSetting;
}): {
    sourceLanguageCode: string | null;
    sourceLanguageConfidence: number | null;
} {
    if (setting.mode === "manual") {
        return {
            sourceLanguageCode: setting.languageCode,
            sourceLanguageConfidence: null,
        };
    }

    return {
        sourceLanguageCode: setting.detectedSourceLanguageCode,
        sourceLanguageConfidence: setting.detectionConfidence,
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

        const detectionOutcome = await detectLanguageWithFallback({
            text: corpus,
            googleText: googleCorpus,
            languageHints,
            localDetector: localLanguageDetector,
            googleDetector: resolvedGoogleLanguageDetector,
        });
        if (detectionOutcome.result === undefined) {
            return emptyAutoLanguageSetting({
                corpusHash: detectionOutcome.cacheable ? corpusHash : null,
            });
        }

        return {
            mode: "auto",
            languageCode: detectionOutcome.result.languageCode,
            detectedLanguageCode: detectionOutcome.result.languageCode,
            detectedSourceLanguageCode: detectionOutcome.result.sourceLanguageCode,
            detectedRawLanguageCode: detectionOutcome.result.rawLanguageCode,
            detectedRawLanguageProvider: detectionOutcome.result.provider,
            detectionConfidence: detectionOutcome.result.confidence,
            detectedFromCorpusHash: corpusHash,
        };
    } catch (error) {
        log.warn(error, "[ConversationLanguage] Failed to detect language");
        return emptyAutoLanguageSetting({ corpusHash: null });
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
        return emptyAutoLanguageSetting({ corpusHash });
    }

    if (existing?.detectedFromCorpusHash === corpusHash) {
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

export async function getConversationLanguageSetting({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId: number;
}): Promise<StoredConversationLanguageSetting | undefined> {
    const rows = await db
        .select({
            mode: conversationLanguageSettingTable.mode,
            languageCode: conversationLanguageSettingTable.languageCode,
            detectedLanguageCode:
                conversationLanguageSettingTable.detectedLanguageCode,
            detectedSourceLanguageCode:
                conversationLanguageSettingTable.detectedSourceLanguageCode,
            detectedRawLanguageCode:
                conversationLanguageSettingTable.detectedRawLanguageCode,
            detectedRawLanguageProvider:
                conversationLanguageSettingTable.detectedRawLanguageProvider,
            detectionConfidence:
                conversationLanguageSettingTable.detectionConfidence,
            detectedFromCorpusHash:
                conversationLanguageSettingTable.detectedFromCorpusHash,
        })
        .from(conversationLanguageSettingTable)
        .where(
            eq(conversationLanguageSettingTable.conversationId, conversationId),
        )
        .limit(1);

    return normalizeConversationLanguageSettingRow(rows.at(0));
}

export async function upsertConversationLanguageSetting({
    db,
    conversationId,
    setting,
    now,
}: {
    db: PostgresDatabase;
    conversationId: number;
    setting: StoredConversationLanguageSetting;
    now: Date;
}): Promise<void> {
    await db
        .insert(conversationLanguageSettingTable)
        .values({
            conversationId,
            mode: setting.mode,
            languageCode: setting.languageCode,
            detectedLanguageCode: setting.detectedLanguageCode,
            detectedSourceLanguageCode: setting.detectedSourceLanguageCode,
            detectedRawLanguageCode: setting.detectedRawLanguageCode,
            detectedRawLanguageProvider: setting.detectedRawLanguageProvider,
            detectionConfidence: setting.detectionConfidence,
            detectedFromCorpusHash: setting.detectedFromCorpusHash,
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: conversationLanguageSettingTable.conversationId,
            set: {
                mode: setting.mode,
                languageCode: setting.languageCode,
                detectedLanguageCode: setting.detectedLanguageCode,
                detectedSourceLanguageCode: setting.detectedSourceLanguageCode,
                detectedRawLanguageCode: setting.detectedRawLanguageCode,
                detectedRawLanguageProvider: setting.detectedRawLanguageProvider,
                detectionConfidence: setting.detectionConfidence,
                detectedFromCorpusHash: setting.detectedFromCorpusHash,
                updatedAt: now,
            },
        });
}
