import { log } from "@/app.js";
import {
    opinionContentTable,
    opinionTable,
    opinionModerationTable,
    conversationTable,
    userTable,
    polisContentTable,
    polisClusterTable,
    polisClusterOpinionTable,
} from "@/schema.js";
import type { GetUserProfileResponse } from "@/shared/types/dto.js";
import type {
    OpinionItem,
    ExtendedOpinion,
    ExtendedConversationPerSlugId,
} from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import { and, eq, lt, desc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { getPostSlugIdLastCreatedAt } from "./feed.js";
import { getCommentSlugIdLastCreatedAt } from "./comment.js";
import { fetchPostBySlugId } from "./post.js";
import { createCommentModerationPropertyObject } from "./moderation.js";

interface GetUserCommentsProps {
    db: PostgresJsDatabase;
    userId: string;
    lastCommentSlugId?: string;
}

export async function getUserComments({
    db,
    userId,
    lastCommentSlugId,
}: GetUserCommentsProps): Promise<ExtendedOpinion[]> {
    try {
        const lastCreatedAt = await getCommentSlugIdLastCreatedAt({
            lastSlugId: lastCommentSlugId,
            db: db,
        });

        // Fetch a list of comment IDs first
        const commentResponseList = await db
            .select({
                commentSlugId: opinionTable.slugId,
                createdAt: opinionTable.createdAt,
                updatedAt: opinionTable.updatedAt,
                comment: opinionContentTable.content,
                numParticipants: conversationTable.participantCount,
                numAgrees: opinionTable.numAgrees,
                numDisagrees: opinionTable.numDisagrees,
                username: userTable.username,
                postSlugId: conversationTable.slugId,
                moderationAction: opinionModerationTable.moderationAction,
                moderationExplanation:
                    opinionModerationTable.moderationExplanation,
                moderationReason: opinionModerationTable.moderationReason,
                moderationCreatedAt: opinionModerationTable.createdAt,
                moderationUpdatedAt: opinionModerationTable.updatedAt,
            })
            .from(opinionTable)
            .innerJoin(
                opinionContentTable,
                eq(opinionContentTable.id, opinionTable.currentContentId),
            )
            .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
            .innerJoin(
                conversationTable,
                eq(conversationTable.id, opinionTable.conversationId),
            )
            .leftJoin(
                // must not be innerJoin because at the beginning there is no polisContent!
                polisContentTable,
                eq(
                    polisContentTable.id,
                    conversationTable.currentPolisContentId,
                ),
            )
            .leftJoin(
                polisClusterTable,
                eq(polisClusterTable.polisContentId, polisContentTable.id),
            )
            .leftJoin(
                polisClusterOpinionTable, // TODO: improve that

                eq(
                    polisClusterOpinionTable.polisClusterId,
                    polisClusterTable.id,
                ),
            )
            .leftJoin(
                opinionModerationTable,
                eq(opinionModerationTable.opinionId, opinionTable.id),
            )
            .where(
                and(
                    eq(opinionTable.authorId, userId),
                    lt(opinionTable.createdAt, lastCreatedAt),
                ),
            )
            .orderBy(desc(opinionTable.createdAt))
            .limit(10);

        const extendedCommentList: ExtendedOpinion[] = [];

        for (const commentResponse of commentResponseList) {
            const moderationProperties = createCommentModerationPropertyObject(
                commentResponse.moderationAction,
                commentResponse.moderationExplanation,
                commentResponse.moderationReason,
                commentResponse.moderationCreatedAt,
                commentResponse.moderationUpdatedAt,
            );

            const commentItem: OpinionItem = {
                opinion: commentResponse.comment,
                opinionSlugId: commentResponse.commentSlugId,
                createdAt: commentResponse.createdAt,
                updatedAt: commentResponse.updatedAt,
                numParticipants: commentResponse.numParticipants,
                numDisagrees: commentResponse.numDisagrees,
                numAgrees: commentResponse.numAgrees,
                username: commentResponse.username,
                moderation: moderationProperties,
                clustersStats: [], //TODO: change this!
            };

            const postItem = await fetchPostBySlugId({
                db: db,
                conversationSlugId: commentResponse.postSlugId,
                personalizedUserId: undefined,
            });

            const extendedCommentItem: ExtendedOpinion = {
                opinionItem: commentItem,
                conversationData: postItem,
            };

            extendedCommentList.push(extendedCommentItem);
        }

        return extendedCommentList;
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while fetching user comments",
        );
    }
}

interface GetUserPostProps {
    db: PostgresJsDatabase;
    userId: string;
    lastPostSlugId?: string;
}

export async function getUserPosts({
    db,
    userId,
    lastPostSlugId,
}: GetUserPostProps): Promise<ExtendedConversationPerSlugId> {
    try {
        const { fetchPostItems } = useCommonPost();

        const lastCreatedAt = await getPostSlugIdLastCreatedAt({
            lastSlugId: lastPostSlugId,
            db: db,
        });

        const whereClause = and(
            eq(conversationTable.authorId, userId),
            lt(conversationTable.createdAt, lastCreatedAt),
        );

        const conversations: ExtendedConversationPerSlugId =
            await fetchPostItems({
                db: db,
                limit: 10,
                where: whereClause,
                enableCompactBody: true,
                personalizedUserId: userId,
                excludeLockedPosts: false,
                removeMutedAuthors: false,
            });

        return conversations;
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while fetching user posts",
        );
    }
}

interface GetUserProfileProps {
    db: PostgresJsDatabase;
    userId: string;
}

export async function getUserProfile({
    db,
    userId,
}: GetUserProfileProps): Promise<GetUserProfileResponse> {
    try {
        const userTableResponse = await db
            .select({
                activePostCount: userTable.activeConversationCount,
                createdAt: userTable.createdAt,
                username: userTable.username,
                isModerator: userTable.isModerator,
            })
            .from(userTable)
            .where(eq(userTable.id, userId));

        if (userTableResponse.length == 0) {
            throw httpErrors.notFound("Failed to locate user profile");
        } else {
            return {
                activePostCount: userTableResponse[0].activePostCount,
                createdAt: userTableResponse[0].createdAt,
                username: userTableResponse[0].username,
                isModerator: userTableResponse[0].isModerator,
            };
        }
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while fetching user profile",
        );
    }
}
