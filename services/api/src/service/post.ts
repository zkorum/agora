// Interact with a conversation (= post)
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    opinionTable,
    conversationContentTable,
    conversationImportSourceTable,
    conversationTable,
    polisConversationConfigTable,
    rankingConversationConfigTable,
    userTable,
} from "@/shared-backend/schema.js";
import { and, eq } from "drizzle-orm";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import type { ExtendedConversation } from "@/shared/types/zod.js";
import type {
    CloseConversationResponse,
    CreateNewConversationRequest,
    CreateNewConversationResponse,
    OpenConversationResponse,
} from "@/shared/types/dto.js";
import { toUnionUndefined } from "@/shared/shared.js";
import { postNewOpinion } from "./comment.js";
import { createRankingItem } from "./rankingItem.js";
import {
    normalizeUserRichTextInput,
    type NormalizedUserRichText,
} from "./richText.js";
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
import type { Valkey } from "@/shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
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
    createEagerContentTranslationWorkForKnownConversation,
    type ConversationContentSource,
    type OpinionContentSource,
    type RankingItemContentSource,
    type SurveyQuestionContentSource,
} from "./contentTranslation.js";

async function scheduleRankingStatsRefresh({
    valkey,
    conversationId,
    conversationSlugId,
}: {
    valkey: Valkey | undefined;
    conversationId: number;
    conversationSlugId: string;
}): Promise<void> {
    if (valkey === undefined) {
        return;
    }
    const member = `${String(conversationId)}:${conversationSlugId}`;
    try {
        await valkey.zadd(VALKEY_QUEUE_KEYS.SCORING_DIRTY_SOLIDAGO, {
            [member]: 0,
        });
    } catch (error: unknown) {
        log.error(
            error,
            `[Conversation] Failed to schedule ranking stats refresh for ${member}`,
        );
    }
}

interface CreateNewPostProps {
    db: PostgresDatabase;
    request: CreateNewConversationRequest;
    normalizedRichText: NormalizedCreateConversationRichText;
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
    valkey: Valkey | undefined;
}

export interface CreatedConversationEagerContentTranslation {
    workIds: number[];
}

type CreateNewPostResponse =
    | Exclude<CreateNewConversationResponse, { success: true }>
    | (Extract<CreateNewConversationResponse, { success: true }> & {
          eagerContentTranslation: CreatedConversationEagerContentTranslation;
      });

export interface NormalizedCreateConversationRichText {
    body: NormalizedUserRichText | undefined;
    seedOpinions: NormalizedUserRichText[];
}

type NormalizeCreateConversationRichTextResult =
    | {
          success: true;
          content: NormalizedCreateConversationRichText;
      }
    | Exclude<CreateNewConversationResponse, { success: true }>;

export function normalizeCreateConversationRichText(
    request: CreateNewConversationRequest,
): NormalizeCreateConversationRichTextResult {
    let body: NormalizedUserRichText | undefined;
    if (request.conversationBody !== undefined) {
        const normalizationResult = normalizeUserRichTextInput({
            html: request.conversationBody,
            validationMode: "conversation",
        });
        if (!normalizationResult.success) {
            return {
                success: false,
                failure: {
                    target: "conversation_body",
                    reason: normalizationResult.reason,
                    count: normalizationResult.count,
                    limit: normalizationResult.limit,
                },
            };
        }
        body = normalizationResult.content;
    }

    const seedOpinions: NormalizedUserRichText[] = [];
    for (const [index, seedOpinion] of request.seedOpinionList.entries()) {
        const normalizationResult = normalizeUserRichTextInput({
            html: seedOpinion,
            validationMode: "opinion",
        });
        if (!normalizationResult.success) {
            return {
                success: false,
                failure: {
                    target: "seed_opinion",
                    reason: normalizationResult.reason,
                    index,
                    count: normalizationResult.count,
                    limit: normalizationResult.limit,
                },
            };
        }
        seedOpinions.push(normalizationResult.content);
    }

    return {
        success: true,
        content: { body, seedOpinions },
    };
}

export async function createNewPost({
    db,
    request,
    normalizedRichText,
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
    valkey,
}: CreateNewPostProps): Promise<CreateNewPostResponse> {
    const {
        conversationTitle,
        postAsOrganization,
        projectSlug,
        languageSettingsSource,
        participationMode,
        conversationType,
        isIndexed,
        requiresEventTicket,
        multilingualSetting,
    } = request;
    const surveyConfig =
        conversationType === "polis" ? request.surveyConfig : undefined;
    const conversationBody = normalizedRichText.body?.html ?? null;
    const bodyPlainText = normalizedRichText.body?.plainText ?? "";
    const normalizedSeedOpinions = normalizedRichText.seedOpinions;

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
    const conversationSourceLanguageMetadata =
        await resolveContentLanguageMetadata({
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
    let createdConversationId: number | undefined;

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
                conversationEmailUpdateEnabledOverride:
                    request.conversationEmailUpdateEnabledOverride,
                currentContentId: null,
                createdAt: now,
                updatedAt: now,
                lastReactedAt: now,
            })
            .returning({ conversationId: conversationTable.id });

        const insertedConversationId = insertPostResponse[0].conversationId;
        createdConversationId = insertedConversationId;

        if (
            importUrl !== undefined ||
            importConversationUrl !== undefined ||
            importExportUrl !== undefined ||
            importCreatedAt !== undefined ||
            importAuthor !== undefined ||
            importMethod !== undefined
        ) {
            await tx.insert(conversationImportSourceTable).values({
                conversationId: insertedConversationId,
                importUrl,
                importConversationUrl,
                importExportUrl,
                importCreatedAt,
                importAuthor,
                importMethod,
                createdAt: now,
                updatedAt: now,
            });
        }

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
                dynamicTranslationEnabled:
                    targetLanguagePolicy.dynamicTranslationEnabled,
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
            dynamicTranslationEnabled:
                targetLanguagePolicy.dynamicTranslationEnabled,
            contentId: insertedConversationContentId,
            publicId: conversationContentPublicId,
            title: conversationTitle,
            body: conversationBody,
            sourceLanguageCode:
                conversationSourceLanguageMetadata.sourceLanguageCode,
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

        if (normalizedSeedOpinions.length > 0) {
            if (conversationType === "ranking") {
                for (const seedOpinion of normalizedSeedOpinions) {
                    const rankingItemResult = await createRankingItem({
                        db,
                        tx,
                        conversationId: insertedConversationId,
                        conversationSlugId,
                        conversationContentId: insertedConversationContentId,
                        authorId,
                        title: seedOpinion.html,
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

                for (const seedOpinion of normalizedSeedOpinions) {
                    const seedOpinionResult = await postNewOpinion({
                        db,
                        tx,
                        normalizedContent: seedOpinion,
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

        if (rankingConfigId !== undefined) {
            await tx
                .update(rankingConversationConfigTable)
                .set({
                    itemCount: rankingItemSources.length,
                    totalItemCount: rankingItemSources.length,
                })
                .where(eq(rankingConversationConfigTable.id, rankingConfigId));
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
            await createEagerContentTranslationWorkForKnownConversation({
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

    const createdEagerContentTranslationWorkIds =
        eagerContentTranslationWorkIds;
    if (createdEagerContentTranslationWorkIds === undefined) {
        throw httpErrors.internalServerError(
            "Failed to create eager content translation work rows",
        );
    }
    if (createdConversationId === undefined) {
        throw httpErrors.internalServerError("Failed to create conversation");
    }
    if (conversationType === "ranking") {
        await scheduleRankingStatsRefresh({
            valkey,
            conversationId: createdConversationId,
            conversationSlugId,
        });
    }

    return {
        success: true,
        conversationSlugId: conversationSlugId,
        eagerContentTranslation: {
            workIds: createdEagerContentTranslationWorkIds,
        },
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
    const postItems = await fetchPostItems({
        db: db,
        where: eq(conversationTable.slugId, conversationSlugId),
        enableCompactBody: false,
        personalizedUserId: personalizedUserId,
        excludeLockedPosts: false,
        removeMutedAuthors: false,
        baseImageServiceUrl,
        sortAlgorithm: "new",
        currentDisplayLanguage: currentDisplayLanguage ?? "en",
    });

    if (postItems.size === 0) {
        throw httpErrors.notFound(
            "Failed to locate conversation slug ID in the database: " +
                conversationSlugId,
        );
    }

    const [firstPostItem] = postItems.values();
    const firstPost = firstPostItem.conversationData;
    if (postItems.size > 1) {
        log.warn(
            `Multiple conversations hold the same slugId: ${firstPost.metadata.conversationSlugId}`,
        );
    }

    const { id: conversationId } =
        await useCommonPost().getPostMetadataFromSlugId({
            db,
            conversationSlugId,
        });
    const surveyGate = await getSurveyGateSummary({
        db,
        conversationId,
        participantId: personalizedUserId,
    });

    return {
        ...firstPost,
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
    valkey: Valkey | undefined;
}

export async function closeConversation({
    db,
    conversationSlugId,
    userId,
    valkey,
}: CloseConversationProps): Promise<CloseConversationResponse> {
    // First, get the conversation to check permissions and current state
    const conversation = await db
        .select({
            conversationId: conversationTable.id,
            projectId: conversationTable.projectId,
            isIndexed: conversationTable.isIndexed,
            participationMode: conversationTable.participationMode,
            requiresEventTicket: conversationTable.requiresEventTicket,
            aiLabelingEnabled: polisConversationConfigTable.aiLabelingEnabled,
            preferredOpinionGroupCount:
                polisConversationConfigTable.preferredOpinionGroupCount,
            conversationType: conversationTable.conversationType,
        })
        .from(conversationTable)
        .leftJoin(
            polisConversationConfigTable,
            eq(
                polisConversationConfigTable.id,
                conversationTable.polisConfigId,
            ),
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
        capability: "conversation_edit",
    });
    if (!canUpdateConversation) {
        return { success: false, reason: "not_allowed" };
    }

    const transitioned = await db.transaction(async (tx) => {
        const updatedRows = await tx
            .update(conversationTable)
            .set({ isClosed: true })
            .where(
                and(
                    eq(conversationTable.id, conversation[0].conversationId),
                    eq(conversationTable.isClosed, false),
                ),
            )
            .returning({ id: conversationTable.id });
        if (updatedRows.length === 0) {
            return false;
        }

        if (conversation[0].conversationType === "polis") {
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
        }

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
        return true;
    });

    if (!transitioned) {
        return { success: false, reason: "already_closed" };
    }
    if (conversation[0].conversationType === "ranking") {
        await scheduleRankingStatsRefresh({
            valkey,
            conversationId: conversation[0].conversationId,
            conversationSlugId,
        });
    }

    return { success: true };
}

interface OpenConversationProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
    valkey: Valkey | undefined;
}

export async function openConversation({
    db,
    conversationSlugId,
    userId,
    valkey,
}: OpenConversationProps): Promise<OpenConversationResponse> {
    // First, get the conversation to check permissions and current state
    const conversation = await db
        .select({
            conversationId: conversationTable.id,
            projectId: conversationTable.projectId,
            isIndexed: conversationTable.isIndexed,
            participationMode: conversationTable.participationMode,
            requiresEventTicket: conversationTable.requiresEventTicket,
            aiLabelingEnabled: polisConversationConfigTable.aiLabelingEnabled,
            preferredOpinionGroupCount:
                polisConversationConfigTable.preferredOpinionGroupCount,
            conversationType: conversationTable.conversationType,
        })
        .from(conversationTable)
        .leftJoin(
            polisConversationConfigTable,
            eq(
                polisConversationConfigTable.id,
                conversationTable.polisConfigId,
            ),
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
        capability: "conversation_edit",
    });
    if (!canUpdateConversation) {
        return { success: false, reason: "not_allowed" };
    }

    const transitioned = await db.transaction(async (tx) => {
        const updatedRows = await tx
            .update(conversationTable)
            .set({ isClosed: false })
            .where(
                and(
                    eq(conversationTable.id, conversation[0].conversationId),
                    eq(conversationTable.isClosed, true),
                ),
            )
            .returning({ id: conversationTable.id });
        if (updatedRows.length === 0) {
            return false;
        }

        if (conversation[0].conversationType === "polis") {
            await scheduleConversationAnalysisRefresh({
                db: tx,
                conversationId: conversation[0].conversationId,
                log,
            });
        }

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
        return true;
    });

    if (!transitioned) {
        return { success: false, reason: "already_open" };
    }

    if (conversation[0].conversationType === "ranking") {
        await scheduleRankingStatsRefresh({
            valkey,
            conversationId: conversation[0].conversationId,
            conversationSlugId,
        });
    }

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
