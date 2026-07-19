import { generateRandomSlugId } from "@/crypto.js";
import {
    analysisSnapshotResultTable,
    analysisSnapshotOpinionTable,
    opinionContentTable,
    opinionGroupDescriptionTable,
    opinionGroupDescriptionTranslationTable,
    opinionGroupCandidateAssessmentTable,
    opinionGroupCandidateTable,
    opinionGroupCandidateOpinionMetricsTable,
    opinionGroupLineageTable,
    opinionGroupOpinionStatsTable,
    opinionGroupTable,
    opinionGroupUserTable,
    opinionGroupVariantTable,
    opinionTable,
    opinionContentTranslationTable,
    conversationContentTable,
    conversationTable,
    conversationTranslationTargetLanguageTable,
    conversationViewSnapshotCheckpointReasonTable,
    conversationViewSnapshotTable,
    userTable,
    opinionModerationTable,
    polisConversationConfigTable,
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
    AnalysisFrameGroupLabels,
    AnalysisFrameGroups,
    AnalysisFrameKey,
    AnalysisFrameManifest,
    AnalysisFrameOpinionList,
    AnalysisFrameOpinionListKind,
    AnalysisFreshnessRequest,
    CreateCommentResponse,
    FetchCommentStatsResponse,
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
    or,
    SQL,
    inArray,
} from "drizzle-orm";
import type {
    AnalysisOpinionItem,
    DisplayedOpinionItem,
    ModerationReason,
    OpinionItem,
    OpinionModerationAction,
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
import { htmlToCountedText } from "@/shared/shared.js";
import {
    getOpinionGroupAnalysisSelection,
    getSelectedOpinionGroupCandidate,
} from "./opinionGroupAnalysis.js";
import { ensureAiDescriptionLocaleRequestForConversationViewSnapshot } from "./conversationViewSnapshot.js";
import { normalizeUserRichTextInput } from "./richText.js";
import { alias } from "drizzle-orm/pg-core";
import {
    type SupportedDisplayLanguageCodes,
    type SupportedSpokenLanguageCodes,
    ZodSupportedDisplayLanguageCodes,
} from "@/shared/languages.js";
import type {
    LanguageDetectionProvider,
    LocalizedOpinionContent,
} from "@/shared/types/zod.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import {
    contentLanguageMetadataUpdateValues,
    resolveContentLanguageMetadata,
} from "./contentLanguageMetadata.js";
import { getConversationMultilingualSetting } from "./conversationMultilingual.js";
import { buildTranslationMetadata } from "./contentTranslationContent.js";
import type { OpinionContentSource } from "./contentTranslation.js";
import { translationSourceMatchesCurrentSource } from "@/shared-backend/translate.js";
import * as conversationContentService from "./conversationContent.js";
import { getProjectLanguageSettings } from "./projectAccess.js";
import {
    getConversationOverrideTranslationTargetLanguagePolicy,
    getProjectTranslationTargetLanguagePolicy,
    isConfiguredTranslationTargetLanguage,
    sourceLanguageToDisplayLanguage,
    type TranslationTargetLanguagePolicy,
} from "./translationLanguageSetting.js";

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

interface OpinionDisplayContentPreferences {
    displayLanguage: SupportedDisplayLanguageCodes;
    targetLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
    translationAllowed: boolean;
    viewerUserId: string | undefined;
}

type AnalysisOpinionDisplayContentPreferences = Omit<
    OpinionDisplayContentPreferences,
    "viewerUserId"
>;

type ResolveOpinionDisplayContentPreferences = ({
    db,
}: {
    db: PostgresJsDatabase;
}) => Promise<AnalysisOpinionDisplayContentPreferences>;

interface OpinionDisplayContentViewerPreferences {
    viewerUserId: string | undefined;
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}

interface OpinionContentRow {
    opinionContentId: number;
    contentPublicId: string;
    comment: string;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}

interface OpinionContentTranslationRow {
    translatedContent: string;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
}

type DisplayedOpinionItemPerSlugId = Map<string, DisplayedOpinionItem>;

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

function buildLocalizedOpinionContent({
    source,
    translation,
    targetLanguageCode,
}: {
    source: OpinionContentRow;
    translation: OpinionContentTranslationRow | undefined;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): LocalizedOpinionContent {
    const freshTranslation =
        translation !== undefined &&
        translationSourceMatchesCurrentSource({
            translationSourceLanguageCode: translation.sourceLanguageCode,
            currentSourceLanguageCode: source.sourceLanguageCode,
        })
            ? translation
            : undefined;
    const original = { content: source.comment };

    if (freshTranslation !== undefined) {
        return {
            kind: "translatable",
            sourceVersion: source.contentPublicId,
            initialMode: "translated",
            translation: buildTranslationMetadata({
                targetLanguageCode,
                sourceMetadata: source,
                status: "completed",
            }),
            variants: {
                original,
                translated: { content: freshTranslation.translatedContent },
            },
        };
    }

    return {
        kind: "translatable",
        sourceVersion: source.contentPublicId,
        initialMode: "original",
        translation: buildTranslationMetadata({
            targetLanguageCode,
            sourceMetadata: source,
            status: "not_requested",
        }),
        variants: {
            original,
        },
    };
}

export function isPersonalNonSeedOpinionByViewer({
    opinionAuthorId,
    viewerUserId,
    isSeed,
}: {
    opinionAuthorId: string;
    viewerUserId: string | undefined;
    isSeed: boolean;
}): boolean {
    return !isSeed && opinionAuthorId === viewerUserId;
}

export async function isPersonalNonSeedOpinionAuthoredByUser({
    db,
    conversationSlugId,
    opinionSlugId,
    userId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    opinionSlugId: string;
    userId: string;
}): Promise<boolean> {
    const rows = await db
        .select({ isSeed: opinionTable.isSeed })
        .from(opinionTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, opinionTable.conversationId),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                eq(opinionTable.slugId, opinionSlugId),
                eq(opinionTable.authorId, userId),
            ),
        )
        .limit(1);
    const row = rows.at(0);
    return row !== undefined && !row.isSeed;
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
    displayContentPreferences: OpinionDisplayContentPreferences;
}

interface FetchOpinionsByPostIdProps {
    db: PostgresJsDatabase;
    postId: number;
    personalizationUserId?: string;
    filterTarget: "new" | "moderated" | "hidden" | "discover" | "my_votes";
    limit: number;
    displayContentPreferences: OpinionDisplayContentPreferences;
}

export async function fetchOpinionsByPostId({
    db,
    postId,
    personalizationUserId,
    filterTarget,
    limit,
    displayContentPreferences,
}: FetchOpinionsByPostIdProps): Promise<DisplayedOpinionItemPerSlugId> {
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
            // Show only visible voted opinions. Hidden opinions are moderator-only.
            // Filter by currentContentId to exclude cancelled votes (currentContentId = NULL when cancelled)
            whereClause = and(
                whereClause,
                isNotNull(voteTable.currentContentId),
                or(
                    isNull(opinionModerationTable.id),
                    ne(opinionModerationTable.moderationAction, "hide"),
                ),
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
            opinionContentId: opinionContentTable.id,
            contentPublicId: opinionContentTable.publicId,
            createdAt: opinionTable.createdAt,
            updatedAt: opinionTable.updatedAt,
            comment: opinionContentTable.content,
            sourceLanguageCode: opinionContentTable.sourceLanguageCode,
            sourceRawLanguageCode: opinionContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: opinionContentTable.sourceLanguageProvider,
            sourceLanguageConfidence: opinionContentTable.sourceLanguageConfidence,
            translatedContent: opinionContentTranslationTable.translatedContent,
            translationSourceLanguageCode:
                opinionContentTranslationTable.sourceLanguageCode,
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
            opinionContentTranslationTable,
            and(
                eq(
                    opinionContentTranslationTable.opinionContentId,
                    opinionContentTable.id,
                ),
                eq(
                    opinionContentTranslationTable.displayLanguageCode,
                    displayContentPreferences.targetLanguage,
                ),
            ),
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
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
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

    const opinionItemMap: DisplayedOpinionItemPerSlugId = new Map<
        string,
        DisplayedOpinionItem
    >();
    results.map((opinionResponse) => {
        const moderationProperties = createCommentModerationPropertyObject(
            opinionResponse.moderationAction,
            opinionResponse.moderationExplanation,
            opinionResponse.moderationReason,
            opinionResponse.moderationCreatedAt,
            opinionResponse.moderationUpdatedAt,
        );

        const item: DisplayedOpinionItem = {
            opinion: opinionResponse.comment,
            sourceLanguageCode: opinionResponse.sourceLanguageCode,
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
            displayContent: conversationContentService.toOpinionDisplayContent({
                content: buildLocalizedOpinionContent({
                    source: {
                        opinionContentId: opinionResponse.opinionContentId,
                        contentPublicId: opinionResponse.contentPublicId,
                        comment: opinionResponse.comment,
                        sourceLanguageCode: opinionResponse.sourceLanguageCode,
                        sourceRawLanguageCode: opinionResponse.sourceRawLanguageCode,
                        sourceLanguageProvider:
                            opinionResponse.sourceLanguageProvider,
                        sourceLanguageConfidence:
                            opinionResponse.sourceLanguageConfidence,
                    },
                    translation:
                        opinionResponse.translatedContent === null
                            ? undefined
                            : {
                                  translatedContent:
                                      opinionResponse.translatedContent,
                                  sourceLanguageCode:
                                      opinionResponse.translationSourceLanguageCode,
                              },
                    targetLanguageCode: displayContentPreferences.targetLanguage,
                }),
                translationAllowed:
                    displayContentPreferences.translationAllowed &&
                    !isPersonalNonSeedOpinionByViewer({
                        opinionAuthorId: opinionResponse.authorId,
                        viewerUserId: displayContentPreferences.viewerUserId,
                        isSeed: opinionResponse.isSeed,
                    }),
                displayLanguage: displayContentPreferences.displayLanguage,
                spokenLanguages: displayContentPreferences.spokenLanguages,
            }),
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
    displayContentPreferences,
}: FetchOpinionsProps): Promise<DisplayedOpinionItemPerSlugId> {
    const postId = await getPostIdFromPostSlugId(db, postSlugId);
    return await fetchOpinionsByPostId({
        db,
        postId,
        personalizationUserId,
        filterTarget,
        limit,
        displayContentPreferences,
    });
}

export async function fetchCommentStatsByConversationSlugId({
    db,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
}): Promise<FetchCommentStatsResponse> {
    const rows = await db
        .select({
            conversationViewSnapshotId: conversationViewSnapshotTable.id,
            opinionCount: conversationViewSnapshotTable.opinionCount,
            voteCount: conversationViewSnapshotTable.voteCount,
            participantCount: conversationViewSnapshotTable.participantCount,
            totalOpinionCount: conversationViewSnapshotTable.totalOpinionCount,
            totalVoteCount: conversationViewSnapshotTable.totalVoteCount,
            totalParticipantCount:
                conversationViewSnapshotTable.totalParticipantCount,
            moderatedOpinionCount:
                conversationViewSnapshotTable.moderatedOpinionCount,
            hiddenOpinionCount:
                conversationViewSnapshotTable.hiddenOpinionCount,
            isClosed: conversationViewSnapshotTable.isClosed,
        })
        .from(conversationViewSnapshotTable)
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationViewSnapshotTable.conversationId,
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
            ),
        )
        .orderBy(
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        )
        .limit(1);

    const stats = rows.at(0);
    if (stats === undefined) {
        throw httpErrors.notFound(
            `Missing comment stats for conversation ${conversationSlugId}`,
        );
    }

    return stats;
}

interface FetchOpinionsByOpinionSlugIdListProps {
    db: PostgresJsDatabase;
    opinionSlugIdList: SlugId[];
    displayContentViewerPreferences: OpinionDisplayContentViewerPreferences;
}

export async function fetchOpinionsByOpinionSlugIdList({
    db,
    opinionSlugIdList,
    displayContentViewerPreferences,
}: FetchOpinionsByOpinionSlugIdListProps): Promise<GetOpinionBySlugIdListResponse> {
    if (opinionSlugIdList.length === 0) {
        return [];
    }

    const results = await db
        .select({
            opinionId: opinionTable.id,
            conversationId: opinionTable.conversationId,
            projectId: conversationTable.projectId,
            languageSettingsSource: conversationTable.languageSettingsSource,
            dynamicTranslationEnabled:
                conversationTable.dynamicTranslationEnabled,
            authorId: opinionTable.authorId,
            conversationSourceLanguageCode:
                conversationContentTable.sourceLanguageCode,
            configuredTargetLanguageCode:
                conversationTranslationTargetLanguageTable.languageCode,
            opinionContentId: opinionContentTable.id,
            contentPublicId: opinionContentTable.publicId,
            commentSlugId: opinionTable.slugId,
            createdAt: opinionTable.createdAt,
            updatedAt: opinionTable.updatedAt,
            comment: opinionContentTable.content,
            sourceLanguageCode: opinionContentTable.sourceLanguageCode,
            sourceRawLanguageCode: opinionContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: opinionContentTable.sourceLanguageProvider,
            sourceLanguageConfidence: opinionContentTable.sourceLanguageConfidence,
            translatedContent: opinionContentTranslationTable.translatedContent,
            translationSourceLanguageCode:
                opinionContentTranslationTable.sourceLanguageCode,
            username: userTable.username,
            isSeed: opinionTable.isSeed,
            moderationAction: opinionModerationTable.moderationAction,
            moderationExplanation: opinionModerationTable.moderationExplanation,
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
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.id, opinionTable.currentContentId),
        )
        .leftJoin(
            conversationTranslationTargetLanguageTable,
            and(
                eq(
                    conversationTranslationTargetLanguageTable.conversationId,
                    conversationTable.id,
                ),
                eq(
                    conversationTranslationTargetLanguageTable.languageCode,
                    displayContentViewerPreferences.displayLanguage,
                ),
                isNull(conversationTranslationTargetLanguageTable.deletedAt),
            ),
        )
        .leftJoin(
            opinionContentTranslationTable,
            and(
                eq(
                    opinionContentTranslationTable.opinionContentId,
                    opinionContentTable.id,
                ),
                eq(
                    opinionContentTranslationTable.displayLanguageCode,
                    displayContentViewerPreferences.displayLanguage,
                ),
            ),
        )
        .leftJoin(
            opinionModerationTable,
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
        )
        .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .orderBy(desc(opinionTable.createdAt))
        .where(
            and(
                inArray(opinionTable.slugId, opinionSlugIdList),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                eq(userTable.isDeleted, false),
                or(
                    isNull(opinionModerationTable.id),
                    ne(opinionModerationTable.moderationAction, "hide"),
                ),
            ),
        );

    const opinionItemList: DisplayedOpinionItem[] = [];
    const inheritedPolicyByProjectId = new Map<number, TranslationTargetLanguagePolicy>();
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
        let targetLanguagePolicy: TranslationTargetLanguagePolicy;
        if (commentResponse.languageSettingsSource === "project_inherited") {
            let inheritedPolicy = inheritedPolicyByProjectId.get(
                commentResponse.projectId,
            );
            if (inheritedPolicy === undefined) {
                inheritedPolicy = getProjectTranslationTargetLanguagePolicy({
                    languageSettings: await getProjectLanguageSettings({
                        db,
                        projectId: commentResponse.projectId,
                    }),
                });
                inheritedPolicyByProjectId.set(
                    commentResponse.projectId,
                    inheritedPolicy,
                );
            }
            targetLanguagePolicy = inheritedPolicy;
        } else {
            targetLanguagePolicy = getConversationOverrideTranslationTargetLanguagePolicy({
                multilingualSettings: {
                    dynamicTranslationEnabled: commentResponse.dynamicTranslationEnabled,
                    additionalLanguageCodes:
                        commentResponse.configuredTargetLanguageCode === null
                            ? []
                            : [commentResponse.configuredTargetLanguageCode],
                },
                detectedTargetLanguageCode: sourceLanguageToDisplayLanguage({
                    sourceLanguageCode:
                        commentResponse.conversationSourceLanguageCode,
                }),
            });
        }
        const translationAllowed =
            targetLanguagePolicy.dynamicTranslationEnabled &&
            isConfiguredTranslationTargetLanguage({
                policy: targetLanguagePolicy,
                targetLanguageCode: displayContentViewerPreferences.displayLanguage,
            });

        opinionItemList.push({
            opinion: commentResponse.comment,
            sourceLanguageCode: commentResponse.sourceLanguageCode,
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
            displayContent: conversationContentService.toOpinionDisplayContent({
                content: buildLocalizedOpinionContent({
                    source: {
                        opinionContentId: commentResponse.opinionContentId,
                        contentPublicId: commentResponse.contentPublicId,
                        comment: commentResponse.comment,
                        sourceLanguageCode: commentResponse.sourceLanguageCode,
                        sourceRawLanguageCode: commentResponse.sourceRawLanguageCode,
                        sourceLanguageProvider:
                            commentResponse.sourceLanguageProvider,
                        sourceLanguageConfidence:
                            commentResponse.sourceLanguageConfidence,
                    },
                    translation:
                        commentResponse.translatedContent === null
                            ? undefined
                            : {
                                  translatedContent:
                                      commentResponse.translatedContent,
                                  sourceLanguageCode:
                                      commentResponse.translationSourceLanguageCode,
                              },
                    targetLanguageCode:
                        displayContentViewerPreferences.displayLanguage,
                }),
                translationAllowed:
                    translationAllowed &&
                    !isPersonalNonSeedOpinionByViewer({
                        opinionAuthorId: commentResponse.authorId,
                        viewerUserId: displayContentViewerPreferences.viewerUserId,
                        isSeed: commentResponse.isSeed,
                    }),
                displayLanguage: displayContentViewerPreferences.displayLanguage,
                spokenLanguages: displayContentViewerPreferences.spokenLanguages,
            }),
        });
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

interface SnapshotGroupMetadata {
    id: number;
    key: PolisKey;
    numUsers: number;
    systemDescriptionId: number | null;
    isUserInCluster: boolean;
}

interface SnapshotAnalysisOpinionRow {
    analysisSnapshotOpinionId: number;
    opinionId: number;
    opinionContentId: number;
    contentPublicId: string;
    opinionSlugId: string;
    createdAt: Date;
    updatedAt: Date;
    opinion: string;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
    translatedContent: string | null;
    translationSourceLanguageCode: SupportedSpokenLanguageCodes | null;
    authorId: string;
    username: string;
    isSeed: boolean;
    numAgrees: number;
    numDisagrees: number;
    numPasses: number;
    groupAwareConsensusAgree: number | null;
    groupAwareConsensusDisagree: number | null;
    divisiveScore: number | null;
    moderationAction: OpinionModerationAction | null;
    moderationExplanation: string | null;
    moderationReason: ModerationReason | null;
    moderationCreatedAt: Date | null;
    moderationUpdatedAt: Date | null;
}

interface GroupOpinionStatsRow {
    groupId: number;
    analysisSnapshotOpinionId: number;
    numAgrees: number;
    numDisagrees: number;
    numPasses: number;
}

interface RepresentativeOpinionRow {
    groupId: number;
    analysisSnapshotOpinionId: number;
    opinionId: number;
    representativeProbabilityAgreement: number;
}

interface SelectedAnalysisFrameCandidate {
    conversationId: number;
    viewSnapshotId: number;
    surveyAggregateSnapshotId: number | null;
    participantCount: number;
    snapshotId: number;
    resultId: number;
    candidateId: number;
    groupCount: number;
    aiLabelingEnabled: boolean;
    isCheckpointFrame: boolean;
}

interface AnalysisFrameKeySource {
    viewSnapshotId: number;
    snapshotId: number;
    candidateId: number;
}

async function fetchSnapshotGroups({
    db,
    candidateId,
    personalizationUserId,
}: {
    db: PostgresJsDatabase;
    candidateId: number;
    personalizationUserId?: string;
}): Promise<SnapshotGroupMetadata[]> {
    const groupRows = await db
        .select({
            id: opinionGroupTable.id,
            key: opinionGroupTable.key,
            numUsers: opinionGroupTable.numUsers,
            systemDescriptionId: opinionGroupLineageTable.systemDescriptionId,
        })
        .from(opinionGroupTable)
        .leftJoin(
            opinionGroupLineageTable,
            eq(opinionGroupLineageTable.id, opinionGroupTable.lineageId),
        )
        .where(eq(opinionGroupTable.candidateId, candidateId))
        .orderBy(asc(opinionGroupTable.key));

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

        groups.push({
            id: row.id,
            key: row.key,
            numUsers: row.numUsers,
            systemDescriptionId: row.systemDescriptionId,
            isUserInCluster: currentUserGroupIds.has(row.id),
        });
    }

    return groups;
}

function getSnapshotAnalysisOpinionSelectFields() {
    return {
        opinionId: opinionTable.id,
        analysisSnapshotOpinionId: analysisSnapshotOpinionTable.id,
        opinionContentId: opinionContentTable.id,
        contentPublicId: opinionContentTable.publicId,
        opinionSlugId: opinionTable.slugId,
        createdAt: opinionTable.createdAt,
        updatedAt: opinionTable.updatedAt,
        opinion: opinionContentTable.content,
        sourceLanguageCode: opinionContentTable.sourceLanguageCode,
        sourceRawLanguageCode: opinionContentTable.sourceRawLanguageCode,
        sourceLanguageProvider: opinionContentTable.sourceLanguageProvider,
        sourceLanguageConfidence: opinionContentTable.sourceLanguageConfidence,
        translatedContent: opinionContentTranslationTable.translatedContent,
        translationSourceLanguageCode:
            opinionContentTranslationTable.sourceLanguageCode,
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
        divisiveScore: opinionGroupCandidateOpinionMetricsTable.divisiveness,
        moderationAction: opinionModerationTable.moderationAction,
        moderationExplanation: opinionModerationTable.moderationExplanation,
        moderationReason: opinionModerationTable.moderationReason,
        moderationCreatedAt: opinionModerationTable.createdAt,
        moderationUpdatedAt: opinionModerationTable.updatedAt,
    };
}

function getAnalysisOpinionModerationFilter({
    includeModeratedOpinions,
}: {
    includeModeratedOpinions: boolean;
}): SQL | undefined {
    return includeModeratedOpinions
        ? undefined
        : isNull(opinionModerationTable.id);
}

function getAnalysisOpinionMuteFilter({
    personalizationUserId,
}: {
    personalizationUserId?: string;
}): SQL | undefined {
    return personalizationUserId === undefined
        ? undefined
        : isNull(userMutePreferenceTable.id);
}

function getAnalysisOpinionMuteJoin({
    personalizationUserId,
}: {
    personalizationUserId?: string;
}): SQL | undefined {
    return personalizationUserId === undefined
        ? sql`false`
        : and(
              eq(userMutePreferenceTable.sourceUserId, personalizationUserId),
              eq(userMutePreferenceTable.targetUserId, opinionTable.authorId),
              isNull(userMutePreferenceTable.deletedAt),
          );
}

function getAnalysisFrameOpinionListMetricSql(
    kind: AnalysisFrameOpinionListKind,
): SQL<number> {
    switch (kind) {
        case "agreements": {
            return sql<number>`coalesce(${opinionGroupCandidateOpinionMetricsTable.groupAwareConsensusAgree}, 0)`;
        }
        case "disagreements": {
            return sql<number>`coalesce(${opinionGroupCandidateOpinionMetricsTable.groupAwareConsensusDisagree}, 0)`;
        }
        case "divisive": {
            return sql<number>`coalesce(${opinionGroupCandidateOpinionMetricsTable.divisiveness}, 0)`;
        }
    }
}

function getAnalysisFrameOpinionListScoreSql({
    kind,
    conversationParticipantCount,
}: {
    kind: AnalysisFrameOpinionListKind;
    conversationParticipantCount: number;
}): SQL<number> {
    const metricSql = getAnalysisFrameOpinionListMetricSql(kind);
    const totalVotesSql = sql<number>`(${analysisSnapshotOpinionTable.numAgrees} + ${analysisSnapshotOpinionTable.numDisagrees} + ${analysisSnapshotOpinionTable.numPasses})`;
    const participantSmoothing = conversationParticipantCount * 0.1;
    return sql<number>`(${metricSql}) * ((${totalVotesSql})::double precision / greatest((${totalVotesSql})::double precision + ${participantSmoothing}, 1.0))`;
}

async function fetchAnalysisOpinionRowsByIds({
    db,
    candidateId,
    snapshotId,
    analysisSnapshotOpinionIds,
    personalizationUserId,
    includeModeratedOpinions,
    displayContentPreferences,
}: {
    db: PostgresJsDatabase;
    candidateId: number;
    snapshotId: number;
    analysisSnapshotOpinionIds: number[];
    personalizationUserId?: string;
    includeModeratedOpinions: boolean;
    displayContentPreferences: AnalysisOpinionDisplayContentPreferences;
}): Promise<SnapshotAnalysisOpinionRow[]> {
    const uniqueAnalysisSnapshotOpinionIds = Array.from(
        new Set(analysisSnapshotOpinionIds),
    );
    if (uniqueAnalysisSnapshotOpinionIds.length === 0) {
        return [];
    }

    return await db
        .select(getSnapshotAnalysisOpinionSelectFields())
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
            opinionContentTranslationTable,
            and(
                eq(
                    opinionContentTranslationTable.opinionContentId,
                    opinionContentTable.id,
                ),
                eq(
                    opinionContentTranslationTable.displayLanguageCode,
                    displayContentPreferences.targetLanguage,
                ),
            ),
        )
        .leftJoin(
            opinionModerationTable,
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
        )
        .leftJoin(
            userMutePreferenceTable,
            getAnalysisOpinionMuteJoin({ personalizationUserId }),
        )
        .where(
            and(
                eq(
                    opinionGroupCandidateOpinionMetricsTable.candidateId,
                    candidateId,
                ),
                eq(analysisSnapshotOpinionTable.analysisSnapshotId, snapshotId),
                inArray(
                    opinionGroupCandidateOpinionMetricsTable.analysisSnapshotOpinionId,
                    uniqueAnalysisSnapshotOpinionIds,
                ),
                getAnalysisOpinionModerationFilter({
                    includeModeratedOpinions,
                }),
                getAnalysisOpinionMuteFilter({ personalizationUserId }),
                eq(userTable.isDeleted, false),
            ),
        );
}

async function fetchAnalysisOpinionRowsForList({
    db,
    candidateId,
    snapshotId,
    conversationParticipantCount,
    personalizationUserId,
    includeModeratedOpinions,
    kind,
    displayContentPreferences,
}: {
    db: PostgresJsDatabase;
    candidateId: number;
    snapshotId: number;
    conversationParticipantCount: number;
    personalizationUserId?: string;
    includeModeratedOpinions: boolean;
    kind: AnalysisFrameOpinionListKind;
    displayContentPreferences: AnalysisOpinionDisplayContentPreferences;
}): Promise<SnapshotAnalysisOpinionRow[]> {
    const scoreSql = getAnalysisFrameOpinionListScoreSql({
        kind,
        conversationParticipantCount,
    });

    return await db
        .select(getSnapshotAnalysisOpinionSelectFields())
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
            opinionContentTranslationTable,
            and(
                eq(
                    opinionContentTranslationTable.opinionContentId,
                    opinionContentTable.id,
                ),
                eq(
                    opinionContentTranslationTable.displayLanguageCode,
                    displayContentPreferences.targetLanguage,
                ),
            ),
        )
        .leftJoin(
            opinionModerationTable,
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
        )
        .leftJoin(
            userMutePreferenceTable,
            getAnalysisOpinionMuteJoin({ personalizationUserId }),
        )
        .where(
            and(
                eq(
                    opinionGroupCandidateOpinionMetricsTable.candidateId,
                    candidateId,
                ),
                eq(analysisSnapshotOpinionTable.analysisSnapshotId, snapshotId),
                getAnalysisOpinionModerationFilter({
                    includeModeratedOpinions,
                }),
                getAnalysisOpinionMuteFilter({ personalizationUserId }),
                eq(userTable.isDeleted, false),
            ),
        )
        .orderBy(
            desc(scoreSql),
            desc(opinionTable.createdAt),
            desc(opinionTable.id),
        )
        .limit(ANALYSIS_OPINION_LIMIT);
}

async function fetchGroupOpinionStatsRows({
    db,
    groups,
    analysisSnapshotOpinionIds,
}: {
    db: PostgresJsDatabase;
    groups: SnapshotGroupMetadata[];
    analysisSnapshotOpinionIds: number[];
}): Promise<GroupOpinionStatsRow[]> {
    const uniqueAnalysisSnapshotOpinionIds = Array.from(
        new Set(analysisSnapshotOpinionIds),
    );
    if (groups.length === 0 || uniqueAnalysisSnapshotOpinionIds.length === 0) {
        return [];
    }

    return await db
        .select({
            groupId: opinionGroupOpinionStatsTable.groupId,
            analysisSnapshotOpinionId:
                opinionGroupOpinionStatsTable.analysisSnapshotOpinionId,
            numAgrees: opinionGroupOpinionStatsTable.numAgrees,
            numDisagrees: opinionGroupOpinionStatsTable.numDisagrees,
            numPasses: opinionGroupOpinionStatsTable.numPasses,
        })
        .from(opinionGroupOpinionStatsTable)
        .innerJoin(
            opinionGroupTable,
            eq(opinionGroupTable.id, opinionGroupOpinionStatsTable.groupId),
        )
        .where(
            and(
                inArray(
                    opinionGroupOpinionStatsTable.groupId,
                    groups.map((group) => group.id),
                ),
                inArray(
                    opinionGroupOpinionStatsTable.analysisSnapshotOpinionId,
                    uniqueAnalysisSnapshotOpinionIds,
                ),
            ),
        )
        .orderBy(asc(opinionGroupTable.key));
}

async function buildAnalysisOpinionsByIdFromRows({
    db,
    candidateId,
    conversationParticipantCount,
    groups,
    opinionRows,
    displayContentPreferences,
    viewerUserId,
}: {
    db: PostgresJsDatabase;
    candidateId: number;
    conversationParticipantCount: number;
    groups: SnapshotGroupMetadata[];
    opinionRows: SnapshotAnalysisOpinionRow[];
    displayContentPreferences: AnalysisOpinionDisplayContentPreferences;
    viewerUserId: string | undefined;
}): Promise<Map<number, AnalysisOpinionItem>> {
    const groupOpinionRows = await fetchGroupOpinionStatsRows({
        db,
        groups,
        analysisSnapshotOpinionIds: opinionRows.map(
            (opinionRow) => opinionRow.analysisSnapshotOpinionId,
        ),
    });

    const groupsById = new Map<number, SnapshotGroupMetadata>();
    for (const group of groups) {
        groupsById.set(group.id, group);
    }

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
    const opinionIdByAnalysisSnapshotOpinionId = new Map<number, number>();
    for (const row of opinionRows) {
        authorIdByOpinionId.set(row.opinionId, row.authorId);
        opinionIdByAnalysisSnapshotOpinionId.set(
            row.analysisSnapshotOpinionId,
            row.opinionId,
        );
    }

    const clustersStatsByOpinionId = new Map<number, ClusterStats[]>();
    for (const row of groupOpinionRows) {
        const group = groupsById.get(row.groupId);
        const opinionId = opinionIdByAnalysisSnapshotOpinionId.get(
            row.analysisSnapshotOpinionId,
        );
        if (opinionId === undefined) {
            continue;
        }
        const authorId = authorIdByOpinionId.get(opinionId);
        if (group === undefined || authorId === undefined) {
            continue;
        }

        const clusterStats = clustersStatsByOpinionId.get(opinionId) ?? [];
        clusterStats.push({
            key: group.key,
            isAuthorInCluster: groupIdByAuthorId.get(authorId) === row.groupId,
            numUsers: group.numUsers,
            numAgrees: row.numAgrees,
            numDisagrees: row.numDisagrees,
            numPasses: row.numPasses,
        });
        clustersStatsByOpinionId.set(opinionId, clusterStats);
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

        const isHiddenModerated = row.moderationAction === "hide";
        const displayedOpinion = isHiddenModerated
            ? "[moderated]"
            : row.opinion;

        opinionsById.set(row.opinionId, {
            opinion: displayedOpinion,
            opinionSlugId: row.opinionSlugId,
            sourceLanguageCode: row.sourceLanguageCode,
            createdAt: row.createdAt,
            numParticipants: conversationParticipantCount,
            numDisagrees: row.numDisagrees,
            numAgrees: row.numAgrees,
            numPasses: row.numPasses,
            updatedAt: row.updatedAt,
            username: row.username,
            moderation: moderationProperties,
            isSeed: row.isSeed,
            displayContent: conversationContentService.toOpinionDisplayContent({
                content: buildLocalizedOpinionContent({
                    source: {
                        opinionContentId: row.opinionContentId,
                        contentPublicId: row.contentPublicId,
                        comment: displayedOpinion,
                        sourceLanguageCode: row.sourceLanguageCode,
                        sourceRawLanguageCode: row.sourceRawLanguageCode,
                        sourceLanguageProvider: row.sourceLanguageProvider,
                        sourceLanguageConfidence: row.sourceLanguageConfidence,
                    },
                    translation:
                        isHiddenModerated || row.translatedContent === null
                            ? undefined
                            : {
                                  translatedContent: row.translatedContent,
                                  sourceLanguageCode:
                                      row.translationSourceLanguageCode,
                              },
                    targetLanguageCode:
                        displayContentPreferences.targetLanguage,
                }),
                translationAllowed:
                    !isHiddenModerated &&
                    displayContentPreferences.translationAllowed &&
                    !isPersonalNonSeedOpinionByViewer({
                        opinionAuthorId: row.authorId,
                        viewerUserId,
                        isSeed: row.isSeed,
                    }),
                displayLanguage: displayContentPreferences.displayLanguage,
                spokenLanguages: displayContentPreferences.spokenLanguages,
            }),
            clustersStats: clustersStatsByOpinionId.get(row.opinionId) ?? [],
            groupAwareConsensusAgree: row.groupAwareConsensusAgree ?? 0,
            groupAwareConsensusDisagree: row.groupAwareConsensusDisagree ?? 0,
            divisiveScore: row.divisiveScore ?? 0,
        });
    }

    return opinionsById;
}

async function fetchRepresentativeOpinionRows({
    db,
    groups,
}: {
    db: PostgresJsDatabase;
    groups: SnapshotGroupMetadata[];
}): Promise<RepresentativeOpinionRow[]> {
    if (groups.length === 0) {
        return [];
    }

    const rows = await db
        .select({
            groupId: opinionGroupOpinionStatsTable.groupId,
            analysisSnapshotOpinionId:
                opinionGroupOpinionStatsTable.analysisSnapshotOpinionId,
            opinionId: analysisSnapshotOpinionTable.opinionId,
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
            eq(opinionGroupTable.id, opinionGroupOpinionStatsTable.groupId),
        )
        .where(
            and(
                inArray(
                    opinionGroupOpinionStatsTable.groupId,
                    groups.map((group) => group.id),
                ),
                isNotNull(
                    opinionGroupOpinionStatsTable.representativeAgreementType,
                ),
                isNotNull(
                    opinionGroupOpinionStatsTable.representativeProbabilityAgreement,
                ),
            ),
        )
        .orderBy(
            asc(opinionGroupTable.key),
            desc(
                opinionGroupOpinionStatsTable.representativeProbabilityAgreement,
            ),
        );

    const representativeRows: RepresentativeOpinionRow[] = [];
    for (const row of rows) {
        if (row.representativeProbabilityAgreement === null) {
            continue;
        }
        representativeRows.push({
            groupId: row.groupId,
            analysisSnapshotOpinionId: row.analysisSnapshotOpinionId,
            opinionId: row.opinionId,
            representativeProbabilityAgreement:
                row.representativeProbabilityAgreement,
        });
    }

    return representativeRows;
}

function buildRepresentativeOpinionIdsByGroupKey({
    groups,
    representativeRows,
    opinionsById,
}: {
    groups: SnapshotGroupMetadata[];
    representativeRows: RepresentativeOpinionRow[];
    opinionsById: Map<number, AnalysisOpinionItem>;
}): Map<PolisKey, number[]> {
    const groupsById = new Map<number, SnapshotGroupMetadata>();
    for (const group of groups) {
        groupsById.set(group.id, group);
    }

    const representativeRowsByGroupKey = new Map<
        PolisKey,
        { opinionId: number; probabilityAgreement: number }[]
    >();
    for (const row of representativeRows) {
        const group = groupsById.get(row.groupId);
        if (group === undefined || !opinionsById.has(row.opinionId)) {
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

    return representativeOpinionIdsByGroupKey;
}

async function fetchSelectedOpinionGroupCandidateById({
    db,
    conversationSlugId,
    conversationViewSnapshotId,
    candidateId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    conversationViewSnapshotId: number;
    candidateId: number;
}): Promise<SelectedAnalysisFrameCandidate | undefined> {
    const rows = await db
        .select({
            conversationId: conversationTable.id,
            viewSnapshotId: conversationViewSnapshotTable.id,
            surveyAggregateSnapshotId:
                conversationViewSnapshotTable.surveyAggregateSnapshotId,
            participantCount: conversationViewSnapshotTable.participantCount,
            snapshotId: conversationViewSnapshotTable.analysisSnapshotId,
            resultId: analysisSnapshotResultTable.id,
            candidateId: opinionGroupCandidateTable.id,
            groupCount: opinionGroupVariantTable.groupCount,
            aiLabelingEnabled: polisConversationConfigTable.aiLabelingEnabled,
            checkpointReasonId:
                conversationViewSnapshotCheckpointReasonTable.id,
        })
        .from(conversationTable)
        .innerJoin(
            polisConversationConfigTable,
            eq(polisConversationConfigTable.id, conversationTable.polisConfigId),
        )
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
        .leftJoin(
            conversationViewSnapshotCheckpointReasonTable,
            and(
                eq(
                    conversationViewSnapshotCheckpointReasonTable.conversationViewSnapshotId,
                    conversationViewSnapshotTable.id,
                ),
                eq(
                    conversationViewSnapshotCheckpointReasonTable.conversationId,
                    conversationTable.id,
                ),
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
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

    return {
        conversationId: row.conversationId,
        viewSnapshotId: row.viewSnapshotId,
        surveyAggregateSnapshotId: row.surveyAggregateSnapshotId,
        participantCount: row.participantCount,
        snapshotId: row.snapshotId,
        resultId: row.resultId,
        candidateId: row.candidateId,
        groupCount: row.groupCount,
        aiLabelingEnabled: row.aiLabelingEnabled,
        isCheckpointFrame: row.checkpointReasonId !== null,
    };
}

function createAnalysisFrameKey(
    candidate: AnalysisFrameKeySource,
): AnalysisFrameKey {
    return {
        conversationViewSnapshotId: candidate.viewSnapshotId,
        analysisSnapshotId: candidate.snapshotId,
        candidateId: candidate.candidateId,
    };
}

function createAnalysisFrameCounters(
    snapshot: NonNullable<AnalysisFrameManifest["conversationViewSnapshot"]>,
): NonNullable<AnalysisFrameManifest["counters"]> {
    return {
        opinionCount: snapshot.opinionCount,
        voteCount: snapshot.voteCount,
        participantCount: snapshot.participantCount,
        totalOpinionCount: snapshot.totalOpinionCount,
        totalVoteCount: snapshot.totalVoteCount,
        totalParticipantCount: snapshot.totalParticipantCount,
        moderatedOpinionCount: snapshot.moderatedOpinionCount,
        hiddenOpinionCount: snapshot.hiddenOpinionCount,
        isClosed: snapshot.isClosed,
    };
}

function isAnalysisFrameKeyEqual({
    left,
    right,
}: {
    left: AnalysisFrameKey;
    right: AnalysisFrameKey;
}): boolean {
    return (
        left.conversationViewSnapshotId === right.conversationViewSnapshotId &&
        left.analysisSnapshotId === right.analysisSnapshotId &&
        left.candidateId === right.candidateId
    );
}

function isAnalysisFrameManifestFreshEnough({
    manifest,
    freshnessOptions,
}: {
    manifest: AnalysisFrameManifest;
    freshnessOptions: AnalysisFreshnessOptions | null;
}): boolean {
    const minimumSnapshotId =
        freshnessOptions?.minimumConversationViewSnapshotId ?? null;
    if (
        minimumSnapshotId !== null &&
        (manifest.frameKey === undefined ||
            manifest.frameKey.conversationViewSnapshotId < minimumSnapshotId)
    ) {
        return false;
    }

    return true;
}

function isAnalysisFrameGroupLabelsFreshEnough({
    groupLabels,
    freshnessOptions,
}: {
    groupLabels: AnalysisFrameGroupLabels;
    freshnessOptions: AnalysisFreshnessOptions | null;
}): boolean {
    const expectedLocales = freshnessOptions?.expectedDescriptionLocales ?? [];
    if (expectedLocales.length === 0) {
        return true;
    }

    const displayedLocale = groupLabels.groupDescriptionDisplay.displayedLocale;
    if (displayedLocale === null) {
        return false;
    }

    return expectedLocales.every((locale) => {
        if (locale === "en") {
            return true;
        }
        return displayedLocale === locale;
    });
}

function createAnalysisFrameManifest({
    selection,
    hasVotedOnAllAvailableOpinions,
}: {
    selection: Awaited<ReturnType<typeof getOpinionGroupAnalysisSelection>>;
    hasVotedOnAllAvailableOpinions: boolean | undefined;
}): AnalysisFrameManifest {
    const frameKey =
        selection.candidate === undefined
            ? undefined
            : createAnalysisFrameKey(selection.candidate);
    const counters =
        selection.conversationViewSnapshot === undefined
            ? undefined
            : createAnalysisFrameCounters(selection.conversationViewSnapshot);

    return {
        frameKey,
        conversationViewSnapshot: selection.conversationViewSnapshot,
        counters,
        emptyReason: selection.emptyReason,
        analysisViewResolution: selection.viewState,
        aiLabelsExpected: selection.candidate?.aiLabelingEnabled === true,
        hasVotedOnAllAvailableOpinions,
    };
}

async function ensureAiDescriptionRequestForAnalysisFrameManifest({
    db,
    conversationSlugId,
    manifest,
    requestedLocale,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    manifest: AnalysisFrameManifest;
    requestedLocale: SupportedDisplayLanguageCodes;
}): Promise<void> {
    if (manifest.frameKey === undefined || !manifest.aiLabelsExpected) {
        return;
    }

    await ensureAiDescriptionLocaleRequestForConversationViewSnapshot({
        db,
        conversationSlugId,
        conversationViewSnapshotId:
            manifest.frameKey.conversationViewSnapshotId,
        candidateId: manifest.frameKey.candidateId,
        requestedLocale,
    });
}

export async function fetchAnalysisFrameManifestByConversationSlugId({
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
}): Promise<AnalysisFrameManifest> {
    const requestedLocale = getSupportedDisplayLanguage(displayLanguage);
    const manifest = await fetchAnalysisFrameManifestByConversationSlugIdFromDb(
        {
            db,
            conversationSlugId,
            personalizationUserId,
            displayLanguage,
            analysisView,
            checkpointViewSnapshotId,
        },
    );

    await ensureAiDescriptionRequestForAnalysisFrameManifest({
        db: getPrimaryDb(db),
        conversationSlugId,
        manifest,
        requestedLocale,
    });

    if (
        isAnalysisFrameManifestFreshEnough({ manifest, freshnessOptions }) ||
        !shouldTryPrimaryFallback({ db, freshnessOptions })
    ) {
        return manifest;
    }

    log.info(
        `[Analysis] Falling back to primary for frame manifest conversationSlugId=${conversationSlugId} ` +
            `minimumSnapshotId=${String(freshnessOptions?.minimumConversationViewSnapshotId)}`,
    );
    const primaryManifest =
        await fetchAnalysisFrameManifestByConversationSlugIdFromDb({
            db: getPrimaryDb(db),
            conversationSlugId,
            personalizationUserId,
            displayLanguage,
            analysisView,
            checkpointViewSnapshotId,
        });
    await ensureAiDescriptionRequestForAnalysisFrameManifest({
        db: getPrimaryDb(db),
        conversationSlugId,
        manifest: primaryManifest,
        requestedLocale,
    });
    if (
        isAnalysisFrameManifestFreshEnough({
            manifest: primaryManifest,
            freshnessOptions,
        })
    ) {
        return primaryManifest;
    }
    return manifest;
}

async function fetchAnalysisFrameManifestByConversationSlugIdFromDb({
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
}): Promise<AnalysisFrameManifest> {
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

    return createAnalysisFrameManifest({
        selection,
        hasVotedOnAllAvailableOpinions,
    });
}

async function fetchSelectedFrameCandidateByKey({
    db,
    conversationSlugId,
    frameKey,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
}): Promise<SelectedAnalysisFrameCandidate | undefined> {
    const selectedCandidate = await fetchSelectedOpinionGroupCandidateById({
        db,
        conversationSlugId,
        conversationViewSnapshotId: frameKey.conversationViewSnapshotId,
        candidateId: frameKey.candidateId,
    });
    if (selectedCandidate === undefined) {
        return undefined;
    }

    if (
        !isAnalysisFrameKeyEqual({
            left: createAnalysisFrameKey(selectedCandidate),
            right: frameKey,
        })
    ) {
        return undefined;
    }

    return selectedCandidate;
}

function buildSnapshotAnalysisFrameGroups({
    groups,
    opinionsById,
    representativeOpinionIdsByGroupKey,
}: {
    groups: SnapshotGroupMetadata[];
    opinionsById: Map<number, AnalysisOpinionItem>;
    representativeOpinionIdsByGroupKey: Map<PolisKey, number[]>;
}): AnalysisFrameGroups["clusters"] {
    const clusters: AnalysisFrameGroups["clusters"] = {};

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

        clusters[group.key] = {
            key: group.key,
            numUsers: group.numUsers,
            isUserInCluster: group.isUserInCluster,
            representative,
        };
    }

    return clusters;
}

export async function fetchAnalysisFrameGroupsByFrameKey({
    db,
    conversationSlugId,
    frameKey,
    personalizationUserId,
    resolveDisplayContentPreferences,
    freshnessOptions,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
    personalizationUserId?: string;
    resolveDisplayContentPreferences: ResolveOpinionDisplayContentPreferences;
    freshnessOptions: AnalysisFreshnessOptions | null;
}): Promise<AnalysisFrameGroups> {
    const displayContentPreferences = await resolveDisplayContentPreferences({
        db,
    });
    const groups = await fetchAnalysisFrameGroupsByFrameKeyFromDb({
        db,
        conversationSlugId,
        frameKey,
        personalizationUserId,
        displayContentPreferences,
    });
    if (groups !== undefined) {
        return groups;
    }

    if (shouldTryPrimaryFallback({ db, freshnessOptions })) {
        const primaryDb = getPrimaryDb(db);
        const primaryDisplayContentPreferences =
            await resolveDisplayContentPreferences({ db: primaryDb });
        const primaryGroups = await fetchAnalysisFrameGroupsByFrameKeyFromDb({
            db: primaryDb,
            conversationSlugId,
            frameKey,
            personalizationUserId,
            displayContentPreferences: primaryDisplayContentPreferences,
        });
        if (primaryGroups !== undefined) {
            return primaryGroups;
        }
    }

    throw httpErrors.notFound("Analysis frame groups are not available.");
}

async function fetchAnalysisFrameGroupsByFrameKeyFromDb({
    db,
    conversationSlugId,
    frameKey,
    personalizationUserId,
    displayContentPreferences,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
    personalizationUserId?: string;
    displayContentPreferences: AnalysisOpinionDisplayContentPreferences;
}): Promise<AnalysisFrameGroups | undefined> {
    const selectedCandidate = await fetchSelectedFrameCandidateByKey({
        db,
        conversationSlugId,
        frameKey,
    });
    if (selectedCandidate === undefined) {
        return undefined;
    }

    const groups = await fetchSnapshotGroups({
        db,
        candidateId: selectedCandidate.candidateId,
        personalizationUserId,
    });
    const includeModeratedOpinions = selectedCandidate.isCheckpointFrame;
    const representativeRows = await fetchRepresentativeOpinionRows({
        db,
        groups,
    });
    const opinionRows = await fetchAnalysisOpinionRowsByIds({
        db,
        candidateId: selectedCandidate.candidateId,
        snapshotId: selectedCandidate.snapshotId,
        analysisSnapshotOpinionIds: representativeRows.map(
            (row) => row.analysisSnapshotOpinionId,
        ),
        personalizationUserId,
        includeModeratedOpinions,
        displayContentPreferences,
    });
    const opinionsById = await buildAnalysisOpinionsByIdFromRows({
        db,
        candidateId: selectedCandidate.candidateId,
        conversationParticipantCount: selectedCandidate.participantCount,
        groups,
        opinionRows,
        displayContentPreferences,
        viewerUserId: personalizationUserId,
    });
    const representativeOpinionIdsByGroupKey =
        buildRepresentativeOpinionIdsByGroupKey({
            groups,
            representativeRows,
            opinionsById,
        });

    return {
        frameKey,
        clusters: buildSnapshotAnalysisFrameGroups({
            groups,
            opinionsById,
            representativeOpinionIdsByGroupKey,
        }),
    };
}

function getUniqueDescriptionIds(
    groups: SnapshotGroupMetadata[],
): number[] | undefined {
    const descriptionIds: number[] = [];
    for (const group of groups) {
        if (group.systemDescriptionId === null) {
            return undefined;
        }
        descriptionIds.push(group.systemDescriptionId);
    }

    return Array.from(new Set(descriptionIds));
}

function buildCompleteGroupLabels({
    groups,
    descriptionById,
}: {
    groups: SnapshotGroupMetadata[];
    descriptionById: Map<number, { label: string; summary: string }>;
}): AnalysisFrameGroupLabels["labels"] | undefined {
    const labels: AnalysisFrameGroupLabels["labels"] = {};

    for (const group of groups) {
        if (group.systemDescriptionId === null) {
            return undefined;
        }

        const description = descriptionById.get(group.systemDescriptionId);
        if (description === undefined) {
            return undefined;
        }

        labels[group.key] = {
            key: group.key,
            aiLabel: description.label,
            aiSummary: description.summary,
        };
    }

    return labels;
}

async function fetchEnglishGroupLabels({
    db,
    groups,
}: {
    db: PostgresJsDatabase;
    groups: SnapshotGroupMetadata[];
}): Promise<AnalysisFrameGroupLabels["labels"] | undefined> {
    const descriptionIds = getUniqueDescriptionIds(groups);
    if (descriptionIds === undefined || descriptionIds.length === 0) {
        return undefined;
    }

    const descriptionRows = await db
        .select({
            id: opinionGroupDescriptionTable.id,
            label: opinionGroupDescriptionTable.label,
            summary: opinionGroupDescriptionTable.summary,
        })
        .from(opinionGroupDescriptionTable)
        .where(inArray(opinionGroupDescriptionTable.id, descriptionIds));
    return buildCompleteGroupLabels({
        groups,
        descriptionById: new Map(
            descriptionRows.map((row) => [
                row.id,
                { label: row.label, summary: row.summary },
            ]),
        ),
    });
}

async function fetchTranslatedGroupLabels({
    db,
    groups,
    requestedLocale,
}: {
    db: PostgresJsDatabase;
    groups: SnapshotGroupMetadata[];
    requestedLocale: SupportedDisplayLanguageCodes;
}): Promise<AnalysisFrameGroupLabels["labels"] | undefined> {
    const descriptionIds = getUniqueDescriptionIds(groups);
    if (descriptionIds === undefined || descriptionIds.length === 0) {
        return undefined;
    }

    const translationRows = await db
        .select({
            descriptionId:
                opinionGroupDescriptionTranslationTable.descriptionId,
            label: opinionGroupDescriptionTranslationTable.label,
            summary: opinionGroupDescriptionTranslationTable.summary,
        })
        .from(opinionGroupDescriptionTranslationTable)
        .where(
            and(
                inArray(
                    opinionGroupDescriptionTranslationTable.descriptionId,
                    descriptionIds,
                ),
                eq(
                    opinionGroupDescriptionTranslationTable.locale,
                    requestedLocale,
                ),
            ),
        );
    return buildCompleteGroupLabels({
        groups,
        descriptionById: new Map(
            translationRows.map((row) => [
                row.descriptionId,
                { label: row.label, summary: row.summary },
            ]),
        ),
    });
}

async function fetchAnalysisFrameGroupLabelsByFrameKeyFromDb({
    db,
    conversationSlugId,
    frameKey,
    displayLanguage,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
    displayLanguage: string;
}): Promise<AnalysisFrameGroupLabels | undefined> {
    const requestedLocale = getSupportedDisplayLanguage(displayLanguage);
    const selectedCandidate = await fetchSelectedFrameCandidateByKey({
        db,
        conversationSlugId,
        frameKey,
    });
    if (selectedCandidate === undefined) {
        return undefined;
    }

    if (!selectedCandidate.aiLabelingEnabled) {
        return {
            frameKey,
            groupDescriptionDisplay: {
                displayedLocale: null,
            },
            labels: {},
        };
    }

    const groups = await fetchSnapshotGroups({
        db,
        candidateId: selectedCandidate.candidateId,
    });
    const requestedLabels =
        requestedLocale === "en"
            ? await fetchEnglishGroupLabels({ db, groups })
            : await fetchTranslatedGroupLabels({
                  db,
                  groups,
                  requestedLocale,
              });
    if (requestedLabels !== undefined) {
        return {
            frameKey,
            groupDescriptionDisplay: {
                displayedLocale: requestedLocale,
            },
            labels: requestedLabels,
        };
    }

    const englishLabels = await fetchEnglishGroupLabels({ db, groups });
    if (englishLabels !== undefined) {
        return {
            frameKey,
            groupDescriptionDisplay: {
                displayedLocale: "en",
            },
            labels: englishLabels,
        };
    }

    return {
        frameKey,
        groupDescriptionDisplay: {
            displayedLocale: null,
        },
        labels: {},
    };
}

export async function fetchAnalysisFrameGroupLabelsByFrameKey({
    db,
    conversationSlugId,
    frameKey,
    displayLanguage = "en",
    freshnessOptions,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
    displayLanguage?: string;
    freshnessOptions: AnalysisFreshnessOptions | null;
}): Promise<AnalysisFrameGroupLabels> {
    const requestedLocale = getSupportedDisplayLanguage(displayLanguage);
    await ensureAiDescriptionLocaleRequestForConversationViewSnapshot({
        db: getPrimaryDb(db),
        conversationSlugId,
        conversationViewSnapshotId: frameKey.conversationViewSnapshotId,
        candidateId: frameKey.candidateId,
        requestedLocale,
    });

    const groupLabels = await fetchAnalysisFrameGroupLabelsByFrameKeyFromDb({
        db,
        conversationSlugId,
        frameKey,
        displayLanguage,
    });
    if (
        groupLabels !== undefined &&
        isAnalysisFrameGroupLabelsFreshEnough({ groupLabels, freshnessOptions })
    ) {
        return groupLabels;
    }

    if (shouldTryPrimaryFallback({ db, freshnessOptions })) {
        const primaryGroupLabels =
            await fetchAnalysisFrameGroupLabelsByFrameKeyFromDb({
                db: getPrimaryDb(db),
                conversationSlugId,
                frameKey,
                displayLanguage,
            });
        if (primaryGroupLabels !== undefined) {
            return primaryGroupLabels;
        }
    }

    if (groupLabels !== undefined) {
        return groupLabels;
    }

    throw httpErrors.notFound("Analysis frame group labels are not available.");
}

async function fetchAnalysisFrameOpinionListByFrameKeyFromDb({
    db,
    conversationSlugId,
    frameKey,
    personalizationUserId,
    kind,
    displayContentPreferences,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
    personalizationUserId?: string;
    kind: AnalysisFrameOpinionListKind;
    displayContentPreferences: AnalysisOpinionDisplayContentPreferences;
}): Promise<AnalysisFrameOpinionList | undefined> {
    const selectedCandidate = await fetchSelectedFrameCandidateByKey({
        db,
        conversationSlugId,
        frameKey,
    });
    if (selectedCandidate === undefined) {
        return undefined;
    }

    const groups = await fetchSnapshotGroups({
        db,
        candidateId: selectedCandidate.candidateId,
    });
    const includeModeratedOpinions = selectedCandidate.isCheckpointFrame;
    const opinionRows = await fetchAnalysisOpinionRowsForList({
        db,
        candidateId: selectedCandidate.candidateId,
        snapshotId: selectedCandidate.snapshotId,
        conversationParticipantCount: selectedCandidate.participantCount,
        personalizationUserId,
        includeModeratedOpinions,
        kind,
        displayContentPreferences,
    });
    const opinionsById = await buildAnalysisOpinionsByIdFromRows({
        db,
        candidateId: selectedCandidate.candidateId,
        conversationParticipantCount: selectedCandidate.participantCount,
        groups,
        opinionRows,
        displayContentPreferences,
        viewerUserId: personalizationUserId,
    });
    const items: AnalysisOpinionItem[] = [];
    for (const row of opinionRows) {
        const opinion = opinionsById.get(row.opinionId);
        if (opinion !== undefined) {
            items.push(opinion);
        }
    }

    return {
        frameKey,
        kind,
        items,
    };
}

export async function fetchAnalysisFrameOpinionListByFrameKey({
    db,
    conversationSlugId,
    frameKey,
    personalizationUserId,
    kind,
    resolveDisplayContentPreferences,
    freshnessOptions,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
    personalizationUserId?: string;
    kind: AnalysisFrameOpinionListKind;
    resolveDisplayContentPreferences: ResolveOpinionDisplayContentPreferences;
    freshnessOptions: AnalysisFreshnessOptions | null;
}): Promise<AnalysisFrameOpinionList> {
    const displayContentPreferences = await resolveDisplayContentPreferences({
        db,
    });
    const opinionList = await fetchAnalysisFrameOpinionListByFrameKeyFromDb({
        db,
        conversationSlugId,
        frameKey,
        personalizationUserId,
        kind,
        displayContentPreferences,
    });
    if (opinionList !== undefined) {
        return opinionList;
    }

    if (shouldTryPrimaryFallback({ db, freshnessOptions })) {
        const primaryDb = getPrimaryDb(db);
        const primaryDisplayContentPreferences =
            await resolveDisplayContentPreferences({ db: primaryDb });
        const primaryOpinionList =
            await fetchAnalysisFrameOpinionListByFrameKeyFromDb({
                db: primaryDb,
                conversationSlugId,
                frameKey,
                personalizationUserId,
                kind,
                displayContentPreferences: primaryDisplayContentPreferences,
            });
        if (primaryOpinionList !== undefined) {
            return primaryOpinionList;
        }
    }

    throw httpErrors.notFound("Analysis frame opinion list is not available.");
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
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
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
                isNull(userMutePreferenceTable.deletedAt),
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
        .where(
            and(
                eq(conversationTable.slugId, postSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
            ),
        );
    if (postTableResponse.length != 1) {
        throw httpErrors.notFound(
            "Failed to locate post slug ID: " + postSlugId,
        );
    }

    const postId = postTableResponse[0].id;
    return postId;
}

interface PostNewOpinionBaseProps {
    db: PostgresJsDatabase;
    tx?: PostgresJsDatabase;
    commentBody: string;
    opinionPlainText: string;
    conversationSlugId: string;
    didWrite: string;
    userAgent: string;
    now: Date;
    isSeed: boolean;
    googleCloudCredentials?: GoogleCloudCredentials;
    useGoogleLanguageDetection?: boolean;
    voteBuffer?: VoteBuffer;
    realtimeSSEManager?: RealtimeSSEManager;
    onCreatedOpinionSource?: (source: OpinionContentSource) => void;
}

interface PostNewOpinionWithConversationMetadataProps {
    currentDisplayLanguage?: never;
    conversationMetadata: {
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

interface PostNewOpinionWithParticipationCheckProps {
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
    conversationMetadata?: undefined;
}

type PostNewOpinionProps = PostNewOpinionBaseProps &
    (
        | PostNewOpinionWithConversationMetadataProps
        | PostNewOpinionWithParticipationCheckProps
    );

export async function postNewOpinion(
    props: PostNewOpinionProps,
): Promise<CreateCommentResponse> {
    const {
        db,
        tx,
        opinionPlainText,
        conversationSlugId,
        didWrite,
        userAgent,
        now,
        isSeed,
        googleCloudCredentials,
        useGoogleLanguageDetection,
        voteBuffer,
        realtimeSSEManager,
        onCreatedOpinionSource,
    } = props;
    let { commentBody } = props;
    interface ParticipationContext {
        success: true;
        conversationId: number;
        conversationContentId: number;
        participantId: string;
    }

    let contentPlainText: string;
    try {
        const normalizationResult = normalizeUserRichTextInput({
            html: commentBody,
            plainText: opinionPlainText,
            validationMode: "opinion",
            logLabel: "[OpinionPlainText] Frontend/backend plain text mismatch",
        });
        if (!normalizationResult.success) {
            return normalizationResult;
        }
        commentBody = normalizationResult.content.html;
        contentPlainText = normalizationResult.content.plainText;
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
        props.conversationMetadata !== undefined
            ? {
                  success: true,
                  conversationId: props.conversationMetadata.conversationId,
                  conversationContentId:
                      props.conversationMetadata.conversationContentId,
                  participantId: props.conversationMetadata.conversationAuthorId,
              }
            : await (async () => {
                  const participationCheck =
                      await checkConversationParticipation({
                          db,
                          conversationSlugId,
                          didWrite,
                          userAgent,
                          now,
                          currentDisplayLanguage:
                              props.currentDisplayLanguage,
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

    const resolvedUseGoogleLanguageDetection =
        useGoogleLanguageDetection ??
        (
            await getConversationMultilingualSetting({
                db,
                conversationId: participationContext.conversationId,
            })
        ).dynamicTranslationEnabled;
    const languageMetadata = await resolveContentLanguageMetadata({
        text: contentPlainText,
        googleCloudCredentials,
        useGoogleLanguageDetection: resolvedUseGoogleLanguageDetection,
    });

    const opinionSlugId = generateRandomSlugId();

    const persistNewOpinion = async (
        transactionDb: PostgresJsDatabase,
    ): Promise<{
        opinionId: number;
        opinionContentId: number;
        opinionContentPublicId: string;
        opinionItem: OpinionItem;
        displayedOpinionItem: DisplayedOpinionItem;
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
                contentPlainText,
                ...contentLanguageMetadataUpdateValues(languageMetadata),
            })
            .returning({
                commentContentTableId: opinionContentTable.id,
                publicId: opinionContentTable.publicId,
            });

        const commentContentTableId =
            commentContentTableResponse[0].commentContentTableId;
        const opinionContentPublicId = commentContentTableResponse[0].publicId;

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
            props.conversationMetadata?.conversationAuthorUsername ??
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
            sourceLanguageCode: languageMetadata.sourceLanguageCode,
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
        const displayedOpinionItem: DisplayedOpinionItem = {
            ...opinionItem,
            displayContent: {
                sourceVersion: opinionContentPublicId,
                status: "available",
                mode: "original",
                content: { content: commentBody },
                translationControl: null,
            },
        };

        return {
            opinionId,
            opinionContentId: commentContentTableId,
            opinionContentPublicId,
            opinionItem,
            displayedOpinionItem,
        };
    };

    const {
        opinionId,
        opinionContentId,
        opinionContentPublicId,
        opinionItem,
        displayedOpinionItem,
    } =
        tx !== undefined
            ? await persistNewOpinion(tx)
            : await db.transaction(async (transactionDb) => {
                  return await persistNewOpinion(transactionDb);
              });

    onCreatedOpinionSource?.({
        conversationId: participationContext.conversationId,
        conversationSlugId,
        opinionSlugId,
        contentId: opinionContentId,
        publicId: opinionContentPublicId,
        content: commentBody,
        sourceLanguageCode: languageMetadata.sourceLanguageCode,
        sourceRawLanguageCode: languageMetadata.sourceRawLanguageCode,
        sourceLanguageProvider: languageMetadata.sourceLanguageProvider,
        sourceLanguageConfidence: languageMetadata.sourceLanguageConfidence,
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
                conversationSlugId,
                opinionSlugId,
                opinionContent: commentBody,
                username: opinionItem.username,
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
        displayedOpinionItem,
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
            .where(
                and(
                    eq(opinionModerationTable.opinionId, opinion.opinionId),
                    isNull(opinionModerationTable.deletedAt),
                ),
            )
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
            emitCommentStatsRealtimeEvent: true,
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
                    const contentPlainText = htmlToCountedText(commentBody);
                    return {
                        opinionId: opinionId,
                        conversationContentId: conversationContentId,
                        content: commentBody,
                        contentPlainText,
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
