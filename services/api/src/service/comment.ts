import { generateRandomSlugId } from "@/crypto.js";
import {
    analysisSnapshotResultTable,
    analysisSnapshotOpinionTable,
    opinionContentTable,
    opinionGroupCandidateAssessmentTable,
    opinionGroupCandidateTable,
    opinionGroupCandidateOpinionMetricsTable,
    opinionGroupLineageTable,
    opinionGroupOpinionStatsTable,
    opinionGroupTable,
    opinionGroupUserTable,
    opinionGroupVariantTable,
    opinionTable,
    conversationTable,
    conversationViewSnapshotCheckpointReasonTable,
    conversationViewSnapshotTable,
    userTable,
    opinionModerationTable,
    userMutePreferenceTable,
    voteTable,
} from "@/shared-backend/schema.js";
import type { RealtimeSSEManager } from "./realtimeSSE.js";
import {
    createOpinionNotifications,
    getNotificationRecipients,
} from "./notification.js";
import { scheduleConversationAnalysisRefresh } from "@/shared-backend/conversationCounters.js";
import { createConversationViewSnapshotsFromCurrentState } from "./conversationViewSnapshot.js";
import type {
    ConversationAnalysis,
    ConversationAnalysisContent,
    ConversationAnalysisMetadata,
    AnalysisDescriptionReadiness,
    AnalysisFreshnessRequest,
    CreateCommentResponse,
    FetchAnalysisContentResponse,
    GetOpinionBySlugIdListResponse,
} from "@/shared/types/dto.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    desc,
    asc,
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
    ModerationReason,
    OpinionItem,
    OpinionItemPerSlugId,
    OpinionModerationAction,
    PolisClusters,
    SlugId,
    PolisKey,
    ClusterStats,
    EventSlug,
    ParticipationMode,
    AnalysisView,
} from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import { useCommonComment } from "./common.js";
import { log } from "@/app.js";
import { createCommentModerationPropertyObject } from "./moderation.js";
import { getUserMutePreferences } from "./muteUser.js";
import { checkConversationParticipation } from "./participationGate.js";
import type { VoteBuffer } from "./voteBuffer.js";
import type { ImportPolisResults } from "@/shared/types/polis.js";
import type {
    OpinionContentIdPerOpinionId,
    OpinionIdPerStatementId,
    StatementIdPerOpinionSlugId,
    UserIdPerParticipantId,
} from "@/utils/dataStructure.js";
import { nowZeroMs } from "@/shared/util.js";
import { processUserGeneratedHtml } from "@/shared-app-api/html.js";
import {
    buildDerivedAnalysisDescriptionReadiness,
    fetchSnapshotCandidateOptions,
    getDescriptionTextsByGroupId,
    getOpinionGroupAnalysisSelection,
    getSelectedOpinionGroupCandidate,
    getRequiredDescriptionCandidateIds,
    type AnalysisViewState,
    type SelectedOpinionGroupCandidate,
} from "./opinionGroupAnalysis.js";
import { ensureAiDescriptionLocaleExpectationForConversationViewSnapshot } from "./conversationViewSnapshot.js";
import { alias } from "drizzle-orm/pg-core";
import {
    type SupportedDisplayLanguageCodes,
    ZodSupportedDisplayLanguageCodes,
} from "@/shared/languages.js";
import {
    isDescriptionReadinessFreshForExpectedLocales,
    shouldUseSystemDescriptions,
} from "./analysisDescriptionReadiness.js";

interface PrimaryReplicaDb extends PostgresJsDatabase {
    $primary: PostgresJsDatabase;
}

export type AnalysisFreshnessOptions = AnalysisFreshnessRequest;

interface LatestConversationOpinionCountSnapshot {
    participantCount: number;
    analysisSnapshotId: number | null;
}

interface OpinionDisplayCounts {
    numParticipants: number;
    numAgrees: number;
    numDisagrees: number;
    numPasses: number;
}

function hasPrimaryDb(db: PostgresJsDatabase): db is PrimaryReplicaDb {
    return "$primary" in db;
}

function getPrimaryDb(db: PostgresJsDatabase): PostgresJsDatabase {
    if (hasPrimaryDb(db)) {
        return db.$primary;
    }
    return db;
}

function getSupportedDisplayLanguage(
    displayLanguage: string,
): SupportedDisplayLanguageCodes {
    const parsed = ZodSupportedDisplayLanguageCodes.safeParse(displayLanguage);
    return parsed.success ? parsed.data : "en";
}

function shouldTryPrimaryFallback({
    db,
    freshnessOptions,
}: {
    db: PostgresJsDatabase;
    freshnessOptions: AnalysisFreshnessOptions | null;
}): boolean {
    return freshnessOptions?.enablePrimaryFallback === true && hasPrimaryDb(db);
}

function isAnalysisMetadataFreshEnough({
    metadata,
    freshnessOptions,
}: {
    metadata: ConversationAnalysisMetadata;
    freshnessOptions: AnalysisFreshnessOptions | null;
}): boolean {
    const minimumSnapshotId =
        freshnessOptions?.minimumConversationViewSnapshotId ?? null;
    if (
        minimumSnapshotId !== null &&
        (metadata.conversationViewSnapshotId === undefined ||
            metadata.conversationViewSnapshotId < minimumSnapshotId)
    ) {
        return false;
    }

    return isDescriptionReadinessFreshForExpectedLocales({
        readiness: metadata.descriptionReadiness,
        expectedLocales: freshnessOptions?.expectedDescriptionLocales ?? [],
    });
}

function isAnalysisContentFreshEnough({
    descriptionReadiness,
    freshnessOptions,
}: {
    descriptionReadiness: AnalysisDescriptionReadiness | null;
    freshnessOptions: AnalysisFreshnessOptions | null;
}): boolean {
    return isDescriptionReadinessFreshForExpectedLocales({
        readiness: descriptionReadiness,
        expectedLocales: freshnessOptions?.expectedDescriptionLocales ?? [],
    });
}

async function fetchLatestConversationOpinionCountSnapshot({
    db,
    conversationId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
}): Promise<LatestConversationOpinionCountSnapshot> {
    const snapshotRows = await db
        .select({
            participantCount: conversationViewSnapshotTable.participantCount,
            analysisSnapshotId:
                conversationViewSnapshotTable.analysisSnapshotId,
        })
        .from(conversationViewSnapshotTable)
        .where(
            and(
                eq(
                    conversationViewSnapshotTable.conversationId,
                    conversationId,
                ),
                isNotNull(conversationViewSnapshotTable.activatedAt),
            ),
        )
        .orderBy(
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        )
        .limit(1);

    if (snapshotRows.length === 0) {
        throw new Error(
            `Missing conversation view snapshot counts for conversation ${String(conversationId)}`,
        );
    }

    return snapshotRows[0];
}

export async function fetchOpinionDisplayCounts({
    db,
    conversationId,
    opinionId,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    opinionId: number;
}): Promise<OpinionDisplayCounts> {
    const snapshot = await fetchLatestConversationOpinionCountSnapshot({
        db,
        conversationId,
    });

    if (snapshot.analysisSnapshotId === null) {
        // Keep counts snapshot-only. Do not fall back to live opinion counters.
        return {
            numParticipants: snapshot.participantCount,
            numAgrees: 0,
            numDisagrees: 0,
            numPasses: 0,
        };
    }

    const countRows = await db
        .select({
            numAgrees: analysisSnapshotOpinionTable.numAgrees,
            numDisagrees: analysisSnapshotOpinionTable.numDisagrees,
            numPasses: analysisSnapshotOpinionTable.numPasses,
        })
        .from(analysisSnapshotOpinionTable)
        .where(
            and(
                eq(analysisSnapshotOpinionTable.opinionId, opinionId),
                eq(
                    analysisSnapshotOpinionTable.analysisSnapshotId,
                    snapshot.analysisSnapshotId,
                ),
            ),
        )
        .limit(1);

    if (countRows.length === 0) {
        return {
            numParticipants: snapshot.participantCount,
            numAgrees: 0,
            numDisagrees: 0,
            numPasses: 0,
        };
    }

    const counts = countRows[0];
    return {
        numParticipants: snapshot.participantCount,
        numAgrees: counts.numAgrees,
        numDisagrees: counts.numDisagrees,
        numPasses: counts.numPasses,
    };
}

interface GetCommentSlugIdLastCursorProps {
    lastSlugId: string | undefined;
    db: PostgresJsDatabase;
    authorId: string;
}

export async function getCommentSlugIdLastCursor({
    lastSlugId,
    db,
    authorId,
}: GetCommentSlugIdLastCursorProps): Promise<
    | {
          createdAt: Date;
          opinionId: number;
      }
    | undefined
> {
    let lastCursor;

    if (lastSlugId) {
        const selectResponse = await db
            .select({
                createdAt: opinionTable.createdAt,
                opinionId: opinionTable.id,
            })
            .from(opinionTable)
            .where(
                and(
                    eq(opinionTable.slugId, lastSlugId),
                    eq(opinionTable.authorId, authorId),
                ),
            );
        if (selectResponse.length == 1) {
            lastCursor = selectResponse[0];
        } else {
            // Ignore the slug ID if it cannot be found
        }
    }

    return lastCursor;
}

interface FetchOpinionsProps {
    db: PostgresJsDatabase;
    postSlugId: SlugId;
    personalizationUserId?: string;
    filterTarget: "new" | "moderated" | "hidden" | "discover" | "my_votes";
    limit: number;
}

interface FetchOpinionsByPostIdProps {
    db: PostgresJsDatabase;
    postId: number;
    personalizationUserId?: string;
    filterTarget: "new" | "moderated" | "hidden" | "discover" | "my_votes";
    limit: number;
}

export async function fetchOpinionsByPostId({
    db,
    postId,
    personalizationUserId,
    filterTarget,
    limit,
}: FetchOpinionsByPostIdProps): Promise<OpinionItemPerSlugId> {
    // Require authentication early for my_votes filter (prevent spam)
    if (filterTarget === "my_votes" && !personalizationUserId) {
        throw httpErrors.unauthorized(
            "Authentication required for my_votes filter",
        );
    }

    const latestCountSnapshot =
        await fetchLatestConversationOpinionCountSnapshot({
            db,
            conversationId: postId,
        });
    const countAnalysisSnapshotOpinionTable = alias(
        analysisSnapshotOpinionTable,
        "countAnalysisSnapshotOpinion",
    );
    const routingAnalysisSnapshotOpinionTable = alias(
        analysisSnapshotOpinionTable,
        "routingAnalysisSnapshotOpinion",
    );

    let whereClause: SQL | undefined = and(
        eq(opinionTable.conversationId, postId),
        isNotNull(opinionTable.currentContentId),
    );
    let orderByClause = [desc(opinionTable.createdAt), desc(opinionTable.id)]; // default value, shouldn't be needed but ts doesn't understand how to terminate nested switch
    let shouldJoinVoteTable = false;
    let discoverAnalysisSnapshotId: number | undefined;

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
            const selectedCandidate = await getSelectedOpinionGroupCandidate({
                db,
                conversationId: postId,
                displayLanguage: "en",
            });
            discoverAnalysisSnapshotId = selectedCandidate?.snapshotId;

            const discoverOrderClause =
                discoverAnalysisSnapshotId === undefined
                    ? [desc(opinionTable.createdAt), desc(opinionTable.id)]
                    : [
                          sql`${routingAnalysisSnapshotOpinionTable.routingPriority} DESC NULLS LAST`,
                          desc(opinionTable.createdAt),
                          desc(opinionTable.id),
                      ];

            // For authenticated users, sort unvoted opinions first, then by routing priority.
            if (personalizationUserId) {
                shouldJoinVoteTable = true;
                orderByClause = [
                    sql`CASE WHEN ${voteTable.id} IS NOT NULL THEN 1 ELSE 0 END ASC`,
                    ...discoverOrderClause,
                ];
            } else {
                orderByClause = discoverOrderClause;
            }
            break;
        }
        case "my_votes": {
            // TypeScript knows personalizationUserId is defined here due to early check
            shouldJoinVoteTable = true;
            // Show only voted opinions (regardless of moderation status)
            // Filter by currentContentId to exclude cancelled votes (currentContentId = NULL when cancelled)
            whereClause = and(
                whereClause,
                isNotNull(voteTable.currentContentId),
            );
            // Sort by most recent votes first
            orderByClause = [desc(voteTable.updatedAt), desc(voteTable.id)];
            break;
        }
    }
    // Build query with conditional vote table join
    let query = db
        .select({
            // comment payload
            commentSlugId: opinionTable.slugId,
            createdAt: opinionTable.createdAt,
            updatedAt: opinionTable.updatedAt,
            comment: opinionContentTable.content,
            authorId: opinionTable.authorId,
            numAgrees: countAnalysisSnapshotOpinionTable.numAgrees,
            numDisagrees: countAnalysisSnapshotOpinionTable.numDisagrees,
            numPasses: countAnalysisSnapshotOpinionTable.numPasses,
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
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.id, opinionTable.currentContentId),
        )
        .leftJoin(
            countAnalysisSnapshotOpinionTable,
            latestCountSnapshot.analysisSnapshotId === null
                ? sql`false`
                : and(
                      eq(
                          countAnalysisSnapshotOpinionTable.opinionId,
                          opinionTable.id,
                      ),
                      eq(
                          countAnalysisSnapshotOpinionTable.analysisSnapshotId,
                          latestCountSnapshot.analysisSnapshotId,
                      ),
                  ),
        )
        .leftJoin(
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, opinionTable.id),
        );

    // Add vote table join for discover (authenticated) and my_votes filters
    if (shouldJoinVoteTable && personalizationUserId) {
        query = query.leftJoin(
            voteTable,
            and(
                eq(voteTable.opinionId, opinionTable.id),
                eq(voteTable.authorId, personalizationUserId),
            ),
        );
    }

    if (discoverAnalysisSnapshotId !== undefined) {
        query = query.leftJoin(
            routingAnalysisSnapshotOpinionTable,
            and(
                eq(
                    routingAnalysisSnapshotOpinionTable.opinionId,
                    opinionTable.id,
                ),
                eq(
                    routingAnalysisSnapshotOpinionTable.analysisSnapshotId,
                    discoverAnalysisSnapshotId,
                ),
            ),
        );
    }

    const results = await query
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
            numParticipants: latestCountSnapshot.participantCount,
            numDisagrees: opinionResponse.numDisagrees ?? 0,
            numAgrees: opinionResponse.numAgrees ?? 0,
            numPasses: opinionResponse.numPasses ?? 0,
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
                opinionId: opinionTable.id,
                conversationId: opinionTable.conversationId,
                commentSlugId: opinionTable.slugId,
                createdAt: opinionTable.createdAt,
                updatedAt: opinionTable.updatedAt,
                comment: opinionContentTable.content,
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

        for (const commentResponse of results) {
            const counts = await fetchOpinionDisplayCounts({
                db,
                conversationId: commentResponse.conversationId,
                opinionId: commentResponse.opinionId,
            });
            const moderationProperties = createCommentModerationPropertyObject(
                commentResponse.moderationAction,
                commentResponse.moderationExplanation,
                commentResponse.moderationReason,
                commentResponse.moderationCreatedAt,
                commentResponse.moderationUpdatedAt,
            );

            opinionItemList.push({
                opinion: commentResponse.comment,
                opinionSlugId: commentResponse.commentSlugId,
                createdAt: commentResponse.createdAt,
                updatedAt: commentResponse.updatedAt,
                numParticipants: counts.numParticipants,
                numDisagrees: counts.numDisagrees,
                numAgrees: counts.numAgrees,
                numPasses: counts.numPasses,
                username: commentResponse.username,
                moderation: moderationProperties,
                isSeed: commentResponse.isSeed,
            });
        }
    }

    return opinionItemList;
}

const ANALYSIS_OPINION_LIMIT = 3000;
const REPRESENTATIVE_OPINION_LIMIT = 50;
const POLIS_KEY_SET: ReadonlySet<string> = new Set([
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
]);

function isPolisKey(value: string): value is PolisKey {
    return POLIS_KEY_SET.has(value);
}

function createEmptyConversationAnalysis({
    hasVotedOnAllAvailableOpinions,
    conversationViewSnapshotId,
    analysisSnapshotId,
    conversationViewSnapshot,
    descriptionReadiness,
    emptyReason,
    analysisViewState,
}: {
    hasVotedOnAllAvailableOpinions: boolean | undefined;
    conversationViewSnapshotId?: number;
    analysisSnapshotId?: number;
    conversationViewSnapshot?: ConversationAnalysis["conversationViewSnapshot"];
    descriptionReadiness: AnalysisDescriptionReadiness | null;
    emptyReason?: string;
    analysisViewState?: AnalysisViewState;
}): ConversationAnalysis {
    return {
        polisContentId: undefined,
        conversationViewSnapshotId,
        analysisSnapshotId,
        conversationViewSnapshot,
        descriptionReadiness,
        emptyReason,
        analysisViewState,
        consensusAgree: [],
        consensusDisagree: [],
        controversial: [],
        clusters: {},
        hasVotedOnAllAvailableOpinions,
    };
}

interface SnapshotGroupMetadata {
    id: number;
    key: PolisKey;
    numUsers: number;
    aiLabel?: string;
    aiSummary?: string;
    isUserInCluster: boolean;
}

interface SnapshotAnalysisOpinionData {
    opinionsById: Map<number, AnalysisOpinionItem>;
    representativeOpinionIdsByGroupKey: Map<PolisKey, number[]>;
}

function getOpinionParticipationWeight(opinion: AnalysisOpinionItem): number {
    const totalVotes =
        opinion.numAgrees + opinion.numDisagrees + opinion.numPasses;
    return totalVotes / Math.max(totalVotes + opinion.numParticipants * 0.1, 1);
}

function sortAnalysisOpinionsByWeightedMetric({
    opinions,
    getMetric,
}: {
    opinions: AnalysisOpinionItem[];
    getMetric: (opinion: AnalysisOpinionItem) => number;
}): AnalysisOpinionItem[] {
    return [...opinions].sort((a, b) => {
        const bScore = getMetric(b) * getOpinionParticipationWeight(b);
        const aScore = getMetric(a) * getOpinionParticipationWeight(a);
        return bScore - aScore;
    });
}

async function fetchSnapshotGroups({
    db,
    candidateId,
    personalizationUserId,
    displayLanguage,
    useSystemDescriptions,
}: {
    db: PostgresJsDatabase;
    candidateId: number;
    personalizationUserId?: string;
    displayLanguage: string;
    useSystemDescriptions: boolean;
}): Promise<SnapshotGroupMetadata[]> {
    const groupRows = await db
        .select({
            id: opinionGroupTable.id,
            key: opinionGroupTable.key,
            numUsers: opinionGroupTable.numUsers,
            systemDescriptionId: opinionGroupLineageTable.systemDescriptionId,
            adminDescriptionId: opinionGroupLineageTable.adminDescriptionId,
        })
        .from(opinionGroupTable)
        .leftJoin(
            opinionGroupLineageTable,
            eq(opinionGroupLineageTable.id, opinionGroupTable.lineageId),
        )
        .where(eq(opinionGroupTable.candidateId, candidateId))
        .orderBy(asc(opinionGroupTable.key));

    const descriptionsByGroupId = await getDescriptionTextsByGroupId({
        db,
        groups: groupRows.map((row) => ({
            groupId: row.id,
            systemDescriptionId: row.systemDescriptionId,
            adminDescriptionId: row.adminDescriptionId,
        })),
        displayLanguage,
        includeSystemDescriptions: useSystemDescriptions,
    });

    const currentUserGroupIds = new Set<number>();
    if (personalizationUserId !== undefined) {
        const currentUserGroupRows = await db
            .select({ groupId: opinionGroupUserTable.groupId })
            .from(opinionGroupUserTable)
            .where(
                and(
                    eq(opinionGroupUserTable.candidateId, candidateId),
                    eq(opinionGroupUserTable.userId, personalizationUserId),
                ),
            );
        for (const row of currentUserGroupRows) {
            currentUserGroupIds.add(row.groupId);
        }
    }

    const groups: SnapshotGroupMetadata[] = [];
    for (const row of groupRows) {
        if (!isPolisKey(row.key)) {
            log.warn(
                `[Analysis] Skipping opinion group with unsupported legacy key=${row.key} for candidateId=${String(candidateId)}`,
            );
            continue;
        }

        const description = descriptionsByGroupId.get(row.id);

        groups.push({
            id: row.id,
            key: row.key,
            numUsers: row.numUsers,
            aiLabel: description?.label,
            aiSummary: description?.summary,
            isUserInCluster: currentUserGroupIds.has(row.id),
        });
    }

    return groups;
}

async function removeMutedAnalysisOpinions({
    db,
    personalizationUserId,
    opinionsById,
}: {
    db: PostgresJsDatabase;
    personalizationUserId?: string;
    opinionsById: Map<number, AnalysisOpinionItem>;
}): Promise<void> {
    if (personalizationUserId === undefined) {
        return;
    }

    const mutedUserItems = await getUserMutePreferences({
        db: db,
        userId: personalizationUserId,
    });
    if (mutedUserItems.length === 0) {
        return;
    }

    opinionsById.forEach((opinionItem, opinionId, map) => {
        if (
            mutedUserItems.some(
                (muteItem) => muteItem.username === opinionItem.username,
            )
        ) {
            map.delete(opinionId);
        }
    });
}

async function fetchSnapshotAnalysisOpinions({
    db,
    candidateId,
    snapshotId,
    conversationParticipantCount,
    groups,
    personalizationUserId,
    includeModeratedOpinions,
}: {
    db: PostgresJsDatabase;
    candidateId: number;
    snapshotId: number;
    conversationParticipantCount: number;
    groups: SnapshotGroupMetadata[];
    personalizationUserId?: string;
    includeModeratedOpinions: boolean;
}): Promise<SnapshotAnalysisOpinionData> {
    const moderationFilter: SQL | undefined = includeModeratedOpinions
        ? undefined
        : isNull(opinionModerationTable.id);
    const opinionRows = await db
        .select({
            opinionId: opinionTable.id,
            opinionSlugId: opinionTable.slugId,
            createdAt: opinionTable.createdAt,
            updatedAt: opinionTable.updatedAt,
            opinion: opinionContentTable.content,
            authorId: opinionTable.authorId,
            username: userTable.username,
            isSeed: opinionTable.isSeed,
            numAgrees: analysisSnapshotOpinionTable.numAgrees,
            numDisagrees: analysisSnapshotOpinionTable.numDisagrees,
            numPasses: analysisSnapshotOpinionTable.numPasses,
            groupAwareConsensusAgree:
                opinionGroupCandidateOpinionMetricsTable.groupAwareConsensusAgree,
            groupAwareConsensusDisagree:
                opinionGroupCandidateOpinionMetricsTable.groupAwareConsensusDisagree,
            divisiveScore:
                opinionGroupCandidateOpinionMetricsTable.divisiveness,
            moderationAction: opinionModerationTable.moderationAction,
            moderationExplanation: opinionModerationTable.moderationExplanation,
            moderationReason: opinionModerationTable.moderationReason,
            moderationCreatedAt: opinionModerationTable.createdAt,
            moderationUpdatedAt: opinionModerationTable.updatedAt,
        })
        .from(opinionGroupCandidateOpinionMetricsTable)
        .innerJoin(
            analysisSnapshotOpinionTable,
            eq(
                analysisSnapshotOpinionTable.id,
                opinionGroupCandidateOpinionMetricsTable.analysisSnapshotOpinionId,
            ),
        )
        .innerJoin(
            opinionTable,
            eq(opinionTable.id, analysisSnapshotOpinionTable.opinionId),
        )
        .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .innerJoin(
            opinionContentTable,
            eq(
                opinionContentTable.id,
                analysisSnapshotOpinionTable.opinionContentId,
            ),
        )
        .leftJoin(
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, opinionTable.id),
        )
        .where(
            and(
                eq(
                    opinionGroupCandidateOpinionMetricsTable.candidateId,
                    candidateId,
                ),
                eq(analysisSnapshotOpinionTable.analysisSnapshotId, snapshotId),
                moderationFilter,
                eq(userTable.isDeleted, false),
            ),
        );

    const groupsById = new Map<number, SnapshotGroupMetadata>();
    for (const group of groups) {
        groupsById.set(group.id, group);
    }

    const groupOpinionRows =
        groups.length === 0
            ? []
            : await db
                  .select({
                      groupId: opinionGroupOpinionStatsTable.groupId,
                      opinionId: analysisSnapshotOpinionTable.opinionId,
                      numAgrees: opinionGroupOpinionStatsTable.numAgrees,
                      numDisagrees: opinionGroupOpinionStatsTable.numDisagrees,
                      numPasses: opinionGroupOpinionStatsTable.numPasses,
                      representativeAgreementType:
                          opinionGroupOpinionStatsTable.representativeAgreementType,
                      representativeProbabilityAgreement:
                          opinionGroupOpinionStatsTable.representativeProbabilityAgreement,
                  })
                  .from(opinionGroupOpinionStatsTable)
                  .innerJoin(
                      analysisSnapshotOpinionTable,
                      eq(
                          analysisSnapshotOpinionTable.id,
                          opinionGroupOpinionStatsTable.analysisSnapshotOpinionId,
                      ),
                  )
                  .innerJoin(
                      opinionGroupTable,
                      eq(
                          opinionGroupTable.id,
                          opinionGroupOpinionStatsTable.groupId,
                      ),
                  )
                  .where(
                      inArray(
                          opinionGroupOpinionStatsTable.groupId,
                          groups.map((group) => group.id),
                      ),
                  )
                  .orderBy(asc(opinionGroupTable.key));

    const authorIds = Array.from(
        new Set(opinionRows.map((opinionRow) => opinionRow.authorId)),
    );
    const authorGroupRows =
        authorIds.length === 0
            ? []
            : await db
                  .select({
                      userId: opinionGroupUserTable.userId,
                      groupId: opinionGroupUserTable.groupId,
                  })
                  .from(opinionGroupUserTable)
                  .where(
                      and(
                          eq(opinionGroupUserTable.candidateId, candidateId),
                          inArray(opinionGroupUserTable.userId, authorIds),
                      ),
                  );

    const groupIdByAuthorId = new Map<string, number>();
    for (const row of authorGroupRows) {
        groupIdByAuthorId.set(row.userId, row.groupId);
    }

    const authorIdByOpinionId = new Map<number, string>();
    for (const row of opinionRows) {
        authorIdByOpinionId.set(row.opinionId, row.authorId);
    }

    const clustersStatsByOpinionId = new Map<number, ClusterStats[]>();
    for (const row of groupOpinionRows) {
        const group = groupsById.get(row.groupId);
        const authorId = authorIdByOpinionId.get(row.opinionId);
        if (group === undefined || authorId === undefined) {
            continue;
        }

        const clusterStats = clustersStatsByOpinionId.get(row.opinionId) ?? [];
        clusterStats.push({
            key: group.key,
            isAuthorInCluster: groupIdByAuthorId.get(authorId) === row.groupId,
            numUsers: group.numUsers,
            numAgrees: row.numAgrees,
            numDisagrees: row.numDisagrees,
            numPasses: row.numPasses,
        });
        clustersStatsByOpinionId.set(row.opinionId, clusterStats);
    }

    const opinionsById = new Map<number, AnalysisOpinionItem>();
    for (const row of opinionRows) {
        const moderationProperties = createCommentModerationPropertyObject(
            row.moderationAction,
            row.moderationExplanation,
            row.moderationReason,
            row.moderationCreatedAt,
            row.moderationUpdatedAt,
        );

        opinionsById.set(row.opinionId, {
            opinion:
                moderationProperties.status === "moderated" &&
                moderationProperties.action === "hide"
                    ? "[moderated]"
                    : row.opinion,
            opinionSlugId: row.opinionSlugId,
            createdAt: row.createdAt,
            numParticipants: conversationParticipantCount,
            numDisagrees: row.numDisagrees,
            numAgrees: row.numAgrees,
            numPasses: row.numPasses,
            updatedAt: row.updatedAt,
            username: row.username,
            moderation: moderationProperties,
            isSeed: row.isSeed,
            clustersStats: clustersStatsByOpinionId.get(row.opinionId) ?? [],
            groupAwareConsensusAgree: row.groupAwareConsensusAgree ?? 0,
            groupAwareConsensusDisagree: row.groupAwareConsensusDisagree ?? 0,
            divisiveScore: row.divisiveScore ?? 0,
        });
    }

    await removeMutedAnalysisOpinions({
        db,
        personalizationUserId,
        opinionsById,
    });

    const representativeRowsByGroupKey = new Map<
        PolisKey,
        { opinionId: number; probabilityAgreement: number }[]
    >();
    for (const row of groupOpinionRows) {
        const group = groupsById.get(row.groupId);
        if (
            group === undefined ||
            row.representativeAgreementType === null ||
            row.representativeProbabilityAgreement === null ||
            !opinionsById.has(row.opinionId)
        ) {
            continue;
        }

        const representativeRows =
            representativeRowsByGroupKey.get(group.key) ?? [];
        representativeRows.push({
            opinionId: row.opinionId,
            probabilityAgreement: row.representativeProbabilityAgreement,
        });
        representativeRowsByGroupKey.set(group.key, representativeRows);
    }

    const representativeOpinionIdsByGroupKey = new Map<PolisKey, number[]>();
    for (const [groupKey, representativeRows] of representativeRowsByGroupKey) {
        representativeOpinionIdsByGroupKey.set(
            groupKey,
            representativeRows
                .sort((a, b) => b.probabilityAgreement - a.probabilityAgreement)
                .slice(0, REPRESENTATIVE_OPINION_LIMIT)
                .map((row) => row.opinionId),
        );
    }

    return { opinionsById, representativeOpinionIdsByGroupKey };
}

function buildSnapshotPolisClusters({
    groups,
    opinionsById,
    representativeOpinionIdsByGroupKey,
}: {
    groups: SnapshotGroupMetadata[];
    opinionsById: Map<number, AnalysisOpinionItem>;
    representativeOpinionIdsByGroupKey: Map<PolisKey, number[]>;
}): PolisClusters {
    const polisClusters: PolisClusters = {};

    for (const group of groups) {
        const representative: AnalysisOpinionItem[] = [];
        for (const opinionId of representativeOpinionIdsByGroupKey.get(
            group.key,
        ) ?? []) {
            const opinion = opinionsById.get(opinionId);
            if (opinion !== undefined) {
                representative.push(opinion);
            }
        }

        polisClusters[group.key] = {
            key: group.key,
            numUsers: group.numUsers,
            aiLabel: group.aiLabel,
            aiSummary: group.aiSummary,
            isUserInCluster: group.isUserInCluster,
            representative,
        };
    }

    return polisClusters;
}

async function fetchSnapshotAnalysisByConversationSlugId({
    db,
    conversationSlugId,
    personalizationUserId,
    displayLanguage,
    analysisView,
    checkpointViewSnapshotId,
    hasVotedOnAllAvailableOpinions,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    personalizationUserId?: string;
    displayLanguage: string;
    analysisView?: AnalysisView;
    checkpointViewSnapshotId?: number;
    hasVotedOnAllAvailableOpinions: boolean | undefined;
}): Promise<ConversationAnalysis> {
    const selection = await getOpinionGroupAnalysisSelection({
        db,
        conversationSlugId,
        displayLanguage,
        analysisView,
        checkpointViewSnapshotId,
    });
    const selectedCandidate = selection.candidate;
    if (selectedCandidate === undefined) {
        return createEmptyConversationAnalysis({
            hasVotedOnAllAvailableOpinions,
            emptyReason: selection.emptyReason,
            analysisViewState: selection.viewState,
            conversationViewSnapshot: selection.conversationViewSnapshot,
            descriptionReadiness: selection.descriptionReadiness,
        });
    }

    const candidateId = selectedCandidate.candidateId;
    const groups = await fetchSnapshotGroups({
        db,
        candidateId,
        personalizationUserId,
        displayLanguage,
        useSystemDescriptions: selectedCandidate.useSystemDescriptions,
    });
    const { opinionsById, representativeOpinionIdsByGroupKey } =
        await fetchSnapshotAnalysisOpinions({
            db,
            candidateId,
            snapshotId: selectedCandidate.snapshotId,
            conversationParticipantCount: selectedCandidate.participantCount,
            groups,
            personalizationUserId,
            includeModeratedOpinions: checkpointViewSnapshotId !== undefined,
        });

    const opinions = Array.from(opinionsById.values());
    return {
        polisContentId: undefined,
        conversationViewSnapshotId: selectedCandidate.viewSnapshotId,
        analysisSnapshotId: selectedCandidate.snapshotId,
        conversationViewSnapshot: selection.conversationViewSnapshot,
        descriptionReadiness: selection.descriptionReadiness,
        analysisViewState: selection.viewState,
        consensusAgree: sortAnalysisOpinionsByWeightedMetric({
            opinions,
            getMetric: (opinion) => opinion.groupAwareConsensusAgree,
        }).slice(0, ANALYSIS_OPINION_LIMIT),
        consensusDisagree: sortAnalysisOpinionsByWeightedMetric({
            opinions,
            getMetric: (opinion) => opinion.groupAwareConsensusDisagree,
        }).slice(0, ANALYSIS_OPINION_LIMIT),
        controversial: sortAnalysisOpinionsByWeightedMetric({
            opinions,
            getMetric: (opinion) => opinion.divisiveScore,
        }).slice(0, ANALYSIS_OPINION_LIMIT),
        clusters: buildSnapshotPolisClusters({
            groups,
            opinionsById,
            representativeOpinionIdsByGroupKey,
        }),
        hasVotedOnAllAvailableOpinions,
    };
}

async function fetchSelectedOpinionGroupCandidateById({
    db,
    conversationSlugId,
    conversationViewSnapshotId,
    candidateId,
    displayLanguage,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    conversationViewSnapshotId: number;
    candidateId: number;
    displayLanguage: string;
}): Promise<SelectedOpinionGroupCandidate | undefined> {
    const requestedLocale = getSupportedDisplayLanguage(displayLanguage);
    const rows = await db
        .select({
            conversationId: conversationTable.id,
            viewSnapshotId: conversationViewSnapshotTable.id,
            surveyAggregateSnapshotId:
                conversationViewSnapshotTable.surveyAggregateSnapshotId,
            participantCount: conversationViewSnapshotTable.participantCount,
            snapshotId: conversationViewSnapshotTable.analysisSnapshotId,
            resultId: analysisSnapshotResultTable.id,
            variantsEnabled: analysisSnapshotResultTable.variantsEnabled,
            candidateId: opinionGroupCandidateTable.id,
            groupCount: opinionGroupVariantTable.groupCount,
            aiLabelingEnabled: conversationTable.aiLabelingEnabled,
        })
        .from(conversationTable)
        .innerJoin(
            conversationViewSnapshotTable,
            and(
                eq(
                    conversationViewSnapshotTable.conversationId,
                    conversationTable.id,
                ),
                eq(
                    conversationViewSnapshotTable.id,
                    conversationViewSnapshotId,
                ),
            ),
        )
        .innerJoin(
            analysisSnapshotResultTable,
            and(
                eq(
                    analysisSnapshotResultTable.analysisSnapshotId,
                    conversationViewSnapshotTable.analysisSnapshotId,
                ),
                eq(
                    analysisSnapshotResultTable.opinionGroupSpecId,
                    conversationViewSnapshotTable.opinionGroupSpecId,
                ),
            ),
        )
        .innerJoin(
            opinionGroupCandidateTable,
            and(
                eq(
                    opinionGroupCandidateTable.snapshotResultId,
                    analysisSnapshotResultTable.id,
                ),
                eq(opinionGroupCandidateTable.id, candidateId),
            ),
        )
        .innerJoin(
            opinionGroupVariantTable,
            eq(
                opinionGroupVariantTable.id,
                opinionGroupCandidateTable.opinionGroupVariantId,
            ),
        )
        .innerJoin(
            opinionGroupCandidateAssessmentTable,
            eq(
                opinionGroupCandidateAssessmentTable.candidateId,
                opinionGroupCandidateTable.id,
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                isNotNull(conversationViewSnapshotTable.activatedAt),
                isNotNull(conversationViewSnapshotTable.analysisSnapshotId),
                eq(analysisSnapshotResultTable.outcome, "success"),
                eq(opinionGroupCandidateTable.outcome, "success"),
                isNull(opinionGroupCandidateAssessmentTable.hiddenReason),
                isNotNull(opinionGroupCandidateAssessmentTable.selectionScore),
            ),
        )
        .limit(1);

    const row = rows.at(0);
    if (row?.snapshotId == null) {
        return undefined;
    }

    const candidateRows = await fetchSnapshotCandidateOptions({
        db,
        resultId: row.resultId,
    });
    const descriptionReadiness = await buildDerivedAnalysisDescriptionReadiness({
        db,
        aiLabelingEnabled: row.aiLabelingEnabled,
        requestedLocale,
        requiredCandidateIds: getRequiredDescriptionCandidateIds({
            candidates: candidateRows,
            variantsEnabled: row.variantsEnabled,
        }),
    });

    return {
        conversationId: row.conversationId,
        viewSnapshotId: row.viewSnapshotId,
        surveyAggregateSnapshotId: row.surveyAggregateSnapshotId,
        participantCount: row.participantCount,
        snapshotId: row.snapshotId,
        resultId: row.resultId,
        candidateId: row.candidateId,
        groupCount: row.groupCount,
        useSystemDescriptions: shouldUseSystemDescriptions({
            aiLabelingEnabled: row.aiLabelingEnabled,
            requestedLocale,
            englishStatus: descriptionReadiness.english.status,
            englishExpected: descriptionReadiness.english.expected,
            requestedStatus: descriptionReadiness.requested.status,
            requestedExpected: descriptionReadiness.requested.expected,
        }),
        descriptionReadiness,
    };
}

export async function fetchAnalysisMetadataByConversationSlugId({
    db,
    conversationSlugId,
    personalizationUserId,
    displayLanguage = "en",
    analysisView,
    checkpointViewSnapshotId,
    freshnessOptions,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    personalizationUserId?: string;
    displayLanguage?: string;
    analysisView?: AnalysisView;
    checkpointViewSnapshotId?: number;
    freshnessOptions: AnalysisFreshnessOptions | null;
}): Promise<ConversationAnalysisMetadata> {
    const requestedLocale = getSupportedDisplayLanguage(displayLanguage);
    if (checkpointViewSnapshotId !== undefined) {
        await ensureAiDescriptionLocaleExpectationForConversationViewSnapshot({
            db: getPrimaryDb(db),
            conversationSlugId,
            conversationViewSnapshotId: checkpointViewSnapshotId,
            requestedLocale,
        });
    }

    const metadata = await fetchAnalysisMetadataByConversationSlugIdFromDb({
        db,
        conversationSlugId,
        personalizationUserId,
        displayLanguage,
        analysisView,
        checkpointViewSnapshotId,
    });

    if (
        isAnalysisMetadataFreshEnough({ metadata, freshnessOptions }) ||
        !shouldTryPrimaryFallback({ db, freshnessOptions })
    ) {
        return metadata;
    }

    log.info(
        `[Analysis] Falling back to primary for metadata conversationSlugId=${conversationSlugId} ` +
            `minimumSnapshotId=${String(freshnessOptions?.minimumConversationViewSnapshotId)}`,
    );
    const primaryMetadata = await fetchAnalysisMetadataByConversationSlugIdFromDb({
        db: getPrimaryDb(db),
        conversationSlugId,
        personalizationUserId,
        displayLanguage,
        analysisView,
        checkpointViewSnapshotId,
    });
    if (isAnalysisMetadataFreshEnough({ metadata: primaryMetadata, freshnessOptions })) {
        return primaryMetadata;
    }
    return metadata;
}

async function fetchAnalysisMetadataByConversationSlugIdFromDb({
    db,
    conversationSlugId,
    personalizationUserId,
    displayLanguage,
    analysisView,
    checkpointViewSnapshotId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    personalizationUserId?: string;
    displayLanguage: string;
    analysisView?: AnalysisView;
    checkpointViewSnapshotId?: number;
}): Promise<ConversationAnalysisMetadata> {
    const hasVotedOnAllAvailableOpinions =
        await getHasVotedOnAllAvailableOpinions({
            db,
            conversationSlugId,
            personalizationUserId,
        });
    const selection = await getOpinionGroupAnalysisSelection({
        db,
        conversationSlugId,
        displayLanguage,
        analysisView,
        checkpointViewSnapshotId,
    });

    return {
        conversationViewSnapshotId:
            selection.conversationViewSnapshot?.conversationViewSnapshotId,
        analysisSnapshotId:
            selection.conversationViewSnapshot?.analysisSnapshotId,
        conversationViewSnapshot: selection.conversationViewSnapshot,
        descriptionReadiness: selection.descriptionReadiness,
        emptyReason: selection.emptyReason,
        analysisViewState: selection.viewState,
        displayableGroupCounts: selection.displayableGroupCounts,
        hasVotedOnAllAvailableOpinions,
    };
}

export async function fetchAnalysisContentByCandidateId({
    db,
    conversationSlugId,
    conversationViewSnapshotId,
    candidateId,
    personalizationUserId,
    displayLanguage = "en",
    freshnessOptions,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    conversationViewSnapshotId: number;
    candidateId: number;
    personalizationUserId?: string;
    displayLanguage?: string;
    freshnessOptions: AnalysisFreshnessOptions | null;
}): Promise<FetchAnalysisContentResponse> {
    const content = await fetchAnalysisContentByCandidateIdFromDb({
        db,
        conversationSlugId,
        conversationViewSnapshotId,
        candidateId,
        personalizationUserId,
        displayLanguage,
    });
    if (
        content !== undefined &&
        isAnalysisContentFreshEnough({
            descriptionReadiness: content.descriptionReadiness,
            freshnessOptions,
        })
    ) {
        return { success: true, ...content };
    }

    if (shouldTryPrimaryFallback({ db, freshnessOptions })) {
        log.info(
            `[Analysis] Falling back to primary for content conversationSlugId=${conversationSlugId} ` +
                `viewSnapshotId=${String(conversationViewSnapshotId)} candidateId=${String(candidateId)}`,
        );
        const primaryContent = await fetchAnalysisContentByCandidateIdFromDb({
            db: getPrimaryDb(db),
            conversationSlugId,
            conversationViewSnapshotId,
            candidateId,
            personalizationUserId,
            displayLanguage,
        });
        if (
            primaryContent !== undefined &&
            isAnalysisContentFreshEnough({
                descriptionReadiness: primaryContent.descriptionReadiness,
                freshnessOptions,
            })
        ) {
            return { success: true, ...primaryContent };
        }
    }

    if (content !== undefined) {
        return { success: true, ...content };
    }

    log.info(
        `[Analysis] Content unavailable conversationSlugId=${conversationSlugId} ` +
            `viewSnapshotId=${String(conversationViewSnapshotId)} candidateId=${String(candidateId)}`,
    );
    return { success: false, reason: "not_available" };
}

async function fetchAnalysisContentByCandidateIdFromDb({
    db,
    conversationSlugId,
    conversationViewSnapshotId,
    candidateId,
    personalizationUserId,
    displayLanguage,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    conversationViewSnapshotId: number;
    candidateId: number;
    personalizationUserId?: string;
    displayLanguage: string;
}): Promise<ConversationAnalysisContent | undefined> {
    const selectedCandidate = await fetchSelectedOpinionGroupCandidateById({
        db,
        conversationSlugId,
        conversationViewSnapshotId,
        candidateId,
        displayLanguage,
    });
    if (selectedCandidate === undefined) {
        return undefined;
    }

    const checkpointRows = await db
        .select({ id: conversationViewSnapshotCheckpointReasonTable.id })
        .from(conversationViewSnapshotCheckpointReasonTable)
        .where(
            eq(
                conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
                selectedCandidate.viewSnapshotId,
            ),
        )
        .limit(1);

    const groups = await fetchSnapshotGroups({
        db,
        candidateId: selectedCandidate.candidateId,
        personalizationUserId,
        displayLanguage,
        useSystemDescriptions: selectedCandidate.useSystemDescriptions,
    });
    const { opinionsById, representativeOpinionIdsByGroupKey } =
        await fetchSnapshotAnalysisOpinions({
            db,
            candidateId: selectedCandidate.candidateId,
            snapshotId: selectedCandidate.snapshotId,
            conversationParticipantCount: selectedCandidate.participantCount,
            groups,
            personalizationUserId,
            includeModeratedOpinions: checkpointRows.length > 0,
        });

    const opinions = Array.from(opinionsById.values());
    return {
        conversationViewSnapshotId: selectedCandidate.viewSnapshotId,
        analysisSnapshotId: selectedCandidate.snapshotId,
        candidateId: selectedCandidate.candidateId,
        descriptionReadiness: selectedCandidate.descriptionReadiness,
        consensusAgree: sortAnalysisOpinionsByWeightedMetric({
            opinions,
            getMetric: (opinion) => opinion.groupAwareConsensusAgree,
        }).slice(0, ANALYSIS_OPINION_LIMIT),
        consensusDisagree: sortAnalysisOpinionsByWeightedMetric({
            opinions,
            getMetric: (opinion) => opinion.groupAwareConsensusDisagree,
        }).slice(0, ANALYSIS_OPINION_LIMIT),
        controversial: sortAnalysisOpinionsByWeightedMetric({
            opinions,
            getMetric: (opinion) => opinion.divisiveScore,
        }).slice(0, ANALYSIS_OPINION_LIMIT),
        clusters: buildSnapshotPolisClusters({
            groups,
            opinionsById,
            representativeOpinionIdsByGroupKey,
        }),
    };
}

export async function fetchAnalysisByConversationSlugId({
    db,
    conversationSlugId,
    personalizationUserId,
    displayLanguage = "en",
    analysisView,
    checkpointViewSnapshotId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    personalizationUserId?: string;
    displayLanguage?: string;
    analysisView?: AnalysisView;
    checkpointViewSnapshotId?: number;
}): Promise<ConversationAnalysis> {
    const hasVotedOnAllAvailableOpinions =
        await getHasVotedOnAllAvailableOpinions({
            db,
            conversationSlugId,
            personalizationUserId,
        });

    const snapshotAnalysis = await fetchSnapshotAnalysisByConversationSlugId({
        db,
        conversationSlugId,
        personalizationUserId,
        displayLanguage,
        analysisView,
        checkpointViewSnapshotId,
        hasVotedOnAllAvailableOpinions,
    });
    return snapshotAnalysis;
}

async function getHasVotedOnAllAvailableOpinions({
    db,
    conversationSlugId,
    personalizationUserId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    personalizationUserId?: string;
}): Promise<boolean | undefined> {
    if (personalizationUserId === undefined) {
        return undefined;
    }

    const unvotedOpinions = await db
        .select({ opinionId: opinionTable.id })
        .from(opinionTable)
        .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, opinionTable.conversationId),
        )
        .leftJoin(
            opinionModerationTable,
            eq(opinionModerationTable.opinionId, opinionTable.id),
        )
        .leftJoin(
            voteTable,
            and(
                eq(voteTable.opinionId, opinionTable.id),
                eq(voteTable.authorId, personalizationUserId),
                isNotNull(voteTable.currentContentId),
            ),
        )
        .leftJoin(
            userMutePreferenceTable,
            and(
                eq(userMutePreferenceTable.sourceUserId, personalizationUserId),
                eq(userMutePreferenceTable.targetUserId, opinionTable.authorId),
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                isNotNull(opinionTable.currentContentId),
                isNull(opinionModerationTable.id),
                isNull(voteTable.id),
                isNull(userMutePreferenceTable.id),
                eq(userTable.isDeleted, false),
            ),
        )
        .limit(1);

    return unvotedOpinions.length === 0;
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
    tx?: PostgresJsDatabase;
    commentBody: string;
    conversationSlugId: string;
    didWrite: string;
    userAgent: string;
    now: Date;
    isSeed: boolean;
    voteBuffer?: VoteBuffer;
    realtimeSSEManager?: RealtimeSSEManager;
    conversationMetadata?: {
        conversationId: number;
        conversationContentId: number;
        conversationAuthorId: string;
        conversationAuthorUsername?: string;
        conversationIsIndexed: boolean;
        conversationParticipationMode: ParticipationMode;
        conversationIsClosed: boolean;
        requiresEventTicket: EventSlug | null;
    };
}

export async function postNewOpinion({
    db,
    tx,
    commentBody,
    conversationSlugId,
    didWrite,
    userAgent,
    now,
    isSeed,
    voteBuffer,
    realtimeSSEManager,
    conversationMetadata,
}: PostNewOpinionProps): Promise<CreateCommentResponse> {
    interface ParticipationContext {
        success: true;
        conversationId: number;
        conversationContentId: number;
        participantId: string;
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

    const participationContext:
        | ParticipationContext
        | Extract<CreateCommentResponse, { success: false }> =
        conversationMetadata !== undefined
            ? {
                  success: true,
                  conversationId: conversationMetadata.conversationId,
                  conversationContentId:
                      conversationMetadata.conversationContentId,
                  participantId: conversationMetadata.conversationAuthorId,
              }
            : await (async () => {
                  const participationCheck =
                      await checkConversationParticipation({
                          db,
                          conversationSlugId,
                          didWrite,
                          userAgent,
                          now,
                      });
                  if (!participationCheck.success) {
                      return participationCheck;
                  }

                  return {
                      success: true,
                      conversationId: participationCheck.conversationId,
                      conversationContentId:
                          participationCheck.conversationContentId,
                      participantId: participationCheck.participantId,
                  };
              })();

    if (!participationContext.success) {
        return participationContext;
    }

    const opinionSlugId = generateRandomSlugId();

    const persistNewOpinion = async (
        transactionDb: PostgresJsDatabase,
    ): Promise<{
        opinionId: number;
        opinionContentId: number;
        opinionItem: OpinionItem;
    }> => {
        const insertCommentResponse = await transactionDb
            .insert(opinionTable)
            .values({
                slugId: opinionSlugId,
                authorId: participationContext.participantId,
                currentContentId: null,
                conversationId: participationContext.conversationId,
                isSeed: isSeed,
            })
            .returning({
                opinionId: opinionTable.id,
                createdAt: opinionTable.createdAt,
                updatedAt: opinionTable.updatedAt,
            });

        const opinionId = insertCommentResponse[0].opinionId;

        const commentContentTableResponse = await transactionDb
            .insert(opinionContentTable)
            .values({
                opinionId: opinionId,
                conversationContentId:
                    participationContext.conversationContentId,
                content: commentBody,
            })
            .returning({ commentContentTableId: opinionContentTable.id });

        const commentContentTableId =
            commentContentTableResponse[0].commentContentTableId;

        await transactionDb
            .update(opinionTable)
            .set({
                currentContentId: commentContentTableId,
            })
            .where(eq(opinionTable.id, opinionId));

        // Update the user profile's comment count using atomic increment
        await transactionDb
            .update(userTable)
            .set({
                totalOpinionCount: sql`total_opinion_count + 1`,
            })
            .where(eq(userTable.id, participationContext.participantId));

        const participantUsername =
            conversationMetadata?.conversationAuthorUsername ??
            (await (async (): Promise<string> => {
                const participantRows = await transactionDb
                    .select({ username: userTable.username })
                    .from(userTable)
                    .where(eq(userTable.id, participationContext.participantId))
                    .limit(1);
                const participant = participantRows.at(0);
                if (participant === undefined) {
                    throw httpErrors.internalServerError(
                        "Failed to locate opinion author after creation",
                    );
                }
                return participant.username;
            })());

        const opinionItem: OpinionItem = {
            opinion: commentBody,
            opinionSlugId,
            createdAt: insertCommentResponse[0].createdAt,
            updatedAt: insertCommentResponse[0].updatedAt,
            numParticipants: isSeed ? 0 : 1,
            numAgrees: isSeed ? 0 : 1,
            numDisagrees: 0,
            numPasses: 0,
            username: participantUsername,
            moderation: { status: "unmoderated" },
            isSeed,
        };

        return {
            opinionId,
            opinionContentId: commentContentTableId,
            opinionItem,
        };
    };

    const { opinionId, opinionContentId, opinionItem } =
        tx !== undefined
            ? await persistNewOpinion(tx)
            : await db.transaction(async (transactionDb) => {
                  return await persistNewOpinion(transactionDb);
              });

    if (!isSeed) {
        if (voteBuffer === undefined) {
            throw httpErrors.internalServerError(
                "Vote buffer is required when creating a non-seed opinion",
            );
        }

        voteBuffer.add({
            vote: {
                userId: participationContext.participantId,
                opinionId,
                opinionContentId,
                conversationId: participationContext.conversationId,
                vote: "agree",
                timestamp: now,
            },
        });
    }

    // Create notification for conversation owner + org members (outside transaction)
    // Skip for seed opinions
    if (!isSeed) {
        const { recipientUserIds } = await getNotificationRecipients({
            db,
            conversationId: participationContext.conversationId,
            excludeUserIds: [participationContext.participantId],
        });
        if (recipientUserIds.length > 0) {
            await createOpinionNotifications({
                db,
                recipientUserIds,
                opinionAuthorId: participationContext.participantId,
                opinionId,
                conversationId: participationContext.conversationId,
                realtimeSSEManager,
            });
        }

        realtimeSSEManager?.broadcastToConversationSubscribersExcept({
            conversationSlugId,
            id: undefined,
            event: "new_opinion",
            data: {
                conversationSlugId,
                opinionSlugId,
                timestamp: Date.now(),
            },
            excludeUserId: participationContext.participantId,
        });
    }

    return {
        success: true,
        opinionSlugId: opinionSlugId,
        opinionItem,
    };
}

interface DeleteCommentBySlugIdProps {
    db: PostgresJsDatabase;
    opinionSlugId: string;
    userId: string;
}

export async function deleteOpinionBySlugId({
    db,
    opinionSlugId,
    userId,
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
        const opinionRows = await tx
            .select({
                opinionId: opinionTable.id,
                conversationId: opinionTable.conversationId,
            })
            .from(opinionTable)
            .where(
                and(
                    eq(opinionTable.authorId, userId),
                    eq(opinionTable.slugId, opinionSlugId),
                ),
            )
            .for("update")
            .limit(1);

        if (opinionRows.length !== 1) {
            throw httpErrors.notFound("Opinion not found");
        }

        const opinion = opinionRows[0];
        const moderationRows = await tx
            .select({ moderationId: opinionModerationTable.id })
            .from(opinionModerationTable)
            .where(eq(opinionModerationTable.opinionId, opinion.opinionId))
            .limit(1);
        const activeVoteRows = await tx
            .select({ voteId: voteTable.id })
            .from(voteTable)
            .where(
                and(
                    eq(voteTable.opinionId, opinion.opinionId),
                    isNotNull(voteTable.currentContentId),
                ),
            )
            .limit(1);

        const updatedCommentIdResponse = await tx
            .update(opinionTable)
            .set({
                currentContentId: null,
            })
            .where(eq(opinionTable.id, opinion.opinionId))
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

        const conversationId = updatedCommentIdResponse[0].conversationId;

        await createConversationViewSnapshotsFromCurrentState({
            db: tx,
            conversationId,
            viewReason: "conversation_content_updated",
        });

        if (moderationRows.length === 0 && activeVoteRows.length > 0) {
            await scheduleConversationAnalysisRefresh({
                db: tx,
                conversationId,
                log,
            });
        }

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
