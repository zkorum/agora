import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { rankingItemContentTranslationTable } from "@/shared-backend/schema.js";
import type { RankingItemDisplayedContent } from "@/shared/types/zod.js";
import type {
    SupportedDisplayLanguageCodes,
    SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import { translationSourceMatchesCurrentSource } from "@/shared-backend/translate.js";
import {
    buildLocalizedRankingItemContent,
    type RankingItemLocalizedContentSource,
} from "./contentTranslationContent.js";
import { toRankingItemDisplayContent } from "./conversationContent.js";

export interface RankingItemDisplayPreferences {
    displayLanguage: SupportedDisplayLanguageCodes;
    targetLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
    translationAllowed: boolean;
}

export async function buildRankingItemDisplayContentByContentId({
    db,
    sources,
    preferences,
}: {
    db: PostgresDatabase;
    sources: RankingItemLocalizedContentSource[];
    preferences: RankingItemDisplayPreferences;
}): Promise<Map<number, RankingItemDisplayedContent>> {
    if (sources.length === 0) {
        return new Map();
    }

    const sourcesByContentId = new Map(
        sources.map((source) => [source.contentId, source]),
    );
    const translationRows = await db
        .select({
            rankingItemContentId:
                rankingItemContentTranslationTable.rankingItemContentId,
            translatedTitle: rankingItemContentTranslationTable.translatedTitle,
            translatedBodyHtml:
                rankingItemContentTranslationTable.translatedBodyHtml,
            sourceLanguageCode:
                rankingItemContentTranslationTable.sourceLanguageCode,
            sourceRawLanguageCode:
                rankingItemContentTranslationTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                rankingItemContentTranslationTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                rankingItemContentTranslationTable.sourceLanguageConfidence,
        })
        .from(rankingItemContentTranslationTable)
        .where(
            and(
                inArray(
                    rankingItemContentTranslationTable.rankingItemContentId,
                    sources.map((source) => source.contentId),
                ),
                eq(
                    rankingItemContentTranslationTable.displayLanguageCode,
                    preferences.targetLanguage,
                ),
            ),
        );

    const translationsByContentId = new Map<
        number,
        (typeof translationRows)[number]
    >();
    for (const translation of translationRows) {
        const source = sourcesByContentId.get(translation.rankingItemContentId);
        if (
            source !== undefined &&
            translationSourceMatchesCurrentSource({
                translationSourceLanguageCode: translation.sourceLanguageCode,
                currentSourceLanguageCode: source.sourceLanguageCode,
            })
        ) {
            translationsByContentId.set(translation.rankingItemContentId, translation);
        }
    }

    const displayContentByContentId = new Map<number, RankingItemDisplayedContent>();
    for (const source of sources) {
        const { content } = buildLocalizedRankingItemContent({
            source,
            translation: translationsByContentId.get(source.contentId),
            targetLanguageCode: preferences.targetLanguage,
            requestMode: "read_existing",
        });
        displayContentByContentId.set(
            source.contentId,
            toRankingItemDisplayContent({
                content,
                translationAllowed: preferences.translationAllowed,
                displayLanguage: preferences.displayLanguage,
                spokenLanguages: preferences.spokenLanguages,
            }),
        );
    }

    return displayContentByContentId;
}
