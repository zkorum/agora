/**
 * Translation service for math-updater
 * Pre-generates translations in all supported languages after math update
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
    PgTransaction,
    PgQueryResultHKT,
} from "drizzle-orm/pg-core";
import type { TablesRelationalConfig } from "drizzle-orm";
import { polisClusterTranslationTable } from "@/shared-backend/schema.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { batchTranslateTexts } from "@/shared-backend/translate.js";
import { ZodSupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { log } from "@/app.js";
import {
    type GenLabelSummaryOutputClusterLoose,
    type GenLabelSummaryOutputClusterStrict,
} from "@/shared-backend/llmSchemas.js";

// Get all supported display languages except English (source language)
const SUPPORTED_LANGUAGES = ZodSupportedDisplayLanguageCodes.options.filter(
    (lang) => lang !== "en",
);
const SOURCE_LANGUAGE = "en";

/**
 * Phase 2: Generate translations for multiple languages (no DB writes)
 * Accepts clusterIdsByKey from Phase 1 and AI labels/summaries from Phase 2
 * Returns translation records ready for Phase 3 insertion
 */
async function generateTranslationsForMultipleLanguages(
    googleCloudCredentials: GoogleCloudCredentials,
    clusterIdsByKey: Record<string, number>,
    aiClustersLabelsAndSummaries: Record<
        string,
        { label: string; summary: string } | undefined
    >,
    targetLanguageCodes: string[],
): Promise<
    {
        polisClusterId: number;
        languageCode: string;
        aiLabel: string | null;
        aiSummary: string | null;
    }[]
> {
    // Prepare texts to translate (filter out nulls)
    const labelTextsToTranslate: string[] = [];
    const labelMapping: string[] = [];
    const summaryTextsToTranslate: string[] = [];
    const summaryMapping: string[] = [];

    for (const polisKey of Object.keys(
        aiClustersLabelsAndSummaries,
    )) {
        const data = aiClustersLabelsAndSummaries[polisKey];
        if (!data) continue;

        if (data.label) {
            labelTextsToTranslate.push(data.label);
            labelMapping.push(polisKey);
        }
        if (data.summary) {
            summaryTextsToTranslate.push(data.summary);
            summaryMapping.push(polisKey);
        }
    }

    if (
        labelTextsToTranslate.length === 0 &&
        summaryTextsToTranslate.length === 0
    ) {
        return [];
    }

    const allTranslations: {
        polisClusterId: number;
        languageCode: string;
        aiLabel: string | null;
        aiSummary: string | null;
    }[] = [];

    // Translate for each target language
    for (const targetLanguage of targetLanguageCodes) {
        // Translate all texts for this language
        const [translatedLabels, translatedSummaries] = await Promise.all([
            batchTranslateTexts({
                client: googleCloudCredentials.client,
                texts: labelTextsToTranslate,
                sourceLanguageCode: SOURCE_LANGUAGE,
                targetLanguageCode: targetLanguage,
                projectId: googleCloudCredentials.config.projectId,
                location: googleCloudCredentials.config.location,
                contentKind: "ai_label",
            }),
            batchTranslateTexts({
                client: googleCloudCredentials.client,
                texts: summaryTextsToTranslate,
                sourceLanguageCode: SOURCE_LANGUAGE,
                targetLanguageCode: targetLanguage,
                projectId: googleCloudCredentials.config.projectId,
                location: googleCloudCredentials.config.location,
                contentKind: "ai_summary",
            }),
        ]);

        // Map translations back to clusters using polisKey -> clusterId mapping
        const clusterTranslations = new Map<
            number,
            { aiLabel: string | null; aiSummary: string | null }
        >();

        for (const [index, translatedText] of translatedLabels.entries()) {
            const polisKey = labelMapping[index];
            const clusterId = clusterIdsByKey[polisKey];

            if (!clusterId) {
                log.warn(
                    `[Translation] No clusterId found for polisKey=${polisKey}`,
                );
                continue;
            }

            if (!clusterTranslations.has(clusterId)) {
                clusterTranslations.set(clusterId, {
                    aiLabel: null,
                    aiSummary: null,
                });
            }

            const clusterTranslation = clusterTranslations.get(clusterId);
            if (clusterTranslation === undefined) {
                continue;
            }
            clusterTranslation.aiLabel = translatedText;
        }

        for (const [index, translatedText] of translatedSummaries.entries()) {
            const polisKey = summaryMapping[index];
            const clusterId = clusterIdsByKey[polisKey];

            if (!clusterId) {
                log.warn(
                    `[Translation] No clusterId found for polisKey=${polisKey}`,
                );
                continue;
            }

            if (!clusterTranslations.has(clusterId)) {
                clusterTranslations.set(clusterId, {
                    aiLabel: null,
                    aiSummary: null,
                });
            }

            const clusterTranslation = clusterTranslations.get(clusterId);
            if (clusterTranslation === undefined) {
                continue;
            }
            clusterTranslation.aiSummary = translatedText;
        }

        // Add to all translations
        for (const [clusterId, translation] of clusterTranslations.entries()) {
            allTranslations.push({
                polisClusterId: clusterId,
                languageCode: targetLanguage,
                aiLabel: translation.aiLabel,
                aiSummary: translation.aiSummary,
            });
        }
    }

    return allTranslations;
}

/**
 * Phase 2: Pre-generate translations for all clusters in all supported languages
 * Returns translation records without inserting to DB (for Phase 3)
 */
export async function generateAllClusterTranslations({
    googleCloudCredentials,
    clusterIdsByKey,
    aiClustersLabelsAndSummaries,
    conversationId,
}: {
    googleCloudCredentials: GoogleCloudCredentials;
    clusterIdsByKey: Record<string, number>;
    aiClustersLabelsAndSummaries:
        | GenLabelSummaryOutputClusterStrict
        | GenLabelSummaryOutputClusterLoose;
    conversationId: number;
}): Promise<
    {
        polisClusterId: number;
        languageCode: string;
        aiLabel: string | null;
        aiSummary: string | null;
    }[]
> {
    const numClusters = Object.keys(clusterIdsByKey).length;
    if (numClusters === 0) {
        log.warn(
            `[Translation] No clusters to translate for conversationId=${conversationId}`,
        );
        return [];
    }

    log.info(
        `[Translation] Starting translation for ${numClusters} clusters to ${SUPPORTED_LANGUAGES.length} languages, conversationId=${conversationId}`,
    );

    try {
        const allTranslations = await generateTranslationsForMultipleLanguages(
            googleCloudCredentials,
            clusterIdsByKey,
            aiClustersLabelsAndSummaries,
            SUPPORTED_LANGUAGES,
        );

        log.info(
            `[Translation] Generated ${allTranslations.length} translations for conversationId=${conversationId}`,
        );

        return allTranslations;
    } catch (error) {
        log.error(
            error,
            `[Translation] Failed to generate translations for conversationId=${conversationId}`,
        );
        throw error;
    }
}

/**
 * Phase 3: Insert translations into database
 * Should be called inside a transaction
 */
export async function insertClusterTranslations<
    TQueryResult extends PgQueryResultHKT,
    TFullSchema extends Record<string, unknown>,
    TSchema extends TablesRelationalConfig,
>({
    db,
    translations,
    conversationId,
}: {
    db: PostgresJsDatabase | PgTransaction<TQueryResult, TFullSchema, TSchema>;
    translations: {
        polisClusterId: number;
        languageCode: string;
        aiLabel: string | null;
        aiSummary: string | null;
    }[];
    conversationId: number;
}): Promise<void> {
    if (translations.length === 0) {
        log.warn(
            `[Translation] No translations to insert for conversationId=${conversationId}`,
        );
        return;
    }

    await db
        .insert(polisClusterTranslationTable)
        .values(translations)
        .onConflictDoNothing({
            target: [
                polisClusterTranslationTable.polisClusterId,
                polisClusterTranslationTable.languageCode,
            ],
        });

    log.info(
        `[Translation] Inserted ${translations.length} translations for conversationId=${conversationId}`,
    );
}
