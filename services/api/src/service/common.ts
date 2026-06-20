import {
    conversationViewSnapshotTable,
    conversationContentTable,
    conversationTable,
    userTable,
    opinionTable,
    conversationModerationTable,
    organizationTable,
    maxdiffItemTable,
    projectOrganizationOwnershipTable,
    conversationLanguageSettingTable,
} from "@/shared-backend/schema.js";
import { toUnionUndefined } from "@/shared/shared.js";
import type {
    ConversationMetadata,
    ExtendedConversationPayload,
    ExtendedConversationPerSlugId,
    ExtendedConversation,
    ConversationType,
    FeedSortAlgorithm,
    EventSlug,
    ParticipationMode,
} from "@/shared/types/zod.js";
import { zodExternalSourceConfig } from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import {
    eq,
    desc,
    SQL,
    and,
    sql,
    isNotNull,
    inArray,
    isNull,
    or,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import sanitizeHtml from "sanitize-html";
import { createPostModerationPropertyObject } from "./moderation.js";
import { getUserMutePreferences } from "./muteUser.js";
import { imagePathToUrl } from "@/utils/organizationLogic.js";
import { getConversationEngagementScore } from "./recommendationSystem.js";
import { log } from "@/app.js";
import { alias } from "drizzle-orm/pg-core";
import {
    conversationLanguageSettingToOutput,
    normalizeConversationLanguageSettingRow,
} from "./conversationLanguage.js";
import {
    DEFAULT_CONVERSATION_MULTILINGUAL_SETTING,
    getConversationMultilingualSettingsByConversationId,
} from "./conversationMultilingual.js";

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
    interface ConversationDisplayCounts {
        conversationId: number;
        conversationViewSnapshotId: number;
        opinionCount: number;
        voteCount: number;
        participantCount: number;
        totalOpinionCount: number;
        totalVoteCount: number;
        totalParticipantCount: number;
        moderatedOpinionCount: number;
        hiddenOpinionCount: number;
    }

    async function fetchLatestConversationViewSnapshotCountsByConversationId({
        db,
        conversationIds,
    }: {
        db: PostgresJsDatabase;
        conversationIds: number[];
    }): Promise<Map<number, ConversationDisplayCounts>> {
        const uniqueConversationIds = Array.from(new Set(conversationIds));
        if (uniqueConversationIds.length === 0) {
            return new Map();
        }

        const snapshotRows = await db
            .selectDistinctOn([conversationViewSnapshotTable.conversationId], {
                conversationId: conversationViewSnapshotTable.conversationId,
                conversationViewSnapshotId: conversationViewSnapshotTable.id,
                opinionCount: conversationViewSnapshotTable.opinionCount,
                voteCount: conversationViewSnapshotTable.voteCount,
                participantCount:
                    conversationViewSnapshotTable.participantCount,
                totalOpinionCount:
                    conversationViewSnapshotTable.totalOpinionCount,
                totalVoteCount: conversationViewSnapshotTable.totalVoteCount,
                totalParticipantCount:
                    conversationViewSnapshotTable.totalParticipantCount,
                moderatedOpinionCount:
                    conversationViewSnapshotTable.moderatedOpinionCount,
                hiddenOpinionCount:
                    conversationViewSnapshotTable.hiddenOpinionCount,
            })
            .from(conversationViewSnapshotTable)
            .where(
                and(
                    inArray(
                        conversationViewSnapshotTable.conversationId,
                        uniqueConversationIds,
                    ),
                    isNotNull(conversationViewSnapshotTable.activatedAt),
                ),
            )
            .orderBy(
                conversationViewSnapshotTable.conversationId,
                desc(conversationViewSnapshotTable.createdAt),
                desc(conversationViewSnapshotTable.id),
            );

        const latestCountsByConversationId = new Map<
            number,
            ConversationDisplayCounts
        >();
        for (const row of snapshotRows) {
            if (!latestCountsByConversationId.has(row.conversationId)) {
                latestCountsByConversationId.set(row.conversationId, row);
            }
        }

        return latestCountsByConversationId;
    }

    function requireConversationDisplayCounts({
        countsByConversationId,
        conversationId,
    }: {
        countsByConversationId: Map<number, ConversationDisplayCounts>;
        conversationId: number;
    }): ConversationDisplayCounts {
        const counts = countsByConversationId.get(conversationId);
        if (counts === undefined) {
            throw new Error(
                `Missing conversation view snapshot counts for conversation ${String(conversationId)}`,
            );
        }
        return counts;
    }

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
                    eq(
                        conversationModerationTable.conversationId,
                        conversationId,
                    ),
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

        const personalOrganizationUserTable = alias(
            userTable,
            "personalOrganizationUser",
        );

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
                authorName: personalOrganizationUserTable.username,
                organizationName: organizationTable.displayName,
                organizationSlug: organizationTable.slug,
                organizationImagePath: organizationTable.imagePath,
                organizationWebsiteUrl: organizationTable.websiteUrl,
                organizationIsFullImagePath: organizationTable.isFullImagePath,
                organizationDescription: organizationTable.description,
                isIndexed: conversationTable.isIndexed,
                aiLabelingEnabled: conversationTable.aiLabelingEnabled,
                preferredOpinionGroupCount:
                    conversationTable.preferredOpinionGroupCount,
                participationMode: conversationTable.participationMode,
                conversationType: conversationTable.conversationType,
                isClosed: conversationTable.isClosed,
                isEdited: conversationTable.isEdited,
                requiresEventTicket: conversationTable.requiresEventTicket,
                externalSourceConfig: conversationTable.externalSourceConfig,
                languageSettingMode: conversationLanguageSettingTable.mode,
                languageCode: conversationLanguageSettingTable.languageCode,
                detectedLanguageCode:
                    conversationLanguageSettingTable.detectedLanguageCode,
                detectedSourceLanguageCode:
                    conversationLanguageSettingTable.detectedSourceLanguageCode,
                detectedRawLanguageCode:
                    conversationLanguageSettingTable.detectedRawLanguageCode,
                detectedRawLanguageProvider:
                    conversationLanguageSettingTable.detectedRawLanguageProvider,
                detectionConfidence:
                    conversationLanguageSettingTable.detectionConfidence,
                detectedFromCorpusHash:
                    conversationLanguageSettingTable.detectedFromCorpusHash,
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
            .innerJoin(
                projectOrganizationOwnershipTable,
                eq(
                    projectOrganizationOwnershipTable.projectId,
                    conversationTable.projectId,
                ),
            )
            .innerJoin(
                organizationTable,
                eq(
                    organizationTable.id,
                    projectOrganizationOwnershipTable.organizationId,
                ),
            )
            .leftJoin(
                personalOrganizationUserTable,
                eq(
                    personalOrganizationUserTable.id,
                    organizationTable.autoProvisionedForUserId,
                ),
            )
            .leftJoin(
                conversationModerationTable,
                eq(
                    conversationModerationTable.conversationId,
                    conversationTable.id,
                ),
            )
            .leftJoin(
                conversationLanguageSettingTable,
                eq(
                    conversationLanguageSettingTable.conversationId,
                    conversationTable.id,
                ),
            )
            // whereClause = and(whereClause, lt(postTable.createdAt, lastCreatedAt));
            .where(
                and(
                    where,
                    or(
                        isNull(organizationTable.autoProvisionedForUserId),
                        eq(personalOrganizationUserTable.isDeleted, false),
                    ),
                ),
            )
            .orderBy(
                desc(conversationTable.createdAt),
                desc(conversationTable.id),
            );
        if (limit !== undefined) {
            postItems = await postItemsQuery.$dynamic().limit(limit);
        } else {
            postItems = await postItemsQuery;
        }

        const latestViewSnapshotCountsByConversationId =
            await fetchLatestConversationViewSnapshotCountsByConversationId({
                db,
                conversationIds: postItems.map(
                    (postItem) => postItem.conversationId,
                ),
            });
        const multilingualSettingsByConversationId =
            await getConversationMultilingualSettingsByConversationId({
                db,
                conversationIds: postItems.map(
                    (postItem) => postItem.conversationId,
                ),
            });

        if (sortAlgorithm == "following") {
            postItems.sort((post1, post2) => {
                const counts1 = requireConversationDisplayCounts({
                    countsByConversationId:
                        latestViewSnapshotCountsByConversationId,
                    conversationId: post1.conversationId,
                });
                const counts2 = requireConversationDisplayCounts({
                    countsByConversationId:
                        latestViewSnapshotCountsByConversationId,
                    conversationId: post2.conversationId,
                });
                const score1 = getConversationEngagementScore({
                    createdAt: post1.createdAt,
                    lastReactedAt: post1.lastReactedAt,
                    opinionCount: counts1.opinionCount,
                    voteCount: counts1.voteCount,
                    participantCount: counts1.participantCount,
                });

                const score2 = getConversationEngagementScore({
                    createdAt: post2.createdAt,
                    lastReactedAt: post2.lastReactedAt,
                    opinionCount: counts2.opinionCount,
                    voteCount: counts2.voteCount,
                    participantCount: counts2.participantCount,
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
            const displayCounts = requireConversationDisplayCounts({
                countsByConversationId:
                    latestViewSnapshotCountsByConversationId,
                conversationId: postItem.conversationId,
            });

            const metadata: ConversationMetadata = {
                conversationSlugId: postItem.slugId,
                conversationViewSnapshotId:
                    displayCounts.conversationViewSnapshotId,
                moderation: moderationProperties,
                createdAt: postItem.createdAt,
                updatedAt: postItem.isEdited ? postItem.updatedAt : undefined,
                lastReactedAt: postItem.lastReactedAt,
                opinionCount: displayCounts.opinionCount,
                voteCount: displayCounts.voteCount,
                participantCount: displayCounts.participantCount,
                totalOpinionCount: displayCounts.totalOpinionCount,
                totalVoteCount: displayCounts.totalVoteCount,
                totalParticipantCount: displayCounts.totalParticipantCount,
                moderatedOpinionCount: displayCounts.moderatedOpinionCount,
                hiddenOpinionCount: displayCounts.hiddenOpinionCount,
                authorUsername: postItem.authorName ?? postItem.organizationName,
                isIndexed: postItem.isIndexed,
                aiLabelingEnabled: postItem.aiLabelingEnabled,
                preferredOpinionGroupCount: postItem.preferredOpinionGroupCount,
                languageSetting: conversationLanguageSettingToOutput({
                    setting: normalizeConversationLanguageSettingRow(
                        postItem.languageSettingMode === null
                            ? undefined
                            : {
                                  mode: postItem.languageSettingMode,
                                  languageCode: postItem.languageCode,
                                  detectedLanguageCode:
                                      postItem.detectedLanguageCode,
                                  detectedSourceLanguageCode:
                                      postItem.detectedSourceLanguageCode,
                                  detectedRawLanguageCode:
                                      postItem.detectedRawLanguageCode,
                                  detectedRawLanguageProvider:
                                      postItem.detectedRawLanguageProvider,
                                  detectionConfidence:
                                      postItem.detectionConfidence,
                                  detectedFromCorpusHash:
                                      postItem.detectedFromCorpusHash,
                              },
                        ),
                }),
                multilingualSetting:
                    multilingualSettingsByConversationId.get(
                        postItem.conversationId,
                    ) ?? DEFAULT_CONVERSATION_MULTILINGUAL_SETTING,
                participationMode: postItem.participationMode,
                conversationType: postItem.conversationType,
                isClosed: postItem.isClosed,
                isEdited: postItem.isEdited,
                requiresEventTicket: postItem.requiresEventTicket ?? undefined,
                organization:
                    postItem.authorName === null
                        ? (() => {
                              const imageUrl = imagePathToUrl({
                                  imagePath: postItem.organizationImagePath,
                                  isFullImagePath:
                                      postItem.organizationIsFullImagePath,
                                  baseImageServiceUrl,
                              });

                              return {
                                  name: postItem.organizationName,
                                  slug: postItem.organizationSlug,
                                  description:
                                      postItem.organizationDescription ?? "",
                                  ...(postItem.organizationWebsiteUrl === null
                                      ? {}
                                      : {
                                            websiteUrl:
                                                postItem.organizationWebsiteUrl,
                                        }),
                                  ...(imageUrl === undefined ? {} : { imageUrl }),
                              };
                          })()
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
                            isNotNull(maxdiffItemTable.currentContentId),
                            inArray(maxdiffItemTable.lifecycleStatus, [
                                "active",
                                "in_progress",
                            ]),
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
        const latestViewSnapshotCountsByConversationId =
            await fetchLatestConversationViewSnapshotCountsByConversationId({
                db,
                conversationIds: [postTableResponse[0].id],
            });
        const displayCounts = requireConversationDisplayCounts({
            countsByConversationId: latestViewSnapshotCountsByConversationId,
            conversationId: postTableResponse[0].id,
        });

        return {
            contentId: postTableResponse[0].currentContentId,
            id: postTableResponse[0].id,
            participantCount: displayCounts.participantCount,
            voteCount: displayCounts.voteCount,
            opinionCount: displayCounts.opinionCount,
            totalParticipantCount: displayCounts.totalParticipantCount,
            totalVoteCount: displayCounts.totalVoteCount,
            totalOpinionCount: displayCounts.totalOpinionCount,
            moderatedOpinionCount: displayCounts.moderatedOpinionCount,
            hiddenOpinionCount: displayCounts.hiddenOpinionCount,
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
