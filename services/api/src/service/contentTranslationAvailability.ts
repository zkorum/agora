import { httpErrors } from "@fastify/sensible";
import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    conversationContentTable,
    conversationTable,
    conversationTranslationTargetLanguageTable,
    projectContentTable,
    projectTable,
    projectTranslationTargetLanguageTable,
} from "@/shared-backend/schema.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import type { ConversationMultilingualSetting } from "@/shared/types/zod.js";
import { getLanguagePreferences } from "./language.js";
import { getProjectLanguageSettings } from "./projectAccess.js";
import { getImplicitDefaultDisplayLanguage } from "./projectLanguage.js";
import {
    getConversationOverrideTranslationTargetLanguagePolicy,
    getProjectTranslationTargetLanguagePolicy,
    isTranslationAllowedForTarget,
    normalizeInheritedConversationMultilingualSettings,
    sourceLanguageToDisplayLanguage,
} from "./translationLanguageSetting.js";

export function createContentTranslationAvailabilityService(
    db: PostgresJsDatabase,
) {
    async function getContentTranslationAvailabilityForConversation({
        database = db,
        conversationSlugId,
        targetLanguageCode,
        expectedProjectId,
    }: {
        database?: PostgresJsDatabase;
        conversationSlugId: string;
        targetLanguageCode: SupportedDisplayLanguageCodes;
        expectedProjectId?: number;
    }) {
        const rows = await database
            .select({
                dynamicTranslationEnabled:
                    conversationTable.dynamicTranslationEnabled,
                languageSettingsSource:
                    conversationTable.languageSettingsSource,
                projectId: conversationTable.projectId,
                sourceLanguageCode: conversationContentTable.sourceLanguageCode,
                targetLanguageCode:
                    conversationTranslationTargetLanguageTable.languageCode,
            })
            .from(conversationTable)
            .innerJoin(
                conversationContentTable,
                eq(
                    conversationContentTable.id,
                    conversationTable.currentContentId,
                ),
            )
            .leftJoin(
                conversationTranslationTargetLanguageTable,
                and(
                    eq(
                        conversationTranslationTargetLanguageTable.conversationId,
                        conversationTable.id,
                    ),
                    isNull(
                        conversationTranslationTargetLanguageTable.deletedAt,
                    ),
                ),
            )
            .where(
                and(
                    eq(conversationTable.slugId, conversationSlugId),
                    expectedProjectId === undefined
                        ? undefined
                        : eq(conversationTable.projectId, expectedProjectId),
                    eq(conversationTable.isImporting, false),
                ),
            );
        const firstRow = rows.at(0);
        if (firstRow === undefined) {
            throw httpErrors.notFound("Content translation subject not found");
        }

        const inheritedLanguageSettings =
            firstRow.languageSettingsSource === "project_inherited"
                ? await getProjectLanguageSettings({
                      db: database,
                      projectId: firstRow.projectId,
                  })
                : undefined;
        const multilingualSetting: ConversationMultilingualSetting =
            inheritedLanguageSettings !== undefined
                ? normalizeInheritedConversationMultilingualSettings({
                      languageSettings: inheritedLanguageSettings,
                  })
                : {
                      dynamicTranslationEnabled:
                          firstRow.dynamicTranslationEnabled,
                      additionalLanguageCodes: rows.flatMap((row) =>
                          row.targetLanguageCode === null
                              ? []
                              : [row.targetLanguageCode],
                      ),
                  };
        const detectedTargetLanguageCode = sourceLanguageToDisplayLanguage({
            sourceLanguageCode: firstRow.sourceLanguageCode,
        });
        const policy =
            inheritedLanguageSettings !== undefined
                ? getProjectTranslationTargetLanguagePolicy({
                      languageSettings: inheritedLanguageSettings,
                  })
                : getConversationOverrideTranslationTargetLanguagePolicy({
                      multilingualSettings: {
                          dynamicTranslationEnabled:
                              multilingualSetting.dynamicTranslationEnabled,
                          additionalLanguageCodes:
                              multilingualSetting.additionalLanguageCodes.filter(
                                  (languageCode) =>
                                      languageCode !==
                                      detectedTargetLanguageCode,
                              ),
                      },
                      detectedTargetLanguageCode,
                  });
        return {
            isAllowed: isTranslationAllowedForTarget({
                policy,
                targetLanguageCode,
            }),
            multilingualSetting,
        };
    }

    async function getContentTranslationAvailabilityForProject({
        database = db,
        projectSlug,
        targetLanguageCode,
        conversationSlugId,
    }: {
        database?: PostgresJsDatabase;
        projectSlug: string;
        targetLanguageCode: SupportedDisplayLanguageCodes;
        conversationSlugId?: string;
    }): Promise<{
        isAllowed: boolean;
        multilingualSetting: ConversationMultilingualSetting;
    }> {
        const rows = await database
            .select({
                projectId: projectTable.id,
                dynamicTranslationEnabled:
                    projectTable.dynamicTranslationEnabled,
                sourceLanguageCode: projectContentTable.sourceLanguageCode,
                targetLanguageCode:
                    projectTranslationTargetLanguageTable.languageCode,
            })
            .from(projectTable)
            .innerJoin(
                projectContentTable,
                eq(projectContentTable.id, projectTable.currentContentId),
            )
            .leftJoin(
                projectTranslationTargetLanguageTable,
                and(
                    eq(
                        projectTranslationTargetLanguageTable.projectId,
                        projectTable.id,
                    ),
                    isNull(projectTranslationTargetLanguageTable.deletedAt),
                ),
            )
            .where(
                and(
                    eq(projectTable.slug, projectSlug),
                    isNull(projectTable.deletedAt),
                    isNull(projectContentTable.deletedAt),
                ),
            );
        const firstRow = rows.at(0);
        if (firstRow === undefined) {
            throw httpErrors.notFound("Content translation subject not found");
        }

        const multilingualSetting: ConversationMultilingualSetting = {
            dynamicTranslationEnabled: firstRow.dynamicTranslationEnabled,
            additionalLanguageCodes: rows.flatMap((row) =>
                row.targetLanguageCode === null ? [] : [row.targetLanguageCode],
            ),
        };
        const policy = getProjectTranslationTargetLanguagePolicy({
            languageSettings: {
                dynamicTranslationEnabled: firstRow.dynamicTranslationEnabled,
                defaultLanguageCode:
                    sourceLanguageToDisplayLanguage({
                        sourceLanguageCode: firstRow.sourceLanguageCode,
                    }) ?? getImplicitDefaultDisplayLanguage(),
                targetLanguageCodes:
                    multilingualSetting.additionalLanguageCodes,
            },
        });
        const isAllowed = isTranslationAllowedForTarget({
            policy,
            targetLanguageCode,
        });
        if (
            isAllowed ||
            conversationSlugId === undefined ||
            !firstRow.dynamicTranslationEnabled
        ) {
            return { isAllowed, multilingualSetting };
        }

        const conversationAvailability =
            await getContentTranslationAvailabilityForConversation({
                database,
                conversationSlugId,
                targetLanguageCode,
                expectedProjectId: firstRow.projectId,
            });
        return conversationAvailability.isAllowed
            ? conversationAvailability
            : { isAllowed: false, multilingualSetting };
    }

    async function getPreferredContentTranslationAvailabilityForConversation({
        database = db,
        conversationSlugId,
        displayLanguage,
    }: {
        database?: PostgresJsDatabase;
        conversationSlugId: string;
        displayLanguage: SupportedDisplayLanguageCodes;
    }) {
        const availability =
            await getContentTranslationAvailabilityForConversation({
                database,
                conversationSlugId,
                targetLanguageCode: displayLanguage,
            });
        return {
            targetLanguageCode: displayLanguage,
            isAllowed: availability.isAllowed,
        };
    }

    async function getContentDisplayLanguagePreferences({
        database = db,
        personalizationUserId,
        headerDisplayLanguage,
    }: {
        database?: PostgresJsDatabase;
        personalizationUserId: string | undefined;
        headerDisplayLanguage: SupportedDisplayLanguageCodes;
    }) {
        return personalizationUserId === undefined
            ? {
                  displayLanguage: headerDisplayLanguage,
                  spokenLanguages: [headerDisplayLanguage],
              }
            : await getLanguagePreferences({
                  db: database,
                  userId: personalizationUserId,
                  request: { currentDisplayLanguage: headerDisplayLanguage },
              });
    }

    async function getDisplayContentPreferencesForConversation({
        database = db,
        conversationSlugId,
        personalizationUserId,
        headerDisplayLanguage,
    }: {
        database?: PostgresJsDatabase;
        conversationSlugId: string;
        personalizationUserId: string | undefined;
        headerDisplayLanguage: SupportedDisplayLanguageCodes;
    }) {
        const languagePreferences = await getContentDisplayLanguagePreferences({
            database,
            personalizationUserId,
            headerDisplayLanguage,
        });
        const availability =
            await getPreferredContentTranslationAvailabilityForConversation({
                database,
                conversationSlugId,
                displayLanguage: languagePreferences.displayLanguage,
            });
        return {
            displayLanguage: languagePreferences.displayLanguage,
            targetLanguage: languagePreferences.displayLanguage,
            spokenLanguages: languagePreferences.spokenLanguages,
            translationAllowed: availability.isAllowed,
        };
    }

    return {
        getContentTranslationAvailabilityForConversation,
        getContentTranslationAvailabilityForProject,
        getPreferredContentTranslationAvailabilityForConversation,
        getContentDisplayLanguagePreferences,
        getDisplayContentPreferencesForConversation,
    };
}
