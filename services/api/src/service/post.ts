// Interact with a post
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    commentTable,
    pollTable,
    postContentTable,
    postProofTable,
    postTable,
    userTable,
} from "@/schema.js";
import { eq, sql, and } from "drizzle-orm";
import type { CreateNewPostResponse } from "@/shared/types/dto.js";
import { MAX_LENGTH_BODY } from "@/shared/shared.js";
import { generateRandomSlugId } from "@/crypto.js";
import { log } from "@/app.js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import { sanitizeHtmlBody } from "@/utils/htmlSanitization.js";
import type { ExtendedPost } from "@/shared/types/zod.js";

interface CreateNewPostProps {
    db: PostgresDatabase;
    postTitle: string;
    postBody: string | null;
    pollingOptionList: string[] | null;
    authorId: string;
    didWrite: string;
    authHeader: string;
}

export async function createNewPost({
    db,
    postTitle,
    postBody,
    authorId,
    didWrite,
    authHeader,
    pollingOptionList,
}: CreateNewPostProps): Promise<CreateNewPostResponse> {
    try {
        const postSlugId = generateRandomSlugId();

        if (postBody != null) {
            try {
                postBody = sanitizeHtmlBody(postBody, MAX_LENGTH_BODY);
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
                .insert(postTable)
                .values({
                    authorId: authorId,
                    slugId: postSlugId,
                    commentCount: 0,
                    currentContentId: null,
                    lastReactedAt: new Date(),
                })
                .returning({ postId: postTable.id });

            const postId = insertPostResponse[0].postId;

            const masterProofTableResponse = await tx
                .insert(postProofTable)
                .values({
                    type: "creation",
                    postId: postId,
                    authorDid: didWrite,
                    proof: authHeader,
                    proofVersion: 1,
                })
                .returning({ proofId: postProofTable.id });

            const proofId = masterProofTableResponse[0].proofId;

            const postContentTableResponse = await tx
                .insert(postContentTable)
                .values({
                    postProofId: proofId,
                    postId: postId,
                    parentId: null,
                    title: postTitle,
                    body: postBody,
                    pollId: null,
                })
                .returning({ postContentId: postContentTable.id });

            const postContentId = postContentTableResponse[0].postContentId;

            await tx
                .update(postTable)
                .set({
                    currentContentId: postContentId,
                })
                .where(eq(postTable.id, postId));

            if (pollingOptionList != null) {
                await tx.insert(pollTable).values({
                    postContentId: postContentId,
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

            // Update the user profile's post count
            await tx
                .update(userTable)
                .set({
                    activePostCount: sql`${userTable.activePostCount} + 1`,
                    totalPostCount: sql`${userTable.totalPostCount} + 1`,
                })
                .where(eq(userTable.id, authorId));
        });

        return {
            postSlugId: postSlugId,
        };
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while creating the new post",
        );
    }
}

interface FetchPostBySlugIdProps {
    db: PostgresDatabase;
    postSlugId: string;
    personalizationUserId?: string;
}

export async function fetchPostBySlugId({
    db,
    postSlugId,
    personalizationUserId,
}: FetchPostBySlugIdProps): Promise<ExtendedPost> {
    try {
        const { fetchPostItems } = useCommonPost();
        const postData = await fetchPostItems({
            db: db,
            limit: 1,
            where: eq(postTable.slugId, postSlugId),
            enableCompactBody: false,
            personalizationUserId: personalizationUserId,
            excludeLockedPosts: false,
        });

        if (postData.length == 1) {
            return postData[0];
        } else {
            throw httpErrors.notFound(
                "Failed to locate post slug ID in the database: " + postSlugId,
            );
        }
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Failed to fetch post by slug ID: " + postSlugId,
        );
    }
}

interface DeletePostBySlugIdProps {
    db: PostgresDatabase;
    postSlugId: string;
    userId: string;
    authHeader: string;
    didWrite: string;
}

export async function deletePostBySlugId({
    db,
    postSlugId,
    userId,
    authHeader,
    didWrite,
}: DeletePostBySlugIdProps): Promise<void> {
    try {
        await db.transaction(async (tx) => {
            // Delete the post
            const updatedPostIdResponse = await tx
                .update(postTable)
                .set({
                    currentContentId: null,
                })
                .where(
                    and(
                        eq(postTable.authorId, userId),
                        eq(postTable.slugId, postSlugId),
                    ),
                )
                .returning({ postId: postTable.id });

            if (updatedPostIdResponse.length != 1) {
                tx.rollback();
            }

            const postId = updatedPostIdResponse[0].postId;

            // Update the user's active post count
            await tx
                .update(userTable)
                .set({
                    activePostCount: sql`${userTable.activePostCount} - 1`,
                })
                .where(eq(userTable.id, userId));

            // Create the delete proof
            await tx
                .insert(postProofTable)
                .values({
                    type: "deletion",
                    postId: postId,
                    authorDid: didWrite,
                    proof: authHeader,
                    proofVersion: 1,
                })
                .returning({ proofId: postProofTable.id });

            // Mark all of the comments as deleted
            await tx
                .update(commentTable)
                .set({
                    currentContentId: null,
                })
                .where(eq(commentTable.postId, postId));
        });
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Failed to delete post by slug ID: " + postSlugId,
        );
    }
}
