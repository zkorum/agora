import { and, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { Dto } from "@/shared/types/dto.js";
import {
    conversationTable,
    rankingConversationConfigTable,
} from "@/shared-backend/schema.js";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import type { Valkey } from "@/shared-backend/valkey.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { normalizeUserRichTextInput } from "./richText.js";
import { resolveContentLanguageMetadata } from "./contentLanguageMetadata.js";
import {
    prepareParticipantStatement,
    withParticipantStatementAdmission,
} from "./participantStatementAdmission.js";
import { createRankingItem, markRankingScoringDirty } from "./rankingItem.js";
import { lockRankingScoringConfig } from "./comparison.js";
import { queueComparisonItemsUpdatedEvent } from "./realtimeEventOutbox.js";

export async function createComparisonStatement({
    db,
    request,
    didWrite,
    userAgent,
    now,
    currentDisplayLanguage,
    googleCloudCredentials,
    valkey,
}: {
    db: PostgresDatabase;
    request: z.infer<typeof Dto.createComparisonStatementRequest>;
    didWrite: string;
    userAgent: string;
    now: Date;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
    valkey: Valkey | undefined;
}): Promise<z.infer<typeof Dto.createComparisonStatementResponse>> {
    const normalized = normalizeUserRichTextInput({
        html: request.statementBody,
        validationMode: "opinion",
    });
    if (!normalized.success)
        return { success: false, reason: normalized.reason };
    const preparation = await prepareParticipantStatement({
        db,
        conversationSlugId: request.conversationSlugId,
        family: "comparisons",
        didWrite,
        now,
    });
    if (!preparation.success) return preparation;
    const sourceLanguageMetadata = await resolveContentLanguageMetadata({
        text: normalized.content.plainText,
        googleCloudCredentials,
        useGoogleLanguageDetection: preparation.dynamicTranslationEnabled,
    });
    const result = await withParticipantStatementAdmission({
        db,
        conversationSlugId: request.conversationSlugId,
        family: "comparisons",
        didWrite,
        userAgent,
        now,
        currentDisplayLanguage,
        persist: async ({
            tx,
            conversationId,
            conversationContentId,
            participantId,
        }) => {
            await lockRankingScoringConfig({ db: tx, conversationId });
            const item = await createRankingItem({
                db: tx,
                tx,
                conversationId,
                conversationSlugId: request.conversationSlugId,
                conversationContentId,
                authorId: participantId,
                isSeed: false,
                normalizedContent: {
                    title: normalized.content.html,
                    bodyHtml: null,
                    bodyPlainText: null,
                    sourceLanguageMetadata,
                },
            });
            await tx
                .update(rankingConversationConfigTable)
                .set({
                    itemCount: sql`${rankingConversationConfigTable.itemCount} + 1`,
                    totalItemCount: sql`${rankingConversationConfigTable.totalItemCount} + 1`,
                    updatedAt: now,
                })
                .from(conversationTable)
                .where(
                    and(
                        eq(conversationTable.id, conversationId),
                        eq(
                            rankingConversationConfigTable.id,
                            conversationTable.rankingConfigId,
                        ),
                    ),
                );
            await queueComparisonItemsUpdatedEvent({
                db: tx,
                conversationSlugId: request.conversationSlugId,
            });
            return { item, conversationId };
        },
    });
    if (!result.success) return result;
    markRankingScoringDirty({
        valkey,
        conversationId: result.value.conversationId,
        conversationSlugId: request.conversationSlugId,
    });
    return {
        success: true,
        itemSlugId: result.value.item.slugId,
        sourceVersion: result.value.item.contentSource.publicId,
        loginStatus: result.loginStatus,
    };
}
