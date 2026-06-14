import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { log } from "@/app.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { conversationLanguageSettingTable } from "@/shared-backend/schema.js";
import { detectLanguage } from "@/shared-backend/translate.js";
import {
    MAX_CONVERSATION_LANGUAGE_DETECTION_BODY_CHARS,
    MIN_CONVERSATION_LANGUAGE_DETECTION_CHARS,
} from "@/shared/shared.js";
import {
    parseSupportedDisplayLanguageOrUndefined,
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
    detectedRawLanguageCode: string | null;
    detectionConfidence: number | null;
    detectedFromCorpusHash: string | null;
}

interface ConversationLanguageSettingRow {
    mode: "auto" | "manual";
    languageCode: string | null;
    detectedLanguageCode: string | null;
    detectedRawLanguageCode: string | null;
    detectionConfidence: number | null;
    detectedFromCorpusHash: string | null;
}

interface ResolveConversationLanguageSettingParams {
    request: ConversationLanguageSettingInput | undefined;
    existing: StoredConversationLanguageSetting | undefined;
    conversationTitle: string;
    bodyPlainText: string;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}

export function buildConversationLanguageDetectionCorpus({
    conversationTitle,
    bodyPlainText,
}: {
    conversationTitle: string;
    bodyPlainText: string;
}): string {
    const croppedBody = bodyPlainText.slice(
        0,
        MAX_CONVERSATION_LANGUAGE_DETECTION_BODY_CHARS,
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
        detectedRawLanguageCode: null,
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

    return {
        mode: row.mode,
        languageCode,
        detectedLanguageCode,
        detectedRawLanguageCode: row.detectedRawLanguageCode,
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
        detectedRawLanguageCode: resolvedSetting.detectedRawLanguageCode,
        detectionConfidence: resolvedSetting.detectionConfidence,
    };
}

async function detectConversationLanguage({
    corpus,
    corpusHash,
    googleCloudCredentials,
}: {
    corpus: string;
    corpusHash: string;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<StoredConversationLanguageSetting> {
    if (googleCloudCredentials === undefined) {
        return emptyAutoLanguageSetting({ corpusHash: null });
    }

    try {
        const detectedLanguage = await detectLanguage({
            client: googleCloudCredentials.client,
            text: corpus,
            projectId: googleCloudCredentials.config.projectId,
            location: googleCloudCredentials.config.location,
        });
        if (detectedLanguage === undefined) {
            return emptyAutoLanguageSetting({ corpusHash });
        }

        const detectedLanguageCode =
            parseSupportedDisplayLanguageOrUndefined(
                detectedLanguage.languageCode,
            ) ?? null;

        return {
            mode: "auto",
            languageCode: detectedLanguageCode,
            detectedLanguageCode,
            detectedRawLanguageCode: detectedLanguage.languageCode,
            detectionConfidence: detectedLanguage.confidence,
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
    googleCloudCredentials,
}: ResolveConversationLanguageSettingParams): Promise<StoredConversationLanguageSetting> {
    if (request === undefined && existing !== undefined) {
        return existing;
    }

    const resolvedRequest: ConversationLanguageSettingInput = request ?? {
        mode: "auto",
    };
    if (resolvedRequest.mode === "manual") {
        return {
            mode: "manual",
            languageCode: resolvedRequest.languageCode,
            detectedLanguageCode: existing?.detectedLanguageCode ?? null,
            detectedRawLanguageCode: existing?.detectedRawLanguageCode ?? null,
            detectionConfidence: existing?.detectionConfidence ?? null,
            detectedFromCorpusHash: existing?.detectedFromCorpusHash ?? null,
        };
    }

    const corpus = buildConversationLanguageDetectionCorpus({
        conversationTitle,
        bodyPlainText,
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
        corpusHash,
        googleCloudCredentials,
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
            detectedRawLanguageCode:
                conversationLanguageSettingTable.detectedRawLanguageCode,
            detectionConfidence:
                conversationLanguageSettingTable.detectionConfidence,
            detectedFromCorpusHash:
                conversationLanguageSettingTable.detectedFromCorpusHash,
        })
        .from(conversationLanguageSettingTable)
        .where(eq(conversationLanguageSettingTable.conversationId, conversationId))
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
            detectedRawLanguageCode: setting.detectedRawLanguageCode,
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
                detectedRawLanguageCode: setting.detectedRawLanguageCode,
                detectionConfidence: setting.detectionConfidence,
                detectedFromCorpusHash: setting.detectedFromCorpusHash,
                updatedAt: now,
            },
        });
}
