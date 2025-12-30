// Edit conversation functionality
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    pollTable,
    conversationContentTable,
    conversationProofTable,
    conversationTable,
    conversationModerationTable,
} from "@/shared-backend/schema.js";
import { eq, sql } from "drizzle-orm";
import { log } from "@/app.js";
import { httpErrors } from "@fastify/sensible";
import type { EventSlug } from "@/shared/types/zod.js";
import { toUnionUndefined } from "@/shared/shared.js";
import { processUserGeneratedHtml } from "@/shared-app-api/html.js";
import { isValidPublicConversationAccess } from "./common.js";
import type {
    GetConversationForEditResponse,
    UpdateConversationRequest,
    UpdateConversationResponse,
} from "@/shared/types/dto.js";

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
            conversationSlugId: conversationTable.slugId,
            authorId: conversationTable.authorId,
            conversationTitle: conversationContentTable.title,
            conversationBody: conversationContentTable.body,
            isIndexed: conversationTable.isIndexed,
            isLoginRequired: conversationTable.isLoginRequired,
            requiresEventTicket: conversationTable.requiresEventTicket,
            indexConversationAt: conversationTable.indexConversationAt,
            createdAt: conversationTable.createdAt,
            updatedAt: conversationTable.updatedAt,
            pollId: conversationContentTable.pollId,
            option1: pollTable.option1,
            option2: pollTable.option2,
            option3: pollTable.option3,
            option4: pollTable.option4,
            option5: pollTable.option5,
            option6: pollTable.option6,
            moderationAction: conversationModerationTable.moderationAction,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .leftJoin(pollTable, eq(conversationContentTable.pollId, pollTable.id))
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

    // Check if user is the author
    if (conversation.authorId !== userId) {
        return { success: false, reason: "not_author" };
    }

    // Check if conversation is locked
    const isLocked = conversation.moderationAction === "lock";

    // Build poll options list
    let pollingOptionList: string[] | undefined = undefined;
    const hasPoll = conversation.option1 !== null;

    if (hasPoll) {
        pollingOptionList = [
            conversation.option1!,
            conversation.option2!,
            conversation.option3,
            conversation.option4,
            conversation.option5,
            conversation.option6,
        ].filter((opt): opt is string => opt !== null);
    }

    return {
        success: true,
        conversationSlugId: conversation.conversationSlugId,
        conversationTitle: conversation.conversationTitle,
        conversationBody: toUnionUndefined(conversation.conversationBody),
        pollingOptionList,
        isIndexed: conversation.isIndexed,
        isLoginRequired: conversation.isLoginRequired,
        requiresEventTicket: toUnionUndefined(
            conversation.requiresEventTicket,
        ) as EventSlug | undefined,
        indexConversationAt: conversation.indexConversationAt ?? undefined,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        hasPoll,
        isLocked,
    };
}

interface UpdateConversationProps {
    db: PostgresDatabase;
    userId: string;
    didWrite: string;
    proof: string;
    data: Omit<UpdateConversationRequest, "conversationSlugId"> & {
        conversationSlugId: string;
    };
}

export async function updateConversation({
    db,
    userId,
    didWrite,
    proof,
    data,
}: UpdateConversationProps): Promise<UpdateConversationResponse> {
    const {
        conversationSlugId,
        conversationTitle,
        conversationBody,
        pollAction,
        isIndexed,
        isLoginRequired,
        requiresEventTicket,
        indexConversationAt,
    } = data;

    // Validate public conversation access rules
    if (
        !isValidPublicConversationAccess({
            isIndexed,
            isLoginRequired,
            requiresEventTicket,
        })
    ) {
        return { success: false, reason: "invalid_access_settings" };
    }

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

    const result = await db
        .transaction(async (tx) => {
            // Get conversation and check authorization
            const conversationResults = await tx
                .select({
                    conversationId: conversationTable.id,
                    authorId: conversationTable.authorId,
                    currentContentId: conversationTable.currentContentId,
                    moderationAction:
                        conversationModerationTable.moderationAction,
                })
                .from(conversationTable)
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

            // Check if user is the author
            if (conversation.authorId !== userId) {
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

            // Get current poll status
            const currentContentResults = await tx
                .select({
                    pollId: conversationContentTable.pollId,
                })
                .from(conversationContentTable)
                .where(
                    eq(
                        conversationContentTable.id,
                        conversation.currentContentId,
                    ),
                );

            const hasPoll = currentContentResults[0]?.pollId !== null;

            // Validate poll action against current state
            if (pollAction.action === "none" && hasPoll) {
                return {
                    success: false,
                    reason: "poll_exists_use_keep_or_remove",
                } as const;
            }
            if (pollAction.action === "create" && hasPoll) {
                return {
                    success: false,
                    reason: "poll_already_exists",
                } as const;
            }
            if (pollAction.action === "remove" && !hasPoll) {
                return {
                    success: false,
                    reason: "no_poll_to_remove",
                } as const;
            }
            if (pollAction.action === "keep" && !hasPoll) {
                return { success: false, reason: "no_poll_to_keep" } as const;
            }
            if (pollAction.action === "replace" && !hasPoll) {
                return {
                    success: false,
                    reason: "no_poll_to_replace",
                } as const;
            }

            // Create edit proof
            const editProofResult = await tx
                .insert(conversationProofTable)
                .values({
                    type: "edit",
                    conversationId: conversationId,
                    authorDid: didWrite,
                    proof: proof,
                    proofVersion: 1,
                })
                .returning({ proofId: conversationProofTable.id });

            const editProofId = editProofResult[0].proofId;

            // Create new conversation content
            const newContentResult = await tx
                .insert(conversationContentTable)
                .values({
                    conversationProofId: editProofId,
                    conversationId: conversationId,
                    title: conversationTitle,
                    body: sanitizedBody,
                    pollId: null, // Will be updated if poll is created
                })
                .returning({
                    conversationContentId: conversationContentTable.id,
                });

            const newContentId = newContentResult[0].conversationContentId;

            // Handle poll action
            switch (pollAction.action) {
                case "none": {
                    // No poll exists and don't create one - no action needed
                    // pollId is already null in new content
                    break;
                }
                case "create": {
                    const options = pollAction.options;
                    const newPollResult = await tx
                        .insert(pollTable)
                        .values({
                            conversationContentId: newContentId,
                            option1: options[0],
                            option2: options[1],
                            option3: options[2] ?? null,
                            option4: options[3] ?? null,
                            option5: options[4] ?? null,
                            option6: options[5] ?? null,
                            option1Response: 0,
                            option2Response: 0,
                            option3Response: options[2] ? 0 : null,
                            option4Response: options[3] ? 0 : null,
                            option5Response: options[4] ? 0 : null,
                            option6Response: options[5] ? 0 : null,
                        })
                        .returning({ pollId: pollTable.id });

                    await tx
                        .update(conversationContentTable)
                        .set({ pollId: newPollResult[0].pollId })
                        .where(eq(conversationContentTable.id, newContentId));
                    break;
                }
                case "keep": {
                    // Copy the existing poll ID to the new content
                    const existingPollId = currentContentResults[0].pollId;
                    await tx
                        .update(conversationContentTable)
                        .set({ pollId: existingPollId })
                        .where(eq(conversationContentTable.id, newContentId));
                    break;
                }
                case "replace": {
                    // Create a brand new poll (orphaning the old one with its responses)
                    const options = pollAction.options;
                    const newPollResult = await tx
                        .insert(pollTable)
                        .values({
                            conversationContentId: newContentId,
                            option1: options[0],
                            option2: options[1],
                            option3: options[2] ?? null,
                            option4: options[3] ?? null,
                            option5: options[4] ?? null,
                            option6: options[5] ?? null,
                            option1Response: 0,
                            option2Response: 0,
                            option3Response: options[2] ? 0 : null,
                            option4Response: options[3] ? 0 : null,
                            option5Response: options[4] ? 0 : null,
                            option6Response: options[5] ? 0 : null,
                        })
                        .returning({ pollId: pollTable.id });

                    await tx
                        .update(conversationContentTable)
                        .set({ pollId: newPollResult[0].pollId })
                        .where(eq(conversationContentTable.id, newContentId));
                    break;
                }
                case "remove": {
                    // pollId is already null in new content, no action needed
                    break;
                }
            }

            // Update conversation with new content and settings
            await tx
                .update(conversationTable)
                .set({
                    currentContentId: newContentId,
                    isIndexed: isIndexed,
                    isLoginRequired: isLoginRequired,
                    requiresEventTicket: requiresEventTicket ?? null,
                    indexConversationAt:
                        indexConversationAt !== undefined
                            ? new Date(indexConversationAt)
                            : null,
                    updatedAt: new Date(),
                })
                .where(eq(conversationTable.id, conversationId));

            return { success: true } as const;
        })
        .catch((error) => {
            log.error(error, "Unexpected error updating conversation");
            throw httpErrors.internalServerError(
                "Failed to update conversation",
            );
        });

    return result;
}
