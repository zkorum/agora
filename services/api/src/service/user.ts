import { log } from "@/app.js";
import {
    opinionContentTable,
    opinionTable,
    opinionModerationTable,
    conversationTable,
    userTable,
    voteTable,
    eventTicketTable,
} from "@/shared-backend/schema.js";
import type { GetUserProfileResponse } from "@/shared/types/dto.js";
import type {
    OpinionItem,
    ExtendedOpinion,
    ExtendedConversationPerSlugId,
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
import { getOrganizationsByUsername } from "./administrator/organization.js";
import type { ImportPolisResults } from "@/shared/types/polis.js";
import { generateUUID } from "@/crypto.js";
import type { UserIdPerParticipantId } from "@/utils/dataStructure.js";
import { alias } from "drizzle-orm/pg-core";

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

        // Fetch a list of comment IDs first
        const conversationAuthorTable = alias(userTable, "conversationAuthor");

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
            .innerJoin(
                conversationAuthorTable,
                eq(conversationAuthorTable.id, conversationTable.authorId),
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
                          eq(conversationAuthorTable.isDeleted, false),
                      )
                    : and(
                          eq(opinionTable.authorId, userId),
                          eq(conversationAuthorTable.isDeleted, false),
                      ),
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

            // Fetch verified event tickets for this user
            const ticketsResponse = await db
                .select({
                    eventSlug: eventTicketTable.eventSlug,
                })
                .from(eventTicketTable)
                .where(
                    and(
                        eq(eventTicketTable.userId, userId),
                        eq(eventTicketTable.isDeleted, false),
                    ),
                );

            const verifiedEventTickets = ticketsResponse.map(
                (row) => row.eventSlug,
            );

            return {
                activePostCount: userTableResponse[0].activePostCount,
                createdAt: userTableResponse[0].createdAt,
                username: userTableResponse[0].username,
                isModerator: userTableResponse[0].isModerator,
                organizationList: organizationNamesResponse.organizationList,
                verifiedEventTickets: verifiedEventTickets,
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
