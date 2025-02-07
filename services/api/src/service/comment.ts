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
    polisClusterOpinionTable,
    polisClusterUserTable,
    voteContentTable,
} from "@/schema.js";
import type {
    CreateCommentResponse,
    GetOpinionBySlugIdListResponse,
} from "@/shared/types/dto.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { desc, eq, sql, and, isNull, isNotNull, ne, SQL } from "drizzle-orm";
import type {
    CommentFeedFilter,
    OpinionItem,
    OpinionItemPerSlugId,
    SlugId,
} from "@/shared/types/zod.js";
import { httpErrors, type HttpErrors } from "@fastify/sensible";
import { useCommonPost } from "./common.js";
import { MAX_LENGTH_COMMENT, toUnionUndefined } from "@/shared/shared.js";
import { sanitizeHtmlBody } from "@/utils/htmlSanitization.js";
import { log } from "@/app.js";
import { createCommentModerationPropertyObject } from "./moderation.js";
import { getUserMutePreferences } from "./muteUser.js";
import type { AxiosInstance } from "axios";
import * as polisService from "@/service/polis.js";
import { voteTable } from "@/schema.js";

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

interface FetchOpinionsByConversationSlugIdProps {
    db: PostgresJsDatabase;
    postSlugId: SlugId;
    fetchTarget: CommentFeedFilter; // if cluster, then we filter by clusterKey
    personalizationUserId?: string;
    clusterKey: number | undefined;
}

export async function fetchOpinionsByConversationSlugId({
    db,
    postSlugId,
    fetchTarget,
    personalizationUserId,
    clusterKey,
}: FetchOpinionsByConversationSlugIdProps): Promise<OpinionItemPerSlugId> {
    const postId = await getPostIdFromPostSlugId(db, postSlugId);

    let whereClause: SQL | undefined = eq(opinionTable.conversationId, postId);

    switch (fetchTarget) {
        case "moderated":
            whereClause = and(
                whereClause,
                ne(opinionModerationTable.moderationAction, "hide"),
                isNotNull(opinionModerationTable.id),
            );
            break;
        case "hidden":
            whereClause = and(
                whereClause,
                eq(opinionModerationTable.moderationAction, "hide"),
                isNotNull(opinionModerationTable.id),
            );
            break;
        case "cluster":
            if (clusterKey != undefined) {
                whereClause = and(
                    whereClause,
                    isNull(opinionModerationTable.id),
                    eq(polisClusterTable.key, clusterKey),
                );
            } else {
                httpErrors.badRequest(
                    "Missing cluster key input for the cluster filter algorithm",
                );
            }
            break;
        default:
            whereClause = and(whereClause, isNull(opinionModerationTable.id));
            break;
    }

    let results;
    if (fetchTarget === "discover") {
        results = await db
            .select({
                // comment payload
                commentSlugId: opinionTable.slugId,
                createdAt: opinionTable.createdAt,
                updatedAt: opinionTable.updatedAt,
                comment: opinionContentTable.content,
                authorId: opinionTable.authorId,
                numLikes: opinionTable.numAgrees,
                numDislikes: opinionTable.numDisagrees,
                username: userTable.username,
                moderationAction: opinionModerationTable.moderationAction,
                moderationExplanation:
                    opinionModerationTable.moderationExplanation,
                moderationReason: opinionModerationTable.moderationReason,
                moderationCreatedAt: opinionModerationTable.createdAt,
                moderationUpdatedAt: opinionModerationTable.updatedAt,
                polisClusterKey: polisClusterTable.key,
                polisClusterNumUsers: polisClusterTable.numUsers,
                polisClusterAiLabel: polisClusterTable.aiLabel,
                polisClusterOpinionAgreementType:
                    polisClusterOpinionTable.agreementType,
                polisClusterOpinionPercentageAgreement:
                    polisClusterOpinionTable.percentageAgreement,
                polisClusterOpinionNumAgreement:
                    polisClusterOpinionTable.numAgreement, // example: 0, 1, 2...etc (number or agrees or disagrees)
                polisClusterUserId: polisClusterUserTable.userId,
                polisClusterUserVote: voteContentTable.vote,
                rankNumAgrees:
                    sql`ROW_NUMBER() OVER (ORDER BY ${opinionTable.numAgrees} DESC)`.as(
                        "rankNumAgrees",
                    ),
                rankNumDisagrees:
                    sql`ROW_NUMBER() OVER (ORDER BY ${opinionTable.numDisagrees} DESC)`.as(
                        "rankNumDisagrees",
                    ),
                rankClusterPercentageAgreement:
                    sql`ROW_NUMBER() OVER (ORDER BY COALESCE(${polisClusterOpinionTable.percentageAgreement}, -1) DESC)`.as(
                        "rankClusterPercentageAgreement",
                    ),
                rankPolisPriority:
                    sql`ROW_NUMBER() OVER (ORDER BY COALESCE(${opinionTable.polisPriority}, -1) DESC)`.as(
                        "rankPolisPriority",
                    ),
                rankCreatedAt:
                    sql`ROW_NUMBER() OVER (ORDER BY ${opinionTable.createdAt} DESC)`.as(
                        "rankCreatedAt",
                    ),
            })
            .from(opinionTable)
            .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
            .innerJoin(conversationTable, eq(conversationTable.id, postId))
            .innerJoin(
                opinionContentTable,
                eq(opinionContentTable.id, opinionTable.currentContentId),
            )
            .leftJoin(
                polisContentTable,
                eq(
                    polisContentTable.id,
                    conversationTable.currentPolisContentId,
                ),
            )
            .leftJoin(
                polisClusterTable,
                eq(polisClusterTable.polisContentId, polisContentTable.id),
            )
            .leftJoin(
                // TODO: don't join, select this from cache in the opinionTable directly, tha'ts populated upon reception of the data from polis external system
                polisClusterOpinionTable,
                and(
                    eq(
                        polisClusterOpinionTable.polisClusterId,
                        polisClusterTable.id,
                    ),
                    eq(
                        polisClusterOpinionTable.opinionSlugId,
                        opinionTable.slugId,
                    ),
                ),
            )
            .leftJoin(
                polisClusterUserTable,

                and(
                    eq(
                        polisClusterUserTable.polisClusterId,
                        polisClusterTable.id,
                    ),
                    eq(
                        polisClusterUserTable.polisContentId,
                        polisContentTable.id,
                    ),
                ),
            )
            .leftJoin(
                // TODO: don't join, select that directly from the opinionTable, by populating it via the "group-votes" field upon data reception from polis system
                voteTable,
                and(
                    eq(voteTable.authorId, polisClusterUserTable.userId),
                    eq(voteTable.opinionId, opinionTable.id),
                ),
            )
            .leftJoin(
                voteContentTable,
                eq(voteContentTable.id, voteTable.currentContentId),
            )
            .leftJoin(
                opinionModerationTable,
                eq(opinionModerationTable.opinionId, opinionTable.id),
            )
            .orderBy(
                sql`LEAST(
            ROW_NUMBER() OVER (ORDER BY ${opinionTable.numAgrees} DESC), 
            ROW_NUMBER() OVER (ORDER BY ${opinionTable.numDisagrees} DESC), 
            ROW_NUMBER() OVER (ORDER BY COALESCE(${polisClusterOpinionTable.percentageAgreement}, -1) DESC), 
            ROW_NUMBER() OVER (ORDER BY ${opinionTable.createdAt} DESC)
        )`,
                sql`ROW_NUMBER() OVER (ORDER BY ${opinionTable.numAgrees} DESC)`,
                sql`ROW_NUMBER() OVER (ORDER BY ${opinionTable.numDisagrees} DESC)`,
                sql`ROW_NUMBER() OVER (ORDER BY COALESCE(${polisClusterOpinionTable.percentageAgreement}, -1) DESC)`,
                sql`ROW_NUMBER() OVER (ORDER BY ${opinionTable.createdAt} DESC)`,
            )
            // .orderBy(
            //     desc(polisClusterOpinionTable.percentageAgreement),
            //     desc(opinionTable.polisPriority),
            //     desc(opinionTable.createdAt),
            // )
            .where(whereClause);
    } else if (fetchTarget === "cluster") {
        results = await db
            .select({
                // comment payload
                commentSlugId: opinionTable.slugId,
                createdAt: opinionTable.createdAt,
                updatedAt: opinionTable.updatedAt,
                comment: opinionContentTable.content,
                authorId: opinionTable.authorId,
                numLikes: opinionTable.numAgrees,
                numDislikes: opinionTable.numDisagrees,
                username: userTable.username,
                moderationAction: opinionModerationTable.moderationAction,
                moderationExplanation:
                    opinionModerationTable.moderationExplanation,
                moderationReason: opinionModerationTable.moderationReason,
                moderationCreatedAt: opinionModerationTable.createdAt,
                moderationUpdatedAt: opinionModerationTable.updatedAt,
                polisClusterKey: polisClusterTable.key,
                polisClusterNumUsers: polisClusterTable.numUsers,
                polisClusterAiLabel: polisClusterTable.aiLabel,
                polisClusterOpinionAgreementType:
                    polisClusterOpinionTable.agreementType,
                polisClusterOpinionPercentageAgreement:
                    polisClusterOpinionTable.percentageAgreement,
                polisClusterOpinionNumAgreement:
                    polisClusterOpinionTable.numAgreement, // example: 0, 1, 2...etc (number or agrees or disagrees)
                polisClusterUserId: polisClusterUserTable.userId,
                polisClusterUserVote: voteContentTable.vote,
                rankNumAgrees:
                    sql`ROW_NUMBER() OVER (ORDER BY ${opinionTable.numAgrees} DESC)`.as(
                        "rankNumAgrees",
                    ),
                rankNumDisagrees:
                    sql`ROW_NUMBER() OVER (ORDER BY ${opinionTable.numDisagrees} DESC)`.as(
                        "rankNumDisagrees",
                    ),
                rankClusterPercentageAgreement:
                    sql`ROW_NUMBER() OVER (ORDER BY COALESCE(${polisClusterOpinionTable.percentageAgreement}, -1) DESC)`.as(
                        "rankClusterPercentageAgreement",
                    ),
                rankPolisPriority:
                    sql`ROW_NUMBER() OVER (ORDER BY COALESCE(${opinionTable.polisPriority}, -1) DESC)`.as(
                        "rankPolisPriority",
                    ),
                rankCreatedAt:
                    sql`ROW_NUMBER() OVER (ORDER BY ${opinionTable.createdAt} DESC)`.as(
                        "rankCreatedAt",
                    ),
            })
            .from(opinionTable)
            .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
            .innerJoin(conversationTable, eq(conversationTable.id, postId))
            .innerJoin(
                opinionContentTable,
                eq(opinionContentTable.id, opinionTable.currentContentId),
            )
            .leftJoin(
                polisContentTable,
                eq(
                    polisContentTable.id,
                    conversationTable.currentPolisContentId,
                ),
            )
            .leftJoin(
                polisClusterTable,
                eq(polisClusterTable.polisContentId, polisContentTable.id),
            )
            .leftJoin(
                polisClusterOpinionTable,
                and(
                    eq(
                        polisClusterOpinionTable.polisClusterId,
                        polisClusterTable.id,
                    ),
                    eq(
                        polisClusterOpinionTable.opinionSlugId,
                        opinionTable.slugId,
                    ),
                ),
            )
            .leftJoin(
                polisClusterUserTable,
                and(
                    eq(
                        polisClusterUserTable.polisClusterId,
                        polisClusterTable.id,
                    ),
                    eq(
                        polisClusterUserTable.polisContentId,
                        polisContentTable.id,
                    ),
                ),
            )
            .leftJoin(
                voteTable,
                and(
                    eq(voteTable.authorId, polisClusterUserTable.userId),
                    eq(voteTable.opinionId, opinionTable.id),
                ),
            )
            .leftJoin(
                voteContentTable,
                eq(voteContentTable.id, voteTable.currentContentId),
            )
            .leftJoin(
                opinionModerationTable,
                eq(opinionModerationTable.opinionId, opinionTable.id),
            )
            .orderBy(
                sql`CASE ${polisClusterTable.key} 
                    WHEN ${clusterKey} THEN 1
                    ELSE 2 END`,
                sql`LEAST(
            ROW_NUMBER() OVER (ORDER BY ${opinionTable.numAgrees} DESC), 
            ROW_NUMBER() OVER (ORDER BY ${opinionTable.numDisagrees} DESC), 
            ROW_NUMBER() OVER (ORDER BY COALESCE(${polisClusterOpinionTable.percentageAgreement}, -1) DESC), 
            ROW_NUMBER() OVER (ORDER BY ${opinionTable.createdAt} DESC)
        )`,
                sql`ROW_NUMBER() OVER (ORDER BY ${opinionTable.numAgrees} DESC)`,
                sql`ROW_NUMBER() OVER (ORDER BY ${opinionTable.numDisagrees} DESC)`,
                sql`ROW_NUMBER() OVER (ORDER BY COALESCE(${polisClusterOpinionTable.percentageAgreement}, -1) DESC)`,
                sql`ROW_NUMBER() OVER (ORDER BY ${opinionTable.createdAt} DESC)`,
            )
            // .orderBy(
            //     desc(polisClusterOpinionTable.percentageAgreement),
            //     desc(opinionTable.polisPriority),
            //     desc(opinionTable.createdAt),
            // )
            .where(whereClause);
    } else {
        results = await db
            .select({
                // comment payload
                commentSlugId: opinionTable.slugId,
                createdAt: opinionTable.createdAt,
                updatedAt: opinionTable.updatedAt,
                comment: opinionContentTable.content,
                authorId: opinionTable.authorId,
                numLikes: opinionTable.numAgrees,
                numDislikes: opinionTable.numDisagrees,
                username: userTable.username,
                moderationAction: opinionModerationTable.moderationAction,
                moderationExplanation:
                    opinionModerationTable.moderationExplanation,
                moderationReason: opinionModerationTable.moderationReason,
                moderationCreatedAt: opinionModerationTable.createdAt,
                moderationUpdatedAt: opinionModerationTable.updatedAt,
                polisClusterKey: polisClusterTable.key,
                polisClusterNumUsers: polisClusterTable.numUsers,
                polisClusterAiLabel: polisClusterTable.aiLabel,
                polisClusterOpinionAgreementType:
                    polisClusterOpinionTable.agreementType,
                polisClusterOpinionPercentageAgreement:
                    polisClusterOpinionTable.percentageAgreement,
                polisClusterOpinionNumAgreement:
                    polisClusterOpinionTable.numAgreement, // example: 0, 1, 2...etc (number or agrees or disagrees)
                polisClusterUserId: polisClusterUserTable.userId,
                polisClusterUserVote: voteContentTable.vote,
            })
            .from(opinionTable)
            .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
            .innerJoin(conversationTable, eq(conversationTable.id, postId))
            .innerJoin(
                opinionContentTable,
                eq(opinionContentTable.id, opinionTable.currentContentId),
            )
            .leftJoin(
                polisContentTable,
                eq(
                    polisContentTable.id,
                    conversationTable.currentPolisContentId,
                ),
            )
            .leftJoin(
                polisClusterTable,
                eq(polisClusterTable.polisContentId, polisContentTable.id),
            )
            .leftJoin(
                polisClusterOpinionTable,
                and(
                    eq(
                        polisClusterOpinionTable.polisClusterId,
                        polisClusterTable.id,
                    ),
                    eq(
                        polisClusterOpinionTable.opinionSlugId,
                        opinionTable.slugId,
                    ),
                ),
            )
            .leftJoin(
                polisClusterUserTable,
                and(
                    eq(
                        polisClusterUserTable.polisClusterId,
                        polisClusterTable.id,
                    ),
                    eq(
                        polisClusterUserTable.polisContentId,
                        polisContentTable.id,
                    ),
                ),
            )
            .leftJoin(
                voteTable,
                and(
                    eq(voteTable.authorId, polisClusterUserTable.userId),
                    eq(voteTable.opinionId, opinionTable.id),
                ),
            )
            .leftJoin(
                voteContentTable,
                eq(voteContentTable.id, voteTable.currentContentId),
            )
            .leftJoin(
                opinionModerationTable,
                eq(opinionModerationTable.opinionId, opinionTable.id),
            )
            .orderBy(desc(opinionTable.createdAt))
            .where(whereClause);
    }

    const opinionItemMap: OpinionItemPerSlugId = new Map<string, OpinionItem>();
    results.map((opinionResponse) => {
        if (opinionItemMap.has(opinionResponse.commentSlugId)) {
            const opinionItem = opinionItemMap.get(
                opinionResponse.commentSlugId,
            );
            if (opinionResponse.polisClusterKey !== null) {
                if (
                    opinionResponse.polisClusterOpinionAgreementType !== null &&
                    opinionResponse.polisClusterOpinionNumAgreement !== null &&
                    opinionResponse.polisClusterOpinionPercentageAgreement !==
                        null
                ) {
                    opinionItem?.coreOpinionFor.push({
                        key: opinionResponse.polisClusterKey,
                        aiLabel: toUnionUndefined(
                            opinionResponse.polisClusterAiLabel,
                        ),
                        agreementType:
                            opinionResponse.polisClusterOpinionAgreementType,
                        percentageAgreement:
                            opinionResponse.polisClusterOpinionPercentageAgreement,
                        numAgreement:
                            opinionResponse.polisClusterOpinionNumAgreement,
                    });
                }
                if (
                    opinionResponse.polisClusterNumUsers !== null &&
                    opinionResponse.polisClusterUserId !== null &&
                    opinionResponse.polisClusterUserVote !== null
                ) {
                    const existingClusterStats =
                        opinionItem?.clustersStats.find(
                            (c) => c.key === opinionResponse.polisClusterKey,
                        );
                    if (existingClusterStats !== undefined) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                        (existingClusterStats.isAuthorInCluster =
                            opinionResponse.authorId ===
                            opinionResponse.polisClusterUserId),
                            (existingClusterStats.numAgrees +=
                                opinionResponse.polisClusterUserVote === "agree"
                                    ? 1
                                    : 0),
                            (existingClusterStats.numDisagrees +=
                                opinionResponse.polisClusterUserVote ===
                                "disagree"
                                    ? 1
                                    : 0);
                    } else {
                        opinionItem?.clustersStats.push({
                            key: opinionResponse.polisClusterKey,
                            numUsers: opinionResponse.polisClusterNumUsers,
                            aiLabel: toUnionUndefined(
                                opinionResponse.polisClusterAiLabel,
                            ),
                            isAuthorInCluster:
                                opinionResponse.authorId ===
                                opinionResponse.polisClusterUserId,
                            numAgrees:
                                opinionResponse.polisClusterUserVote === "agree"
                                    ? 1
                                    : 0,
                            numDisagrees:
                                opinionResponse.polisClusterUserVote ===
                                "disagree"
                                    ? 1
                                    : 0,
                        });
                    }
                }
                return;
            } else {
                // happens because of the left joins, we just ignore those
                return;
            }
        }
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
            numDisagrees: opinionResponse.numDislikes,
            numAgrees: opinionResponse.numLikes,
            updatedAt: opinionResponse.updatedAt,
            username: opinionResponse.username,
            moderation: moderationProperties,
            clustersStats:
                opinionResponse.polisClusterKey !== null &&
                opinionResponse.polisClusterNumUsers !== null &&
                opinionResponse.polisClusterUserId !== null
                    ? [
                          {
                              key: opinionResponse.polisClusterKey,
                              numUsers: opinionResponse.polisClusterNumUsers,
                              aiLabel: toUnionUndefined(
                                  opinionResponse.polisClusterAiLabel,
                              ),
                              isAuthorInCluster:
                                  opinionResponse.authorId ===
                                  opinionResponse.polisClusterUserId,
                              numAgrees:
                                  opinionResponse.polisClusterUserVote ===
                                  "agree"
                                      ? 1
                                      : 0,
                              numDisagrees:
                                  opinionResponse.polisClusterUserVote ===
                                  "disagree"
                                      ? 1
                                      : 0,
                          },
                      ]
                    : [],
            coreOpinionFor:
                opinionResponse.polisClusterKey !== null &&
                opinionResponse.polisClusterOpinionAgreementType !== null &&
                opinionResponse.polisClusterOpinionPercentageAgreement !==
                    null &&
                opinionResponse.polisClusterOpinionNumAgreement !== null
                    ? [
                          {
                              key: opinionResponse.polisClusterKey,
                              aiLabel: toUnionUndefined(
                                  opinionResponse.polisClusterAiLabel,
                              ),
                              agreementType:
                                  opinionResponse.polisClusterOpinionAgreementType,
                              percentageAgreement:
                                  opinionResponse.polisClusterOpinionPercentageAgreement,
                              numAgreement:
                                  opinionResponse.polisClusterOpinionNumAgreement,
                          },
                      ]
                    : [],
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
                numLikes: opinionTable.numAgrees,
                numDislikes: opinionTable.numDisagrees,
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
                numDisagrees: commentResponse.numDislikes,
                numAgrees: commentResponse.numLikes,
                updatedAt: commentResponse.updatedAt,
                username: commentResponse.username,
                moderation: moderationProperties,
                coreOpinionFor: [], //TODO: change this!
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
    userId: string;
    didWrite: string;
    proof: string;
    axiosPolis?: AxiosInstance;
    polisDelayToFetch: number;
    httpErrors: HttpErrors;
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
    const insertCommentResponse = await db
        .insert(opinionTable)
        .values({
            slugId: opinionSlugId,
            authorId: userId,
            currentContentId: null,
            conversationId: conversationId,
        })
        .returning({ opinionId: opinionTable.id });

    const opinionId = insertCommentResponse[0].opinionId;
    const commentContentTableResponse = await db
        .insert(opinionContentTable)
        .values({
            opinionId: opinionId,
            conversationContentId: conversationContentId,
            content: commentBody,
        })
        .returning({ commentContentTableId: opinionContentTable.id });

    const commentContentTableId =
        commentContentTableResponse[0].commentContentTableId;
    await db
        .update(opinionTable)
        .set({
            currentContentId: commentContentTableId,
        })
        .where(eq(opinionTable.id, opinionId));

    // Update the post's comment count
    await db
        .update(conversationTable)
        .set({
            opinionCount: sql`${conversationTable.opinionCount} + 1`,
        })
        .where(eq(conversationTable.slugId, conversationSlugId));

    // Update the user profile's comment count
    await db
        .update(userTable)
        .set({
            totalOpinionCount: sql`${userTable.totalOpinionCount} + 1`,
        })
        .where(eq(userTable.id, userId));

    await polisService.createOpinion({
        axiosPolis,
        userId,
        opinionSlugId,
        conversationSlugId,
    });

    return {
        commentId,
        opinionId,
        opinionSlugId,
        opinionContentId: commentContentTableId,
    };
}

export async function postNewOpinion({
    db,
    commentBody,
    conversationSlugId,
    userId,
    didWrite,
    proof,
    axiosPolis,
    polisDelayToFetch,
    httpErrors,
}: PostNewOpinionProps): Promise<CreateCommentResponse> {
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
        commentBody = sanitizeHtmlBody(commentBody, MAX_LENGTH_COMMENT);
    } catch (error) {
        if (error instanceof Error) {
            throw httpErrors.badRequest(error.message);
        } else {
            throw httpErrors.badRequest("Error while sanitizing request body");
        }
    }

    const {
        id: conversationId,
        contentId: conversationContentId,
        authorId: conversationAuthorId,
    } = await useCommonPost().getPostMetadataFromSlugId({
        db: db,
        conversationSlugId: conversationSlugId,
    });
    if (conversationContentId == null) {
        throw httpErrors.gone("Cannot comment on a deleted post");
    }
    const opinionSlugId = generateRandomSlugId();

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

        // Update the post's comment count
        await tx
            .update(conversationTable)
            .set({
                opinionCount: sql`${conversationTable.opinionCount} + 1`,
            })
            .where(eq(conversationTable.slugId, conversationSlugId));

        // Update the user profile's comment count
        await tx
            .update(userTable)
            .set({
                totalOpinionCount: sql`${userTable.totalOpinionCount} + 1`,
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
    });

    if (axiosPolis !== undefined) {
        void polisService.delayedPolisGetAndUpdateMath({
            db,
            conversationId,
            conversationSlugId,
            axiosPolis,
            polisDelayToFetch,
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
    try {
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
        });
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError(
            "Failed to delete comment by comment ID: " + opinionSlugId,
        );
    }
}
