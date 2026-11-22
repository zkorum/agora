import { and, eq, isNull } from "drizzle-orm";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import {
    conversationTable,
    conversationContentTable,
    projectTable,
} from "@/shared-backend/schema.js";
import { resolveConversationTranslationTargetLanguagePolicy } from "./contentTranslation.js";

/** Policy reads need source-language metadata, not the conversation's title or body. */
export async function readConversationTranslationPolicy({
    tx,
    conversationSlugId,
}: {
    tx: PostgresTransaction;
    conversationSlugId: string;
}) {
    const source = (
        await tx
            .select({
                conversationId: conversationTable.id,
                conversationSlugId: conversationTable.slugId,
                projectId: conversationTable.projectId,
                languageSettingsSource:
                    conversationTable.languageSettingsSource,
                dynamicTranslationEnabled:
                    conversationTable.dynamicTranslationEnabled,
                sourceLanguageCode: conversationContentTable.sourceLanguageCode,
            })
            .from(conversationTable)
            .innerJoin(
                conversationContentTable,
                eq(
                    conversationContentTable.id,
                    conversationTable.currentContentId,
                ),
            )
            .innerJoin(
                projectTable,
                eq(projectTable.id, conversationTable.projectId),
            )
            .where(
                and(
                    eq(conversationTable.slugId, conversationSlugId),
                    eq(conversationTable.isImporting, false),
                    isNull(conversationTable.deletedAt),
                    isNull(projectTable.deletedAt),
                ),
            )
    ).at(0);
    if (source === undefined) return undefined;
    return {
        conversationId: source.conversationId,
        policy: await resolveConversationTranslationTargetLanguagePolicy({
            db: tx,
            source,
        }),
    };
}
