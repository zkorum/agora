// Interact with a conversation (= post)
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    opinionTable,
    conversationContentTable,
    conversationTable,
    polisConversationConfigTable,
    rankingConversationConfigTable,
    userTable,
} from "@/shared-backend/schema.js";
import { eq } from "drizzle-orm";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import type {
    ExtendedConversation,
} from "@/shared/types/zod.js";
import type {
    CloseConversationResponse,
    CreateNewConversationRequest,
    CreateNewConversationResponse,
    OpenConversationResponse,
} from "@/shared/types/dto.js";
import {
    htmlToCountedText,
    toUnionUndefined,
    validateRichTextInput,
} from "@/shared/shared.js";
import { postNewOpinion } from "./comment.js";
import { createRankingItem } from "./rankingItem.js";
import { processUserGeneratedHtml } from "@/shared-app-api/html.js";
import { normalizeUserRichTextInput } from "./richText.js";
import { deleteAllConversationExports } from "@/service/conversationExport/index.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import {
    getSurveyGateSummary,
    setSurveyConfigForConversation,
} from "@/service/survey.js";
import { scheduleConversationAnalysisRefresh } from "@/shared-backend/conversationCounters.js";
import { createConversationViewSnapshotsFromCurrentState } from "@/service/conversationViewSnapshot.js";
import { queueConversationSettingsUpdatedEvent } from "@/service/realtimeEventOutbox.js";
import {
    hasProjectCapability,
    getProjectLanguageSettings,
    requireProjectCapability,
    resolveConversationCreateTarget,
} from "@/service/projectAccess.js";
import {
    buildGoogleConversationLanguageDetectionCorpus,
    buildConversationLanguageDetectionCorpus,
} from "@/service/conversationLanguage.js";
import { upsertConversationMultilingualSetting } from "@/service/conversationMultilingual.js";
import {
    buildContentBlockLanguageDetectionCorpus,
    buildSurveyLanguageDetectionCorpus,
    contentLanguageMetadataUpdateValues,
    resolveContentLanguageMetadata,
} from "./contentLanguageMetadata.js";
import {
    getConversationOverrideTranslationTargetLanguagePolicy,
    getProjectTranslationTargetLanguagePolicy,
    normalizeConversationMultilingualSettings,
    normalizeInheritedConversationMultilingualSettings,
    sourceLanguageToDisplayLanguage,
} from "./translationLanguageSetting.js";
import {
    createEagerContentTranslationWorkForCreatedConversation,
    type ConversationContentSource,
    type OpinionContentSource,
    type RankingItemContentSource,
    type SurveyQuestionContentSource,
} from "./contentTranslation.js";
import { fetchConversationProjectContext } from "./projectPage.js";

const MAX_CONVERSATION_SEED_ITEMS = 50;

interface CreateNewPostProps {
    db: PostgresDatabase;
    request: CreateNewConversationRequest;
    authorId: string;
    didWrite: string;
    createTarget?: { projectId: number; organizationId: number };
    autoProvisionedDefaultLanguage: SupportedDisplayLanguageCodes;
    isImporting: boolean;
    googleCloudCredentials?: GoogleCloudCredentials;
    importUrl?: string;
    importConversationUrl?: string;
    importExportUrl?: string;
    importCreatedAt?: Date;
    importAuthor?: string;
    importMethod?: "url" | "csv";
}

export interface CreatedConversationEagerContentTranslation {
    workIds: number[];
}

type CreateNewPostResponse =
    | Exclude<CreateNewConversationResponse, { success: true }>
    | (Extract<CreateNewConversationResponse, { success: true }> & {
          eagerContentTranslation: CreatedConversationEagerContentTranslation;
      });

export async function createNewPost({
    db,
    request,
    authorId,
    didWrite,
    createTarget,
    autoProvisionedDefaultLanguage,
    isImporting,
    googleCloudCredentials,
    importUrl,
    importConversationUrl,
    importExportUrl,
    importCreatedAt,
    importAuthor,
    importMethod,
}: CreateNewPostProps): Promise<CreateNewPostResponse> {
    const {
        conversationTitle,
        conversationBody: requestConversationBody,
        conversationBodyPlainText,
        postAsOrganization,
        projectSlug,
        languageSettingsSource,
        participationMode,
        conversationType,
        isIndexed,
        seedOpinionList,
        requiresEventTicket,
        multilingualSetting,
    } = request;
    const surveyConfig =
        conversationType === "polis" ? request.surveyConfig : undefined;
    let conversationBody = requestConversationBody ?? null;

    if (seedOpinionList.length > MAX_CONVERSATION_SEED_ITEMS) {
        throw httpErrors.badRequest(
            `A conversation can have at most ${String(MAX_CONVERSATION_SEED_ITEMS)} seed items`,
        );
    }
    const target =
        createTarget ??
        (await resolveConversationCreateTarget({
            db,
            userId: authorId,
            postAsOrganizationSlug: postAsOrganization,
            projectSlug,
            autoProvisionedDefaultLanguage,
        }));
    const conversationSlugId = generateRandomSlugId();

    let bodyPlainText = "";
    if (conversationBody != null) {
        try {
            const normalizationResult = normalizeUserRichTextInput({
                html: conversationBody,
                plainText: conversationBodyPlainText,
                validationMode: "conversation",
                logLabel:
                    "[ConversationPlainText] Frontend/backend plain text mismatch on create",
            });
            if (!normalizationResult.success) {
                return normalizationResult;
            }
            conversationBody = normalizationResult.content.html;
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

    for (const seedOpinion of seedOpinionList) {
        const sanitizedSeedOpinion = processUserGeneratedHtml(
            seedOpinion,
            false,
            "input",
        );
        const validationResult = validateRichTextInput({
            htmlString: sanitizedSeedOpinion,
            mode: "opinion",
        });
        if (!validationResult.success) {
            return validationResult;
        }
    }

    const surveyLanguageDetectionCorpus = buildSurveyLanguageDetectionCorpus({
        surveyConfig,
    });
    const inheritedProjectLanguageSettings =
        languageSettingsSource === "project_inherited"
            ? await getProjectLanguageSettings({
                  db,
                  projectId: target.projectId,
              })
            : undefined;
    const conversationSourceLanguageMetadata = await resolveContentLanguageMetadata({
        text: buildContentBlockLanguageDetectionCorpus({
            conversationCorpus: buildConversationLanguageDetectionCorpus({
                conversationTitle,
                bodyPlainText,
            }),
            surveyConfig,
        }),
        googleText: buildGoogleConversationLanguageDetectionCorpus({
            conversationTitle,
            bodyPlainText,
            supplementalPlainText: surveyLanguageDetectionCorpus,
        }),
        googleCloudCredentials,
        useGoogleLanguageDetection:
            inheritedProjectLanguageSettings?.dynamicTranslationEnabled ??
            multilingualSetting.dynamicTranslationEnabled,
    });
    const normalizedMultilingualSetting =
        inheritedProjectLanguageSettings !== undefined
            ? normalizeInheritedConversationMultilingualSettings({
                  languageSettings: inheritedProjectLanguageSettings,
              })
            : normalizeConversationMultilingualSettings({
                  multilingualSettings: multilingualSetting,
                  canUseDynamicTranslation: true,
              });
    const targetLanguagePolicy =
        inheritedProjectLanguageSettings !== undefined
            ? getProjectTranslationTargetLanguagePolicy({
                  languageSettings: inheritedProjectLanguageSettings,
              })
            : getConversationOverrideTranslationTargetLanguagePolicy({
                  multilingualSettings: normalizedMultilingualSetting,
                  detectedTargetLanguageCode: sourceLanguageToDisplayLanguage({
                      sourceLanguageCode:
                          conversationSourceLanguageMetadata.sourceLanguageCode,
                  }),
              });

    let eagerContentTranslationWorkIds: number[] | undefined;

    await db.transaction(async (tx) => {
        const now = new Date();
        const polisConfigRows =
            conversationType === "polis"
                ? await tx
                      .insert(polisConversationConfigTable)
                      .values({
                          aiLabelingEnabled: request.aiLabelingEnabled,
                          preferredOpinionGroupCount:
                              request.preferredOpinionGroupCount,
                          createdAt: now,
                          updatedAt: now,
                      })
                      .returning({ id: polisConversationConfigTable.id })
                : [];
        const rankingConfigRows =
            conversationType === "ranking"
                ? await tx
                      .insert(rankingConversationConfigTable)
                      .values({
                          rankingMode: request.rankingMode,
                          externalSourceConfig:
                              request.externalSourceConfig ?? undefined,
                          createdAt: now,
                          updatedAt: now,
                      })
                      .returning({ id: rankingConversationConfigTable.id })
                : [];
        const polisConfigId = polisConfigRows.at(0)?.id;
        const rankingConfigId = rankingConfigRows.at(0)?.id;
        const insertPostResponse = await tx
            .insert(conversationTable)
            .values({
                slugId: conversationSlugId,
                projectId: target.projectId,
                isIndexed: isIndexed,
                participationMode: participationMode,
                conversationType: conversationType,
                polisConfigId,
                rankingConfigId,
                isImporting: isImporting,
                languageSettingsSource,
                requiresEventTicket: requiresEventTicket,
                currentContentId: null,
                createdAt: now,
                updatedAt: now,
                lastReactedAt: now,
                importUrl,
                importConversationUrl,
                importExportUrl,
                importCreatedAt,
                importAuthor,
                importMethod,
            })
            .returning({ conversationId: conversationTable.id });

        const insertedConversationId = insertPostResponse[0].conversationId;

        const conversationContentTableResponse = await tx
            .insert(conversationContentTable)
            .values({
                conversationId: insertedConversationId,
                title: conversationTitle,
                body: conversationBody,
                bodyPlainText,
                ...contentLanguageMetadataUpdateValues(
                    conversationSourceLanguageMetadata,
                ),
            })
            .returning({
                conversationContentId: conversationContentTable.id,
                publicId: conversationContentTable.publicId,
            });

        const insertedConversationContentId =
            conversationContentTableResponse[0].conversationContentId;
        const conversationContentPublicId =
            conversationContentTableResponse[0].publicId;

        await tx
            .update(conversationTable)
            .set({
                currentContentId: insertedConversationContentId,
            })
            .where(eq(conversationTable.id, insertedConversationId));

        await upsertConversationMultilingualSetting({
            db: tx,
            conversationId: insertedConversationId,
            setting: {
                dynamicTranslationEnabled: targetLanguagePolicy.dynamicTranslationEnabled,
                additionalLanguageCodes:
                    targetLanguagePolicy.effectiveTargetLanguageCodes,
            },
            now,
        });

        const conversationSource: ConversationContentSource = {
            conversationId: insertedConversationId,
            conversationSlugId,
            projectId: target.projectId,
            languageSettingsSource,
            dynamicTranslationEnabled: targetLanguagePolicy.dynamicTranslationEnabled,
            contentId: insertedConversationContentId,
            publicId: conversationContentPublicId,
            title: conversationTitle,
            body: conversationBody,
            sourceLanguageCode: conversationSourceLanguageMetadata.sourceLanguageCode,
            sourceRawLanguageCode:
                conversationSourceLanguageMetadata.sourceRawLanguageCode,
            sourceLanguageProvider:
                conversationSourceLanguageMetadata.sourceLanguageProvider,
            sourceLanguageConfidence:
                conversationSourceLanguageMetadata.sourceLanguageConfidence,
        };
        const seedOpinionSources: OpinionContentSource[] = [];
        const rankingItemSources: RankingItemContentSource[] = [];
        let surveySources: SurveyQuestionContentSource[] = [];

        if (seedOpinionList.length > 0) {
            if (conversationType === "ranking") {
                for (const seedTitle of seedOpinionList) {
                    const rankingItemResult = await createRankingItem({
                        db,
                        tx,
                        conversationId: insertedConversationId,
                        conversationSlugId,
                        conversationContentId: insertedConversationContentId,
                        authorId,
                        title: seedTitle,
                        isSeed: true,
                        googleCloudCredentials,
                        useGoogleLanguageDetection:
                            normalizedMultilingualSetting.dynamicTranslationEnabled,
                    });
                    rankingItemSources.push(rankingItemResult.contentSource);
                }
            } else {
                const authorRows = await tx
                    .select({ username: userTable.username })
                    .from(userTable)
                    .where(eq(userTable.id, authorId))
                    .limit(1);
                const author = authorRows.at(0);
                if (author === undefined) {
                    throw httpErrors.internalServerError(
                        "Failed to locate seed opinion author",
                    );
                }

                for (const seedOpinionText of seedOpinionList) {
                    const seedOpinionResult = await postNewOpinion({
                        db,
                        tx,
                        commentBody: seedOpinionText,
                        opinionPlainText: htmlToCountedText(seedOpinionText),
                        conversationSlugId,
                        didWrite,
                        userAgent: "Seed Opinion Creation",
                        now,
                        isSeed: true,
                        googleCloudCredentials,
                        useGoogleLanguageDetection:
                            normalizedMultilingualSetting.dynamicTranslationEnabled,
                        onCreatedOpinionSource: (source) => {
                            seedOpinionSources.push(source);
                        },
                        conversationMetadata: {
                            conversationId: insertedConversationId,
                            conversationContentId:
                                insertedConversationContentId,
                            conversationAuthorId: authorId,
                            conversationAuthorUsername: author.username,
                            conversationIsIndexed: isIndexed,
                            conversationParticipationMode: participationMode,
                            conversationIsClosed: false,
                            requiresEventTicket: requiresEventTicket ?? null,
                        },
                    });
                    if (!seedOpinionResult.success) {
                        throw httpErrors.internalServerError(
                            "Failed to create seed opinion",
                        );
                    }
                }
            }
        }

        if (surveyConfig !== undefined) {
            const surveyUpdateEffect = await setSurveyConfigForConversation({
                db: tx,
                conversationSlugId,
                conversationId: insertedConversationId,
                surveyConfig: surveyConfig ?? null,
                now,
                googleCloudCredentials,
                useGoogleLanguageDetection:
                    normalizedMultilingualSetting.dynamicTranslationEnabled,
                sourceLanguageMetadata: conversationSourceLanguageMetadata,
            });
            surveySources = surveyUpdateEffect.currentQuestionSources;
        }

        eagerContentTranslationWorkIds =
            await createEagerContentTranslationWorkForCreatedConversation({
                db: tx,
                conversationSource,
                targetLanguagePolicy,
                surveySources,
                seedOpinionSources,
                rankingItemSources,
                now,
                log,
            });

        // Create the initial coherent display state even before analysis exists.
        // There is no dedicated "created" enum yet, so reuse the content-update reason.
        await createConversationViewSnapshotsFromCurrentState({
            db: tx,
            conversationId: insertedConversationId,
            viewReason: "conversation_content_updated",
        });

        return undefined;
    });

    const createdEagerContentTranslationWorkIds = eagerContentTranslationWorkIds;
    if (createdEagerContentTranslationWorkIds === undefined) {
        throw httpErrors.internalServerError(
            "Failed to create eager content translation work rows",
        );
    }

    return {
        success: true,
        conversationSlugId: conversationSlugId,
        eagerContentTranslation: { workIds: createdEagerContentTranslationWorkIds },
    };
}

interface FetchPostBySlugIdProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    personalizedUserId?: string;
    baseImageServiceUrl: string;
    currentDisplayLanguage?: SupportedDisplayLanguageCodes;
}

export async function fetchPostBySlugId({
    db,
    conversationSlugId,
    personalizedUserId,
    baseImageServiceUrl,
    currentDisplayLanguage,
}: FetchPostBySlugIdProps): Promise<ExtendedConversation> {
    const { fetchPostItems } = useCommonPost();
    const postData = await fetchPostItems({
        db: db,
        where: eq(conversationTable.slugId, conversationSlugId),
        enableCompactBody: false,
        personalizedUserId: personalizedUserId,
        excludeLockedPosts: false,
        removeMutedAuthors: false,
        baseImageServiceUrl,
        sortAlgorithm: "new",
    });

    if (postData.size === 0) {
        throw httpErrors.notFound(
            "Failed to locate conversation slug ID in the database: " +
                conversationSlugId,
        );
    }

    const [firstPost] = postData.values();
    if (postData.size > 1) {
        log.warn(
            `Multiple conversations hold the same slugId: ${firstPost.metadata.conversationSlugId}`,
        );
    }

    const { id: conversationId } = await useCommonPost().getPostMetadataFromSlugId({
        db,
        conversationSlugId,
    });
    const [surveyGate, projectContext] = await Promise.all([
        getSurveyGateSummary({
            db,
            conversationId,
            participantId: personalizedUserId,
        }),
        currentDisplayLanguage === undefined
            ? Promise.resolve(undefined)
            : fetchConversationProjectContext({
                  db,
                  conversationSlugId,
                  currentDisplayLanguage,
              }),
    ]);

    return {
        ...firstPost,
        metadata: {
            ...firstPost.metadata,
            projectContext,
        },
        interaction: {
            ...firstPost.interaction,
            surveyGate,
        },
    };
}

interface DeletePostBySlugIdProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
}

export async function deletePostBySlugId({
    db,
    conversationSlugId,
    userId,
}: DeletePostBySlugIdProps): Promise<void> {
    const conversationId = await db.transaction(async (tx) => {
        const conversationRows = await tx
            .select({
                conversationId: conversationTable.id,
                projectId: conversationTable.projectId,
                currentContentId: conversationTable.currentContentId,
            })
            .from(conversationTable)
            .where(eq(conversationTable.slugId, conversationSlugId))
            .limit(1);

        if (conversationRows.length === 0) {
            throw httpErrors.notFound("Conversation not found");
        }

        const conversation = conversationRows[0];
        await requireProjectCapability({
            db: tx,
            userId,
            projectId: conversation.projectId,
            capability: "conversation_delete",
            message: "Missing conversation_delete capability",
        });
        if (conversation.currentContentId === null) {
            throw httpErrors.notFound("Conversation not found");
        }

        await tx
            .update(conversationTable)
            .set({
                currentContentId: null,
            })
            .where(eq(conversationTable.id, conversation.conversationId));

        // Mark all of the opinions as deleted
        await tx
            .update(opinionTable)
            .set({
                currentContentId: null,
            })
            .where(
                eq(opinionTable.conversationId, conversation.conversationId),
            );

        return conversation.conversationId;
    });

    // Delete all conversation exports after the transaction completes
    // This is done outside the transaction to prevent S3 failures from blocking conversation deletion
    try {
        const deletedExportCount = await deleteAllConversationExports({
            db,
            conversationId,
        });
        if (deletedExportCount > 0) {
            log.info(
                `Deleted ${deletedExportCount.toString()} exports for conversation ${conversationId.toString()}`,
            );
        }
    } catch (error: unknown) {
        // Log error but don't throw - conversation deletion should succeed even if export deletion fails
        log.error(
            error,
            `Error deleting exports for conversation ${conversationId.toString()}:`,
        );
    }
}

interface CloseConversationProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
}

export async function closeConversation({
    db,
    conversationSlugId,
    userId,
}: CloseConversationProps): Promise<CloseConversationResponse> {
    // First, get the conversation to check permissions and current state
    const conversation = await db
        .select({
            conversationId: conversationTable.id,
            projectId: conversationTable.projectId,
            isClosed: conversationTable.isClosed,
            isIndexed: conversationTable.isIndexed,
            participationMode: conversationTable.participationMode,
            requiresEventTicket: conversationTable.requiresEventTicket,
            aiLabelingEnabled: polisConversationConfigTable.aiLabelingEnabled,
            preferredOpinionGroupCount:
                polisConversationConfigTable.preferredOpinionGroupCount,
        })
        .from(conversationTable)
        .leftJoin(
            polisConversationConfigTable,
            eq(polisConversationConfigTable.id, conversationTable.polisConfigId),
        )
        .where(eq(conversationTable.slugId, conversationSlugId))
        .limit(1);

    if (conversation.length === 0) {
        // Conversation doesn't exist - throw 404
        throw httpErrors.notFound("Conversation not found");
    }

    const canUpdateConversation = await hasProjectCapability({
        db,
        userId,
        projectId: conversation[0].projectId,
        capability: "conversation_update",
    });
    if (!canUpdateConversation) {
        return { success: false, reason: "not_allowed" };
    }

    // Check if already closed
    if (conversation[0].isClosed) {
        return { success: false, reason: "already_closed" };
    }

    await db.transaction(async (tx) => {
        await tx
            .update(conversationTable)
            .set({ isClosed: true })
            .where(eq(conversationTable.id, conversation[0].conversationId));

        await createConversationViewSnapshotsFromCurrentState({
            db: tx,
            conversationId: conversation[0].conversationId,
            viewReason: "conversation_lifecycle_updated",
            lifecycleCheckpointReason: "conversation_closed",
            emitRealtimeEvent: true,
        });

        await scheduleConversationAnalysisRefresh({
            db: tx,
            conversationId: conversation[0].conversationId,
            log,
        });

        await queueConversationSettingsUpdatedEvent({
            db: tx,
            conversationSlugId,
            settings: {
                isIndexed: conversation[0].isIndexed,
                participationMode: conversation[0].participationMode,
                requiresEventTicket: conversation[0].requiresEventTicket,
                aiLabelingEnabled: conversation[0].aiLabelingEnabled ?? false,
                preferredOpinionGroupCount:
                    conversation[0].preferredOpinionGroupCount ?? null,
                isClosed: true,
            },
        });
    });

    return { success: true };
}

interface OpenConversationProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
}

export async function openConversation({
    db,
    conversationSlugId,
    userId,
}: OpenConversationProps): Promise<OpenConversationResponse> {
    // First, get the conversation to check permissions and current state
    const conversation = await db
        .select({
            conversationId: conversationTable.id,
            projectId: conversationTable.projectId,
            isClosed: conversationTable.isClosed,
            isIndexed: conversationTable.isIndexed,
            participationMode: conversationTable.participationMode,
            requiresEventTicket: conversationTable.requiresEventTicket,
            aiLabelingEnabled: polisConversationConfigTable.aiLabelingEnabled,
            preferredOpinionGroupCount:
                polisConversationConfigTable.preferredOpinionGroupCount,
        })
        .from(conversationTable)
        .leftJoin(
            polisConversationConfigTable,
            eq(polisConversationConfigTable.id, conversationTable.polisConfigId),
        )
        .where(eq(conversationTable.slugId, conversationSlugId))
        .limit(1);

    if (conversation.length === 0) {
        // Conversation doesn't exist - throw 404
        throw httpErrors.notFound("Conversation not found");
    }

    const canUpdateConversation = await hasProjectCapability({
        db,
        userId,
        projectId: conversation[0].projectId,
        capability: "conversation_update",
    });
    if (!canUpdateConversation) {
        return { success: false, reason: "not_allowed" };
    }

    // Check if already open
    if (!conversation[0].isClosed) {
        return { success: false, reason: "already_open" };
    }

    await db.transaction(async (tx) => {
        await tx
            .update(conversationTable)
            .set({ isClosed: false })
            .where(eq(conversationTable.id, conversation[0].conversationId));

        await scheduleConversationAnalysisRefresh({
            db: tx,
            conversationId: conversation[0].conversationId,
            log,
        });

        await queueConversationSettingsUpdatedEvent({
            db: tx,
            conversationSlugId,
            settings: {
                isIndexed: conversation[0].isIndexed,
                participationMode: conversation[0].participationMode,
                requiresEventTicket: conversation[0].requiresEventTicket,
                aiLabelingEnabled: conversation[0].aiLabelingEnabled ?? false,
                preferredOpinionGroupCount:
                    conversation[0].preferredOpinionGroupCount ?? null,
                isClosed: false,
            },
        });
    });

    return { success: true };
}

export async function getConversationContent({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId: number;
}): Promise<{ conversationTitle: string; conversationBody?: string }> {
    const results = await db
        .select({
            conversationTitle: conversationContentTable.title,
            conversationBody: conversationContentTable.body,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .where(eq(conversationTable.id, conversationId));
    if (results.length === 0) {
        throw httpErrors.notFound(
            `Conversation id ${String(conversationId)} cannot be found`,
        );
    }
    const { conversationBody, conversationTitle } = results[0];
    return {
        conversationTitle,
        conversationBody: toUnionUndefined(conversationBody),
    };
}
