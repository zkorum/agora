// Edit conversation functionality
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { log } from "@/app.js";
import {
    conversationContentTable,
    conversationTable,
    conversationModerationTable,
    organizationTable,
    polisConversationConfigTable,
    projectContentTable,
    projectOrganizationOwnershipTable,
    projectTable,
} from "@/shared-backend/schema.js";
import { and, eq, isNull } from "drizzle-orm";
import { httpErrors } from "@fastify/sensible";
import { toUnionUndefined } from "@/shared/shared.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import {
    getActiveSurveyConfigRecord,
    getSurveyConfigForConversation,
    setSurveyConfigForConversation,
} from "@/service/survey.js";
import type {
    GetConversationForEditResponse,
    UpdateConversationRequest,
    UpdateConversationResponse,
} from "@/shared/types/dto.js";
import {
    getProjectLanguageSettings,
    hasProjectCapability,
} from "@/service/projectAccess.js";
import {
    buildConversationEditPermissions,
    getPremiumEntitlementSubjectForConversation,
    getPremiumFeaturesInConversation,
    getRestrictedPremiumFeatures,
} from "@/service/premiumEntitlement.js";
import { createConversationViewSnapshotsFromCurrentState } from "@/service/conversationViewSnapshot.js";
import { queueConversationSettingsUpdatedEvent } from "@/service/realtimeEventOutbox.js";
import {
    buildConversationLanguageDetectionCorpus,
    buildGoogleConversationLanguageDetectionCorpus,
    conversationContentSourceMetadataToContentLanguageMetadataOutput,
    conversationContentSourceMetadataToLanguageSettingOutput,
} from "@/service/conversationLanguage.js";
import {
    getConversationMultilingualSetting,
    upsertConversationMultilingualSetting,
} from "@/service/conversationMultilingual.js";
import {
    buildContentBlockLanguageDetectionCorpus,
    buildSurveyLanguageDetectionCorpus,
    contentLanguageMetadataUpdateValues,
    refreshCurrentConversationOwnedContentLanguageMetadata,
    type ContentLanguageMetadata,
    resolveContentLanguageMetadata,
} from "./contentLanguageMetadata.js";
import { getImplicitDefaultDisplayLanguage } from "./projectLanguage.js";
import {
    getManualMultilingualSettingsFromEffectiveTargets,
    getManualMultilingualSettingsFromProjectLanguageSettings,
    getConversationOverrideTranslationTargetLanguagePolicy,
    getProjectTranslationTargetLanguagePolicy,
    normalizeConversationMultilingualSettings,
    normalizeInheritedConversationMultilingualSettings,
    sourceLanguageToDisplayLanguage,
} from "./translationLanguageSetting.js";
import { normalizeUserRichTextInput } from "./richText.js";
import {
    createEagerContentTranslationWorkForKnownConversation,
    fetchCurrentSurveyQuestionSources,
    fetchSeedOpinionSources,
    type ConversationContentSource,
    type SurveyQuestionContentSource,
} from "./contentTranslation.js";

interface GetConversationForEditProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
}

export async function getConversationForEdit({
    db,
    conversationSlugId,
    userId,
}: GetConversationForEditProps): Promise<GetConversationForEditResponse> {
    const results = await db
        .select({
            conversationId: conversationTable.id,
            conversationSlugId: conversationTable.slugId,
            projectId: conversationTable.projectId,
            projectSlug: projectTable.slug,
            projectTitle: projectTable.title,
            projectDirectoryVisibility: projectTable.directoryVisibility,
            projectSourceLanguageCode: projectContentTable.sourceLanguageCode,
            conversationTitle: conversationContentTable.title,
            conversationBody: conversationContentTable.body,
            sourceLanguageCode: conversationContentTable.sourceLanguageCode,
            sourceRawLanguageCode: conversationContentTable.sourceRawLanguageCode,
            sourceLanguageConfidence:
                conversationContentTable.sourceLanguageConfidence,
            isIndexed: conversationTable.isIndexed,
            participationMode: conversationTable.participationMode,
            conversationType: conversationTable.conversationType,
            requiresEventTicket: conversationTable.requiresEventTicket,
            aiLabelingEnabled: polisConversationConfigTable.aiLabelingEnabled,
            preferredOpinionGroupCount:
                polisConversationConfigTable.preferredOpinionGroupCount,
            postAsOrganizationName: organizationTable.displayName,
            autoProvisionedForUserId:
                organizationTable.autoProvisionedForUserId,
            createdAt: conversationTable.createdAt,
            updatedAt: conversationTable.updatedAt,
            moderationAction: conversationModerationTable.moderationAction,
            languageSettingsSource: conversationTable.languageSettingsSource,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationTable.projectId),
        )
        .leftJoin(
            projectContentTable,
            eq(projectContentTable.id, projectTable.currentContentId),
        )
        .innerJoin(
            projectOrganizationOwnershipTable,
            and(
                eq(
                    projectOrganizationOwnershipTable.projectId,
                    conversationTable.projectId,
                ),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        )
        .innerJoin(
            organizationTable,
            eq(
                projectOrganizationOwnershipTable.organizationId,
                organizationTable.id,
            ),
        )
        .leftJoin(
            polisConversationConfigTable,
            eq(polisConversationConfigTable.id, conversationTable.polisConfigId),
        )
        .leftJoin(
            conversationModerationTable,
            and(
                eq(
                    conversationModerationTable.conversationId,
                    conversationTable.id,
                ),
                isNull(conversationModerationTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                isNull(organizationTable.deletedAt),
            ),
        );

    if (results.length === 0) {
        return { success: false, reason: "not_found" };
    }

    const conversation = results[0];

    const canUpdateConversation = await hasProjectCapability({
        db,
        userId,
        projectId: conversation.projectId,
        capability: "conversation_update",
    });
    if (!canUpdateConversation) {
        return { success: false, reason: "not_author" };
    }

    // Check if conversation is locked
    const isLocked = conversation.moderationAction === "lock";

    const surveyConfig = await getSurveyConfigForConversation({
        db,
        conversationId: conversation.conversationId,
    });
    const multilingualSetting = await getConversationMultilingualSetting({
        db,
        conversationId: conversation.conversationId,
    });
    const projectLanguageSettings = await getProjectLanguageSettings({
        db,
        projectId: conversation.projectId,
    });
    const projectLanguageProject =
        conversation.projectDirectoryVisibility === "listed"
            ? {
                  projectSlug: conversation.projectSlug,
                  projectTitle: conversation.projectTitle,
                  defaultLanguageCode:
                      sourceLanguageToDisplayLanguage({
                          sourceLanguageCode: conversation.projectSourceLanguageCode,
                      }) ?? getImplicitDefaultDisplayLanguage(),
                  languageSettings: {
                      dynamicTranslationEnabled:
                          projectLanguageSettings.dynamicTranslationEnabled,
                      targetLanguageCodes: [
                          ...projectLanguageSettings.targetLanguageCodes,
                      ],
                  },
              }
            : undefined;
    const editMultilingualSetting =
        conversation.languageSettingsSource === "conversation_override"
            ? getManualMultilingualSettingsFromEffectiveTargets({
                  effectiveMultilingualSettings: multilingualSetting,
                  detectedTargetLanguageCode: sourceLanguageToDisplayLanguage({
                      sourceLanguageCode: conversation.sourceLanguageCode,
                  }),
              })
            : {
                  dynamicTranslationEnabled:
                      projectLanguageSettings.dynamicTranslationEnabled,
                  additionalLanguageCodes: [],
              };

    const editPermissions = await buildConversationEditPermissions({
        db,
        conversation: {
            conversationId: conversation.conversationId,
            projectId: conversation.projectId,
            userId,
            requiresEventTicket: conversation.requiresEventTicket,
        },
        hasSurvey: surveyConfig !== undefined,
        now: new Date(),
    });

    return {
        success: true,
        conversationSlugId: conversation.conversationSlugId,
        conversationTitle: conversation.conversationTitle,
        conversationBody: toUnionUndefined(conversation.conversationBody),
        contentLanguageMetadata:
            conversationContentSourceMetadataToContentLanguageMetadataOutput({
                sourceLanguageCode: conversation.sourceLanguageCode,
                sourceRawLanguageCode: conversation.sourceRawLanguageCode,
                sourceLanguageConfidence: conversation.sourceLanguageConfidence,
            }),
        languageSetting: conversationContentSourceMetadataToLanguageSettingOutput({
            sourceLanguageCode: conversation.sourceLanguageCode,
            sourceRawLanguageCode: conversation.sourceRawLanguageCode,
            sourceLanguageConfidence: conversation.sourceLanguageConfidence,
        }),
        multilingualSetting: editMultilingualSetting,
        languageSettingsSource: conversation.languageSettingsSource,
        projectLanguageProject,
        isIndexed: conversation.isIndexed,
        participationMode: conversation.participationMode,
        requiresEventTicket: toUnionUndefined(conversation.requiresEventTicket),
        aiLabelingEnabled: conversation.aiLabelingEnabled ?? false,
        preferredOpinionGroupCount:
            editPermissions.canUseAnalysisVariantsPreference
                ? (conversation.preferredOpinionGroupCount ?? null)
                : null,
        postAsOrganizationName: toUnionUndefined(
            conversation.autoProvisionedForUserId === null
                ? conversation.postAsOrganizationName
                : null,
        ),
        surveyConfig,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        isLocked,
        editPermissions,
    };
}

interface UpdateConversationProps {
    db: PostgresDatabase;
    userId: string;
    googleCloudCredentials?: GoogleCloudCredentials;
    data: Omit<UpdateConversationRequest, "conversationSlugId"> & {
        conversationSlugId: string;
    };
}

type UpdateConversationServiceResponse =
    | Exclude<UpdateConversationResponse, { success: true }>
    | (Extract<UpdateConversationResponse, { success: true }> & {
          eagerContentTranslationWorkIds: number[];
      });

export async function updateConversation({
    db,
    userId,
    googleCloudCredentials,
    data,
}: UpdateConversationProps): Promise<UpdateConversationServiceResponse> {
    const {
        conversationSlugId,
        conversationTitle,
        conversationBody,
        conversationBodyPlainText,
        isIndexed,
        participationMode,
        languageSettingsSource,
        multilingualSetting,
        requiresEventTicket,
        aiLabelingEnabled,
        preferredOpinionGroupCount,
        surveyConfig,
    } = data;

    let sanitizedBody = conversationBody;
    let bodyPlainText = "";
    if (sanitizedBody != null) {
        try {
            const normalizationResult = normalizeUserRichTextInput({
                html: sanitizedBody,
                plainText: conversationBodyPlainText,
                validationMode: "conversation",
                logLabel:
                    "[ConversationPlainText] Frontend/backend plain text mismatch on update",
            });
            if (!normalizationResult.success) {
                return normalizationResult;
            }
            sanitizedBody = normalizationResult.content.html;
            bodyPlainText = normalizationResult.content.plainText;
        } catch (error) {
            if (error instanceof Error) {
                throw httpErrors.badRequest(error.message);
            } else {
                throw httpErrors.badRequest(
                    "Error while sanitizing request body",
                );
            }
        }
    }

    const result = await db.transaction(async (tx) => {
        const now = new Date();
        // Get conversation and check authorization
        const conversationResults = await tx
            .select({
                conversationId: conversationTable.id,
                projectId: conversationTable.projectId,
                organizationName: organizationTable.displayName,
                currentContentId: conversationTable.currentContentId,
                conversationType: conversationTable.conversationType,
                polisConfigId: conversationTable.polisConfigId,
                isIndexed: conversationTable.isIndexed,
                participationMode: conversationTable.participationMode,
                requiresEventTicket: conversationTable.requiresEventTicket,
                aiLabelingEnabled: polisConversationConfigTable.aiLabelingEnabled,
                isClosed: conversationTable.isClosed,
                currentPreferredOpinionGroupCount:
                    polisConversationConfigTable.preferredOpinionGroupCount,
                currentLanguageSettingsSource:
                    conversationTable.languageSettingsSource,
                currentTitle: conversationContentTable.title,
                currentBody: conversationContentTable.body,
                currentSourceLanguageCode:
                    conversationContentTable.sourceLanguageCode,
                currentSourceRawLanguageCode:
                    conversationContentTable.sourceRawLanguageCode,
                currentSourceLanguageProvider:
                    conversationContentTable.sourceLanguageProvider,
                currentSourceLanguageConfidence:
                    conversationContentTable.sourceLanguageConfidence,
                currentContentPublicId: conversationContentTable.publicId,
                moderationAction: conversationModerationTable.moderationAction,
            })
            .from(conversationTable)
            .leftJoin(
                conversationContentTable,
                eq(
                    conversationContentTable.id,
                    conversationTable.currentContentId,
                ),
            )
            .innerJoin(
                projectOrganizationOwnershipTable,
                and(
                    eq(
                        projectOrganizationOwnershipTable.projectId,
                        conversationTable.projectId,
                    ),
                    isNull(projectOrganizationOwnershipTable.deletedAt),
                ),
            )
            .innerJoin(
                organizationTable,
                eq(
                    projectOrganizationOwnershipTable.organizationId,
                    organizationTable.id,
                ),
            )
            .leftJoin(
                polisConversationConfigTable,
                eq(polisConversationConfigTable.id, conversationTable.polisConfigId),
            )
            .leftJoin(
                conversationModerationTable,
                and(
                    eq(
                        conversationModerationTable.conversationId,
                        conversationTable.id,
                    ),
                    isNull(conversationModerationTable.deletedAt),
                ),
            )
            .where(
                and(
                    eq(conversationTable.slugId, conversationSlugId),
                    isNull(organizationTable.deletedAt),
                ),
            );

        if (conversationResults.length === 0) {
            return { success: false, reason: "not_found" } as const;
        }

        const conversation = conversationResults[0];

        const canUpdateConversation = await hasProjectCapability({
            db: tx,
            userId,
            projectId: conversation.projectId,
            capability: "conversation_update",
        });
        if (!canUpdateConversation) {
            return { success: false, reason: "not_author" } as const;
        }

        // Check if conversation is locked
        if (conversation.moderationAction === "lock") {
            return {
                success: false,
                reason: "conversation_locked",
            } as const;
        }

        // Check if conversation was deleted
        if (
            conversation.currentContentId === null ||
            conversation.currentContentPublicId === null ||
            conversation.currentTitle === null
        ) {
            return { success: false, reason: "not_found" } as const;
        }

        const conversationId = conversation.conversationId;
        const effectiveSurveyConfig =
            surveyConfig === undefined
                ? ((await getSurveyConfigForConversation({
                      db: tx,
                      conversationId,
                  })) ?? null)
                : surveyConfig;
        const surveyLanguageDetectionCorpus = buildSurveyLanguageDetectionCorpus({
            surveyConfig: effectiveSurveyConfig,
        });
        const currentMultilingualSetting = await getConversationMultilingualSetting({
            db: tx,
            conversationId,
        });
        const inheritedProjectLanguageSettings =
            languageSettingsSource === "project_inherited"
                ? await getProjectLanguageSettings({
                      db: tx,
                      projectId: conversation.projectId,
                  })
                : undefined;
        const requestedMultilingualSetting =
            inheritedProjectLanguageSettings === undefined
                ? multilingualSetting
                : normalizeInheritedConversationMultilingualSettings({
                      languageSettings: inheritedProjectLanguageSettings,
                  });
        const premiumMultilingualSetting =
            inheritedProjectLanguageSettings === undefined
                ? multilingualSetting
                : getManualMultilingualSettingsFromProjectLanguageSettings({
                      languageSettings: inheritedProjectLanguageSettings,
                  });
        const subject = getPremiumEntitlementSubjectForConversation({
            conversation: { projectId: conversation.projectId, userId },
        });
        const restrictedDynamicTranslationFeatures =
            await getRestrictedPremiumFeatures({
                db: tx,
                subject,
                features: ["dynamic_translation"],
                mode: "creation",
                now,
            });
        const canUseDynamicTranslation =
            restrictedDynamicTranslationFeatures.length === 0;
        if (
            restrictedDynamicTranslationFeatures.length > 0 &&
            (premiumMultilingualSetting.dynamicTranslationEnabled ||
                premiumMultilingualSetting.additionalLanguageCodes.length > 0)
        ) {
            return {
                success: false,
                reason: "premium_access_required",
            } as const;
        }
        const requestedDynamicTranslationEnabled =
            canUseDynamicTranslation &&
            requestedMultilingualSetting.dynamicTranslationEnabled;
        const currentBody = toUnionUndefined(conversation.currentBody);
        const contentChanged =
            conversation.currentTitle !== conversationTitle ||
            currentBody !== sanitizedBody;
        let blockSourceLanguageMetadataPromise:
            | Promise<ContentLanguageMetadata>
            | undefined;
        const getBlockSourceLanguageMetadata = (): Promise<ContentLanguageMetadata> => {
            blockSourceLanguageMetadataPromise ??= resolveContentLanguageMetadata({
                text: buildContentBlockLanguageDetectionCorpus({
                    conversationCorpus: buildConversationLanguageDetectionCorpus({
                        conversationTitle,
                        bodyPlainText,
                    }),
                    surveyConfig: effectiveSurveyConfig,
                }),
                googleText: buildGoogleConversationLanguageDetectionCorpus({
                    conversationTitle,
                    bodyPlainText,
                    supplementalPlainText: surveyLanguageDetectionCorpus,
                }),
                googleCloudCredentials,
                useGoogleLanguageDetection: requestedDynamicTranslationEnabled,
            });
            return blockSourceLanguageMetadataPromise;
        };

        if (contentChanged) {
            const premiumFeatures = await getPremiumFeaturesInConversation({
                db: tx,
                conversation: {
                    conversationId,
                    requiresEventTicket: conversation.requiresEventTicket,
                },
            });
            const restrictedFeatures = await getRestrictedPremiumFeatures({
                db: tx,
                subject,
                features: premiumFeatures,
                mode: "edit",
                now,
            });
            if (restrictedFeatures.length > 0) {
                return {
                    success: false,
                    reason: "premium_access_expired",
                } as const;
            }
        }

        const previousEventTicket = toUnionUndefined(
            conversation.requiresEventTicket,
        );
        const eventTicketAdded =
            previousEventTicket === undefined &&
            requiresEventTicket !== undefined;

        if (eventTicketAdded) {
            return {
                success: false,
                reason: "invalid_access_settings",
            } as const;
        }

        let existingSurveyConfig:
            | Awaited<ReturnType<typeof getActiveSurveyConfigRecord>>
            | undefined;
        if (surveyConfig !== undefined) {
            existingSurveyConfig = await getActiveSurveyConfigRecord({
                db: tx,
                conversationId,
            });
            if (surveyConfig !== null) {
                const restrictedFeatures = await getRestrictedPremiumFeatures({
                    db: tx,
                    subject,
                    features: ["survey"],
                    mode:
                        existingSurveyConfig === undefined
                            ? "creation"
                            : "edit",
                    now,
                });
                if (restrictedFeatures.length > 0) {
                    return {
                        success: false,
                        reason: "premium_access_expired",
                    } as const;
                }
            }
        }

        const updatedPreferredOpinionGroupCount =
            preferredOpinionGroupCount === undefined
                ? conversation.currentPreferredOpinionGroupCount
                : preferredOpinionGroupCount;
        const preferredOpinionGroupCountChanged =
            updatedPreferredOpinionGroupCount !==
            conversation.currentPreferredOpinionGroupCount;
        const updatedAiLabelingEnabled =
            aiLabelingEnabled ?? conversation.aiLabelingEnabled ?? true;
        const conversationSettingsChanged =
            isIndexed !== conversation.isIndexed ||
            participationMode !== conversation.participationMode ||
            (requiresEventTicket ?? null) !==
                conversation.requiresEventTicket ||
            updatedAiLabelingEnabled !== (conversation.aiLabelingEnabled ?? true) ||
            preferredOpinionGroupCountChanged ||
            languageSettingsSource !== conversation.currentLanguageSettingsSource;

        if (
            preferredOpinionGroupCount !== undefined &&
            preferredOpinionGroupCount !== null
        ) {
            const restrictedFeatures = await getRestrictedPremiumFeatures({
                db: tx,
                subject,
                features: ["analysis_variants"],
                mode: "creation",
                now,
            });
            if (restrictedFeatures.length > 0) {
                return {
                    success: false,
                    reason: "premium_access_required",
                } as const;
            }
        }

        // Create new conversation content
        let newContentId: number | undefined;
        let newContentPublicId: string | undefined;
        if (contentChanged) {
            const sourceLanguageMetadata =
                await getBlockSourceLanguageMetadata();
            const newContentResult = await tx
                .insert(conversationContentTable)
                .values({
                    conversationId: conversationId,
                    title: conversationTitle,
                    body: sanitizedBody,
                    bodyPlainText,
                    ...contentLanguageMetadataUpdateValues(
                        sourceLanguageMetadata,
                    ),
                })
                .returning({
                    conversationContentId: conversationContentTable.id,
                    publicId: conversationContentTable.publicId,
                });

            newContentId = newContentResult[0].conversationContentId;
            newContentPublicId = newContentResult[0].publicId;
        }

        const conversationUpdateValues: {
            currentContentId?: number;
            isIndexed: boolean;
            participationMode: typeof participationMode;
            requiresEventTicket: typeof requiresEventTicket | null;
            languageSettingsSource: typeof languageSettingsSource;
            updatedAt: Date;
            isEdited?: boolean;
        } = {
            isIndexed: isIndexed,
            participationMode: participationMode,
            requiresEventTicket: requiresEventTicket ?? null,
            languageSettingsSource,
            updatedAt: new Date(),
        };

        if (newContentId !== undefined) {
            conversationUpdateValues.currentContentId = newContentId;
            conversationUpdateValues.isEdited = true;
        }

        // Update conversation with new content and settings
        await tx
            .update(conversationTable)
            .set(conversationUpdateValues)
            .where(eq(conversationTable.id, conversationId));

        if (
            conversation.conversationType === "polis" &&
            conversation.polisConfigId !== null &&
            (updatedAiLabelingEnabled !==
                (conversation.aiLabelingEnabled ?? true) ||
                preferredOpinionGroupCountChanged)
        ) {
            await tx
                .update(polisConversationConfigTable)
                .set({
                    aiLabelingEnabled: updatedAiLabelingEnabled,
                    preferredOpinionGroupCount: updatedPreferredOpinionGroupCount,
                    updatedAt: now,
                })
                .where(eq(polisConversationConfigTable.id, conversation.polisConfigId));
        }

        let surveySources: SurveyQuestionContentSource[] = [];
        if (surveyConfig !== undefined) {
            const sourceLanguageMetadata =
                await getBlockSourceLanguageMetadata();
            const surveyUpdateEffect = await setSurveyConfigForConversation({
                db: tx,
                conversationSlugId: data.conversationSlugId,
                conversationId,
                surveyConfig: surveyConfig ?? null,
                now,
                googleCloudCredentials,
                useGoogleLanguageDetection: requestedDynamicTranslationEnabled,
                sourceLanguageMetadata,
            });
            surveySources = surveyUpdateEffect.currentQuestionSources;
        }

        let refreshedSourceLanguageMetadata: ContentLanguageMetadata | undefined;
        if (
            !contentChanged &&
            requestedDynamicTranslationEnabled &&
            (!currentMultilingualSetting.dynamicTranslationEnabled ||
                surveyConfig !== undefined)
        ) {
            if (surveyConfig !== undefined) {
                refreshedSourceLanguageMetadata =
                    await getBlockSourceLanguageMetadata();
                await tx
                    .update(conversationContentTable)
                    .set(
                        contentLanguageMetadataUpdateValues(
                            refreshedSourceLanguageMetadata,
                        ),
                    )
                    .where(
                        eq(
                            conversationContentTable.id,
                            conversation.currentContentId,
                        ),
                    );
            } else {
                refreshedSourceLanguageMetadata =
                    await refreshCurrentConversationOwnedContentLanguageMetadata({
                        db: tx,
                        conversationId,
                        googleCloudCredentials,
                        useGoogleLanguageDetection: requestedDynamicTranslationEnabled,
                    });
            }
        }

        const updatedSourceLanguageMetadata =
            refreshedSourceLanguageMetadata ??
            (contentChanged || surveyConfig !== undefined
                ? await getBlockSourceLanguageMetadata()
                : {
                      sourceLanguageCode: conversation.currentSourceLanguageCode,
                      sourceRawLanguageCode:
                          conversation.currentSourceRawLanguageCode,
                      sourceLanguageProvider:
                          conversation.currentSourceLanguageProvider,
                      sourceLanguageConfidence:
                          conversation.currentSourceLanguageConfidence,
                  });

        const effectiveMultilingualSetting =
            inheritedProjectLanguageSettings === undefined
                ? normalizeConversationMultilingualSettings({
                      multilingualSettings: requestedMultilingualSetting,
                      canUseDynamicTranslation,
                  })
                : requestedMultilingualSetting;
        const targetLanguagePolicy =
            inheritedProjectLanguageSettings === undefined
                ? getConversationOverrideTranslationTargetLanguagePolicy({
                      multilingualSettings: effectiveMultilingualSetting,
                      detectedTargetLanguageCode: sourceLanguageToDisplayLanguage({
                          sourceLanguageCode:
                              updatedSourceLanguageMetadata.sourceLanguageCode,
                      }),
                  })
                : getProjectTranslationTargetLanguagePolicy({
                      languageSettings: inheritedProjectLanguageSettings,
                  });
        await upsertConversationMultilingualSetting({
            db: tx,
            conversationId,
            setting: {
                dynamicTranslationEnabled: targetLanguagePolicy.dynamicTranslationEnabled,
                additionalLanguageCodes:
                    targetLanguagePolicy.effectiveTargetLanguageCodes,
            },
            now,
        });

        if (contentChanged || surveyConfig !== undefined) {
            await createConversationViewSnapshotsFromCurrentState({
                db: tx,
                conversationId,
                viewReason: contentChanged
                    ? "conversation_content_updated"
                    : "survey_refreshed",
            });
        }

        if (
            targetLanguagePolicy.dynamicTranslationEnabled &&
            targetLanguagePolicy.effectiveTargetLanguageCodes.length > 0
        ) {
            if (
                surveyConfig !== null &&
                (surveyConfig === undefined || surveySources.length === 0)
            ) {
                surveySources = await fetchCurrentSurveyQuestionSources({
                    db: tx,
                    conversationId,
                    conversationSlugId: data.conversationSlugId,
                });
            }
        }

        const conversationSource: ConversationContentSource = {
            conversationId,
            conversationSlugId: data.conversationSlugId,
            projectId: conversation.projectId,
            languageSettingsSource,
            dynamicTranslationEnabled: targetLanguagePolicy.dynamicTranslationEnabled,
            contentId: newContentId ?? conversation.currentContentId,
            publicId: newContentPublicId ?? conversation.currentContentPublicId,
            title: conversationTitle,
            body: sanitizedBody ?? null,
            sourceLanguageCode: updatedSourceLanguageMetadata.sourceLanguageCode,
            sourceRawLanguageCode:
                updatedSourceLanguageMetadata.sourceRawLanguageCode,
            sourceLanguageProvider:
                updatedSourceLanguageMetadata.sourceLanguageProvider,
            sourceLanguageConfidence:
                updatedSourceLanguageMetadata.sourceLanguageConfidence,
        };
        const seedOpinionSources =
            targetLanguagePolicy.dynamicTranslationEnabled &&
            targetLanguagePolicy.effectiveTargetLanguageCodes.length > 0
                ? await fetchSeedOpinionSources({
                      db: tx,
                      conversationId,
                      conversationSlugId: data.conversationSlugId,
                  })
                : [];
        const eagerContentTranslationWorkIds =
            await createEagerContentTranslationWorkForKnownConversation({
                db: tx,
                conversationSource,
                targetLanguagePolicy,
                surveySources,
                seedOpinionSources,
                rankingItemSources: [],
                now,
                log,
            });

        return {
            success: true,
            eagerContentTranslationWorkIds,
            conversationId,
            conversationSlugId,
            didUpdateConversationSettings: conversationSettingsChanged,
            conversationSettings: {
                isIndexed,
                participationMode,
                requiresEventTicket: requiresEventTicket ?? null,
                aiLabelingEnabled: updatedAiLabelingEnabled,
                preferredOpinionGroupCount: updatedPreferredOpinionGroupCount,
                isClosed: conversation.isClosed,
            },
        } as const;
    });

    if (result.success && result.didUpdateConversationSettings) {
        await queueConversationSettingsUpdatedEvent({
            db,
            conversationSlugId: result.conversationSlugId,
            settings: result.conversationSettings,
        });
    }

    if (!result.success) {
        return result;
    }

    return {
        success: true,
        eagerContentTranslationWorkIds: result.eagerContentTranslationWorkIds,
    };
}
