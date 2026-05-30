// Edit conversation functionality
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    conversationContentTable,
    conversationTable,
    conversationModerationTable,
    organizationTable,
} from "@/shared-backend/schema.js";
import { eq } from "drizzle-orm";
import { log } from "@/app.js";
import { httpErrors } from "@fastify/sensible";
import { toUnionUndefined } from "@/shared/shared.js";
import { processUserGeneratedHtml } from "@/shared-app-api/html.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import {
    getActiveSurveyConfigRecord,
    getSurveyConfigForConversation,
    setSurveyConfigForConversation,
    warmSurveyTranslationsForConversation,
} from "@/service/survey.js";
import type {
    GetConversationForEditResponse,
    UpdateConversationRequest,
    UpdateConversationResponse,
} from "@/shared/types/dto.js";
import { isConversationOwner } from "@/service/conversationAccess.js";
import {
    buildConversationEditPermissions,
    getPremiumEntitlementSubjectForConversation,
    getPremiumFeaturesInConversation,
    getRestrictedPremiumFeatures,
} from "@/service/premiumEntitlement.js";
import {
    createConversationViewSnapshotsFromCurrentState,
    ensureAiDescriptionLocaleExpectationsForLatestAnalysisSnapshots,
} from "@/service/conversationViewSnapshot.js";
import { queueConversationSettingsUpdatedEvent } from "@/service/realtimeEventOutbox.js";

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
            authorId: conversationTable.authorId,
            organizationId: conversationTable.organizationId,
            conversationTitle: conversationContentTable.title,
            conversationBody: conversationContentTable.body,
            isIndexed: conversationTable.isIndexed,
            participationMode: conversationTable.participationMode,
            conversationType: conversationTable.conversationType,
            requiresEventTicket: conversationTable.requiresEventTicket,
            aiLabelingEnabled: conversationTable.aiLabelingEnabled,
            preferredOpinionGroupCount:
                conversationTable.preferredOpinionGroupCount,
            postAsOrganizationName: organizationTable.name,
            createdAt: conversationTable.createdAt,
            updatedAt: conversationTable.updatedAt,
            moderationAction: conversationModerationTable.moderationAction,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .leftJoin(
            organizationTable,
            eq(conversationTable.organizationId, organizationTable.id),
        )
        .leftJoin(
            conversationModerationTable,
            eq(
                conversationModerationTable.conversationId,
                conversationTable.id,
            ),
        )
        .where(eq(conversationTable.slugId, conversationSlugId));

    if (results.length === 0) {
        return { success: false, reason: "not_found" };
    }

    const conversation = results[0];

    const isOwner = await isConversationOwner({
        db,
        userId,
        authorId: conversation.authorId,
        organizationId: conversation.organizationId,
    });
    if (!isOwner) {
        return { success: false, reason: "not_author" };
    }

    // Check if conversation is locked
    const isLocked = conversation.moderationAction === "lock";

    const surveyConfig = await getSurveyConfigForConversation({
        db,
        conversationId: conversation.conversationId,
    });

    const editPermissions = await buildConversationEditPermissions({
        db,
        conversation: {
            conversationId: conversation.conversationId,
            requiresEventTicket: conversation.requiresEventTicket,
            authorId: conversation.authorId,
            organizationId: conversation.organizationId,
        },
        hasSurvey: surveyConfig !== undefined,
        now: new Date(),
    });

    return {
        success: true,
        conversationSlugId: conversation.conversationSlugId,
        conversationTitle: conversation.conversationTitle,
        conversationBody: toUnionUndefined(conversation.conversationBody),
        isIndexed: conversation.isIndexed,
        participationMode: conversation.participationMode,
        requiresEventTicket: toUnionUndefined(conversation.requiresEventTicket),
        aiLabelingEnabled: conversation.aiLabelingEnabled,
        preferredOpinionGroupCount:
            editPermissions.canUseAnalysisVariantsPreference
                ? conversation.preferredOpinionGroupCount
                : null,
        postAsOrganizationName: toUnionUndefined(
            conversation.postAsOrganizationName,
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

export async function updateConversation({
    db,
    userId,
    googleCloudCredentials,
    data,
}: UpdateConversationProps): Promise<UpdateConversationResponse> {
    const {
        conversationSlugId,
        conversationTitle,
        conversationBody,
        isIndexed,
        participationMode,
        requiresEventTicket,
        aiLabelingEnabled,
        preferredOpinionGroupCount,
        surveyConfig,
    } = data;

    // Sanitize HTML body if provided (backend security layer)
    let sanitizedBody = conversationBody;
    if (sanitizedBody != null) {
        try {
            sanitizedBody = processUserGeneratedHtml(
                sanitizedBody,
                true,
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
    }

    const result = await db.transaction(async (tx) => {
        const now = new Date();
        // Get conversation and check authorization
        const conversationResults = await tx
            .select({
                conversationId: conversationTable.id,
                authorId: conversationTable.authorId,
                organizationId: conversationTable.organizationId,
                organizationName: organizationTable.name,
                currentContentId: conversationTable.currentContentId,
                conversationType: conversationTable.conversationType,
                isIndexed: conversationTable.isIndexed,
                participationMode: conversationTable.participationMode,
                requiresEventTicket: conversationTable.requiresEventTicket,
                aiLabelingEnabled: conversationTable.aiLabelingEnabled,
                isClosed: conversationTable.isClosed,
                currentPreferredOpinionGroupCount:
                    conversationTable.preferredOpinionGroupCount,
                currentTitle: conversationContentTable.title,
                currentBody: conversationContentTable.body,
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
            .leftJoin(
                organizationTable,
                eq(conversationTable.organizationId, organizationTable.id),
            )
            .leftJoin(
                conversationModerationTable,
                eq(
                    conversationModerationTable.conversationId,
                    conversationTable.id,
                ),
            )
            .where(eq(conversationTable.slugId, conversationSlugId));

        if (conversationResults.length === 0) {
            return { success: false, reason: "not_found" } as const;
        }

        const conversation = conversationResults[0];

        const isOwner = await isConversationOwner({
            db: tx,
            userId,
            authorId: conversation.authorId,
            organizationId: conversation.organizationId,
        });
        if (!isOwner) {
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
        if (conversation.currentContentId === null) {
            return { success: false, reason: "not_found" } as const;
        }

        const conversationId = conversation.conversationId;
        const didEnableAiLabeling =
            !conversation.aiLabelingEnabled && aiLabelingEnabled === true;

        const subject = getPremiumEntitlementSubjectForConversation({
            conversation,
        });
        const currentBody = toUnionUndefined(conversation.currentBody);
        const contentChanged =
            conversation.currentTitle !== conversationTitle ||
            currentBody !== sanitizedBody;

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
            aiLabelingEnabled ?? conversation.aiLabelingEnabled;
        const conversationSettingsChanged =
            isIndexed !== conversation.isIndexed ||
            participationMode !== conversation.participationMode ||
            (requiresEventTicket ?? null) !==
                conversation.requiresEventTicket ||
            updatedAiLabelingEnabled !== conversation.aiLabelingEnabled ||
            preferredOpinionGroupCountChanged;

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
        if (contentChanged) {
            const newContentResult = await tx
                .insert(conversationContentTable)
                .values({
                    conversationId: conversationId,
                    title: conversationTitle,
                    body: sanitizedBody,
                })
                .returning({
                    conversationContentId: conversationContentTable.id,
                });

            newContentId = newContentResult[0].conversationContentId;
        }

        const conversationUpdateValues: {
            currentContentId?: number;
            isIndexed: boolean;
            participationMode: typeof participationMode;
            requiresEventTicket: typeof requiresEventTicket | null;
            aiLabelingEnabled: boolean;
            preferredOpinionGroupCount?: typeof preferredOpinionGroupCount;
            updatedAt: Date;
            isEdited?: boolean;
        } = {
            isIndexed: isIndexed,
            participationMode: participationMode,
            requiresEventTicket: requiresEventTicket ?? null,
            aiLabelingEnabled: updatedAiLabelingEnabled,
            updatedAt: new Date(),
        };

        if (newContentId !== undefined) {
            conversationUpdateValues.currentContentId = newContentId;
            conversationUpdateValues.isEdited = true;
        }

        if (preferredOpinionGroupCountChanged) {
            conversationUpdateValues.preferredOpinionGroupCount =
                updatedPreferredOpinionGroupCount;
        }

        // Update conversation with new content and settings
        await tx
            .update(conversationTable)
            .set(conversationUpdateValues)
            .where(eq(conversationTable.id, conversationId));

        if (surveyConfig !== undefined) {
            await setSurveyConfigForConversation({
                db: tx,
                conversationId,
                surveyConfig: surveyConfig ?? null,
                now,
            });
        }

        if (contentChanged || surveyConfig !== undefined) {
            await createConversationViewSnapshotsFromCurrentState({
                db: tx,
                conversationId,
                viewReason: contentChanged
                    ? "conversation_content_updated"
                    : "survey_refreshed",
            });
        }

        return {
            success: true,
            conversationId,
            conversationSlugId,
            didEnableAiLabeling,
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

    if (result.success && result.didEnableAiLabeling) {
        await ensureAiDescriptionLocaleExpectationsForLatestAnalysisSnapshots({
            db,
            conversationId: result.conversationId,
        });
    }

    if (result.success && result.didUpdateConversationSettings) {
        await queueConversationSettingsUpdatedEvent({
            db,
            conversationSlugId: result.conversationSlugId,
            settings: result.conversationSettings,
        });
    }

    if (result.success && surveyConfig !== undefined && surveyConfig !== null) {
        void warmSurveyTranslationsForConversation({
            db,
            conversationId: result.conversationId,
            googleCloudCredentials,
        }).catch((error: unknown) => {
            log.warn(
                error,
                `[Survey Translation] Async warm-up failed after updating conversation ${conversationSlugId}`,
            );
        });
    }

    if (!result.success) {
        return result;
    }

    return { success: true };
}
