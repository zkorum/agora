/**
 * On-demand cluster translation service for API
 * Generates translations when users request non-English content
 */

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { inArray } from "drizzle-orm";
import {
    polisClusterTable,
    polisClusterTranslationTable,
} from "@/shared-backend/schema.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { batchTranslateTexts } from "@/shared-backend/translate.js";

/**
 * Generate and insert translations for specified clusters
 * Only translates fields that are marked as missing
 */
async function generateTranslationsForClusters(
    db: PostgresJsDatabase,
    missingTranslationsMap: Map<
        number,
        {
            needsLabelTranslation: boolean;
            needsSummaryTranslation: boolean;
        }
    >,
    targetLanguageCode: string,
    googleCloudCredentials: GoogleCloudCredentials,
    sourceLanguageCode = "en",
): Promise<number> {
    if (
        missingTranslationsMap.size === 0 ||
        targetLanguageCode === sourceLanguageCode
    ) {
        return 0;
    }

    const polisClusterIds = Array.from(missingTranslationsMap.keys());

    // Fetch cluster data
    const clusterData = await db
        .select({
            polisClusterId: polisClusterTable.id,
            aiLabel: polisClusterTable.aiLabel,
            aiSummary: polisClusterTable.aiSummary,
        })
        .from(polisClusterTable)
        .where(inArray(polisClusterTable.id, polisClusterIds));

    if (clusterData.length === 0) {
        return 0;
    }

    // Prepare texts to translate (only translate what's needed)
    const textsToTranslate: string[] = [];
    const textMapping: {
        polisClusterId: number;
        type: "label" | "summary";
    }[] = [];

    for (const cluster of clusterData) {
        const missingInfo = missingTranslationsMap.get(cluster.polisClusterId);
        if (!missingInfo) continue;

        if (missingInfo.needsLabelTranslation && cluster.aiLabel) {
            textsToTranslate.push(cluster.aiLabel);
            textMapping.push({
                polisClusterId: cluster.polisClusterId,
                type: "label",
            });
        }
        if (missingInfo.needsSummaryTranslation && cluster.aiSummary) {
            textsToTranslate.push(cluster.aiSummary);
            textMapping.push({
                polisClusterId: cluster.polisClusterId,
                type: "summary",
            });
        }
    }

    if (textsToTranslate.length === 0) {
        return 0;
    }

    // Translate all texts in batch
    const translatedTexts = await batchTranslateTexts(
        googleCloudCredentials.client,
        textsToTranslate,
        sourceLanguageCode,
        targetLanguageCode,
        googleCloudCredentials.config.projectId,
        googleCloudCredentials.config.location,
    );

    // Map translations back to clusters
    const clusterTranslations = new Map<
        number,
        { aiLabel: string | null; aiSummary: string | null }
    >();

    for (let i = 0; i < translatedTexts.length; i++) {
        const mapping = textMapping[i];
        const translatedText = translatedTexts[i];

        const existingTranslation = clusterTranslations.get(mapping.polisClusterId);
        if (existingTranslation !== undefined) {
            if (mapping.type === "label") {
                existingTranslation.aiLabel = translatedText;
            } else {
                existingTranslation.aiSummary = translatedText;
            }
        } else {
            if (mapping.type === "label") {
                clusterTranslations.set(mapping.polisClusterId, {
                    aiLabel: translatedText,
                    aiSummary: null,
                });
            } else {
                clusterTranslations.set(mapping.polisClusterId, {
                    aiSummary: translatedText,
                    aiLabel: null,
                });
            }
        }
    }

    // Prepare insertions
    const translationsToInsert = Array.from(clusterTranslations.entries()).map(
        ([polisClusterId, translation]) => ({
            polisClusterId: polisClusterId,
            languageCode: targetLanguageCode,
            aiLabel: translation.aiLabel,
            aiSummary: translation.aiSummary,
        }),
    );

    // Insert translations into database with conflict handling
    if (translationsToInsert.length > 0) {
        await db
            .insert(polisClusterTranslationTable)
            .values(translationsToInsert)
            .onConflictDoNothing({
                target: [
                    polisClusterTranslationTable.polisClusterId,
                    polisClusterTranslationTable.languageCode,
                ],
            });
    }

    return translationsToInsert.length;
}

/**
 * Generate translations on-demand for clusters that don't have translations yet
 * Only translates fields that are marked as missing
 */
export async function generateClusterTranslationsOnDemand(
    db: PostgresJsDatabase,
    missingTranslationsMap: Map<
        number,
        {
            needsLabelTranslation: boolean;
            needsSummaryTranslation: boolean;
        }
    >,
    targetLanguageCode: string,
    googleCloudCredentials: GoogleCloudCredentials,
    sourceLanguageCode = "en",
): Promise<number> {
    if (
        missingTranslationsMap.size === 0 ||
        targetLanguageCode === sourceLanguageCode
    ) {
        return 0;
    }

    return await generateTranslationsForClusters(
        db,
        missingTranslationsMap,
        targetLanguageCode,
        googleCloudCredentials,
        sourceLanguageCode,
    );
}
