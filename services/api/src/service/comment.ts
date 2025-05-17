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
} from "@/schema.js";
import type {
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
    asc,
} from "drizzle-orm";
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
import { toUnionUndefined } from "@/shared/shared.js";
import { processHtmlBody } from "@/utils/htmlSanitization.js";
import { log } from "@/app.js";
import { createCommentModerationPropertyObject } from "./moderation.js";
import { getUserMutePreferences } from "./muteUser.js";
import type { AxiosInstance } from "axios";
import * as polisService from "@/service/polis.js";
import { alias } from "drizzle-orm/pg-core";
import * as authUtilService from "@/service/authUtil.js";
import { castVoteForOpinionSlugId } from "./voting.js";

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
    filterTarget: "new" | "moderated" | "hidden" | "majority" | "controversial";
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

    let whereClause: SQL | undefined = eq(opinionTable.conversationId, postId);
    let orderByClause: SQL[];
    switch (filterTarget) {
        case "moderated": {
            whereClause = and(
                whereClause,
                ne(opinionModerationTable.moderationAction, "hide"),
                isNotNull(opinionModerationTable.id),
            );
            orderByClause = [desc(opinionTable.createdAt)];
            break;
        }
        case "hidden": {
            whereClause = and(
                whereClause,
                eq(opinionModerationTable.moderationAction, "hide"),
                isNotNull(opinionModerationTable.id),
            );
            orderByClause = [desc(opinionTable.createdAt)];
            break;
        }
        case "new": {
            whereClause = and(whereClause, isNull(opinionModerationTable.id));
            orderByClause = [desc(opinionTable.createdAt)];
            break;
        }
        case "majority": {
            whereClause = and(whereClause, isNull(opinionModerationTable.id));
            orderByClause = [
                desc(
                    // we ponderate by the number of votes (if just 1-0 then it's not interesting....)
                    sql`(COALESCE(${opinionTable.polisCluster0NumDisagrees}, 0) + COALESCE(${opinionTable.polisCluster0NumAgrees}, 0)) * 
                    ABS(COALESCE(${opinionTable.polisCluster0NumAgrees}, 0) - COALESCE(${opinionTable.polisCluster0NumDisagrees}, 0))`,
                ),
            ];
            break;
        }
        case "controversial": {
            whereClause = and(whereClause, isNull(opinionModerationTable.id));
            orderByClause = [
                asc(
                    sql`
                        CASE 
                          WHEN (COALESCE(${opinionTable.polisCluster0NumDisagrees}, 0) + COALESCE(${opinionTable.polisCluster0NumAgrees}, 0)) = 0 
                          THEN 'Infinity'::float -- Assign a large value when no interactions so it will be picked last
                          ELSE ABS(COALESCE(${opinionTable.polisCluster0NumAgrees}, 0) - COALESCE(${opinionTable.polisCluster0NumDisagrees}, 0)) 
                               / (COALESCE(${opinionTable.polisCluster0NumDisagrees}, 0) + COALESCE(${opinionTable.polisCluster0NumAgrees}, 0))
                        END
              `,
                ),
            ];
            break;
        }
    }
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
                const opinionItemMapMajority: Map<string, OpinionItem> =
                    await fetchOpinions({
                        db,
                        postSlugId,
                        personalizationUserId,
                        filterTarget: "majority",
                        clusterKey,
                        limit: limit,
                    });
                const opinionItemMajorityEntries = Array.from(
                    opinionItemMapMajority.entries(),
                );
                const opinionItemMapControversial: OpinionItemPerSlugId =
                    await fetchOpinions({
                        db,
                        postSlugId,
                        personalizationUserId,
                        filterTarget: "controversial",
                        clusterKey,
                        limit: limit,
                    });
                const opinionItemControversialEntries = Array.from(
                    opinionItemMapControversial.entries(),
                );
                // Create a new map that interleaves entries from map1 and map2
                opinionItemMap = new Map<string, OpinionItem>();
                for (
                    let i = 0;
                    i <
                    Math.max(
                        opinionItemMapMajority.size,
                        opinionItemMapControversial.size,
                    );
                    i++
                ) {
                    if (i < opinionItemMapMajority.size) {
                        const key = opinionItemMajorityEntries[i][0];
                        const value = opinionItemMajorityEntries[i][1];
                        // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                        if (!opinionItemMap.has(key)) {
                            opinionItemMap.set(key, value);
                        }
                    }
                    if (i < opinionItemMapControversial.size) {
                        const key = opinionItemControversialEntries[i][0];
                        const value = opinionItemControversialEntries[i][1];
                        // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                        if (!opinionItemMap.has(key)) {
                            opinionItemMap.set(key, value);
                        }
                    }
                }
            }
            break;
        }
        case "discover": {
            const smallerLimit = 500;
            const opinionItemMapMajority: Map<string, OpinionItem> =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "majority",
                    limit: smallerLimit,
                });
            const opinionItemMajorityEntries = Array.from(
                opinionItemMapMajority.entries(),
            );
            const opinionItemMapControversial: OpinionItemPerSlugId =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "controversial",
                    limit: smallerLimit,
                });
            const opinionItemControversialEntries = Array.from(
                opinionItemMapControversial.entries(),
            );
            const opinionItemMapNew: OpinionItemPerSlugId = await fetchOpinions(
                {
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "new",
                    limit: smallerLimit,
                },
            );
            const opinionItemNewEntries = Array.from(
                opinionItemMapNew.entries(),
            );
            const opinionItemMapCluster0Majority: OpinionItemPerSlugId =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "majority",
                    clusterKey: "0",
                    limit: smallerLimit,
                });
            const opinionItemCluster0MajorityEntries = Array.from(
                opinionItemMapCluster0Majority.entries(),
            );
            const opinionItemMapCluster0Controversial: OpinionItemPerSlugId =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "controversial",
                    clusterKey: "0",
                    limit: smallerLimit,
                });
            const opinionItemCluster0ControversialEntries = Array.from(
                opinionItemMapCluster0Controversial.entries(),
            );
            const opinionItemMapCluster1Majority: OpinionItemPerSlugId =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "majority",
                    clusterKey: "1",
                    limit: smallerLimit,
                });
            const opinionItemCluster1MajorityEntries = Array.from(
                opinionItemMapCluster1Majority.entries(),
            );
            const opinionItemMapCluster1Controversial: OpinionItemPerSlugId =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "controversial",
                    clusterKey: "1",
                    limit: smallerLimit,
                });
            const opinionItemCluster1ControversialEntries = Array.from(
                opinionItemMapCluster1Controversial.entries(),
            );
            const opinionItemMapCluster2Majority: OpinionItemPerSlugId =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "majority",
                    clusterKey: "2",
                    limit: smallerLimit,
                });
            const opinionItemCluster2MajorityEntries = Array.from(
                opinionItemMapCluster2Majority.entries(),
            );
            const opinionItemMapCluster2Controversial: OpinionItemPerSlugId =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "controversial",
                    clusterKey: "2",
                    limit: smallerLimit,
                });
            const opinionItemCluster2ControversialEntries = Array.from(
                opinionItemMapCluster2Controversial.entries(),
            );
            const opinionItemMapCluster3Majority: OpinionItemPerSlugId =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "majority",
                    clusterKey: "3",
                    limit: smallerLimit,
                });
            const opinionItemCluster3MajorityEntries = Array.from(
                opinionItemMapCluster3Majority.entries(),
            );
            const opinionItemMapCluster3Controversial: OpinionItemPerSlugId =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "controversial",
                    clusterKey: "3",
                    limit: smallerLimit,
                });
            const opinionItemCluster3ControversialEntries = Array.from(
                opinionItemMapCluster3Controversial.entries(),
            );
            const opinionItemMapCluster4Majority: OpinionItemPerSlugId =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "majority",
                    clusterKey: "4",
                    limit: smallerLimit,
                });
            const opinionItemCluster4MajorityEntries = Array.from(
                opinionItemMapCluster4Majority.entries(),
            );
            const opinionItemMapCluster4Controversial: OpinionItemPerSlugId =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "controversial",
                    clusterKey: "4",
                    limit: smallerLimit,
                });
            const opinionItemCluster4ControversialEntries = Array.from(
                opinionItemMapCluster4Controversial.entries(),
            );
            const opinionItemMapCluster5Majority: OpinionItemPerSlugId =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "majority",
                    clusterKey: "5",
                    limit: smallerLimit,
                });
            const opinionItemCluster5MajorityEntries = Array.from(
                opinionItemMapCluster5Majority.entries(),
            );
            const opinionItemMapCluster5Controversial: OpinionItemPerSlugId =
                await fetchOpinions({
                    db,
                    postSlugId,
                    personalizationUserId,
                    filterTarget: "controversial",
                    clusterKey: "5",
                    limit: smallerLimit,
                });
            const opinionItemCluster5ControversialEntries = Array.from(
                opinionItemMapCluster5Controversial.entries(),
            );

            // Create a new map that interleaves entries from map1 and map2
            opinionItemMap = new Map<string, OpinionItem>();
            for (
                let i = 0;
                i <
                Math.max(
                    opinionItemMapMajority.size,
                    opinionItemMapControversial.size,
                    opinionItemMapNew.size,
                    opinionItemMapCluster0Majority.size,
                    opinionItemMapCluster0Controversial.size,
                    opinionItemMapCluster1Majority.size,
                    opinionItemMapCluster1Controversial.size,
                    opinionItemMapCluster2Majority.size,
                    opinionItemMapCluster2Controversial.size,
                    opinionItemMapCluster3Majority.size,
                    opinionItemMapCluster3Controversial.size,
                    opinionItemMapCluster4Majority.size,
                    opinionItemMapCluster4Controversial.size,
                    opinionItemMapCluster5Majority.size,
                    opinionItemMapCluster5Controversial.size,
                );
                i++
            ) {
                if (i < opinionItemMapMajority.size) {
                    const key = opinionItemMajorityEntries[i][0];
                    const value = opinionItemMajorityEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                if (i < opinionItemMapControversial.size) {
                    const key = opinionItemControversialEntries[i][0];
                    const value = opinionItemControversialEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                // TODO: choose order at random between which cluster core opinion to show first! and add smarter algs
                if (i < opinionItemMapCluster0Majority.size) {
                    const key = opinionItemCluster0MajorityEntries[i][0];
                    const value = opinionItemCluster0MajorityEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                if (i < opinionItemMapCluster1Majority.size) {
                    const key = opinionItemCluster1MajorityEntries[i][0];
                    const value = opinionItemCluster1MajorityEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                if (i < opinionItemMapCluster2Majority.size) {
                    const key = opinionItemCluster2MajorityEntries[i][0];
                    const value = opinionItemCluster2MajorityEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                if (i < opinionItemMapCluster3Majority.size) {
                    const key = opinionItemCluster3MajorityEntries[i][0];
                    const value = opinionItemCluster3MajorityEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                if (i < opinionItemMapCluster4Majority.size) {
                    const key = opinionItemCluster4MajorityEntries[i][0];
                    const value = opinionItemCluster4MajorityEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                if (i < opinionItemMapCluster5Majority.size) {
                    const key = opinionItemCluster5MajorityEntries[i][0];
                    const value = opinionItemCluster5MajorityEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                if (i < opinionItemMapCluster5Controversial.size) {
                    const key = opinionItemCluster5ControversialEntries[i][0];
                    const value = opinionItemCluster5ControversialEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                if (i < opinionItemMapCluster4Controversial.size) {
                    const key = opinionItemCluster4ControversialEntries[i][0];
                    const value = opinionItemCluster4ControversialEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                if (i < opinionItemMapCluster3Controversial.size) {
                    const key = opinionItemCluster3ControversialEntries[i][0];
                    const value = opinionItemCluster3ControversialEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                if (i < opinionItemMapCluster2Controversial.size) {
                    const key = opinionItemCluster2ControversialEntries[i][0];
                    const value = opinionItemCluster2ControversialEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                if (i < opinionItemMapCluster1Controversial.size) {
                    const key = opinionItemCluster1ControversialEntries[i][0];
                    const value = opinionItemCluster1ControversialEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                if (i < opinionItemMapCluster0Controversial.size) {
                    const key = opinionItemCluster0ControversialEntries[i][0];
                    const value = opinionItemCluster0ControversialEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
                if (i < opinionItemMapNew.size) {
                    const key = opinionItemNewEntries[i][0];
                    const value = opinionItemNewEntries[i][1];
                    // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
                    if (!opinionItemMap.has(key)) {
                        opinionItemMap.set(key, value);
                    }
                }
            }
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
        commentBody = processHtmlBody(commentBody);
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
