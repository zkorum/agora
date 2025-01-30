// Interact with a conversation (= post)
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    opinionTable,
    pollTable,
    conversationContentTable,
    conversationProofTable,
    conversationTable,
    userTable,
} from "@/schema.js";
import { eq, sql, and } from "drizzle-orm";
import type { CreateNewConversationResponse } from "@/shared/types/dto.js";
import { MAX_LENGTH_BODY } from "@/shared/shared.js";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import { sanitizeHtmlBody } from "@/utils/htmlSanitization.js";
import type { ExtendedConversation } from "@/shared/types/zod.js";
import type { AxiosInstance } from "axios";
import * as polisService from "@/service/polis.js";

interface CreateNewPostProps {
    db: PostgresDatabase;
    conversationTitle: string;
    conversationBody: string | null;
    pollingOptionList: string[] | null;
    authorId: string;
    didWrite: string;
    proof: string;
    axiosPolis?: AxiosInstance;
}

export async function createNewPost({
    db,
    conversationTitle,
    conversationBody,
    authorId,
    didWrite,
    proof,
    pollingOptionList,
    axiosPolis,
}: CreateNewPostProps): Promise<CreateNewConversationResponse> {
    try {
        const conversationSlugId = generateRandomSlugId();

        if (conversationBody != null) {
            try {
                conversationBody = sanitizeHtmlBody(
                    conversationBody,
                    MAX_LENGTH_BODY,
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

        await db.transaction(async (tx) => {
            const insertPostResponse = await tx
                .insert(conversationTable)
                .values({
                    authorId: authorId,
                    slugId: conversationSlugId,
                    opinionCount: 0,
                    currentContentId: null,
                    lastReactedAt: new Date(),
                })
                .returning({ conversationId: conversationTable.id });

            const conversationId = insertPostResponse[0].conversationId;

            const masterProofTableResponse = await tx
                .insert(conversationProofTable)
                .values({
                    type: "creation",
                    conversationId: conversationId,
                    authorDid: didWrite,
                    proof: proof,
                    proofVersion: 1,
                })
                .returning({ proofId: conversationProofTable.id });

            const proofId = masterProofTableResponse[0].proofId;

            const conversationContentTableResponse = await tx
                .insert(conversationContentTable)
                .values({
                    conversationProofId: proofId,
                    conversationId: conversationId,
                    parentId: null,
                    title: conversationTitle,
                    body: conversationBody,
                    pollId: null,
                })
                .returning({
                    conversationContentId: conversationContentTable.id,
                });

            const conversationContentId =
                conversationContentTableResponse[0].conversationContentId;

            await tx
                .update(conversationTable)
                .set({
                    currentContentId: conversationContentId,
                })
                .where(eq(conversationTable.id, conversationId));

            if (pollingOptionList != null) {
                await tx.insert(pollTable).values({
                    conversationContentId: conversationContentId,
                    option1: pollingOptionList[0],
                    option2: pollingOptionList[1],
                    option3: pollingOptionList[2] ?? null,
                    option4: pollingOptionList[3] ?? null,
                    option5: pollingOptionList[4] ?? null,
                    option6: pollingOptionList[5] ?? null,
                    option1Response: 0,
                    option2Response: 0,
                    option3Response: pollingOptionList[2] ? 0 : null,
                    option4Response: pollingOptionList[3] ? 0 : null,
                    option5Response: pollingOptionList[4] ? 0 : null,
                    option6Response: pollingOptionList[5] ? 0 : null,
                });
            }

            // Update the user profile's conversation count
            await tx
                .update(userTable)
                .set({
                    activeConversationCount: sql`${userTable.activeConversationCount} + 1`,
                    totalConversationCount: sql`${userTable.totalConversationCount} + 1`,
                })
                .where(eq(userTable.id, authorId));

            if (axiosPolis !== undefined) {
                await polisService.createConversation({
                    userId: authorId,
                    conversationSlugId: conversationSlugId,
                    axiosPolis,
                });
            }
        });

        return {
            conversationSlugId: conversationSlugId,
        };
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while creating the new conversation",
        );
    }
}

interface FetchPostBySlugIdProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    personalizationUserId?: string;
}

export async function fetchPostBySlugId({
    db,
    conversationSlugId,
    personalizationUserId,
}: FetchPostBySlugIdProps): Promise<ExtendedConversation> {
    try {
        const { fetchPostItems } = useCommonPost();
        const postData = await fetchPostItems({
            db: db,
            limit: 1,
            where: eq(conversationTable.slugId, conversationSlugId),
            enableCompactBody: false,
            personalizationUserId: personalizationUserId,
            excludeLockedPosts: false,
            removeMutedAuthors: false,
        });

        if (postData.length == 1) {
            return postData[0];
        } else {
            throw httpErrors.notFound(
                "Failed to locate conversation slug ID in the database: " +
                    conversationSlugId,
            );
        }
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Failed to fetch conversation by slug ID: " + conversationSlugId,
        );
    }
}

interface DeletePostBySlugIdProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string;
    proof: string;
    didWrite: string;
}

export async function deletePostBySlugId({
    db,
    conversationSlugId,
    userId,
    proof,
    didWrite,
}: DeletePostBySlugIdProps): Promise<void> {
    try {
        await db.transaction(async (tx) => {
            // Delete the conversation
            const updatedConversationIdResponse = await tx
                .update(conversationTable)
                .set({
                    currentContentId: null,
                })
                .where(
                    and(
                        eq(conversationTable.authorId, userId),
                        eq(conversationTable.slugId, conversationSlugId),
                    ),
                )
                .returning({ conversationId: conversationTable.id });

            if (updatedConversationIdResponse.length != 1) {
                tx.rollback();
            }

            const conversationId =
                updatedConversationIdResponse[0].conversationId;

            // Update the user's active conversation count
            await tx
                .update(userTable)
                .set({
                    activeConversationCount: sql`${userTable.activeConversationCount} - 1`,
                })
                .where(eq(userTable.id, userId));

            // Create the delete proof
            await tx
                .insert(conversationProofTable)
                .values({
                    type: "deletion",
                    conversationId: conversationId,
                    authorDid: didWrite,
                    proof: proof,
                    proofVersion: 1,
                })
                .returning({ proofId: conversationProofTable.id });

            // Mark all of the opinions as deleted
            await tx
                .update(opinionTable)
                .set({
                    currentContentId: null,
                })
                .where(eq(opinionTable.conversationId, conversationId));
        });
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Failed to delete conversation by slug ID: " + conversationSlugId,
        );
    }
}
