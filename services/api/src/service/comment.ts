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
} from "@/schema.js";
import type {
    CreateCommentResponse,
    GetOpinionBySlugIdListResponse,
} from "@/shared/types/dto.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { desc, eq, sql, and, isNull, isNotNull, ne, SQL } from "drizzle-orm";
import type {
    ClusterStats,
    CommentFeedFilter,
    OpinionItem,
    OpinionItemPerSlugId,
    PolisKey,
    SlugId,
} from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import { useCommonComment, useCommonPost } from "./common.js";
import { processHtmlBody, toUnionUndefined } from "@/shared/shared.js";
import { log } from "@/app.js";
import { createCommentModerationPropertyObject } from "./moderation.js";
import { getUserMutePreferences } from "./muteUser.js";
import type { AxiosInstance } from "axios";
import * as polisService from "@/service/polis.js";
import { alias } from "drizzle-orm/pg-core";
import * as authUtilService from "@/service/authUtil.js";
import { castVoteForOpinionSlugId } from "./voting.js";
import {
    isSqlWhereControversial,
    isSqlWhereMajority,
    isSqlOrderByControversial,
    isSqlOrderByMajority,
    isSqlOrderByGroupAwareConsensusAgree,
    isSqlOrderByPolisPriority,
    isSqlWhereRepresentative,
    isSqlOrderByRepresentative,
} from "@/utils/sqlLogic.js";

interface GetCommentSlugIdLastCreatedAtProps {
    lastSlugId: string | undefined;
    db: PostgresJsDatabase;
}

export async function getCommentSlugIdLastCreatedAt({
    lastSlugId,
    db,
}: GetCommentSlugIdLastCreatedAtProps) {
    let lastCreatedAt = new Date();

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

export async function fetchOpinions({
    db,
    postSlugId,
    personalizationUserId,
    filterTarget,
    clusterKey,
    limit,
}: FetchOpinionsProps): Promise<OpinionItemPerSlugId> {
    const postId = await getPostIdFromPostSlugId(db, postSlugId);

    const polisClusterTableAlias0 = alias(polisClusterTable, "cluster_0 ");
    const polisClusterTableAlias1 = alias(polisClusterTable, "cluster_1 ");
    const polisClusterTableAlias2 = alias(polisClusterTable, "cluster_2 ");
    const polisClusterTableAlias3 = alias(polisClusterTable, "cluster_3 ");
    const polisClusterTableAlias4 = alias(polisClusterTable, "cluster_4 ");
    const polisClusterTableAlias5 = alias(polisClusterTable, "cluster_5 ");

    const polisClusterOpinionTableAlias0 = alias(
        polisClusterOpinionTable,
        "cluster_opinion_0 ",
    );
    const polisClusterOpinionTableAlias1 = alias(
        polisClusterOpinionTable,
        "cluster_opinion_1 ",
    );
    const polisClusterOpinionTableAlias2 = alias(
        polisClusterOpinionTable,
        "cluster_opinion_2 ",
    );
    const polisClusterOpinionTableAlias3 = alias(
        polisClusterOpinionTable,
        "cluster_opinion_3 ",
    );
    const polisClusterOpinionTableAlias4 = alias(
        polisClusterOpinionTable,
        "cluster_opinion_4 ",
    );
    const polisClusterOpinionTableAlias5 = alias(
        polisClusterOpinionTable,
        "cluster_opinion_5 ",
    );

    let whereClause: SQL | undefined = eq(opinionTable.conversationId, postId);
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
            orderByClause = isSqlOrderByGroupAwareConsensusAgree();
            break;
        }
        case "majority": {
            whereClause = and(whereClause, isNull(opinionModerationTable.id));
            if (clusterKey === undefined) {
                whereClause = and(
                    whereClause,
                    isSqlWhereMajority({
                        numAgreesColumn: opinionTable.numAgrees,
                        numDisagreesColumn: opinionTable.numDisagrees,
                        memberCountColumn: conversationTable.participantCount,
                    }),
                );
                orderByClause = isSqlOrderByMajority({
                    numAgreesColumn: opinionTable.numAgrees,
                    numDisagreesColumn: opinionTable.numDisagrees,
                });
            } else {
                switch (clusterKey) {
                    case "0": {
                        whereClause = and(
                            whereClause,
                            isSqlWhereMajority({
                                numAgreesColumn:
                                    opinionTable.polisCluster0NumAgrees,
                                numDisagreesColumn:
                                    opinionTable.polisCluster0NumDisagrees,
                                memberCountColumn:
                                    polisClusterTableAlias0.numUsers,
                            }),
                        );
                        orderByClause = isSqlOrderByMajority({
                            numAgreesColumn:
                                opinionTable.polisCluster0NumAgrees,
                            numDisagreesColumn:
                                opinionTable.polisCluster0NumDisagrees,
                        });
                        break;
                    }
                    case "1": {
                        whereClause = and(
                            whereClause,
                            isSqlWhereMajority({
                                numAgreesColumn:
                                    opinionTable.polisCluster1NumAgrees,
                                numDisagreesColumn:
                                    opinionTable.polisCluster1NumDisagrees,
                                memberCountColumn:
                                    polisClusterTableAlias1.numUsers,
                            }),
                        );
                        orderByClause = isSqlOrderByMajority({
                            numAgreesColumn:
                                opinionTable.polisCluster1NumAgrees,
                            numDisagreesColumn:
                                opinionTable.polisCluster1NumDisagrees,
                        });
                        break;
                    }
                    case "2": {
                        whereClause = and(
                            whereClause,
                            isSqlWhereMajority({
                                numAgreesColumn:
                                    opinionTable.polisCluster2NumAgrees,
                                numDisagreesColumn:
                                    opinionTable.polisCluster2NumDisagrees,
                                memberCountColumn:
                                    polisClusterTableAlias2.numUsers,
                            }),
                        );
                        orderByClause = isSqlOrderByMajority({
                            numAgreesColumn:
                                opinionTable.polisCluster2NumAgrees,
                            numDisagreesColumn:
                                opinionTable.polisCluster2NumDisagrees,
                        });
                        break;
                    }
                    case "3": {
                        whereClause = and(
                            whereClause,
                            isSqlWhereMajority({
                                numAgreesColumn:
                                    opinionTable.polisCluster3NumAgrees,
                                numDisagreesColumn:
                                    opinionTable.polisCluster3NumDisagrees,
                                memberCountColumn:
                                    polisClusterTableAlias3.numUsers,
                            }),
                        );
                        orderByClause = isSqlOrderByMajority({
                            numAgreesColumn:
                                opinionTable.polisCluster3NumAgrees,
                            numDisagreesColumn:
                                opinionTable.polisCluster3NumDisagrees,
                        });
                        break;
                    }
                    case "4": {
                        whereClause = and(
                            whereClause,
                            isSqlWhereMajority({
                                numAgreesColumn:
                                    opinionTable.polisCluster4NumAgrees,
                                numDisagreesColumn:
                                    opinionTable.polisCluster4NumDisagrees,
                                memberCountColumn:
                                    polisClusterTableAlias4.numUsers,
                            }),
                        );
                        orderByClause = isSqlOrderByMajority({
                            numAgreesColumn:
                                opinionTable.polisCluster4NumAgrees,
                            numDisagreesColumn:
                                opinionTable.polisCluster4NumDisagrees,
                        });
                        break;
                    }
                    case "5": {
                        whereClause = and(
                            whereClause,
                            isSqlWhereMajority({
                                numAgreesColumn:
                                    opinionTable.polisCluster5NumAgrees,
                                numDisagreesColumn:
                                    opinionTable.polisCluster5NumDisagrees,
                                memberCountColumn:
                                    polisClusterTableAlias5.numUsers,
                            }),
                        );
                        orderByClause = isSqlOrderByMajority({
                            numAgreesColumn:
                                opinionTable.polisCluster5NumAgrees,
                            numDisagreesColumn:
                                opinionTable.polisCluster5NumDisagrees,
                        });
                        break;
                    }
                }
            }
            break;
        }
        case "controversial": {
            whereClause = and(whereClause, isNull(opinionModerationTable.id));
            if (clusterKey === undefined) {
                whereClause = and(
                    whereClause,
                    isSqlWhereControversial({
                        numAgreesColumn: opinionTable.numAgrees,
                        memberCountColumn: conversationTable.participantCount,
                        numDisagreesColumn: opinionTable.numDisagrees,
                    }),
                );
                orderByClause = isSqlOrderByControversial({
                    numAgreesColumn: opinionTable.numAgrees,
                    numDisagreesColumn: opinionTable.numDisagrees,
                });
            }
            switch (clusterKey) {
                case "0": {
                    whereClause = and(
                        whereClause,
                        isSqlWhereControversial({
                            numAgreesColumn:
                                opinionTable.polisCluster0NumAgrees,
                            memberCountColumn: polisClusterTableAlias0.numUsers,
                            numDisagreesColumn:
                                opinionTable.polisCluster0NumDisagrees,
                        }),
                    );
                    orderByClause = isSqlOrderByControversial({
                        numAgreesColumn: opinionTable.polisCluster0NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster0NumDisagrees,
                    });
                    break;
                }
                case "1": {
                    whereClause = and(
                        whereClause,
                        isSqlWhereControversial({
                            numAgreesColumn:
                                opinionTable.polisCluster1NumAgrees,
                            memberCountColumn: polisClusterTableAlias1.numUsers,
                            numDisagreesColumn:
                                opinionTable.polisCluster1NumDisagrees,
                        }),
                    );
                    orderByClause = isSqlOrderByControversial({
                        numAgreesColumn: opinionTable.polisCluster1NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster1NumDisagrees,
                    });
                    break;
                }
                case "2": {
                    whereClause = and(
                        whereClause,
                        isSqlWhereControversial({
                            numAgreesColumn:
                                opinionTable.polisCluster2NumAgrees,
                            memberCountColumn: polisClusterTableAlias2.numUsers,
                            numDisagreesColumn:
                                opinionTable.polisCluster2NumDisagrees,
                        }),
                    );
                    orderByClause = isSqlOrderByControversial({
                        numAgreesColumn: opinionTable.polisCluster2NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster2NumDisagrees,
                    });
                    break;
                }
                case "3": {
                    whereClause = and(
                        whereClause,
                        isSqlWhereControversial({
                            numAgreesColumn:
                                opinionTable.polisCluster3NumAgrees,
                            memberCountColumn: polisClusterTableAlias3.numUsers,
                            numDisagreesColumn:
                                opinionTable.polisCluster3NumDisagrees,
                        }),
                    );
                    orderByClause = isSqlOrderByControversial({
                        numAgreesColumn: opinionTable.polisCluster3NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster3NumDisagrees,
                    });
                    break;
                }
                case "4": {
                    whereClause = and(
                        whereClause,
                        isSqlWhereControversial({
                            numAgreesColumn:
                                opinionTable.polisCluster4NumAgrees,
                            memberCountColumn: polisClusterTableAlias4.numUsers,
                            numDisagreesColumn:
                                opinionTable.polisCluster4NumDisagrees,
                        }),
                    );
                    orderByClause = isSqlOrderByControversial({
                        numAgreesColumn: opinionTable.polisCluster4NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster4NumDisagrees,
                    });
                    break;
                }
                case "5": {
                    whereClause = and(
                        whereClause,
                        isSqlWhereControversial({
                            numAgreesColumn:
                                opinionTable.polisCluster5NumAgrees,
                            memberCountColumn: polisClusterTableAlias5.numUsers,
                            numDisagreesColumn:
                                opinionTable.polisCluster5NumDisagrees,
                        }),
                    );
                    orderByClause = isSqlOrderByControversial({
                        numAgreesColumn: opinionTable.polisCluster5NumAgrees,
                        numDisagreesColumn:
                            opinionTable.polisCluster5NumDisagrees,
                    });
                    break;
                }
            }
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
                            polisClusterOpinionIdColumn:
                                polisClusterOpinionTableAlias0.id,
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
                            polisClusterOpinionIdColumn:
                                polisClusterOpinionTableAlias1.id,
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
                            polisClusterOpinionIdColumn:
                                polisClusterOpinionTableAlias2.id,
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
                            polisClusterOpinionIdColumn:
                                polisClusterOpinionTableAlias3.id,
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
                            polisClusterOpinionIdColumn:
                                polisClusterOpinionTableAlias4.id,
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
                            polisClusterOpinionIdColumn:
                                polisClusterOpinionTableAlias5.id,
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
            polisCluster1Id: polisClusterTableAlias1.id,
            polisCluster1Key: polisClusterTableAlias1.key,
            polisCluster1AiLabel: polisClusterTableAlias1.aiLabel,
            polisCluster1NumUsers: polisClusterTableAlias1.numUsers,
            polisCluster1NumAgrees: opinionTable.polisCluster1NumAgrees,
            polisCluster1NumDisagrees: opinionTable.polisCluster1NumDisagrees,
            polisCluster2Id: polisClusterTableAlias2.id,
            polisCluster2Key: polisClusterTableAlias2.key,
            polisCluster2AiLabel: polisClusterTableAlias2.aiLabel,
            polisCluster2NumUsers: polisClusterTableAlias2.numUsers,
            polisCluster2NumAgrees: opinionTable.polisCluster2NumAgrees,
            polisCluster2NumDisagrees: opinionTable.polisCluster2NumDisagrees,
            polisCluster3Id: polisClusterTableAlias3.id,
            polisCluster3Key: polisClusterTableAlias3.key,
            polisCluster3AiLabel: polisClusterTableAlias3.aiLabel,
            polisCluster3NumUsers: polisClusterTableAlias3.numUsers,
            polisCluster3NumAgrees: opinionTable.polisCluster3NumAgrees,
            polisCluster3NumDisagrees: opinionTable.polisCluster3NumDisagrees,
            polisCluster4Id: polisClusterTableAlias4.id,
            polisCluster4Key: polisClusterTableAlias4.key,
            polisCluster4AiLabel: polisClusterTableAlias4.aiLabel,
            polisCluster4NumUsers: polisClusterTableAlias4.numUsers,
            polisCluster4NumAgrees: opinionTable.polisCluster4NumAgrees,
            polisCluster4NumDisagrees: opinionTable.polisCluster4NumDisagrees,
            polisCluster5Id: polisClusterTableAlias5.id,
            polisCluster5Key: polisClusterTableAlias5.key,
            polisCluster5AiLabel: polisClusterTableAlias5.aiLabel,
            polisCluster5NumUsers: polisClusterTableAlias5.numUsers,
            polisCluster5NumAgrees: opinionTable.polisCluster5NumAgrees,
            polisCluster5NumDisagrees: opinionTable.polisCluster5NumDisagrees,
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
            eq(
                polisClusterOpinionTableAlias0.polisClusterId,
                polisClusterTableAlias0.id,
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias1,
            eq(
                polisClusterOpinionTableAlias1.polisClusterId,
                polisClusterTableAlias1.id,
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias2,
            eq(
                polisClusterOpinionTableAlias2.polisClusterId,
                polisClusterTableAlias2.id,
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias3,
            eq(
                polisClusterOpinionTableAlias3.polisClusterId,
                polisClusterTableAlias3.id,
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias4,
            eq(
                polisClusterOpinionTableAlias4.polisClusterId,
                polisClusterTableAlias4.id,
            ),
        )
        .leftJoin(
            polisClusterOpinionTableAlias5,
            eq(
                polisClusterOpinionTableAlias5.polisClusterId,
                polisClusterTableAlias5.id,
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
            opinionResponse.polisCluster0NumDisagrees !== null
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
                aiLabel: toUnionUndefined(opinionResponse.polisCluster1AiLabel),
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
                aiLabel: toUnionUndefined(opinionResponse.polisCluster2AiLabel),
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
                aiLabel: toUnionUndefined(opinionResponse.polisCluster3AiLabel),
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
                aiLabel: toUnionUndefined(opinionResponse.polisCluster4AiLabel),
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
                aiLabel: toUnionUndefined(opinionResponse.polisCluster5AiLabel),
                isAuthorInCluster:
                    opinionResponse.opinionAuthorPolisClusterId ===
                    opinionResponse.polisCluster5Id,
                numUsers: opinionResponse.polisCluster5NumUsers,
                numAgrees: opinionResponse.polisCluster5NumAgrees,
                numDisagrees: opinionResponse.polisCluster5NumDisagrees,
            });
        }
        const item: OpinionItem = {
            opinion: opinionResponse.comment,
            opinionSlugId: opinionResponse.commentSlugId,
            createdAt: opinionResponse.createdAt,
            numParticipants: opinionResponse.numParticipants,
            numDisagrees: opinionResponse.numDisagrees,
            numAgrees: opinionResponse.numAgrees,
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
    axiosPolis: AxiosInstance | undefined;
    polisUserEmailDomain: string;
    polisUserEmailLocalPart: string;
    polisUserPassword: string;
    polisDelayToFetch: number;
    voteNotifMilestones: number[];
    awsAiLabelSummaryEnable: boolean;
    awsAiLabelSummaryRegion: string;
    awsAiLabelSummaryModelId: string;
    awsAiLabelSummaryTemperature: string;
    awsAiLabelSummaryTopP: string;
    awsAiLabelSummaryMaxTokens: string;
    awsAiLabelSummaryPrompt: string;
    now: Date;
    isSeed: boolean;
}

interface ImportNewOpinionProps {
    db: PostgresJsDatabase;
    commentBody: string;
    commentId: string; // external imported Polis commentId
    conversationSlugId: string;
    conversationId: number;
    conversationContentId: number;
    userId: string;
    axiosPolis: AxiosInstance;
}

interface ImportNewOpinionReturn {
    commentId: string; // external imported Polis commentId
    opinionId: number;
    opinionSlugId: string;
    opinionContentId: number;
}

export async function importNewOpinion({
    db,
    commentBody,
    commentId, // external imported Polis commentId
    conversationSlugId,
    conversationId,
    conversationContentId,
    userId,
    axiosPolis,
}: ImportNewOpinionProps): Promise<ImportNewOpinionReturn> {
    const opinionSlugId = generateRandomSlugId();
    const result = await db.transaction(async (tx) => {
        const insertCommentResponse = await tx
            .insert(opinionTable)
            .values({
                slugId: opinionSlugId,
                authorId: userId,
                currentContentId: null,
                conversationId: conversationId,
                isSeed: false,
            })
            .returning({ opinionId: opinionTable.id });

        const opinionId = insertCommentResponse[0].opinionId;
        const commentContentTableResponse = await tx
            .insert(opinionContentTable)
            .values({
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

        // Update the conversation's opinion count
        await tx
            .update(conversationTable)
            .set({
                opinionCount: sql`${conversationTable.opinionCount} + 1`,
            })
            .where(eq(conversationTable.slugId, conversationSlugId));

        return {
            commentId,
            opinionId,
            opinionSlugId,
            opinionContentId: commentContentTableId,
        };
    });

    await polisService.createOpinion({
        axiosPolis,
        userId,
        opinionSlugId,
        conversationSlugId,
    });

    return result;
}

export async function postNewOpinion({
    db,
    commentBody,
    conversationSlugId,
    didWrite,
    proof,
    userAgent,
    now,
    axiosPolis,
    polisUserEmailDomain,
    polisUserEmailLocalPart,
    polisUserPassword,
    polisDelayToFetch,
    voteNotifMilestones,
    awsAiLabelSummaryEnable,
    awsAiLabelSummaryRegion,
    awsAiLabelSummaryModelId,
    awsAiLabelSummaryTemperature,
    awsAiLabelSummaryTopP,
    awsAiLabelSummaryMaxTokens,
    awsAiLabelSummaryPrompt,
    isSeed,
}: PostNewOpinionProps): Promise<CreateCommentResponse> {
    const { getPostMetadataFromSlugId, getOpinionCountBypassCache } =
        useCommonPost();
    const {
        id: conversationId,
        contentId: conversationContentId,
        authorId: conversationAuthorId,
        isIndexed: conversationIsIndexed,
        isLoginRequired: conversationIsLoginRequired,
        opinionCount: conversationOpinionCount,
    } = await getPostMetadataFromSlugId({
        db: db,
        conversationSlugId: conversationSlugId,
        useCache: false,
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
        axiosPolis,
        polisUserEmailDomain,
        polisUserEmailLocalPart,
        polisUserPassword,
        now,
    });

    const opinionSlugId = generateRandomSlugId();
    const userOpinionCountBeforeAction = await getOpinionCountBypassCache({
        db,
        conversationId,
        userId,
    });

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

        // Update the conversation's opinion count
        await tx
            .update(conversationTable)
            .set({
                opinionCount: conversationOpinionCount + 1,
            })
            .where(eq(conversationTable.slugId, conversationSlugId));

        // Update the user profile's comment count
        await tx
            .update(userTable)
            .set({
                totalOpinionCount: userOpinionCountBeforeAction + 1,
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

        if (axiosPolis !== undefined) {
            await polisService.createOpinion({
                axiosPolis,
                userId,
                opinionSlugId,
                conversationSlugId,
            });
        }

        // opinion author agrees automatically on its own opinion
        await castVoteForOpinionSlugId({
            db: tx,
            opinionSlugId: opinionSlugId,
            didWrite: didWrite,
            proof: proof,
            votingAction: "agree",
            userAgent: userAgent,
            axiosPolis: axiosPolis,
            polisUserEmailDomain,
            polisUserEmailLocalPart,
            polisUserPassword,
            polisDelayToFetch,
            voteNotifMilestones,
            awsAiLabelSummaryEnable,
            awsAiLabelSummaryRegion,
            awsAiLabelSummaryModelId,
            awsAiLabelSummaryTemperature,
            awsAiLabelSummaryTopP,
            awsAiLabelSummaryMaxTokens,
            awsAiLabelSummaryPrompt,
            now: now,
        });
    });

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
                postId: opinionTable.conversationId,
            });

        if (updatedCommentIdResponse.length != 1) {
            log.error(
                "Invalid comment table update response length: " +
                    updatedCommentIdResponse.length.toString(),
            );
            tx.rollback();
        }

        const commentId = updatedCommentIdResponse[0].updateCommentId;

        await tx.insert(opinionProofTable).values({
            type: "deletion",
            opinionId: commentId,
            authorDid: didWrite,
            proof: proof,
            proofVersion: 1,
        });

        const postId = updatedCommentIdResponse[0].postId;

        await tx
            .update(conversationTable)
            .set({
                opinionCount: sql`${conversationTable.opinionCount} - 1`,
            })
            .where(eq(conversationTable.id, postId));
        // TODO: delete from Polis as well!
        // don't count votes on deleted opinions => recalculate polis clusters
    });
}
