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
    voteTable,
} from "@/shared-backend/schema.js";
import type { GetUserProfileResponse } from "@/shared/types/dto.js";
import type {
    OpinionItem,
    ExtendedOpinion,
    ExtendedConversationPerSlugId,
    ClusterStats,
    ExtendedOpinionWithConvId,
} from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import { and, eq, lt, desc, inArray, isNotNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { getPostSlugIdLastCreatedAt } from "./feed.js";
import { getCommentSlugIdLastCreatedAt } from "./comment.js";
import { fetchPostBySlugId } from "./post.js";
import { createCommentModerationPropertyObject } from "./moderation.js";
import { alias } from "drizzle-orm/pg-core";
import { toUnionUndefined } from "@/shared/shared.js";
import { getOrganizationsByUsername } from "./administrator/organization.js";
import type { ImportPolisResults } from "@/shared/types/polis.js";
import { generateUUID } from "@/crypto.js";
import type { UserIdPerParticipantId } from "@/utils/dataStructure.js";

interface GetAllUserCommentsProps {
    db: PostgresJsDatabase;
    userId: string;
    baseImageServiceUrl: string;
}

interface GetUserCommentsProps {
    db: PostgresJsDatabase;
    userId: string;
    lastCommentSlugId?: string;
    baseImageServiceUrl: string;
    limit?: number;
}

export async function getAllUserComments({
    db,
    userId,
    baseImageServiceUrl,
}: GetAllUserCommentsProps): Promise<ExtendedOpinionWithConvId[]> {
    const userComments = await getUserComments({
        db,
        userId,
        baseImageServiceUrl,
    });
    return userComments;
}

export async function getFilteredUserComments({
    db,
    userId,
    lastCommentSlugId,
    baseImageServiceUrl,
    limit,
}: GetUserCommentsProps): Promise<ExtendedOpinion[]> {
    const userComments = await getUserComments({
        db,
        userId,
        lastCommentSlugId,
        baseImageServiceUrl,
        limit,
    });
    const newComments: ExtendedOpinion[] = userComments.map((userComment) => {
        const { conversationData } = userComment;
        const { metadata } = conversationData;
        const { conversationId: _conversationId, ...restMetadata } = metadata;

        return {
            ...userComment,
            conversationData: {
                ...conversationData,
                metadata: restMetadata,
            },
        };
    });
    return newComments;
}

export async function getUserComments({
    db,
    userId,
    lastCommentSlugId,
    baseImageServiceUrl,
    limit,
}: GetUserCommentsProps): Promise<ExtendedOpinionWithConvId[]> {
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
        const preparedQuery = db
            .select({
                commentSlugId: opinionTable.slugId,
                createdAt: opinionTable.createdAt,
                updatedAt: opinionTable.updatedAt,
                comment: opinionContentTable.content,
                numParticipants: conversationTable.participantCount,
                numAgrees: opinionTable.numAgrees,
                numDisagrees: opinionTable.numDisagrees,
                numPasses: opinionTable.numPasses,
                username: userTable.username,
                postId: conversationTable.id,
                postSlugId: conversationTable.slugId,
                isSeed: opinionTable.isSeed,
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
                polisCluster0NumPasses: opinionTable.polisCluster0NumPasses,
                polisCluster1Id: polisClusterTableAlias1.id,
                polisCluster1Key: polisClusterTableAlias1.key,
                polisCluster1AiLabel: polisClusterTableAlias1.aiLabel,
                polisCluster1NumUsers: polisClusterTableAlias1.numUsers,
                polisCluster1NumAgrees: opinionTable.polisCluster1NumAgrees,
                polisCluster1NumDisagrees:
                    opinionTable.polisCluster1NumDisagrees,
                polisCluster1NumPasses: opinionTable.polisCluster1NumPasses,
                polisCluster2Id: polisClusterTableAlias2.id,
                polisCluster2Key: polisClusterTableAlias2.key,
                polisCluster2AiLabel: polisClusterTableAlias2.aiLabel,
                polisCluster2NumUsers: polisClusterTableAlias2.numUsers,
                polisCluster2NumAgrees: opinionTable.polisCluster2NumAgrees,
                polisCluster2NumDisagrees:
                    opinionTable.polisCluster2NumDisagrees,
                polisCluster2NumPasses: opinionTable.polisCluster2NumPasses,
                polisCluster3Id: polisClusterTableAlias3.id,
                polisCluster3Key: polisClusterTableAlias3.key,
                polisCluster3AiLabel: polisClusterTableAlias3.aiLabel,
                polisCluster3NumUsers: polisClusterTableAlias3.numUsers,
                polisCluster3NumAgrees: opinionTable.polisCluster3NumAgrees,
                polisCluster3NumDisagrees:
                    opinionTable.polisCluster3NumDisagrees,
                polisCluster3NumPasses: opinionTable.polisCluster3NumPasses,
                polisCluster4Id: polisClusterTableAlias4.id,
                polisCluster4Key: polisClusterTableAlias4.key,
                polisCluster4AiLabel: polisClusterTableAlias4.aiLabel,
                polisCluster4NumUsers: polisClusterTableAlias4.numUsers,
                polisCluster4NumAgrees: opinionTable.polisCluster4NumAgrees,
                polisCluster4NumDisagrees:
                    opinionTable.polisCluster4NumDisagrees,
                polisCluster4NumPasses: opinionTable.polisCluster4NumPasses,
                polisCluster5Id: polisClusterTableAlias5.id,
                polisCluster5Key: polisClusterTableAlias5.key,
                polisCluster5AiLabel: polisClusterTableAlias5.aiLabel,
                polisCluster5NumUsers: polisClusterTableAlias5.numUsers,
                polisCluster5NumAgrees: opinionTable.polisCluster5NumAgrees,
                polisCluster5NumDisagrees:
                    opinionTable.polisCluster5NumDisagrees,
                polisCluster5NumPasses: opinionTable.polisCluster5NumPasses,
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
                lastCreatedAt !== undefined
                    ? and(
                          eq(opinionTable.authorId, userId),
                          lt(opinionTable.createdAt, lastCreatedAt),
                      )
                    : eq(opinionTable.authorId, userId),
            )
            .orderBy(desc(opinionTable.createdAt));

        const commentResponseList =
            limit !== undefined
                ? await preparedQuery.$dynamic().limit(limit)
                : await preparedQuery;

        const extendedCommentList: ExtendedOpinionWithConvId[] = [];

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
                opinionResponse.polisCluster0NumDisagrees !== null &&
                opinionResponse.polisCluster0NumPasses !== null
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
                    numPasses: opinionResponse.polisCluster0NumPasses,
                });
            }
            if (
                opinionResponse.polisCluster1Key !== null &&
                opinionResponse.polisCluster1NumUsers !== null &&
                opinionResponse.polisCluster1NumAgrees !== null &&
                opinionResponse.polisCluster1NumDisagrees !== null &&
                opinionResponse.polisCluster1NumPasses !== null
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
                    numPasses: opinionResponse.polisCluster1NumPasses,
                });
            }
            if (
                opinionResponse.polisCluster2Key !== null &&
                opinionResponse.polisCluster2NumUsers !== null &&
                opinionResponse.polisCluster2NumAgrees !== null &&
                opinionResponse.polisCluster2NumDisagrees !== null &&
                opinionResponse.polisCluster2NumPasses !== null
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
                    numPasses: opinionResponse.polisCluster2NumPasses,
                });
            }
            if (
                opinionResponse.polisCluster3Key !== null &&
                opinionResponse.polisCluster3NumUsers !== null &&
                opinionResponse.polisCluster3NumAgrees !== null &&
                opinionResponse.polisCluster3NumDisagrees !== null &&
                opinionResponse.polisCluster3NumPasses !== null
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
                    numPasses: opinionResponse.polisCluster3NumPasses,
                });
            }
            if (
                opinionResponse.polisCluster4Key !== null &&
                opinionResponse.polisCluster4NumUsers !== null &&
                opinionResponse.polisCluster4NumAgrees !== null &&
                opinionResponse.polisCluster4NumDisagrees !== null &&
                opinionResponse.polisCluster4NumPasses !== null
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
                    numPasses: opinionResponse.polisCluster4NumPasses,
                });
            }
            if (
                opinionResponse.polisCluster5Key !== null &&
                opinionResponse.polisCluster5NumUsers !== null &&
                opinionResponse.polisCluster5NumAgrees !== null &&
                opinionResponse.polisCluster5NumDisagrees !== null &&
                opinionResponse.polisCluster5NumPasses !== null
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
                    numPasses: opinionResponse.polisCluster5NumPasses,
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
                numPasses: opinionResponse.numPasses,
                username: opinionResponse.username,
                moderation: moderationProperties,
                isSeed: opinionResponse.isSeed,
                clustersStats: clustersStats,
            };

            const postItem = await fetchPostBySlugId({
                db: db,
                conversationSlugId: opinionResponse.postSlugId,
                personalizedUserId: undefined,
                baseImageServiceUrl,
            });
            const extendedCommentItem: ExtendedOpinionWithConvId = {
                opinionItem: commentItem,
                conversationData: {
                    ...postItem,
                    metadata: {
                        ...postItem.metadata,
                        conversationId: opinionResponse.postId,
                    },
                },
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
    limit?: number;
}

export async function getUserPosts({
    db,
    userId,
    lastPostSlugId,
    baseImageServiceUrl,
    limit,
}: GetUserPostProps): Promise<ExtendedConversationPerSlugId> {
    try {
        const { fetchPostItems } = useCommonPost();

        const lastCreatedAt = await getPostSlugIdLastCreatedAt({
            lastSlugId: lastPostSlugId,
            db: db,
        });

        const whereClause =
            lastCreatedAt !== undefined
                ? and(
                      eq(conversationTable.authorId, userId),
                      lt(conversationTable.createdAt, lastCreatedAt),
                  )
                : eq(conversationTable.authorId, userId);

        const conversations: ExtendedConversationPerSlugId =
            await fetchPostItems({
                db: db,
                limit: limit,
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

export async function getUserVotes({
    db,
    userId,
    limit,
}: {
    db: PostgresJsDatabase;
    userId: string;
    limit?: number;
}): Promise<
    {
        opinionSlugId: string;
        voteId: number;
        conversationId: number;
        conversationSlugId: string;
    }[]
> {
    // What's the point of deleting only an arbitrary subset of votes?
    const preparedQuery = db
        .select({
            opinionSlugId: opinionTable.slugId,
            voteId: voteTable.id,
            conversationId: conversationTable.id,
            conversationSlugId: conversationTable.slugId,
        })
        .from(voteTable)
        .innerJoin(userTable, eq(userTable.id, voteTable.authorId))
        .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
        .innerJoin(
            conversationTable,
            eq(opinionTable.conversationId, conversationTable.id),
        )
        .where(
            and(
                eq(voteTable.authorId, userId),
                isNotNull(voteTable.currentContentId), // already deleted votes don't need to be re-deleted, nor should they be displayed
                // votes that were cast on deleted opinions will be deleted via cascade delete later
                // and they are already ignored for counts, so we don't cancel them
                isNotNull(opinionTable.currentContentId),
            ),
        );
    const results =
        limit !== undefined
            ? await preparedQuery.$dynamic().limit(limit)
            : await preparedQuery;
    return results;
}

interface GetUserProfileProps {
    db: PostgresJsDatabase;
    userId: string;
    baseImageServiceUrl: string;
}

interface GetUserIdByPolisParticipantIdsProps {
    db: PostgresJsDatabase;
    polisParticipantIds: number[];
}

export async function getUserProfile({
    db,
    userId,
    baseImageServiceUrl,
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
            const organizationNamesResponse = await getOrganizationsByUsername({
                db: db,
                username: userTableResponse[0].username,
                baseImageServiceUrl,
            });

            return {
                activePostCount: userTableResponse[0].activePostCount,
                createdAt: userTableResponse[0].createdAt,
                username: userTableResponse[0].username,
                isModerator: userTableResponse[0].isModerator,
                organizationList: organizationNamesResponse.organizationList,
            };
        }
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Database error while fetching user profile",
        );
    }
}

export async function getUserIdByPolisParticipantIds({
    db,
    polisParticipantIds,
}: GetUserIdByPolisParticipantIdsProps): Promise<Record<number, string>> {
    // key == polisUid, value == userId
    const results = await db
        .select({
            userId: userTable.id,
            polisParticipantId: userTable.polisParticipantId,
        })
        .from(userTable)
        .where(inArray(userTable.polisParticipantId, polisParticipantIds));

    const userIdMap: Record<number, string> = {};
    for (const row of results) {
        userIdMap[row.polisParticipantId] = row.userId;
    }

    return userIdMap;
}

interface ParticipantData {
    userIdPerParticipantId: UserIdPerParticipantId;
    participantCount: number;
    voteCount: number;
    opinionCount: number;
}

export async function bulkInsertUsersFromExternalPolisConvo({
    db,
    importedPolisConversation,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    importedPolisConversation: ImportPolisResults;
    conversationSlugId: string;
}): Promise<ParticipantData> {
    const participantIdsFromComments =
        importedPolisConversation.comments_data.map(
            (comment) => comment.participant_id,
        );
    const participantIdsFromVotes = importedPolisConversation.votes_data.map(
        (vote) => vote.participant_id,
    );
    const participantIds = Array.from(
        new Set([...participantIdsFromComments, ...participantIdsFromVotes]),
    );

    const userIdPerParticipantId: Record<number, string> = {};

    const users = participantIds.map((participantId) => {
        const userId = generateUUID();
        userIdPerParticipantId[participantId] = userId;
        return {
            id: userId,
            username: `ext_${conversationSlugId}_${String(participantId)}`,
            isImported: true,
        };
    });
    await db.insert(userTable).values(users);

    const moderatedStatementIds = importedPolisConversation.comments_data
        .filter((comment) => comment.moderated === -1)
        .map((comment) => comment.statement_id);
    const participantIdsFromVotesToUnmoderatedComments =
        importedPolisConversation.votes_data
            .filter(
                (vote) => !moderatedStatementIds.includes(vote.statement_id),
            )
            .map((vote) => vote.participant_id);

    // we assume there are not duplicate votes (edits)
    const voteCount = participantIdsFromVotesToUnmoderatedComments.length;
    const opinionCount =
        importedPolisConversation.comments_data.length -
        moderatedStatementIds.length;
    const participantCount = new Set(
        participantIdsFromVotesToUnmoderatedComments,
    ).size;
    if (
        participantCount !==
        importedPolisConversation.conversation_data.participant_count
    ) {
        const participantIdsFromAllVotes =
            importedPolisConversation.votes_data.map(
                (vote) => vote.participant_id,
            );

        const participantCountForAllVotes = new Set(participantIdsFromAllVotes)
            .size;
        log.warn(
            `[Import] Calculated participantCount=${String(participantCount)} but Polis returned ${String(importedPolisConversation.conversation_data.participant_count)}. ParticipantCountIncludingModerated=${String(participantCountForAllVotes)}`,
        );
    }
    return {
        userIdPerParticipantId,
        participantCount: participantCount,
        voteCount: voteCount,
        opinionCount: opinionCount,
    };
}
