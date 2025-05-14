import { log } from "@/app.js";
import {
    opinionContentTable,
    opinionTable,
    opinionModerationTable,
    conversationTable,
    userTable,
    polisContentTable,
    polisClusterTable,
    polisClusterUserTable,
} from "@/schema.js";
import type { GetUserProfileResponse } from "@/shared/types/dto.js";
import type {
    OpinionItem,
    ExtendedOpinion,
    ExtendedConversationPerSlugId,
    ClusterStats,
} from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import { and, eq, lt, desc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { getPostSlugIdLastCreatedAt } from "./feed.js";
import { getCommentSlugIdLastCreatedAt } from "./comment.js";
import { fetchPostBySlugId } from "./post.js";
import { createCommentModerationPropertyObject } from "./moderation.js";
import { alias } from "drizzle-orm/pg-core";
import { toUnionUndefined } from "@/shared/shared.js";
import { getOrganizationNamesByUsername } from "./administrator/organization.js";

interface GetUserCommentsProps {
    db: PostgresJsDatabase;
    userId: string;
    lastCommentSlugId?: string;
    baseImageServiceUrl: string;
}

export async function getUserComments({
    db,
    userId,
    lastCommentSlugId,
    baseImageServiceUrl,
}: GetUserCommentsProps): Promise<ExtendedOpinion[]> {
    try {
        const lastCreatedAt = await getCommentSlugIdLastCreatedAt({
            lastSlugId: lastCommentSlugId,
            db: db,
        });

        const polisClusterTableAlias0 = alias(polisClusterTable, "cluster_0 ");
        const polisClusterTableAlias1 = alias(polisClusterTable, "cluster_1 ");
        const polisClusterTableAlias2 = alias(polisClusterTable, "cluster_2 ");
        const polisClusterTableAlias3 = alias(polisClusterTable, "cluster_3 ");
        const polisClusterTableAlias4 = alias(polisClusterTable, "cluster_4 ");
        const polisClusterTableAlias5 = alias(polisClusterTable, "cluster_5 ");

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
                polisCluster0Id: polisClusterTableAlias0.id,
                polisCluster0Key: polisClusterTableAlias0.key,
                polisCluster0AiLabel: polisClusterTableAlias0.aiLabel,
                polisCluster0NumUsers: polisClusterTableAlias0.numUsers,
                polisCluster0NumAgrees: opinionTable.polisCluster0NumAgrees,
                polisCluster0NumDisagrees:
                    opinionTable.polisCluster0NumDisagrees,
                polisCluster1Id: polisClusterTableAlias1.id,
                polisCluster1Key: polisClusterTableAlias1.key,
                polisCluster1AiLabel: polisClusterTableAlias1.aiLabel,
                polisCluster1NumUsers: polisClusterTableAlias1.numUsers,
                polisCluster1NumAgrees: opinionTable.polisCluster1NumAgrees,
                polisCluster1NumDisagrees:
                    opinionTable.polisCluster1NumDisagrees,
                polisCluster2Id: polisClusterTableAlias2.id,
                polisCluster2Key: polisClusterTableAlias2.key,
                polisCluster2AiLabel: polisClusterTableAlias2.aiLabel,
                polisCluster2NumUsers: polisClusterTableAlias2.numUsers,
                polisCluster2NumAgrees: opinionTable.polisCluster2NumAgrees,
                polisCluster2NumDisagrees:
                    opinionTable.polisCluster2NumDisagrees,
                polisCluster3Id: polisClusterTableAlias3.id,
                polisCluster3Key: polisClusterTableAlias3.key,
                polisCluster3AiLabel: polisClusterTableAlias3.aiLabel,
                polisCluster3NumUsers: polisClusterTableAlias3.numUsers,
                polisCluster3NumAgrees: opinionTable.polisCluster3NumAgrees,
                polisCluster3NumDisagrees:
                    opinionTable.polisCluster3NumDisagrees,
                polisCluster4Id: polisClusterTableAlias4.id,
                polisCluster4Key: polisClusterTableAlias4.key,
                polisCluster4AiLabel: polisClusterTableAlias4.aiLabel,
                polisCluster4NumUsers: polisClusterTableAlias4.numUsers,
                polisCluster4NumAgrees: opinionTable.polisCluster4NumAgrees,
                polisCluster4NumDisagrees:
                    opinionTable.polisCluster4NumDisagrees,
                polisCluster5Id: polisClusterTableAlias5.id,
                polisCluster5Key: polisClusterTableAlias5.key,
                polisCluster5AiLabel: polisClusterTableAlias5.aiLabel,
                polisCluster5NumUsers: polisClusterTableAlias5.numUsers,
                polisCluster5NumAgrees: opinionTable.polisCluster5NumAgrees,
                polisCluster5NumDisagrees:
                    opinionTable.polisCluster5NumDisagrees,
                opinionAuthorPolisClusterId:
                    polisClusterUserTable.polisClusterId,
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
                polisClusterTableAlias0,
                eq(polisClusterTableAlias0.id, opinionTable.polisCluster0Id),
            )
            .leftJoin(
                polisClusterTableAlias1,
                eq(polisClusterTableAlias1.id, opinionTable.polisCluster1Id),
            )
            .leftJoin(
                polisClusterTableAlias2,
                eq(polisClusterTableAlias2.id, opinionTable.polisCluster2Id),
            )
            .leftJoin(
                polisClusterTableAlias3,
                eq(polisClusterTableAlias3.id, opinionTable.polisCluster3Id),
            )
            .leftJoin(
                polisClusterTableAlias4,
                eq(polisClusterTableAlias4.id, opinionTable.polisCluster4Id),
            )
            .leftJoin(
                polisClusterTableAlias5,
                eq(polisClusterTableAlias5.id, opinionTable.polisCluster5Id),
            )
            .leftJoin(
                polisContentTable,
                eq(
                    polisContentTable.id,
                    conversationTable.currentPolisContentId,
                ),
            )
            .leftJoin(
                polisClusterUserTable,
                and(
                    eq(
                        polisClusterUserTable.polisContentId,
                        polisContentTable.id,
                    ),
                    eq(polisClusterUserTable.userId, opinionTable.authorId),
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

        for (const opinionResponse of commentResponseList) {
            const moderationProperties = createCommentModerationPropertyObject(
                opinionResponse.moderationAction,
                opinionResponse.moderationExplanation,
                opinionResponse.moderationReason,
                opinionResponse.moderationCreatedAt,
                opinionResponse.moderationUpdatedAt,
            );

            const clustersStats: ClusterStats[] = [];
            if (
                opinionResponse.polisCluster0Key !== null &&
                opinionResponse.polisCluster0NumUsers !== null &&
                opinionResponse.polisCluster0NumAgrees !== null &&
                opinionResponse.polisCluster0NumDisagrees !== null
            ) {
                clustersStats.push({
                    key: opinionResponse.polisCluster0Key,
                    aiLabel: toUnionUndefined(
                        opinionResponse.polisCluster0AiLabel,
                    ),
                    isAuthorInCluster:
                        opinionResponse.opinionAuthorPolisClusterId ===
                        opinionResponse.polisCluster0Id,
                    numUsers: opinionResponse.polisCluster0NumUsers,
                    numAgrees: opinionResponse.polisCluster0NumAgrees,
                    numDisagrees: opinionResponse.polisCluster0NumDisagrees,
                });
            }
            if (
                opinionResponse.polisCluster1Key !== null &&
                opinionResponse.polisCluster1NumUsers !== null &&
                opinionResponse.polisCluster1NumAgrees !== null &&
                opinionResponse.polisCluster1NumDisagrees !== null
            ) {
                clustersStats.push({
                    key: opinionResponse.polisCluster1Key,
                    aiLabel: toUnionUndefined(
                        opinionResponse.polisCluster1AiLabel,
                    ),
                    isAuthorInCluster:
                        opinionResponse.opinionAuthorPolisClusterId ===
                        opinionResponse.polisCluster1Id,
                    numUsers: opinionResponse.polisCluster1NumUsers,
                    numAgrees: opinionResponse.polisCluster1NumAgrees,
                    numDisagrees: opinionResponse.polisCluster1NumDisagrees,
                });
            }
            if (
                opinionResponse.polisCluster2Key !== null &&
                opinionResponse.polisCluster2NumUsers !== null &&
                opinionResponse.polisCluster2NumAgrees !== null &&
                opinionResponse.polisCluster2NumDisagrees !== null
            ) {
                clustersStats.push({
                    key: opinionResponse.polisCluster2Key,
                    aiLabel: toUnionUndefined(
                        opinionResponse.polisCluster2AiLabel,
                    ),
                    isAuthorInCluster:
                        opinionResponse.opinionAuthorPolisClusterId ===
                        opinionResponse.polisCluster2Id,
                    numUsers: opinionResponse.polisCluster2NumUsers,
                    numAgrees: opinionResponse.polisCluster2NumAgrees,
                    numDisagrees: opinionResponse.polisCluster2NumDisagrees,
                });
            }
            if (
                opinionResponse.polisCluster3Key !== null &&
                opinionResponse.polisCluster3NumUsers !== null &&
                opinionResponse.polisCluster3NumAgrees !== null &&
                opinionResponse.polisCluster3NumDisagrees !== null
            ) {
                clustersStats.push({
                    key: opinionResponse.polisCluster3Key,
                    aiLabel: toUnionUndefined(
                        opinionResponse.polisCluster3AiLabel,
                    ),
                    isAuthorInCluster:
                        opinionResponse.opinionAuthorPolisClusterId ===
                        opinionResponse.polisCluster3Id,
                    numUsers: opinionResponse.polisCluster3NumUsers,
                    numAgrees: opinionResponse.polisCluster3NumAgrees,
                    numDisagrees: opinionResponse.polisCluster3NumDisagrees,
                });
            }
            if (
                opinionResponse.polisCluster4Key !== null &&
                opinionResponse.polisCluster4NumUsers !== null &&
                opinionResponse.polisCluster4NumAgrees !== null &&
                opinionResponse.polisCluster4NumDisagrees !== null
            ) {
                clustersStats.push({
                    key: opinionResponse.polisCluster4Key,
                    aiLabel: toUnionUndefined(
                        opinionResponse.polisCluster4AiLabel,
                    ),
                    isAuthorInCluster:
                        opinionResponse.opinionAuthorPolisClusterId ===
                        opinionResponse.polisCluster4Id,
                    numUsers: opinionResponse.polisCluster4NumUsers,
                    numAgrees: opinionResponse.polisCluster4NumAgrees,
                    numDisagrees: opinionResponse.polisCluster4NumDisagrees,
                });
            }
            if (
                opinionResponse.polisCluster5Key !== null &&
                opinionResponse.polisCluster5NumUsers !== null &&
                opinionResponse.polisCluster5NumAgrees !== null &&
                opinionResponse.polisCluster5NumDisagrees !== null
            ) {
                clustersStats.push({
                    key: opinionResponse.polisCluster5Key,
                    aiLabel: toUnionUndefined(
                        opinionResponse.polisCluster5AiLabel,
                    ),
                    isAuthorInCluster:
                        opinionResponse.opinionAuthorPolisClusterId ===
                        opinionResponse.polisCluster5Id,
                    numUsers: opinionResponse.polisCluster5NumUsers,
                    numAgrees: opinionResponse.polisCluster5NumAgrees,
                    numDisagrees: opinionResponse.polisCluster5NumDisagrees,
                });
            }

            const commentItem: OpinionItem = {
                opinion: opinionResponse.comment,
                opinionSlugId: opinionResponse.commentSlugId,
                createdAt: opinionResponse.createdAt,
                updatedAt: opinionResponse.updatedAt,
                numParticipants: opinionResponse.numParticipants,
                numDisagrees: opinionResponse.numDisagrees,
                numAgrees: opinionResponse.numAgrees,
                username: opinionResponse.username,
                moderation: moderationProperties,
                clustersStats: clustersStats,
            };

            const postItem = await fetchPostBySlugId({
                db: db,
                conversationSlugId: opinionResponse.postSlugId,
                personalizedUserId: undefined,
                baseImageServiceUrl,
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
    baseImageServiceUrl: string;
}

export async function getUserPosts({
    db,
    userId,
    lastPostSlugId,
    baseImageServiceUrl,
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
                baseImageServiceUrl,
                sortAlgorithm: "new",
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
            const organizationNamesResponse =
                await getOrganizationNamesByUsername({
                    db: db,
                    username: userTableResponse[0].username,
                });

            return {
                activePostCount: userTableResponse[0].activePostCount,
                createdAt: userTableResponse[0].createdAt,
                username: userTableResponse[0].username,
                isModerator: userTableResponse[0].isModerator,
                organizationList:
                    organizationNamesResponse.organizationNameList,
            };
        }
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while fetching user profile",
        );
    }
}
