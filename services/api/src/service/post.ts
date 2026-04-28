// Interact with a conversation (= post)
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    opinionTable,
    conversationContentTable,
    conversationTable,
    userTable,
} from "@/shared-backend/schema.js";
import { eq, sql } from "drizzle-orm";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import type {
    ConversationType,
    EventSlug,
    ExtendedConversation,
    ExternalSourceConfig,
    ParticipationMode,
    SurveyConfig,
} from "@/shared/types/zod.js";
import type {
    CloseConversationResponse,
    OpenConversationResponse,
} from "@/shared/types/dto.js";
import { toUnionUndefined } from "@/shared/shared.js";
import { postNewOpinion } from "./comment.js";
import { createMaxdiffItem } from "./maxdiffItem.js";
import type { ConversationIds } from "@/utils/dataStructure.js";
import { processUserGeneratedHtml } from "@/shared-app-api/html.js";
import type { VoteBuffer } from "./voteBuffer.js";
import { deleteAllConversationExports } from "@/service/conversationExport/index.js";
import * as authUtilService from "@/service/authUtil.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import {
    getSurveyGateSummary,
    setSurveyConfigForConversation,
    warmSurveyTranslationsForConversation,
} from "@/service/survey.js";
import { isConversationOwner } from "@/service/conversationAccess.js";

const MAX_CONVERSATION_SEED_ITEMS = 50;

interface CreateNewPostProps {
    db: PostgresDatabase;
    voteBuffer: VoteBuffer;
    conversationTitle: string;
    conversationBody: string | null;
    authorId: string;
    didWrite: string;
    postAsOrganization?: string;
    indexConversationAt?: string;
    isIndexed: boolean;
    participationMode: ParticipationMode;
    conversationType: ConversationType;
    isImporting: boolean;
    seedOpinionList: string[];
    requiresEventTicket?: EventSlug;
    externalSourceConfig?: ExternalSourceConfig | null;
    surveyConfig?: SurveyConfig | null;
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
    voteBuffer,
    conversationTitle,
    conversationBody,
    authorId,
    didWrite,
    postAsOrganization,
    indexConversationAt,
    participationMode,
    conversationType,
    isIndexed,
    isImporting,
    seedOpinionList,
    requiresEventTicket,
    externalSourceConfig,
    surveyConfig,
    googleCloudCredentials,
    importUrl,
    importConversationUrl,
    importExportUrl,
    importCreatedAt,
    importAuthor,
    importMethod,
}: CreateNewPostProps): Promise<ConversationIds> {
    if (seedOpinionList.length > MAX_CONVERSATION_SEED_ITEMS) {
        throw httpErrors.badRequest(
            `A conversation can have at most ${String(MAX_CONVERSATION_SEED_ITEMS)} seed items`,
        );
    }
    let organizationId: number | undefined = undefined;
    if (postAsOrganization !== undefined && postAsOrganization !== "") {
        organizationId = await authUtilService.isUserPartOfOrganization({
            db,
            organizationName: postAsOrganization,
            userId: authorId,
        });
        if (organizationId === undefined) {
            throw httpErrors.forbidden(
                `User '${authorId}' is not part of the organization: '${postAsOrganization}'`,
            );
        }
    }
    const conversationSlugId = generateRandomSlugId();

    if (conversationBody != null) {
        try {
            conversationBody = processUserGeneratedHtml(
                conversationBody,
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

    const { conversationId, conversationContentId } = await db.transaction(
        async (tx) => {
            const now = new Date();
            const insertPostResponse = await tx
                .insert(conversationTable)
                .values({
                    authorId: authorId,
                    slugId: conversationSlugId,
                    organizationId: organizationId,
                    isIndexed: isIndexed,
                    participationMode: participationMode,
                    conversationType: conversationType,
                    isImporting: isImporting,
                    requiresEventTicket: requiresEventTicket,
                    indexConversationAt:
                        indexConversationAt !== undefined
                            ? new Date(indexConversationAt)
                            : undefined,
                    opinionCount: 0,
                    currentContentId: null,
                    currentPolisContentId: null, // will be subsequently updated upon external polis system fetch
                    createdAt: now,
                    updatedAt: now,
                    lastReactedAt: now,
                    importUrl,
                    importConversationUrl,
                    importExportUrl,
                    importCreatedAt,
                    importAuthor,
                    importMethod,
                    externalSourceConfig:
                        externalSourceConfig ?? undefined,
                })
                .returning({ conversationId: conversationTable.id });

            const insertedConversationId = insertPostResponse[0].conversationId;

            const conversationContentTableResponse = await tx
                .insert(conversationContentTable)
                .values({
                    conversationId: insertedConversationId,
                    title: conversationTitle,
                    body: conversationBody,
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

            // Update the user profile's conversation count
            await tx
                .update(userTable)
                .set({
                    activeConversationCount: sql`${userTable.activeConversationCount} + 1`,
                    totalConversationCount: sql`${userTable.totalConversationCount} + 1`,
                })
                .where(eq(userTable.id, authorId));

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
                    for (const seedOpinionText of seedOpinionList) {
                        await postNewOpinion({
                            db,
                            tx,
                            voteBuffer,
                            commentBody: seedOpinionText,
                            conversationSlugId,
                            didWrite,
                            userAgent: "Seed Opinion Creation",
                            now,
                            isSeed: true,
                            conversationMetadata: {
                                conversationId: insertedConversationId,
                                conversationContentId: insertedConversationContentId,
                                conversationAuthorId: authorId,
                                conversationIsIndexed: isIndexed,
                                conversationParticipationMode: participationMode,
                                conversationIsClosed: false,
                                requiresEventTicket: requiresEventTicket ?? null,
                            },
                        });
                    }
                }
            }

            if (surveyConfig !== undefined) {
                await setSurveyConfigForConversation({
                    db: tx,
                    conversationId: insertedConversationId,
                    surveyConfig: surveyConfig ?? null,
                    now,
                });
            }

            return {
                conversationId: insertedConversationId,
                conversationContentId: insertedConversationContentId,
            };
        },
    );

    if (surveyConfig !== undefined && surveyConfig !== null) {
        void warmSurveyTranslationsForConversation({
            db,
            conversationId,
            googleCloudCredentials,
        }).catch((error: unknown) => {
            log.warn(
                error,
                `[Survey Translation] Async warm-up failed after creating conversation ${conversationSlugId}`,
            );
        });
    }

    return {
        conversationId: conversationId,
        conversationSlugId: conversationSlugId,
        conversationContentId: conversationContentId,
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
                authorId: conversationTable.authorId,
                organizationId: conversationTable.organizationId,
                currentContentId: conversationTable.currentContentId,
            })
            .from(conversationTable)
            .where(eq(conversationTable.slugId, conversationSlugId))
            .limit(1);

        if (conversationRows.length === 0) {
            throw httpErrors.notFound("Conversation not found");
        }

        const conversation = conversationRows[0];
        const isOwner = await isConversationOwner({
            db: tx,
            userId,
            authorId: conversation.authorId,
            organizationId: conversation.organizationId,
        });
        if (!isOwner) {
            throw httpErrors.forbidden("Only conversation owners can delete it");
        }
        if (conversation.currentContentId === null) {
            throw httpErrors.notFound("Conversation not found");
        }

        await tx
            .update(conversationTable)
            .set({
                currentContentId: null,
            })
            .where(eq(conversationTable.id, conversation.conversationId));

        // Update the original author's active conversation count
        await tx
            .update(userTable)
            .set({
                activeConversationCount: sql`${userTable.activeConversationCount} - 1`,
            })
            .where(eq(userTable.id, conversation.authorId));

        // Mark all of the opinions as deleted
        await tx
            .update(opinionTable)
            .set({
                currentContentId: null,
            })
            .where(eq(opinionTable.conversationId, conversation.conversationId));

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
    // First, get the conversation to check ownership and current state
    const conversation = await db
        .select({
            conversationId: conversationTable.id,
            authorId: conversationTable.authorId,
            isClosed: conversationTable.isClosed,
            organizationId: conversationTable.organizationId,
        })
        .from(conversationTable)
        .where(eq(conversationTable.slugId, conversationSlugId))
        .limit(1);

    if (conversation.length === 0) {
        // Conversation doesn't exist - throw 404
        throw httpErrors.notFound("Conversation not found");
    }

    const isAuthorized = await isConversationOwner({
        db,
        userId,
        authorId: conversation[0].authorId,
        organizationId: conversation[0].organizationId,
    });
    if (!isAuthorized) {
        return { success: false, reason: "not_allowed" };
    }

    // Check if already closed
    if (conversation[0].isClosed) {
        return { success: false, reason: "already_closed" };
    }

    // Update to closed
    await db
        .update(conversationTable)
        .set({ isClosed: true })
        .where(eq(conversationTable.id, conversation[0].conversationId));

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
    // First, get the conversation to check ownership and current state
    const conversation = await db
        .select({
            conversationId: conversationTable.id,
            authorId: conversationTable.authorId,
            isClosed: conversationTable.isClosed,
            organizationId: conversationTable.organizationId,
        })
        .from(conversationTable)
        .where(eq(conversationTable.slugId, conversationSlugId))
        .limit(1);

    if (conversation.length === 0) {
        // Conversation doesn't exist - throw 404
        throw httpErrors.notFound("Conversation not found");
    }

    const isAuthorized = await isConversationOwner({
        db,
        userId,
        authorId: conversation[0].authorId,
        organizationId: conversation[0].organizationId,
    });
    if (!isAuthorized) {
        return { success: false, reason: "not_allowed" };
    }

    // Check if already open
    if (!conversation[0].isClosed) {
        return { success: false, reason: "already_open" };
    }

    // Update to open
    await db
        .update(conversationTable)
        .set({ isClosed: false })
        .where(eq(conversationTable.id, conversation[0].conversationId));

    return { success: true };
}

// interface CreateConversationFromPolisProps {
//     db: PostgresDatabase;
//     externalPolisConversationId: string;
//     axiosExternalPolis: AxiosInstance;
// }

// export async function createConversationFromPolis({
//     axiosExternalPolis,
//     externalPolisConversationId,
// }: CreateConversationFromPolisProps) {
//     console.log("Sending request");
//     const polisParticipationInit =
//         await externalPolisService.getParticipationInit({
//             axiosExternalPolis,
//             externalPolisConversationId,
//         });
//     console.log(polisParticipationInit.pca["votes-base"]["0"].A.length);
// }
//

export async function updateParticipantCount({
    db,
    conversationId,
    participantCount,
    voteCount,
    opinionCount,
}: {
    db: PostgresDatabase;
    conversationId: number;
    participantCount: number;
    voteCount?: number;
    opinionCount?: number;
}): Promise<void> {
    const updateValues: {
        participantCount: number;
        voteCount?: number;
        opinionCount?: number;
    } = { participantCount: participantCount };
    if (voteCount !== undefined) {
        updateValues.voteCount = voteCount;
    }
    if (opinionCount !== undefined) {
        updateValues.opinionCount = opinionCount;
    }
    await db
        .update(conversationTable)
        .set(updateValues)
        .where(eq(conversationTable.id, conversationId));
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
