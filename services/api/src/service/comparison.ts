import {
    conversationTable,
    comparisonResponseTable,
    comparisonAnswerTable,
    rankingItemTable,
    rankingItemContentTable,
    rankingItemExternalSourceTable,
    rankingConversationConfigTable,
    rankingConversationStatsCheckpointTable,
    rankingConversationStatsItemTable,
    rankingConversationStatsSnapshotTable,
    rankingScoreEntityTable,
    comparisonUserEntityScoreTable,
    userTable,
} from "@/shared-backend/schema.js";
import { currentRankingItemSourceCondition } from "@/shared-backend/opinionEligibility.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";

import {
    eq,
    and,
    count,
    desc,
    exists,
    inArray,
    isNull,
    sql,
} from "drizzle-orm";
import {
    Dto,
    type ComparisonResultsResponse,
    type ComparisonResultItem,
    type ComparisonSaveRequest,
    type RankingStatsCheckpointsResponse,
} from "@/shared/types/dto.js";
import type { RankingStatsCheckpointReason } from "@/shared/types/dto.js";
import { z } from "zod";
import {
    zodComparisonAnswer,
    type ComparisonAnswer,
    type RankingItemLifecycleStatus,
    type RankingMode,
} from "@/shared/types/zod.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";
import { log } from "@/app.js";
import {
    buildRankingItemDisplayContentByContentId,
    type RankingItemDisplayPreferences,
} from "./rankingItemDisplay.js";
import { getPrimaryDatabase, hasPrimaryDatabase } from "@/shared-backend/db.js";
import type { RankingPerformance } from "@/utils/rankingPerformance.js";
import { syncComparisonAnswers } from "./comparisonHistory.js";
import { buildComparisonAppearanceCountQuery } from "./comparisonQueries.js";
import { logApiError } from "@/logging/privacy.js";
import { fetchCurrentConversationTypeConfig } from "./conversationTypeConfig.js";
import {
    checkConversationParticipation,
    type CheckConversationParticipationFailure,
} from "./participationGate.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";

// --- Types ---

export interface RankedItem {
    itemSlugId: string;
    avgRank: number;
    score: number | null;
    participantCount: number;
}

// --- Global Uncertainty (for routing) ---

/**
 * Compute global uncertainty for all active items in a conversation.
 * Uses comparison-count heuristic: uncertainty = 1/sqrt(count + 1).
 * Cheap — no BT MLE, just counts how many comparisons reference each item.
 */
export async function computeGlobalUncertainty({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId: number;
}): Promise<{ items: string[]; uncertainty: Map<string, number> }> {
    const items = await fetchComparisonItems({ db, conversationId });
    if (items.length < 2) return { items, uncertainty: new Map() };
    const countRows = await buildComparisonAppearanceCountQuery({
        db,
        conversationId,
    });
    const itemSet = new Set(items);
    const uncertainty = new Map(items.map((item) => [item, 1]));
    for (const row of countRows) {
        if (itemSet.has(row.itemSlugId))
            uncertainty.set(
                row.itemSlugId,
                1 / Math.sqrt(row.appearanceCount + 1),
            );
    }
    return { items, uncertainty };
}

async function fetchComparisonItems({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId: number;
}): Promise<string[]> {
    const activeItems = await db
        .select({ slugId: rankingItemTable.slugId })
        .from(rankingItemTable)
        .leftJoin(userTable, eq(userTable.id, rankingItemTable.authorId))
        .where(
            and(
                eq(rankingItemTable.conversationId, conversationId),
                currentRankingItemSourceCondition(),
                inArray(rankingItemTable.lifecycleStatus, [
                    "active",
                    "in_progress",
                ]),
            ),
        );

    return activeItems.map((row) => row.slugId);
}

// --- Save / Upsert ---

interface SaveComparisonResponseProps {
    db: PostgresDatabase;
    request: ComparisonSaveRequest;
    didWrite: string;
    userAgent: string;
    now: Date;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
    valkey: Valkey | undefined;
    performance: RankingPerformance | undefined;
}

interface SavedComparisonResponse {
    success: true;
    conversationId: number;
    items: string[];
    uncertainty: Map<string, number>;
    comparisonMethod: RankingMode;
}

export async function saveComparisonResponse({
    db,
    request,
    didWrite,
    userAgent,
    now,
    currentDisplayLanguage,
    valkey,
    performance,
}: SaveComparisonResponseProps): Promise<
    SavedComparisonResponse | CheckConversationParticipationFailure
> {
    const {
        conversationSlugId,
        ranking,
        comparisons,
        comparisonMethod,
        isComplete,
    } = request;
    // Synchronous DB upsert — user state is immediately consistent.
    // Counter updates are published asynchronously by the scoring worker;
    // the frontend optimistically updates counts for the current user.
    const save = async () =>
        await getPrimaryDatabase(db).transaction(
            async (
                tx,
            ): Promise<
                SavedComparisonResponse | CheckConversationParticipationFailure
            > => {
                const conversationRows = await tx
                    .select({
                        id: conversationTable.id,
                        contentId: conversationTable.currentContentId,
                    })
                    .from(conversationTable)
                    .where(eq(conversationTable.slugId, conversationSlugId))
                    .for("share", { of: conversationTable });
                const conversation = conversationRows.at(0);
                if (conversation?.contentId == null)
                    throw httpErrors.notFound("Conversation not found");
                const typeConfig = await fetchCurrentConversationTypeConfig({
                    db: tx,
                    conversationId: conversation.id,
                });
                if (
                    typeConfig.conversationType !== "prioritizing" ||
                    typeConfig.prioritizationType !== "comparisons" ||
                    typeConfig.comparisonMethod !== comparisonMethod
                )
                    throw httpErrors.conflict(
                        "Conversation voting method changed; refresh before voting",
                    );
                const conversationId = conversation.id;
                // Read admission only after the conversation lock: a concurrent settings
                // edit must not admit a participant against obsolete requirements.
                const checkParticipation = () =>
                    checkConversationParticipation({
                        db: tx,
                        conversationSlugId,
                        didWrite,
                        userAgent,
                        now,
                        currentDisplayLanguage,
                    });
                const participation =
                    performance === undefined
                        ? await checkParticipation()
                        : await performance.measure({
                              phase: "participation",
                              run: checkParticipation,
                          });
                if (!participation.success) return participation;

                // Claim/lock the response before reading its history. Validation and the
                // normalized diff must see the same predecessor under concurrent saves.
                const [response] = await tx
                    .insert(comparisonResponseTable)
                    .values({
                        participantId: participation.participantId,
                        conversationId,
                        ranking: null,
                        comparisons: [],
                        isComplete: false,
                        createdAt: now,
                        updatedAt: now,
                    })
                    .onConflictDoUpdate({
                        target: [
                            comparisonResponseTable.participantId,
                            comparisonResponseTable.conversationId,
                        ],
                        set: { updatedAt: now },
                    })
                    .returning({
                        id: comparisonResponseTable.id,
                        comparisons: comparisonResponseTable.comparisons,
                    });
                const previous = z
                    .array(zodComparisonAnswer)
                    .parse(response.comparisons);
                const eligible = new Set(
                    await fetchComparisonItems({ db: tx, conversationId }),
                );
                for (const [index, comparison] of comparisons.entries()) {
                    const old = previous.at(index);
                    const unchanged =
                        old?.best === comparison.best &&
                        old.worst === comparison.worst &&
                        old.set.length === comparison.set.length &&
                        old.set.every(
                            (id, position) => comparison.set[position] === id,
                        );
                    if (
                        !unchanged &&
                        (comparison.set.some((id) => !eligible.has(id)) ||
                            (comparisonMethod === "pairwise"
                                ? comparison.set.length !== 2
                                : comparison.set.length > 4))
                    )
                        throw httpErrors.conflict(
                            "Comparison statements changed; refresh before voting",
                        );
                }
                await tx
                    .update(comparisonResponseTable)
                    .set({
                        ranking,
                        comparisons,
                        isComplete,
                        updatedAt: now,
                    })
                    .where(eq(comparisonResponseTable.id, response.id));

                await syncComparisonAnswers({
                    tx,
                    responseId: response.id,
                    comparisons,
                    now,
                });

                const fetchUncertainty = () =>
                    computeGlobalUncertainty({
                        db: tx,
                        conversationId,
                    });
                const routed =
                    performance === undefined
                        ? await fetchUncertainty()
                        : await performance.measure({
                              phase: "uncertainty",
                              run: fetchUncertainty,
                          });
                return {
                    success: true,
                    ...routed,
                    conversationId,
                    comparisonMethod,
                };
            },
        );
    const result =
        performance === undefined
            ? await save()
            : await performance.measure({ phase: "transaction", run: save });
    if (!result.success) return result;

    // Mark conversation as dirty for the scoring worker to pick up.
    // Member = "convId:slugId" (slugId for worker logging without extra DB query).
    // Score = comparison count (proxy for Solidago runtime).
    if (valkey !== undefined) {
        const member = `${String(result.conversationId)}:${conversationSlugId}`;
        try {
            await valkey.zadd(VALKEY_QUEUE_KEYS.SCORING_DIRTY_SOLIDAGO, {
                [member]: comparisons.length,
            });
        } catch (error) {
            logApiError({
                logger: log,
                level: "error",
                event: { event: "application_error" },
                error,
            });
        }
    }

    return result;
}

// --- Load ---

interface LoadComparisonResponseProps {
    db: PostgresDatabase;
    conversationId: number;
    userId: string;
}

export async function loadComparisonSession({
    db,
    conversationSlugId,
    userId,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
    userId: string | undefined;
}) {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const conversationRows = await tx
            .select({
                id: conversationTable.id,
                contentId: conversationTable.currentContentId,
            })
            .from(conversationTable)
            .where(eq(conversationTable.slugId, conversationSlugId))
            .for("share", { of: conversationTable });
        const conversation = conversationRows.at(0);
        if (conversation?.contentId == null)
            throw httpErrors.notFound("Conversation not found");
        const typeConfig = await fetchCurrentConversationTypeConfig({
            db: tx,
            conversationId: conversation.id,
        });
        if (
            typeConfig.conversationType !== "prioritizing" ||
            typeConfig.prioritizationType !== "comparisons"
        )
            throw httpErrors.conflict(
                "Conversation voting method changed; refresh before voting",
            );
        const saved =
            userId === undefined
                ? {
                      ranking: null,
                      comparisons: null,
                      isComplete: false,
                      perUserScores: null,
                  }
                : await loadComparisonResponse({
                      db: tx,
                      conversationId: conversation.id,
                      userId,
                  });
        const routing = await computeGlobalUncertainty({
            db: tx,
            conversationId: conversation.id,
        });
        return {
            ...saved,
            ...routing,
            comparisonMethod: typeConfig.comparisonMethod,
        };
    });
}

interface PerUserScore {
    entitySlugId: string;
    score: number;
}

interface LoadComparisonResponseData {
    ranking: string[] | null;
    comparisons: ComparisonAnswer[] | null;
    isComplete: boolean;
    perUserScores: PerUserScore[] | null;
}

export async function loadComparisonResponse({
    db,
    conversationId,
    userId,
}: LoadComparisonResponseProps): Promise<LoadComparisonResponseData> {
    const results = await db
        .select({
            id: comparisonResponseTable.id,
            ranking: comparisonResponseTable.ranking,
            comparisons: comparisonResponseTable.comparisons,
            isComplete: comparisonResponseTable.isComplete,
        })
        .from(comparisonResponseTable)
        .where(
            and(
                eq(comparisonResponseTable.participantId, userId),
                eq(comparisonResponseTable.conversationId, conversationId),
            ),
        );

    if (results.length === 0) {
        return {
            ranking: null,
            comparisons: null,
            isComplete: false,
            perUserScores: null,
        };
    }

    const row = results[0];
    // Parse JSONB columns through zod for type safety
    const comparisonsResult = z
        .array(zodComparisonAnswer)
        .parse(row.comparisons);
    const ranking =
        row.ranking !== null ? z.array(z.string()).parse(row.ranking) : null;

    // Fetch per-user Solidago scores (written by scoring worker)
    const scoreRows = await db
        .select({
            entitySlugId: comparisonUserEntityScoreTable.entitySlugId,
            score: comparisonUserEntityScoreTable.displayScore,
        })
        .from(comparisonUserEntityScoreTable)
        .where(
            and(
                eq(comparisonUserEntityScoreTable.comparisonResponseId, row.id),
                isNull(comparisonUserEntityScoreTable.deletedAt),
            ),
        )
        .orderBy(desc(comparisonUserEntityScoreTable.score));

    const displayScores = scoreRows.flatMap((score) =>
        score.score === null
            ? []
            : [{ entitySlugId: score.entitySlugId, score: score.score }],
    );
    return {
        ranking,
        comparisons: comparisonsResult,
        isComplete: row.isComplete,
        perUserScores: displayScores.length > 0 ? displayScores : null,
    };
}

// --- Aggregated Results ---

type LifecycleFilter = RankingItemLifecycleStatus | "all";

async function resolveRankingReadDatabase({
    db,
    conversationId,
    requestedRankingStatsSnapshotId,
}: {
    db: PostgresDatabase;
    conversationId: number;
    requestedRankingStatsSnapshotId: number | undefined;
}): Promise<PostgresDatabase> {
    if (
        requestedRankingStatsSnapshotId === undefined ||
        !hasPrimaryDatabase(db)
    ) {
        return db;
    }

    const latestReplicaRows = await db
        .select({ id: rankingConversationStatsSnapshotTable.id })
        .from(rankingConversationStatsSnapshotTable)
        .where(
            and(
                eq(
                    rankingConversationStatsSnapshotTable.conversationId,
                    conversationId,
                ),
                isNull(rankingConversationStatsSnapshotTable.deletedAt),
            ),
        )
        .orderBy(
            desc(rankingConversationStatsSnapshotTable.createdAt),
            desc(rankingConversationStatsSnapshotTable.id),
        )
        .limit(1);
    if ((latestReplicaRows.at(0)?.id ?? 0) >= requestedRankingStatsSnapshotId) {
        return db;
    }

    const primaryDb = getPrimaryDatabase(db);
    const latestPrimaryRows = await primaryDb
        .select({ id: rankingConversationStatsSnapshotTable.id })
        .from(rankingConversationStatsSnapshotTable)
        .where(
            and(
                eq(
                    rankingConversationStatsSnapshotTable.conversationId,
                    conversationId,
                ),
                isNull(rankingConversationStatsSnapshotTable.deletedAt),
            ),
        )
        .orderBy(
            desc(rankingConversationStatsSnapshotTable.createdAt),
            desc(rankingConversationStatsSnapshotTable.id),
        )
        .limit(1);
    if ((latestPrimaryRows.at(0)?.id ?? 0) < requestedRankingStatsSnapshotId) {
        throw httpErrors.notFound("Ranking snapshot not found");
    }
    return primaryDb;
}

interface GetComparisonResultsProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    displayPreferences: RankingItemDisplayPreferences;
    lifecycleFilter?: LifecycleFilter;
    rankingStatsSnapshotId?: number;
    requestedRankingStatsSnapshotId?: number;
    valkey?: Valkey;
}

async function getHistoricalComparisonResults({
    db,
    conversationId,
    conversationSlugId,
    rankingStatsSnapshotId,
    displayPreferences,
}: {
    db: PostgresDatabase;
    conversationId: number;
    conversationSlugId: string;
    rankingStatsSnapshotId: number;
    displayPreferences: RankingItemDisplayPreferences;
}): Promise<ComparisonResultsResponse> {
    const loadPublishedSnapshot = async (queryDb: PostgresDatabase) => {
        const earliestSnapshotId = queryDb
            .select({ id: rankingConversationStatsSnapshotTable.id })
            .from(rankingConversationStatsSnapshotTable)
            .where(
                and(
                    eq(
                        rankingConversationStatsSnapshotTable.conversationId,
                        conversationId,
                    ),
                    isNull(rankingConversationStatsSnapshotTable.deletedAt),
                ),
            )
            .orderBy(
                rankingConversationStatsSnapshotTable.createdAt,
                rankingConversationStatsSnapshotTable.id,
            )
            .limit(1);
        const snapshotRows = await queryDb
            .select({
                id: rankingConversationStatsSnapshotTable.id,
                hasCheckpoint: exists(
                    queryDb
                        .select({
                            id: rankingConversationStatsCheckpointTable.id,
                        })
                        .from(rankingConversationStatsCheckpointTable)
                        .where(
                            eq(
                                rankingConversationStatsCheckpointTable.statsSnapshotId,
                                rankingConversationStatsSnapshotTable.id,
                            ),
                        ),
                ),
                isEarliest: sql<boolean>`${rankingConversationStatsSnapshotTable.id} = (${earliestSnapshotId})`,
            })
            .from(rankingConversationStatsSnapshotTable)
            .where(
                and(
                    eq(
                        rankingConversationStatsSnapshotTable.id,
                        rankingStatsSnapshotId,
                    ),
                    eq(
                        rankingConversationStatsSnapshotTable.conversationId,
                        conversationId,
                    ),
                    isNull(rankingConversationStatsSnapshotTable.deletedAt),
                ),
            )
            .limit(1);
        const snapshot = snapshotRows.at(0);
        return {
            queryDb,
            isPublished:
                snapshot !== undefined &&
                [snapshot.hasCheckpoint, snapshot.isEarliest].includes(true),
        };
    };
    let snapshotAttempt = await loadPublishedSnapshot(db);
    if (!snapshotAttempt.isPublished && hasPrimaryDatabase(db)) {
        snapshotAttempt = await loadPublishedSnapshot(getPrimaryDatabase(db));
    }
    if (!snapshotAttempt.isPublished) {
        throw httpErrors.notFound("Ranking checkpoint not found");
    }

    const itemRows = await snapshotAttempt.queryDb
        .select({
            itemSlugId: rankingItemTable.slugId,
            content: rankingItemContentTable,
            lifecycleStatus: rankingConversationStatsItemTable.lifecycleStatus,
            score: rankingConversationStatsItemTable.score,
            rank: rankingConversationStatsItemTable.rank,
            participantCount:
                rankingConversationStatsItemTable.participantCount,
            externalUrl: rankingConversationStatsItemTable.externalUrl,
        })
        .from(rankingConversationStatsItemTable)
        .innerJoin(
            rankingItemTable,
            eq(
                rankingItemTable.id,
                rankingConversationStatsItemTable.rankingItemId,
            ),
        )
        .leftJoin(userTable, eq(userTable.id, rankingItemTable.authorId))
        .leftJoin(
            rankingItemContentTable,
            and(
                eq(
                    rankingItemContentTable.id,
                    rankingConversationStatsItemTable.rankingItemContentId,
                ),
                currentRankingItemSourceCondition(),
            ),
        )
        .innerJoin(
            rankingConversationStatsSnapshotTable,
            eq(
                rankingConversationStatsSnapshotTable.id,
                rankingConversationStatsItemTable.statsSnapshotId,
            ),
        )
        .where(
            and(
                eq(
                    rankingConversationStatsItemTable.statsSnapshotId,
                    rankingStatsSnapshotId,
                ),
                isNull(rankingConversationStatsItemTable.deletedAt),
                isNull(rankingConversationStatsSnapshotTable.deletedAt),
            ),
        );
    const sources = itemRows.flatMap((row) =>
        row.content === null
            ? []
            : [
                  {
                      conversationSlugId,
                      itemSlugId: row.itemSlugId,
                      contentId: row.content.id,
                      publicId: row.content.publicId,
                      title: row.content.title,
                      bodyHtml: row.content.body,
                      sourceLanguageCode: row.content.sourceLanguageCode,
                      sourceRawLanguageCode: row.content.sourceRawLanguageCode,
                      sourceLanguageProvider:
                          row.content.sourceLanguageProvider,
                      sourceLanguageConfidence:
                          row.content.sourceLanguageConfidence,
                  },
              ],
    );
    const displayContentByContentId =
        await buildRankingItemDisplayContentByContentId({
            db: snapshotAttempt.queryDb,
            sources,
            preferences: displayPreferences,
        });
    const rankings = itemRows
        .map((row): ComparisonResultItem => {
            const metadata = {
                itemSlugId: row.itemSlugId,
                avgRank: row.rank,
                score: row.score,
                participantCount: row.participantCount,
                lifecycleStatus: row.lifecycleStatus,
            };
            if (row.content === null) {
                return {
                    ...metadata,
                    isDeleted: true,
                    displayContent: null,
                    externalUrl: null,
                };
            }
            const displayContent = displayContentByContentId.get(
                row.content.id,
            );
            if (displayContent === undefined) {
                throw httpErrors.internalServerError(
                    "Failed to build historical ranking item display content",
                );
            }
            return {
                ...metadata,
                isDeleted: false,
                displayContent,
                externalUrl: row.externalUrl,
            };
        })
        .sort((left, right) => {
            if (left.avgRank === null && right.avgRank === null) {
                return left.itemSlugId.localeCompare(right.itemSlugId);
            }
            if (left.avgRank === null) return 1;
            if (right.avgRank === null) return -1;
            const rankDifference = left.avgRank - right.avgRank;
            return rankDifference !== 0
                ? rankDifference
                : left.itemSlugId.localeCompare(right.itemSlugId);
        });
    return { rankings };
}

export async function getComparisonResults({
    db,
    conversationSlugId,
    displayPreferences,
    lifecycleFilter = "active",
    rankingStatsSnapshotId,
    requestedRankingStatsSnapshotId,
    valkey,
}: GetComparisonResultsProps): Promise<ComparisonResultsResponse> {
    const { id: conversationId } =
        await useCommonPost().getPostMetadataFromSlugId({
            db,
            conversationSlugId,
        });

    if (rankingStatsSnapshotId !== undefined) {
        if (requestedRankingStatsSnapshotId !== undefined) {
            throw httpErrors.badRequest(
                "Historical and live ranking snapshot selectors cannot be combined",
            );
        }
        if (lifecycleFilter !== "active") {
            throw httpErrors.badRequest(
                "Ranking checkpoints cannot be combined with a lifecycle filter",
            );
        }
        return await getHistoricalComparisonResults({
            db,
            conversationId,
            conversationSlugId,
            rankingStatsSnapshotId,
            displayPreferences,
        });
    }

    const readDb = await resolveRankingReadDatabase({
        db,
        conversationId,
        requestedRankingStatsSnapshotId,
    });

    // Determine which lifecycle statuses to include
    const activeStatuses: RankingItemLifecycleStatus[] =
        lifecycleFilter === "all"
            ? ["active", "completed", "in_progress", "canceled"]
            : lifecycleFilter === "active"
              ? ["active", "in_progress"]
              : [lifecycleFilter];

    // Fetch items with their content and optional external source URL
    const itemRows = await readDb
        .select({
            slugId: rankingItemTable.slugId,
            contentId: rankingItemContentTable.id,
            publicId: rankingItemContentTable.publicId,
            title: rankingItemContentTable.title,
            body: rankingItemContentTable.body,
            sourceLanguageCode: rankingItemContentTable.sourceLanguageCode,
            sourceRawLanguageCode:
                rankingItemContentTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                rankingItemContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                rankingItemContentTable.sourceLanguageConfidence,
            lifecycleStatus: rankingItemTable.lifecycleStatus,
            snapshotScore: rankingScoreEntityTable.displayScore,
            snapshotRank: rankingItemTable.snapshotRank,
            snapshotParticipantCount: rankingItemTable.snapshotParticipantCount,
            externalUrl: rankingItemExternalSourceTable.externalUrl,
        })
        .from(rankingItemTable)
        .leftJoin(userTable, eq(userTable.id, rankingItemTable.authorId))
        .innerJoin(
            rankingItemContentTable,
            eq(rankingItemContentTable.id, rankingItemTable.currentContentId),
        )
        .leftJoin(
            rankingItemExternalSourceTable,
            eq(
                rankingItemExternalSourceTable.rankingItemId,
                rankingItemTable.id,
            ),
        )
        .leftJoin(
            rankingScoreEntityTable,
            and(
                eq(
                    rankingScoreEntityTable.rankingScoreId,
                    rankingItemTable.snapshotRankingScoreId,
                ),
                eq(
                    rankingScoreEntityTable.entitySlugId,
                    rankingItemTable.slugId,
                ),
            ),
        )
        .where(
            and(
                eq(rankingItemTable.conversationId, conversationId),
                currentRankingItemSourceCondition(),
                inArray(rankingItemTable.lifecycleStatus, activeStatuses),
            ),
        );

    const items = itemRows.map((r) => r.slugId);
    const itemSlugIds = new Set(items);
    const sources = itemRows.map((r) => ({
        conversationSlugId,
        itemSlugId: r.slugId,
        contentId: r.contentId,
        publicId: r.publicId,
        title: r.title,
        bodyHtml: r.body,
        sourceLanguageCode: r.sourceLanguageCode,
        sourceRawLanguageCode: r.sourceRawLanguageCode,
        sourceLanguageProvider: r.sourceLanguageProvider,
        sourceLanguageConfidence: r.sourceLanguageConfidence,
    }));
    const displayContentByContentId =
        await buildRankingItemDisplayContentByContentId({
            db: readDb,
            sources,
            preferences: displayPreferences,
        });
    const displayContentBySlugId = new Map(
        itemRows.map((r) => {
            const displayContent = displayContentByContentId.get(r.contentId);
            if (displayContent === undefined) {
                throw httpErrors.internalServerError(
                    "Failed to build ranking item display content",
                );
            }
            return [r.slugId, displayContent] as const;
        }),
    );

    // For completed/canceled items, return snapshot scores if available
    if (lifecycleFilter === "completed" || lifecycleFilter === "canceled") {
        const rankings: ComparisonResultItem[] = itemRows
            .map((r): ComparisonResultItem => {
                const displayContent = displayContentBySlugId.get(r.slugId);
                if (displayContent === undefined) {
                    throw httpErrors.internalServerError(
                        "Failed to locate ranking item display content",
                    );
                }
                return {
                    isDeleted: false,
                    itemSlugId: r.slugId,
                    displayContent,
                    avgRank: r.snapshotRank,
                    score: r.snapshotScore,
                    participantCount: r.snapshotParticipantCount ?? 0,
                    lifecycleStatus: r.lifecycleStatus,
                    externalUrl: r.externalUrl,
                };
            })
            .sort((a, b) => {
                if (a.avgRank === null)
                    return b.avgRank === null
                        ? a.itemSlugId.localeCompare(b.itemSlugId)
                        : 1;
                if (b.avgRank === null) return -1;
                return (
                    a.avgRank - b.avgRank ||
                    a.itemSlugId.localeCompare(b.itemSlugId)
                );
            });
        return { rankings };
    }

    // For active/all: read pre-computed Solidago scores from ranking_score table.
    // If no cache exists, requeue work for the scoring worker and return empty results.
    const currentScoreId = await (async (): Promise<number | null> => {
        const cachedScoreRows = await readDb
            .select({
                currentRankingScoreId:
                    rankingConversationConfigTable.currentRankingScoreId,
            })
            .from(conversationTable)
            .innerJoin(
                rankingConversationConfigTable,
                eq(
                    rankingConversationConfigTable.id,
                    conversationTable.rankingConfigId,
                ),
            )
            .where(eq(conversationTable.id, conversationId));
        return cachedScoreRows.at(0)?.currentRankingScoreId ?? null;
    })();

    let scored: RankedItem[];

    if (currentScoreId !== null) {
        // Display values are computed once by Solidago in the scoring worker.
        const scoreRows = await readDb
            .select({
                entitySlugId: rankingScoreEntityTable.entitySlugId,
                score: rankingScoreEntityTable.displayScore,
                participantCount: rankingScoreEntityTable.participantCount,
            })
            .from(rankingScoreEntityTable)
            .where(eq(rankingScoreEntityTable.rankingScoreId, currentScoreId))
            .orderBy(desc(rankingScoreEntityTable.score));

        scored = scoreRows
            .filter((s) => itemSlugIds.has(s.entitySlugId))
            .map((s, idx) => ({
                itemSlugId: s.entitySlugId,
                avgRank: idx + 1,
                score: s.score,
                participantCount: s.participantCount,
            }));
    } else {
        scored = [];
    }

    // No cached scores yet: ensure the conversation is in the dirty set
    // so the scoring worker picks it up. Frontend handles empty results.
    if (scored.length === 0 && items.length >= 2 && valkey !== undefined) {
        const [participation] = await readDb
            .select({ count: count() })
            .from(comparisonResponseTable)
            .where(
                and(
                    eq(comparisonResponseTable.conversationId, conversationId),
                    isNull(comparisonResponseTable.detachedAt),
                    exists(
                        readDb
                            .select({ id: comparisonAnswerTable.id })
                            .from(comparisonAnswerTable)
                            .where(
                                and(
                                    eq(
                                        comparisonAnswerTable.comparisonResponseId,
                                        comparisonResponseTable.id,
                                    ),
                                    isNull(comparisonAnswerTable.deletedAt),
                                ),
                            ),
                    ),
                ),
            );
        const member = `${String(conversationId)}:${conversationSlugId}`;
        try {
            if (participation.count > 0) {
                await valkey.zadd(VALKEY_QUEUE_KEYS.SCORING_DIRTY_SOLIDAGO, {
                    [member]: participation.count,
                });
            }
        } catch (error) {
            logApiError({
                logger: log,
                level: "error",
                event: { event: "application_error" },
                error,
            });
        }
    }

    const contentMap = new Map(
        itemRows.map((r) => [
            r.slugId,
            {
                displayContent: displayContentBySlugId.get(r.slugId),
                lifecycleStatus: r.lifecycleStatus,
                externalUrl: r.externalUrl,
            },
        ]),
    );

    const scoredSlugIds = new Set(scored.map((s) => s.itemSlugId));

    const rankings: ComparisonResultItem[] = scored.map((s) => {
        const content = contentMap.get(s.itemSlugId);
        if (content?.displayContent === undefined) {
            throw httpErrors.internalServerError(
                "Failed to locate ranking item display content",
            );
        }
        return {
            isDeleted: false,
            itemSlugId: s.itemSlugId,
            displayContent: content.displayContent,
            avgRank: s.avgRank,
            score: s.score,
            participantCount: s.participantCount,
            lifecycleStatus: content.lifecycleStatus,
            externalUrl: content.externalUrl,
        };
    });

    // Append unscored active items at the end (never appeared in comparisons)
    for (const slugId of items) {
        if (scoredSlugIds.has(slugId)) continue;
        const content = contentMap.get(slugId);
        if (content?.displayContent === undefined) {
            throw httpErrors.internalServerError(
                "Failed to locate ranking item display content",
            );
        }
        rankings.push({
            isDeleted: false,
            itemSlugId: slugId,
            displayContent: content.displayContent,
            avgRank: null,
            score: null,
            participantCount: 0,
            lifecycleStatus: content.lifecycleStatus,
            externalUrl: content.externalUrl,
        });
    }

    return { rankings };
}

export async function fetchRankingStatsCheckpoints({
    db,
    conversationSlugId,
    requestedRankingStatsSnapshotId,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
    requestedRankingStatsSnapshotId: number | undefined;
}): Promise<RankingStatsCheckpointsResponse> {
    const metadata = await useCommonPost().getPostMetadataFromSlugId({
        db,
        conversationSlugId,
    });
    if (
        metadata.conversationType !== "prioritizing" ||
        metadata.prioritizationType !== "comparisons"
    ) {
        throw httpErrors.badRequest(
            "This conversation is not a BWS conversation",
        );
    }
    const readDb = await resolveRankingReadDatabase({
        db,
        conversationId: metadata.id,
        requestedRankingStatsSnapshotId,
    });
    const earliestRows = await readDb
        .select()
        .from(rankingConversationStatsSnapshotTable)
        .where(
            and(
                eq(
                    rankingConversationStatsSnapshotTable.conversationId,
                    metadata.id,
                ),
                isNull(rankingConversationStatsSnapshotTable.deletedAt),
            ),
        )
        .orderBy(
            rankingConversationStatsSnapshotTable.createdAt,
            rankingConversationStatsSnapshotTable.id,
        )
        .limit(1);
    const checkpointRows = await readDb
        .select({
            snapshot: rankingConversationStatsSnapshotTable,
            reason: rankingConversationStatsCheckpointTable.reason,
            participantMilestone:
                rankingConversationStatsCheckpointTable.participantMilestone,
            voteMilestone:
                rankingConversationStatsCheckpointTable.voteMilestone,
        })
        .from(rankingConversationStatsCheckpointTable)
        .innerJoin(
            rankingConversationStatsSnapshotTable,
            eq(
                rankingConversationStatsSnapshotTable.id,
                rankingConversationStatsCheckpointTable.statsSnapshotId,
            ),
        )
        .where(
            and(
                eq(
                    rankingConversationStatsSnapshotTable.conversationId,
                    metadata.id,
                ),
                isNull(rankingConversationStatsSnapshotTable.deletedAt),
            ),
        )
        .orderBy(
            rankingConversationStatsSnapshotTable.createdAt,
            rankingConversationStatsSnapshotTable.id,
            rankingConversationStatsCheckpointTable.id,
        );

    const checkpointsById = new Map<
        number,
        RankingStatsCheckpointsResponse[number]
    >();
    const earliest = earliestRows.at(0);
    if (earliest !== undefined) {
        checkpointsById.set(earliest.id, {
            rankingStatsSnapshotId: earliest.id,
            createdAt: earliest.createdAt,
            itemCount: earliest.itemCount,
            voteCount: earliest.voteCount,
            participantCount: earliest.participantCount,
            totalItemCount: earliest.totalItemCount,
            totalVoteCount: earliest.totalVoteCount,
            totalParticipantCount: earliest.totalParticipantCount,
            isClosed: earliest.isClosed,
            reasons: [],
        });
    }
    for (const row of checkpointRows) {
        const checkpoint = checkpointsById.get(row.snapshot.id) ?? {
            rankingStatsSnapshotId: row.snapshot.id,
            createdAt: row.snapshot.createdAt,
            itemCount: row.snapshot.itemCount,
            voteCount: row.snapshot.voteCount,
            participantCount: row.snapshot.participantCount,
            totalItemCount: row.snapshot.totalItemCount,
            totalVoteCount: row.snapshot.totalVoteCount,
            totalParticipantCount: row.snapshot.totalParticipantCount,
            isClosed: row.snapshot.isClosed,
            reasons: [],
        };
        let reason: RankingStatsCheckpointReason;
        switch (row.reason) {
            case "major_participation_milestone":
                reason = Dto.rankingStatsCheckpointReason.parse({
                    reason: row.reason,
                    participantCount: row.snapshot.participantCount,
                    participantMilestone: row.participantMilestone,
                });
                break;
            case "major_vote_milestone":
                reason = Dto.rankingStatsCheckpointReason.parse({
                    reason: row.reason,
                    voteCount: row.snapshot.voteCount,
                    voteMilestone: row.voteMilestone,
                });
                break;
            case "conversation_closed":
                reason = { reason: row.reason };
                break;
        }
        checkpoint.reasons.push(reason);
        checkpointsById.set(row.snapshot.id, checkpoint);
    }
    const checkpoints = Dto.rankingStatsCheckpointsResponse.parse(
        Array.from(checkpointsById.values()).sort(
            (a, b) =>
                new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime() ||
                a.rankingStatsSnapshotId - b.rankingStatsSnapshotId,
        ),
    );
    return checkpoints;
}

// --- Snapshot scores for lifecycle transitions ---

interface ComputeSnapshotProps {
    db: PostgresDatabase;
    conversationId: number;
    itemSlugId: string;
}

export async function lockRankingScoringConfig({
    db,
    conversationId,
}: {
    db: PostgresDatabase;
    conversationId: number;
}): Promise<void> {
    // Lifecycle snapshots are read-for-write and must serialize with worker publication.
    await db
        .select({ id: rankingConversationConfigTable.id })
        .from(conversationTable)
        .innerJoin(
            rankingConversationConfigTable,
            eq(
                rankingConversationConfigTable.id,
                conversationTable.rankingConfigId,
            ),
        )
        .where(eq(conversationTable.id, conversationId))
        .for("update", { of: rankingConversationConfigTable });
}

/**
 * Read the current score and rank for a specific item from the
 * pre-computed ranking_score table. Returns snapshot values to freeze
 * on the item row during lifecycle transitions.
 */
export async function computeItemSnapshot({
    db,
    conversationId,
    itemSlugId,
}: ComputeSnapshotProps): Promise<{
    snapshotScore: number | null;
    snapshotRankingScoreId: number | null;
    snapshotRank: number | null;
    snapshotParticipantCount: number | null;
}> {
    // Read latest scores from ranking_score table
    const convRows = await db
        .select({
            currentRankingScoreId:
                rankingConversationConfigTable.currentRankingScoreId,
        })
        .from(conversationTable)
        .innerJoin(
            rankingConversationConfigTable,
            eq(
                rankingConversationConfigTable.id,
                conversationTable.rankingConfigId,
            ),
        )
        .where(eq(conversationTable.id, conversationId));

    const currentScoreId =
        convRows.length > 0 ? convRows[0].currentRankingScoreId : null;

    if (currentScoreId === null) {
        return {
            snapshotScore: null,
            snapshotRankingScoreId: null,
            snapshotRank: null,
            snapshotParticipantCount: null,
        };
    }

    const scoreRows = await db
        .select({
            entitySlugId: rankingScoreEntityTable.entitySlugId,
            rawScore: rankingScoreEntityTable.score,
            displayScore: rankingScoreEntityTable.displayScore,
            participantCount: rankingScoreEntityTable.participantCount,
        })
        .from(rankingScoreEntityTable)
        .where(eq(rankingScoreEntityTable.rankingScoreId, currentScoreId));

    const itemScore = scoreRows.find((s) => s.entitySlugId === itemSlugId);
    if (itemScore === undefined) {
        return {
            snapshotScore: null,
            snapshotRankingScoreId: null,
            snapshotRank: null,
            snapshotParticipantCount: null,
        };
    }

    // Rank = position in sorted scores (1-based)
    const rank = scoreRows.filter(
        (s) => s.rawScore >= itemScore.rawScore,
    ).length;

    return {
        snapshotScore: itemScore.displayScore,
        snapshotRankingScoreId: currentScoreId,
        snapshotRank: rank,
        snapshotParticipantCount: itemScore.participantCount,
    };
}
