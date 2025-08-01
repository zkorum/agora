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
import type { ImportConversationResponse } from "@/shared/types/dto.js";
import { generateRandomSlugId } from "@/crypto.js";
import { log, config } from "@/app.js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import type { ExtendedConversation, PolisUrl } from "@/shared/types/zod.js";
import type { AxiosInstance } from "axios";
import * as authUtilService from "@/service/authUtil.js";
import * as polisService from "@/service/polis.js";
import * as importService from "@/service/import.js";
import { processHtmlBody } from "@/shared/shared.js";
import { postNewOpinion } from "./comment.js";
import { nowZeroMs } from "@/shared/common/util.js";
import type { ConversationIds } from "@/utils/dataStructure.js";

interface CreateNewPostProps {
    db: PostgresDatabase;
    conversationTitle: string;
    conversationBody: string | null;
    pollingOptionList: string[] | null;
    authorId: string;
    didWrite: string;
    proof: string;
    postAsOrganization?: string;
    indexConversationAt?: string;
    isIndexed: boolean;
    isLoginRequired: boolean;
    seedOpinionList: string[];
}

interface ImportPostProps {
    db: PostgresDatabase;
    authorId: string;
    didWrite: string;
    proof: string;
    polisUrl: PolisUrl;
    axiosPolis: AxiosInstance;
    postAsOrganization: string | undefined;
    indexConversationAt?: string;
    isIndexed: boolean;
    isLoginRequired: boolean;
    isOrgImportOnly: boolean;
    awsAiLabelSummaryEnable: boolean;
    awsAiLabelSummaryRegion: string;
    awsAiLabelSummaryModelId: string;
    awsAiLabelSummaryTemperature: string;
    awsAiLabelSummaryTopP: string;
    awsAiLabelSummaryMaxTokens: string;
    awsAiLabelSummaryPrompt: string;
}

export async function importConversation({
    db,
    authorId,
    didWrite,
    proof,
    polisUrl,
    axiosPolis,
    postAsOrganization,
    indexConversationAt,
    isLoginRequired,
    isIndexed,
    isOrgImportOnly,
    awsAiLabelSummaryEnable,
    awsAiLabelSummaryRegion,
    awsAiLabelSummaryModelId,
    awsAiLabelSummaryTemperature,
    awsAiLabelSummaryTopP,
    awsAiLabelSummaryMaxTokens,
    awsAiLabelSummaryPrompt,
}: ImportPostProps): Promise<ImportConversationResponse> {
    if (
        (postAsOrganization === undefined || postAsOrganization === "") &&
        isOrgImportOnly
    ) {
        throw httpErrors.forbidden(
            "Import feature restricted to organizations",
        );
    }
    if (postAsOrganization !== undefined && postAsOrganization !== "") {
        let organizationId: number | undefined = undefined;
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
    const { importedPolisConversation, polisUrlType } =
        await polisService.importExternalPolisConversation({
            polisUrl: polisUrl,
            axiosPolis: axiosPolis,
        });
    const { conversationId, conversationSlugId } =
        await importService.loadImportedPolisConversation({
            db,
            importedPolisConversation,
            polisUrlType,
            polisUrl,
            proof: proof,
            didWrite: didWrite,
            authorId: authorId,
            postAsOrganization: postAsOrganization,
            indexConversationAt,
            isLoginRequired,
            isIndexed,
        });
    const votes = await polisService.getPolisVotes({
        db,
        conversationId,
        conversationSlugId,
    });
    await polisService.getAndUpdatePolisMath({
        db: db,
        conversationSlugId: conversationSlugId,
        conversationId: conversationId,
        axiosPolis,
        votes: votes,
        awsAiLabelSummaryEnable,
        awsAiLabelSummaryRegion,
        awsAiLabelSummaryModelId,
        awsAiLabelSummaryTemperature,
        awsAiLabelSummaryTopP,
        awsAiLabelSummaryMaxTokens,
        awsAiLabelSummaryPrompt,
    });

    return {
        conversationSlugId: conversationSlugId,
    };
}

export async function createNewPost({
    db,
    conversationTitle,
    conversationBody,
    authorId,
    didWrite,
    proof,
    pollingOptionList,
    postAsOrganization,
    indexConversationAt,
    isLoginRequired,
    isIndexed,
    seedOpinionList,
}: CreateNewPostProps): Promise<ConversationIds> {
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
            conversationBody = processHtmlBody(conversationBody, true);
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
            const insertPostResponse = await tx
                .insert(conversationTable)
                .values({
                    authorId: authorId,
                    slugId: conversationSlugId,
                    organizationId: organizationId,
                    isIndexed: isIndexed,
                    isLoginRequired: isIndexed ? true : isLoginRequired,
                    indexConversationAt:
                        indexConversationAt !== undefined
                            ? new Date(indexConversationAt)
                            : undefined,
                    opinionCount: 0,
                    currentContentId: null,
                    currentPolisContentId: null, // will be subsequently updated upon external polis system fetch
                    lastReactedAt: new Date(),
                })
                .returning({ conversationId: conversationTable.id });

            const insertedConversationId = insertPostResponse[0].conversationId;

            const masterProofTableResponse = await tx
                .insert(conversationProofTable)
                .values({
                    type: "creation",
                    conversationId: insertedConversationId,
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
                    conversationId: insertedConversationId,
                    title: conversationTitle,
                    body: conversationBody,
                    pollId: null,
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

            if (pollingOptionList != null) {
                await tx.insert(pollTable).values({
                    conversationContentId: insertedConversationContentId,
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
            return {
                conversationId: insertedConversationId,
                conversationContentId: insertedConversationContentId,
            };
        },
    );

    // Create seed opinions
    if (seedOpinionList.length > 0) {
        const now = nowZeroMs();
        for (const seedOpinionText of seedOpinionList) {
            await postNewOpinion({
                db,
                commentBody: seedOpinionText,
                conversationSlugId,
                didWrite,
                proof,
                userAgent: "Seed Opinion Creation",
                axiosPolis: undefined, // no auto vote opinions for seed comments
                voteNotifMilestones: config.VOTE_NOTIF_MILESTONES,
                awsAiLabelSummaryEnable:
                    config.AWS_AI_LABEL_SUMMARY_ENABLE &&
                    (config.NODE_ENV === "production" ||
                        config.NODE_ENV === "staging"),
                awsAiLabelSummaryRegion: config.AWS_AI_LABEL_SUMMARY_REGION,
                awsAiLabelSummaryModelId: config.AWS_AI_LABEL_SUMMARY_MODEL_ID,
                awsAiLabelSummaryTemperature:
                    config.AWS_AI_LABEL_SUMMARY_TEMPERATURE,
                awsAiLabelSummaryTopP: config.AWS_AI_LABEL_SUMMARY_TOP_P,
                awsAiLabelSummaryMaxTokens:
                    config.AWS_AI_LABEL_SUMMARY_MAX_TOKENS,
                awsAiLabelSummaryPrompt: config.AWS_AI_LABEL_SUMMARY_PROMPT,
                now,
                isSeed: true,
            });
        }
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
    try {
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
            return firstPost;
        } else if (postData.size > 1) {
            const [firstPost] = postData.values();
            log.warn(
                `Multiple conversations hold the same slugId: ${firstPost.metadata.conversationSlugId}`,
            );
            return firstPost;
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

        const conversationId = updatedConversationIdResponse[0].conversationId;

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
