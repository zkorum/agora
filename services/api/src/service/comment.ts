import { generateRandomSlugId } from "@/crypto.js";
import * as zupassService from "@/service/zupass.js";
import {
    opinionContentTable,
    opinionTable,
    opinionProofTable,
    conversationTable,
    userTable,
    opinionModerationTable,
    polisClusterTable,
    polisClusterOpinionTable,
    polisClusterUserTable,
    polisContentTable,
} from "@/shared-backend/schema.js";
import type { NotificationSSEManager } from "./notificationSSE.js";
import { createOpinionNotification } from "./notification.js";
import {
    updateOpinionCount,
    reconcileConversationCounters,
} from "@/shared-backend/conversationCounters.js";
import { generateClusterTranslationsOnDemand } from "./clusterTranslation.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import type {
    ConversationAnalysis,
    CreateCommentResponse,
    GetOpinionBySlugIdListResponse,
} from "@/shared/types/dto.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    desc,
    eq,
    sql,
    and,
    isNull,
    isNotNull,
    ne,
    SQL,
    inArray,
} from "drizzle-orm";
import type {
    AnalysisOpinionItem,
    AnalysisOpinionItemPerSlugId,
    ModerationReason,
    OpinionItem,
    OpinionItemPerSlugId,
    OpinionModerationAction,
    PolisClusters,
    SlugId,
    PolisKey,
    ClusterStats,
    EventSlug,
} from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import { useCommonComment, useCommonPost } from "./common.js";
import { log } from "@/app.js";
import { createCommentModerationPropertyObject } from "./moderation.js";
import { getUserMutePreferences } from "./muteUser.js";
import * as authUtilService from "@/service/authUtil.js";
import { castVoteForOpinionSlugId } from "./voting.js";
import type { VoteBuffer } from "./voteBuffer.js";
import {
    isSqlOrderByGroupAwareConsensus,
    isSqlOrderByPolisPriority,
    isSqlWhereRepresentative,
    isSqlOrderByRepresentative,
} from "@/utils/sqlLogic.js";
import type { ImportPolisResults } from "@/shared/types/polis.js";
import type {
    OpinionContentIdPerOpinionId,
    OpinionIdPerStatementId,
    StatementIdPerOpinionSlugId,
    UserIdPerParticipantId,
} from "@/utils/dataStructure.js";
import { nowZeroMs } from "@/shared/util.js";
import { processUserGeneratedHtml } from "@/shared-app-api/html.js";
import { alias } from "drizzle-orm/pg-core";

interface GetCommentSlugIdLastCreatedAtProps {
    lastSlugId: string | undefined;
    db: PostgresJsDatabase;
}

export async function getCommentSlugIdLastCreatedAt({
    lastSlugId,
    db,
}: GetCommentSlugIdLastCreatedAtProps): Promise<Date | undefined> {
    let lastCreatedAt;

    if (lastSlugId) {
        const selectResponse = await db
            .select({ createdAt: opinionTable.createdAt })
            .from(opinionTable)
            .where(eq(opinionTable.slugId, lastSlugId));
        if (selectResponse.length == 1) {
            lastCreatedAt = selectResponse[0].createdAt;
        } else {
            // Ignore the slug ID if it cannot be found
        }
    }

    return lastCreatedAt;
}

interface FetchOpinionsProps {
    db: PostgresJsDatabase;
    postSlugId: SlugId;
    personalizationUserId?: string;
    filterTarget: "new" | "moderated" | "hidden" | "discover";
    limit: number;
}

interface FetchOpinionsByPostIdProps {
    db: PostgresJsDatabase;
    postId: number;
    personalizationUserId?: string;
    filterTarget: "new" | "moderated" | "hidden" | "discover";
    limit: number;
}

export async function fetchOpinionsByPostId({
    db,
    postId,
    personalizationUserId,
    filterTarget,
    limit,
}: FetchOpinionsByPostIdProps): Promise<OpinionItemPerSlugId> {
    let whereClause: SQL | undefined = eq(opinionTable.conversationId, postId);
    // isNotNull(opinionTable.currentContentId), // filtering out deleted opinions, this is unecessary because of the use of innerJoin
    let orderByClause = [desc(opinionTable.createdAt)]; // default value, shouldn't be needed but ts doesn't understand how to terminate nested switch
    switch (filterTarget) {
        case "moderated": {
            whereClause = and(
                whereClause,
                ne(opinionModerationTable.moderationAction, "hide"),
                isNotNull(opinionModerationTable.id),
            );
            break;
        }
        case "hidden": {
            whereClause = and(
                whereClause,
                eq(opinionModerationTable.moderationAction, "hide"),
                isNotNull(opinionModerationTable.id),
            );
            break;
        }
        case "new": {
            whereClause = and(whereClause, isNull(opinionModerationTable.id));
            break;
        }
        case "discover": {
            whereClause = and(whereClause, isNull(opinionModerationTable.id));
            orderByClause = isSqlOrderByPolisPriority();
            break;
        }
    }
    const results = await db
        .select({
            // comment payload
            commentSlugId: opinionTable.slugId,
            createdAt: opinionTable.createdAt,
            updatedAt: opinionTable.updatedAt,
            comment: opinionContentTable.content,
            authorId: opinionTable.authorId,
            numParticipants: conversationTable.participantCount,
            numAgrees: opinionTable.numAgrees,
            numDisagrees: opinionTable.numDisagrees,
            numPasses: opinionTable.numPasses,
            username: userTable.username,
            isSeed: opinionTable.isSeed,
            moderationAction: opinionModerationTable.moderationAction,
            moderationExplanation: opinionModerationTable.moderationExplanation,
            moderationReason: opinionModerationTable.moderationReason,
            moderationCreatedAt: opinionModerationTable.createdAt,
            moderationUpdatedAt: opinionModerationTable.updatedAt,
        })
        .from(opinionTable)
        .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .innerJoin(conversationTable, eq(conversationTable.id, postId))
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.id, opinionTable.currentContentId),
        )
        .leftJoin(
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, opinionTable.id),
        )
        .orderBy(...orderByClause)
        .where(and(whereClause, eq(userTable.isDeleted, false)))
        .limit(limit); // TODO: infinite virtual scrolling instead

    const opinionItemMap: OpinionItemPerSlugId = new Map<string, OpinionItem>();
    results.map((opinionResponse) => {
        const moderationProperties = createCommentModerationPropertyObject(
            opinionResponse.moderationAction,
            opinionResponse.moderationExplanation,
            opinionResponse.moderationReason,
            opinionResponse.moderationCreatedAt,
            opinionResponse.moderationUpdatedAt,
        );

        const item: OpinionItem = {
            opinion: opinionResponse.comment,
            opinionSlugId: opinionResponse.commentSlugId,
            createdAt: opinionResponse.createdAt,
            numParticipants: opinionResponse.numParticipants,
            numDisagrees: opinionResponse.numDisagrees,
            numAgrees: opinionResponse.numAgrees,
            numPasses: opinionResponse.numPasses,
            updatedAt: opinionResponse.updatedAt,
            username: opinionResponse.username,
            moderation: moderationProperties,
            isSeed: opinionResponse.isSeed,
        };
        opinionItemMap.set(opinionResponse.commentSlugId, item);
    });

    if (personalizationUserId) {
        const mutedUserItems = await getUserMutePreferences({
            db: db,
            userId: personalizationUserId,
        });

        opinionItemMap.forEach((opinionItem, opinionSlugId, map) => {
            if (
                mutedUserItems.some(
                    (muteItem) => muteItem.username === opinionItem.username,
                )
            ) {
                map.delete(opinionSlugId);
            }
        });
    }

    return opinionItemMap;
}

export async function fetchOpinionsByPostSlugId({
    db,
    postSlugId,
    personalizationUserId,
    filterTarget,
    limit,
}: FetchOpinionsProps): Promise<OpinionItemPerSlugId> {
    const postId = await getPostIdFromPostSlugId(db, postSlugId);
    return await fetchOpinionsByPostId({
        db,
        postId,
        personalizationUserId,
        filterTarget,
        limit,
    });
}

interface FetchAnalysisOpinionsByPostIdProps {
    db: PostgresJsDatabase;
    postId: number;
    personalizationUserId?: string;
    filterTarget: "consensus" | "controversial" | "representative";
    clusterKey?: PolisKey;
    limit: number;
}

export async function fetchAnalysisOpinionsByPostId({
    db,
    postId,
    personalizationUserId,
    filterTarget,
    clusterKey,
    limit,
}: FetchAnalysisOpinionsByPostIdProps): Promise<AnalysisOpinionItemPerSlugId> {
    // Cluster table aliases for joining
    const polisClusterTableAlias0 = alias(polisClusterTable, "cluster_0");
    const polisClusterTableAlias1 = alias(polisClusterTable, "cluster_1");
    const polisClusterTableAlias2 = alias(polisClusterTable, "cluster_2");
    const polisClusterTableAlias3 = alias(polisClusterTable, "cluster_3");
    const polisClusterTableAlias4 = alias(polisClusterTable, "cluster_4");
    const polisClusterTableAlias5 = alias(polisClusterTable, "cluster_5");

    // Cluster opinion table aliases for representative opinions
    const polisClusterOpinionTableAlias0 = alias(
        polisClusterOpinionTable,
        "cluster_opinion_0",
    );
    const polisClusterOpinionTableAlias1 = alias(
        polisClusterOpinionTable,
        "cluster_opinion_1",
    );
    const polisClusterOpinionTableAlias2 = alias(
        polisClusterOpinionTable,
        "cluster_opinion_2",
    );
    const polisClusterOpinionTableAlias3 = alias(
        polisClusterOpinionTable,
        "cluster_opinion_3",
    );
    const polisClusterOpinionTableAlias4 = alias(
        polisClusterOpinionTable,
        "cluster_opinion_4",
    );
    const polisClusterOpinionTableAlias5 = alias(
        polisClusterOpinionTable,
        "cluster_opinion_5",
    );

    let whereClause: SQL | undefined = eq(opinionTable.conversationId, postId);
    let orderByClause = [desc(opinionTable.createdAt)]; // default value

    switch (filterTarget) {
        case "consensus": {
            whereClause = and(whereClause, isNull(opinionModerationTable.id));
            orderByClause = isSqlOrderByGroupAwareConsensus();
            break;
        }
        case "controversial": {
            whereClause = and(whereClause, isNull(opinionModerationTable.id));
            orderByClause = [desc(opinionTable.polisDivisiveness)];
            break;
        }
        case "representative": {
            if (clusterKey === undefined) {
                throw httpErrors.badRequest(
                    "Representative opinions require a cluster key",
                );
            }
            whereClause = and(whereClause, isNull(opinionModerationTable.id));
            // Filter and sort by the specific cluster's representative scores
            switch (clusterKey) {
                case "0": {
                    whereClause = and(
                        whereClause,
                        isSqlWhereRepresentative({
                            idColumn: polisClusterOpinionTableAlias0.id,
                            repfulColumn:
                                polisClusterOpinionTableAlias0.agreementType,
                        }),
                    );
                    orderByClause = isSqlOrderByRepresentative({
                        probabilityAgreementColumn:
                            polisClusterOpinionTableAlias0.probabilityAgreement,
                    });
                    break;
                }
                case "1": {
                    whereClause = and(
                        whereClause,
                        isSqlWhereRepresentative({
                            idColumn: polisClusterOpinionTableAlias1.id,
                            repfulColumn:
                                polisClusterOpinionTableAlias1.agreementType,
                        }),
                    );
                    orderByClause = isSqlOrderByRepresentative({
                        probabilityAgreementColumn:
                            polisClusterOpinionTableAlias1.probabilityAgreement,
                    });
                    break;
                }
                case "2": {
                    whereClause = and(
                        whereClause,
                        isSqlWhereRepresentative({
                            idColumn: polisClusterOpinionTableAlias2.id,
                            repfulColumn:
                                polisClusterOpinionTableAlias2.agreementType,
                        }),
                    );
                    orderByClause = isSqlOrderByRepresentative({
                        probabilityAgreementColumn:
                            polisClusterOpinionTableAlias2.probabilityAgreement,
                    });
                    break;
                }
                case "3": {
                    whereClause = and(
                        whereClause,
                        isSqlWhereRepresentative({
                            idColumn: polisClusterOpinionTableAlias3.id,
                            repfulColumn:
                                polisClusterOpinionTableAlias3.agreementType,
                        }),
                    );
                    orderByClause = isSqlOrderByRepresentative({
                        probabilityAgreementColumn:
                            polisClusterOpinionTableAlias3.probabilityAgreement,
                    });
                    break;
                }
                case "4": {
                    whereClause = and(
                        whereClause,
                        isSqlWhereRepresentative({
                            idColumn: polisClusterOpinionTableAlias4.id,
                            repfulColumn:
                                polisClusterOpinionTableAlias4.agreementType,
                        }),
                    );
                    orderByClause = isSqlOrderByRepresentative({
                        probabilityAgreementColumn:
                            polisClusterOpinionTableAlias4.probabilityAgreement,
                    });
                    break;
                }
                case "5": {
                    whereClause = and(
                        whereClause,
                        isSqlWhereRepresentative({
                            idColumn: polisClusterOpinionTableAlias5.id,
                            repfulColumn:
                                polisClusterOpinionTableAlias5.agreementType,
                        }),
                    );
                    orderByClause = isSqlOrderByRepresentative({
                        probabilityAgreementColumn:
                            polisClusterOpinionTableAlias5.probabilityAgreement,
                    });
                    break;
                }
            }
            break;
        }
    }

    const results = await db
        .select({
            // Base comment fields
            commentSlugId: opinionTable.slugId,
            createdAt: opinionTable.createdAt,
            updatedAt: opinionTable.updatedAt,
            comment: opinionContentTable.content,
            authorId: opinionTable.authorId,
            numParticipants: conversationTable.participantCount,
            numAgrees: opinionTable.numAgrees,
            numDisagrees: opinionTable.numDisagrees,
            numPasses: opinionTable.numPasses,
            username: userTable.username,
            isSeed: opinionTable.isSeed,
            moderationAction: opinionModerationTable.moderationAction,
            moderationExplanation: opinionModerationTable.moderationExplanation,
            moderationReason: opinionModerationTable.moderationReason,
            moderationCreatedAt: opinionModerationTable.createdAt,
            moderationUpdatedAt: opinionModerationTable.updatedAt,
            // Cluster 0 fields
            polisCluster0Id: opinionTable.polisCluster0Id,
            polisCluster0Key: polisClusterTableAlias0.key,
            polisCluster0NumUsers: polisClusterTableAlias0.numUsers,
            polisCluster0NumAgrees: opinionTable.polisCluster0NumAgrees,
            polisCluster0NumDisagrees: opinionTable.polisCluster0NumDisagrees,
            polisCluster0NumPasses: opinionTable.polisCluster0NumPasses,
            // Cluster 1 fields
            polisCluster1Id: opinionTable.polisCluster1Id,
            polisCluster1Key: polisClusterTableAlias1.key,
            polisCluster1NumUsers: polisClusterTableAlias1.numUsers,
            polisCluster1NumAgrees: opinionTable.polisCluster1NumAgrees,
            polisCluster1NumDisagrees: opinionTable.polisCluster1NumDisagrees,
            polisCluster1NumPasses: opinionTable.polisCluster1NumPasses,
            // Cluster 2 fields
            polisCluster2Id: opinionTable.polisCluster2Id,
            polisCluster2Key: polisClusterTableAlias2.key,
            polisCluster2NumUsers: polisClusterTableAlias2.numUsers,
            polisCluster2NumAgrees: opinionTable.polisCluster2NumAgrees,
            polisCluster2NumDisagrees: opinionTable.polisCluster2NumDisagrees,
            polisCluster2NumPasses: opinionTable.polisCluster2NumPasses,
            // Cluster 3 fields
            polisCluster3Id: opinionTable.polisCluster3Id,
            polisCluster3Key: polisClusterTableAlias3.key,
            polisCluster3NumUsers: polisClusterTableAlias3.numUsers,
            polisCluster3NumAgrees: opinionTable.polisCluster3NumAgrees,
            polisCluster3NumDisagrees: opinionTable.polisCluster3NumDisagrees,
            polisCluster3NumPasses: opinionTable.polisCluster3NumPasses,
            // Cluster 4 fields
            polisCluster4Id: opinionTable.polisCluster4Id,
            polisCluster4Key: polisClusterTableAlias4.key,
            polisCluster4NumUsers: polisClusterTableAlias4.numUsers,
            polisCluster4NumAgrees: opinionTable.polisCluster4NumAgrees,
            polisCluster4NumDisagrees: opinionTable.polisCluster4NumDisagrees,
            polisCluster4NumPasses: opinionTable.polisCluster4NumPasses,
            // Cluster 5 fields
            polisCluster5Id: opinionTable.polisCluster5Id,
            polisCluster5Key: polisClusterTableAlias5.key,
            polisCluster5NumUsers: polisClusterTableAlias5.numUsers,
            polisCluster5NumAgrees: opinionTable.polisCluster5NumAgrees,
            polisCluster5NumDisagrees: opinionTable.polisCluster5NumDisagrees,
            polisCluster5NumPasses: opinionTable.polisCluster5NumPasses,
            // Opinion author's cluster
            opinionAuthorPolisClusterId: polisClusterUserTable.polisClusterId,
        })
        .from(opinionTable)
        .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .innerJoin(conversationTable, eq(conversationTable.id, postId))
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.id, opinionTable.currentContentId),
        )
        .leftJoin(
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, opinionTable.id),
        )
        // Join cluster tables for cluster stats
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
        // Join cluster opinion tables for representative opinion scores
        .leftJoin(
            polisClusterOpinionTableAlias0,
            and(
                eq(
                    polisClusterOpinionTableAlias0.polisClusterId,
                    opinionTable.polisCluster0Id,
                ),
                eq(polisClusterOpinionTableAlias0.opinionId, opinionTable.id),
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias1,
            and(
                eq(
                    polisClusterOpinionTableAlias1.polisClusterId,
                    opinionTable.polisCluster1Id,
                ),
                eq(polisClusterOpinionTableAlias1.opinionId, opinionTable.id),
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias2,
            and(
                eq(
                    polisClusterOpinionTableAlias2.polisClusterId,
                    opinionTable.polisCluster2Id,
                ),
                eq(polisClusterOpinionTableAlias2.opinionId, opinionTable.id),
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias3,
            and(
                eq(
                    polisClusterOpinionTableAlias3.polisClusterId,
                    opinionTable.polisCluster3Id,
                ),
                eq(polisClusterOpinionTableAlias3.opinionId, opinionTable.id),
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias4,
            and(
                eq(
                    polisClusterOpinionTableAlias4.polisClusterId,
                    opinionTable.polisCluster4Id,
                ),
                eq(polisClusterOpinionTableAlias4.opinionId, opinionTable.id),
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias5,
            and(
                eq(
                    polisClusterOpinionTableAlias5.polisClusterId,
                    opinionTable.polisCluster5Id,
                ),
                eq(polisClusterOpinionTableAlias5.opinionId, opinionTable.id),
            ),
        )
        // Join to get current polis content
        .leftJoin(
            polisContentTable,
            eq(polisContentTable.id, conversationTable.currentPolisContentId),
        )
        // Join to get opinion author's cluster
        .leftJoin(
            polisClusterUserTable,
            and(
                eq(polisClusterUserTable.polisContentId, polisContentTable.id),
                eq(polisClusterUserTable.userId, opinionTable.authorId),
            ),
        )
        .orderBy(...orderByClause)
        .where(and(whereClause, eq(userTable.isDeleted, false)))
        .limit(limit);

    const opinionItemMap: AnalysisOpinionItemPerSlugId = new Map<
        string,
        AnalysisOpinionItem
    >();
    results.map((result) => {
        const moderationProperties = createCommentModerationPropertyObject(
            result.moderationAction,
            result.moderationExplanation,
            result.moderationReason,
            result.moderationCreatedAt,
            result.moderationUpdatedAt,
        );

        // Build cluster stats array
        const clustersStats: ClusterStats[] = [];

        if (
            result.polisCluster0Key !== null &&
            result.polisCluster0NumUsers !== null &&
            result.polisCluster0NumAgrees !== null &&
            result.polisCluster0NumDisagrees !== null &&
            result.polisCluster0NumPasses !== null
        ) {
            clustersStats.push({
                key: result.polisCluster0Key,
                isAuthorInCluster:
                    result.opinionAuthorPolisClusterId ===
                    result.polisCluster0Id,
                numUsers: result.polisCluster0NumUsers,
                numAgrees: result.polisCluster0NumAgrees,
                numDisagrees: result.polisCluster0NumDisagrees,
                numPasses: result.polisCluster0NumPasses,
            });
        }

        if (
            result.polisCluster1Key !== null &&
            result.polisCluster1NumUsers !== null &&
            result.polisCluster1NumAgrees !== null &&
            result.polisCluster1NumDisagrees !== null &&
            result.polisCluster1NumPasses !== null
        ) {
            clustersStats.push({
                key: result.polisCluster1Key,
                isAuthorInCluster:
                    result.opinionAuthorPolisClusterId ===
                    result.polisCluster1Id,
                numUsers: result.polisCluster1NumUsers,
                numAgrees: result.polisCluster1NumAgrees,
                numDisagrees: result.polisCluster1NumDisagrees,
                numPasses: result.polisCluster1NumPasses,
            });
        }

        if (
            result.polisCluster2Key !== null &&
            result.polisCluster2NumUsers !== null &&
            result.polisCluster2NumAgrees !== null &&
            result.polisCluster2NumDisagrees !== null &&
            result.polisCluster2NumPasses !== null
        ) {
            clustersStats.push({
                key: result.polisCluster2Key,
                isAuthorInCluster:
                    result.opinionAuthorPolisClusterId ===
                    result.polisCluster2Id,
                numUsers: result.polisCluster2NumUsers,
                numAgrees: result.polisCluster2NumAgrees,
                numDisagrees: result.polisCluster2NumDisagrees,
                numPasses: result.polisCluster2NumPasses,
            });
        }

        if (
            result.polisCluster3Key !== null &&
            result.polisCluster3NumUsers !== null &&
            result.polisCluster3NumAgrees !== null &&
            result.polisCluster3NumDisagrees !== null &&
            result.polisCluster3NumPasses !== null
        ) {
            clustersStats.push({
                key: result.polisCluster3Key,
                isAuthorInCluster:
                    result.opinionAuthorPolisClusterId ===
                    result.polisCluster3Id,
                numUsers: result.polisCluster3NumUsers,
                numAgrees: result.polisCluster3NumAgrees,
                numDisagrees: result.polisCluster3NumDisagrees,
                numPasses: result.polisCluster3NumPasses,
            });
        }

        if (
            result.polisCluster4Key !== null &&
            result.polisCluster4NumUsers !== null &&
            result.polisCluster4NumAgrees !== null &&
            result.polisCluster4NumDisagrees !== null &&
            result.polisCluster4NumPasses !== null
        ) {
            clustersStats.push({
                key: result.polisCluster4Key,
                isAuthorInCluster:
                    result.opinionAuthorPolisClusterId ===
                    result.polisCluster4Id,
                numUsers: result.polisCluster4NumUsers,
                numAgrees: result.polisCluster4NumAgrees,
                numDisagrees: result.polisCluster4NumDisagrees,
                numPasses: result.polisCluster4NumPasses,
            });
        }

        if (
            result.polisCluster5Key !== null &&
            result.polisCluster5NumUsers !== null &&
            result.polisCluster5NumAgrees !== null &&
            result.polisCluster5NumDisagrees !== null &&
            result.polisCluster5NumPasses !== null
        ) {
            clustersStats.push({
                key: result.polisCluster5Key,
                isAuthorInCluster:
                    result.opinionAuthorPolisClusterId ===
                    result.polisCluster5Id,
                numUsers: result.polisCluster5NumUsers,
                numAgrees: result.polisCluster5NumAgrees,
                numDisagrees: result.polisCluster5NumDisagrees,
                numPasses: result.polisCluster5NumPasses,
            });
        }

        const item: AnalysisOpinionItem = {
            opinion: result.comment,
            opinionSlugId: result.commentSlugId,
            createdAt: result.createdAt,
            numParticipants: result.numParticipants,
            numDisagrees: result.numDisagrees,
            numAgrees: result.numAgrees,
            numPasses: result.numPasses,
            updatedAt: result.updatedAt,
            username: result.username,
            moderation: moderationProperties,
            isSeed: result.isSeed,
            clustersStats: clustersStats,
        };
        opinionItemMap.set(result.commentSlugId, item);
    });

    if (personalizationUserId) {
        const mutedUserItems = await getUserMutePreferences({
            db: db,
            userId: personalizationUserId,
        });

        opinionItemMap.forEach((opinionItem, opinionSlugId, map) => {
            if (
                mutedUserItems.some(
                    (muteItem) => muteItem.username === opinionItem.username,
                )
            ) {
                map.delete(opinionSlugId);
            }
        });
    }

    return opinionItemMap;
}

interface FetchAnalysisOpinionsByPostSlugIdProps {
    db: PostgresJsDatabase;
    postSlugId: SlugId;
    personalizationUserId?: string;
    filterTarget: "consensus" | "controversial" | "representative";
    clusterKey?: PolisKey;
    limit: number;
}

export async function fetchAnalysisOpinionsByPostSlugId({
    db,
    postSlugId,
    personalizationUserId,
    filterTarget,
    clusterKey,
    limit,
}: FetchAnalysisOpinionsByPostSlugIdProps): Promise<AnalysisOpinionItemPerSlugId> {
    const postId = await getPostIdFromPostSlugId(db, postSlugId);
    return await fetchAnalysisOpinionsByPostId({
        db,
        postId,
        personalizationUserId,
        filterTarget,
        clusterKey,
        limit,
    });
}

interface FetchOpinionsByOpinionSlugIdListProps {
    db: PostgresJsDatabase;
    opinionSlugIdList: SlugId[];
}

export async function fetchOpinionsByOpinionSlugIdList({
    db,
    opinionSlugIdList,
}: FetchOpinionsByOpinionSlugIdListProps): Promise<GetOpinionBySlugIdListResponse> {
    const opinionItemList: OpinionItem[] = [];

    for (const opinionSlugId of opinionSlugIdList) {
        const results = await db
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
                conversationTable,
                eq(conversationTable.id, opinionTable.conversationId),
            )
            .innerJoin(
                opinionContentTable,
                eq(opinionContentTable.id, opinionTable.currentContentId),
            )
            .leftJoin(
                opinionModerationTable,
                eq(opinionModerationTable.opinionId, opinionTable.id),
            )
            .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
            // TODO: join with cluster tables
            .orderBy(desc(opinionTable.createdAt))
            .where(
                and(
                    eq(opinionTable.slugId, opinionSlugId),
                    eq(userTable.isDeleted, false),
                ),
            );

        results.map((commentResponse) => {
            const moderationProperties = createCommentModerationPropertyObject(
                commentResponse.moderationAction,
                commentResponse.moderationExplanation,
                commentResponse.moderationReason,
                commentResponse.moderationCreatedAt,
                commentResponse.moderationUpdatedAt,
            );

            const item: OpinionItem = {
                opinion: commentResponse.comment,
                opinionSlugId: commentResponse.commentSlugId,
                createdAt: commentResponse.createdAt,
                updatedAt: commentResponse.updatedAt,
                numParticipants: commentResponse.numParticipants,
                numDisagrees: commentResponse.numDisagrees,
                numAgrees: commentResponse.numAgrees,
                numPasses: commentResponse.numPasses,
                username: commentResponse.username,
                moderation: moderationProperties,
                isSeed: commentResponse.isSeed,
            };
            opinionItemList.push(item);
        });
    }

    return opinionItemList;
}

export async function fetchAnalysisByConversationSlugId({
    db,
    conversationSlugId,
    personalizationUserId,
    displayLanguage = "en",
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    personalizationUserId?: string;
    displayLanguage?: string;
    googleCloudCredentials?: GoogleCloudCredentials;
}): Promise<ConversationAnalysis> {
    const { getPolisMetadata } = useCommonPost();
    const polisMetadata = await getPolisMetadata({
        db: db,
        conversationSlugId,
        personalizationUserId,
        displayLanguage,
    });
    if (polisMetadata === undefined) {
        return {
            polisContentId: undefined,
            consensus: [],
            controversial: [],
            clusters: {},
        };
    }

    // Phase 2: Calling external APIs for conversationId
    // If translations are requested (non-English), trigger on-demand translation
    // generation for any missing translations in the background
    if (
        displayLanguage !== "en" &&
        polisMetadata.missingTranslations.size > 0
    ) {
        if (googleCloudCredentials !== undefined) {
            log.info(
                `[Phase 2] Calling Google Cloud Translation API for conversationSlugId=${conversationSlugId}, displayLanguage=${displayLanguage}, missingTranslationsCount=${String(polisMetadata.missingTranslations.size)}`,
            );
            // Fire and forget - don't block the response on translation generation
            // The translations will be available on the next request
            generateClusterTranslationsOnDemand(
                db,
                polisMetadata.missingTranslations,
                displayLanguage,
                googleCloudCredentials,
                "en",
            ).catch((err: unknown) => {
                log.error(
                    err,
                    `Failed to generate translations for ${conversationSlugId}`,
                );
            });
        } else {
            log.warn(
                `[Phase 2] Skipping Google Cloud Translation API call for conversationSlugId=${conversationSlugId}, displayLanguage=${displayLanguage}: Google Cloud credentials not configured (GOOGLE_CLOUD_* environment variables missing)`,
            );
        }
    }
    const consensusOpinions = await fetchAnalysisOpinionsByPostSlugId({
        db: db,
        postSlugId: conversationSlugId,
        filterTarget: "consensus",
        personalizationUserId,
        limit: 3000,
    });
    const controversialOpinions = await fetchAnalysisOpinionsByPostSlugId({
        db: db,
        postSlugId: conversationSlugId,
        filterTarget: "controversial",
        personalizationUserId,
        limit: 3000,
    });
    const polisClusters: PolisClusters = {};
    for (const [key, clusterMetadata] of Object.entries(
        polisMetadata.clustersMetadata,
    )) {
        // without casting, record key is otherwise always a string
        //
        const clusterKey = key as keyof typeof polisMetadata.clustersMetadata;
        const representativeOpinions = await fetchAnalysisOpinionsByPostSlugId({
            db: db,
            postSlugId: conversationSlugId,
            filterTarget: "representative",
            clusterKey: clusterKey,
            personalizationUserId,
            limit: 50,
        });
        // Destructure to exclude 'id' field since the response schema doesn't expect it
        const { id: _id, ...clusterWithoutId } = clusterMetadata;
        polisClusters[clusterKey] = {
            ...clusterWithoutId,
            representative: Array.from(representativeOpinions.values()),
        };
    }
    const result: ConversationAnalysis = {
        polisContentId: polisMetadata.polisContentId,
        consensus: Array.from(consensusOpinions.values()),
        controversial: Array.from(controversialOpinions.values()),
        clusters: polisClusters,
    };
    return result;
}

async function getPostIdFromPostSlugId(
    db: PostgresJsDatabase,
    postSlugId: string,
): Promise<number> {
    const postTableResponse = await db
        .select({
            id: conversationTable.id,
        })
        .from(conversationTable)
        .where(eq(conversationTable.slugId, postSlugId));
    if (postTableResponse.length != 1) {
        throw httpErrors.notFound(
            "Failed to locate post slug ID: " + postSlugId,
        );
    }

    const postId = postTableResponse[0].id;
    return postId;
}

interface PostNewOpinionProps {
    db: PostgresJsDatabase;
    voteBuffer: VoteBuffer;
    commentBody: string;
    conversationSlugId: string;
    didWrite: string;
    proof: string;
    userAgent: string;
    now: Date;
    isSeed: boolean;
    notificationSSEManager?: NotificationSSEManager;
    conversationMetadata?: {
        conversationId: number;
        conversationContentId: number;
        conversationAuthorId: string;
        conversationIsIndexed: boolean;
        conversationIsLoginRequired: boolean;
        requiresEventTicket: EventSlug | null;
    };
}

export async function postNewOpinion({
    db,
    voteBuffer,
    commentBody,
    conversationSlugId,
    didWrite,
    proof,
    userAgent,
    now,
    isSeed,
    notificationSSEManager,
    conversationMetadata,
}: PostNewOpinionProps): Promise<CreateCommentResponse> {
    // Use provided metadata if available (for seed opinions), otherwise fetch from DB
    let conversationId: number;
    let conversationContentId: number | null;
    let conversationAuthorId: string;
    let conversationIsLoginRequired: boolean;
    let requiresEventTicket: EventSlug | null;

    if (conversationMetadata) {
        conversationId = conversationMetadata.conversationId;
        conversationContentId = conversationMetadata.conversationContentId;
        conversationAuthorId = conversationMetadata.conversationAuthorId;
        conversationIsLoginRequired =
            conversationMetadata.conversationIsLoginRequired;
        requiresEventTicket = conversationMetadata.requiresEventTicket;
    } else {
        const { getPostMetadataFromSlugId } = useCommonPost();
        const metadata = await getPostMetadataFromSlugId({
            db: db,
            conversationSlugId: conversationSlugId,
        });
        conversationId = metadata.id;
        conversationContentId = metadata.contentId;
        conversationAuthorId = metadata.authorId;
        conversationIsLoginRequired = metadata.isLoginRequired;
        requiresEventTicket = metadata.requiresEventTicket;
    }

    if (conversationContentId == null) {
        throw httpErrors.gone("Cannot comment on a deleted post");
    }

    // Skip lock check if metadata provided (seed opinions on just-created conversations)
    if (!conversationMetadata) {
        const isLocked = await useCommonPost().isPostSlugIdLocked({
            postSlugId: conversationSlugId,
            db: db,
        });
        if (isLocked) {
            return {
                success: false,
                reason: "conversation_locked",
            };
        }
    }

    try {
        commentBody = processUserGeneratedHtml(commentBody, true, "input");
    } catch (error) {
        if (error instanceof Error) {
            throw httpErrors.badRequest(error.message);
        } else {
            throw httpErrors.badRequest("Error while sanitizing request body");
        }
    }

    const userId = await authUtilService.getOrRegisterUserIdFromDeviceStatus({
        db,
        didWrite,
        conversationIsLoginRequired,
        userAgent,
        now,
    });

    // Check event ticket gating (skip for seed opinions on just-created conversations)
    if (requiresEventTicket !== null && !conversationMetadata) {
        const hasTicket = await zupassService.hasEventTicket({
            db,
            userId,
            eventSlug: requiresEventTicket,
        });
        if (!hasTicket) {
            return {
                success: false,
                reason: "event_ticket_required",
            };
        }
    }

    const opinionSlugId = generateRandomSlugId();

    const { opinionId } = await db.transaction(async (tx) => {
        const insertCommentResponse = await tx
            .insert(opinionTable)
            .values({
                slugId: opinionSlugId,
                authorId: userId,
                currentContentId: null,
                conversationId: conversationId,
                isSeed: isSeed,
            })
            .returning({ opinionId: opinionTable.id });

        const opinionId = insertCommentResponse[0].opinionId;

        const insertProofResponse = await tx
            .insert(opinionProofTable)
            .values({
                type: "creation",
                opinionId: opinionId,
                authorDid: didWrite,
                proof: proof,
                proofVersion: 1,
            })
            .returning({ proofId: opinionProofTable.id });
        const proofId = insertProofResponse[0].proofId;
        const commentContentTableResponse = await tx
            .insert(opinionContentTable)
            .values({
                opinionProofId: proofId,
                opinionId: opinionId,
                conversationContentId: conversationContentId,
                content: commentBody,
            })
            .returning({ commentContentTableId: opinionContentTable.id });

        const commentContentTableId =
            commentContentTableResponse[0].commentContentTableId;

        await tx
            .update(opinionTable)
            .set({
                currentContentId: commentContentTableId,
            })
            .where(eq(opinionTable.id, opinionId));

        // Update the user profile's comment count using atomic increment
        await tx
            .update(userTable)
            .set({
                totalOpinionCount: sql`total_opinion_count + 1`,
            })
            .where(eq(userTable.id, userId));

        // Update conversation opinionCount (+1 for new opinion)
        // Note: voteCount and participantCount will be updated by vote buffer
        // when the automatic vote is processed
        await updateOpinionCount({
            db: tx,
            conversationId,
            delta: 1,
            doUpdateLastReactedAt: true,
        });

        return { opinionId };
    });

    // Create notification for conversation owner (outside transaction)
    // Skip for seed opinions
    if (!isSeed) {
        await createOpinionNotification({
            db,
            conversationAuthorId,
            opinionAuthorId: userId,
            opinionId,
            conversationId,
            notificationSSEManager,
        });
    }

    // Auto-vote outside transaction to reduce lock duration
    if (!isSeed) {
        await castVoteForOpinionSlugId({
            db: db,
            voteBuffer: voteBuffer,
            opinionSlugId: opinionSlugId,
            didWrite: didWrite,
            proof: proof,
            votingAction: "agree",
            userAgent: userAgent,
            now: now,
        });
    }

    return {
        success: true,
        opinionSlugId: opinionSlugId,
    };
}

interface DeleteCommentBySlugIdProps {
    db: PostgresJsDatabase;
    opinionSlugId: string;
    userId: string;
    proof: string;
    didWrite: string;
}

export async function deleteOpinionBySlugId({
    db,
    opinionSlugId,
    userId,
    proof,
    didWrite,
}: DeleteCommentBySlugIdProps): Promise<void> {
    const { isOpinionDeleted } =
        await useCommonComment().getOpinionMetadataFromOpinionSlugId({
            db: db,
            opinionSlugId,
        });
    if (isOpinionDeleted) {
        throw httpErrors.conflict("Opinion had already been deleted");
    }
    await db.transaction(async (tx) => {
        const updatedCommentIdResponse = await tx
            .update(opinionTable)
            .set({
                currentContentId: null,
            })
            .where(
                and(
                    eq(opinionTable.authorId, userId),
                    eq(opinionTable.slugId, opinionSlugId),
                ),
            )
            .returning({
                updateCommentId: opinionTable.id,
                conversationId: opinionTable.conversationId,
            });

        if (updatedCommentIdResponse.length != 1) {
            log.error(
                "Invalid comment table update response length: " +
                    updatedCommentIdResponse.length.toString(),
            );
            tx.rollback();
        }

        const commentId = updatedCommentIdResponse[0].updateCommentId;
        const conversationId = updatedCommentIdResponse[0].conversationId;

        await tx.insert(opinionProofTable).values({
            type: "deletion",
            opinionId: commentId,
            authorDid: didWrite,
            proof: proof,
            proofVersion: 1,
        });

        // Reconcile all counters (automatically enqueues math update)
        // Deleting opinion affects opinionCount, voteCount, and participantCount
        // (since all votes on this opinion become invalid)
        await reconcileConversationCounters({ db: tx, conversationId });

        // Decrement user's total opinion count
        await tx
            .update(userTable)
            .set({
                totalOpinionCount: sql`total_opinion_count - 1`,
            })
            .where(eq(userTable.id, userId));
    });
}

export async function bulkInsertOpinionsFromExternalPolisConvo({
    db,
    importedPolisConversation,
    conversationId,
    conversationSlugId,
    conversationContentId,
    userIdPerParticipantId,
}: {
    db: PostgresJsDatabase;
    importedPolisConversation: ImportPolisResults;
    conversationId: number;
    conversationSlugId: string;
    conversationContentId: number;
    userIdPerParticipantId: UserIdPerParticipantId;
}): Promise<{
    opinionIdPerStatementId: OpinionIdPerStatementId;
    opinionContentIdPerOpinionId: OpinionContentIdPerOpinionId;
}> {
    const statementIdPerOpinionSlugId: StatementIdPerOpinionSlugId = {};
    const opinionIdPerStatementId: OpinionIdPerStatementId = {};
    const opinionContentIdPerOpinionId: OpinionContentIdPerOpinionId = {};

    // Pre-compute vote counts
    const voteCountsByStatementId = new Map<
        number,
        { agrees: number; disagrees: number; passes: number }
    >();
    for (const vote of importedPolisConversation.votes_data) {
        const existing = voteCountsByStatementId.get(vote.statement_id) ?? {
            agrees: 0,
            disagrees: 0,
            passes: 0,
        };
        if (vote.vote === 1) existing.agrees++;
        else if (vote.vote === -1) existing.disagrees++;
        else existing.passes++;
        voteCountsByStatementId.set(vote.statement_id, existing);
    }

    const opinionsToAdd = importedPolisConversation.comments_data.map(
        (comment) => {
            const opinionSlugId = generateRandomSlugId();

            const voteCounts = voteCountsByStatementId.get(
                comment.statement_id,
            ) ?? { agrees: 0, disagrees: 0, passes: 0 };
            const calculatedNumAgrees = voteCounts.agrees;
            // Log mismatch only when Polis provided a non-null value that differs from calculated
            // Null values are treated as 0 (Polis didn't provide the count)
            const polisNumAgrees = comment.agree_count ?? 0;
            if (
                comment.agree_count !== null &&
                polisNumAgrees !== calculatedNumAgrees
            ) {
                log.warn(
                    `[Import] comment.agree_count = ${String(polisNumAgrees)} !== calculated numAgrees = ${String(calculatedNumAgrees)} while importing conversationSlugId=${conversationSlugId} and opinionSludId=${opinionSlugId}`,
                );
            }

            const calculatedNumDisagrees = voteCounts.disagrees;
            const polisNumDisagrees = comment.disagree_count ?? 0;
            if (
                comment.disagree_count !== null &&
                polisNumDisagrees !== calculatedNumDisagrees
            ) {
                log.warn(
                    `[Import] comment.disagree_count = ${String(polisNumDisagrees)} !== calculated numDisagrees = ${String(calculatedNumDisagrees)} while importing conversationSlugId=${conversationSlugId} and opinionSludId=${opinionSlugId}`,
                );
            }

            const calculatedNumPasses = voteCounts.passes;
            const polisNumPasses = comment.pass_count ?? 0;
            if (
                comment.pass_count !== null &&
                polisNumPasses !== calculatedNumPasses
            ) {
                log.warn(
                    `[Import] comment.pass_count = ${String(polisNumPasses)} !== calculated numPasses = ${String(calculatedNumPasses)} while importing conversationSlugId=${conversationSlugId} and opinionSludId=${opinionSlugId}`,
                );
            }

            statementIdPerOpinionSlugId[opinionSlugId] = comment.statement_id;

            return {
                slugId: opinionSlugId,
                authorId: userIdPerParticipantId[comment.participant_id],
                currentContentId: null,
                conversationId: conversationId,
                isSeed: comment.is_seed ?? false,
                numAgrees: calculatedNumAgrees,
                numDisagrees: calculatedNumDisagrees,
                numPasses: calculatedNumPasses,
            };
        },
    );

    async function doImportOpinions(db: PostgresJsDatabase): Promise<{
        opinionIdPerStatementId: OpinionIdPerStatementId;
        opinionContentIdPerOpinionId: OpinionContentIdPerOpinionId;
    }> {
        const insertOpinionResponses = await db
            .insert(opinionTable)
            .values(opinionsToAdd)
            .returning({
                opinionId: opinionTable.id,
                opinionSlugId: opinionTable.slugId,
            });
        for (const insertedOpinion of insertOpinionResponses) {
            const statementId =
                statementIdPerOpinionSlugId[insertedOpinion.opinionSlugId];
            opinionIdPerStatementId[statementId] = insertedOpinion.opinionId;
        }

        const opinionContentsToAdd =
            importedPolisConversation.comments_data.map((comment) => {
                const opinionId = opinionIdPerStatementId[comment.statement_id];
                try {
                    // Use "output" mode for legacy Polis imports (may contain div tags)
                    const commentBody = processUserGeneratedHtml(
                        comment.txt,
                        true,
                        "output",
                    );
                    return {
                        opinionId: opinionId,
                        conversationContentId: conversationContentId,
                        content: commentBody,
                    };
                } catch (error) {
                    if (error instanceof Error) {
                        throw httpErrors.badRequest(error.message);
                    } else {
                        throw httpErrors.badRequest(
                            "Error while sanitizing request body",
                        );
                    }
                }
            });
        const opinionContentTableResponses = await db
            .insert(opinionContentTable)
            .values(opinionContentsToAdd)
            .returning({
                opinionContentId: opinionContentTable.id,
                opinionId: opinionContentTable.opinionId,
            });
        for (const opinionContent of opinionContentTableResponses) {
            opinionContentIdPerOpinionId[opinionContent.opinionId] =
                opinionContent.opinionContentId;
        }
        const sqlChunksOpinionCurrentId: SQL[] = [];
        sqlChunksOpinionCurrentId.push(sql`(CASE`);
        for (const opinionContentResponse of opinionContentTableResponses) {
            sqlChunksOpinionCurrentId.push(
                sql`WHEN ${opinionTable.id} = ${opinionContentResponse.opinionId}::int THEN ${opinionContentResponse.opinionContentId}::int`,
            );
        }
        sqlChunksOpinionCurrentId.push(sql`ELSE current_content_id`);
        sqlChunksOpinionCurrentId.push(sql`END)`);

        const finalSqlOpinionCurrentContentId = sql.join(
            sqlChunksOpinionCurrentId,
            sql.raw(" "),
        );
        const setClauseOpinionCurrentContentId = {
            currentContentId: finalSqlOpinionCurrentContentId,
        };
        await db
            .update(opinionTable)
            .set({
                ...setClauseOpinionCurrentContentId,
                updatedAt: nowZeroMs(),
            })
            .where(eq(opinionTable.conversationId, conversationId));

        // add moderated decisions
        const moderatedOpinions: {
            opinionId: number;
            moderationAction: OpinionModerationAction;
            moderationReason: ModerationReason;
        }[] = importedPolisConversation.comments_data
            .filter((comment) => comment.moderated === -1)
            .map((comment) => {
                const opinionId = opinionIdPerStatementId[comment.statement_id];
                return {
                    opinionId: opinionId,
                    moderationAction: "move",
                    moderationReason: "spam", // this is not in polis, so we improvise something
                };
            });
        if (moderatedOpinions.length > 0) {
            await db.insert(opinionModerationTable).values(moderatedOpinions);
        }
        // TODO: Update the user profile's comment count
        return {
            opinionIdPerStatementId,
            opinionContentIdPerOpinionId,
        };
    }

    // we don't use transactions because it's too heavy
    return await doImportOpinions(db);
}

type OpinionContentById = Record<number, string>;

export async function getOpinionContentsFromIds({
    db,
    opinionIds,
}: {
    db: PostgresJsDatabase;
    opinionIds: number[];
}): Promise<OpinionContentById> {
    const results = await db
        .select({
            opinionId: opinionTable.id,
            content: opinionContentTable.content,
        })
        .from(opinionTable)
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.id, opinionTable.currentContentId),
        )
        .where(inArray(opinionTable.id, opinionIds));
    if (results.length === 0) {
        throw httpErrors.notFound(
            `Cannot find opinionIds=${opinionIds.join(", ")}`,
        );
    }
    const opinionContentById: OpinionContentById = {};
    for (const result of results) {
        opinionContentById[result.opinionId] = result.content;
    }
    return opinionContentById;
}
