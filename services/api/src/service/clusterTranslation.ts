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
    const labelTextsToTranslate: string[] = [];
    const labelMapping: number[] = [];
    const summaryTextsToTranslate: string[] = [];
    const summaryMapping: number[] = [];

    for (const cluster of clusterData) {
        const missingInfo = missingTranslationsMap.get(cluster.polisClusterId);
        if (!missingInfo) continue;

        if (missingInfo.needsLabelTranslation && cluster.aiLabel) {
            labelTextsToTranslate.push(cluster.aiLabel);
            labelMapping.push(cluster.polisClusterId);
        }
        if (missingInfo.needsSummaryTranslation && cluster.aiSummary) {
            summaryTextsToTranslate.push(cluster.aiSummary);
            summaryMapping.push(cluster.polisClusterId);
        }
    }

    if (
        labelTextsToTranslate.length === 0 &&
        summaryTextsToTranslate.length === 0
    ) {
        return 0;
    }

    const [translatedLabels, translatedSummaries] = await Promise.all([
        batchTranslateTexts({
            client: googleCloudCredentials.client,
            texts: labelTextsToTranslate,
            sourceLanguageCode,
            targetLanguageCode,
            projectId: googleCloudCredentials.config.projectId,
            location: googleCloudCredentials.config.location,
            contentKind: "ai_label",
        }),
        batchTranslateTexts({
            client: googleCloudCredentials.client,
            texts: summaryTextsToTranslate,
            sourceLanguageCode,
            targetLanguageCode,
            projectId: googleCloudCredentials.config.projectId,
            location: googleCloudCredentials.config.location,
            contentKind: "ai_summary",
        }),
    ]);

    // Map translations back to clusters
    const clusterTranslations = new Map<
        number,
        { aiLabel: string | null; aiSummary: string | null }
    >();

    for (const [index, translatedText] of translatedLabels.entries()) {
        const polisClusterId = labelMapping[index];
        const existingTranslation = clusterTranslations.get(polisClusterId);
        if (existingTranslation !== undefined) {
            existingTranslation.aiLabel = translatedText;
        } else {
            clusterTranslations.set(polisClusterId, {
                aiLabel: translatedText,
                aiSummary: null,
            });
        }
    }

    for (const [index, translatedText] of translatedSummaries.entries()) {
        const polisClusterId = summaryMapping[index];
        const existingTranslation = clusterTranslations.get(polisClusterId);
        if (existingTranslation !== undefined) {
            existingTranslation.aiSummary = translatedText;
        } else {
            clusterTranslations.set(polisClusterId, {
                aiLabel: null,
                aiSummary: translatedText,
            });
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
