import { eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    conversationTable,
    conversationTranslationTargetLanguageTable,
} from "@/shared-backend/schema.js";
import type { ConversationMultilingualSetting } from "@/shared/types/zod.js";

export const DEFAULT_CONVERSATION_MULTILINGUAL_SETTING: ConversationMultilingualSetting = {
    additionalLanguageCodes: [],
    dynamicTranslationEnabled: false,
};

export async function getConversationMultilingualSetting({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId: number;
}): Promise<ConversationMultilingualSetting> {
    const settingRows = await db
        .select({
            dynamicTranslationEnabled:
                conversationTable.dynamicTranslationEnabled,
        })
        .from(conversationTable)
        .where(eq(conversationTable.id, conversationId))
        .limit(1);
    const setting = settingRows.at(0);
    if (setting === undefined) {
        return DEFAULT_CONVERSATION_MULTILINGUAL_SETTING;
    }

    const languageRows = await db
        .select({
            languageCode:
                conversationTranslationTargetLanguageTable.languageCode,
        })
        .from(conversationTranslationTargetLanguageTable)
        .where(
            eq(
                conversationTranslationTargetLanguageTable.conversationId,
                conversationId,
            ),
        );

    return {
        dynamicTranslationEnabled: setting.dynamicTranslationEnabled,
        additionalLanguageCodes: languageRows.map((row) => row.languageCode),
    };
}

export async function getConversationMultilingualSettingsByConversationId({
    db,
    conversationIds,
}: {
    db: PostgresDatabase;
    conversationIds: number[];
}): Promise<Map<number, ConversationMultilingualSetting>> {
    const uniqueConversationIds = Array.from(new Set(conversationIds));
    const settings = new Map<number, ConversationMultilingualSetting>();
    for (const conversationId of uniqueConversationIds) {
        settings.set(conversationId, {
            dynamicTranslationEnabled: false,
            additionalLanguageCodes: [],
        });
    }

    if (uniqueConversationIds.length === 0) {
        return settings;
    }

    const rows = await db
        .select({
            conversationId: conversationTable.id,
            dynamicTranslationEnabled: conversationTable.dynamicTranslationEnabled,
            languageCode: conversationTranslationTargetLanguageTable.languageCode,
        })
        .from(conversationTable)
        .leftJoin(
            conversationTranslationTargetLanguageTable,
            eq(
                conversationTranslationTargetLanguageTable.conversationId,
                conversationTable.id,
            ),
        )
        .where(inArray(conversationTable.id, uniqueConversationIds));

    for (const row of rows) {
        const existingSetting = settings.get(row.conversationId);
        const setting = existingSetting ?? {
            dynamicTranslationEnabled: row.dynamicTranslationEnabled,
            additionalLanguageCodes: [],
        };
        setting.dynamicTranslationEnabled = row.dynamicTranslationEnabled;
        if (row.languageCode !== null) {
            setting.additionalLanguageCodes.push(row.languageCode);
        }
        if (existingSetting === undefined) {
            settings.set(row.conversationId, setting);
        }
    }

    return settings;
}

export async function upsertConversationMultilingualSetting({
    db,
    conversationId,
    setting,
    now,
}: {
    db: PostgresDatabase;
    conversationId: number;
    setting: ConversationMultilingualSetting;
    now: Date;
}): Promise<void> {
    await db
        .update(conversationTable)
        .set({
            dynamicTranslationEnabled: setting.dynamicTranslationEnabled,
            updatedAt: now,
        })
        .where(eq(conversationTable.id, conversationId));

    await db
        .delete(conversationTranslationTargetLanguageTable)
        .where(
            eq(
                conversationTranslationTargetLanguageTable.conversationId,
                conversationId,
            ),
        );

    if (setting.additionalLanguageCodes.length === 0) {
        return;
    }

    await db.insert(conversationTranslationTargetLanguageTable).values(
        setting.additionalLanguageCodes.map((languageCode) => ({
            conversationId,
            languageCode,
            createdAt: now,
        })),
    );
}
