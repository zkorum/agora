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
    assertSurveyFeatureAllowedForConversation,
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
            requiresEventTicket: conversationTable.requiresEventTicket,
            postAsOrganizationName: organizationTable.name,
            indexConversationAt: conversationTable.indexConversationAt,
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

    return {
        success: true,
        conversationSlugId: conversation.conversationSlugId,
        conversationTitle: conversation.conversationTitle,
        conversationBody: toUnionUndefined(conversation.conversationBody),
        isIndexed: conversation.isIndexed,
        participationMode: conversation.participationMode,
        requiresEventTicket: toUnionUndefined(conversation.requiresEventTicket),
        postAsOrganizationName: toUnionUndefined(
            conversation.postAsOrganizationName,
        ),
        surveyConfig: await getSurveyConfigForConversation({
            db,
            conversationId: conversation.conversationId,
        }),
        indexConversationAt: conversation.indexConversationAt ?? undefined,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        isLocked,
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
        surveyConfig,
        indexConversationAt,
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

    let updatedConversationId: number | undefined;

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
                moderationAction: conversationModerationTable.moderationAction,
            })
            .from(conversationTable)
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
        updatedConversationId = conversationId;

        // Create new conversation content
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

        const newContentId = newContentResult[0].conversationContentId;

        // Update conversation with new content and settings
        await tx
            .update(conversationTable)
            .set({
                currentContentId: newContentId,
                isIndexed: isIndexed,
                participationMode: participationMode,
                requiresEventTicket: requiresEventTicket ?? null,
                indexConversationAt:
                    indexConversationAt !== undefined
                        ? new Date(indexConversationAt)
                        : null,
                updatedAt: new Date(),
                isEdited: true,
            })
            .where(eq(conversationTable.id, conversationId));

        if (surveyConfig !== undefined) {
            const existingSurveyConfig = await getActiveSurveyConfigRecord({
                db: tx,
                conversationId,
            });
            assertSurveyFeatureAllowedForConversation({
                organizationName: conversation.organizationName,
                hasExistingSurvey: existingSurveyConfig !== undefined,
                userId,
            });

            await setSurveyConfigForConversation({
                db: tx,
                conversationId,
                surveyConfig: surveyConfig ?? null,
                now,
            });
        }

        return { success: true } as const;
    });

    if (
        result.success &&
        surveyConfig !== undefined &&
        surveyConfig !== null &&
        updatedConversationId !== undefined
    ) {
        void warmSurveyTranslationsForConversation({
            db,
            conversationId: updatedConversationId,
            googleCloudCredentials,
        }).catch((error: unknown) => {
            log.warn(
                error,
                `[Survey Translation] Async warm-up failed after updating conversation ${conversationSlugId}`,
            );
        });
    }

    return result;
}
