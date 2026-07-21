import {
    and,
    asc,
    eq,
    exists,
    inArray,
    isNotNull,
    isNull,
    ne,
    or,
    sql,
} from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import type { Script } from "@valkey/valkey-glide";
import type { BaseLogger } from "pino";
import {
    contentTranslationWorkTable,
    conversationViewSnapshotTable,
    analysisSnapshotOpinionTable,
    conversationContentTable,
    conversationContentTranslationTable,
    conversationTable,
    conversationTranslationTargetLanguageTable,
    opinionContentTable,
    opinionContentTranslationTable,
    opinionModerationTable,
    opinionTable,
    projectContentTable,
    projectContentTranslationTable,
    projectTable,
    projectTranslationTargetLanguageTable,
    rankingItemContentTable,
    rankingItemContentTranslationTable,
    rankingItemTable,
    surveyQuestionContentTable,
    surveyQuestionContentTranslationTable,
    surveyQuestionOptionContentTable,
    surveyQuestionOptionContentTranslationTable,
    surveyQuestionOptionTable,
    surveyQuestionTable,
    userTable,
} from "@/shared-backend/schema.js";
import {
    CONTENT_TRANSLATION_QUEUE_PRIORITIES,
    type ContentTranslationQueuePriority,
    enqueueContentTranslationWork,
} from "@/shared-backend/contentTranslationQueue.js";
import { translationSourceMatchesCurrentSource } from "@/shared-backend/translate.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import type {
    LanguageDetectionProvider,
    ContentTranslationSubject,
    LocalizedConversationContent,
    LocalizedOpinionContent,
    LocalizedProjectContent,
    LocalizedRankingItemContent,
    LocalizedSurveyQuestionContent,
} from "@/shared/types/zod.js";
import type {
    SupportedDisplayLanguageCodes,
    SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import {
    buildLocalizedRankingItemContent,
    buildLocalizedSurveyQuestionContent,
    buildTranslationMetadata,
    hasCompleteSurveyQuestionTranslation,
    shouldQueueTranslationWork,
    toMissingContentTranslationStatus,
} from "./contentTranslationContent.js";
import type { ContentTranslationRequestMode } from "./contentTranslationContent.js";
import type { MissingContentTranslationStatus } from "./contentTranslationContent.js";
import {
    getConversationOverrideTranslationTargetLanguagePolicy,
    getProjectTranslationTargetLanguagePolicy,
    sourceLanguageToDisplayLanguage,
    shouldTranslateContent,
    type TranslationTargetLanguagePolicy,
} from "./translationLanguageSetting.js";
import { getProjectLanguageSettings } from "./projectAccess.js";
import { getImplicitDefaultDisplayLanguage } from "./projectLanguage.js";

interface RequestContentTranslationParams {
    db: PostgresDatabase;
    valkey: Valkey | undefined;
    queueScript: Script;
    subject: ContentTranslationSubject;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    requestMode: ContentTranslationRequestMode;
    requesterIsSiteModerator: boolean;
    now: Date;
    log: Pick<BaseLogger, "info" | "error">;
    beforeQueueTranslationWork: () => Promise<void>;
}

interface RequestConversationContentTranslationParams extends Omit<
    RequestContentTranslationParams,
    "subject" | "requesterIsSiteModerator"
> {
    conversationSlugId: string;
    sourceVersion?: string;
}

interface RequestProjectContentTranslationParams extends Omit<
    RequestContentTranslationParams,
    "subject" | "requesterIsSiteModerator"
> {
    projectSlug: string;
    sourceVersion?: string;
}

interface RequestSurveyQuestionContentTranslationParams extends Omit<
    RequestContentTranslationParams,
    "subject" | "requesterIsSiteModerator"
> {
    conversationSlugId: string;
    questionSlugId: string;
}

interface ScheduleEagerContentTranslationParams {
    db: PostgresDatabase;
    valkey: Valkey | undefined;
    queueScript: Script;
    conversationSlugId: string;
    now: Date;
    log: Pick<BaseLogger, "info" | "error">;
}

interface ScheduleEagerProjectContentTranslationParams {
    db: PostgresDatabase;
    valkey: Valkey | undefined;
    queueScript: Script;
    projectId: number;
    now: Date;
    log: Pick<BaseLogger, "info" | "error">;
}

interface ScheduleEagerKnownConversationContentTranslationParams {
    db: PostgresDatabase;
    conversationSource: ConversationContentSource;
    targetLanguagePolicy: TranslationTargetLanguagePolicy;
    surveySources: SurveyQuestionContentSource[];
    seedOpinionSources: OpinionContentSource[];
    rankingItemSources: RankingItemContentSource[];
    now: Date;
    log: Pick<BaseLogger, "info">;
}

interface EnqueueEagerContentTranslationWorkParams {
    valkey: Valkey | undefined;
    queueScript: Script;
    workIds: number[];
    now: Date;
    log: Pick<BaseLogger, "info" | "error">;
}

export interface ConversationContentSource {
    conversationId: number;
    conversationSlugId: string;
    projectId: number;
    languageSettingsSource: "conversation_override" | "project_inherited";
    dynamicTranslationEnabled: boolean;
    contentId: number;
    publicId: string;
    title: string;
    body: string | null;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}

export interface OpinionContentSource {
    conversationId: number;
    conversationSlugId: string;
    opinionSlugId: string;
    contentId: number;
    publicId: string;
    content: string;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}

export interface SurveyQuestionOptionContentSource {
    optionSlugId: string;
    contentId: number;
    publicId: string;
    optionText: string;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}

export interface SurveyQuestionContentSource {
    conversationId: number;
    conversationSlugId: string;
    questionSlugId: string;
    questionId: number;
    contentId: number;
    publicId: string;
    questionText: string;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
    options: SurveyQuestionOptionContentSource[];
}

export interface RankingItemContentSource {
    conversationId: number;
    conversationSlugId: string;
    itemSlugId: string;
    contentId: number;
    publicId: string;
    title: string;
    bodyHtml: string | null;
    bodyPlainText: string | null;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}

export interface ProjectContentSource {
    projectId: number;
    projectSlug: string;
    dynamicTranslationEnabled: boolean;
    contentId: number;
    publicId: string;
    title: string;
    subtitle: string | null;
    body: string | null;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}

type TranslationWorkInput =
    | {
          conversationId: null;
          sourceKind: "project";
          projectContentId: number;
          targetLanguageCode: SupportedDisplayLanguageCodes;
      }
    | {
          conversationId: number;
          sourceKind: "conversation";
          sourceContentId: number;
          targetLanguageCode: SupportedDisplayLanguageCodes;
      }
    | {
          conversationId: number;
          sourceKind: "opinion";
          sourceContentId: number;
          targetLanguageCode: SupportedDisplayLanguageCodes;
      }
    | {
          conversationId: number;
          sourceKind: "survey_question";
          surveyQuestionContentId: number;
          surveyQuestionOptionContentIds: number[];
          targetLanguageCode: SupportedDisplayLanguageCodes;
      }
    | {
          conversationId: number;
          sourceKind: "ranking_item";
          rankingItemContentId: number;
          targetLanguageCode: SupportedDisplayLanguageCodes;
      };

function getContentTranslationQueueMode(
    priority: ContentTranslationQueuePriority,
): "user_interactive" | "eager_visible" | "maintenance" {
    switch (priority) {
        case CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive:
            return "user_interactive";
        case CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible:
            return "eager_visible";
        case CONTENT_TRANSLATION_QUEUE_PRIORITIES.maintenance:
            return "maintenance";
    }
}

function getTranslationWorkLogFields(input: TranslationWorkInput) {
    if (input.sourceKind === "project") {
        return {
            conversationId: input.conversationId,
            sourceKind: input.sourceKind,
            projectContentId: input.projectContentId,
            targetLanguageCode: input.targetLanguageCode,
        };
    }
    if (input.sourceKind === "survey_question") {
        return {
            conversationId: input.conversationId,
            sourceKind: input.sourceKind,
            surveyQuestionContentId: input.surveyQuestionContentId,
            surveyQuestionOptionContentIds:
                input.surveyQuestionOptionContentIds,
            targetLanguageCode: input.targetLanguageCode,
        };
    }
    if (input.sourceKind === "ranking_item") {
        return {
            conversationId: input.conversationId,
            sourceKind: input.sourceKind,
            rankingItemContentId: input.rankingItemContentId,
            targetLanguageCode: input.targetLanguageCode,
        };
    }
    return {
        conversationId: input.conversationId,
        sourceKind: input.sourceKind,
        sourceContentId: input.sourceContentId,
        targetLanguageCode: input.targetLanguageCode,
    };
}

function getTranslationWorkSourceWhere(input: TranslationWorkInput) {
    if (input.sourceKind === "project") {
        return eq(
            contentTranslationWorkTable.projectContentId,
            input.projectContentId,
        );
    }
    if (input.sourceKind === "conversation") {
        return eq(
            contentTranslationWorkTable.conversationContentId,
            input.sourceContentId,
        );
    }
    if (input.sourceKind === "opinion") {
        return eq(
            contentTranslationWorkTable.opinionContentId,
            input.sourceContentId,
        );
    }
    if (input.sourceKind === "ranking_item") {
        return eq(
            contentTranslationWorkTable.rankingItemContentId,
            input.rankingItemContentId,
        );
    }
    return and(
        eq(
            contentTranslationWorkTable.surveyQuestionContentId,
            input.surveyQuestionContentId,
        ),
        eq(
            contentTranslationWorkTable.surveyQuestionOptionContentIds,
            input.surveyQuestionOptionContentIds,
        ),
    );
}

async function fetchMissingContentTranslationStatus({
    db,
    input,
}: {
    db: PostgresDatabase;
    input: TranslationWorkInput;
}): Promise<MissingContentTranslationStatus | undefined> {
    const rows = await db
        .select({ status: contentTranslationWorkTable.status })
        .from(contentTranslationWorkTable)
        .where(
            and(
                eq(contentTranslationWorkTable.sourceKind, input.sourceKind),
                getTranslationWorkSourceWhere(input),
                eq(
                    contentTranslationWorkTable.displayLanguageCode,
                    input.targetLanguageCode,
                ),
            ),
        )
        .limit(1);
    const row = rows.at(0);
    return row === undefined
        ? undefined
        : toMissingContentTranslationStatus(row.status);
}

async function resolveMissingContentTranslationStatus({
    db,
    input,
    translationExists,
    requestMode,
}: {
    db: PostgresDatabase;
    input: TranslationWorkInput;
    translationExists: boolean;
    requestMode: ContentTranslationRequestMode;
}): Promise<MissingContentTranslationStatus> {
    if (translationExists) {
        return "not_requested";
    }
    if (requestMode === "queue_if_missing") {
        return "pending";
    }
    return (
        (await fetchMissingContentTranslationStatus({ db, input })) ??
        "not_requested"
    );
}

function getSurveyQuestionOptionContentIds(
    source: SurveyQuestionContentSource,
): number[] {
    return source.options
        .map((option) => option.contentId)
        .sort((a, b) => a - b);
}

async function ensureTranslationWork({
    db,
    input,
    translationExists,
    now,
    priority,
    log,
}: {
    db: PostgresDatabase;
    input: TranslationWorkInput;
    translationExists: boolean;
    now: Date;
    priority: ContentTranslationQueuePriority;
    log: Pick<BaseLogger, "info">;
}): Promise<{ workId: number; shouldQueue: boolean }> {
    return await db.transaction(async (tx) => {
        const insertValues = {
            conversationId: input.conversationId,
            sourceKind: input.sourceKind,
            conversationContentId:
                input.sourceKind === "conversation"
                    ? input.sourceContentId
                    : null,
            projectContentId:
                input.sourceKind === "project" ? input.projectContentId : null,
            opinionContentId:
                input.sourceKind === "opinion" ? input.sourceContentId : null,
            surveyQuestionContentId:
                input.sourceKind === "survey_question"
                    ? input.surveyQuestionContentId
                    : null,
            surveyQuestionOptionContentIds:
                input.sourceKind === "survey_question"
                    ? input.surveyQuestionOptionContentIds
                    : null,
            rankingItemContentId:
                input.sourceKind === "ranking_item"
                    ? input.rankingItemContentId
                    : null,
            displayLanguageCode: input.targetLanguageCode,
            status: "pending" as const,
            priorityRank: priority,
            requestedAt: now,
            createdAt: now,
            updatedAt: now,
        };
        const insertedRows = await tx
            .insert(contentTranslationWorkTable)
            .values(insertValues)
            .onConflictDoNothing()
            .returning({ id: contentTranslationWorkTable.id });
        const inserted = insertedRows.at(0);

        const existingRows = await tx
            .select({
                id: contentTranslationWorkTable.id,
                status: contentTranslationWorkTable.status,
                priorityRank: contentTranslationWorkTable.priorityRank,
            })
            .from(contentTranslationWorkTable)
            .where(
                and(
                    eq(
                        contentTranslationWorkTable.sourceKind,
                        input.sourceKind,
                    ),
                    getTranslationWorkSourceWhere(input),
                    eq(
                        contentTranslationWorkTable.displayLanguageCode,
                        input.targetLanguageCode,
                    ),
                ),
            )
            .limit(1)
            .for("update");
        const existing = existingRows.at(0);
        if (existing === undefined) {
            throw new Error("Failed to load content translation work row");
        }

        if (inserted !== undefined) {
            log.info(
                {
                    workId: inserted.id,
                    ...getTranslationWorkLogFields(input),
                    priorityRank: priority,
                    queueMode: getContentTranslationQueueMode(priority),
                },
                "[ContentTranslation] Created translation work row",
            );
            return { workId: inserted.id, shouldQueue: true };
        }

        const completedTranslationExists =
            existing.status === "completed" && translationExists;
        const nextPriorityRank = Math.min(existing.priorityRank, priority);
        if (existing.status === "running" && !completedTranslationExists) {
            await tx
                .update(contentTranslationWorkTable)
                .set({
                    priorityRank: nextPriorityRank,
                    requestedAt: now,
                    updatedAt: now,
                })
                .where(eq(contentTranslationWorkTable.id, existing.id));
            log.info(
                {
                    workId: existing.id,
                    ...getTranslationWorkLogFields(input),
                    previousStatus: existing.status,
                    previousPriorityRank: existing.priorityRank,
                    nextPriorityRank,
                    queueMode: getContentTranslationQueueMode(priority),
                    translationExists,
                    shouldQueue: false,
                },
                "[ContentTranslation] Reused running translation work row",
            );
            return { workId: existing.id, shouldQueue: false };
        }
        await tx
            .update(contentTranslationWorkTable)
            .set({
                status: completedTranslationExists ? "completed" : "pending",
                priorityRank: nextPriorityRank,
                leaseOwner: null,
                leaseToken: null,
                leaseExpiresAt: null,
                lastErrorCode: null,
                lastErrorMessage: null,
                requestedAt: now,
                completedAt: completedTranslationExists ? now : null,
                failedAt: null,
                updatedAt: now,
            })
            .where(eq(contentTranslationWorkTable.id, existing.id));
        log.info(
            {
                workId: existing.id,
                ...getTranslationWorkLogFields(input),
                previousStatus: existing.status,
                previousPriorityRank: existing.priorityRank,
                nextPriorityRank,
                queueMode: getContentTranslationQueueMode(priority),
                translationExists,
                shouldQueue: !completedTranslationExists,
            },
            "[ContentTranslation] Reused translation work row",
        );
        return {
            workId: existing.id,
            shouldQueue: !completedTranslationExists,
        };
    });
}

async function markExistingTranslationWorkCompleted({
    db,
    input,
    now,
    log,
}: {
    db: PostgresDatabase;
    input: TranslationWorkInput;
    now: Date;
    log: Pick<BaseLogger, "info">;
}): Promise<void> {
    const updatedRows = await db
        .update(contentTranslationWorkTable)
        .set({
            status: "completed",
            leaseOwner: null,
            leaseToken: null,
            leaseExpiresAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            completedAt: now,
            failedAt: null,
            updatedAt: now,
        })
        .where(
            and(
                eq(contentTranslationWorkTable.sourceKind, input.sourceKind),
                getTranslationWorkSourceWhere(input),
                eq(
                    contentTranslationWorkTable.displayLanguageCode,
                    input.targetLanguageCode,
                ),
            ),
        )
        .returning({ id: contentTranslationWorkTable.id });
    const updated = updatedRows.at(0);
    if (updated === undefined) {
        return;
    }

    log.info(
        {
            workId: updated.id,
            ...getTranslationWorkLogFields(input),
        },
        "[ContentTranslation] Completed existing translation work row",
    );
}

async function queueTranslationWork({
    valkey,
    queueScript,
    workId,
    now,
    log,
    priority,
}: {
    valkey: Valkey | undefined;
    queueScript: Script;
    workId: number;
    now: Date;
    log: Pick<BaseLogger, "info" | "error">;
    priority: ContentTranslationQueuePriority;
}): Promise<void> {
    await enqueueContentTranslationWork({
        valkey,
        script: queueScript,
        workId,
        priority,
        enqueuedAtMs: now.getTime(),
        log,
    });
}

async function queueMissingTranslationWork({
    db,
    valkey,
    queueScript,
    input,
    translationExists,
    now,
    log,
    priority,
}: {
    db: PostgresDatabase;
    valkey: Valkey | undefined;
    queueScript: Script;
    input: TranslationWorkInput;
    translationExists: boolean;
    now: Date;
    log: Pick<BaseLogger, "info" | "error">;
    priority: ContentTranslationQueuePriority;
}): Promise<void> {
    const ensuredWork = await ensureTranslationWork({
        db,
        input,
        translationExists,
        now,
        priority,
        log,
    });
    if (!ensuredWork.shouldQueue) {
        log.info(
            {
                workId: ensuredWork.workId,
                ...getTranslationWorkLogFields(input),
                queueMode: getContentTranslationQueueMode(priority),
            },
            "[ContentTranslation] Translation work not queued",
        );
        return;
    }
    await queueTranslationWork({
        valkey,
        queueScript,
        workId: ensuredWork.workId,
        now,
        log,
        priority,
    });
    log.info(
        {
            workId: ensuredWork.workId,
            ...getTranslationWorkLogFields(input),
            priorityRank: priority,
            queueMode: getContentTranslationQueueMode(priority),
        },
        "[ContentTranslation] Queued translation work",
    );
}

async function fetchConversationSource({
    db,
    conversationSlugId,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
}): Promise<ConversationContentSource | undefined> {
    const rows = await db
        .select({
            conversationId: conversationTable.id,
            conversationSlugId: conversationTable.slugId,
            projectId: conversationTable.projectId,
            languageSettingsSource: conversationTable.languageSettingsSource,
            dynamicTranslationEnabled:
                conversationTable.dynamicTranslationEnabled,
            contentId: conversationContentTable.id,
            publicId: conversationContentTable.publicId,
            title: conversationContentTable.title,
            body: conversationContentTable.body,
            sourceLanguageCode: conversationContentTable.sourceLanguageCode,
            sourceRawLanguageCode:
                conversationContentTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                conversationContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                conversationContentTable.sourceLanguageConfidence,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
            ),
        )
        .limit(1);
    return rows.at(0) ?? undefined;
}

async function fetchOpinionSource({
    db,
    conversationSlugId,
    opinionSlugId,
    sourceVersion,
    requesterIsSiteModerator,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
    opinionSlugId: string;
    sourceVersion: string;
    requesterIsSiteModerator: boolean;
}): Promise<(OpinionContentSource & { isHidden: boolean }) | undefined> {
    const rows = await db
        .select({
            conversationId: conversationTable.id,
            conversationSlugId: conversationTable.slugId,
            opinionSlugId: opinionTable.slugId,
            contentId: opinionContentTable.id,
            publicId: opinionContentTable.publicId,
            content: opinionContentTable.content,
            sourceLanguageCode: opinionContentTable.sourceLanguageCode,
            sourceRawLanguageCode: opinionContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: opinionContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                opinionContentTable.sourceLanguageConfidence,
            isHidden: sql<boolean>`coalesce(${opinionModerationTable.moderationAction} = 'hide', false)`,
        })
        .from(opinionTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, opinionTable.conversationId),
        )
        .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .innerJoin(
            opinionContentTable,
            and(
                eq(opinionContentTable.opinionId, opinionTable.id),
                eq(opinionContentTable.publicId, sourceVersion),
            ),
        )
        .leftJoin(
            opinionModerationTable,
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                eq(opinionTable.slugId, opinionSlugId),
                isNotNull(opinionTable.currentContentId),
                eq(userTable.isDeleted, false),
                or(
                    eq(opinionTable.currentContentId, opinionContentTable.id),
                    exists(
                        db
                            .select({ id: analysisSnapshotOpinionTable.id })
                            .from(analysisSnapshotOpinionTable)
                            .innerJoin(
                                conversationViewSnapshotTable,
                                eq(
                                    conversationViewSnapshotTable.analysisSnapshotId,
                                    analysisSnapshotOpinionTable.analysisSnapshotId,
                                ),
                            )
                            .where(
                                and(
                                    eq(
                                        analysisSnapshotOpinionTable.opinionContentId,
                                        opinionContentTable.id,
                                    ),
                                    eq(
                                        analysisSnapshotOpinionTable.opinionId,
                                        opinionTable.id,
                                    ),
                                    eq(
                                        conversationViewSnapshotTable.conversationId,
                                        conversationTable.id,
                                    ),
                                    isNotNull(
                                        conversationViewSnapshotTable.activatedAt,
                                    ),
                                ),
                            ),
                    ),
                ),
                requesterIsSiteModerator
                    ? undefined
                    : or(
                          isNull(opinionModerationTable.id),
                          ne(opinionModerationTable.moderationAction, "hide"),
                      ),
            ),
        )
        .limit(1);
    return rows.at(0) ?? undefined;
}

async function fetchSurveyQuestionSource({
    db,
    conversationSlugId,
    questionSlugId,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
    questionSlugId: string;
}): Promise<SurveyQuestionContentSource | undefined> {
    const questionRows = await db
        .select({
            conversationId: conversationTable.id,
            conversationSlugId: conversationTable.slugId,
            questionSlugId: surveyQuestionTable.slugId,
            questionId: surveyQuestionTable.id,
            contentId: surveyQuestionContentTable.id,
            publicId: surveyQuestionContentTable.publicId,
            questionText: surveyQuestionContentTable.questionText,
            sourceLanguageCode: surveyQuestionContentTable.sourceLanguageCode,
            sourceRawLanguageCode:
                surveyQuestionContentTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                surveyQuestionContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                surveyQuestionContentTable.sourceLanguageConfidence,
        })
        .from(surveyQuestionTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, surveyQuestionTable.conversationId),
        )
        .innerJoin(
            surveyQuestionContentTable,
            eq(
                surveyQuestionContentTable.id,
                surveyQuestionTable.currentContentId,
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                eq(surveyQuestionTable.slugId, questionSlugId),
                isNotNull(surveyQuestionTable.currentContentId),
            ),
        )
        .limit(1);
    const question = questionRows.at(0);
    if (question === undefined) {
        return undefined;
    }

    const options = await db
        .select({
            optionSlugId: surveyQuestionOptionTable.slugId,
            contentId: surveyQuestionOptionContentTable.id,
            publicId: surveyQuestionOptionContentTable.publicId,
            optionText: surveyQuestionOptionContentTable.optionText,
            sourceLanguageCode:
                surveyQuestionOptionContentTable.sourceLanguageCode,
            sourceRawLanguageCode:
                surveyQuestionOptionContentTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                surveyQuestionOptionContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                surveyQuestionOptionContentTable.sourceLanguageConfidence,
        })
        .from(surveyQuestionOptionTable)
        .innerJoin(
            surveyQuestionOptionContentTable,
            eq(
                surveyQuestionOptionContentTable.id,
                surveyQuestionOptionTable.currentContentId,
            ),
        )
        .where(
            and(
                eq(
                    surveyQuestionOptionTable.surveyQuestionId,
                    question.questionId,
                ),
                isNotNull(surveyQuestionOptionTable.currentContentId),
            ),
        )
        .orderBy(asc(surveyQuestionOptionTable.displayOrder));

    return { ...question, options };
}

async function fetchRankingItemSource({
    db,
    conversationSlugId,
    itemSlugId,
    sourceVersion,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
    itemSlugId: string;
    sourceVersion: string;
}): Promise<RankingItemContentSource | undefined> {
    const rows = await db
        .select({
            conversationId: conversationTable.id,
            conversationSlugId: conversationTable.slugId,
            itemSlugId: rankingItemTable.slugId,
            contentId: rankingItemContentTable.id,
            publicId: rankingItemContentTable.publicId,
            title: rankingItemContentTable.title,
            bodyHtml: rankingItemContentTable.body,
            bodyPlainText: rankingItemContentTable.bodyPlainText,
            sourceLanguageCode: rankingItemContentTable.sourceLanguageCode,
            sourceRawLanguageCode:
                rankingItemContentTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                rankingItemContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                rankingItemContentTable.sourceLanguageConfidence,
        })
        .from(rankingItemTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, rankingItemTable.conversationId),
        )
        .innerJoin(
            rankingItemContentTable,
            eq(rankingItemContentTable.id, rankingItemTable.currentContentId),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                eq(rankingItemTable.slugId, itemSlugId),
                isNotNull(rankingItemTable.currentContentId),
                eq(rankingItemContentTable.publicId, sourceVersion),
            ),
        )
        .limit(1);
    return rows.at(0) ?? undefined;
}

async function hasConversationTranslation({
    db,
    source,
    targetLanguageCode,
}: {
    db: PostgresDatabase;
    source: ConversationContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): Promise<boolean> {
    const rows = await db
        .select({
            sourceLanguageCode:
                conversationContentTranslationTable.sourceLanguageCode,
        })
        .from(conversationContentTranslationTable)
        .where(
            and(
                eq(
                    conversationContentTranslationTable.conversationContentId,
                    source.contentId,
                ),
                eq(
                    conversationContentTranslationTable.displayLanguageCode,
                    targetLanguageCode,
                ),
            ),
        )
        .limit(1);
    const row = rows.at(0);
    return (
        row !== undefined &&
        translationSourceMatchesCurrentSource({
            translationSourceLanguageCode: row.sourceLanguageCode,
            currentSourceLanguageCode: source.sourceLanguageCode,
        })
    );
}

async function hasRankingItemTranslation({
    db,
    source,
    targetLanguageCode,
}: {
    db: PostgresDatabase;
    source: RankingItemContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): Promise<boolean> {
    const rows = await db
        .select({
            sourceLanguageCode:
                rankingItemContentTranslationTable.sourceLanguageCode,
        })
        .from(rankingItemContentTranslationTable)
        .where(
            and(
                eq(
                    rankingItemContentTranslationTable.rankingItemContentId,
                    source.contentId,
                ),
                eq(
                    rankingItemContentTranslationTable.displayLanguageCode,
                    targetLanguageCode,
                ),
            ),
        )
        .limit(1);
    const row = rows.at(0);
    return (
        row !== undefined &&
        translationSourceMatchesCurrentSource({
            translationSourceLanguageCode: row.sourceLanguageCode,
            currentSourceLanguageCode: source.sourceLanguageCode,
        })
    );
}

async function hasOpinionTranslation({
    db,
    source,
    targetLanguageCode,
}: {
    db: PostgresDatabase;
    source: OpinionContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): Promise<boolean> {
    const rows = await db
        .select({
            sourceLanguageCode:
                opinionContentTranslationTable.sourceLanguageCode,
        })
        .from(opinionContentTranslationTable)
        .where(
            and(
                eq(
                    opinionContentTranslationTable.opinionContentId,
                    source.contentId,
                ),
                eq(
                    opinionContentTranslationTable.displayLanguageCode,
                    targetLanguageCode,
                ),
            ),
        )
        .limit(1);
    const row = rows.at(0);
    return (
        row !== undefined &&
        translationSourceMatchesCurrentSource({
            translationSourceLanguageCode: row.sourceLanguageCode,
            currentSourceLanguageCode: source.sourceLanguageCode,
        })
    );
}

async function hasSurveyQuestionTranslation({
    db,
    source,
    targetLanguageCode,
}: {
    db: PostgresDatabase;
    source: SurveyQuestionContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): Promise<boolean> {
    const questionRows = await db
        .select({
            sourceLanguageCode:
                surveyQuestionContentTranslationTable.sourceLanguageCode,
        })
        .from(surveyQuestionContentTranslationTable)
        .where(
            and(
                eq(
                    surveyQuestionContentTranslationTable.surveyQuestionContentId,
                    source.contentId,
                ),
                eq(
                    surveyQuestionContentTranslationTable.displayLanguageCode,
                    targetLanguageCode,
                ),
            ),
        )
        .limit(1);
    const questionRow = questionRows.at(0);
    if (
        questionRow === undefined ||
        !translationSourceMatchesCurrentSource({
            translationSourceLanguageCode: questionRow.sourceLanguageCode,
            currentSourceLanguageCode: source.sourceLanguageCode,
        })
    ) {
        return false;
    }

    const optionContentIds = getSurveyQuestionOptionContentIds(source);
    if (optionContentIds.length === 0) {
        return true;
    }

    const translatedOptionRows = await db
        .select({
            surveyQuestionOptionContentId:
                surveyQuestionOptionContentTranslationTable.surveyQuestionOptionContentId,
            sourceLanguageCode:
                surveyQuestionOptionContentTranslationTable.sourceLanguageCode,
        })
        .from(surveyQuestionOptionContentTranslationTable)
        .where(
            and(
                eq(
                    surveyQuestionOptionContentTranslationTable.displayLanguageCode,
                    targetLanguageCode,
                ),
                inArray(
                    surveyQuestionOptionContentTranslationTable.surveyQuestionOptionContentId,
                    optionContentIds,
                ),
            ),
        );
    const sourceLanguageByTranslatedOptionContentId = new Map(
        translatedOptionRows.map((row) => [
            row.surveyQuestionOptionContentId,
            row.sourceLanguageCode,
        ]),
    );
    const translatedOptionContentIds = new Set(
        source.options
            .filter((option) => {
                const sourceLanguageCode =
                    sourceLanguageByTranslatedOptionContentId.get(
                        option.contentId,
                    );
                return (
                    sourceLanguageCode !== undefined &&
                    translationSourceMatchesCurrentSource({
                        translationSourceLanguageCode: sourceLanguageCode,
                        currentSourceLanguageCode: option.sourceLanguageCode,
                    })
                );
            })
            .map((option) => option.contentId),
    );
    return hasCompleteSurveyQuestionTranslation({
        questionTranslationExists: true,
        optionContentIds,
        translatedOptionContentIds,
    });
}

function shouldTranslateSurveyQuestionSource({
    source,
    targetLanguageCode,
}: {
    source: SurveyQuestionContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): boolean {
    return (
        shouldTranslateContent({
            sourceLanguageCode: source.sourceLanguageCode,
            sourceRawLanguageCode: source.sourceRawLanguageCode,
            targetLanguageCode,
        }) ||
        source.options.some((option) =>
            shouldTranslateContent({
                sourceLanguageCode: option.sourceLanguageCode,
                sourceRawLanguageCode: option.sourceRawLanguageCode,
                targetLanguageCode,
            }),
        )
    );
}

async function fetchMaterializedConversationTargetLanguageCodes({
    db,
    conversationSlugId,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
}): Promise<SupportedDisplayLanguageCodes[]> {
    const rows = await db
        .select({
            languageCode:
                conversationTranslationTargetLanguageTable.languageCode,
        })
        .from(conversationTranslationTargetLanguageTable)
        .innerJoin(
            conversationTable,
            eq(
                conversationTranslationTargetLanguageTable.conversationId,
                conversationTable.id,
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                eq(conversationTable.dynamicTranslationEnabled, true),
                isNull(conversationTranslationTargetLanguageTable.deletedAt),
            ),
        )
        .orderBy(asc(conversationTranslationTargetLanguageTable.id));

    return rows.map((row) => row.languageCode);
}

async function resolveConversationTranslationTargetLanguagePolicy({
    db,
    source,
}: {
    db: PostgresDatabase;
    source: ConversationContentSource;
}): Promise<TranslationTargetLanguagePolicy> {
    if (source.languageSettingsSource === "project_inherited") {
        return getProjectTranslationTargetLanguagePolicy({
            languageSettings: await getProjectLanguageSettings({
                db,
                projectId: source.projectId,
            }),
        });
    }

    const materializedTargetLanguageCodes = Array.from(
        new Set(
            await fetchMaterializedConversationTargetLanguageCodes({
                db,
                conversationSlugId: source.conversationSlugId,
            }),
        ),
    ).slice(0, 3);
    const detectedTargetLanguageCode = sourceLanguageToDisplayLanguage({
        sourceLanguageCode: source.sourceLanguageCode,
    });
    return getConversationOverrideTranslationTargetLanguagePolicy({
        multilingualSettings: {
            dynamicTranslationEnabled: source.dynamicTranslationEnabled,
            additionalLanguageCodes: materializedTargetLanguageCodes.filter(
                (languageCode) => languageCode !== detectedTargetLanguageCode,
            ),
        },
        detectedTargetLanguageCode,
    });
}

async function fetchConfiguredManualProjectTargetLanguageCodes({
    db,
    projectId,
}: {
    db: PostgresDatabase;
    projectId: number;
}): Promise<SupportedDisplayLanguageCodes[]> {
    const rows = await db
        .select({
            languageCode: projectTranslationTargetLanguageTable.languageCode,
        })
        .from(projectTranslationTargetLanguageTable)
        .innerJoin(
            projectTable,
            eq(
                projectTranslationTargetLanguageTable.projectId,
                projectTable.id,
            ),
        )
        .where(
            and(
                eq(projectTable.id, projectId),
                eq(projectTable.dynamicTranslationEnabled, true),
                isNull(projectTranslationTargetLanguageTable.deletedAt),
            ),
        )
        .orderBy(asc(projectTranslationTargetLanguageTable.id));

    return rows.map((row) => row.languageCode);
}

async function fetchProjectContentSource({
    db,
    projectId,
}: {
    db: PostgresDatabase;
    projectId: number;
}): Promise<ProjectContentSource | undefined> {
    const rows = await db
        .select({
            projectId: projectTable.id,
            projectSlug: projectTable.slug,
            dynamicTranslationEnabled: projectTable.dynamicTranslationEnabled,
            contentId: projectContentTable.id,
            publicId: projectContentTable.publicId,
            title: projectContentTable.title,
            subtitle: projectContentTable.subtitle,
            body: projectContentTable.body,
            sourceLanguageCode: projectContentTable.sourceLanguageCode,
            sourceRawLanguageCode: projectContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: projectContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                projectContentTable.sourceLanguageConfidence,
        })
        .from(projectTable)
        .innerJoin(
            projectContentTable,
            eq(projectContentTable.id, projectTable.currentContentId),
        )
        .where(eq(projectTable.id, projectId))
        .limit(1);
    return rows.at(0);
}

async function fetchProjectContentSourceBySlug({
    db,
    projectSlug,
}: {
    db: PostgresDatabase;
    projectSlug: string;
}): Promise<ProjectContentSource | undefined> {
    const rows = await db
        .select({
            projectId: projectTable.id,
            projectSlug: projectTable.slug,
            dynamicTranslationEnabled: projectTable.dynamicTranslationEnabled,
            contentId: projectContentTable.id,
            publicId: projectContentTable.publicId,
            title: projectContentTable.title,
            subtitle: projectContentTable.subtitle,
            body: projectContentTable.body,
            sourceLanguageCode: projectContentTable.sourceLanguageCode,
            sourceRawLanguageCode: projectContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: projectContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                projectContentTable.sourceLanguageConfidence,
        })
        .from(projectTable)
        .innerJoin(
            projectContentTable,
            eq(projectContentTable.id, projectTable.currentContentId),
        )
        .where(
            and(
                eq(projectTable.slug, projectSlug),
                eq(projectTable.directoryVisibility, "listed"),
                isNull(projectTable.deletedAt),
                isNull(projectContentTable.deletedAt),
            ),
        )
        .limit(1);
    return rows.at(0);
}

async function hasProjectContentTranslation({
    db,
    source,
    targetLanguageCode,
}: {
    db: PostgresDatabase;
    source: ProjectContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): Promise<boolean> {
    const rows = await db
        .select({
            sourceLanguageCode:
                projectContentTranslationTable.sourceLanguageCode,
            sourceKind: projectContentTranslationTable.sourceKind,
        })
        .from(projectContentTranslationTable)
        .where(
            and(
                eq(
                    projectContentTranslationTable.projectContentId,
                    source.contentId,
                ),
                eq(
                    projectContentTranslationTable.displayLanguageCode,
                    targetLanguageCode,
                ),
                isNull(projectContentTranslationTable.deletedAt),
            ),
        )
        .limit(1);
    const row = rows.at(0);
    if (row?.sourceKind === "manual") {
        return true;
    }
    return (
        row !== undefined &&
        translationSourceMatchesCurrentSource({
            translationSourceLanguageCode: row.sourceLanguageCode,
            currentSourceLanguageCode: source.sourceLanguageCode,
        })
    );
}

export async function fetchSeedOpinionSources({
    db,
    conversationId,
    conversationSlugId,
}: {
    db: PostgresDatabase;
    conversationId: number;
    conversationSlugId: string;
}): Promise<OpinionContentSource[]> {
    return await db
        .select({
            conversationId: opinionTable.conversationId,
            conversationSlugId: conversationTable.slugId,
            opinionSlugId: opinionTable.slugId,
            contentId: opinionContentTable.id,
            publicId: opinionContentTable.publicId,
            content: opinionContentTable.content,
            sourceLanguageCode: opinionContentTable.sourceLanguageCode,
            sourceRawLanguageCode: opinionContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: opinionContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                opinionContentTable.sourceLanguageConfidence,
        })
        .from(opinionTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, opinionTable.conversationId),
        )
        .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.id, opinionTable.currentContentId),
        )
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                eq(opinionTable.isSeed, true),
                isNotNull(opinionTable.currentContentId),
                eq(userTable.isDeleted, false),
            ),
        )
        .orderBy(asc(opinionTable.id));
}

export async function fetchCurrentSurveyQuestionSources({
    db,
    conversationId,
    conversationSlugId,
}: {
    db: PostgresDatabase;
    conversationId: number;
    conversationSlugId: string;
}): Promise<SurveyQuestionContentSource[]> {
    const rows = await db
        .select({
            conversationId: surveyQuestionTable.conversationId,
            conversationSlugId: conversationTable.slugId,
            questionSlugId: surveyQuestionTable.slugId,
            questionId: surveyQuestionTable.id,
            contentId: surveyQuestionContentTable.id,
            publicId: surveyQuestionContentTable.publicId,
            questionText: surveyQuestionContentTable.questionText,
            sourceLanguageCode: surveyQuestionContentTable.sourceLanguageCode,
            sourceRawLanguageCode:
                surveyQuestionContentTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                surveyQuestionContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                surveyQuestionContentTable.sourceLanguageConfidence,
            optionSlugId: surveyQuestionOptionTable.slugId,
            optionContentId: surveyQuestionOptionContentTable.id,
            optionPublicId: surveyQuestionOptionContentTable.publicId,
            optionText: surveyQuestionOptionContentTable.optionText,
            optionSourceLanguageCode:
                surveyQuestionOptionContentTable.sourceLanguageCode,
            optionSourceRawLanguageCode:
                surveyQuestionOptionContentTable.sourceRawLanguageCode,
            optionSourceLanguageProvider:
                surveyQuestionOptionContentTable.sourceLanguageProvider,
            optionSourceLanguageConfidence:
                surveyQuestionOptionContentTable.sourceLanguageConfidence,
        })
        .from(surveyQuestionTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, surveyQuestionTable.conversationId),
        )
        .innerJoin(
            surveyQuestionContentTable,
            eq(
                surveyQuestionContentTable.id,
                surveyQuestionTable.currentContentId,
            ),
        )
        .leftJoin(
            surveyQuestionOptionTable,
            eq(
                surveyQuestionOptionTable.surveyQuestionId,
                surveyQuestionTable.id,
            ),
        )
        .leftJoin(
            surveyQuestionOptionContentTable,
            eq(
                surveyQuestionOptionContentTable.id,
                surveyQuestionOptionTable.currentContentId,
            ),
        )
        .where(
            and(
                eq(surveyQuestionTable.conversationId, conversationId),
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
                isNotNull(surveyQuestionTable.currentContentId),
            ),
        )
        .orderBy(
            asc(surveyQuestionTable.displayOrder),
            asc(surveyQuestionOptionTable.displayOrder),
        );

    const sources = new Map<number, SurveyQuestionContentSource>();
    for (const row of rows) {
        const existing = sources.get(row.questionId);
        const source = existing ?? {
            conversationId: row.conversationId,
            conversationSlugId: row.conversationSlugId,
            questionSlugId: row.questionSlugId,
            questionId: row.questionId,
            contentId: row.contentId,
            publicId: row.publicId,
            questionText: row.questionText,
            sourceLanguageCode: row.sourceLanguageCode,
            sourceRawLanguageCode: row.sourceRawLanguageCode,
            sourceLanguageProvider: row.sourceLanguageProvider,
            sourceLanguageConfidence: row.sourceLanguageConfidence,
            options: [],
        };
        if (
            row.optionSlugId !== null &&
            row.optionContentId !== null &&
            row.optionPublicId !== null &&
            row.optionText !== null
        ) {
            source.options.push({
                optionSlugId: row.optionSlugId,
                contentId: row.optionContentId,
                publicId: row.optionPublicId,
                optionText: row.optionText,
                sourceLanguageCode: row.optionSourceLanguageCode,
                sourceRawLanguageCode: row.optionSourceRawLanguageCode,
                sourceLanguageProvider: row.optionSourceLanguageProvider,
                sourceLanguageConfidence: row.optionSourceLanguageConfidence,
            });
        }
        if (existing === undefined) {
            sources.set(row.questionId, source);
        }
    }
    return [...sources.values()];
}

async function ensureEagerTranslationWork({
    db,
    input,
    translationExists,
    now,
    log,
}: {
    db: PostgresDatabase;
    input: TranslationWorkInput;
    translationExists: boolean;
    now: Date;
    log: Pick<BaseLogger, "info">;
}): Promise<number | undefined> {
    const ensuredWork = await ensureTranslationWork({
        db,
        input,
        translationExists,
        now,
        log,
        priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible,
    });
    if (!ensuredWork.shouldQueue) {
        log.info(
            {
                workId: ensuredWork.workId,
                ...getTranslationWorkLogFields(input),
                queueMode: getContentTranslationQueueMode(
                    CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible,
                ),
            },
            "[ContentTranslation] Translation work not queued",
        );
        return undefined;
    }
    return ensuredWork.workId;
}

export async function scheduleEagerContentTranslationForConversation({
    db,
    valkey,
    queueScript,
    conversationSlugId,
    now,
    log,
}: ScheduleEagerContentTranslationParams): Promise<void> {
    const conversationSource = await fetchConversationSource({
        db,
        conversationSlugId,
    });
    if (conversationSource === undefined) {
        log.info(
            { conversationSlugId },
            "[ContentTranslation] Skipped eager scheduling: conversation source not found",
        );
        return;
    }
    const targetLanguagePolicy =
        await resolveConversationTranslationTargetLanguagePolicy({
            db,
            source: conversationSource,
        });
    const surveySources = await fetchCurrentSurveyQuestionSources({
        db,
        conversationId: conversationSource.conversationId,
        conversationSlugId,
    });
    const seedOpinionSources = await fetchSeedOpinionSources({
        db,
        conversationId: conversationSource.conversationId,
        conversationSlugId,
    });

    const workIds =
        await createEagerContentTranslationWorkForConversationSources({
            db,
            conversationSource,
            targetLanguagePolicy,
            surveySources,
            seedOpinionSources,
            rankingItemSources: [],
            now,
            log,
            checkExistingTranslations: true,
        });
    await enqueueEagerContentTranslationWork({
        valkey,
        queueScript,
        workIds,
        now,
        log,
    });
}

export async function createEagerContentTranslationWorkForKnownConversation({
    db,
    conversationSource,
    targetLanguagePolicy,
    surveySources,
    seedOpinionSources,
    rankingItemSources,
    now,
    log,
}: ScheduleEagerKnownConversationContentTranslationParams): Promise<number[]> {
    return await createEagerContentTranslationWorkForConversationSources({
        db,
        conversationSource,
        targetLanguagePolicy,
        surveySources,
        seedOpinionSources,
        rankingItemSources,
        now,
        log,
        checkExistingTranslations: false,
    });
}

async function createEagerContentTranslationWorkForConversationSources({
    db,
    conversationSource,
    targetLanguagePolicy,
    surveySources,
    seedOpinionSources,
    rankingItemSources,
    now,
    log,
    checkExistingTranslations,
}: ScheduleEagerKnownConversationContentTranslationParams & {
    checkExistingTranslations: boolean;
}): Promise<number[]> {
    const conversationSlugId = conversationSource.conversationSlugId;
    if (!targetLanguagePolicy.dynamicTranslationEnabled) {
        log.info(
            {
                conversationSlugId,
                conversationId: conversationSource.conversationId,
                languageSettingsSource:
                    conversationSource.languageSettingsSource,
            },
            "[ContentTranslation] Skipped eager scheduling: dynamic translation disabled",
        );
        return [];
    }
    const targetLanguageCodes =
        targetLanguagePolicy.effectiveTargetLanguageCodes;
    if (targetLanguageCodes.length === 0) {
        log.info(
            {
                conversationSlugId,
                conversationId: conversationSource.conversationId,
                languageSettingsSource:
                    conversationSource.languageSettingsSource,
                sourceLanguageCode: conversationSource.sourceLanguageCode,
                sourceRawLanguageCode: conversationSource.sourceRawLanguageCode,
                detectedTargetLanguageCode:
                    targetLanguagePolicy.detectedTargetLanguageCode,
                manualTargetLanguageCodes:
                    targetLanguagePolicy.manualTargetLanguageCodes,
            },
            "[ContentTranslation] Skipped eager scheduling: no target languages",
        );
        return [];
    }

    log.info(
        {
            conversationSlugId,
            conversationId: conversationSource.conversationId,
            projectId: conversationSource.projectId,
            languageSettingsSource: conversationSource.languageSettingsSource,
            sourceLanguageCode: conversationSource.sourceLanguageCode,
            sourceRawLanguageCode: conversationSource.sourceRawLanguageCode,
            detectedTargetLanguageCode:
                targetLanguagePolicy.detectedTargetLanguageCode,
            manualTargetLanguageCodes:
                targetLanguagePolicy.manualTargetLanguageCodes,
            effectiveTargetLanguageCodes: targetLanguageCodes,
            surveyQuestionCount: surveySources.length,
            seedOpinionCount: seedOpinionSources.length,
            rankingItemCount: rankingItemSources.length,
        },
        "[ContentTranslation] Scheduling eager conversation content translations",
    );

    const workIds: number[] = [];

    for (const targetLanguageCode of targetLanguageCodes) {
        const shouldTranslateConversation = shouldTranslateContent({
            sourceLanguageCode: conversationSource.sourceLanguageCode,
            sourceRawLanguageCode: conversationSource.sourceRawLanguageCode,
            targetLanguageCode,
        });
        const conversationTranslationExists = shouldTranslateConversation
            ? checkExistingTranslations &&
              (await hasConversationTranslation({
                  db,
                  source: conversationSource,
                  targetLanguageCode,
              }))
            : false;
        if (shouldTranslateConversation && !conversationTranslationExists) {
            const workId = await ensureEagerTranslationWork({
                db,
                input: {
                    conversationId: conversationSource.conversationId,
                    sourceKind: "conversation",
                    sourceContentId: conversationSource.contentId,
                    targetLanguageCode,
                },
                translationExists: false,
                now,
                log,
            });
            if (workId !== undefined) {
                workIds.push(workId);
            }
        } else {
            log.info(
                {
                    conversationSlugId,
                    conversationId: conversationSource.conversationId,
                    sourceKind: "conversation",
                    sourceContentId: conversationSource.contentId,
                    targetLanguageCode,
                    sourceLanguageCode: conversationSource.sourceLanguageCode,
                    sourceRawLanguageCode:
                        conversationSource.sourceRawLanguageCode,
                    skipReason: shouldTranslateConversation
                        ? "translation_exists"
                        : "source_matches_target",
                },
                "[ContentTranslation] Skipped eager translation candidate",
            );
        }

        for (const source of surveySources) {
            const shouldTranslateSurveyQuestion =
                shouldTranslateSurveyQuestionSource({
                    source,
                    targetLanguageCode,
                });
            const surveyQuestionTranslationExists =
                shouldTranslateSurveyQuestion
                    ? checkExistingTranslations &&
                      (await hasSurveyQuestionTranslation({
                          db,
                          source,
                          targetLanguageCode,
                      }))
                    : false;
            if (
                !shouldTranslateSurveyQuestion ||
                surveyQuestionTranslationExists
            ) {
                log.info(
                    {
                        conversationSlugId,
                        conversationId: source.conversationId,
                        sourceKind: "survey_question",
                        surveyQuestionContentId: source.contentId,
                        surveyQuestionOptionContentIds:
                            getSurveyQuestionOptionContentIds(source),
                        targetLanguageCode,
                        sourceLanguageCode: source.sourceLanguageCode,
                        sourceRawLanguageCode: source.sourceRawLanguageCode,
                        skipReason: shouldTranslateSurveyQuestion
                            ? "translation_exists"
                            : "source_matches_target",
                    },
                    "[ContentTranslation] Skipped eager translation candidate",
                );
                continue;
            }
            const workId = await ensureEagerTranslationWork({
                db,
                input: {
                    conversationId: source.conversationId,
                    sourceKind: "survey_question",
                    surveyQuestionContentId: source.contentId,
                    surveyQuestionOptionContentIds:
                        getSurveyQuestionOptionContentIds(source),
                    targetLanguageCode,
                },
                translationExists: false,
                now,
                log,
            });
            if (workId !== undefined) {
                workIds.push(workId);
            }
        }

        for (const source of seedOpinionSources) {
            const shouldTranslateOpinion = shouldTranslateContent({
                sourceLanguageCode: source.sourceLanguageCode,
                sourceRawLanguageCode: source.sourceRawLanguageCode,
                targetLanguageCode,
            });
            const opinionTranslationExists = shouldTranslateOpinion
                ? checkExistingTranslations &&
                  (await hasOpinionTranslation({
                      db,
                      source,
                      targetLanguageCode,
                  }))
                : false;
            if (!shouldTranslateOpinion || opinionTranslationExists) {
                log.info(
                    {
                        conversationSlugId,
                        conversationId: source.conversationId,
                        sourceKind: "opinion",
                        opinionSlugId: source.opinionSlugId,
                        sourceContentId: source.contentId,
                        targetLanguageCode,
                        sourceLanguageCode: source.sourceLanguageCode,
                        sourceRawLanguageCode: source.sourceRawLanguageCode,
                        skipReason: shouldTranslateOpinion
                            ? "translation_exists"
                            : "source_matches_target",
                    },
                    "[ContentTranslation] Skipped eager translation candidate",
                );
                continue;
            }
            const workId = await ensureEagerTranslationWork({
                db,
                input: {
                    conversationId: source.conversationId,
                    sourceKind: "opinion",
                    sourceContentId: source.contentId,
                    targetLanguageCode,
                },
                translationExists: false,
                now,
                log,
            });
            if (workId !== undefined) {
                workIds.push(workId);
            }
        }

        for (const source of rankingItemSources) {
            const shouldTranslateRankingItem = shouldTranslateContent({
                sourceLanguageCode: source.sourceLanguageCode,
                sourceRawLanguageCode: source.sourceRawLanguageCode,
                targetLanguageCode,
            });
            const rankingItemTranslationExists = shouldTranslateRankingItem
                ? checkExistingTranslations &&
                  (await hasRankingItemTranslation({
                      db,
                      source,
                      targetLanguageCode,
                  }))
                : false;
            if (!shouldTranslateRankingItem || rankingItemTranslationExists) {
                log.info(
                    {
                        conversationSlugId,
                        conversationId: source.conversationId,
                        sourceKind: "ranking_item",
                        itemSlugId: source.itemSlugId,
                        sourceContentId: source.contentId,
                        targetLanguageCode,
                        sourceLanguageCode: source.sourceLanguageCode,
                        sourceRawLanguageCode: source.sourceRawLanguageCode,
                        skipReason: shouldTranslateRankingItem
                            ? "translation_exists"
                            : "source_matches_target",
                    },
                    "[ContentTranslation] Skipped eager translation candidate",
                );
                continue;
            }
            const workId = await ensureEagerTranslationWork({
                db,
                input: {
                    conversationId: source.conversationId,
                    sourceKind: "ranking_item",
                    rankingItemContentId: source.contentId,
                    targetLanguageCode,
                },
                translationExists: false,
                now,
                log,
            });
            if (workId !== undefined) {
                workIds.push(workId);
            }
        }
    }

    return workIds;
}

export async function enqueueEagerContentTranslationWork({
    valkey,
    queueScript,
    workIds,
    now,
    log,
}: EnqueueEagerContentTranslationWorkParams): Promise<void> {
    for (const workId of workIds) {
        await queueTranslationWork({
            valkey,
            queueScript,
            workId,
            now,
            log,
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible,
        });
        log.info(
            {
                workId,
                priorityRank: CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible,
                queueMode: getContentTranslationQueueMode(
                    CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible,
                ),
            },
            "[ContentTranslation] Queued translation work",
        );
    }
}

export async function createEagerContentTranslationWorkForKnownProject({
    db,
    source,
    targetLanguagePolicy,
    now,
    log,
}: {
    db: PostgresDatabase;
    source: ProjectContentSource;
    targetLanguagePolicy: TranslationTargetLanguagePolicy;
    now: Date;
    log: Pick<BaseLogger, "info">;
}): Promise<number[]> {
    if (!source.dynamicTranslationEnabled) {
        return [];
    }
    const targetLanguageCodes =
        targetLanguagePolicy.effectiveTargetLanguageCodes;
    if (targetLanguageCodes.length === 0) {
        return [];
    }

    const workIds: number[] = [];
    for (const targetLanguageCode of targetLanguageCodes) {
        if (
            !shouldTranslateContent({
                sourceLanguageCode: source.sourceLanguageCode,
                sourceRawLanguageCode: source.sourceRawLanguageCode,
                targetLanguageCode,
            })
        ) {
            continue;
        }

        const input = {
            conversationId: null,
            sourceKind: "project" as const,
            projectContentId: source.contentId,
            targetLanguageCode,
        };
        const translationExists = await hasProjectContentTranslation({
            db,
            source,
            targetLanguageCode,
        });
        if (translationExists) {
            await markExistingTranslationWorkCompleted({
                db,
                input,
                now,
                log,
            });
            continue;
        }

        const work = await ensureTranslationWork({
            db,
            input,
            translationExists: false,
            now,
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible,
            log,
        });
        if (work.shouldQueue) {
            workIds.push(work.workId);
        }
    }

    return workIds;
}

export async function scheduleEagerContentTranslationForProject({
    db,
    valkey,
    queueScript,
    projectId,
    now,
    log,
}: ScheduleEagerProjectContentTranslationParams): Promise<void> {
    const source = await fetchProjectContentSource({ db, projectId });
    if (source === undefined) {
        return;
    }
    if (!source.dynamicTranslationEnabled) {
        return;
    }
    const manualTargetLanguageCodes =
        await fetchConfiguredManualProjectTargetLanguageCodes({
            db,
            projectId,
        });
    const targetLanguagePolicy = getProjectTranslationTargetLanguagePolicy({
        languageSettings: {
            dynamicTranslationEnabled: source.dynamicTranslationEnabled,
            defaultLanguageCode:
                sourceLanguageToDisplayLanguage({
                    sourceLanguageCode: source.sourceLanguageCode,
                }) ?? getImplicitDefaultDisplayLanguage(),
            targetLanguageCodes: manualTargetLanguageCodes,
        },
    });
    const targetLanguageCodes =
        targetLanguagePolicy.effectiveTargetLanguageCodes;
    if (targetLanguageCodes.length === 0) {
        return;
    }

    for (const targetLanguageCode of targetLanguageCodes) {
        const input = {
            conversationId: null,
            sourceKind: "project" as const,
            projectContentId: source.contentId,
            targetLanguageCode,
        };
        const translationExists = await hasProjectContentTranslation({
            db,
            source,
            targetLanguageCode,
        });
        if (
            !shouldTranslateContent({
                sourceLanguageCode: source.sourceLanguageCode,
                sourceRawLanguageCode: source.sourceRawLanguageCode,
                targetLanguageCode,
            })
        ) {
            continue;
        }

        if (translationExists) {
            await markExistingTranslationWorkCompleted({
                db,
                input,
                now,
                log,
            });
            continue;
        }

        await queueMissingTranslationWork({
            db,
            valkey,
            queueScript,
            input,
            translationExists,
            now,
            log,
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible,
        });
    }
}

async function buildSurveyQuestionResponse({
    db,
    source,
    targetLanguageCode,
    requestMode,
}: {
    db: PostgresDatabase;
    source: SurveyQuestionContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    requestMode: ContentTranslationRequestMode;
}): Promise<{
    subject: Extract<ContentTranslationSubject, { kind: "survey_question" }>;
    content: LocalizedSurveyQuestionContent;
}> {
    const questionTranslationRows = await db
        .select({
            translatedQuestionText:
                surveyQuestionContentTranslationTable.translatedQuestionText,
            sourceLanguageCode:
                surveyQuestionContentTranslationTable.sourceLanguageCode,
            sourceRawLanguageCode:
                surveyQuestionContentTranslationTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                surveyQuestionContentTranslationTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                surveyQuestionContentTranslationTable.sourceLanguageConfidence,
        })
        .from(surveyQuestionContentTranslationTable)
        .where(
            and(
                eq(
                    surveyQuestionContentTranslationTable.surveyQuestionContentId,
                    source.contentId,
                ),
                eq(
                    surveyQuestionContentTranslationTable.displayLanguageCode,
                    targetLanguageCode,
                ),
            ),
        )
        .limit(1);
    const questionTranslation = questionTranslationRows.at(0);
    const freshQuestionTranslation =
        questionTranslation !== undefined &&
        translationSourceMatchesCurrentSource({
            translationSourceLanguageCode:
                questionTranslation.sourceLanguageCode,
            currentSourceLanguageCode: source.sourceLanguageCode,
        })
            ? questionTranslation
            : undefined;
    const optionContentIds = source.options.map((option) => option.contentId);
    const optionTranslationRows =
        optionContentIds.length === 0
            ? []
            : await db
                  .select({
                      surveyQuestionOptionContentId:
                          surveyQuestionOptionContentTranslationTable.surveyQuestionOptionContentId,
                      translatedOptionText:
                          surveyQuestionOptionContentTranslationTable.translatedOptionText,
                      sourceLanguageCode:
                          surveyQuestionOptionContentTranslationTable.sourceLanguageCode,
                  })
                  .from(surveyQuestionOptionContentTranslationTable)
                  .where(
                      and(
                          eq(
                              surveyQuestionOptionContentTranslationTable.displayLanguageCode,
                              targetLanguageCode,
                          ),
                          inArray(
                              surveyQuestionOptionContentTranslationTable.surveyQuestionOptionContentId,
                              optionContentIds,
                          ),
                      ),
                  );
    const sourceLanguageByOptionContentId = new Map(
        source.options.map((option) => [
            option.contentId,
            option.sourceLanguageCode,
        ]),
    );
    const translatedOptionsByContentId = new Map(
        optionTranslationRows
            .filter((row) => {
                const currentSourceLanguageCode =
                    sourceLanguageByOptionContentId.get(
                        row.surveyQuestionOptionContentId,
                    );
                return (
                    currentSourceLanguageCode !== undefined &&
                    translationSourceMatchesCurrentSource({
                        translationSourceLanguageCode: row.sourceLanguageCode,
                        currentSourceLanguageCode,
                    })
                );
            })
            .map((row) => [
                row.surveyQuestionOptionContentId,
                row.translatedOptionText,
            ]),
    );
    const translationExists =
        freshQuestionTranslation !== undefined &&
        source.options.every((option) =>
            translatedOptionsByContentId.has(option.contentId),
        );
    const missingTranslationStatus = translationExists
        ? "not_requested"
        : await resolveMissingContentTranslationStatus({
              db,
              input: {
                  conversationId: source.conversationId,
                  sourceKind: "survey_question",
                  surveyQuestionContentId: source.contentId,
                  surveyQuestionOptionContentIds: optionContentIds,
                  targetLanguageCode,
              },
              translationExists,
              requestMode,
          });
    return buildLocalizedSurveyQuestionContent({
        source,
        translation:
            freshQuestionTranslation === undefined
                ? undefined
                : {
                      translatedQuestionText:
                          freshQuestionTranslation.translatedQuestionText,
                      sourceLanguageCode:
                          freshQuestionTranslation.sourceLanguageCode,
                      sourceRawLanguageCode:
                          freshQuestionTranslation.sourceRawLanguageCode,
                      sourceLanguageProvider:
                          freshQuestionTranslation.sourceLanguageProvider,
                      sourceLanguageConfidence:
                          freshQuestionTranslation.sourceLanguageConfidence,
                      translatedOptionsByContentId,
                  },
        targetLanguageCode,
        missingTranslationStatus,
    });
}

async function buildConversationResponse({
    db,
    source,
    targetLanguageCode,
    requestMode,
}: {
    db: PostgresDatabase;
    source: ConversationContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    requestMode: ContentTranslationRequestMode;
}): Promise<{
    subject: Extract<ContentTranslationSubject, { kind: "conversation" }>;
    content: LocalizedConversationContent;
}> {
    const translationRows = await db
        .select({
            translatedTitle:
                conversationContentTranslationTable.translatedTitle,
            translatedBody: conversationContentTranslationTable.translatedBody,
            sourceLanguageCode:
                conversationContentTranslationTable.sourceLanguageCode,
            sourceRawLanguageCode:
                conversationContentTranslationTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                conversationContentTranslationTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                conversationContentTranslationTable.sourceLanguageConfidence,
        })
        .from(conversationContentTranslationTable)
        .where(
            and(
                eq(
                    conversationContentTranslationTable.conversationContentId,
                    source.contentId,
                ),
                eq(
                    conversationContentTranslationTable.displayLanguageCode,
                    targetLanguageCode,
                ),
            ),
        )
        .limit(1);
    const translation = translationRows.at(0);
    const freshTranslation =
        translation !== undefined &&
        translationSourceMatchesCurrentSource({
            translationSourceLanguageCode: translation.sourceLanguageCode,
            currentSourceLanguageCode: source.sourceLanguageCode,
        })
            ? translation
            : undefined;
    const original = { title: source.title, body: source.body ?? undefined };

    if (freshTranslation !== undefined) {
        return {
            subject: {
                kind: "conversation",
                conversationSlugId: source.conversationSlugId,
            },
            content: {
                kind: "translatable",
                sourceVersion: source.publicId,
                initialMode: "translated",
                translation: {
                    ...buildTranslationMetadata({
                        targetLanguageCode,
                        sourceMetadata: source,
                        status: "completed",
                    }),
                },
                variants: {
                    original,
                    translated: {
                        title: freshTranslation.translatedTitle,
                        body: freshTranslation.translatedBody ?? undefined,
                    },
                },
            },
        };
    }

    return {
        subject: {
            kind: "conversation",
            conversationSlugId: source.conversationSlugId,
        },
        content: {
            kind: "translatable",
            sourceVersion: source.publicId,
            initialMode: "original",
            translation: {
                ...buildTranslationMetadata({
                    targetLanguageCode,
                    sourceMetadata: source,
                    status: await resolveMissingContentTranslationStatus({
                        db,
                        input: {
                            conversationId: source.conversationId,
                            sourceKind: "conversation",
                            sourceContentId: source.contentId,
                            targetLanguageCode,
                        },
                        translationExists: false,
                        requestMode,
                    }),
                }),
            },
            variants: {
                original,
            },
        },
    };
}

async function buildProjectResponse({
    db,
    source,
    targetLanguageCode,
    requestMode,
}: {
    db: PostgresDatabase;
    source: ProjectContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    requestMode: ContentTranslationRequestMode;
}): Promise<{
    subject: Extract<ContentTranslationSubject, { kind: "project" }>;
    content: LocalizedProjectContent;
}> {
    const translationRows = await db
        .select({
            translatedTitle: projectContentTranslationTable.translatedTitle,
            translatedSubtitle:
                projectContentTranslationTable.translatedSubtitle,
            translatedBody: projectContentTranslationTable.translatedBody,
            sourceKind: projectContentTranslationTable.sourceKind,
            sourceLanguageCode:
                projectContentTranslationTable.sourceLanguageCode,
            sourceRawLanguageCode:
                projectContentTranslationTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                projectContentTranslationTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                projectContentTranslationTable.sourceLanguageConfidence,
        })
        .from(projectContentTranslationTable)
        .where(
            and(
                eq(
                    projectContentTranslationTable.projectContentId,
                    source.contentId,
                ),
                eq(
                    projectContentTranslationTable.displayLanguageCode,
                    targetLanguageCode,
                ),
                isNull(projectContentTranslationTable.deletedAt),
            ),
        )
        .limit(1);
    const translation = translationRows.at(0);
    const original = {
        title: source.title,
        subtitle: source.subtitle ?? undefined,
        bodyHtml: source.body ?? undefined,
    };
    const subject = {
        kind: "project" as const,
        projectSlug: source.projectSlug,
    };
    const sourceVersion = source.publicId;

    if (translation?.sourceKind === "manual") {
        return {
            subject,
            content: {
                kind: "original_only",
                sourceVersion,
                initialMode: "original",
                variants: {
                    original: {
                        title: translation.translatedTitle,
                        subtitle: translation.translatedSubtitle ?? undefined,
                        bodyHtml: translation.translatedBody ?? undefined,
                    },
                },
            },
        };
    }

    const freshTranslation =
        translation !== undefined &&
        translationSourceMatchesCurrentSource({
            translationSourceLanguageCode: translation.sourceLanguageCode,
            currentSourceLanguageCode: source.sourceLanguageCode,
        })
            ? translation
            : undefined;

    if (freshTranslation !== undefined) {
        return {
            subject,
            content: {
                kind: "translatable",
                sourceVersion,
                initialMode: "translated",
                translation: {
                    ...buildTranslationMetadata({
                        targetLanguageCode,
                        sourceMetadata: source,
                        status: "completed",
                    }),
                },
                variants: {
                    original,
                    translated: {
                        title: freshTranslation.translatedTitle,
                        subtitle:
                            freshTranslation.translatedSubtitle ?? undefined,
                        bodyHtml: freshTranslation.translatedBody ?? undefined,
                    },
                },
            },
        };
    }

    return {
        subject,
        content: {
            kind: "translatable",
            sourceVersion,
            initialMode: "original",
            translation: {
                ...buildTranslationMetadata({
                    targetLanguageCode,
                    sourceMetadata: source,
                    status: await resolveMissingContentTranslationStatus({
                        db,
                        input: {
                            conversationId: null,
                            sourceKind: "project",
                            projectContentId: source.contentId,
                            targetLanguageCode,
                        },
                        translationExists: false,
                        requestMode,
                    }),
                }),
            },
            variants: {
                original,
            },
        },
    };
}

async function buildRankingItemResponse({
    db,
    source,
    targetLanguageCode,
    requestMode,
}: {
    db: PostgresDatabase;
    source: RankingItemContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    requestMode: ContentTranslationRequestMode;
}): Promise<{
    subject: Extract<ContentTranslationSubject, { kind: "ranking_item" }>;
    content: LocalizedRankingItemContent;
}> {
    const translationRows = await db
        .select({
            translatedTitle: rankingItemContentTranslationTable.translatedTitle,
            translatedBodyHtml:
                rankingItemContentTranslationTable.translatedBodyHtml,
            sourceLanguageCode:
                rankingItemContentTranslationTable.sourceLanguageCode,
            sourceRawLanguageCode:
                rankingItemContentTranslationTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                rankingItemContentTranslationTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                rankingItemContentTranslationTable.sourceLanguageConfidence,
        })
        .from(rankingItemContentTranslationTable)
        .where(
            and(
                eq(
                    rankingItemContentTranslationTable.rankingItemContentId,
                    source.contentId,
                ),
                eq(
                    rankingItemContentTranslationTable.displayLanguageCode,
                    targetLanguageCode,
                ),
            ),
        )
        .limit(1);
    const translation = translationRows.at(0);
    const freshTranslation =
        translation !== undefined &&
        translationSourceMatchesCurrentSource({
            translationSourceLanguageCode: translation.sourceLanguageCode,
            currentSourceLanguageCode: source.sourceLanguageCode,
        })
            ? translation
            : undefined;
    return buildLocalizedRankingItemContent({
        source,
        translation: freshTranslation,
        targetLanguageCode,
        missingTranslationStatus:
            freshTranslation === undefined
                ? await resolveMissingContentTranslationStatus({
                      db,
                      input: {
                          conversationId: source.conversationId,
                          sourceKind: "ranking_item",
                          rankingItemContentId: source.contentId,
                          targetLanguageCode,
                      },
                      translationExists: false,
                      requestMode,
                  })
                : "not_requested",
    });
}

async function buildOpinionResponse({
    db,
    source,
    targetLanguageCode,
    requestMode,
}: {
    db: PostgresDatabase;
    source: OpinionContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    requestMode: ContentTranslationRequestMode;
}): Promise<{
    subject: Extract<ContentTranslationSubject, { kind: "opinion" }>;
    content: LocalizedOpinionContent;
}> {
    const translationRows = await db
        .select({
            translatedContent: opinionContentTranslationTable.translatedContent,
            sourceLanguageCode:
                opinionContentTranslationTable.sourceLanguageCode,
            sourceRawLanguageCode:
                opinionContentTranslationTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                opinionContentTranslationTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                opinionContentTranslationTable.sourceLanguageConfidence,
        })
        .from(opinionContentTranslationTable)
        .where(
            and(
                eq(
                    opinionContentTranslationTable.opinionContentId,
                    source.contentId,
                ),
                eq(
                    opinionContentTranslationTable.displayLanguageCode,
                    targetLanguageCode,
                ),
            ),
        )
        .limit(1);
    const translation = translationRows.at(0);
    const freshTranslation =
        translation !== undefined &&
        translationSourceMatchesCurrentSource({
            translationSourceLanguageCode: translation.sourceLanguageCode,
            currentSourceLanguageCode: source.sourceLanguageCode,
        })
            ? translation
            : undefined;
    const original = { content: source.content };

    if (freshTranslation !== undefined) {
        return {
            subject: {
                kind: "opinion",
                conversationSlugId: source.conversationSlugId,
                opinionSlugId: source.opinionSlugId,
                sourceVersion: source.publicId,
            },
            content: {
                kind: "translatable",
                sourceVersion: source.publicId,
                initialMode: "translated",
                translation: {
                    ...buildTranslationMetadata({
                        targetLanguageCode,
                        sourceMetadata: source,
                        status: "completed",
                    }),
                },
                variants: {
                    original,
                    translated: { content: freshTranslation.translatedContent },
                },
            },
        };
    }

    return {
        subject: {
            kind: "opinion",
            conversationSlugId: source.conversationSlugId,
            opinionSlugId: source.opinionSlugId,
            sourceVersion: source.publicId,
        },
        content: {
            kind: "translatable",
            sourceVersion: source.publicId,
            initialMode: "original",
            translation: {
                ...buildTranslationMetadata({
                    targetLanguageCode,
                    sourceMetadata: source,
                    status: await resolveMissingContentTranslationStatus({
                        db,
                        input: {
                            conversationId: source.conversationId,
                            sourceKind: "opinion",
                            sourceContentId: source.contentId,
                            targetLanguageCode,
                        },
                        translationExists: false,
                        requestMode,
                    }),
                }),
            },
            variants: {
                original,
            },
        },
    };
}

export async function requestContentTranslation({
    db,
    valkey,
    queueScript,
    subject,
    targetLanguageCode,
    requestMode,
    requesterIsSiteModerator,
    now,
    log,
    beforeQueueTranslationWork,
}: RequestContentTranslationParams) {
    if (subject.kind === "project") {
        return await requestProjectContentTranslation({
            db,
            valkey,
            queueScript,
            projectSlug: subject.projectSlug,
            targetLanguageCode,
            requestMode,
            now,
            log,
            beforeQueueTranslationWork,
        });
    }

    if (subject.kind === "survey_question") {
        const source = await fetchSurveyQuestionSource({
            db,
            conversationSlugId: subject.conversationSlugId,
            questionSlugId: subject.questionSlugId,
        });
        if (source === undefined) {
            return undefined;
        }
        const translationExists = await hasSurveyQuestionTranslation({
            db,
            source,
            targetLanguageCode,
        });
        const skipTranslation = !shouldTranslateSurveyQuestionSource({
            source,
            targetLanguageCode,
        });
        const effectiveRequestMode = skipTranslation
            ? "read_existing"
            : requestMode;
        if (
            shouldQueueTranslationWork({
                requestMode: effectiveRequestMode,
                translationExists,
            }) &&
            !skipTranslation
        ) {
            await beforeQueueTranslationWork();
            await queueMissingTranslationWork({
                db,
                valkey,
                queueScript,
                input: {
                    conversationId: source.conversationId,
                    sourceKind: "survey_question",
                    surveyQuestionContentId: source.contentId,
                    surveyQuestionOptionContentIds:
                        getSurveyQuestionOptionContentIds(source),
                    targetLanguageCode,
                },
                translationExists,
                now,
                log,
                priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
            });
        }
        return await buildSurveyQuestionResponse({
            db,
            source,
            targetLanguageCode,
            requestMode: effectiveRequestMode,
        });
    }

    if (subject.kind === "conversation") {
        const source = await fetchConversationSource({
            db,
            conversationSlugId: subject.conversationSlugId,
        });
        if (source === undefined) {
            return undefined;
        }
        const translationExists = await hasConversationTranslation({
            db,
            source,
            targetLanguageCode,
        });
        const skipTranslation = !shouldTranslateContent({
            sourceLanguageCode: source.sourceLanguageCode,
            sourceRawLanguageCode: source.sourceRawLanguageCode,
            targetLanguageCode,
        });
        const effectiveRequestMode = skipTranslation
            ? "read_existing"
            : requestMode;
        if (
            shouldQueueTranslationWork({
                requestMode: effectiveRequestMode,
                translationExists,
            }) &&
            !skipTranslation
        ) {
            await beforeQueueTranslationWork();
            await queueMissingTranslationWork({
                db,
                valkey,
                queueScript,
                input: {
                    conversationId: source.conversationId,
                    sourceKind: "conversation",
                    sourceContentId: source.contentId,
                    targetLanguageCode,
                },
                translationExists,
                now,
                log,
                priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
            });
        }
        return await buildConversationResponse({
            db,
            source,
            targetLanguageCode,
            requestMode: effectiveRequestMode,
        });
    }

    if (subject.kind === "ranking_item") {
        const source = await fetchRankingItemSource({
            db,
            conversationSlugId: subject.conversationSlugId,
            itemSlugId: subject.itemSlugId,
            sourceVersion: subject.sourceVersion,
        });
        if (source === undefined) {
            return undefined;
        }
        const translationExists = await hasRankingItemTranslation({
            db,
            source,
            targetLanguageCode,
        });
        const skipTranslation = !shouldTranslateContent({
            sourceLanguageCode: source.sourceLanguageCode,
            sourceRawLanguageCode: source.sourceRawLanguageCode,
            targetLanguageCode,
        });
        const effectiveRequestMode = skipTranslation
            ? "read_existing"
            : requestMode;
        if (
            shouldQueueTranslationWork({
                requestMode: effectiveRequestMode,
                translationExists,
            }) &&
            !skipTranslation
        ) {
            await beforeQueueTranslationWork();
            await queueMissingTranslationWork({
                db,
                valkey,
                queueScript,
                input: {
                    conversationId: source.conversationId,
                    sourceKind: "ranking_item",
                    rankingItemContentId: source.contentId,
                    targetLanguageCode,
                },
                translationExists,
                now,
                log,
                priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
            });
        }
        return await buildRankingItemResponse({
            db,
            source,
            targetLanguageCode,
            requestMode: effectiveRequestMode,
        });
    }

    const source = await fetchOpinionSource({
        db,
        conversationSlugId: subject.conversationSlugId,
        opinionSlugId: subject.opinionSlugId,
        sourceVersion: subject.sourceVersion,
        requesterIsSiteModerator,
    });
    if (source === undefined) {
        return undefined;
    }
    const translationExists = await hasOpinionTranslation({
        db,
        source,
        targetLanguageCode,
    });
    const skipTranslation = !shouldTranslateContent({
        sourceLanguageCode: source.sourceLanguageCode,
        sourceRawLanguageCode: source.sourceRawLanguageCode,
        targetLanguageCode,
    });
    const effectiveRequestMode =
        skipTranslation || source.isHidden ? "read_existing" : requestMode;
    if (
        shouldQueueTranslationWork({
            requestMode: effectiveRequestMode,
            translationExists,
        }) &&
        !skipTranslation
    ) {
        await beforeQueueTranslationWork();
        await queueMissingTranslationWork({
            db,
            valkey,
            queueScript,
            input: {
                conversationId: source.conversationId,
                sourceKind: "opinion",
                sourceContentId: source.contentId,
                targetLanguageCode,
            },
            translationExists,
            now,
            log,
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
        });
    }
    return await buildOpinionResponse({
        db,
        source,
        targetLanguageCode,
        requestMode: effectiveRequestMode,
    });
}

export async function requestProjectContentTranslation({
    db,
    valkey,
    queueScript,
    projectSlug,
    sourceVersion,
    targetLanguageCode,
    requestMode,
    now,
    log,
    beforeQueueTranslationWork,
}: RequestProjectContentTranslationParams) {
    const source = await fetchProjectContentSourceBySlug({
        db,
        projectSlug,
    });
    if (source === undefined) {
        return undefined;
    }
    if (sourceVersion !== undefined && source.publicId !== sourceVersion) {
        return undefined;
    }
    const translationExists = await hasProjectContentTranslation({
        db,
        source,
        targetLanguageCode,
    });
    const skipTranslation = !shouldTranslateContent({
        sourceLanguageCode: source.sourceLanguageCode,
        sourceRawLanguageCode: source.sourceRawLanguageCode,
        targetLanguageCode,
    });
    const effectiveRequestMode = skipTranslation
        ? "read_existing"
        : requestMode;
    if (
        shouldQueueTranslationWork({
            requestMode: effectiveRequestMode,
            translationExists,
        }) &&
        !skipTranslation
    ) {
        await beforeQueueTranslationWork();
        await queueMissingTranslationWork({
            db,
            valkey,
            queueScript,
            input: {
                conversationId: null,
                sourceKind: "project",
                projectContentId: source.contentId,
                targetLanguageCode,
            },
            translationExists,
            now,
            log,
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
        });
    }
    return await buildProjectResponse({
        db,
        source,
        targetLanguageCode,
        requestMode: effectiveRequestMode,
    });
}

export async function requestConversationContentTranslation({
    db,
    valkey,
    queueScript,
    conversationSlugId,
    sourceVersion,
    targetLanguageCode,
    requestMode,
    now,
    log,
    beforeQueueTranslationWork,
}: RequestConversationContentTranslationParams) {
    const source = await fetchConversationSource({
        db,
        conversationSlugId,
    });
    if (source === undefined) {
        return undefined;
    }
    if (sourceVersion !== undefined && source.publicId !== sourceVersion) {
        return undefined;
    }
    const translationExists = await hasConversationTranslation({
        db,
        source,
        targetLanguageCode,
    });
    const skipTranslation = !shouldTranslateContent({
        sourceLanguageCode: source.sourceLanguageCode,
        sourceRawLanguageCode: source.sourceRawLanguageCode,
        targetLanguageCode,
    });
    const effectiveRequestMode = skipTranslation
        ? "read_existing"
        : requestMode;
    if (
        shouldQueueTranslationWork({
            requestMode: effectiveRequestMode,
            translationExists,
        }) &&
        !skipTranslation
    ) {
        await beforeQueueTranslationWork();
        await queueMissingTranslationWork({
            db,
            valkey,
            queueScript,
            input: {
                conversationId: source.conversationId,
                sourceKind: "conversation",
                sourceContentId: source.contentId,
                targetLanguageCode,
            },
            translationExists,
            now,
            log,
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
        });
    }
    return await buildConversationResponse({
        db,
        source,
        targetLanguageCode,
        requestMode: effectiveRequestMode,
    });
}

export async function requestSurveyQuestionContentTranslation({
    db,
    valkey,
    queueScript,
    conversationSlugId,
    questionSlugId,
    targetLanguageCode,
    requestMode,
    now,
    log,
    beforeQueueTranslationWork,
}: RequestSurveyQuestionContentTranslationParams) {
    const source = await fetchSurveyQuestionSource({
        db,
        conversationSlugId,
        questionSlugId,
    });
    if (source === undefined) {
        return undefined;
    }
    const translationExists = await hasSurveyQuestionTranslation({
        db,
        source,
        targetLanguageCode,
    });
    const skipTranslation = !shouldTranslateSurveyQuestionSource({
        source,
        targetLanguageCode,
    });
    const effectiveRequestMode = skipTranslation
        ? "read_existing"
        : requestMode;
    if (
        shouldQueueTranslationWork({
            requestMode: effectiveRequestMode,
            translationExists,
        }) &&
        !skipTranslation
    ) {
        await beforeQueueTranslationWork();
        await queueMissingTranslationWork({
            db,
            valkey,
            queueScript,
            input: {
                conversationId: source.conversationId,
                sourceKind: "survey_question",
                surveyQuestionContentId: source.contentId,
                surveyQuestionOptionContentIds:
                    getSurveyQuestionOptionContentIds(source),
                targetLanguageCode,
            },
            translationExists,
            now,
            log,
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
        });
    }
    return await buildSurveyQuestionResponse({
        db,
        source,
        targetLanguageCode,
        requestMode: effectiveRequestMode,
    });
}
