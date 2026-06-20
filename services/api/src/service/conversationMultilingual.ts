import { eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    conversationTranslationSettingTable,
    conversationTranslationTargetLanguageTable,
} from "@/shared-backend/schema.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import type {
    ConversationLanguageSettingInput,
    ConversationMultilingualSetting,
} from "@/shared/types/zod.js";

export const DEFAULT_CONVERSATION_MULTILINGUAL_SETTING: ConversationMultilingualSetting = {
    additionalLanguageCodes: [],
    dynamicTranslationEnabled: false,
};

export function getUniqueConfiguredConversationLanguageCodes({
    mainLanguageCode,
    additionalLanguageCodes,
}: {
    mainLanguageCode: SupportedDisplayLanguageCodes | null;
    additionalLanguageCodes: readonly SupportedDisplayLanguageCodes[];
}): SupportedDisplayLanguageCodes[] {
    const languageCodes = new Set<SupportedDisplayLanguageCodes>();
    if (mainLanguageCode !== null) {
        languageCodes.add(mainLanguageCode);
    }
    for (const languageCode of additionalLanguageCodes) {
        languageCodes.add(languageCode);
    }
    return [...languageCodes];
}

export function normalizeConversationMultilingualSetting({
    languageSetting,
    multilingualSetting,
    canUseDynamicTranslation,
}: {
    languageSetting: ConversationLanguageSettingInput;
    multilingualSetting: ConversationMultilingualSetting;
    canUseDynamicTranslation: boolean;
}): ConversationMultilingualSetting {
    if (!canUseDynamicTranslation) {
        return DEFAULT_CONVERSATION_MULTILINGUAL_SETTING;
    }

    const uniqueLanguageCodes = Array.from(
        new Set(multilingualSetting.additionalLanguageCodes),
    );
    const additionalLanguageCodes =
        languageSetting.mode === "manual"
            ? uniqueLanguageCodes.filter(
                  (languageCode) => languageCode !== languageSetting.languageCode,
              )
            : uniqueLanguageCodes;

    return {
        dynamicTranslationEnabled:
            multilingualSetting.dynamicTranslationEnabled,
        additionalLanguageCodes: additionalLanguageCodes.slice(0, 2),
    };
}

export async function getConversationMultilingualSetting({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId: number;
}): Promise<ConversationMultilingualSetting> {
    const settingRows = await db
        .select({
            settingId: conversationTranslationSettingTable.id,
            dynamicTranslationEnabled:
                conversationTranslationSettingTable.dynamicTranslationEnabled,
        })
        .from(conversationTranslationSettingTable)
        .where(
            eq(conversationTranslationSettingTable.conversationId, conversationId),
        )
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
                conversationTranslationTargetLanguageTable.translationSettingId,
                setting.settingId,
            ),
        );

    return {
        dynamicTranslationEnabled: setting.dynamicTranslationEnabled,
        additionalLanguageCodes: languageRows.map(
            (row): SupportedDisplayLanguageCodes => row.languageCode,
        ),
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
            conversationId: conversationTranslationSettingTable.conversationId,
            dynamicTranslationEnabled:
                conversationTranslationSettingTable.dynamicTranslationEnabled,
            languageCode: conversationTranslationTargetLanguageTable.languageCode,
        })
        .from(conversationTranslationSettingTable)
        .leftJoin(
            conversationTranslationTargetLanguageTable,
            eq(
                conversationTranslationTargetLanguageTable.translationSettingId,
                conversationTranslationSettingTable.id,
            ),
        )
        .where(
            inArray(
                conversationTranslationSettingTable.conversationId,
                uniqueConversationIds,
            ),
        );

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
    const settingRows = await db
        .insert(conversationTranslationSettingTable)
        .values({
            conversationId,
            dynamicTranslationEnabled: setting.dynamicTranslationEnabled,
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: conversationTranslationSettingTable.conversationId,
            set: {
                dynamicTranslationEnabled: setting.dynamicTranslationEnabled,
                updatedAt: now,
            },
        })
        .returning({ settingId: conversationTranslationSettingTable.id });
    const settingId = settingRows[0].settingId;

    await db
        .delete(conversationTranslationTargetLanguageTable)
        .where(
            eq(
                conversationTranslationTargetLanguageTable.translationSettingId,
                settingId,
            ),
        );

    if (setting.additionalLanguageCodes.length === 0) {
        return;
    }

    await db.insert(conversationTranslationTargetLanguageTable).values(
        setting.additionalLanguageCodes.map((languageCode) => ({
            translationSettingId: settingId,
            languageCode,
            createdAt: now,
        })),
    );
}
