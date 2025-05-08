import {
    conversationContentTable,
    pollTable,
    conversationTable,
    userTable,
    opinionTable,
    conversationModerationTable,
    polisContentTable,
    polisClusterTable,
    organizationTable,
    voteTable,
} from "@/schema.js";
import { toUnionUndefined } from "@/shared/shared.js";
import type {
    ConversationMetadata,
    ExtendedConversationPayload,
    PollOptionWithResult,
    ExtendedConversationPolis,
    ExtendedConversationPerSlugId,
    ExtendedConversation,
} from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import { eq, desc, SQL, and, count } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import sanitizeHtml from "sanitize-html";
import { getUserPollResponse } from "./poll.js";
import { createPostModerationPropertyObject } from "./moderation.js";
import { getUserMutePreferences } from "./muteUser.js";
import { alias } from "drizzle-orm/pg-core";
import * as polisService from "@/service/polis.js";
import type { ClusterMetadata } from "@/shared/types/zod.js";
import { imagePathToUrl } from "@/utils/organizationLogic.js";

export function useCommonUser() {
    interface GetUserIdFromUsernameProps {
        db: PostgresJsDatabase;
        username: string;
    }

    async function getUserIdFromUsername({
        db,
        username,
    }: GetUserIdFromUsernameProps) {
        const userTableResponse = await db
            .select({ userId: userTable.id })
            .from(userTable)
            .where(eq(userTable.username, username));

        if (userTableResponse.length == 1) {
            return userTableResponse[0].userId;
        } else {
            throw httpErrors.notFound(
                "Failed to locate user by username: " + username,
            );
        }
    }

    return { getUserIdFromUsername };
}

export function useCommonPost() {
    interface IsPostSlugIdLockedProps {
        db: PostgresJsDatabase;
        postSlugId: string;
    }
    async function getParticipantCountBypassCache({
        db,
        conversationId,
    }: {
        db: PostgresJsDatabase;
        conversationId: number;
    }): Promise<number> {
        // TODO: optimize this
        const voteResponse = await db
            .select({ authorId: voteTable.authorId })
            .from(voteTable)
            .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
            .where(eq(opinionTable.conversationId, conversationId));
        // this is not necessary normally since every opinion author are necessarily voting "agree"
        // and opinion author are not participants unless they vote...
        // TODO: remove this once we move to external polis and update the old convos
        const opinionResponse = await db
            .select({ authorId: opinionTable.authorId })
            .from(opinionTable)
            .where(eq(opinionTable.conversationId, conversationId));
        const participantCount = new Set(
            voteResponse
                .map((voteVal) => voteVal.authorId)
                .concat(
                    opinionResponse.map((opinionVal) => opinionVal.authorId),
                ),
        ).size;
        // const participantResults = await db
        //     .select({ count: count() })
        //     .from(participantTable)
        //     .where(eq(participantTable.conversationId, conversationId));

        return participantCount;
    }

    async function getVoteCountBypassCache({
        db,
        conversationId,
        userId,
    }: {
        db: PostgresJsDatabase;
        conversationId: number;
        userId?: string;
    }): Promise<number> {
        let whereClause;
        if (userId !== undefined) {
            whereClause = and(
                eq(voteTable.authorId, userId),
                eq(opinionTable.conversationId, conversationId),
            );
        } else {
            whereClause = and(eq(opinionTable.conversationId, conversationId));
        }
        const voteResponse = await db
            .select({ count: count() })
            .from(voteTable)
            .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
            .where(whereClause);

        const voteCount = voteResponse.length === 0 ? 0 : voteResponse[0].count;
        return voteCount;
    }

    async function getOpinionCountBypassCache({
        db,
        conversationId,
        userId,
    }: {
        db: PostgresJsDatabase;
        conversationId: number;
        userId?: string;
    }): Promise<number> {
        let whereClause;
        if (userId !== undefined) {
            whereClause = and(
                eq(opinionTable.authorId, userId),
                eq(opinionTable.conversationId, conversationId),
            );
        } else {
            whereClause = and(eq(opinionTable.conversationId, conversationId));
        }
        const opinionResponse = await db
            .select({ count: count() })
            .from(opinionTable)
            .where(whereClause);
        const opinionCount =
            opinionResponse.length === 0 ? 0 : opinionResponse[0].count;
        return opinionCount;
    }

    async function isPostSlugIdLocked({
        db,
        postSlugId,
    }: IsPostSlugIdLockedProps) {
        const { getPostMetadataFromSlugId } = useCommonPost();
        const postDetails = await getPostMetadataFromSlugId({
            db: db,
            conversationSlugId: postSlugId,
        });

        const moderationPostsTableResponse = await db
            .select({
                moderationAction: conversationModerationTable.moderationAction,
            })
            .from(conversationModerationTable)
            .where(
                and(
                    eq(
                        conversationModerationTable.conversationId,
                        postDetails.id,
                    ),
                    eq(conversationModerationTable.moderationAction, "lock"),
                ),
            );

        if (moderationPostsTableResponse.length == 1) {
            return true;
        } else {
            return false;
        }
    }

    interface FetchPostItemsProps {
        db: PostgresJsDatabase;
        limit?: number;
        where: SQL | undefined;
        enableCompactBody: boolean;
        personalizedUserId?: string;
        excludeLockedPosts: boolean;
        removeMutedAuthors: boolean;
        baseImageServiceUrl: string;
    }

    async function fetchPostItems({
        db,
        limit,
        where,
        enableCompactBody,
        personalizedUserId,
        excludeLockedPosts,
        removeMutedAuthors,
        baseImageServiceUrl,
    }: FetchPostItemsProps): Promise<ExtendedConversationPerSlugId> {
        let postItems;

        const polisClusterTableAlias0 = alias(polisClusterTable, "cluster_0 ");
        const polisClusterTableAlias1 = alias(polisClusterTable, "cluster_1 ");
        const polisClusterTableAlias2 = alias(polisClusterTable, "cluster_2 ");
        const polisClusterTableAlias3 = alias(polisClusterTable, "cluster_3 ");
        const polisClusterTableAlias4 = alias(polisClusterTable, "cluster_4 ");
        const polisClusterTableAlias5 = alias(polisClusterTable, "cluster_5 ");

        const postItemsQuery = db
            .select({
                title: conversationContentTable.title,
                body: conversationContentTable.body,
                option1: pollTable.option1,
                option1Response: pollTable.option1Response,
                option2: pollTable.option2,
                option2Response: pollTable.option2Response,
                option3: pollTable.option3,
                option3Response: pollTable.option3Response,
                option4: pollTable.option4,
                option4Response: pollTable.option4Response,
                option5: pollTable.option5,
                option5Response: pollTable.option5Response,
                option6: pollTable.option6,
                option6Response: pollTable.option6Response,
                // metadata
                slugId: conversationTable.slugId,
                createdAt: conversationTable.createdAt,
                updatedAt: conversationTable.updatedAt,
                lastReactedAt: conversationTable.lastReactedAt,
                opinionCount: conversationTable.opinionCount,
                voteCount: conversationTable.voteCount,
                participantCount: conversationTable.participantCount,
                authorName: userTable.username,
                organizationName: organizationTable.name,
                organizationImagePath: organizationTable.imagePath,
                organizationWebsiteUrl: organizationTable.websiteUrl,
                organizationIsFullImagePath: organizationTable.isFullImagePath,
                organizationDescription: organizationTable.description,
                isIndexed: conversationTable.isIndexed,
                isLoginRequired: conversationTable.isLoginRequired,
                // moderation
                moderationAction: conversationModerationTable.moderationAction,
                moderationExplanation:
                    conversationModerationTable.moderationExplanation,
                moderationReason: conversationModerationTable.moderationReason,
                moderationCreatedAt: conversationModerationTable.createdAt,
                moderationUpdatedAt: conversationModerationTable.updatedAt,
                // polis
                conversationAiSummary: polisContentTable.aiSummary,
                polisContentId: polisContentTable.id,
                polisCluster0Id: polisClusterTableAlias0.id,
                polisCluster0AiLabel: polisClusterTableAlias0.aiLabel,
                polisCluster0AiSummary: polisClusterTableAlias0.aiSummary,
                polisCluster0NumUsers: polisClusterTableAlias0.numUsers,
                polisCluster1Id: polisClusterTableAlias1.id,
                polisCluster1AiLabel: polisClusterTableAlias1.aiLabel,
                polisCluster1AiSummary: polisClusterTableAlias1.aiSummary,
                polisCluster1NumUsers: polisClusterTableAlias1.numUsers,
                polisCluster2Id: polisClusterTableAlias2.id,
                polisCluster2AiLabel: polisClusterTableAlias2.aiLabel,
                polisCluster2AiSummary: polisClusterTableAlias2.aiSummary,
                polisCluster2NumUsers: polisClusterTableAlias2.numUsers,
                polisCluster3Id: polisClusterTableAlias3.id,
                polisCluster3AiLabel: polisClusterTableAlias3.aiLabel,
                polisCluster3AiSummary: polisClusterTableAlias3.aiSummary,
                polisCluster3NumUsers: polisClusterTableAlias3.numUsers,
                polisCluster4Id: polisClusterTableAlias4.id,
                polisCluster4AiLabel: polisClusterTableAlias4.aiLabel,
                polisCluster4AiSummary: polisClusterTableAlias4.aiSummary,
                polisCluster4NumUsers: polisClusterTableAlias4.numUsers,
                polisCluster5Id: polisClusterTableAlias5.id,
                polisCluster5AiLabel: polisClusterTableAlias5.aiLabel,
                polisCluster5AiSummary: polisClusterTableAlias5.aiSummary,
                polisCluster5NumUsers: polisClusterTableAlias5.numUsers,
            })
            .from(conversationTable)
            .innerJoin(
                conversationContentTable,
                eq(
                    conversationContentTable.id,
                    conversationTable.currentContentId,
                ),
            )
            .innerJoin(userTable, eq(userTable.id, conversationTable.authorId))
            .leftJoin(
                conversationModerationTable,
                eq(
                    conversationModerationTable.conversationId,
                    conversationTable.id,
                ),
            )
            .leftJoin(
                pollTable,
                eq(
                    conversationContentTable.id,
                    pollTable.conversationContentId,
                ),
            )
            .leftJoin(
                polisContentTable,
                eq(
                    polisContentTable.id,
                    conversationTable.currentPolisContentId,
                ),
            )
            .leftJoin(
                polisClusterTableAlias0,
                and(
                    eq(
                        polisClusterTableAlias0.polisContentId,
                        polisContentTable.id,
                    ),
                    eq(polisClusterTableAlias0.key, "0"),
                ),
            )
            .leftJoin(
                polisClusterTableAlias1,
                and(
                    eq(
                        polisClusterTableAlias1.polisContentId,
                        polisContentTable.id,
                    ),
                    eq(polisClusterTableAlias1.key, "1"),
                ),
            )
            .leftJoin(
                polisClusterTableAlias2,
                and(
                    eq(
                        polisClusterTableAlias2.polisContentId,
                        polisContentTable.id,
                    ),
                    eq(polisClusterTableAlias2.key, "2"),
                ),
            )
            .leftJoin(
                polisClusterTableAlias3,
                and(
                    eq(
                        polisClusterTableAlias3.polisContentId,
                        polisContentTable.id,
                    ),
                    eq(polisClusterTableAlias3.key, "3"),
                ),
            )
            .leftJoin(
                polisClusterTableAlias4,
                and(
                    eq(
                        polisClusterTableAlias4.polisContentId,
                        polisContentTable.id,
                    ),
                    eq(polisClusterTableAlias4.key, "4"),
                ),
            )
            .leftJoin(
                polisClusterTableAlias5,
                and(
                    eq(
                        polisClusterTableAlias5.polisContentId,
                        polisContentTable.id,
                    ),
                    eq(polisClusterTableAlias5.key, "5"),
                ),
            )
            .leftJoin(
                organizationTable,
                eq(organizationTable.id, conversationTable.organizationId),
            )
            // whereClause = and(whereClause, lt(postTable.createdAt, lastCreatedAt));
            .where(where)
            .orderBy(desc(conversationTable.createdAt));
        if (limit !== undefined) {
            postItems = await postItemsQuery.$dynamic().limit(limit);
        } else {
            postItems = await postItemsQuery;
        }

        const extendedConversationMap: ExtendedConversationPerSlugId = new Map<
            string,
            ExtendedConversation
        >();

        for (const postItem of postItems) {
            if (enableCompactBody && postItem.body != null) {
                postItem.body = createCompactHtmlBody(postItem.body);
            }

            const moderationProperties = createPostModerationPropertyObject(
                postItem.moderationAction,
                postItem.moderationExplanation,
                postItem.moderationReason,
                postItem.moderationCreatedAt,
                postItem.moderationUpdatedAt,
            );

            const metadata: ConversationMetadata = {
                conversationSlugId: postItem.slugId,
                moderation: moderationProperties,
                createdAt: postItem.createdAt,
                updatedAt: postItem.updatedAt,
                lastReactedAt: postItem.lastReactedAt,
                opinionCount: postItem.opinionCount,
                voteCount: postItem.voteCount,
                participantCount: postItem.participantCount,
                authorUsername: postItem.authorName,
                isIndexed: postItem.isIndexed,
                isLoginRequired: postItem.isLoginRequired,
                organization:
                    postItem.organizationName !== null &&
                    postItem.organizationDescription !== null &&
                    postItem.organizationImagePath !== null &&
                    postItem.organizationIsFullImagePath !== null &&
                    postItem.organizationWebsiteUrl !== null
                        ? {
                              name: postItem.organizationName,
                              description: postItem.organizationDescription,
                              websiteUrl: postItem.organizationWebsiteUrl,
                              imageUrl: imagePathToUrl({
                                  imagePath: postItem.organizationImagePath,
                                  isFullImagePath:
                                      postItem.organizationIsFullImagePath,
                                  baseImageServiceUrl,
                              }),
                          }
                        : undefined,
            };

            let polis: ExtendedConversationPolis;
            if (postItem.polisContentId !== null) {
                let clusterIdUserBelongsTo;
                if (personalizedUserId !== undefined) {
                    clusterIdUserBelongsTo =
                        await polisService.getClusterIdByUserAndConv({
                            db,
                            userId: personalizedUserId,
                            polisContentId: postItem.polisContentId,
                        });
                }
                const clusters: ClusterMetadata[] = [];
                if (
                    postItem.polisCluster0Id !== null &&
                    postItem.polisCluster0NumUsers !== null
                ) {
                    const cluster0: ClusterMetadata = {
                        key: "0",
                        aiLabel: toUnionUndefined(
                            postItem.polisCluster0AiLabel,
                        ),
                        aiSummary: toUnionUndefined(
                            postItem.polisCluster0AiSummary,
                        ),
                        isUserInCluster:
                            clusterIdUserBelongsTo === postItem.polisCluster0Id,
                        numUsers: postItem.polisCluster0NumUsers,
                    };
                    clusters.push(cluster0);
                }
                if (
                    postItem.polisCluster1Id !== null &&
                    postItem.polisCluster1NumUsers !== null
                ) {
                    const cluster: ClusterMetadata = {
                        key: "1",
                        aiLabel: toUnionUndefined(
                            postItem.polisCluster1AiLabel,
                        ),
                        aiSummary: toUnionUndefined(
                            postItem.polisCluster1AiSummary,
                        ),
                        isUserInCluster:
                            clusterIdUserBelongsTo === postItem.polisCluster1Id,
                        numUsers: postItem.polisCluster1NumUsers,
                    };
                    clusters.push(cluster);
                }
                if (
                    postItem.polisCluster2Id !== null &&
                    postItem.polisCluster2NumUsers !== null
                ) {
                    const cluster: ClusterMetadata = {
                        key: "2",
                        aiLabel: toUnionUndefined(
                            postItem.polisCluster2AiLabel,
                        ),
                        aiSummary: toUnionUndefined(
                            postItem.polisCluster2AiSummary,
                        ),
                        isUserInCluster:
                            clusterIdUserBelongsTo === postItem.polisCluster2Id,
                        numUsers: postItem.polisCluster2NumUsers,
                    };
                    clusters.push(cluster);
                }
                if (
                    postItem.polisCluster3Id !== null &&
                    postItem.polisCluster3NumUsers !== null
                ) {
                    const cluster: ClusterMetadata = {
                        key: "3",
                        aiLabel: toUnionUndefined(
                            postItem.polisCluster3AiLabel,
                        ),
                        aiSummary: toUnionUndefined(
                            postItem.polisCluster3AiSummary,
                        ),
                        isUserInCluster:
                            clusterIdUserBelongsTo === postItem.polisCluster3Id,
                        numUsers: postItem.polisCluster3NumUsers,
                    };
                    clusters.push(cluster);
                }
                if (
                    postItem.polisCluster4Id !== null &&
                    postItem.polisCluster4NumUsers !== null
                ) {
                    const cluster: ClusterMetadata = {
                        key: "4",
                        aiLabel: toUnionUndefined(
                            postItem.polisCluster4AiLabel,
                        ),
                        aiSummary: toUnionUndefined(
                            postItem.polisCluster4AiSummary,
                        ),
                        isUserInCluster:
                            clusterIdUserBelongsTo === postItem.polisCluster4Id,
                        numUsers: postItem.polisCluster4NumUsers,
                    };
                    clusters.push(cluster);
                }
                if (
                    postItem.polisCluster5Id !== null &&
                    postItem.polisCluster5NumUsers !== null
                ) {
                    const cluster: ClusterMetadata = {
                        key: "5",
                        aiLabel: toUnionUndefined(
                            postItem.polisCluster5AiLabel,
                        ),
                        aiSummary: toUnionUndefined(
                            postItem.polisCluster5AiSummary,
                        ),
                        isUserInCluster:
                            clusterIdUserBelongsTo === postItem.polisCluster5Id,
                        numUsers: postItem.polisCluster5NumUsers,
                    };
                    clusters.push(cluster);
                }
                polis = {
                    aiSummary: toUnionUndefined(postItem.conversationAiSummary),
                    clusters: clusters,
                };
            } else {
                polis = {
                    aiSummary: toUnionUndefined(postItem.conversationAiSummary),
                    clusters: [],
                };
            }

            let payload: ExtendedConversationPayload;
            if (
                postItem.option1 !== null &&
                postItem.option2 !== null &&
                postItem.option1Response !== null &&
                postItem.option2Response !== null
            ) {
                // hasPoll
                const pollList: PollOptionWithResult[] = [
                    {
                        optionNumber: 1,
                        optionTitle: postItem.option1,
                        numResponses: postItem.option1Response,
                    },
                    {
                        optionNumber: 2,
                        optionTitle: postItem.option2,
                        numResponses: postItem.option2Response,
                    },
                ];
                if (postItem.option3 !== null) {
                    pollList.push({
                        optionNumber: 3,
                        optionTitle: postItem.option3,
                        numResponses: postItem.option3Response ?? 0,
                    });
                }
                if (postItem.option4 !== null) {
                    pollList.push({
                        optionNumber: 4,
                        optionTitle: postItem.option4,
                        numResponses: postItem.option4Response ?? 0,
                    });
                }
                if (postItem.option5 !== null) {
                    pollList.push({
                        optionNumber: 5,
                        optionTitle: postItem.option5,
                        numResponses: postItem.option5Response ?? 0,
                    });
                }
                if (postItem.option6 !== null) {
                    pollList.push({
                        optionNumber: 6,
                        optionTitle: postItem.option6,
                        numResponses: postItem.option6Response ?? 0,
                    });
                }
                payload = {
                    title: postItem.title, // Typescript inference limitation
                    body: toUnionUndefined(postItem.body),
                    poll: pollList,
                };
            } else {
                payload = {
                    title: postItem.title,
                    body: toUnionUndefined(postItem.body),
                };
            }

            if (excludeLockedPosts && postItem.moderationAction == "lock") {
                // Skip
            } else {
                extendedConversationMap.set(postItem.slugId, {
                    metadata: metadata,
                    payload: payload,
                    interaction: {
                        hasVoted: false,
                        votedIndex: 0,
                    },
                    polis: polis,
                });
            }
        }

        if (personalizedUserId) {
            // Annotate return list with poll response
            {
                const pollResponseMap = new Map<string, number>();

                const postSlugIdList: string[] = [];
                extendedConversationMap.forEach((post) => {
                    postSlugIdList.push(post.metadata.conversationSlugId);
                });

                const pollResponses = await getUserPollResponse({
                    db: db,
                    authorId: personalizedUserId,
                    httpErrors: httpErrors,
                    postSlugIdList: postSlugIdList,
                });

                pollResponses.forEach((response) => {
                    pollResponseMap.set(
                        response.conversationSlugId,
                        response.optionChosen,
                    );
                });

                extendedConversationMap.forEach((post) => {
                    const voteIndex = pollResponseMap.get(
                        post.metadata.conversationSlugId,
                    );
                    post.interaction = {
                        hasVoted: voteIndex != undefined,
                        votedIndex: voteIndex ?? 0,
                    };
                });
            }

            // Remove muted users from the list
            if (removeMutedAuthors) {
                const mutedUserItems = await getUserMutePreferences({
                    db: db,
                    userId: personalizedUserId,
                });
                extendedConversationMap.forEach(
                    (postItem, conversationSlugId, map) => {
                        if (
                            mutedUserItems.some(
                                (muteItem) =>
                                    muteItem.username ===
                                    postItem.metadata.authorUsername,
                            )
                        ) {
                            map.delete(conversationSlugId);
                        }
                    },
                );
            }
        }

        return extendedConversationMap;
    }

    function createCompactHtmlBody(htmlString: string) {
        return sanitizeHtml(htmlString, {
            allowedTags: ["b", "i", "strike", "u"],
            allowedAttributes: {},
            textFilter: function (text) {
                // , tagName
                return text + " ";
            },
        });
    }

    interface PostMetadata {
        id: number;
        contentId: number | null;
        authorId: string;
        participantCount: number;
        opinionCount: number;
        voteCount: number;
        isIndexed: boolean;
        isLoginRequired: boolean;
    }

    interface GetPostMetadataFromSlugIdProps {
        db: PostgresJsDatabase;
        conversationSlugId: string;
        useCache?: boolean;
    }

    async function getPostMetadataFromSlugId({
        db,
        conversationSlugId,
        useCache = true,
    }: GetPostMetadataFromSlugIdProps): Promise<PostMetadata> {
        const postTableResponse = await db
            .select({
                id: conversationTable.id,
                currentContentId: conversationTable.currentContentId,
                authorId: conversationTable.authorId,
                participantCount: conversationTable.participantCount,
                voteCount: conversationTable.voteCount,
                opinionCount: conversationTable.opinionCount,
                isIndexed: conversationTable.isIndexed,
                isLoginRequired: conversationTable.isLoginRequired,
            })
            .from(conversationTable)
            .where(eq(conversationTable.slugId, conversationSlugId));
        if (postTableResponse.length === 0) {
            throw httpErrors.notFound("Conversation slugId not found");
        }
        if (useCache) {
            return {
                contentId: postTableResponse[0].currentContentId,
                id: postTableResponse[0].id,
                authorId: postTableResponse[0].authorId,
                participantCount: postTableResponse[0].participantCount,
                voteCount: postTableResponse[0].voteCount,
                opinionCount: postTableResponse[0].opinionCount,
                isIndexed: postTableResponse[0].isIndexed,
                isLoginRequired: postTableResponse[0].isLoginRequired,
            };
        } else {
            const participantCount = await getParticipantCountBypassCache({
                db,
                conversationId: postTableResponse[0].id,
            });
            const voteCount = await getVoteCountBypassCache({
                db,
                conversationId: postTableResponse[0].id,
            });
            const opinionCount = await getOpinionCountBypassCache({
                db,
                conversationId: postTableResponse[0].id,
            });
            return {
                contentId: postTableResponse[0].currentContentId,
                id: postTableResponse[0].id,
                authorId: postTableResponse[0].authorId,
                participantCount: participantCount,
                opinionCount: opinionCount,
                voteCount: voteCount,
                isIndexed: postTableResponse[0].isIndexed,
                isLoginRequired: postTableResponse[0].isLoginRequired,
            };
        }
    }

    return {
        fetchPostItems,
        getPostMetadataFromSlugId,
        isPostSlugIdLocked,
        createCompactHtmlBody,
        getParticipantCountBypassCache,
        getOpinionCountBypassCache,
        getVoteCountBypassCache,
    };
}

interface GetCountForParticipantProps {
    db: PostgresJsDatabase;
    conversationId: number;
    userId: string;
    useCache?: boolean;
}

export function useCommonComment() {
    interface GetCommentIdFromCommentSlugIdProps {
        db: PostgresJsDatabase;
        commentSlugId: string;
    }

    async function getCountsForParticipant({
        db,
        conversationId,
        userId,
    }: GetCountForParticipantProps): Promise<{
        voteCount: number;
        opinionCount: number;
    }> {
        const { getOpinionCountBypassCache, getVoteCountBypassCache } =
            useCommonPost();
        const voteCount = await getVoteCountBypassCache({
            db,
            conversationId,
            userId,
        });
        const opinionCount = await getOpinionCountBypassCache({
            db,
            conversationId,
            userId,
        });
        return {
            voteCount: voteCount,
            opinionCount: opinionCount,
        };
    }

    async function getCommentIdFromCommentSlugId({
        db,
        commentSlugId,
    }: GetCommentIdFromCommentSlugIdProps) {
        const commentTableResponse = await db
            .select({
                commentId: opinionTable.id,
            })
            .from(opinionTable)
            .where(eq(opinionTable.slugId, commentSlugId));

        if (commentTableResponse.length != 1) {
            throw httpErrors.notFound(
                "Failed to locate comment ID from comment slug ID: " +
                    commentSlugId,
            );
        }

        return commentTableResponse[0].commentId;
    }

    interface GetOpinionMetadataFromOpinionSlugIdProps {
        db: PostgresJsDatabase;
        opinionSlugId: string;
    }

    async function getOpinionMetadataFromOpinionSlugId({
        db,
        opinionSlugId,
    }: GetOpinionMetadataFromOpinionSlugIdProps) {
        const opinionTableResponse = await db
            .select({
                conversationSlugId: conversationTable.slugId,
                conversationId: conversationTable.id,
                opinionCurrentContentId: opinionTable.currentContentId,
            })
            .from(opinionTable)
            .innerJoin(
                conversationTable,
                eq(conversationTable.id, opinionTable.conversationId),
            )
            .where(eq(opinionTable.slugId, opinionSlugId));

        if (opinionTableResponse.length != 1) {
            throw httpErrors.internalServerError(
                "Failed to locate conversation slug ID from opinion slug ID: " +
                    opinionSlugId,
            );
        }

        return {
            conversationSlugId: opinionTableResponse[0].conversationSlugId,
            conversationId: opinionTableResponse[0].conversationId,
            isOpinionDeleted:
                opinionTableResponse[0].opinionCurrentContentId == null,
        };
    }

    return {
        getOpinionMetadataFromOpinionSlugId,
        getCommentIdFromCommentSlugId,
        getCountsForParticipant,
    };
}
