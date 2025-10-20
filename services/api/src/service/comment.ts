import { generateRandomSlugId } from "@/crypto.js";
import {
    opinionContentTable,
    opinionTable,
    opinionProofTable,
    conversationTable,
    userTable,
    opinionModerationTable,
    notificationTable,
    notificationNewOpinionTable,
    polisContentTable,
    polisClusterTable,
    polisClusterUserTable,
    polisClusterOpinionTable,
    conversationUpdateQueueTable,
} from "@/shared-backend/schema.js";
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
    ClusterStats,
    CommentFeedFilter,
    ModerationReason,
    OpinionItem,
    OpinionItemPerSlugId,
    OpinionModerationAction,
    PolisClusters,
    PolisKey,
    SlugId,
} from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import { useCommonComment, useCommonPost } from "./common.js";
import { toUnionUndefined } from "@/shared/shared.js";
import { log } from "@/app.js";
import { createCommentModerationPropertyObject } from "./moderation.js";
import { getUserMutePreferences } from "./muteUser.js";
import { alias } from "drizzle-orm/pg-core";
import * as authUtilService from "@/service/authUtil.js";
import { castVoteForOpinionSlugId } from "./voting.js";
import {
    isSqlWhereMajority,
    isSqlOrderByMajority,
    isSqlOrderByGroupAwareConsensus,
    isSqlOrderByPolisPriority,
    isSqlWhereRepresentative,
    isSqlOrderByRepresentative,
    isSqlWhereMajorityAgree,
    isSqlWhereMajorityDisagree,
} from "@/utils/sqlLogic.js";
import type { ImportPolisResults } from "@/shared/types/polis.js";
import type {
    OpinionContentIdPerOpinionId,
    OpinionIdPerStatementId,
    StatementIdPerOpinionSlugId,
    UserIdPerParticipantId,
} from "@/utils/dataStructure.js";
import { nowZeroMs } from "@/shared/util.js";
import { processHtmlBody } from "@/shared-app-api/html.js";

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
    filterTarget:
        | "new"
        | "moderated"
        | "hidden"
        | "majority"
        | "controversial"
        | "group-aware-consensus"
        | "discover"
        | "representative";
    clusterKey?: PolisKey;
    limit: number;
}

interface FetchOpinionsByPostIdProps {
    db: PostgresJsDatabase;
    postId: number;
    personalizationUserId?: string;
    filterTarget:
        | "new"
        | "moderated"
        | "hidden"
        | "majority"
        | "majority-agree"
        | "majority-disagree"
        | "controversial"
        | "group-aware-consensus"
        | "discover"
        | "representative";
    clusterKey?: PolisKey;
    limit: number;
}

export async function fetchOpinionsByPostId({
    db,
    postId,
    personalizationUserId,
    filterTarget,
    clusterKey,
    limit,
}: FetchOpinionsByPostIdProps): Promise<OpinionItemPerSlugId> {
    const polisClusterTableAlias0 = alias(polisClusterTable, "cluster_0");
    const polisClusterTableAlias1 = alias(polisClusterTable, "cluster_1");
    const polisClusterTableAlias2 = alias(polisClusterTable, "cluster_2");
    const polisClusterTableAlias3 = alias(polisClusterTable, "cluster_3");
    const polisClusterTableAlias4 = alias(polisClusterTable, "cluster_4");
    const polisClusterTableAlias5 = alias(polisClusterTable, "cluster_5");

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
    // isNotNull(opinionTable.currentContentId), // filtering out deleted opinions, this is unecessary because of the use of innerJoin
    let orderByClause = [desc(opinionTable.createdAt)]; // default value, shouldn't be needed but ts doesn't understand how to terminate nested switch
    if (clusterKey != undefined) {
        switch (clusterKey) {
            case "0": {
                whereClause = and(
                    whereClause,
                    eq(polisClusterTableAlias0.key, clusterKey),
                    isNotNull(polisClusterTableAlias0.numUsers),
                    isNotNull(opinionTable.polisCluster0Id),
                    isNotNull(opinionTable.polisCluster0NumAgrees),
                    isNotNull(opinionTable.polisCluster0NumDisagrees),
                    isNotNull(opinionTable.polisCluster0NumPasses),
                );
                break;
            }
            case "1": {
                whereClause = and(
                    whereClause,
                    eq(polisClusterTableAlias1.key, clusterKey),
                    isNotNull(polisClusterTableAlias1.numUsers),
                    isNotNull(opinionTable.polisCluster1Id),
                    isNotNull(opinionTable.polisCluster1NumAgrees),
                    isNotNull(opinionTable.polisCluster1NumDisagrees),
                    isNotNull(opinionTable.polisCluster1NumPasses),
                );
                break;
            }
            case "2": {
                whereClause = and(
                    whereClause,
                    eq(polisClusterTableAlias2.key, clusterKey),
                    isNotNull(polisClusterTableAlias2.numUsers),
                    isNotNull(opinionTable.polisCluster2Id),
                    isNotNull(opinionTable.polisCluster2NumAgrees),
                    isNotNull(opinionTable.polisCluster2NumDisagrees),
                    isNotNull(opinionTable.polisCluster2NumPasses),
                );
                break;
            }
            case "3": {
                whereClause = and(
                    whereClause,
                    eq(polisClusterTableAlias3.key, clusterKey),
                    isNotNull(polisClusterTableAlias3.numUsers),
                    isNotNull(opinionTable.polisCluster3Id),
                    isNotNull(opinionTable.polisCluster3NumAgrees),
                    isNotNull(opinionTable.polisCluster3NumDisagrees),
                    isNotNull(opinionTable.polisCluster3NumPasses),
                );
                break;
            }
            case "4": {
                whereClause = and(
                    whereClause,
                    eq(polisClusterTableAlias4.key, clusterKey),
                    isNotNull(polisClusterTableAlias4.numUsers),
                    isNotNull(opinionTable.polisCluster4Id),
                    isNotNull(opinionTable.polisCluster4NumAgrees),
                    isNotNull(opinionTable.polisCluster4NumDisagrees),
                    isNotNull(opinionTable.polisCluster4NumPasses),
                );
                break;
            }
            case "5": {
                whereClause = and(
                    whereClause,
                    eq(polisClusterTableAlias5.key, clusterKey),
                    isNotNull(polisClusterTableAlias5.numUsers),
                    isNotNull(opinionTable.polisCluster5Id),
                    isNotNull(opinionTable.polisCluster5NumAgrees),
                    isNotNull(opinionTable.polisCluster5NumDisagrees),
                    isNotNull(opinionTable.polisCluster5NumPasses),
                );
                break;
            }
        }
    }
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
        case "group-aware-consensus": {
            whereClause = and(whereClause, isNull(opinionModerationTable.id));
            orderByClause = isSqlOrderByGroupAwareConsensus();
            break;
        }
        case "majority": {
            whereClause = and(
                whereClause,
                isNull(opinionModerationTable.id),
                isSqlWhereMajority(),
            );
            orderByClause = isSqlOrderByMajority();
            break;
        }
        case "majority-agree": {
            whereClause = and(
                whereClause,
                isNull(opinionModerationTable.id),
                isSqlWhereMajorityAgree(),
            );
            orderByClause = isSqlOrderByMajority();
            break;
        }
        case "majority-disagree": {
            whereClause = and(
                whereClause,
                isNull(opinionModerationTable.id),
                isSqlWhereMajorityDisagree(),
            );
            orderByClause = isSqlOrderByMajority();
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
                    "Representative opinions only make sense if a clusterKey is selected",
                );
            }
            whereClause = and(whereClause, isNull(opinionModerationTable.id));
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
            polisCluster0Id: polisClusterTableAlias0.id,
            polisCluster0Key: polisClusterTableAlias0.key,
            polisCluster0AiLabel: polisClusterTableAlias0.aiLabel,
            polisCluster0NumUsers: polisClusterTableAlias0.numUsers,
            polisCluster0NumAgrees: opinionTable.polisCluster0NumAgrees,
            polisCluster0NumDisagrees: opinionTable.polisCluster0NumDisagrees,
            polisCluster0NumPasses: opinionTable.polisCluster0NumPasses,
            polisCluster1Id: polisClusterTableAlias1.id,
            polisCluster1Key: polisClusterTableAlias1.key,
            polisCluster1AiLabel: polisClusterTableAlias1.aiLabel,
            polisCluster1NumUsers: polisClusterTableAlias1.numUsers,
            polisCluster1NumAgrees: opinionTable.polisCluster1NumAgrees,
            polisCluster1NumDisagrees: opinionTable.polisCluster1NumDisagrees,
            polisCluster1NumPasses: opinionTable.polisCluster1NumPasses,
            polisCluster2Id: polisClusterTableAlias2.id,
            polisCluster2Key: polisClusterTableAlias2.key,
            polisCluster2AiLabel: polisClusterTableAlias2.aiLabel,
            polisCluster2NumUsers: polisClusterTableAlias2.numUsers,
            polisCluster2NumAgrees: opinionTable.polisCluster2NumAgrees,
            polisCluster2NumDisagrees: opinionTable.polisCluster2NumDisagrees,
            polisCluster2NumPasses: opinionTable.polisCluster2NumPasses,
            polisCluster3Id: polisClusterTableAlias3.id,
            polisCluster3Key: polisClusterTableAlias3.key,
            polisCluster3AiLabel: polisClusterTableAlias3.aiLabel,
            polisCluster3NumUsers: polisClusterTableAlias3.numUsers,
            polisCluster3NumAgrees: opinionTable.polisCluster3NumAgrees,
            polisCluster3NumDisagrees: opinionTable.polisCluster3NumDisagrees,
            polisCluster3NumPasses: opinionTable.polisCluster3NumPasses,
            polisCluster4Id: polisClusterTableAlias4.id,
            polisCluster4Key: polisClusterTableAlias4.key,
            polisCluster4AiLabel: polisClusterTableAlias4.aiLabel,
            polisCluster4NumUsers: polisClusterTableAlias4.numUsers,
            polisCluster4NumAgrees: opinionTable.polisCluster4NumAgrees,
            polisCluster4NumDisagrees: opinionTable.polisCluster4NumDisagrees,
            polisCluster4NumPasses: opinionTable.polisCluster4NumPasses,
            polisCluster5Id: polisClusterTableAlias5.id,
            polisCluster5Key: polisClusterTableAlias5.key,
            polisCluster5AiLabel: polisClusterTableAlias5.aiLabel,
            polisCluster5NumUsers: polisClusterTableAlias5.numUsers,
            polisCluster5NumAgrees: opinionTable.polisCluster5NumAgrees,
            polisCluster5NumDisagrees: opinionTable.polisCluster5NumDisagrees,
            polisCluster5NumPasses: opinionTable.polisCluster5NumPasses,
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
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, opinionTable.id),
        )
        .leftJoin(
            polisContentTable,
            eq(polisContentTable.id, conversationTable.currentPolisContentId),
        )
        .leftJoin(
            polisClusterUserTable,
            and(
                eq(polisClusterUserTable.polisContentId, polisContentTable.id),
                eq(polisClusterUserTable.userId, opinionTable.authorId),
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias0,
            and(
                eq(
                    polisClusterOpinionTableAlias0.polisClusterId,
                    polisClusterTableAlias0.id,
                ),
                eq(polisClusterOpinionTableAlias0.opinionId, opinionTable.id),
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias1,
            and(
                eq(
                    polisClusterOpinionTableAlias1.polisClusterId,
                    polisClusterTableAlias1.id,
                ),
                eq(polisClusterOpinionTableAlias1.opinionId, opinionTable.id),
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias2,
            and(
                eq(
                    polisClusterOpinionTableAlias2.polisClusterId,
                    polisClusterTableAlias2.id,
                ),
                eq(polisClusterOpinionTableAlias2.opinionId, opinionTable.id),
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias3,
            and(
                eq(
                    polisClusterOpinionTableAlias3.polisClusterId,
                    polisClusterTableAlias3.id,
                ),
                eq(polisClusterOpinionTableAlias3.opinionId, opinionTable.id),
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias4,
            and(
                eq(
                    polisClusterOpinionTableAlias4.polisClusterId,
                    polisClusterTableAlias4.id,
                ),
                eq(polisClusterOpinionTableAlias4.opinionId, opinionTable.id),
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias5,
            and(
                eq(
                    polisClusterOpinionTableAlias5.polisClusterId,
                    polisClusterTableAlias5.id,
                ),
                eq(polisClusterOpinionTableAlias5.opinionId, opinionTable.id),
            ),
        )
        .orderBy(...orderByClause)
        .where(whereClause)
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
                aiLabel: toUnionUndefined(opinionResponse.polisCluster0AiLabel),
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
                aiLabel: toUnionUndefined(opinionResponse.polisCluster1AiLabel),
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
                aiLabel: toUnionUndefined(opinionResponse.polisCluster2AiLabel),
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
                aiLabel: toUnionUndefined(opinionResponse.polisCluster3AiLabel),
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
                aiLabel: toUnionUndefined(opinionResponse.polisCluster4AiLabel),
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
                aiLabel: toUnionUndefined(opinionResponse.polisCluster5AiLabel),
                isAuthorInCluster:
                    opinionResponse.opinionAuthorPolisClusterId ===
                    opinionResponse.polisCluster5Id,
                numUsers: opinionResponse.polisCluster5NumUsers,
                numAgrees: opinionResponse.polisCluster5NumAgrees,
                numDisagrees: opinionResponse.polisCluster5NumDisagrees,
                numPasses: opinionResponse.polisCluster5NumPasses,
            });
        }
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
            clustersStats: clustersStats,
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

export async function fetchOpinions({
    db,
    postSlugId,
    personalizationUserId,
    filterTarget,
    clusterKey,
    limit,
}: FetchOpinionsProps): Promise<OpinionItemPerSlugId> {
    const postId = await getPostIdFromPostSlugId(db, postSlugId);
    return await fetchOpinionsByPostId({
        db,
        postId,
        personalizationUserId,
        filterTarget,
        clusterKey,
        limit,
    });
}

interface FetchOpinionsByConversationSlugIdProps {
    db: PostgresJsDatabase;
    postSlugId: SlugId;
    fetchTarget: CommentFeedFilter; // if cluster, then we filter by clusterKey
    personalizationUserId?: string;
    clusterKey?: PolisKey;
}

export async function fetchOpinionsByConversationSlugId({
    db,
    postSlugId,
    fetchTarget,
    personalizationUserId,
    clusterKey,
}: FetchOpinionsByConversationSlugIdProps): Promise<OpinionItemPerSlugId> {
    let opinionItemMap: OpinionItemPerSlugId;
    const limit = 3000; // TODO: infinite scrolling
    switch (fetchTarget) {
        case "moderated":
            opinionItemMap = await fetchOpinions({
                db,
                postSlugId,
                personalizationUserId,
                filterTarget: "moderated",
                limit: limit,
            });
            break;
        case "hidden":
            opinionItemMap = await fetchOpinions({
                db,
                postSlugId,
                personalizationUserId,
                filterTarget: "hidden",
                limit: limit,
            });
            break;
        case "new":
            opinionItemMap = await fetchOpinions({
                db,
                postSlugId,
                personalizationUserId,
                filterTarget: "new",
                limit: limit,
            });
            break;
        case "cluster": {
            if (clusterKey === undefined) {
                throw httpErrors.badRequest(
                    "Missing cluster key input for the cluster filter algorithm",
                );
            } else {
                opinionItemMap = await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "representative",
                    clusterKey: clusterKey,
                    limit: limit,
                });
            }
            break;
        }
        case "group-aware-consensus":
            opinionItemMap = await fetchOpinions({
                db,
                postSlugId,
                personalizationUserId,
                filterTarget: "group-aware-consensus",
                limit: limit,
            });
            break;
        case "majority":
            opinionItemMap = await fetchOpinions({
                db,
                postSlugId,
                personalizationUserId,
                filterTarget: "majority",
                limit: limit,
            });
            break;
        case "controversial":
            opinionItemMap = await fetchOpinions({
                db,
                postSlugId,
                personalizationUserId,
                filterTarget: "controversial",
                limit: limit,
            });
            break;
        case "discover": {
            opinionItemMap = await fetchOpinions({
                db,
                postSlugId,
                personalizationUserId,
                filterTarget: "discover",
                limit: limit,
            });
            break;
        }
    }
    return opinionItemMap;
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
            .where(eq(opinionTable.slugId, opinionSlugId));

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
                clustersStats: [], //TODO: change this!
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
    if (displayLanguage !== "en" && polisMetadata.missingTranslations.size > 0) {
        if (googleCloudCredentials !== undefined) {
            log.info(
                `[Phase 2] Calling Google Cloud Translation API for conversationSlugId=${conversationSlugId}, displayLanguage=${displayLanguage}, missingTranslationsCount=${polisMetadata.missingTranslations.size}`,
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
    const consensusOpinions = await fetchOpinionsByConversationSlugId({
        db: db,
        postSlugId: conversationSlugId,
        fetchTarget: "group-aware-consensus",
        personalizationUserId,
    });
    const controversialOpinions = await fetchOpinionsByConversationSlugId({
        db: db,
        postSlugId: conversationSlugId,
        fetchTarget: "controversial",
        personalizationUserId,
    });
    const polisClusters: PolisClusters = {};
    for (const [key, clusterMetadata] of Object.entries(
        polisMetadata.clustersMetadata,
    )) {
        // without casting, record key is otherwise always a string
        //
        const clusterKey = key as keyof typeof polisMetadata.clustersMetadata;
        const representativeOpinions = await fetchOpinionsByConversationSlugId({
            db: db,
            postSlugId: conversationSlugId,
            fetchTarget: "cluster",
            clusterKey: clusterKey,
            personalizationUserId,
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
    commentBody: string;
    conversationSlugId: string;
    didWrite: string;
    proof: string;
    userAgent: string;
    voteNotifMilestones: number[];
    now: Date;
    isSeed: boolean;
}

export async function postNewOpinion({
    db,
    commentBody,
    conversationSlugId,
    didWrite,
    proof,
    userAgent,
    now,
    voteNotifMilestones,
    isSeed,
}: PostNewOpinionProps): Promise<CreateCommentResponse> {
    const { getPostMetadataFromSlugId } = useCommonPost();
    const {
        id: conversationId,
        contentId: conversationContentId,
        authorId: conversationAuthorId,
        isIndexed: conversationIsIndexed,
        isLoginRequired: conversationIsLoginRequired,
    } = await getPostMetadataFromSlugId({
        db: db,
        conversationSlugId: conversationSlugId,
    });
    if (conversationContentId == null) {
        throw httpErrors.gone("Cannot comment on a deleted post");
    }

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

    try {
        commentBody = processHtmlBody(commentBody, true);
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
        conversationIsIndexed,
        conversationIsLoginRequired,
        userAgent,
        now,
    });

    const opinionSlugId = generateRandomSlugId();

    await db.transaction(async (tx) => {
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

        {
            // Create notification for the conversation owner
            if (userId !== conversationAuthorId) {
                const notificationTableResponse = await tx
                    .insert(notificationTable)
                    .values({
                        slugId: generateRandomSlugId(),
                        userId: conversationAuthorId, // owner of the notification
                        notificationType: "new_opinion",
                    })
                    .returning({
                        notificationId: notificationTable.id,
                    });

                const notificationId =
                    notificationTableResponse[0].notificationId;

                await tx.insert(notificationNewOpinionTable).values({
                    notificationId: notificationId,
                    authorId: userId, // the author of the opinion is the current user!
                    opinionId: opinionId,
                    conversationId: conversationId,
                });
            }
        }
        // Enqueue math update (eliminates conversation table UPDATE and row lock!)
        // Math-updater will recalculate counters and update lastReactedAt (activity timestamp)
        await tx
            .insert(conversationUpdateQueueTable)
            .values({
                conversationId: conversationId,
                requestedAt: now,
                processedAt: null,
            })
            .onConflictDoUpdate({
                target: conversationUpdateQueueTable.conversationId,
                set: {
                    requestedAt: now,
                    processedAt: null,
                },
            });
    });

    // Auto-vote outside transaction to reduce lock duration
    if (!isSeed) {
        await castVoteForOpinionSlugId({
            db: db,
            opinionSlugId: opinionSlugId,
            didWrite: didWrite,
            proof: proof,
            votingAction: "agree",
            userAgent: userAgent,
            voteNotifMilestones,
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
    now: Date;
    opinionSlugId: string;
    userId: string;
    proof: string;
    didWrite: string;
}

export async function deleteOpinionBySlugId({
    db,
    now,
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

        // Enqueue math update (eliminates conversation table UPDATE and row lock!)
        // Math-updater will recalculate counters and update lastReactedAt (activity timestamp)
        await tx
            .insert(conversationUpdateQueueTable)
            .values({
                conversationId: conversationId,
                requestedAt: now,
                processedAt: null,
            })
            .onConflictDoUpdate({
                target: conversationUpdateQueueTable.conversationId,
                set: {
                    requestedAt: now,
                    processedAt: null,
                },
            });

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
    const opinionsToAdd = importedPolisConversation.comments_data.map(
        (comment) => {
            const opinionSlugId = generateRandomSlugId();

            // !IMPORTANT: this considers there are no duplicates or edit/cancel votes
            const calculatedNumAgrees =
                importedPolisConversation.votes_data.filter(
                    (vote) =>
                        vote.statement_id == comment.statement_id &&
                        vote.vote === 1,
                ).length;
            // just for logging
            const polisNumAgrees = comment.agree_count;
            if (polisNumAgrees === null) {
                log.warn(
                    `[Import] comment.agree_count is null while importing conversationSlugId=${conversationSlugId} and opinionSludId=${opinionSlugId}`,
                );
            } else if (polisNumAgrees !== calculatedNumAgrees) {
                log.warn(
                    `[Import] comment.agree_count = ${String(polisNumAgrees)} !== calculated numAgrees = ${String(calculatedNumAgrees)} while importing conversationSlugId=${conversationSlugId} and opinionSludId=${opinionSlugId}`,
                );
            }

            const calculatedNumDisagrees =
                importedPolisConversation.votes_data.filter(
                    (vote) =>
                        vote.statement_id == comment.statement_id &&
                        vote.vote === -1,
                ).length;
            // just for logging
            const polisNumDisagrees = comment.disagree_count;
            if (polisNumDisagrees === null) {
                log.warn(
                    `[Import] comment.disagree_count is null while importing conversationSlugId=${conversationSlugId} and opinionSludId=${opinionSlugId}`,
                );
            } else if (polisNumDisagrees !== calculatedNumDisagrees) {
                log.warn(
                    `[Import] comment.disagree_count = ${String(polisNumDisagrees)} !== calculated numDisagrees = ${String(calculatedNumDisagrees)} while importing conversationSlugId=${conversationSlugId} and opinionSludId=${opinionSlugId}`,
                );
            }

            const calculatedNumPasses =
                importedPolisConversation.votes_data.filter(
                    (vote) =>
                        vote.statement_id == comment.statement_id &&
                        vote.vote === 0,
                ).length;
            // just for logging
            const polisNumPasses = comment.pass_count;
            if (polisNumPasses === null) {
                log.warn(
                    `[Import] comment.pass_count is null while importing conversationSlugId=${conversationSlugId} and opinionSludId=${opinionSlugId}`,
                );
            } else if (polisNumPasses !== calculatedNumPasses) {
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
                    const commentBody = processHtmlBody(comment.txt, true);
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
