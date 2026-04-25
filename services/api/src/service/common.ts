import {
    conversationContentTable,
    conversationTable,
    userTable,
    opinionTable,
    conversationModerationTable,
    polisContentTable,
    polisClusterTable,
    polisClusterTranslationTable,
    organizationTable,
    maxdiffItemTable,
} from "@/shared-backend/schema.js";
import { toUnionUndefined } from "@/shared/shared.js";
import type {
    ConversationMetadata,
    ExtendedConversationPayload,
    ExtendedConversationPerSlugId,
    ExtendedConversation,
    ConversationType,
    FeedSortAlgorithm,
    PolisClustersMetadata,
    ClusterMetadata,
    EventSlug,
    ParticipationMode,
} from "@/shared/types/zod.js";
import { zodExternalSourceConfig } from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import { eq, desc, SQL, and, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import sanitizeHtml from "sanitize-html";
import { createPostModerationPropertyObject } from "./moderation.js";
import { getUserMutePreferences } from "./muteUser.js";
import { alias } from "drizzle-orm/pg-core";
import * as polisService from "@/service/polis.js";
import { imagePathToUrl } from "@/utils/organizationLogic.js";
import { getConversationEngagementScore } from "./recommendationSystem.js";
import { log } from "@/app.js";

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
    interface IsConversationIdLockedProps {
        db: PostgresJsDatabase;
        conversationId: number;
    }

    async function isConversationIdLocked({
        db,
        conversationId,
    }: IsConversationIdLockedProps): Promise<boolean> {
        const moderationPostsTableResponse = await db
            .select({
                moderationAction: conversationModerationTable.moderationAction,
            })
            .from(conversationModerationTable)
            .where(
                and(
                    eq(conversationModerationTable.conversationId, conversationId),
                    eq(conversationModerationTable.moderationAction, "lock"),
                ),
            )
            .limit(1);

        return moderationPostsTableResponse.length > 0;
    }

    interface IsPostSlugIdLockedProps {
        db: PostgresJsDatabase;
        postSlugId: string;
    }
    async function isPostSlugIdLocked({
        db,
        postSlugId,
    }: IsPostSlugIdLockedProps) {
        const postDetails = await getPostMetadataFromSlugId({
            db,
            conversationSlugId: postSlugId,
        });

        return await isConversationIdLocked({
            db,
            conversationId: postDetails.id,
        });
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
        sortAlgorithm: FeedSortAlgorithm;
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
        sortAlgorithm,
    }: FetchPostItemsProps): Promise<ExtendedConversationPerSlugId> {
        let postItems;

        const postItemsQuery = db
            .select({
                title: conversationContentTable.title,
                body: conversationContentTable.body,
                // metadata
                conversationId: conversationTable.id,
                slugId: conversationTable.slugId,
                createdAt: conversationTable.createdAt,
                updatedAt: conversationTable.updatedAt,
                lastReactedAt: conversationTable.lastReactedAt,
                opinionCount: conversationTable.opinionCount,
                voteCount: conversationTable.voteCount,
                participantCount: conversationTable.participantCount,
                totalOpinionCount: conversationTable.totalOpinionCount,
                totalVoteCount: conversationTable.totalVoteCount,
                totalParticipantCount: conversationTable.totalParticipantCount,
                moderatedOpinionCount: conversationTable.moderatedOpinionCount,
                hiddenOpinionCount: conversationTable.hiddenOpinionCount,
                authorName: userTable.username,
                organizationName: organizationTable.name,
                organizationImagePath: organizationTable.imagePath,
                organizationWebsiteUrl: organizationTable.websiteUrl,
                organizationIsFullImagePath: organizationTable.isFullImagePath,
                organizationDescription: organizationTable.description,
                isIndexed: conversationTable.isIndexed,
                participationMode: conversationTable.participationMode,
                conversationType: conversationTable.conversationType,
                isClosed: conversationTable.isClosed,
                isEdited: conversationTable.isEdited,
                requiresEventTicket: conversationTable.requiresEventTicket,
                externalSourceConfig: conversationTable.externalSourceConfig,
                // import metadata
                importUrl: conversationTable.importUrl,
                importConversationUrl: conversationTable.importConversationUrl,
                importExportUrl: conversationTable.importExportUrl,
                importCreatedAt: conversationTable.importCreatedAt,
                importAuthor: conversationTable.importAuthor,
                importMethod: conversationTable.importMethod,
                // moderation
                moderationAction: conversationModerationTable.moderationAction,
                moderationExplanation:
                    conversationModerationTable.moderationExplanation,
                moderationReason: conversationModerationTable.moderationReason,
                moderationCreatedAt: conversationModerationTable.createdAt,
                moderationUpdatedAt: conversationModerationTable.updatedAt,
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
                organizationTable,
                eq(organizationTable.id, conversationTable.organizationId),
            )
            // whereClause = and(whereClause, lt(postTable.createdAt, lastCreatedAt));
            .where(and(where, eq(userTable.isDeleted, false)))
            .orderBy(desc(conversationTable.createdAt));
        if (limit !== undefined) {
            postItems = await postItemsQuery.$dynamic().limit(limit);
        } else {
            postItems = await postItemsQuery;
        }

        if (sortAlgorithm == "following") {
            postItems.sort((post1, post2) => {
                const score1 = getConversationEngagementScore({
                    createdAt: post1.createdAt,
                    lastReactedAt: post1.lastReactedAt,
                    opinionCount: post1.opinionCount,
                    voteCount: post1.voteCount,
                    participantCount: post1.participantCount,
                });

                const score2 = getConversationEngagementScore({
                    createdAt: post2.createdAt,
                    lastReactedAt: post2.lastReactedAt,
                    opinionCount: post2.opinionCount,
                    voteCount: post2.voteCount,
                    participantCount: post2.participantCount,
                });

                return score2 - score1; // Higher engagements first
            });
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
                updatedAt: postItem.isEdited ? postItem.updatedAt : undefined,
                lastReactedAt: postItem.lastReactedAt,
                opinionCount: postItem.opinionCount,
                voteCount: postItem.voteCount,
                participantCount: postItem.participantCount,
                totalOpinionCount: postItem.totalOpinionCount,
                totalVoteCount: postItem.totalVoteCount,
                totalParticipantCount: postItem.totalParticipantCount,
                moderatedOpinionCount: postItem.moderatedOpinionCount,
                hiddenOpinionCount: postItem.hiddenOpinionCount,
                authorUsername: postItem.authorName,
                isIndexed: postItem.isIndexed,
                participationMode: postItem.participationMode,
                conversationType: postItem.conversationType,
                isClosed: postItem.isClosed,
                isEdited: postItem.isEdited,
                requiresEventTicket: postItem.requiresEventTicket ?? undefined,
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
                externalSourceConfig: (() => {
                    const parsed = zodExternalSourceConfig.safeParse(
                        postItem.externalSourceConfig,
                    );
                    return parsed.success ? parsed.data : null;
                })(),
                importInfo:
                    postItem.importUrl !== null ||
                    postItem.importConversationUrl !== null ||
                    postItem.importExportUrl !== null ||
                    postItem.importAuthor !== null ||
                    postItem.importCreatedAt !== null
                        ? {
                              method: postItem.importMethod ?? "url",
                              sourceUrl: toUnionUndefined(postItem.importUrl),
                              conversationUrl: toUnionUndefined(
                                  postItem.importConversationUrl,
                              ),
                              exportUrl: toUnionUndefined(
                                  postItem.importExportUrl,
                              ),
                              createdAt: toUnionUndefined(
                                  postItem.importCreatedAt,
                              ),
                              author: toUnionUndefined(postItem.importAuthor),
                          }
                        : undefined,
            };

            // For MaxDiff conversations, override opinionCount with active item count
            if (postItem.conversationType === "maxdiff") {
                const [itemCountResult] = await db
                    .select({
                        count: sql<number>`count(*)::int`,
                    })
                    .from(maxdiffItemTable)
                    .where(
                        and(
                            eq(
                                maxdiffItemTable.conversationId,
                                postItem.conversationId,
                            ),
                            sql`${maxdiffItemTable.currentContentId} IS NOT NULL`,
                            sql`${maxdiffItemTable.lifecycleStatus} IN ('active', 'in_progress')`,
                        ),
                    );
                metadata.opinionCount = itemCountResult.count;
            }

            const payload: ExtendedConversationPayload = {
                title: postItem.title,
                body: toUnionUndefined(postItem.body),
            };

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
                });
            }
        }

        if (personalizedUserId) {
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

    async function getPolisMetadata({
        db,
        conversationSlugId,
        personalizationUserId,
        displayLanguage = "en",
    }: {
        db: PostgresJsDatabase;
        conversationSlugId: string;
        personalizationUserId?: string;
        displayLanguage?: string;
    }): Promise<
        | {
              polisContentId: number;
              clustersMetadata: PolisClustersMetadata;
              missingTranslations: Map<
                  number,
                  {
                      needsLabelTranslation: boolean;
                      needsSummaryTranslation: boolean;
                  }
              >;
          }
        | undefined
    > {
        const polisClusterTableAlias0 = alias(polisClusterTable, "cluster_0");
        const polisClusterTableAlias1 = alias(polisClusterTable, "cluster_1");
        const polisClusterTableAlias2 = alias(polisClusterTable, "cluster_2");
        const polisClusterTableAlias3 = alias(polisClusterTable, "cluster_3");
        const polisClusterTableAlias4 = alias(polisClusterTable, "cluster_4");
        const polisClusterTableAlias5 = alias(polisClusterTable, "cluster_5");

        // Translation table aliases for each cluster
        const polisClusterTranslationAlias0 = alias(
            polisClusterTranslationTable,
            "translation_0",
        );
        const polisClusterTranslationAlias1 = alias(
            polisClusterTranslationTable,
            "translation_1",
        );
        const polisClusterTranslationAlias2 = alias(
            polisClusterTranslationTable,
            "translation_2",
        );
        const polisClusterTranslationAlias3 = alias(
            polisClusterTranslationTable,
            "translation_3",
        );
        const polisClusterTranslationAlias4 = alias(
            polisClusterTranslationTable,
            "translation_4",
        );
        const polisClusterTranslationAlias5 = alias(
            polisClusterTranslationTable,
            "translation_5",
        );

        const results = await db
            .select({
                // polis
                polisContentId: polisContentTable.id,
                polisCluster0Id: polisClusterTableAlias0.id,
                // COALESCE: use translation if available, fallback to English
                polisCluster0AiLabel: sql<
                    string | null
                >`COALESCE(${polisClusterTranslationAlias0.aiLabel}, ${polisClusterTableAlias0.aiLabel})`,
                polisCluster0AiSummary: sql<
                    string | null
                >`COALESCE(${polisClusterTranslationAlias0.aiSummary}, ${polisClusterTableAlias0.aiSummary})`,
                polisCluster0NumUsers: polisClusterTableAlias0.numUsers,
                // Raw values for translation detection
                polisCluster0EnAiLabel: polisClusterTableAlias0.aiLabel,
                polisCluster0EnAiSummary: polisClusterTableAlias0.aiSummary,
                polisCluster0TransAiLabel:
                    polisClusterTranslationAlias0.aiLabel,
                polisCluster0TransAiSummary:
                    polisClusterTranslationAlias0.aiSummary,
                polisCluster1Id: polisClusterTableAlias1.id,
                polisCluster1AiLabel: sql<
                    string | null
                >`COALESCE(${polisClusterTranslationAlias1.aiLabel}, ${polisClusterTableAlias1.aiLabel})`,
                polisCluster1AiSummary: sql<
                    string | null
                >`COALESCE(${polisClusterTranslationAlias1.aiSummary}, ${polisClusterTableAlias1.aiSummary})`,
                polisCluster1NumUsers: polisClusterTableAlias1.numUsers,
                polisCluster1EnAiLabel: polisClusterTableAlias1.aiLabel,
                polisCluster1EnAiSummary: polisClusterTableAlias1.aiSummary,
                polisCluster1TransAiLabel:
                    polisClusterTranslationAlias1.aiLabel,
                polisCluster1TransAiSummary:
                    polisClusterTranslationAlias1.aiSummary,
                polisCluster2Id: polisClusterTableAlias2.id,
                polisCluster2AiLabel: sql<
                    string | null
                >`COALESCE(${polisClusterTranslationAlias2.aiLabel}, ${polisClusterTableAlias2.aiLabel})`,
                polisCluster2AiSummary: sql<
                    string | null
                >`COALESCE(${polisClusterTranslationAlias2.aiSummary}, ${polisClusterTableAlias2.aiSummary})`,
                polisCluster2NumUsers: polisClusterTableAlias2.numUsers,
                polisCluster2EnAiLabel: polisClusterTableAlias2.aiLabel,
                polisCluster2EnAiSummary: polisClusterTableAlias2.aiSummary,
                polisCluster2TransAiLabel:
                    polisClusterTranslationAlias2.aiLabel,
                polisCluster2TransAiSummary:
                    polisClusterTranslationAlias2.aiSummary,
                polisCluster3Id: polisClusterTableAlias3.id,
                polisCluster3AiLabel: sql<
                    string | null
                >`COALESCE(${polisClusterTranslationAlias3.aiLabel}, ${polisClusterTableAlias3.aiLabel})`,
                polisCluster3AiSummary: sql<
                    string | null
                >`COALESCE(${polisClusterTranslationAlias3.aiSummary}, ${polisClusterTableAlias3.aiSummary})`,
                polisCluster3NumUsers: polisClusterTableAlias3.numUsers,
                polisCluster3EnAiLabel: polisClusterTableAlias3.aiLabel,
                polisCluster3EnAiSummary: polisClusterTableAlias3.aiSummary,
                polisCluster3TransAiLabel:
                    polisClusterTranslationAlias3.aiLabel,
                polisCluster3TransAiSummary:
                    polisClusterTranslationAlias3.aiSummary,
                polisCluster4Id: polisClusterTableAlias4.id,
                polisCluster4AiLabel: sql<
                    string | null
                >`COALESCE(${polisClusterTranslationAlias4.aiLabel}, ${polisClusterTableAlias4.aiLabel})`,
                polisCluster4AiSummary: sql<
                    string | null
                >`COALESCE(${polisClusterTranslationAlias4.aiSummary}, ${polisClusterTableAlias4.aiSummary})`,
                polisCluster4NumUsers: polisClusterTableAlias4.numUsers,
                polisCluster4EnAiLabel: polisClusterTableAlias4.aiLabel,
                polisCluster4EnAiSummary: polisClusterTableAlias4.aiSummary,
                polisCluster4TransAiLabel:
                    polisClusterTranslationAlias4.aiLabel,
                polisCluster4TransAiSummary:
                    polisClusterTranslationAlias4.aiSummary,
                polisCluster5Id: polisClusterTableAlias5.id,
                polisCluster5AiLabel: sql<
                    string | null
                >`COALESCE(${polisClusterTranslationAlias5.aiLabel}, ${polisClusterTableAlias5.aiLabel})`,
                polisCluster5AiSummary: sql<
                    string | null
                >`COALESCE(${polisClusterTranslationAlias5.aiSummary}, ${polisClusterTableAlias5.aiSummary})`,
                polisCluster5NumUsers: polisClusterTableAlias5.numUsers,
                polisCluster5EnAiLabel: polisClusterTableAlias5.aiLabel,
                polisCluster5EnAiSummary: polisClusterTableAlias5.aiSummary,
                polisCluster5TransAiLabel:
                    polisClusterTranslationAlias5.aiLabel,
                polisCluster5TransAiSummary:
                    polisClusterTranslationAlias5.aiSummary,
            })
            .from(conversationTable)
            .innerJoin(
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
            // LEFT JOIN translation tables for each cluster
            .leftJoin(
                polisClusterTranslationAlias0,
                and(
                    eq(
                        polisClusterTranslationAlias0.polisClusterId,
                        polisClusterTableAlias0.id,
                    ),
                    eq(
                        polisClusterTranslationAlias0.languageCode,
                        displayLanguage,
                    ),
                ),
            )
            .leftJoin(
                polisClusterTranslationAlias1,
                and(
                    eq(
                        polisClusterTranslationAlias1.polisClusterId,
                        polisClusterTableAlias1.id,
                    ),
                    eq(
                        polisClusterTranslationAlias1.languageCode,
                        displayLanguage,
                    ),
                ),
            )
            .leftJoin(
                polisClusterTranslationAlias2,
                and(
                    eq(
                        polisClusterTranslationAlias2.polisClusterId,
                        polisClusterTableAlias2.id,
                    ),
                    eq(
                        polisClusterTranslationAlias2.languageCode,
                        displayLanguage,
                    ),
                ),
            )
            .leftJoin(
                polisClusterTranslationAlias3,
                and(
                    eq(
                        polisClusterTranslationAlias3.polisClusterId,
                        polisClusterTableAlias3.id,
                    ),
                    eq(
                        polisClusterTranslationAlias3.languageCode,
                        displayLanguage,
                    ),
                ),
            )
            .leftJoin(
                polisClusterTranslationAlias4,
                and(
                    eq(
                        polisClusterTranslationAlias4.polisClusterId,
                        polisClusterTableAlias4.id,
                    ),
                    eq(
                        polisClusterTranslationAlias4.languageCode,
                        displayLanguage,
                    ),
                ),
            )
            .leftJoin(
                polisClusterTranslationAlias5,
                and(
                    eq(
                        polisClusterTranslationAlias5.polisClusterId,
                        polisClusterTableAlias5.id,
                    ),
                    eq(
                        polisClusterTranslationAlias5.languageCode,
                        displayLanguage,
                    ),
                ),
            )
            .where(eq(conversationTable.slugId, conversationSlugId));

        if (results.length === 0) {
            return undefined;
        }
        const postItem = results[0];

        const clustersMetadata: PolisClustersMetadata = {};

        let clusterIdUserBelongsTo;
        if (personalizationUserId !== undefined) {
            clusterIdUserBelongsTo =
                await polisService.getClusterIdByUserAndConv({
                    db,
                    userId: personalizationUserId,
                    polisContentId: postItem.polisContentId,
                });
        }
        if (
            postItem.polisCluster0Id !== null &&
            postItem.polisCluster0NumUsers !== null
        ) {
            const cluster: ClusterMetadata = {
                id: postItem.polisCluster0Id,
                key: "0",
                aiLabel: toUnionUndefined(postItem.polisCluster0AiLabel),
                aiSummary: toUnionUndefined(postItem.polisCluster0AiSummary),
                isUserInCluster:
                    clusterIdUserBelongsTo === postItem.polisCluster0Id,
                numUsers: postItem.polisCluster0NumUsers,
            };
            clustersMetadata["0"] = cluster;
        }
        if (
            postItem.polisCluster1Id !== null &&
            postItem.polisCluster1NumUsers !== null
        ) {
            const cluster: ClusterMetadata = {
                id: postItem.polisCluster1Id,
                key: "1",
                aiLabel: toUnionUndefined(postItem.polisCluster1AiLabel),
                aiSummary: toUnionUndefined(postItem.polisCluster1AiSummary),
                isUserInCluster:
                    clusterIdUserBelongsTo === postItem.polisCluster1Id,
                numUsers: postItem.polisCluster1NumUsers,
            };
            clustersMetadata["1"] = cluster;
        }
        if (
            postItem.polisCluster2Id !== null &&
            postItem.polisCluster2NumUsers !== null
        ) {
            const cluster: ClusterMetadata = {
                id: postItem.polisCluster2Id,
                key: "2",
                aiLabel: toUnionUndefined(postItem.polisCluster2AiLabel),
                aiSummary: toUnionUndefined(postItem.polisCluster2AiSummary),
                isUserInCluster:
                    clusterIdUserBelongsTo === postItem.polisCluster2Id,
                numUsers: postItem.polisCluster2NumUsers,
            };
            clustersMetadata["2"] = cluster;
        }
        if (
            postItem.polisCluster3Id !== null &&
            postItem.polisCluster3NumUsers !== null
        ) {
            const cluster: ClusterMetadata = {
                id: postItem.polisCluster3Id,
                key: "3",
                aiLabel: toUnionUndefined(postItem.polisCluster3AiLabel),
                aiSummary: toUnionUndefined(postItem.polisCluster3AiSummary),
                isUserInCluster:
                    clusterIdUserBelongsTo === postItem.polisCluster3Id,
                numUsers: postItem.polisCluster3NumUsers,
            };
            clustersMetadata["3"] = cluster;
        }
        if (
            postItem.polisCluster4Id !== null &&
            postItem.polisCluster4NumUsers !== null
        ) {
            const cluster: ClusterMetadata = {
                id: postItem.polisCluster4Id,
                key: "4",
                aiLabel: toUnionUndefined(postItem.polisCluster4AiLabel),
                aiSummary: toUnionUndefined(postItem.polisCluster4AiSummary),
                isUserInCluster:
                    clusterIdUserBelongsTo === postItem.polisCluster4Id,
                numUsers: postItem.polisCluster4NumUsers,
            };
            clustersMetadata["4"] = cluster;
        }
        if (
            postItem.polisCluster5Id !== null &&
            postItem.polisCluster5NumUsers !== null
        ) {
            const cluster: ClusterMetadata = {
                id: postItem.polisCluster5Id,
                key: "5",
                aiLabel: toUnionUndefined(postItem.polisCluster5AiLabel),
                aiSummary: toUnionUndefined(postItem.polisCluster5AiSummary),
                isUserInCluster:
                    clusterIdUserBelongsTo === postItem.polisCluster5Id,
                numUsers: postItem.polisCluster5NumUsers,
            };
            clustersMetadata["5"] = cluster;
        }
        // Track clusters needing translations (only if NOT requesting English)
        const missingTranslations = new Map<
            number,
            {
                needsLabelTranslation: boolean;
                needsSummaryTranslation: boolean;
            }
        >();

        if (displayLanguage !== "en") {
            // Check each cluster for missing translations
            const clusterChecks = [
                {
                    id: postItem.polisCluster0Id,
                    enLabel: postItem.polisCluster0EnAiLabel,
                    enSummary: postItem.polisCluster0EnAiSummary,
                    transLabel: postItem.polisCluster0TransAiLabel,
                    transSummary: postItem.polisCluster0TransAiSummary,
                },
                {
                    id: postItem.polisCluster1Id,
                    enLabel: postItem.polisCluster1EnAiLabel,
                    enSummary: postItem.polisCluster1EnAiSummary,
                    transLabel: postItem.polisCluster1TransAiLabel,
                    transSummary: postItem.polisCluster1TransAiSummary,
                },
                {
                    id: postItem.polisCluster2Id,
                    enLabel: postItem.polisCluster2EnAiLabel,
                    enSummary: postItem.polisCluster2EnAiSummary,
                    transLabel: postItem.polisCluster2TransAiLabel,
                    transSummary: postItem.polisCluster2TransAiSummary,
                },
                {
                    id: postItem.polisCluster3Id,
                    enLabel: postItem.polisCluster3EnAiLabel,
                    enSummary: postItem.polisCluster3EnAiSummary,
                    transLabel: postItem.polisCluster3TransAiLabel,
                    transSummary: postItem.polisCluster3TransAiSummary,
                },
                {
                    id: postItem.polisCluster4Id,
                    enLabel: postItem.polisCluster4EnAiLabel,
                    enSummary: postItem.polisCluster4EnAiSummary,
                    transLabel: postItem.polisCluster4TransAiLabel,
                    transSummary: postItem.polisCluster4TransAiSummary,
                },
                {
                    id: postItem.polisCluster5Id,
                    enLabel: postItem.polisCluster5EnAiLabel,
                    enSummary: postItem.polisCluster5EnAiSummary,
                    transLabel: postItem.polisCluster5TransAiLabel,
                    transSummary: postItem.polisCluster5TransAiSummary,
                },
            ];

            for (const check of clusterChecks) {
                if (check.id === null) continue;

                // Label needs translation if: English source exists AND translation is missing
                const needsLabelTranslation =
                    check.enLabel !== null && check.transLabel === null;

                // Summary needs translation if: English source exists AND translation is missing
                const needsSummaryTranslation =
                    check.enSummary !== null && check.transSummary === null;

                // Only add to map if at least one field needs translation
                if (needsLabelTranslation || needsSummaryTranslation) {
                    missingTranslations.set(check.id, {
                        needsLabelTranslation,
                        needsSummaryTranslation,
                    });
                }
            }
        }

        return {
            polisContentId: postItem.polisContentId,
            clustersMetadata,
            missingTranslations,
        };
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
        conversationType: ConversationType;
        participantCount: number;
        opinionCount: number;
        voteCount: number;
        totalParticipantCount: number;
        totalOpinionCount: number;
        totalVoteCount: number;
        moderatedOpinionCount: number;
        hiddenOpinionCount: number;
        isIndexed: boolean;
        participationMode: ParticipationMode;
        isClosed: boolean;
        requiresEventTicket: EventSlug | null;
    }

    interface GetPostMetadataFromSlugIdProps {
        db: PostgresJsDatabase;
        conversationSlugId: string;
        lastReactedAt?: Date;
    }

    async function getPostMetadataFromSlugId({
        db,
        conversationSlugId,
    }: GetPostMetadataFromSlugIdProps): Promise<PostMetadata> {
        const postTableResponse = await db
            .select({
                id: conversationTable.id,
                currentContentId: conversationTable.currentContentId,
                authorId: conversationTable.authorId,
                participantCount: conversationTable.participantCount,
                voteCount: conversationTable.voteCount,
                opinionCount: conversationTable.opinionCount,
                totalParticipantCount: conversationTable.totalParticipantCount,
                totalVoteCount: conversationTable.totalVoteCount,
                totalOpinionCount: conversationTable.totalOpinionCount,
                moderatedOpinionCount: conversationTable.moderatedOpinionCount,
                hiddenOpinionCount: conversationTable.hiddenOpinionCount,
                isIndexed: conversationTable.isIndexed,
                participationMode: conversationTable.participationMode,
                conversationType: conversationTable.conversationType,
                isClosed: conversationTable.isClosed,
                isEdited: conversationTable.isEdited,
                requiresEventTicket: conversationTable.requiresEventTicket,
            })
            .from(conversationTable)
            .where(eq(conversationTable.slugId, conversationSlugId));
        if (postTableResponse.length === 0) {
            throw httpErrors.notFound("Conversation slugId not found");
        }
        return {
            contentId: postTableResponse[0].currentContentId,
            id: postTableResponse[0].id,
            authorId: postTableResponse[0].authorId,
            participantCount: postTableResponse[0].participantCount,
            voteCount: postTableResponse[0].voteCount,
            opinionCount: postTableResponse[0].opinionCount,
            totalParticipantCount: postTableResponse[0].totalParticipantCount,
            totalVoteCount: postTableResponse[0].totalVoteCount,
            totalOpinionCount: postTableResponse[0].totalOpinionCount,
            moderatedOpinionCount: postTableResponse[0].moderatedOpinionCount,
            hiddenOpinionCount: postTableResponse[0].hiddenOpinionCount,
            isIndexed: postTableResponse[0].isIndexed,
            participationMode: postTableResponse[0].participationMode,
            conversationType: postTableResponse[0].conversationType,
            isClosed: postTableResponse[0].isClosed,
            requiresEventTicket: postTableResponse[0].requiresEventTicket,
        };
    }

    return {
        fetchPostItems,
        getPostMetadataFromSlugId,
        isConversationIdLocked,
        isPostSlugIdLocked,
        createCompactHtmlBody,
        getPolisMetadata,
    };
}

export function useCommonComment() {
    interface GetCommentIdFromCommentSlugIdProps {
        db: PostgresJsDatabase;
        commentSlugId: string;
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
        const queryOpinion = (dbInstance: typeof db) =>
            dbInstance
                .select({
                    opinionId: opinionTable.id,
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

        // Try read replica first
        let opinionTableResponse = await queryOpinion(db);

        // If not found on replica, try primary (handles replication lag after creation)
        if (opinionTableResponse.length === 0) {
            if ("$primary" in db) {
                opinionTableResponse = await queryOpinion(
                    db.$primary as PostgresJsDatabase,
                );
            }
        }

        if (opinionTableResponse.length === 0) {
            throw httpErrors.internalServerError(
                "Failed to locate conversation slug ID from opinion slug ID: " +
                    opinionSlugId,
            );
        }

        if (opinionTableResponse.length > 1) {
            log.warn(
                `Multiple opinions found with slug ID ${opinionSlugId}, using first result`,
            );
        }

        return {
            opinionId: opinionTableResponse[0].opinionId,
            conversationSlugId: opinionTableResponse[0].conversationSlugId,
            conversationId: opinionTableResponse[0].conversationId,
            isOpinionDeleted:
                opinionTableResponse[0].opinionCurrentContentId == null,
        };
    }

    return {
        getOpinionMetadataFromOpinionSlugId,
        getCommentIdFromCommentSlugId,
    };
}
