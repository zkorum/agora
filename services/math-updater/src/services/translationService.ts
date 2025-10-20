/**
 * Translation service for math-updater
 * Pre-generates translations in all supported languages after math update
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { polisClusterTranslationTable } from "@/shared-backend/schema.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { batchTranslateTexts } from "@/shared-backend/translate.js";
import { ZodSupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { log } from "@/app.js";

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
    Array<{
        polisClusterId: number;
        languageCode: string;
        aiLabel: string | null;
        aiSummary: string | null;
    }>
> {
    // Prepare texts to translate (filter out nulls)
    const textsToTranslate: string[] = [];
    const textMapping: {
        polisKey: string;
        type: "label" | "summary";
    }[] = [];

    for (const polisKey of Object.keys(
        aiClustersLabelsAndSummaries,
    ) as (keyof typeof aiClustersLabelsAndSummaries)[]) {
        const data = aiClustersLabelsAndSummaries[polisKey];
        if (!data) continue;

        if (data.label) {
            textsToTranslate.push(data.label);
            textMapping.push({ polisKey, type: "label" });
        }
        if (data.summary) {
            textsToTranslate.push(data.summary);
            textMapping.push({ polisKey, type: "summary" });
        }
    }

    if (textsToTranslate.length === 0) {
        return [];
    }

    const allTranslations: Array<{
        polisClusterId: number;
        languageCode: string;
        aiLabel: string | null;
        aiSummary: string | null;
    }> = [];

    // Translate for each target language
    for (const targetLanguage of targetLanguageCodes) {
        // Translate all texts for this language
        const translatedTexts = await batchTranslateTexts(
            googleCloudCredentials.client,
            textsToTranslate,
            SOURCE_LANGUAGE,
            targetLanguage,
            googleCloudCredentials.config.projectId,
            googleCloudCredentials.config.location,
        );

        // Map translations back to clusters using polisKey -> clusterId mapping
        const clusterTranslations = new Map<
            number,
            { aiLabel: string | null; aiSummary: string | null }
        >();

        for (let i = 0; i < translatedTexts.length; i++) {
            const mapping = textMapping[i];
            const translatedText = translatedTexts[i];
            const clusterId = clusterIdsByKey[mapping.polisKey];

            if (!clusterId) {
                log.warn(
                    `[Translation] No clusterId found for polisKey=${mapping.polisKey}`,
                );
                continue;
            }

            if (!clusterTranslations.has(clusterId)) {
                clusterTranslations.set(clusterId, {
                    aiLabel: null,
                    aiSummary: null,
                });
            }

            const clusterTranslation = clusterTranslations.get(clusterId)!;
            if (mapping.type === "label") {
                clusterTranslation.aiLabel = translatedText;
            } else {
                clusterTranslation.aiSummary = translatedText;
            }
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
    aiClustersLabelsAndSummaries: Record<
        string,
        { label: string; summary: string } | undefined
    >;
    conversationId: number;
}): Promise<
    Array<{
        polisClusterId: number;
        languageCode: string;
        aiLabel: string | null;
        aiSummary: string | null;
    }>
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
export async function insertClusterTranslations({
    db,
    translations,
    conversationId,
}: {
    db: PostgresJsDatabase | any; // any to support PgTransaction
    translations: Array<{
        polisClusterId: number;
        languageCode: string;
        aiLabel: string | null;
        aiSummary: string | null;
    }>;
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
