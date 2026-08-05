import {
    contentTranslationWorkTable,
    conversationContentTable,
    conversationContentTranslationTable,
    conversationTable,
    conversationTranslationTargetLanguageTable,
} from "@/shared-backend/schema.js";
import { translationSourceMatchesCurrentSource } from "@/shared-backend/translate.js";
import type {
    SupportedDisplayLanguageCodes,
    SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import type { ConversationContentFetchResponse } from "@/shared/types/dto.js";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";

import {
    buildLocalizedConversationContent,
    toMissingContentTranslationStatus,
} from "./contentTranslationContent.js";
import { toInitialConversationDisplayContent } from "./conversationContent.js";
import { shouldTranslateContent } from "./translationLanguageSetting.js";

export async function fetchConversationFeedDisplayContentBySlugId({
    db,
    conversationContentIds,
    displayLanguage,
    spokenLanguages,
}: {
    db: PostgresDatabase;
    conversationContentIds: number[];
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}): Promise<Map<string, ConversationContentFetchResponse>> {
    const displayContentBySlugId = new Map<
        string,
        ConversationContentFetchResponse
    >();
    if (conversationContentIds.length === 0) {
        return displayContentBySlugId;
    }

    const rows = await db
        .select({
            conversationSlugId: conversationTable.slugId,
            publicId: conversationContentTable.publicId,
            title: conversationContentTable.title,
            body: conversationContentTable.body,
            sourceLanguageCode: conversationContentTable.sourceLanguageCode,
            sourceRawLanguageCode:
                conversationContentTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                conversationContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                conversationContentTable.sourceLanguageConfidence,
            translatedTitle:
                conversationContentTranslationTable.translatedTitle,
            translatedBody: conversationContentTranslationTable.translatedBody,
            translationSourceLanguageCode:
                conversationContentTranslationTable.sourceLanguageCode,
            workStatus: contentTranslationWorkTable.status,
        })
        .from(conversationContentTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, conversationContentTable.conversationId),
        )
        .innerJoin(
            conversationTranslationTargetLanguageTable,
            // These rows materialize the effective policy for both inherited and override settings.
            and(
                eq(
                    conversationTranslationTargetLanguageTable.conversationId,
                    conversationTable.id,
                ),
                eq(
                    conversationTranslationTargetLanguageTable.languageCode,
                    displayLanguage,
                ),
                isNull(conversationTranslationTargetLanguageTable.deletedAt),
            ),
        )
        .leftJoin(
            conversationContentTranslationTable,
            and(
                eq(
                    conversationContentTranslationTable.conversationContentId,
                    conversationContentTable.id,
                ),
                eq(
                    conversationContentTranslationTable.displayLanguageCode,
                    displayLanguage,
                ),
            ),
        )
        .leftJoin(
            contentTranslationWorkTable,
            and(
                eq(contentTranslationWorkTable.sourceKind, "conversation"),
                eq(
                    contentTranslationWorkTable.conversationContentId,
                    conversationContentTable.id,
                ),
                eq(
                    contentTranslationWorkTable.displayLanguageCode,
                    displayLanguage,
                ),
            ),
        )
        .where(
            and(
                inArray(conversationContentTable.id, conversationContentIds),
                eq(conversationTable.dynamicTranslationEnabled, true),
            ),
        );

    for (const row of rows) {
        if (
            !shouldTranslateContent({
                sourceLanguageCode: row.sourceLanguageCode,
                sourceRawLanguageCode: row.sourceRawLanguageCode,
                targetLanguageCode: displayLanguage,
            })
        ) {
            continue;
        }
        const source = {
            publicId: row.publicId,
            title: row.title,
            body: row.body,
            sourceLanguageCode: row.sourceLanguageCode,
            sourceRawLanguageCode: row.sourceRawLanguageCode,
            sourceLanguageProvider: row.sourceLanguageProvider,
            sourceLanguageConfidence: row.sourceLanguageConfidence,
        };
        const translation =
            row.translatedTitle !== null &&
            translationSourceMatchesCurrentSource({
                translationSourceLanguageCode:
                    row.translationSourceLanguageCode,
                currentSourceLanguageCode: row.sourceLanguageCode,
            })
                ? {
                      translatedTitle: row.translatedTitle,
                      translatedBody: row.translatedBody,
                  }
                : undefined;
        const missingTranslationStatus =
            row.workStatus === null
                ? "not_requested"
                : toMissingContentTranslationStatus(row.workStatus);
        const localizedContent = buildLocalizedConversationContent({
            source,
            translation,
            targetLanguageCode: displayLanguage,
            missingTranslationStatus,
        });
        displayContentBySlugId.set(
            row.conversationSlugId,
            toInitialConversationDisplayContent({
                content: localizedContent,
                translationAllowed: true,
                displayLanguage,
                spokenLanguages,
            }),
        );
    }

    return displayContentBySlugId;
}
