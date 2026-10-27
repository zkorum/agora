// Edit conversation functionality
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { log } from "@/app.js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    conversationContentTable,
    conversationTable,
    conversationModerationTable,
    conversationTranslationTargetLanguageTable,
    organizationTable,
    polisConversationConfigTable,
    rankingConversationConfigTable,
    projectContentTable,
    projectOrganizationOwnershipTable,
    projectTable,
} from "@/shared-backend/schema.js";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { httpErrors } from "@fastify/sensible";
import { toUnionUndefined } from "@/shared/shared.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import {
    buildSurveyAnalysisRefreshContext,
    getActiveSurveyConfigRecord,
    getSurveyConfigForConversation,
    scheduleConversationAnalysisForSurveyChange,
    setSurveyConfigForConversation,
    wakeScheduledConversationAnalysisForSurveyChange,
} from "@/service/survey.js";
import { shouldRecomputeAnalysisForSurveyConfigChange } from "@/shared-backend/surveyAnalysis.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import type {
    GetConversationForEditResponse,
    UpdateConversationRequest,
    UpdateConversationResponse,
} from "@/shared/types/dto.js";
import type {
    ConversationTypeConfig,
    ConversationProjectAssignment,
    PremiumFeature,
} from "@/shared/types/zod.js";
import { zodExternalSourceConfig } from "@/shared/types/zod.js";
import {
    getProjectLanguageSettings,
    getProjectCapabilitiesById,
    hasProjectCapability,
} from "@/service/projectAccess.js";
import {
    buildConversationEditPermissions,
    getConversationContentEditPremiumFeatures,
    getPremiumEntitlementSubjectForConversation,
    getPremiumFeaturesInConversation,
    getRestrictedPremiumFeatures,
} from "@/service/premiumEntitlement.js";
import { createConversationViewSnapshotsFromCurrentState } from "@/service/conversationViewSnapshot.js";
import {
    queueConversationSettingsUpdatedEvent,
    queueConversationSurveyUpdatedEvent,
} from "@/service/realtimeEventOutbox.js";
import {
    conversationContentSourceMetadataToContentLanguageMetadataOutput,
    conversationContentSourceMetadataToLanguageSettingOutput,
} from "@/service/conversationLanguage.js";
import {
    getConversationMultilingualSetting,
    upsertConversationMultilingualSetting,
} from "@/service/conversationMultilingual.js";
import {
    contentLanguageMetadataUpdateValues,
    refreshCurrentConversationOwnedContentLanguageMetadata,
    type ContentLanguageMetadata,
} from "./contentLanguageMetadata.js";
import { getImplicitDefaultDisplayLanguage } from "./projectLanguage.js";
import {
    getManualMultilingualSettingsFromEffectiveTargets,
    getConversationOverrideTranslationTargetLanguagePolicy,
    getProjectTranslationTargetLanguagePolicy,
    sourceLanguageToDisplayLanguage,
} from "./translationLanguageSetting.js";
import {
    authorizeConversationTranslationEdit,
    type ConversationTranslationSelection,
} from "./conversationTranslationEdit.js";
import { normalizeUserRichTextInput } from "./richText.js";
import { getDuplicateSeedOpinionIndexes } from "@/shared/seedOpinions.js";
import { htmlToCountedText } from "@/shared/richText.js";
import {
    fetchConversationSeedOpinions,
    appendConversationSeedOpinions,
    normalizeSeedOpinionList,
} from "./conversationSeedOpinions.js";
import type { RealtimeSSEManager } from "./realtimeSSE.js";
import type { VoteBuffer } from "./voteBuffer.js";
import {
    fetchOpinionsByOpinionSlugIdList,
    type OpinionDisplayContentViewerPreferences,
} from "./comment.js";
import {
    prepareSeedOpinionChanges,
    applySeedOpinionChanges,
    assertSeedOpinionEditsHaveNoVotes,
    withSeedOpinionChangeRollback,
} from "./conversationSeedOpinionChanges.js";
import { projectConversationTypeConfig } from "@/shared/utils/conversationTypeConfig.js";
import {
    updateConversationEmailUpdateOverrideInTransaction,
    hasActiveDelivery,
    validateConversationEmailUpdateProjectMove,
} from "./conversationEmailUpdate.js";
import { lockConversationEmailUpdateProject } from "./conversationEmailUpdateProjectLock.js";
import {
    getConversationProjectOptions,
    resolveConversationProjectTarget,
} from "./conversationProject.js";
import {
    createEagerContentTranslationWorkForKnownConversation,
    fetchCurrentSurveyQuestionSources,
    fetchSeedOpinionSources,
    type ConversationContentSource,
    type SurveyQuestionContentSource,
} from "./contentTranslation.js";
import {
    buildConversationEditLanguageInput,
    prepareConversationEditLanguages,
} from "./conversationEditLanguagePreparation.js";

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
    const defaultProjectOrganization = alias(
        organizationTable,
        "defaultProjectOrganization",
    );
    const results = await db
        .select({
            conversationId: conversationTable.id,
            conversationSlugId: conversationTable.slugId,
            projectId: conversationTable.projectId,
            projectSlug: projectTable.slug,
            projectTitle: projectTable.title,
            defaultProjectOrganizationId:
                projectTable.autoProvisionedForOrganizationId,
            defaultProjectOrganizationSlug: defaultProjectOrganization.slug,
            projectSourceLanguageCode: projectContentTable.sourceLanguageCode,
            conversationTitle: conversationContentTable.title,
            conversationBody: conversationContentTable.body,
            sourceLanguageCode: conversationContentTable.sourceLanguageCode,
            sourceRawLanguageCode:
                conversationContentTable.sourceRawLanguageCode,
            sourceLanguageConfidence:
                conversationContentTable.sourceLanguageConfidence,
            isIndexed: conversationTable.isIndexed,
            participationMode: conversationTable.participationMode,
            conversationType: conversationTable.conversationType,
            rankingMode: rankingConversationConfigTable.rankingMode,
            externalSourceConfig:
                rankingConversationConfigTable.externalSourceConfig,
            isImporting: conversationTable.isImporting,
            requiresEventTicket: conversationTable.requiresEventTicket,
            aiLabelingEnabled: polisConversationConfigTable.aiLabelingEnabled,
            votingPresentation: polisConversationConfigTable.votingPresentation,
            preferredOpinionGroupCount:
                polisConversationConfigTable.preferredOpinionGroupCount,
            postAsOrganizationSlug: organizationTable.slug,
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
            defaultProjectOrganization,
            eq(
                defaultProjectOrganization.id,
                projectTable.autoProvisionedForOrganizationId,
            ),
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
            eq(
                polisConversationConfigTable.id,
                conversationTable.polisConfigId,
            ),
        )
        .leftJoin(
            rankingConversationConfigTable,
            eq(
                rankingConversationConfigTable.id,
                conversationTable.rankingConfigId,
            ),
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
                isNull(projectTable.deletedAt),
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
        capability: "conversation_edit",
    });
    if (!canUpdateConversation) {
        return { success: false, reason: "not_author" };
    }

    // Check if conversation is locked
    const isLocked = conversation.moderationAction === "lock";
    const externalSourceConfig = zodExternalSourceConfig
        .nullable()
        .parse(conversation.externalSourceConfig);

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
        conversation.defaultProjectOrganizationId === null
            ? {
                  projectSlug: conversation.projectSlug,
                  projectTitle: conversation.projectTitle,
                  defaultLanguageCode:
                      sourceLanguageToDisplayLanguage({
                          sourceLanguageCode:
                              conversation.projectSourceLanguageCode,
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
    const projectTarget: Extract<
        GetConversationForEditResponse,
        { success: true }
    >["projectTarget"] =
        conversation.defaultProjectOrganizationSlug === null
            ? { kind: "project", projectSlug: conversation.projectSlug }
            : {
                  kind: "no_project",
                  organizationSlug:
                      conversation.autoProvisionedForUserId === null
                          ? conversation.defaultProjectOrganizationSlug
                          : undefined,
              };
    const projectOptions = await getConversationProjectOptions({ db, userId });
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
    let conversationTypeConfig: ConversationTypeConfig;
    if (conversation.conversationType === "ranking") {
        if (conversation.rankingMode === null) {
            throw new Error("Ranking conversation is missing its ranking mode");
        }
        conversationTypeConfig = {
            conversationType: "ranking",
            rankingMode: conversation.rankingMode,
        };
    } else {
        if (conversation.votingPresentation === null) {
            throw new Error("Polis conversation has no voting configuration");
        }
        conversationTypeConfig = {
            conversationType: "polis",
            votingPresentation: conversation.votingPresentation,
        };
    }

    return {
        success: true,
        conversationSlugId: conversation.conversationSlugId,
        conversationTitle: conversation.conversationTitle,
        conversationBody: toUnionUndefined(conversation.conversationBody),
        conversationTypeConfig,
        contentLanguageMetadata:
            conversationContentSourceMetadataToContentLanguageMetadataOutput({
                sourceLanguageCode: conversation.sourceLanguageCode,
                sourceRawLanguageCode: conversation.sourceRawLanguageCode,
                sourceLanguageConfidence: conversation.sourceLanguageConfidence,
            }),
        languageSetting:
            conversationContentSourceMetadataToLanguageSettingOutput({
                sourceLanguageCode: conversation.sourceLanguageCode,
                sourceRawLanguageCode: conversation.sourceRawLanguageCode,
                sourceLanguageConfidence: conversation.sourceLanguageConfidence,
            }),
        multilingualSetting: editMultilingualSetting,
        languageSettingsSource: conversation.languageSettingsSource,
        projectLanguageProject,
        currentProjectSlug: conversation.projectSlug,
        projectTarget,
        projectOptions,
        isIndexed: conversation.isIndexed,
        participationMode: conversation.participationMode,
        requiresEventTicket: toUnionUndefined(conversation.requiresEventTicket),
        aiLabelingEnabled: conversation.aiLabelingEnabled ?? false,
        preferredOpinionGroupCount:
            conversation.preferredOpinionGroupCount ?? null,
        postAsOrganizationSlug: toUnionUndefined(
            conversation.autoProvisionedForUserId === null
                ? conversation.postAsOrganizationSlug
                : null,
        ),
        surveyConfig,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        isLocked,
        editPermissions,
        seedOpinions: await fetchConversationSeedOpinions({
            db,
            conversationId: conversation.conversationId,
            conversationType: conversation.conversationType,
            externalSourceManaged: externalSourceConfig !== null,
        }),
        canAddSeedOpinions:
            editPermissions.canEditConversationContent &&
            !isLocked &&
            !conversation.isImporting &&
            externalSourceConfig === null,
        externalSourceConfig,
    };
}

interface UpdateConversationProps {
    db: PostgresDatabase;
    userId: string;
    realtimeSSEManager?: RealtimeSSEManager;
    googleCloudCredentials?: GoogleCloudCredentials;
    valkey?: Valkey;
    data: UpdateConversationRequest;
    voteBuffer?: VoteBuffer;
    displayContentViewerPreferences?: OpinionDisplayContentViewerPreferences;
}

type UpdateConversationServiceResponse =
    | Exclude<UpdateConversationResponse, { success: true }>
    | (Extract<UpdateConversationResponse, { success: true }> & {
          eagerContentTranslationWorkIds: number[];
      });

export async function updateConversation({
    db,
    userId,
    realtimeSSEManager,
    googleCloudCredentials,
    valkey,
    data,
    voteBuffer,
    displayContentViewerPreferences,
}: UpdateConversationProps): Promise<UpdateConversationServiceResponse> {
    const {
        conversationSlugId,
        conversationTitle,
        conversationBody,
        isIndexed,
        participationMode,
        languageSettingsSource,
        multilingualSetting,
        requiresEventTicket,
        conversationTypeConfig,
        surveyConfig,
        conversationEmailUpdateEnabledOverride,
        newSeedOpinionList = [],
        seedOpinionChanges = [],
        projectChange,
    } = data;
    const aiLabelingEnabled =
        conversationTypeConfig.conversationType === "polis"
            ? conversationTypeConfig.aiLabelingEnabled
            : undefined;
    const preferredOpinionGroupCount =
        conversationTypeConfig.conversationType === "polis"
            ? conversationTypeConfig.preferredOpinionGroupCount
            : undefined;

    const normalizedSeeds = normalizeSeedOpinionList(newSeedOpinionList);
    if (!normalizedSeeds.success) return normalizedSeeds;
    const normalizedSeedOpinions = normalizedSeeds.opinions;

    let sanitizedBody = conversationBody;
    let bodyPlainText = "";
    if (sanitizedBody != null) {
        try {
            const normalizationResult = normalizeUserRichTextInput({
                html: sanitizedBody,
                validationMode: "conversation",
            });
            if (!normalizationResult.success) {
                return {
                    success: false,
                    reason: normalizationResult.reason,
                };
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

    const primaryDb = getPrimaryDatabase(db);
    if (projectChange !== undefined) {
        const source = (
            await primaryDb
                .select({
                    projectId: conversationTable.projectId,
                    projectSlug: projectTable.slug,
                    moderationAction:
                        conversationModerationTable.moderationAction,
                })
                .from(conversationTable)
                .innerJoin(
                    projectTable,
                    eq(projectTable.id, conversationTable.projectId),
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
                        isNotNull(conversationTable.currentContentId),
                        isNull(projectTable.deletedAt),
                    ),
                )
        ).at(0);
        if (source === undefined)
            return { success: false, reason: "not_found" };
        if (
            !(await hasProjectCapability({
                db: primaryDb,
                userId,
                projectId: source.projectId,
                capability: "conversation_edit",
            }))
        )
            return { success: false, reason: "not_author" };
        if (source.moderationAction === "lock")
            return { success: false, reason: "conversation_locked" };
        if (source.projectSlug !== projectChange.expectedProjectSlug)
            return { success: false, reason: "project_assignment_changed" };
    }
    // Default-project provisioning follows creation's lock order; the move itself
    // rechecks capabilities and destination state under project/conversation locks.
    const destination =
        projectChange === undefined
            ? undefined
            : await resolveConversationProjectTarget({
                  db: primaryDb,
                  userId,
                  target: projectChange.target,
              });
    if (projectChange !== undefined && destination === undefined)
        return { success: false, reason: "project_not_available" };
    const languagePreparation = await withSeedOpinionChangeRollback({
        operation: () =>
            prepareConversationEditLanguages({
                db: primaryDb,
                userId,
                data,
                destinationProjectId: destination?.projectId,
                normalizedSeeds: normalizedSeedOpinions,
                sanitizedBody,
                bodyPlainText,
                googleCloudCredentials,
                voteBuffer,
            }),
    });
    if (!languagePreparation.success) return languagePreparation;
    const { resolveLanguageMetadata } = languagePreparation;
    const updateInTransaction = async (tx: PostgresDatabase) => {
        const now = new Date();
        const initialConversation = (
            await tx
                .select({
                    id: conversationTable.id,
                    projectId: conversationTable.projectId,
                })
                .from(conversationTable)
                .where(eq(conversationTable.slugId, conversationSlugId))
        ).at(0);
        if (initialConversation === undefined)
            return {
                success: false,
                reason: "not_found",
            } satisfies UpdateConversationServiceResponse;
        const destinationProjectId =
            destination?.projectId ?? initialConversation.projectId;
        const projectIds = [
            ...new Set([initialConversation.projectId, destinationProjectId]),
        ].sort((a, b) => a - b);
        for (const projectId of projectIds) {
            if (
                !(await lockConversationEmailUpdateProject({
                    db: tx,
                    projectId,
                    lockMode:
                        projectChange !== undefined ||
                        conversationEmailUpdateEnabledOverride !== undefined
                            ? "no key update"
                            : "share",
                }))
            )
                return {
                    success: false,
                    reason: "project_not_available",
                } satisfies UpdateConversationServiceResponse;
        }
        const lockedDestination =
            destination === undefined
                ? undefined
                : (
                      await tx
                          .select({
                              projectId: projectTable.id,
                              projectSlug: projectTable.slug,
                              projectTitle: projectTable.title,
                              visibility: projectTable.directoryVisibility,
                          })
                          .from(projectTable)
                          .where(eq(projectTable.id, destination.projectId))
                  ).at(0);
        if (
            projectChange !== undefined &&
            (lockedDestination === undefined ||
                (projectChange.target.kind === "project" &&
                    (lockedDestination.projectSlug !==
                        projectChange.target.projectSlug ||
                        lockedDestination.visibility !== "listed")))
        ) {
            return {
                success: false,
                reason: "project_not_available",
            } satisfies UpdateConversationServiceResponse;
        }
        // Get conversation and check authorization
        const conversationResults = await tx
            .select({
                conversationId: conversationTable.id,
                projectId: conversationTable.projectId,
                projectSlug: projectTable.slug,
                currentContentId: conversationTable.currentContentId,
                conversationType: conversationTable.conversationType,
                rankingMode: rankingConversationConfigTable.rankingMode,
                externalSourceConfig:
                    rankingConversationConfigTable.externalSourceConfig,
                isImporting: conversationTable.isImporting,
                polisConfigId: conversationTable.polisConfigId,
                isIndexed: conversationTable.isIndexed,
                participationMode: conversationTable.participationMode,
                requiresEventTicket: conversationTable.requiresEventTicket,
                aiLabelingEnabled:
                    polisConversationConfigTable.aiLabelingEnabled,
                votingPresentation:
                    polisConversationConfigTable.votingPresentation,
                isClosed: conversationTable.isClosed,
                currentPreferredOpinionGroupCount:
                    polisConversationConfigTable.preferredOpinionGroupCount,
                currentLanguageSettingsSource:
                    conversationTable.languageSettingsSource,
                currentDynamicTranslationEnabled:
                    conversationTable.dynamicTranslationEnabled,
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
            .innerJoin(
                projectTable,
                eq(projectTable.id, conversationTable.projectId),
            )
            .leftJoin(
                conversationContentTable,
                eq(
                    conversationContentTable.id,
                    conversationTable.currentContentId,
                ),
            )
            .leftJoin(
                polisConversationConfigTable,
                eq(
                    polisConversationConfigTable.id,
                    conversationTable.polisConfigId,
                ),
            )
            .leftJoin(
                rankingConversationConfigTable,
                eq(
                    rankingConversationConfigTable.id,
                    conversationTable.rankingConfigId,
                ),
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
            .where(and(eq(conversationTable.slugId, conversationSlugId)))
            // Editing currentContentId/projectId can upgrade the row lock too.
            // Take UPDATE up front, before participant KEY SHARE locks can race it.
            .for("update", { of: conversationTable });

        if (conversationResults.length === 0) {
            return { success: false, reason: "not_found" } as const;
        }

        const conversation = conversationResults[0];

        if (
            conversation.projectId !== initialConversation.projectId ||
            (projectChange !== undefined &&
                projectChange.expectedProjectSlug !== conversation.projectSlug)
        ) {
            return {
                success: false,
                reason: "project_assignment_changed",
            } satisfies UpdateConversationServiceResponse;
        }
        const projectChanged = destinationProjectId !== conversation.projectId;
        const capabilities = await getProjectCapabilitiesById({
            db: tx,
            userId,
            projectIds,
            requestedCapabilities: ["conversation_edit", "conversation_create"],
            lockAuthorization: true,
        });

        const canUpdateConversation =
            capabilities
                .get(conversation.projectId)
                ?.has("conversation_edit") === true;
        if (!canUpdateConversation) {
            return { success: false, reason: "not_author" } as const;
        }
        if (
            projectChanged &&
            (!capabilities
                .get(destinationProjectId)
                ?.has("conversation_create") ||
                !capabilities
                    .get(destinationProjectId)
                    ?.has("conversation_edit"))
        ) {
            return {
                success: false,
                reason: "missing_project_capability",
            } satisfies UpdateConversationServiceResponse;
        }
        if (projectChanged) {
            for (const projectId of projectIds) {
                if (await hasActiveDelivery({ db: tx, projectId }))
                    return {
                        success: false,
                        reason: "active_delivery_conflict",
                    } satisfies UpdateConversationServiceResponse;
            }
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
        if (
            normalizedSeedOpinions.length > 0 ||
            seedOpinionChanges.length > 0
        ) {
            if (
                conversation.isImporting ||
                conversation.externalSourceConfig !== null
            ) {
                return {
                    success: false,
                    reason: "seed_opinions_not_allowed",
                } satisfies UpdateConversationServiceResponse;
            }
        }
        const preparedChanges = await prepareSeedOpinionChanges({
            db: tx,
            conversationId,
            conversationType: conversation.conversationType,
            changes: seedOpinionChanges,
            voteBuffer,
            lockTargets: true,
        });
        if (!preparedChanges.success) return preparedChanges;
        const seedStatementsChanged =
            normalizedSeedOpinions.length > 0 ||
            preparedChanges.changes.length > 0;
        if (seedStatementsChanged) {
            const existingOpinions = await fetchConversationSeedOpinions({
                db: tx,
                conversationId,
                conversationType: conversation.conversationType,
            });
            const changedSlugs = new Set(
                preparedChanges.changes.map((change) => change.target.slugId),
            );
            const editedOpinions = preparedChanges.changes.filter(
                (change) => change.action === "edit",
            );
            const submittedOpinions = [
                ...editedOpinions.map((change) => change.content),
                ...normalizedSeedOpinions,
            ];
            const duplicateIndex = getDuplicateSeedOpinionIndexes({
                opinions: submittedOpinions.map((opinion, index) => ({
                    index,
                    plainText: opinion.plainText,
                })),
                existingOpinions: existingOpinions
                    .filter((opinion) => !changedSlugs.has(opinion.slugId))
                    .map((opinion) => htmlToCountedText(opinion.content)),
            }).at(0);
            if (duplicateIndex !== undefined) {
                return {
                    success: false,
                    reason: "invalid_seed_opinion",
                    seedOpinionSlugId:
                        editedOpinions[duplicateIndex]?.target.slugId,
                    seedOpinionFailure: {
                        index:
                            duplicateIndex < editedOpinions.length
                                ? duplicateIndex
                                : duplicateIndex - editedOpinions.length,
                        reason: "duplicate",
                    },
                } satisfies UpdateConversationServiceResponse;
            }
        }
        const surveyAnalysisRefreshContext = buildSurveyAnalysisRefreshContext({
            conversationId,
            slugId: data.conversationSlugId,
            conversationType: conversation.conversationType,
            rankingMode: conversation.rankingMode,
        });
        const effectiveSurveyConfig =
            surveyConfig === undefined
                ? ((await getSurveyConfigForConversation({
                      db: tx,
                      conversationId,
                  })) ?? null)
                : surveyConfig;
        const requestedTranslation: ConversationTranslationSelection =
            languageSettingsSource === "project_inherited"
                ? {
                      source: "project_inherited",
                      projectLanguageSettings: await getProjectLanguageSettings(
                          {
                              db: tx,
                              projectId: destinationProjectId,
                          },
                      ),
                  }
                : {
                      source: "conversation_override",
                      multilingualSetting,
                  };
        const subject = getPremiumEntitlementSubjectForConversation({
            conversation: { projectId: destinationProjectId, userId },
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
        if (projectChanged) {
            const resultingPremiumFeatures: PremiumFeature[] = [];
            if (effectiveSurveyConfig !== null)
                resultingPremiumFeatures.push("survey");
            if (requiresEventTicket !== undefined)
                resultingPremiumFeatures.push("event_ticket");
            const resultingPreferredGroupCount =
                preferredOpinionGroupCount === undefined
                    ? conversation.currentPreferredOpinionGroupCount
                    : preferredOpinionGroupCount;
            if (resultingPreferredGroupCount !== null)
                resultingPremiumFeatures.push("analysis_variants");
            const restrictedFeatures = await getRestrictedPremiumFeatures({
                db: tx,
                subject,
                features: resultingPremiumFeatures,
                mode: "creation",
                now,
            });
            if (restrictedFeatures.length > 0)
                return {
                    success: false,
                    reason: "premium_access_required",
                } satisfies UpdateConversationServiceResponse;
            if (
                projectChange?.target.kind === "no_project" &&
                languageSettingsSource === "project_inherited"
            )
                return {
                    success: false,
                    reason: "invalid_access_settings",
                } satisfies UpdateConversationServiceResponse;
        }
        let translationEdit = authorizeConversationTranslationEdit({
            access: canUseDynamicTranslation
                ? { kind: "configure" }
                : { kind: "disabled_only" },
            requested: requestedTranslation,
        });
        if (
            !translationEdit.success &&
            !projectChanged &&
            conversation.currentLanguageSettingsSource ===
                requestedTranslation.source
        ) {
            const currentTargets = await tx
                .select({
                    languageCode:
                        conversationTranslationTargetLanguageTable.languageCode,
                })
                .from(conversationTranslationTargetLanguageTable)
                .where(
                    and(
                        eq(
                            conversationTranslationTargetLanguageTable.conversationId,
                            conversationId,
                        ),
                        isNull(
                            conversationTranslationTargetLanguageTable.deletedAt,
                        ),
                    ),
                );
            const primaryLanguageCode =
                requestedTranslation.source === "project_inherited"
                    ? requestedTranslation.projectLanguageSettings
                          .defaultLanguageCode
                    : sourceLanguageToDisplayLanguage({
                          sourceLanguageCode:
                              conversation.currentSourceLanguageCode,
                      });
            translationEdit = authorizeConversationTranslationEdit({
                access: {
                    kind: "retain_existing",
                    current: {
                        source: conversation.currentLanguageSettingsSource,
                        dynamicTranslationEnabled:
                            conversation.currentDynamicTranslationEnabled,
                        effectiveTargetLanguageCodes: currentTargets.map(
                            (target) => target.languageCode,
                        ),
                        primaryLanguageCode,
                    },
                },
                requested: requestedTranslation,
            });
        }
        if (!translationEdit.success) return translationEdit;
        const { translationWorkEnabled } = translationEdit;
        const currentBody = toUnionUndefined(conversation.currentBody);
        const contentChanged =
            conversation.currentTitle !== conversationTitle ||
            currentBody !== sanitizedBody;
        let blockSourceLanguageMetadataPromise:
            | Promise<ContentLanguageMetadata>
            | undefined;
        const getBlockSourceLanguageMetadata =
            (): Promise<ContentLanguageMetadata> => {
                blockSourceLanguageMetadataPromise ??= resolveLanguageMetadata({
                    ...buildConversationEditLanguageInput({
                        title: conversationTitle,
                        bodyPlainText,
                        surveyConfig: effectiveSurveyConfig,
                    }),
                    useGoogleLanguageDetection: translationWorkEnabled,
                });
                return blockSourceLanguageMetadataPromise;
            };

        if (!projectChanged && (contentChanged || seedStatementsChanged)) {
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
                features:
                    getConversationContentEditPremiumFeatures(premiumFeatures),
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
        if (
            conversationTypeConfig.conversationType !==
            conversation.conversationType
        ) {
            return {
                success: false,
                reason: "invalid_access_settings",
            } satisfies UpdateConversationServiceResponse;
        }
        if (
            conversation.conversationType === "polis" &&
            conversation.votingPresentation === null
        ) {
            throw new Error("Polis conversation has no voting configuration");
        }
        const currentVotingPresentation =
            conversation.votingPresentation ?? "list";
        const updatedVotingPresentation =
            conversationTypeConfig.conversationType === "polis"
                ? conversationTypeConfig.votingPresentation
                : "list";
        const conversationSettingsChanged =
            projectChanged ||
            isIndexed !== conversation.isIndexed ||
            participationMode !== conversation.participationMode ||
            (requiresEventTicket ?? null) !==
                conversation.requiresEventTicket ||
            updatedAiLabelingEnabled !==
                (conversation.aiLabelingEnabled ?? true) ||
            updatedVotingPresentation !== currentVotingPresentation ||
            preferredOpinionGroupCountChanged ||
            languageSettingsSource !==
                conversation.currentLanguageSettingsSource;

        if (
            preferredOpinionGroupCount !== undefined &&
            preferredOpinionGroupCount !== null &&
            (projectChanged || preferredOpinionGroupCountChanged)
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

        if (projectChanged) {
            const emailUpdateResult =
                await validateConversationEmailUpdateProjectMove({
                    db: tx,
                    userId,
                    conversationSlugId,
                    projectId: destinationProjectId,
                    enabledOverride: conversationEmailUpdateEnabledOverride,
                    now,
                });
            if (!emailUpdateResult.success) return emailUpdateResult;
        }
        if (
            !projectChanged &&
            conversationEmailUpdateEnabledOverride !== undefined
        ) {
            const emailUpdateResult =
                await updateConversationEmailUpdateOverrideInTransaction({
                    db: tx,
                    userId,
                    conversationSlugId,
                    enabledOverride: conversationEmailUpdateEnabledOverride,
                    now,
                });
            if (!emailUpdateResult.success) {
                if (emailUpdateResult.reason === "target_not_found") {
                    return {
                        success: false,
                        reason: "not_found",
                    } as const;
                }
                return {
                    success: false,
                    reason: emailUpdateResult.reason,
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

        const emailOverrideUpdate =
            projectChanged &&
            conversationEmailUpdateEnabledOverride !== undefined
                ? {
                      conversationEmailUpdateEnabledOverride,
                      conversationEmailUpdateOverrideUpdatedAt: now,
                      conversationEmailUpdateOverrideUpdatedByUserId: userId,
                  }
                : undefined;
        const conversationUpdateValues = {
            projectId: projectChanged ? destinationProjectId : undefined,
            currentContentId: newContentId,
            isEdited: newContentId === undefined ? undefined : true,
            isIndexed,
            participationMode,
            requiresEventTicket: requiresEventTicket ?? null,
            languageSettingsSource,
            updatedAt: now,
            ...emailOverrideUpdate,
        } satisfies Partial<typeof conversationTable.$inferInsert>;

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
                updatedVotingPresentation !== currentVotingPresentation ||
                preferredOpinionGroupCountChanged)
        ) {
            await tx
                .update(polisConversationConfigTable)
                .set({
                    aiLabelingEnabled: updatedAiLabelingEnabled,
                    votingPresentation: updatedVotingPresentation,
                    preferredOpinionGroupCount:
                        updatedPreferredOpinionGroupCount,
                    updatedAt: now,
                })
                .where(
                    eq(
                        polisConversationConfigTable.id,
                        conversation.polisConfigId,
                    ),
                );
        }

        const { addedSeedOpinions, addedOpinions, rankingItemSources } =
            await appendConversationSeedOpinions({
                db: tx,
                opinions: normalizedSeedOpinions,
                userId,
                resolveLanguageMetadata,
                useGoogleLanguageDetection: translationWorkEnabled,
                now,
                conversation: {
                    id: conversationId,
                    slugId: conversationSlugId,
                    contentId: newContentId ?? conversation.currentContentId,
                    conversationType: conversation.conversationType,
                    isIndexed,
                    participationMode,
                    isClosed: conversation.isClosed,
                    requiresEventTicket,
                },
            });
        rankingItemSources.push(
            ...(await applySeedOpinionChanges({
                db: tx,
                changes: preparedChanges.changes,
                conversation: {
                    id: conversationId,
                    slugId: conversationSlugId,
                    contentId: newContentId ?? conversation.currentContentId,
                },
                userId,
                resolveLanguageMetadata,
                useGoogleLanguageDetection: translationWorkEnabled,
                now,
            })),
        );

        let surveySources: SurveyQuestionContentSource[] = [];
        let analysisRefreshScheduled = false;
        if (surveyConfig !== undefined) {
            const sourceLanguageMetadata =
                await getBlockSourceLanguageMetadata();
            const surveyUpdateEffect = await setSurveyConfigForConversation({
                db: tx,
                conversationSlugId: data.conversationSlugId,
                conversationId,
                surveyConfig: surveyConfig ?? null,
                now,
                useGoogleLanguageDetection: translationWorkEnabled,
                sourceLanguageMetadata,
            });
            surveySources = surveyUpdateEffect.currentQuestionSources;
            if (
                shouldRecomputeAnalysisForSurveyConfigChange(surveyUpdateEffect)
            ) {
                analysisRefreshScheduled =
                    await scheduleConversationAnalysisForSurveyChange({
                        db: tx,
                        conversation: surveyAnalysisRefreshContext,
                    });
            }
            await queueConversationSurveyUpdatedEvent({
                db: tx,
                conversationSlugId: data.conversationSlugId,
                configChanged: true,
            });
        }

        let refreshedSourceLanguageMetadata:
            | ContentLanguageMetadata
            | undefined;
        if (
            !contentChanged &&
            translationWorkEnabled &&
            (!conversation.currentDynamicTranslationEnabled ||
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
                    await refreshCurrentConversationOwnedContentLanguageMetadata(
                        {
                            db: tx,
                            conversationId,
                            resolveLanguageMetadata,
                            useGoogleLanguageDetection: translationWorkEnabled,
                        },
                    );
            }
        }

        const updatedSourceLanguageMetadata =
            refreshedSourceLanguageMetadata ??
            (contentChanged || surveyConfig !== undefined
                ? await getBlockSourceLanguageMetadata()
                : {
                      sourceLanguageCode:
                          conversation.currentSourceLanguageCode,
                      sourceRawLanguageCode:
                          conversation.currentSourceRawLanguageCode,
                      sourceLanguageProvider:
                          conversation.currentSourceLanguageProvider,
                      sourceLanguageConfidence:
                          conversation.currentSourceLanguageConfidence,
                  });

        const targetLanguagePolicy =
            requestedTranslation.source === "conversation_override"
                ? getConversationOverrideTranslationTargetLanguagePolicy({
                      multilingualSettings:
                          requestedTranslation.multilingualSetting,
                      detectedTargetLanguageCode:
                          sourceLanguageToDisplayLanguage({
                              sourceLanguageCode:
                                  updatedSourceLanguageMetadata.sourceLanguageCode,
                          }),
                  })
                : getProjectTranslationTargetLanguagePolicy({
                      languageSettings:
                          requestedTranslation.projectLanguageSettings,
                  });
        await upsertConversationMultilingualSetting({
            db: tx,
            conversationId,
            setting: {
                dynamicTranslationEnabled:
                    targetLanguagePolicy.dynamicTranslationEnabled,
                additionalLanguageCodes:
                    targetLanguagePolicy.effectiveTargetLanguageCodes,
            },
            now,
        });

        if (
            contentChanged ||
            surveyConfig !== undefined ||
            seedStatementsChanged
        ) {
            await createConversationViewSnapshotsFromCurrentState({
                db: tx,
                conversationId,
                viewReason:
                    contentChanged || seedStatementsChanged
                        ? "conversation_content_updated"
                        : "survey_refreshed",
                emitCommentStatsRealtimeEvent:
                    seedStatementsChanged &&
                    conversation.conversationType === "polis",
            });
        }
        if (seedStatementsChanged) {
            analysisRefreshScheduled =
                (await scheduleConversationAnalysisForSurveyChange({
                    db: tx,
                    conversation: surveyAnalysisRefreshContext,
                })) || analysisRefreshScheduled;
        }

        if (
            translationWorkEnabled &&
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
            projectId: destinationProjectId,
            languageSettingsSource,
            dynamicTranslationEnabled:
                targetLanguagePolicy.dynamicTranslationEnabled,
            contentId: newContentId ?? conversation.currentContentId,
            publicId: newContentPublicId ?? conversation.currentContentPublicId,
            title: conversationTitle,
            body: sanitizedBody ?? null,
            sourceLanguageCode:
                updatedSourceLanguageMetadata.sourceLanguageCode,
            sourceRawLanguageCode:
                updatedSourceLanguageMetadata.sourceRawLanguageCode,
            sourceLanguageProvider:
                updatedSourceLanguageMetadata.sourceLanguageProvider,
            sourceLanguageConfidence:
                updatedSourceLanguageMetadata.sourceLanguageConfidence,
        };
        const seedOpinionSources =
            translationWorkEnabled &&
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
                targetLanguagePolicy: {
                    ...targetLanguagePolicy,
                    dynamicTranslationEnabled: translationWorkEnabled,
                },
                surveySources,
                seedOpinionSources,
                rankingItemSources,
                now,
                log,
            });

        const projectAssignment: ConversationProjectAssignment | undefined =
            projectChanged &&
            lockedDestination !== undefined &&
            projectChange !== undefined
                ? {
                      previousProjectSlug: conversation.projectSlug,
                      projectSlug: lockedDestination.projectSlug,
                      projectTitle: lockedDestination.projectTitle,
                      target: projectChange.target,
                  }
                : undefined;
        const conversationSettings = {
            isIndexed,
            participationMode,
            requiresEventTicket: requiresEventTicket ?? null,
            aiLabelingEnabled: updatedAiLabelingEnabled,
            presentation: projectConversationTypeConfig(conversationTypeConfig),
            preferredOpinionGroupCount: updatedPreferredOpinionGroupCount,
            isClosed: conversation.isClosed,
            projectAssignment,
        };
        if (conversationSettingsChanged) {
            await queueConversationSettingsUpdatedEvent({
                db: tx,
                conversationSlugId,
                settings: conversationSettings,
            });
        }
        const updatedOpinions =
            displayContentViewerPreferences === undefined ||
            conversation.conversationType !== "polis"
                ? undefined
                : await fetchOpinionsByOpinionSlugIdList({
                      db: tx,
                      opinionSlugIdList: preparedChanges.changes
                          .filter((change) => change.action === "edit")
                          .map((change) => change.target.slugId),
                      displayContentViewerPreferences,
                  });
        await assertSeedOpinionEditsHaveNoVotes({
            db: tx,
            conversationId,
            changes: preparedChanges.changes,
        });
        return {
            success: true,
            eagerContentTranslationWorkIds,
            projectAssignment,
            addedSeedOpinions,
            addedOpinions,
            updatedOpinions,
            analysisRefreshScheduled,
            surveyAnalysisRefreshContext,
        } as const;
    };
    const result = await withSeedOpinionChangeRollback({
        operation: () => primaryDb.transaction(updateInTransaction),
    });

    if (!result.success) {
        return result;
    }

    if (result.analysisRefreshScheduled) {
        await wakeScheduledConversationAnalysisForSurveyChange({
            conversation: result.surveyAnalysisRefreshContext,
            valkey,
        });
    }

    for (const opinion of result.addedOpinions) {
        realtimeSSEManager?.broadcastToConversationSubscribersExcept({
            conversationSlugId,
            id: undefined,
            event: "new_opinion",
            data: {
                conversationSlugId,
                opinionSlugId: opinion.opinionSlugId,
                timestamp: Date.now(),
            },
            excludeUserId: userId,
        });
    }

    return {
        success: true,
        eagerContentTranslationWorkIds: result.eagerContentTranslationWorkIds,
        projectAssignment: result.projectAssignment,
        addedSeedOpinions: result.addedSeedOpinions,
        addedOpinions: result.addedOpinions,
        updatedOpinions: result.updatedOpinions,
    };
}
