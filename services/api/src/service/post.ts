// Interact with a conversation (= post)
import { getEffectiveConversationParticipationModeWithProjectLookup } from "./conversationParticipationMode.js";
import { effectiveConversationIndexingWithProjectLookup } from "./conversationDiscovery.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { queueSourceInvalidationEvent } from "./realtimeEventOutbox.js";
import {
    opinionTable,
    conversationContentTable,
    conversationImportSourceTable,
    conversationTable,
    polisConversationConfigTable,
    rankingConversationConfigTable,
    qvConfigTable,
} from "@/shared-backend/schema.js";
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import { createEagerGatheringTranslationWork } from "./gatheringTranslationScheduling.js";
import { randomUUID } from "node:crypto";
import { logApiError } from "@/logging/privacy.js";
import type { VoteBuffer } from "./voteBuffer.js";
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
import {
    createRankingItem,
    normalizeFrontendRankingItemContent,
} from "./rankingItem.js";
import { fetchCurrentConversationTypeSettings } from "./conversationTypeConfig.js";
import { getQvItemLanguageInput } from "./qvItems.js";
import { createPreparedContentLanguageMetadata } from "./preparedContentLanguageMetadata.js";
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
import { finalizeCurrentRankingConversation } from "./conversationFinalization.js";
import { createConversationViewSnapshotsFromCurrentState } from "./conversationViewSnapshot.js";
import { transitionQvCalculation } from "./qvLifecycle.js";
import { queueConversationSettingsUpdatedEvent } from "@/service/realtimeEventOutbox.js";
import {
    lockConversationCreateTarget,
    getProjectLanguageSettings,
    lockProjectParticipantContactEmail,
    resolveConversationCreateTarget,
} from "@/service/projectAccess.js";
import {
    getPrimaryDatabase,
    type PostgresTransaction,
} from "@/shared-backend/db.js";
import {
    buildGoogleConversationLanguageDetectionCorpus,
    buildConversationLanguageDetectionCorpus,
} from "@/service/conversationLanguage.js";
import { upsertConversationMultilingualSetting } from "@/service/conversationMultilingual.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { scheduleRankingStatsRefresh } from "./comparisonQueue.js";
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
    type InheritableProjectLanguageSettingsInput,
} from "./translationLanguageSetting.js";
import {
    createEagerContentTranslationWorkForKnownConversation,
    type ConversationContentSource,
    type OpinionContentSource,
    type RankingItemContentSource,
    type SurveyQuestionContentSource,
} from "./contentTranslation.js";
import {
    lockGatheringCopyAuthors,
    prepareGatheringCreation,
} from "./gatheringCreation.js";

interface CreateNewPostProps {
    db: PostgresDatabase;
    request: CreateNewConversationRequest;
    normalizedRichText: NormalizedCreateConversationRichText;
    authorId: string;
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
    claimDraftPublication?: ClaimDraftPublication;
    preparedProjectLanguageSettings?: InheritableProjectLanguageSettingsInput;
}

export type ClaimDraftPublication = (
    tx: PostgresTransaction,
) => Promise<
    | { kind: "already_published"; conversationSlugId: string }
    | { kind: "publish"; complete: (conversationId: number) => Promise<void> }
>;

type CreateNewPostResponse =
    | Exclude<CreateNewConversationResponse, { success: true }>
    | (Extract<CreateNewConversationResponse, { success: true }> &
          (
              | { publication: "replayed" }
              | {
                    publication: "created";
                    eagerContentTranslationWorkIds: number[];
                }
          ));

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
    claimDraftPublication,
    preparedProjectLanguageSettings,
}: CreateNewPostProps): Promise<CreateNewPostResponse> {
    const {
        conversationTitle,
        postAsOrganization,
        projectSlug,
        languageSettingsSource,
        participationMode,
        conversationType,
        isIndexed,
        multilingualSetting,
    } = request;
    const surveyConfig =
        "surveyConfig" in request ? request.surveyConfig : undefined;
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
            ? (preparedProjectLanguageSettings ??
              (await getProjectLanguageSettings({
                  db,
                  projectId: target.projectId,
              })))
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

    const normalizedQvItems =
        request.conversationType === "prioritizing" &&
        request.prioritizationType === "qv"
            ? await Promise.all(
                  request.seedStatements.map(
                      async (statement) =>
                          await normalizeFrontendRankingItemContent({
                              title: statement.title,
                              bodyHtml: statement.description,
                          }),
                  ),
              )
            : [];
    const qvLanguage = createPreparedContentLanguageMetadata({
        googleCloudCredentials,
    });
    const useGoogleQvLanguageDetection =
        normalizedMultilingualSetting.dynamicTranslationEnabled &&
        googleCloudCredentials !== undefined;
    if (useGoogleQvLanguageDetection) {
        await qvLanguage.prepare(normalizedQvItems.map(getQvItemLanguageInput));
    }
    const qvItems = await Promise.all(
        normalizedQvItems.map(async (content) => ({
            ...content,
            sourceLanguageMetadata: useGoogleQvLanguageDetection
                ? await qvLanguage.resolve({
                      ...getQvItemLanguageInput(content),
                      useGoogleLanguageDetection: true,
                  })
                : content.sourceLanguageMetadata,
        })),
    );

    const result = await getPrimaryDatabase(db).transaction(async (tx) => {
        const now = new Date();
        if (conversationType === "gathering" && isImporting)
            throw httpErrors.badRequest("Gathering imports are not supported");
        const lockedSourceUserIds =
            request.conversationType === "gathering"
                ? await lockGatheringCopyAuthors({
                      tx,
                      input: request.gathering,
                      userId: authorId,
                  })
                : new Set<string>();
        if (
            !(await lockConversationCreateTarget({
                db: tx,
                userId: authorId,
                target,
            }))
        ) {
            throw httpErrors.forbidden(
                "Conversation project is no longer available",
            );
        }
        // Use the same account/organization/project lock order as direct creation.
        // Check/lock the draft before writing any published configuration.
        const draft = await claimDraftPublication?.(tx);
        if (draft?.kind === "already_published") return draft;
        if (request.conversationEmailUpdateEnabledOverride !== undefined) {
            if (
                request.conversationEmailUpdateEnabledOverride &&
                !(await lockProjectParticipantContactEmail({
                    db: tx,
                    projectId: target.projectId,
                }))
            ) {
                throw httpErrors.badRequest(
                    "Email Updates require a participant contact email",
                );
            }
        }
        const gathering =
            request.conversationType === "gathering"
                ? await prepareGatheringCreation({
                      tx,
                      input: request.gathering,
                      userId: authorId,
                      lockedSourceUserIds,
                  })
                : undefined;
        const polisConfigRows =
            conversationType === "polis"
                ? await tx
                      .insert(polisConversationConfigTable)
                      .values({
                          aiLabelingEnabled: request.aiLabelingEnabled,
                          allowParticipantStatements:
                              request.allowParticipantStatements,
                          votingPresentation: request.votingPresentation,
                          preferredOpinionGroupCount:
                              request.preferredOpinionGroupCount,
                          createdAt: now,
                          updatedAt: now,
                      })
                      .returning({ id: polisConversationConfigTable.id })
                : [];
        const rankingConfigRows =
            request.conversationType === "prioritizing" &&
            request.prioritizationType === "comparisons"
                ? await tx
                      .insert(rankingConversationConfigTable)
                      .values({
                          rankingMode: request.comparisonMethod,
                          allowParticipantStatements:
                              request.allowParticipantStatements,
                          externalSourceConfig:
                              request.externalSourceConfig ?? undefined,
                          createdAt: now,
                          updatedAt: now,
                      })
                      .returning({ id: rankingConversationConfigTable.id })
                : [];
        const polisConfigId = polisConfigRows.at(0)?.id;
        const rankingConfigId = rankingConfigRows.at(0)?.id;
        const creditVotingConfigRows =
            request.conversationType === "prioritizing" &&
            request.prioritizationType === "qv"
                ? await tx
                      .insert(qvConfigTable)
                      .values({
                          allowOpposition: request.allowOpposition,
                          itemCount: qvItems.length,
                      })
                      .returning({ id: qvConfigTable.id })
                : [];
        const insertPostResponse = await tx
            .insert(conversationTable)
            .values({
                slugId: conversationSlugId,
                projectId: target.projectId,
                isIndexed: isIndexed,
                participationMode: participationMode,
                participationModeSettingsSource:
                    request.participationModeSettingsSource,
                conversationType: conversationType,
                polisConfigId,
                rankingConfigId,
                creditVotingConfigId: creditVotingConfigRows.at(0)?.id,
                gatheringConfigId: gathering?.configId,
                prioritizationType:
                    request.conversationType === "prioritizing"
                        ? request.prioritizationType
                        : undefined,
                isImporting: isImporting,
                languageSettingsSource,
                conversationEmailUpdateEnabledOverride:
                    request.conversationEmailUpdateEnabledOverride,
                currentContentId: null,
                createdAt: now,
                updatedAt: now,
                lastReactedAt: now,
            })
            .returning({ conversationId: conversationTable.id });

        const insertedConversationId = insertPostResponse[0].conversationId;
        await gathering?.populate(insertedConversationId);

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
            if (conversationType === "prioritizing") {
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
            } else if (conversationType === "polis") {
                for (const seedOpinion of normalizedSeedOpinions) {
                    await postNewOpinion({
                        db,
                        tx,
                        normalizedContent: seedOpinion,
                        conversationSlugId,
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
                        },
                    });
                }
            }
        }

        for (const [position, normalizedContent] of qvItems.entries()) {
            const item = await createRankingItem({
                db,
                tx,
                conversationId: insertedConversationId,
                conversationSlugId,
                conversationContentId: insertedConversationContentId,
                authorId,
                isSeed: true,
                normalizedContent,
                position,
            });
            rankingItemSources.push(item.contentSource);
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

        const eagerContentTranslationWorkIds =
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
        if (conversationType === "gathering") {
            eagerContentTranslationWorkIds.push(
                ...(await createEagerGatheringTranslationWork({
                    tx,
                    conversationSlugId,
                    now,
                    scope: { kind: "conversation" },
                })),
            );
        }

        // Create the initial coherent display state even before analysis exists.
        // There is no dedicated "created" enum yet, so reuse the content-update reason.
        if (conversationType !== "gathering") {
            await createConversationViewSnapshotsFromCurrentState({
                db: tx,
                conversationId: insertedConversationId,
                viewReason: "conversation_content_updated",
            });
        }

        await draft?.complete(insertedConversationId);
        return {
            kind: "created" as const,
            conversationId: insertedConversationId,
            eagerContentTranslationWorkIds,
        };
    });

    if (result.kind === "already_published") {
        return {
            success: true,
            conversationSlugId: result.conversationSlugId,
            publication: "replayed",
        };
    }
    if (
        request.conversationType === "prioritizing" &&
        request.prioritizationType === "comparisons"
    ) {
        await scheduleRankingStatsRefresh({
            valkey,
            conversationId: result.conversationId,
            conversationSlugId,
        });
    }

    return {
        success: true,
        conversationSlugId: conversationSlugId,
        eagerContentTranslationWorkIds: result.eagerContentTranslationWorkIds,
        publication: "created",
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
        baseImageServiceUrl,
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
        if (conversation.currentContentId === null) {
            throw httpErrors.notFound("Conversation not found");
        }

        await tx
            .update(conversationTable)
            .set({
                currentContentId: null,
                deletedAt: sql`clock_timestamp()`,
            })
            .where(eq(conversationTable.id, conversation.conversationId));

        // Mark all of the opinions as deleted
        await tx
            .update(opinionTable)
            .set({
                currentContentId: null,
                deletedAt: sql`coalesce(${opinionTable.deletedAt}, clock_timestamp())`,
            })
            .where(
                eq(opinionTable.conversationId, conversation.conversationId),
            );

        await queueSourceInvalidationEvent(tx);
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
    valkey: Valkey | undefined;
    voteBuffer: VoteBuffer;
}

export async function closeConversation({
    db,
    conversationSlugId,
    valkey,
    voteBuffer,
}: CloseConversationProps): Promise<CloseConversationResponse> {
    const transitioned = await db.transaction(
        async (
            tx,
        ): Promise<
            | { transitioned: false; reason: "already_closed" | "not_allowed" }
            | {
                  transitioned: true;
                  conversationId: number;
                  finalized: boolean;
                  presentation: Awaited<
                      ReturnType<typeof fetchCurrentConversationTypeSettings>
                  >["presentation"];
              }
        > => {
            const updatedRows = await tx
                .update(conversationTable)
                .set({
                    isClosed: true,
                    closedFinalizedAt: null,
                    voteBufferDrained: ne(
                        conversationTable.conversationType,
                        "polis",
                    ),
                })
                .where(
                    and(
                        eq(conversationTable.slugId, conversationSlugId),
                        eq(conversationTable.isClosed, false),
                        eq(conversationTable.isImporting, false),
                        isNotNull(conversationTable.currentContentId),
                    ),
                )
                .returning({
                    id: conversationTable.id,
                    isIndexed:
                        effectiveConversationIndexingWithProjectLookup(tx),
                    participationMode:
                        getEffectiveConversationParticipationModeWithProjectLookup(
                            tx,
                        ),
                });
            const conversation = updatedRows.at(0);
            if (conversation === undefined) {
                const current = (
                    await tx
                        .select({ isImporting: conversationTable.isImporting })
                        .from(conversationTable)
                        .where(
                            and(
                                eq(
                                    conversationTable.slugId,
                                    conversationSlugId,
                                ),
                                isNotNull(conversationTable.currentContentId),
                            ),
                        )
                ).at(0);
                if (current === undefined)
                    throw httpErrors.notFound("Conversation not found");
                return {
                    transitioned: false,
                    reason: current.isImporting
                        ? "not_allowed"
                        : "already_closed",
                };
            }
            const typeSettings = await fetchCurrentConversationTypeSettings({
                db: tx,
                conversationId: conversation.id,
            });
            const { presentation } = typeSettings;

            let finalized: boolean;
            if (presentation.conversationType === "polis") {
                // The buffer seals admission and drains outside this transaction.
                // Its durable lifecycle barrier also survives an API restart.
                finalized = false;
            } else if (
                presentation.conversationType === "prioritizing" &&
                presentation.prioritizationType === "qv"
            ) {
                await transitionQvCalculation({
                    db: tx,
                    conversationId: conversation.id,
                    conversationSlugId,
                    action: "close",
                });
                finalized = false;
            } else if (presentation.conversationType === "gathering") {
                // Gathering has no numerical finalization or worker queue.
                await tx
                    .update(conversationTable)
                    .set({
                        closingTargetRevision: 0,
                        closedFinalizedAt: new Date(),
                    })
                    .where(eq(conversationTable.id, conversation.id));
                finalized = true;
            } else {
                finalized = await finalizeCurrentRankingConversation({
                    db: tx,
                    conversationId: conversation.id,
                });
            }

            await queueConversationSettingsUpdatedEvent({
                db: tx,
                conversationSlugId,
                settings: {
                    ...typeSettings,
                    isIndexed: conversation.isIndexed,
                    participationMode: conversation.participationMode,
                    isClosed: true,
                    isFinalizing: !finalized,
                },
            });
            return {
                transitioned: true,
                conversationId: conversation.id,
                finalized,
                presentation,
            };
        },
    );

    if (!transitioned.transitioned) {
        return { success: false, reason: transitioned.reason };
    }
    if (transitioned.presentation.conversationType === "polis") {
        try {
            await voteBuffer.flush();
        } catch (error) {
            // The close is committed. Periodic flushing recovers its drain.
            logApiError({
                logger: log,
                level: "error",
                event: { event: "application_error" },
                error,
            });
        }
    }
    if (
        transitioned.presentation.conversationType === "prioritizing" &&
        transitioned.presentation.prioritizationType === "comparisons" &&
        !transitioned.finalized
    ) {
        await scheduleRankingStatsRefresh({
            valkey,
            conversationId: transitioned.conversationId,
            conversationSlugId,
        });
    }

    return { success: true };
}

interface OpenConversationProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    valkey: Valkey | undefined;
}

export async function openConversation({
    db,
    conversationSlugId,
    valkey,
}: OpenConversationProps): Promise<OpenConversationResponse> {
    const epoch = randomUUID();
    const transitioned = await db.transaction(async (tx) => {
        const updatedRows = await tx
            .update(conversationTable)
            .set({
                isClosed: false,
                closingTargetRevision: null,
                closedFinalizedAt: null,
                voteBufferEpoch: epoch,
                voteBufferDrained: true,
            })
            .where(
                and(
                    eq(conversationTable.slugId, conversationSlugId),
                    eq(conversationTable.isClosed, true),
                    isNotNull(conversationTable.currentContentId),
                ),
            )
            .returning({
                id: conversationTable.id,
                isIndexed: effectiveConversationIndexingWithProjectLookup(tx),
                participationMode:
                    getEffectiveConversationParticipationModeWithProjectLookup(
                        tx,
                    ),
            });
        const conversation = updatedRows.at(0);
        if (conversation === undefined) {
            const current = await tx
                .select({ id: conversationTable.id })
                .from(conversationTable)
                .where(
                    and(
                        eq(conversationTable.slugId, conversationSlugId),
                        isNotNull(conversationTable.currentContentId),
                    ),
                );
            if (current.length === 0)
                throw httpErrors.notFound("Conversation not found");
            return false;
        }

        const typeSettings = await fetchCurrentConversationTypeSettings({
            db: tx,
            conversationId: conversation.id,
        });
        const { presentation } = typeSettings;
        if (presentation.conversationType === "polis") {
            await scheduleConversationAnalysisRefresh({
                db: tx,
                conversationId: conversation.id,
                log,
            });
        } else if (
            presentation.conversationType === "prioritizing" &&
            presentation.prioritizationType === "qv"
        ) {
            await transitionQvCalculation({
                db: tx,
                conversationId: conversation.id,
                conversationSlugId,
                action: "open",
            });
        }

        await queueConversationSettingsUpdatedEvent({
            db: tx,
            conversationSlugId,
            settings: {
                ...typeSettings,
                isIndexed: conversation.isIndexed,
                participationMode: conversation.participationMode,
                isClosed: false,
                isFinalizing: false,
            },
        });
        return { presentation, conversationId: conversation.id };
    });

    if (!transitioned) {
        return { success: false, reason: "already_open" };
    }
    if (
        transitioned.presentation.conversationType === "prioritizing" &&
        transitioned.presentation.prioritizationType === "comparisons"
    ) {
        await scheduleRankingStatsRefresh({
            valkey,
            conversationId: transitioned.conversationId,
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
