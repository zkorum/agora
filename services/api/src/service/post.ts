// Interact with a conversation (= post)
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    opinionTable,
    conversationContentTable,
    conversationTable,
    userTable,
} from "@/shared-backend/schema.js";
import { eq } from "drizzle-orm";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import type {
    ConversationMultilingualSetting,
    ConversationType,
    EventSlug,
    ExtendedConversation,
    ExternalSourceConfig,
    ParticipationMode,
    PreferredOpinionGroupCount,
    SurveyConfig,
} from "@/shared/types/zod.js";
import type {
    CloseConversationResponse,
    CreateNewConversationResponse,
    OpenConversationResponse,
} from "@/shared/types/dto.js";
import {
    htmlToCountedText,
    toUnionUndefined,
    validateRichTextInput,
} from "@/shared/shared.js";
import { postNewOpinion } from "./comment.js";
import { createMaxdiffItem } from "./maxdiffItem.js";
import { processUserGeneratedHtml } from "@/shared-app-api/html.js";
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
    requireProjectCapability,
    resolveConversationCreateTarget,
} from "@/service/projectAccess.js";
import {
    buildGoogleConversationLanguageDetectionCorpus,
    buildConversationLanguageDetectionCorpus,
} from "@/service/conversationLanguage.js";
import { upsertConversationMultilingualSetting } from "@/service/conversationMultilingual.js";
import type { ConversationLanguageSettingInput } from "@/shared/types/zod.js";
import {
    buildContentBlockLanguageDetectionCorpus,
    buildSurveyLanguageDetectionCorpus,
    contentLanguageMetadataUpdateValues,
    resolveContentLanguageMetadata,
} from "./contentLanguageMetadata.js";
import { normalizeConversationMultilingualSettings } from "./translationLanguageSetting.js";

const MAX_CONVERSATION_SEED_ITEMS = 50;

interface CreateNewPostProps {
    db: PostgresDatabase;
    conversationTitle: string;
    conversationBody: string | null;
    conversationBodyPlainText: string;
    authorId: string;
    didWrite: string;
    postAsOrganization?: string;
    autoProvisionedDefaultLanguage: SupportedDisplayLanguageCodes;
    isIndexed: boolean;
    participationMode: ParticipationMode;
    conversationType: ConversationType;
    isImporting: boolean;
    seedOpinionList: string[];
    requiresEventTicket?: EventSlug;
    aiLabelingEnabled: boolean;
    preferredOpinionGroupCount: PreferredOpinionGroupCount;
    externalSourceConfig?: ExternalSourceConfig | null;
    surveyConfig?: SurveyConfig | null;
    languageSetting: ConversationLanguageSettingInput;
    multilingualSetting: ConversationMultilingualSetting;
    googleCloudCredentials?: GoogleCloudCredentials;
    importUrl?: string;
    importConversationUrl?: string;
    importExportUrl?: string;
    importCreatedAt?: Date;
    importAuthor?: string;
    importMethod?: "url" | "csv";
}

export async function createNewPost({
    db,
    conversationTitle,
    conversationBody,
    conversationBodyPlainText,
    authorId,
    didWrite,
    postAsOrganization,
    autoProvisionedDefaultLanguage,
    participationMode,
    conversationType,
    isIndexed,
    isImporting,
    seedOpinionList,
    requiresEventTicket,
    aiLabelingEnabled,
    preferredOpinionGroupCount,
    externalSourceConfig,
    surveyConfig,
    multilingualSetting,
    googleCloudCredentials,
    importUrl,
    importConversationUrl,
    importExportUrl,
    importCreatedAt,
    importAuthor,
    importMethod,
}: CreateNewPostProps): Promise<CreateNewConversationResponse> {
    if (seedOpinionList.length > MAX_CONVERSATION_SEED_ITEMS) {
        throw httpErrors.badRequest(
            `A conversation can have at most ${String(MAX_CONVERSATION_SEED_ITEMS)} seed items`,
        );
    }
    const target = await resolveConversationCreateTarget({
        db,
        userId: authorId,
        postAsOrganizationSlug: postAsOrganization,
        autoProvisionedDefaultLanguage,
    });
    const conversationSlugId = generateRandomSlugId();

    let bodyPlainText = "";
    if (conversationBody != null) {
        try {
            conversationBody = processUserGeneratedHtml(
                conversationBody,
                false,
                "input",
            );
        } catch (error) {
            if (error instanceof Error) {
                throw httpErrors.badRequest(error.message);
            } else {
                throw httpErrors.badRequest(
                    "Error while sanitizing request body",
                );
            }
        }

        const validationResult = validateRichTextInput({
            htmlString: conversationBody,
            mode: "conversation",
        });
        if (!validationResult.success) {
            return validationResult;
        }

        conversationBody = processUserGeneratedHtml(
            conversationBody,
            true,
            "input",
        );
        bodyPlainText = htmlToCountedText(conversationBody);
        if (bodyPlainText !== conversationBodyPlainText) {
            log.info(
                {
                    frontendPlainTextChars: conversationBodyPlainText.length,
                    serverPlainTextChars: bodyPlainText.length,
                },
                "[ConversationPlainText] Frontend/backend plain text mismatch on create",
            );
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
        useGoogleLanguageDetection: multilingualSetting.dynamicTranslationEnabled,
    });
    const normalizedMultilingualSetting = normalizeConversationMultilingualSettings({
        multilingualSettings: multilingualSetting,
        canUseDynamicTranslation: true,
        sourceLanguageCode: conversationSourceLanguageMetadata.sourceLanguageCode,
    });

    await db.transaction(async (tx) => {
        const now = new Date();
        const insertPostResponse = await tx
            .insert(conversationTable)
            .values({
                slugId: conversationSlugId,
                projectId: target.projectId,
                isIndexed: isIndexed,
                participationMode: participationMode,
                conversationType: conversationType,
                isImporting: isImporting,
                requiresEventTicket: requiresEventTicket,
                aiLabelingEnabled,
                preferredOpinionGroupCount,
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
                externalSourceConfig: externalSourceConfig ?? undefined,
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
            });

        const insertedConversationContentId =
            conversationContentTableResponse[0].conversationContentId;

        await tx
            .update(conversationTable)
            .set({
                currentContentId: insertedConversationContentId,
            })
            .where(eq(conversationTable.id, insertedConversationId));

        await upsertConversationMultilingualSetting({
            db: tx,
            conversationId: insertedConversationId,
            setting: normalizedMultilingualSetting,
            now,
        });

        if (seedOpinionList.length > 0) {
            if (conversationType === "maxdiff") {
                for (const seedTitle of seedOpinionList) {
                    await createMaxdiffItem({
                        db,
                        tx,
                        conversationId: insertedConversationId,
                        conversationContentId: insertedConversationContentId,
                        authorId,
                        title: seedTitle,
                        isSeed: true,
                    });
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
            await setSurveyConfigForConversation({
                db: tx,
                conversationId: insertedConversationId,
                surveyConfig: surveyConfig ?? null,
                now,
                googleCloudCredentials,
                useGoogleLanguageDetection:
                    normalizedMultilingualSetting.dynamicTranslationEnabled,
                sourceLanguageMetadata: conversationSourceLanguageMetadata,
            });
        }

        // Create the initial coherent display state even before analysis exists.
        // There is no dedicated "created" enum yet, so reuse the content-update reason.
        await createConversationViewSnapshotsFromCurrentState({
            db: tx,
            conversationId: insertedConversationId,
            viewReason: "conversation_content_updated",
        });

        return undefined;
    });

    return {
        success: true,
        conversationSlugId: conversationSlugId,
    };
}

interface FetchPostBySlugIdProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    personalizedUserId?: string;
    baseImageServiceUrl: string;
}

export async function fetchPostBySlugId({
    db,
    conversationSlugId,
    personalizedUserId,
    baseImageServiceUrl,
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

    if (postData.size == 1) {
        const [firstPost] = postData.values();
        const { id: conversationId } =
            await useCommonPost().getPostMetadataFromSlugId({
                db,
                conversationSlugId,
            });
        firstPost.interaction = {
            ...firstPost.interaction,
            surveyGate: await getSurveyGateSummary({
                db,
                conversationId,
                participantId: personalizedUserId,
            }),
        };
        return firstPost;
    } else if (postData.size > 1) {
        const [firstPost] = postData.values();
        log.warn(
            `Multiple conversations hold the same slugId: ${firstPost.metadata.conversationSlugId}`,
        );
        const { id: conversationId } =
            await useCommonPost().getPostMetadataFromSlugId({
                db,
                conversationSlugId,
            });
        firstPost.interaction = {
            ...firstPost.interaction,
            surveyGate: await getSurveyGateSummary({
                db,
                conversationId,
                participantId: personalizedUserId,
            }),
        };
        return firstPost;
    } else {
        throw httpErrors.notFound(
            "Failed to locate conversation slug ID in the database: " +
                conversationSlugId,
        );
    }
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
            aiLabelingEnabled: conversationTable.aiLabelingEnabled,
            preferredOpinionGroupCount:
                conversationTable.preferredOpinionGroupCount,
        })
        .from(conversationTable)
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
                aiLabelingEnabled: conversation[0].aiLabelingEnabled,
                preferredOpinionGroupCount:
                    conversation[0].preferredOpinionGroupCount,
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
            aiLabelingEnabled: conversationTable.aiLabelingEnabled,
            preferredOpinionGroupCount:
                conversationTable.preferredOpinionGroupCount,
        })
        .from(conversationTable)
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
                aiLabelingEnabled: conversation[0].aiLabelingEnabled,
                preferredOpinionGroupCount:
                    conversation[0].preferredOpinionGroupCount,
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
