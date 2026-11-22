import { generateRandomSlugId } from "@/crypto.js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    analysisSnapshotResultTable,
    analysisSnapshotTable,
    analysisSnapshotOpinionTable,
    contentTranslationWorkTable,
    opinionContentTable,
    opinionGroupDescriptionTable,
    opinionGroupDescriptionTranslationTable,
    opinionGroupCandidateAssessmentTable,
    opinionGroupCandidateTable,
    opinionGroupCandidateDescriptionLocaleRequestTable,
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
    polisAnalysisCloseGenerationTable,
    polisAnalysisCloseTable,
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
    AnalysisFrameContent,
    AnalysisFrameGroups,
    AnalysisFrameKey,
    AnalysisFrameManifest,
    AnalysisFrameOpinionList,
    AnalysisFrameOpinionListKind,
    CreateCommentResponse,
    FetchCommentStatsResponse,
    GetOpinionBySlugIdListResponse,
    OpinionPageCursor,
    OpinionListFilter,
} from "@/shared/types/dto.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    desc,
    asc,
    eq,
    exists,
    sql,
    and,
    isNull,
    isNotNull,
    ne,
    or,
    SQL,
    inArray,
    notInArray,
    count,
    lt,
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
    AnalysisView,
} from "@/shared/types/zod.js";
import { httpErrors } from "@fastify/sensible";
import { useCommonComment } from "./common.js";
import { log } from "@/app.js";
import { logApiError } from "@/logging/privacy.js";
import { createCommentModerationPropertyObject } from "./moderation.js";
import {
    prepareParticipantStatement,
    withParticipantStatementAdmission,
} from "./participantStatementAdmission.js";
import { fetchCurrentConversationTypeSettings } from "./conversationTypeConfig.js";
import type { VoteBuffer } from "./voteBuffer.js";
import { queueOpinionRedactedEvent } from "./realtimeEventOutbox.js";
import { currentOpinionSourceCondition } from "@/shared-backend/opinionEligibility.js";
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
    getOpinionGroupAnalysisSelection,
    getSelectedOpinionGroupCandidate,
} from "./opinionGroupAnalysis.js";
import {
    htmlToCountedTextWithWarning,
    normalizeUserRichTextInput,
    type NormalizedUserRichText,
} from "./richText.js";
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
    type ContentLanguageMetadata,
} from "./contentLanguageMetadata.js";
import { getConversationMultilingualSetting } from "./conversationMultilingual.js";
import {
    buildTranslationMetadata,
    type MissingContentTranslationStatus,
    toMissingContentTranslationStatus,
} from "./contentTranslationContent.js";
import type { OpinionContentSource } from "./contentTranslation.js";
import { translationSourceMatchesCurrentSource } from "@/shared-backend/translate.js";
import * as conversationContentService from "./conversationContent.js";
import { getProjectLanguageSettings } from "./projectAccess.js";
import { getOpinionManagementCapabilities } from "./opinionPermissions.js";
import {
    getConversationOverrideTranslationTargetLanguagePolicy,
    getProjectTranslationTargetLanguagePolicy,
    isConfiguredTranslationTargetLanguage,
    sourceLanguageToDisplayLanguage,
    type TranslationTargetLanguagePolicy,
} from "./translationLanguageSetting.js";

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
type AnalysisOpinionRedactionReason = Extract<
    AnalysisOpinionItem["content"],
    { status: "redacted" }
>["reason"];

type ResolveOpinionDisplayContentPreferences = ({
    db,
}: {
    db: PostgresJsDatabase;
}) => Promise<AnalysisOpinionDisplayContentPreferences>;

export interface OpinionDisplayContentViewerPreferences {
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
    missingTranslationStatus,
}: {
    source: OpinionContentRow;
    translation: OpinionContentTranslationRow | undefined;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    missingTranslationStatus: MissingContentTranslationStatus;
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
            status: missingTranslationStatus,
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
    opinionAuthorId: string | null;
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
    filterTarget: OpinionListFilter | "unanswered_discover" | "unanswered_new";
    limit: number;
    excludedOpinionSlugIds: string[];
    cursor: OpinionPageCursor | null;
    displayContentPreferences: OpinionDisplayContentPreferences;
}

interface FetchOpinionsByPostIdProps extends Omit<
    FetchOpinionsProps,
    "postSlugId"
> {
    postId: number;
}

function getUnansweredOpinionFilter({
    personalizationUserId,
    excludedOpinionSlugIds,
}: {
    personalizationUserId: string | undefined;
    excludedOpinionSlugIds: string[];
}): SQL | undefined {
    return and(
        isNull(opinionModerationTable.id),
        personalizationUserId === undefined ? undefined : isNull(voteTable.id),
        excludedOpinionSlugIds.length === 0
            ? undefined
            : notInArray(opinionTable.slugId, excludedOpinionSlugIds),
    );
}

function getPersonalOpinionFilter({
    filter,
    userId,
}: {
    filter: FetchOpinionsProps["filterTarget"];
    userId: string | undefined;
}): SQL | undefined {
    if (filter !== "my_statements" && filter !== "my_votes") return undefined;
    if (userId === undefined)
        throw httpErrors.unauthorized(
            "Authentication required for personal statement filters",
        );
    return filter === "my_statements"
        ? eq(opinionTable.authorId, userId)
        : isNotNull(voteTable.currentContentId);
}

export async function fetchOpinionsByPostId({
    db,
    postId,
    personalizationUserId,
    filterTarget,
    limit,
    excludedOpinionSlugIds,
    cursor,
    displayContentPreferences,
}: FetchOpinionsByPostIdProps): Promise<{
    items: DisplayedOpinionItemPerSlugId;
    cursorsByOpinionSlugId: Map<string, OpinionPageCursor>;
}> {
    const personalOpinionFilter = getPersonalOpinionFilter({
        filter: filterTarget,
        userId: personalizationUserId,
    });

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
        personalOpinionFilter,
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
        case "my_statements": {
            whereClause = and(
                whereClause,
                or(
                    isNull(opinionModerationTable.id),
                    ne(opinionModerationTable.moderationAction, "hide"),
                ),
            );
            break;
        }
        case "unanswered_new": {
            whereClause = and(
                whereClause,
                getUnansweredOpinionFilter({
                    personalizationUserId,
                    excludedOpinionSlugIds,
                }),
            );
            shouldJoinVoteTable = personalizationUserId !== undefined;
            break;
        }
        case "unanswered_discover":
        case "discover": {
            whereClause = and(
                whereClause,
                filterTarget === "discover"
                    ? isNull(opinionModerationTable.id)
                    : getUnansweredOpinionFilter({
                          personalizationUserId,
                          excludedOpinionSlugIds,
                      }),
            );
            if (cursor?.kind === "discover") {
                if (cursor.routingSnapshotId !== null) {
                    const snapshots = await db
                        .select({ id: analysisSnapshotTable.id })
                        .from(analysisSnapshotTable)
                        .where(
                            and(
                                eq(
                                    analysisSnapshotTable.id,
                                    cursor.routingSnapshotId,
                                ),
                                eq(
                                    analysisSnapshotTable.conversationId,
                                    postId,
                                ),
                            ),
                        )
                        .limit(1);
                    if (snapshots.length === 0) {
                        throw httpErrors.badRequest(
                            "Opinion page cursor references another conversation",
                        );
                    }
                }
                discoverAnalysisSnapshotId =
                    cursor.routingSnapshotId ?? undefined;
            } else {
                const selectedCandidate =
                    await getSelectedOpinionGroupCandidate({
                        db,
                        conversationId: postId,
                        displayLanguage: "en",
                    });
                discoverAnalysisSnapshotId = selectedCandidate?.snapshotId;
            }

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
                    ...(filterTarget === "discover"
                        ? [asc(isNotNull(voteTable.id))]
                        : []),
                    ...discoverOrderClause,
                ];
            } else {
                orderByClause = discoverOrderClause;
            }
            break;
        }
        case "my_votes": {
            shouldJoinVoteTable = true;
            // Show only visible voted opinions. Hidden opinions are moderator-only.
            // Filter by currentContentId to exclude cancelled votes (currentContentId = NULL when cancelled)
            whereClause = and(
                whereClause,
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
    if (cursor !== null) {
        if (
            (filterTarget === "discover" && cursor.kind !== "discover") ||
            (filterTarget === "my_votes" && cursor.kind !== "votes") ||
            (filterTarget !== "discover" &&
                filterTarget !== "my_votes" &&
                cursor.kind !== "created")
        ) {
            throw httpErrors.badRequest(
                "Opinion page cursor does not match its filter",
            );
        }
        if (cursor.kind === "discover" || cursor.kind === "created") {
            const olderOpinion = or(
                lt(opinionTable.createdAt, cursor.createdAt),
                and(
                    eq(opinionTable.createdAt, cursor.createdAt),
                    lt(opinionTable.id, cursor.opinionId),
                ),
            );
            if (cursor.kind === "created") {
                whereClause = and(whereClause, olderOpinion);
            } else {
                const voteOrder = shouldJoinVoteTable
                    ? sql<number>`case when ${voteTable.id} is null then 0 else 1 end`
                    : sql<number>`0`;
                const priority =
                    discoverAnalysisSnapshotId === undefined
                        ? sql<number>`0`
                        : sql<number>`coalesce(${routingAnalysisSnapshotOpinionTable.routingPriority}, '-Infinity'::real)`;
                const cursorPriority =
                    discoverAnalysisSnapshotId === undefined
                        ? sql<number>`0`
                        : sql<number>`coalesce(${cursor.routingPriority}, '-Infinity'::real)`;
                const belowPriority = or(
                    sql`${priority} < ${cursorPriority}`,
                    and(sql`${priority} = ${cursorPriority}`, olderOpinion),
                );
                const cursorVoteOrder = cursor.wasVoted ? 1 : 0;
                whereClause = and(
                    whereClause,
                    ne(opinionTable.id, cursor.opinionId),
                    or(
                        sql`${voteOrder} > ${cursorVoteOrder}`,
                        and(
                            sql`${voteOrder} = ${cursorVoteOrder}`,
                            belowPriority,
                        ),
                    ),
                );
            }
        } else {
            whereClause = and(
                whereClause,
                or(
                    lt(voteTable.updatedAt, cursor.voteUpdatedAt),
                    and(
                        eq(voteTable.updatedAt, cursor.voteUpdatedAt),
                        lt(voteTable.id, cursor.voteId),
                    ),
                ),
            );
        }
    }
    // Build query with conditional vote table join
    let query = db
        .select({
            // comment payload
            commentSlugId: opinionTable.slugId,
            opinionId: opinionTable.id,
            wasVoted: shouldJoinVoteTable
                ? sql<boolean>`${voteTable.id} is not null`
                : sql<boolean>`false`,
            voteId: shouldJoinVoteTable
                ? voteTable.id
                : sql<number | null>`null`,
            voteUpdatedAt: shouldJoinVoteTable
                ? voteTable.updatedAt
                : sql<Date | null>`null`,
            routingPriority:
                discoverAnalysisSnapshotId === undefined
                    ? sql<number | null>`null`
                    : routingAnalysisSnapshotOpinionTable.routingPriority,
            opinionContentId: opinionContentTable.id,
            contentPublicId: opinionContentTable.publicId,
            isEdited: opinionContentTable.isEdited,
            createdAt: opinionTable.createdAt,
            updatedAt: opinionTable.updatedAt,
            comment: opinionContentTable.content,
            sourceLanguageCode: opinionContentTable.sourceLanguageCode,
            sourceRawLanguageCode: opinionContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: opinionContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                opinionContentTable.sourceLanguageConfidence,
            translatedContent: opinionContentTranslationTable.translatedContent,
            translationSourceLanguageCode:
                opinionContentTranslationTable.sourceLanguageCode,
            translationWorkStatus: contentTranslationWorkTable.status,
            authorId: opinionTable.authorId,
            numAgrees: countAnalysisSnapshotOpinionTable.numAgrees,
            numDisagrees: countAnalysisSnapshotOpinionTable.numDisagrees,
            numPasses: countAnalysisSnapshotOpinionTable.numPasses,
            username:
                sql<string>`CASE WHEN ${userTable.isDeleted} = false THEN ${userTable.username} ELSE '' END`.as(
                    "username",
                ),
            isSeed: opinionTable.isSeed,
            moderationAction: opinionModerationTable.moderationAction,
            moderationExplanation: opinionModerationTable.moderationExplanation,
            moderationReason: opinionModerationTable.moderationReason,
            moderationCreatedAt: opinionModerationTable.createdAt,
            moderationUpdatedAt: opinionModerationTable.updatedAt,
        })
        .from(opinionTable)
        .leftJoin(userTable, eq(userTable.id, opinionTable.authorId))
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
            contentTranslationWorkTable,
            and(
                eq(contentTranslationWorkTable.sourceKind, "opinion"),
                eq(
                    contentTranslationWorkTable.opinionContentId,
                    opinionContentTable.id,
                ),
                eq(
                    contentTranslationWorkTable.displayLanguageCode,
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
                isNotNull(voteTable.currentContentId),
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

    if (personalizationUserId !== undefined) {
        query = query.leftJoin(
            userMutePreferenceTable,
            and(
                eq(userMutePreferenceTable.sourceUserId, personalizationUserId),
                eq(userMutePreferenceTable.targetUserId, opinionTable.authorId),
                isNull(userMutePreferenceTable.deletedAt),
            ),
        );
        whereClause = and(whereClause, isNull(userMutePreferenceTable.id));
    }

    const results = await query
        .orderBy(...orderByClause)
        .where(and(whereClause, currentOpinionSourceCondition()))
        .limit(limit);

    const opinionItemMap: DisplayedOpinionItemPerSlugId = new Map<
        string,
        DisplayedOpinionItem
    >();
    const cursorsByOpinionSlugId = new Map<string, OpinionPageCursor>();
    const managementBySlugId = await getOpinionManagementCapabilities({
        db,
        opinionSlugIds: results.map((opinion) => opinion.commentSlugId),
        userId: personalizationUserId,
    });
    for (const opinionResponse of results) {
        let cursorForOpinion: OpinionPageCursor;
        if (filterTarget === "my_votes") {
            if (
                opinionResponse.voteId === null ||
                opinionResponse.voteUpdatedAt === null
            ) {
                throw new Error("An active vote has no vote cursor");
            }
            cursorForOpinion = {
                kind: "votes",
                opinionSlugId: opinionResponse.commentSlugId,
                voteId: opinionResponse.voteId,
                voteUpdatedAt: opinionResponse.voteUpdatedAt,
            };
        } else if (
            filterTarget === "discover" ||
            filterTarget === "unanswered_discover"
        ) {
            cursorForOpinion = {
                kind: "discover",
                opinionSlugId: opinionResponse.commentSlugId,
                opinionId: opinionResponse.opinionId,
                createdAt: opinionResponse.createdAt,
                wasVoted: opinionResponse.wasVoted,
                routingPriority: opinionResponse.routingPriority,
                routingSnapshotId: discoverAnalysisSnapshotId ?? null,
            };
        } else {
            cursorForOpinion = {
                kind: "created",
                opinionSlugId: opinionResponse.commentSlugId,
                opinionId: opinionResponse.opinionId,
                createdAt: opinionResponse.createdAt,
            };
        }
        cursorsByOpinionSlugId.set(
            opinionResponse.commentSlugId,
            cursorForOpinion,
        );
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
            isEdited: opinionResponse.isEdited,
            management: managementBySlugId.get(opinionResponse.commentSlugId),
            displayContent: conversationContentService.toOpinionDisplayContent({
                content: buildLocalizedOpinionContent({
                    source: {
                        opinionContentId: opinionResponse.opinionContentId,
                        contentPublicId: opinionResponse.contentPublicId,
                        comment: opinionResponse.comment,
                        sourceLanguageCode: opinionResponse.sourceLanguageCode,
                        sourceRawLanguageCode:
                            opinionResponse.sourceRawLanguageCode,
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
                    targetLanguageCode:
                        displayContentPreferences.targetLanguage,
                    missingTranslationStatus: toMissingContentTranslationStatus(
                        opinionResponse.translationWorkStatus ??
                            "not_requested",
                    ),
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
    }

    return {
        items: opinionItemMap,
        cursorsByOpinionSlugId,
    };
}

export async function fetchOpinionsByPostSlugId({
    db,
    postSlugId,
    personalizationUserId,
    filterTarget,
    limit,
    excludedOpinionSlugIds,
    cursor,
    displayContentPreferences,
}: FetchOpinionsProps): Promise<{
    items: DisplayedOpinionItemPerSlugId;
    cursorsByOpinionSlugId: Map<string, OpinionPageCursor>;
}> {
    const postId = await getPostIdFromPostSlugId(db, postSlugId);
    return await fetchOpinionsByPostId({
        db,
        postId,
        personalizationUserId,
        filterTarget,
        limit,
        excludedOpinionSlugIds,
        cursor,
        displayContentPreferences,
    });
}

export async function countUnansweredOpinions({
    db,
    conversationSlugId,
    personalizationUserId,
    excludedOpinionSlugIds,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    personalizationUserId: string | undefined;
    excludedOpinionSlugIds: string[];
}): Promise<number> {
    const result = await db
        .select({ remainingCount: count() })
        .from(opinionTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, opinionTable.conversationId),
        )
        .leftJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .leftJoin(
            opinionModerationTable,
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
        )
        .leftJoin(
            voteTable,
            personalizationUserId === undefined
                ? sql`false`
                : and(
                      eq(voteTable.opinionId, opinionTable.id),
                      eq(voteTable.authorId, personalizationUserId),
                      isNotNull(voteTable.currentContentId),
                  ),
        )
        .leftJoin(
            userMutePreferenceTable,
            personalizationUserId === undefined
                ? sql`false`
                : and(
                      eq(
                          userMutePreferenceTable.sourceUserId,
                          personalizationUserId,
                      ),
                      eq(
                          userMutePreferenceTable.targetUserId,
                          opinionTable.authorId,
                      ),
                      isNull(userMutePreferenceTable.deletedAt),
                  ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.conversationType, "polis"),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                isNotNull(opinionTable.currentContentId),
                currentOpinionSourceCondition(),
                isNull(userMutePreferenceTable.id),
                getUnansweredOpinionFilter({
                    personalizationUserId,
                    excludedOpinionSlugIds,
                }),
            ),
        );

    return result[0]?.remainingCount ?? 0;
}

export async function requirePolisConversation({
    db,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
}): Promise<void> {
    const rows = await db
        .select({ conversationType: conversationTable.conversationType })
        .from(conversationTable)
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
            ),
        )
        .limit(1);
    const conversation = rows.at(0);
    if (conversation === undefined) {
        throw httpErrors.notFound("Conversation not found");
    }
    if (conversation.conversationType !== "polis") {
        throw httpErrors.badRequest(
            "One-at-a-time voting requires a Polis conversation",
        );
    }
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
}: FetchOpinionsByOpinionSlugIdListProps): Promise<DisplayedOpinionItem[]> {
    const targets = await fetchOpinionTargetsBySlugIdList({
        db,
        opinionSlugIdList,
        displayContentViewerPreferences,
    });
    return targets.map((target) => target.opinion);
}

export async function fetchOpinionTargetsBySlugIdList({
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
            conversationSlugId: conversationTable.slugId,
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
            isEdited: opinionContentTable.isEdited,
            updatedAt: opinionTable.updatedAt,
            comment: opinionContentTable.content,
            sourceLanguageCode: opinionContentTable.sourceLanguageCode,
            sourceRawLanguageCode: opinionContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: opinionContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                opinionContentTable.sourceLanguageConfidence,
            translatedContent: opinionContentTranslationTable.translatedContent,
            translationSourceLanguageCode:
                opinionContentTranslationTable.sourceLanguageCode,
            translationWorkStatus: contentTranslationWorkTable.status,
            username:
                sql<string>`CASE WHEN ${userTable.isDeleted} = false THEN ${userTable.username} ELSE '' END`.as(
                    "username",
                ),
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
            contentTranslationWorkTable,
            and(
                eq(contentTranslationWorkTable.sourceKind, "opinion"),
                eq(
                    contentTranslationWorkTable.opinionContentId,
                    opinionContentTable.id,
                ),
                eq(
                    contentTranslationWorkTable.displayLanguageCode,
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
        .leftJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .orderBy(desc(opinionTable.createdAt))
        .where(
            and(
                inArray(opinionTable.slugId, opinionSlugIdList),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                currentOpinionSourceCondition(),
                or(
                    isNull(opinionModerationTable.id),
                    ne(opinionModerationTable.moderationAction, "hide"),
                ),
            ),
        );

    const targets: GetOpinionBySlugIdListResponse = [];
    const managementBySlugId = await getOpinionManagementCapabilities({
        db,
        opinionSlugIds: results.map((opinion) => opinion.commentSlugId),
        userId: displayContentViewerPreferences.viewerUserId,
    });
    const inheritedPolicyByProjectId = new Map<
        number,
        TranslationTargetLanguagePolicy
    >();
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
            targetLanguagePolicy =
                getConversationOverrideTranslationTargetLanguagePolicy({
                    multilingualSettings: {
                        dynamicTranslationEnabled:
                            commentResponse.dynamicTranslationEnabled,
                        additionalLanguageCodes:
                            commentResponse.configuredTargetLanguageCode ===
                            null
                                ? []
                                : [
                                      commentResponse.configuredTargetLanguageCode,
                                  ],
                    },
                    detectedTargetLanguageCode: sourceLanguageToDisplayLanguage(
                        {
                            sourceLanguageCode:
                                commentResponse.conversationSourceLanguageCode,
                        },
                    ),
                });
        }
        const translationAllowed =
            targetLanguagePolicy.dynamicTranslationEnabled &&
            isConfiguredTranslationTargetLanguage({
                policy: targetLanguagePolicy,
                targetLanguageCode:
                    displayContentViewerPreferences.displayLanguage,
            });

        const opinion: DisplayedOpinionItem = {
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
            isEdited: commentResponse.isEdited,
            management: managementBySlugId.get(commentResponse.commentSlugId),
            displayContent: conversationContentService.toOpinionDisplayContent({
                content: buildLocalizedOpinionContent({
                    source: {
                        opinionContentId: commentResponse.opinionContentId,
                        contentPublicId: commentResponse.contentPublicId,
                        comment: commentResponse.comment,
                        sourceLanguageCode: commentResponse.sourceLanguageCode,
                        sourceRawLanguageCode:
                            commentResponse.sourceRawLanguageCode,
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
                    missingTranslationStatus: toMissingContentTranslationStatus(
                        commentResponse.translationWorkStatus ??
                            "not_requested",
                    ),
                }),
                translationAllowed:
                    translationAllowed &&
                    !isPersonalNonSeedOpinionByViewer({
                        opinionAuthorId: commentResponse.authorId,
                        viewerUserId:
                            displayContentViewerPreferences.viewerUserId,
                        isSeed: commentResponse.isSeed,
                    }),
                displayLanguage:
                    displayContentViewerPreferences.displayLanguage,
                spokenLanguages:
                    displayContentViewerPreferences.spokenLanguages,
            }),
        };
        targets.push({
            opinion,
            conversationSlugId: commentResponse.conversationSlugId,
            isOwn:
                commentResponse.authorId ===
                displayContentViewerPreferences.viewerUserId,
        });
    }

    return targets;
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
    opinionContentId: number | null;
    contentPublicId: string | null;
    opinionSlugId: string;
    createdAt: Date;
    updatedAt: Date | null;
    opinion: string | null;
    isEdited: boolean | null;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
    translatedContent: string | null;
    translationSourceLanguageCode: SupportedSpokenLanguageCodes | null;
    translationWorkStatus:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | null;
    authorId: string | null;
    username: string | null;
    authorIsDeleted: boolean | null;
    isSeed: boolean;
    currentContentId: number | null;
    deletedAt: Date | null;
    accountHiddenAt: Date | null;
    accountHiddenContentRetained: boolean;
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
    participantCount: number;
    snapshotId: number;
    resultId: number;
    candidateId: number;
    groupCount: number;
    aiLabelingEnabled: boolean;
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
        updatedAt: opinionContentTable.createdAt,
        opinion: opinionContentTable.content,
        isEdited: opinionContentTable.isEdited,
        sourceLanguageCode: opinionContentTable.sourceLanguageCode,
        sourceRawLanguageCode: opinionContentTable.sourceRawLanguageCode,
        sourceLanguageProvider: opinionContentTable.sourceLanguageProvider,
        sourceLanguageConfidence: opinionContentTable.sourceLanguageConfidence,
        translatedContent: opinionContentTranslationTable.translatedContent,
        translationSourceLanguageCode:
            opinionContentTranslationTable.sourceLanguageCode,
        translationWorkStatus: contentTranslationWorkTable.status,
        authorId: opinionTable.authorId,
        username: userTable.username,
        authorIsDeleted: userTable.isDeleted,
        isSeed: opinionTable.isSeed,
        currentContentId: opinionTable.currentContentId,
        deletedAt: opinionTable.deletedAt,
        accountHiddenAt: opinionTable.accountHiddenAt,
        accountHiddenContentRetained: opinionTable.accountHiddenContentRetained,
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

function getAnalysisOpinionCurrentVisibilityFilter({
    frameMode,
}: {
    frameMode: AnalysisFrameKey["mode"];
}): SQL | undefined {
    // Checkpoint membership is frozen by analysis_snapshot_opinion. Live frames
    // additionally enforce current visibility so refresh latency cannot leak a
    // statement that was deleted or moderated after the snapshot was computed.
    return frameMode === "checkpoint"
        ? undefined
        : and(
              isNull(opinionModerationTable.id),
              currentOpinionSourceCondition(),
          );
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
    frameMode,
    displayContentPreferences,
}: {
    db: PostgresJsDatabase;
    candidateId: number;
    snapshotId: number;
    analysisSnapshotOpinionIds: number[];
    personalizationUserId?: string;
    frameMode: AnalysisFrameKey["mode"];
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
        .leftJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .leftJoin(
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
            contentTranslationWorkTable,
            and(
                eq(contentTranslationWorkTable.sourceKind, "opinion"),
                eq(
                    contentTranslationWorkTable.opinionContentId,
                    opinionContentTable.id,
                ),
                eq(
                    contentTranslationWorkTable.displayLanguageCode,
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
                getAnalysisOpinionCurrentVisibilityFilter({
                    frameMode,
                }),
                getAnalysisOpinionMuteFilter({ personalizationUserId }),
            ),
        );
}

async function fetchAnalysisOpinionRowsForList({
    db,
    candidateId,
    snapshotId,
    conversationParticipantCount,
    personalizationUserId,
    frameMode,
    kind,
    displayContentPreferences,
}: {
    db: PostgresJsDatabase;
    candidateId: number;
    snapshotId: number;
    conversationParticipantCount: number;
    personalizationUserId?: string;
    frameMode: AnalysisFrameKey["mode"];
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
        .leftJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .leftJoin(
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
            contentTranslationWorkTable,
            and(
                eq(contentTranslationWorkTable.sourceKind, "opinion"),
                eq(
                    contentTranslationWorkTable.opinionContentId,
                    opinionContentTable.id,
                ),
                eq(
                    contentTranslationWorkTable.displayLanguageCode,
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
                getAnalysisOpinionCurrentVisibilityFilter({
                    frameMode,
                }),
                getAnalysisOpinionMuteFilter({ personalizationUserId }),
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

function getOpinionRedactionReason({
    currentContentId,
    moderationAction,
    authorIsDeleted,
    isSeed,
    deletedAt,
    accountHiddenAt,
    frameMode,
    accountHiddenContentRetained,
}: {
    currentContentId: number | null;
    moderationAction: OpinionModerationAction | null;
    authorIsDeleted: boolean | null;
    isSeed: boolean;
    deletedAt: Date | null;
    accountHiddenAt: Date | null;
    frameMode: AnalysisFrameKey["mode"];
    accountHiddenContentRetained: boolean;
}): AnalysisOpinionRedactionReason | undefined {
    // Account hiding excludes live sources, not permitted text in a retained
    // checkpoint. Explicit content deletion and moderation apply in both modes.
    if (
        deletedAt !== null ||
        currentContentId === null ||
        ((frameMode === "live" || !accountHiddenContentRetained) &&
            (accountHiddenAt !== null ||
                (!isSeed && authorIsDeleted !== false)))
    ) {
        return "statement_deleted";
    }
    if (moderationAction === "hide") {
        return "hidden_by_moderation";
    }
    return undefined;
}

export function buildAnalysisOpinionContent({
    row,
    displayContentPreferences,
    viewerUserId,
    frameMode,
}: {
    row: SnapshotAnalysisOpinionRow;
    displayContentPreferences: AnalysisOpinionDisplayContentPreferences;
    viewerUserId: string | undefined;
    frameMode: AnalysisFrameKey["mode"];
}): AnalysisOpinionItem["content"] {
    const redactionReason = getOpinionRedactionReason({ ...row, frameMode });
    if (redactionReason !== undefined) {
        return {
            status: "redacted",
            reason: redactionReason,
        };
    }

    if (
        row.opinion === null ||
        row.opinionContentId === null ||
        row.contentPublicId === null
    ) {
        return { status: "redacted", reason: "statement_deleted" };
    }

    const permitsNewTranslation =
        row.accountHiddenAt === null &&
        (row.isSeed || row.authorIsDeleted === false);
    const displayContent = conversationContentService.toOpinionDisplayContent({
        content: buildLocalizedOpinionContent({
            source: {
                opinionContentId: row.opinionContentId,
                contentPublicId: row.contentPublicId,
                comment: row.opinion,
                sourceLanguageCode: row.sourceLanguageCode,
                sourceRawLanguageCode: row.sourceRawLanguageCode,
                sourceLanguageProvider: row.sourceLanguageProvider,
                sourceLanguageConfidence: row.sourceLanguageConfidence,
            },
            translation:
                row.translatedContent === null
                    ? undefined
                    : {
                          translatedContent: row.translatedContent,
                          sourceLanguageCode: row.translationSourceLanguageCode,
                      },
            targetLanguageCode: displayContentPreferences.targetLanguage,
            missingTranslationStatus: toMissingContentTranslationStatus(
                row.translationWorkStatus ?? "not_requested",
            ),
        }),
        translationAllowed:
            (permitsNewTranslation || row.translatedContent !== null) &&
            displayContentPreferences.translationAllowed &&
            !isPersonalNonSeedOpinionByViewer({
                opinionAuthorId: row.authorId,
                viewerUserId,
                isSeed: row.isSeed,
            }),
        displayLanguage: displayContentPreferences.displayLanguage,
        spokenLanguages: displayContentPreferences.spokenLanguages,
    });
    return {
        status: "visible",
        html: row.opinion,
        sourceLanguageCode: row.sourceLanguageCode,
        moderation: createCommentModerationPropertyObject(
            row.moderationAction,
            row.moderationExplanation,
            row.moderationReason,
            row.moderationCreatedAt,
            row.moderationUpdatedAt,
        ),
        displayContent: permitsNewTranslation
            ? displayContent
            : { ...displayContent, translationControl: null },
    };
}

async function buildAnalysisOpinionsByIdFromRows({
    db,
    candidateId,
    conversationParticipantCount,
    groups,
    opinionRows,
    displayContentPreferences,
    viewerUserId,
    frameMode,
}: {
    db: PostgresJsDatabase;
    candidateId: number;
    conversationParticipantCount: number;
    groups: SnapshotGroupMetadata[];
    opinionRows: SnapshotAnalysisOpinionRow[];
    displayContentPreferences: AnalysisOpinionDisplayContentPreferences;
    viewerUserId: string | undefined;
    frameMode: AnalysisFrameKey["mode"];
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
        new Set(
            opinionRows.flatMap((row) =>
                row.authorId === null || row.authorIsDeleted !== false
                    ? []
                    : [row.authorId],
            ),
        ),
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
        if (row.userId !== null) groupIdByAuthorId.set(row.userId, row.groupId);
    }

    const authorIdByOpinionId = new Map<number, string | null>();
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
            isAuthorInCluster:
                authorId !== null &&
                groupIdByAuthorId.get(authorId) === row.groupId,
            numUsers: group.numUsers,
            numAgrees: row.numAgrees,
            numDisagrees: row.numDisagrees,
            numPasses: row.numPasses,
        });
        clustersStatsByOpinionId.set(opinionId, clusterStats);
    }

    return new Map(
        opinionRows.map((row) => [
            row.opinionId,
            buildAnalysisOpinionItem({
                row,
                conversationParticipantCount,
                clustersStats:
                    clustersStatsByOpinionId.get(row.opinionId) ?? [],
                displayContentPreferences,
                viewerUserId,
                frameMode,
            }),
        ]),
    );
}

export function buildAnalysisOpinionItem({
    row,
    conversationParticipantCount,
    clustersStats,
    displayContentPreferences,
    viewerUserId,
    frameMode,
}: {
    row: SnapshotAnalysisOpinionRow;
    conversationParticipantCount: number;
    clustersStats: ClusterStats[];
    displayContentPreferences: AnalysisOpinionDisplayContentPreferences;
    viewerUserId: string | undefined;
    frameMode: AnalysisFrameKey["mode"];
}): AnalysisOpinionItem {
    const content = buildAnalysisOpinionContent({
        row,
        displayContentPreferences,
        viewerUserId,
        frameMode,
    });
    const attributionVisible =
        content.status === "visible" &&
        row.authorIsDeleted === false &&
        row.accountHiddenAt === null;
    return {
        opinionSlugId: row.opinionSlugId,
        createdAt: attributionVisible ? row.createdAt : undefined,
        numParticipants: conversationParticipantCount,
        numDisagrees: row.numDisagrees,
        numAgrees: row.numAgrees,
        numPasses: row.numPasses,
        updatedAt: attributionVisible
            ? (row.updatedAt ?? undefined)
            : undefined,
        username: attributionVisible ? (row.username ?? undefined) : undefined,
        isSeed: row.isSeed,
        isEdited:
            content.status === "visible"
                ? (row.isEdited ?? undefined)
                : undefined,
        clustersStats: clustersStats.map(({ isAuthorInCluster, ...stats }) => ({
            ...stats,
            isAuthorInCluster: attributionVisible
                ? isAuthorInCluster
                : undefined,
        })),
        groupAwareConsensusAgree: row.groupAwareConsensusAgree ?? 0,
        groupAwareConsensusDisagree: row.groupAwareConsensusDisagree ?? 0,
        divisiveScore: row.divisiveScore ?? 0,
        content,
    };
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
    frameMode,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    conversationViewSnapshotId: number;
    candidateId: number;
    frameMode: AnalysisFrameKey["mode"];
}): Promise<SelectedAnalysisFrameCandidate | undefined> {
    const view = conversationViewSnapshotTable;
    const generation = polisAnalysisCloseGenerationTable;
    const close = polisAnalysisCloseTable;
    const reason = conversationViewSnapshotCheckpointReasonTable;
    const publishedReplacement = db
        .select({ dataGeneration: generation.dataGeneration })
        .from(generation)
        .where(
            and(
                eq(generation.conversationId, view.conversationId),
                eq(generation.dataGeneration, view.closeReplacementGeneration),
                isNotNull(generation.publishedAt),
                frameMode === "checkpoint"
                    ? and(
                          exists(
                              db
                                  .select({ id: close.closeId })
                                  .from(close)
                                  .innerJoin(
                                      reason,
                                      and(
                                          eq(
                                              reason.conversationViewSnapshotId,
                                              close.originalViewSnapshotId,
                                          ),
                                          eq(
                                              reason.reason,
                                              "conversation_closed",
                                          ),
                                      ),
                                  )
                                  .where(
                                      and(
                                          eq(close.closeId, generation.closeId),
                                          eq(
                                              close.opinionGroupSpecId,
                                              view.opinionGroupSpecId,
                                          ),
                                      ),
                                  ),
                          ),
                      )
                    : undefined,
            ),
        );

    const rows = await db
        .select({
            conversationId: conversationTable.id,
            viewSnapshotId: conversationViewSnapshotTable.id,
            participantCount: conversationViewSnapshotTable.participantCount,
            snapshotId: conversationViewSnapshotTable.analysisSnapshotId,
            resultId: analysisSnapshotResultTable.id,
            candidateId: opinionGroupCandidateTable.id,
            groupCount: opinionGroupVariantTable.groupCount,
            aiLabelingEnabled: polisConversationConfigTable.aiLabelingEnabled,
        })
        .from(conversationTable)
        .innerJoin(
            polisConversationConfigTable,
            eq(
                polisConversationConfigTable.id,
                conversationTable.polisConfigId,
            ),
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
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                isNull(conversationTable.deletedAt),
                // An exact key remains valid after another result is selected
                // or the conversation reopens. Staged views are never public.
                or(
                    and(
                        isNull(view.closeReplacementGeneration),
                        isNotNull(view.activatedAt),
                        frameMode === "checkpoint"
                            ? exists(
                                  db
                                      .select({ id: reason.id })
                                      .from(reason)
                                      .where(
                                          and(
                                              eq(
                                                  reason.conversationViewSnapshotId,
                                                  view.id,
                                              ),
                                              eq(
                                                  reason.conversationId,
                                                  view.conversationId,
                                              ),
                                          ),
                                      ),
                              )
                            : undefined,
                    ),
                    exists(publishedReplacement),
                ),
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
        participantCount: row.participantCount,
        snapshotId: row.snapshotId,
        resultId: row.resultId,
        candidateId: row.candidateId,
        groupCount: row.groupCount,
        aiLabelingEnabled: row.aiLabelingEnabled,
    };
}

function createAnalysisFrameKey({
    candidate,
    mode,
}: {
    candidate: AnalysisFrameKeySource;
    mode: AnalysisFrameKey["mode"];
}): AnalysisFrameKey {
    return {
        mode,
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
        left.candidateId === right.candidateId &&
        left.mode === right.mode
    );
}

function createAnalysisFrameManifest({
    selection,
    hasVotedOnAllAvailableOpinions,
    frameMode,
}: {
    selection: Awaited<ReturnType<typeof getOpinionGroupAnalysisSelection>>;
    hasVotedOnAllAvailableOpinions: boolean | undefined;
    frameMode: AnalysisFrameKey["mode"];
}): AnalysisFrameManifest {
    const frameKey =
        selection.candidate === undefined
            ? undefined
            : createAnalysisFrameKey({
                  candidate: selection.candidate,
                  mode: frameMode,
              });
    const counters =
        selection.conversationViewSnapshot === undefined
            ? undefined
            : createAnalysisFrameCounters(selection.conversationViewSnapshot);

    return {
        frameKey,
        closedAnalysisSelection: selection.closedAnalysisSelection,
        conversationViewSnapshot: selection.conversationViewSnapshot,
        counters,
        emptyReason: selection.emptyReason,
        analysisViewResolution: selection.viewState,
        aiLabelsExpected: selection.candidate?.aiLabelingEnabled === true,
        hasVotedOnAllAvailableOpinions,
    };
}

export async function fetchAnalysisFrameManifestByConversationSlugId({
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
}): Promise<AnalysisFrameManifest> {
    // A close may legitimately select an older published frame. Read its
    // current pointer once on the primary, never compare frame IDs for freshness.
    const primaryDb = getPrimaryDatabase(db);
    const selection = await getOpinionGroupAnalysisSelection({
        db: primaryDb,
        conversationSlugId,
        displayLanguage,
        analysisView,
        checkpointViewSnapshotId,
    });
    // The completion hint is only actionable in the current open view.
    const hasVotedOnAllAvailableOpinions =
        checkpointViewSnapshotId === undefined &&
        selection.conversationViewSnapshot?.isClosed !== true
            ? await getHasVotedOnAllAvailableOpinions({
                  db: primaryDb,
                  conversationSlugId,
                  personalizationUserId,
              })
            : undefined;

    return createAnalysisFrameManifest({
        selection,
        hasVotedOnAllAvailableOpinions,
        frameMode:
            checkpointViewSnapshotId === undefined ? "live" : "checkpoint",
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
        frameMode: frameKey.mode,
    });
    if (selectedCandidate === undefined) {
        return undefined;
    }

    if (
        !isAnalysisFrameKeyEqual({
            left: createAnalysisFrameKey({
                candidate: selectedCandidate,
                mode: frameKey.mode,
            }),
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
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
    personalizationUserId?: string;
    resolveDisplayContentPreferences: ResolveOpinionDisplayContentPreferences;
}): Promise<AnalysisFrameGroups> {
    // Frozen frame keys do not freeze opinion visibility or viewer eligibility.
    const primary = getPrimaryDatabase(db);
    const groups = await fetchAnalysisFrameGroupsByFrameKeyFromDb({
        db: primary,
        conversationSlugId,
        frameKey,
        personalizationUserId,
        displayContentPreferences: await resolveDisplayContentPreferences({
            db: primary,
        }),
    });
    if (groups !== undefined) {
        return groups;
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
        frameMode: frameKey.mode,
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
        frameMode: frameKey.mode,
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
        .where(
            and(
                inArray(opinionGroupDescriptionTable.id, descriptionIds),
                eq(opinionGroupDescriptionTable.locale, "en"),
            ),
        );
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
}): Promise<
    | {
          groupLabels: AnalysisFrameGroupLabels;
          needsDescriptionRequest: boolean;
      }
    | undefined
> {
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
            groupLabels: {
                frameKey,
                groupDescriptionDisplay: { displayedLocale: null },
                labels: {},
            },
            needsDescriptionRequest: false,
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
            groupLabels: {
                frameKey,
                groupDescriptionDisplay: { displayedLocale: requestedLocale },
                labels: requestedLabels,
            },
            needsDescriptionRequest: false,
        };
    }

    const englishLabels =
        requestedLocale === "en"
            ? undefined
            : await fetchEnglishGroupLabels({ db, groups });
    if (englishLabels !== undefined) {
        return {
            groupLabels: {
                frameKey,
                groupDescriptionDisplay: { displayedLocale: "en" },
                labels: englishLabels,
            },
            needsDescriptionRequest: true,
        };
    }

    return {
        groupLabels: {
            frameKey,
            groupDescriptionDisplay: { displayedLocale: null },
            labels: {},
        },
        needsDescriptionRequest: groups.length > 0,
    };
}

export async function fetchAnalysisFrameGroupLabelsByFrameKey({
    db,
    conversationSlugId,
    frameKey,
    displayLanguage = "en",
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
    displayLanguage?: string;
}): Promise<AnalysisFrameGroupLabels> {
    const requestedLocale = getSupportedDisplayLanguage(displayLanguage);
    const primary = getPrimaryDatabase(db);
    const result = await fetchAnalysisFrameGroupLabelsByFrameKeyFromDb({
        db: primary,
        conversationSlugId,
        frameKey,
        displayLanguage,
    });
    if (result === undefined) {
        throw httpErrors.notFound(
            "Analysis frame group labels are not available.",
        );
    }

    if (result.needsDescriptionRequest) {
        // Workers materialize both English and translated work from durable
        // demand. Readers never compete for worker-owned execution records.
        await primary
            .insert(opinionGroupCandidateDescriptionLocaleRequestTable)
            .values({
                candidateId: frameKey.candidateId,
                locale: requestedLocale,
            })
            .onConflictDoNothing();
    }
    return result.groupLabels;
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
    const opinionRows = await fetchAnalysisOpinionRowsForList({
        db,
        candidateId: selectedCandidate.candidateId,
        snapshotId: selectedCandidate.snapshotId,
        conversationParticipantCount: selectedCandidate.participantCount,
        personalizationUserId,
        frameMode: frameKey.mode,
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
        frameMode: frameKey.mode,
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
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    frameKey: AnalysisFrameKey;
    personalizationUserId?: string;
    kind: AnalysisFrameOpinionListKind;
    resolveDisplayContentPreferences: ResolveOpinionDisplayContentPreferences;
}): Promise<AnalysisFrameOpinionList> {
    const primary = getPrimaryDatabase(db);
    const opinionList = await fetchAnalysisFrameOpinionListByFrameKeyFromDb({
        db: primary,
        conversationSlugId,
        frameKey,
        personalizationUserId,
        kind,
        displayContentPreferences: await resolveDisplayContentPreferences({
            db: primary,
        }),
    });
    if (opinionList !== undefined) {
        return opinionList;
    }

    throw httpErrors.notFound("Analysis frame opinion list is not available.");
}

/** All personalized sections of one cold frame share its authorization, groups
 * and per-opinion projections. Locale demand stays independently refreshable. */
export async function fetchAnalysisFrameContentByFrameKey({
    db,
    conversationSlugId,
    frameKey,
    personalizationUserId,
    resolveDisplayContentPreferences,
}: Omit<
    Parameters<typeof fetchAnalysisFrameOpinionListByFrameKey>[0],
    "kind"
>): Promise<AnalysisFrameContent> {
    return await getPrimaryDatabase(db).transaction(
        async (tx) => {
            const candidate = await fetchSelectedFrameCandidateByKey({
                db: tx,
                conversationSlugId,
                frameKey,
            });
            if (candidate === undefined)
                throw httpErrors.notFound("Analysis frame not available");
            const displayContentPreferences =
                await resolveDisplayContentPreferences({ db: tx });
            const groups = await fetchSnapshotGroups({
                db: tx,
                candidateId: candidate.candidateId,
                personalizationUserId,
            });
            const common = {
                db: tx,
                candidateId: candidate.candidateId,
                snapshotId: candidate.snapshotId,
                conversationParticipantCount: candidate.participantCount,
                personalizationUserId,
                frameMode: frameKey.mode,
                displayContentPreferences,
            };
            const representativeRows = await fetchRepresentativeOpinionRows({
                db: tx,
                groups,
            });
            const representatives = await fetchAnalysisOpinionRowsByIds({
                ...common,
                analysisSnapshotOpinionIds: representativeRows.map(
                    (r) => r.analysisSnapshotOpinionId,
                ),
            });
            const readList = (kind: AnalysisFrameOpinionListKind) =>
                fetchAnalysisOpinionRowsForList({ ...common, kind });
            const agreements = await readList("agreements");
            const disagreements = await readList("disagreements");
            const divisive = await readList("divisive");
            const unique = new Map(
                [
                    ...representatives,
                    ...agreements,
                    ...disagreements,
                    ...divisive,
                ].map((row) => [row.opinionId, row]),
            );
            const opinionsById = await buildAnalysisOpinionsByIdFromRows({
                ...common,
                groups,
                opinionRows: [...unique.values()],
                viewerUserId: personalizationUserId,
            });
            const representativeOpinionIdsByGroupKey =
                buildRepresentativeOpinionIdsByGroupKey({
                    groups,
                    representativeRows,
                    opinionsById,
                });
            const items = (rows: SnapshotAnalysisOpinionRow[]) =>
                rows.flatMap((row) => {
                    const item = opinionsById.get(row.opinionId);
                    return item === undefined ? [] : [item];
                });
            return {
                groups: {
                    frameKey,
                    clusters: buildSnapshotAnalysisFrameGroups({
                        groups,
                        opinionsById,
                        representativeOpinionIdsByGroupKey,
                    }),
                },
                agreements: {
                    frameKey,
                    kind: "agreements",
                    items: items(agreements),
                },
                disagreements: {
                    frameKey,
                    kind: "disagreements",
                    items: items(disagreements),
                },
                divisive: {
                    frameKey,
                    kind: "divisive",
                    items: items(divisive),
                },
            };
        },
        { isolationLevel: "repeatable read" },
    );
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
        .leftJoin(userTable, eq(userTable.id, opinionTable.authorId))
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
                eq(conversationTable.isClosed, false),
                isNotNull(opinionTable.currentContentId),
                getUnansweredOpinionFilter({
                    personalizationUserId,
                    excludedOpinionSlugIds: [],
                }),
                isNull(userMutePreferenceTable.id),
                currentOpinionSourceCondition(),
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

type PostNewOpinionBaseProps = {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    now: Date;
    googleCloudCredentials?: GoogleCloudCredentials;
    useGoogleLanguageDetection?: boolean;
    realtimeSSEManager?: RealtimeSSEManager;
    onCreatedOpinionSource?: (source: OpinionContentSource) => void;
} & (
    | { isSeed: true; tx?: PostgresJsDatabase; voteBuffer?: never }
    | { isSeed: false; tx?: never; voteBuffer: VoteBuffer }
);

type PostNewOpinionContentProps =
    | {
          normalizedContent: NormalizedUserRichText & {
              sourceLanguageMetadata?: ContentLanguageMetadata;
          };
          commentBody?: never;
      }
    | {
          normalizedContent?: never;
          commentBody: string;
      };

interface PostNewOpinionWithConversationMetadataProps {
    currentDisplayLanguage?: never;
    conversationMetadata: {
        conversationId: number;
        conversationContentId: number;
        conversationAuthorId: string;
    };
}

interface PostNewOpinionWithParticipationCheckProps {
    didWrite: string;
    userAgent: string;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
    conversationMetadata?: undefined;
}

type PostNewOpinionProps = PostNewOpinionBaseProps &
    PostNewOpinionContentProps &
    (
        | PostNewOpinionWithConversationMetadataProps
        | PostNewOpinionWithParticipationCheckProps
    );

type CreatedOpinion = Omit<
    Extract<CreateCommentResponse, { success: true }>,
    "loginStatus"
>;
type InternalOpinionCreationResponse =
    | CreatedOpinion
    | Extract<CreateCommentResponse, { success: false }>;

export function postNewOpinion(
    props: PostNewOpinionBaseProps &
        PostNewOpinionWithConversationMetadataProps & {
            isSeed: true;
            normalizedContent: NormalizedUserRichText & {
                sourceLanguageMetadata?: ContentLanguageMetadata;
            };
            commentBody?: never;
        },
): Promise<CreatedOpinion>;
export function postNewOpinion(
    props: PostNewOpinionBaseProps &
        PostNewOpinionContentProps &
        PostNewOpinionWithConversationMetadataProps,
): Promise<InternalOpinionCreationResponse>;
export function postNewOpinion(
    props: PostNewOpinionBaseProps &
        PostNewOpinionContentProps &
        PostNewOpinionWithParticipationCheckProps,
): Promise<CreateCommentResponse>;
export async function postNewOpinion(
    props: PostNewOpinionProps,
): Promise<InternalOpinionCreationResponse | CreateCommentResponse> {
    const {
        db,
        tx,
        conversationSlugId,
        now,
        isSeed,
        googleCloudCredentials,
        useGoogleLanguageDetection,
        voteBuffer,
        realtimeSSEManager,
        onCreatedOpinionSource,
    } = props;
    interface ParticipationContext {
        conversationId: number;
        conversationContentId: number;
        participantId: string;
    }

    let commentBody: string;
    let contentPlainText: string;
    if (props.normalizedContent !== undefined) {
        commentBody = props.normalizedContent.html;
        contentPlainText = props.normalizedContent.plainText;
    } else {
        try {
            const normalizationResult = normalizeUserRichTextInput({
                html: props.commentBody,
                validationMode: "opinion",
            });
            if (!normalizationResult.success) {
                return {
                    success: false,
                    reason: normalizationResult.reason,
                };
            }
            commentBody = normalizationResult.content.html;
            contentPlainText = normalizationResult.content.plainText;
        } catch (error) {
            if (error instanceof Error) {
                throw httpErrors.badRequest(error.message);
            } else {
                throw httpErrors.badRequest(
                    "Error while sanitizing request body",
                );
            }
        }
    }
    const preparation =
        props.conversationMetadata === undefined
            ? await prepareParticipantStatement({
                  db,
                  conversationSlugId,
                  family: "polis",
                  didWrite: props.didWrite,
                  now,
              })
            : {
                  success: true as const,
                  conversationId: props.conversationMetadata.conversationId,
                  dynamicTranslationEnabled: undefined,
              };
    if (!preparation.success) return preparation;
    const languageMetadata =
        props.normalizedContent?.sourceLanguageMetadata ??
        (await resolveContentLanguageMetadata({
            text: contentPlainText,
            googleCloudCredentials,
            useGoogleLanguageDetection:
                useGoogleLanguageDetection ??
                preparation.dynamicTranslationEnabled ??
                (
                    await getConversationMultilingualSetting({
                        db,
                        conversationId: preparation.conversationId,
                    })
                ).dynamicTranslationEnabled,
        }));

    const opinionSlugId = generateRandomSlugId();

    const persistNewOpinion = async ({
        transactionDb,
        participationContext,
    }: {
        transactionDb: PostgresJsDatabase;
        participationContext: ParticipationContext;
    }): Promise<{
        opinionId: number;
        opinionContentId: number;
        opinionContentPublicId: string;
        opinionItem: OpinionItem;
        displayedOpinionItem: DisplayedOpinionItem;
        contributionRevision: number;
        participationContext: ParticipationContext;
    }> => {
        // Internal metadata callers bypass device admission, but not account, family or policy checks.
        if (!isSeed && props.conversationMetadata !== undefined) {
            const actors = await transactionDb
                .select({ id: userTable.id })
                .from(userTable)
                .where(
                    and(
                        eq(userTable.id, participationContext.participantId),
                        eq(userTable.isDeleted, false),
                        isNull(userTable.authRestrictedAt),
                    ),
                )
                .for("no key update");
            if (actors.length === 0)
                throw httpErrors.conflict(
                    "Account no longer accepts statements",
                );
            const admissionRows = await transactionDb
                .select({
                    isClosed: conversationTable.isClosed,
                    contentId: conversationTable.currentContentId,
                    isImporting: conversationTable.isImporting,
                })
                .from(conversationTable)
                .where(
                    eq(
                        conversationTable.id,
                        participationContext.conversationId,
                    ),
                )
                .for("share");
            const admission = admissionRows.at(0);
            if (
                admission?.contentId == null ||
                admission.isClosed ||
                admission.isImporting
            ) {
                throw httpErrors.conflict(
                    "Conversation no longer accepts statements",
                );
            }
            const settings = await fetchCurrentConversationTypeSettings({
                db: transactionDb,
                conversationId: participationContext.conversationId,
            });
            if (
                settings.presentation.conversationType !== "polis" ||
                !settings.participantStatements.supported ||
                !settings.participantStatements.enabled
            )
                throw httpErrors.conflict(
                    "Conversation no longer accepts statements",
                );
        }
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

        const insertedOpinion = insertCommentResponse.at(0);
        if (insertedOpinion === undefined)
            throw httpErrors.internalServerError("Statement insertion failed");
        const opinionId = insertedOpinion.opinionId;

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

        const insertedContent = commentContentTableResponse.at(0);
        if (insertedContent === undefined)
            throw httpErrors.internalServerError(
                "Statement content insertion failed",
            );
        const commentContentTableId = insertedContent.commentContentTableId;
        const opinionContentPublicId = insertedContent.publicId;

        await transactionDb
            .update(opinionTable)
            .set({
                currentContentId: commentContentTableId,
            })
            .where(eq(opinionTable.id, opinionId));

        // Update the user profile's comment count using atomic increment
        const authors = await transactionDb
            .update(userTable)
            .set({
                totalOpinionCount: sql`${userTable.totalOpinionCount} + 1`,
            })
            .where(eq(userTable.id, participationContext.participantId))
            .returning({
                contributionRevision: userTable.contributionRevision,
                username: userTable.username,
            });
        const author = authors.at(0);
        if (author === undefined)
            throw httpErrors.conflict("Account no longer accepts statements");

        const opinionItem: OpinionItem = {
            opinion: commentBody,
            sourceLanguageCode: languageMetadata.sourceLanguageCode,
            opinionSlugId,
            createdAt: insertedOpinion.createdAt,
            updatedAt: insertedOpinion.updatedAt,
            numParticipants: isSeed ? 0 : 1,
            numAgrees: isSeed ? 0 : 1,
            numDisagrees: 0,
            numPasses: 0,
            username: author.username,
            moderation: { status: "unmoderated" },
            isSeed,
            isEdited: false,
        };
        const displayedOpinionItem: DisplayedOpinionItem = {
            ...opinionItem,
            management: {
                editing: { allowed: true },
                canDelete: true,
                canModerate: false,
            },
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
            contributionRevision: author.contributionRevision,
            participationContext,
        };
    };

    const persist = async () => {
        if (props.conversationMetadata !== undefined) {
            const participationContext: ParticipationContext = {
                conversationId: props.conversationMetadata.conversationId,
                conversationContentId:
                    props.conversationMetadata.conversationContentId,
                participantId: props.conversationMetadata.conversationAuthorId,
            };
            const value =
                tx !== undefined
                    ? await persistNewOpinion({
                          transactionDb: tx,
                          participationContext,
                      })
                    : await getPrimaryDatabase(db).transaction(
                          async (transactionDb) =>
                              await persistNewOpinion({
                                  transactionDb,
                                  participationContext,
                              }),
                      );
            return { success: true, value, loginStatus: undefined } as const;
        }
        return await withParticipantStatementAdmission({
            db,
            conversationSlugId,
            family: "polis",
            didWrite: props.didWrite,
            userAgent: props.userAgent,
            now,
            currentDisplayLanguage: props.currentDisplayLanguage,
            persist: async ({ tx: transactionDb, ...context }) =>
                await persistNewOpinion({
                    transactionDb,
                    participationContext: context,
                }),
        });
    };
    const persisted = await persist();
    if (!persisted.success) return persisted;
    const {
        opinionId,
        opinionContentId,
        opinionContentPublicId,
        opinionItem,
        displayedOpinionItem,
        contributionRevision,
        participationContext,
    } = persisted.value;

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
        try {
            await voteBuffer.add({
                vote: {
                    userId: participationContext.participantId,
                    contributionRevision,
                    opinionId,
                    opinionContentId,
                    conversationId: participationContext.conversationId,
                    vote: "agree",
                    timestamp: now,
                },
            });
        } catch (error) {
            // Statement creation has committed. An optional automatic agreement
            // must not turn success into an error that prompts duplicate creation.
            logApiError({
                logger: log,
                level: "error",
                event: { event: "vote_buffer", voteBufferOperation: "enqueue" },
                error,
            });
        }
    }

    // Create notification for conversation owner + org members (outside transaction)
    // Skip for seed opinions
    if (!isSeed) {
        try {
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
        } catch (error) {
            // Notification delivery must not turn an already committed statement into a retryable failure.
            logApiError({
                logger: log,
                level: "error",
                event: { event: "application_error" },
                error,
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

    const created: CreatedOpinion = {
        success: true,
        opinionSlugId: opinionSlugId,
        opinionItem,
        displayedOpinionItem,
    };
    return persisted.loginStatus === undefined
        ? created
        : { ...created, loginStatus: persisted.loginStatus };
}

interface DeleteCommentBySlugIdProps {
    db: PostgresJsDatabase;
    opinionSlugId: string;
    userId: string;
}

export async function deleteOpinionBySlugId({
    db,
    opinionSlugId,
}: DeleteCommentBySlugIdProps): Promise<void> {
    const { conversationId: targetConversationId } =
        await useCommonComment().getOpinionMetadataFromOpinionSlugId({
            db: getPrimaryDatabase(db),
            opinionSlugId,
        });
    await getPrimaryDatabase(db).transaction(async (tx) => {
        const conversationRows = await tx
            .select({
                projectId: conversationTable.projectId,
                slugId: conversationTable.slugId,
                closedFinalizedAt: conversationTable.closedFinalizedAt,
            })
            .from(conversationTable)
            .where(eq(conversationTable.id, targetConversationId))
            .for("no key update")
            .limit(1);
        const conversation = conversationRows.at(0);
        if (conversation === undefined)
            throw httpErrors.notFound("Conversation not found");
        const opinionRows = await tx
            .select({
                opinionId: opinionTable.id,
                conversationId: opinionTable.conversationId,
                authorId: opinionTable.authorId,
                isSeed: opinionTable.isSeed,
                currentContentId: opinionTable.currentContentId,
            })
            .from(opinionTable)
            .where(and(eq(opinionTable.slugId, opinionSlugId)))
            .for("update")
            .limit(1);

        const opinion = opinionRows.at(0);
        if (opinion === undefined) {
            throw httpErrors.notFound("Opinion not found");
        }

        if (opinion.currentContentId === null)
            throw httpErrors.conflict("Opinion had already been deleted");
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

        await tx
            .update(opinionTable)
            .set({
                currentContentId: null,
                deletedAt: sql`clock_timestamp()`,
            })
            .where(eq(opinionTable.id, opinion.opinionId));

        const conversationId = opinion.conversationId;
        await queueOpinionRedactedEvent({
            db: tx,
            conversationSlugId: conversation.slugId,
            opinions: [{ opinionSlugId, action: "redact" }],
        });

        await createConversationViewSnapshotsFromCurrentState({
            db: tx,
            conversationId,
            viewReason: "conversation_content_updated",
            emitCommentStatsRealtimeEvent: true,
        });

        if (
            conversation.closedFinalizedAt !== null ||
            (moderationRows.length === 0 && activeVoteRows.length > 0)
        ) {
            await scheduleConversationAnalysisRefresh({
                db: tx,
                conversationId,
                log,
            });
        }

        // Decrement user's total opinion count
        if (opinion.authorId !== null)
            await tx
                .update(userTable)
                .set({
                    totalOpinionCount: sql`total_opinion_count - 1`,
                })
                .where(eq(userTable.id, opinion.authorId));
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
                    const contentPlainText = htmlToCountedTextWithWarning({
                        html: commentBody,
                        context: "legacy Polis opinion import",
                    });
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
