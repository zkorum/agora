import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import type { Script } from "@valkey/valkey-glide";
import type { BaseLogger } from "pino";
import {
    contentTranslationWorkTable,
    conversationContentTable,
    conversationContentTranslationTable,
    conversationLanguageSettingTable,
    conversationTable,
    conversationTranslationSettingTable,
    conversationTranslationTargetLanguageTable,
    opinionContentTable,
    opinionContentTranslationTable,
    opinionTable,
    surveyQuestionContentTable,
    surveyQuestionContentTranslationTable,
    surveyQuestionOptionContentTable,
    surveyQuestionOptionContentTranslationTable,
    surveyQuestionOptionTable,
    surveyQuestionTable,
} from "@/shared-backend/schema.js";
import {
    CONTENT_TRANSLATION_QUEUE_PRIORITIES,
    type ContentTranslationQueuePriority,
    enqueueContentTranslationWork,
} from "@/shared-backend/contentTranslationQueue.js";
import {
    shouldSkipTranslation,
    translationSourceMatchesCurrentSource,
} from "@/shared-backend/translate.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import type {
    LanguageDetectionProvider,
    ContentTranslationSubject,
    LocalizedConversationContent,
    LocalizedOpinionContent,
    LocalizedSurveyQuestionContent,
} from "@/shared/types/zod.js";
import type {
    SupportedDisplayLanguageCodes,
    SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import {
    buildLocalizedSurveyQuestionContent,
    buildTranslationMetadata,
    hasCompleteSurveyQuestionTranslation,
    shouldQueueTranslationWork,
} from "./contentTranslationContent.js";
import type { ContentTranslationRequestMode } from "./contentTranslationContent.js";

interface RequestContentTranslationParams {
    db: PostgresDatabase;
    valkey: Valkey | undefined;
    queueScript: Script;
    subject: ContentTranslationSubject;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    requestMode: ContentTranslationRequestMode;
    now: Date;
    log: Pick<BaseLogger, "info" | "error">;
    beforeQueueTranslationWork: () => Promise<void>;
}

interface ScheduleEagerContentTranslationParams {
    db: PostgresDatabase;
    valkey: Valkey | undefined;
    queueScript: Script;
    conversationSlugId: string;
    now: Date;
    log: Pick<BaseLogger, "info" | "error">;
}

interface ConversationContentSource {
    conversationId: number;
    conversationSlugId: string;
    contentId: number;
    title: string;
    body: string | null;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}

interface OpinionContentSource {
    conversationId: number;
    conversationSlugId: string;
    opinionSlugId: string;
    contentId: number;
    content: string;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}

interface SurveyQuestionOptionContentSource {
    optionSlugId: string;
    contentId: number;
    optionText: string;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}

interface SurveyQuestionContentSource {
    conversationId: number;
    conversationSlugId: string;
    questionSlugId: string;
    questionId: number;
    contentId: number;
    questionText: string;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
    options: SurveyQuestionOptionContentSource[];
}

type TranslationWorkInput =
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
      };

async function ensureTranslationWork({
    db,
    input,
    now,
    priority,
    log,
}: {
    db: PostgresDatabase;
    input: TranslationWorkInput;
    now: Date;
    priority: ContentTranslationQueuePriority;
    log: Pick<BaseLogger, "info">;
}): Promise<{ workId: number; shouldQueue: boolean }> {
    const sourceWhere =
        input.sourceKind === "conversation"
            ? eq(contentTranslationWorkTable.conversationContentId, input.sourceContentId)
            : input.sourceKind === "opinion"
              ? eq(contentTranslationWorkTable.opinionContentId, input.sourceContentId)
              : and(
                    eq(
                        contentTranslationWorkTable.surveyQuestionContentId,
                        input.surveyQuestionContentId,
                    ),
                    eq(
                        contentTranslationWorkTable.surveyQuestionOptionContentIds,
                        input.surveyQuestionOptionContentIds,
                    ),
                );

    const existingRows = await db
        .select({
            id: contentTranslationWorkTable.id,
            status: contentTranslationWorkTable.status,
            priorityRank: contentTranslationWorkTable.priorityRank,
        })
        .from(contentTranslationWorkTable)
        .where(
            and(
                eq(contentTranslationWorkTable.sourceKind, input.sourceKind),
                sourceWhere,
                eq(
                    contentTranslationWorkTable.displayLanguageCode,
                    input.targetLanguageCode,
                ),
            ),
        )
        .limit(1);
    const existing = existingRows.at(0);

    if (existing !== undefined) {
        const nextPriorityRank = Math.min(
            existing.priorityRank,
            priority,
        );
        await db
            .update(contentTranslationWorkTable)
            .set({
                status: existing.status === "completed" ? "completed" : "pending",
                priorityRank: nextPriorityRank,
                leaseOwner: null,
                leaseToken: null,
                leaseExpiresAt: null,
                lastErrorCode: null,
                lastErrorMessage: null,
                requestedAt: now,
                failedAt: null,
                updatedAt: now,
            })
            .where(eq(contentTranslationWorkTable.id, existing.id));
        log.info(
            {
                workId: existing.id,
                sourceKind: input.sourceKind,
                targetLanguageCode: input.targetLanguageCode,
                previousStatus: existing.status,
                previousPriorityRank: existing.priorityRank,
                nextPriorityRank,
                shouldQueue: existing.status !== "completed",
            },
            "[ContentTranslation] Reused translation work row",
        );
        return {
            workId: existing.id,
            shouldQueue: existing.status !== "completed",
        };
    }

    const insertValues = {
        conversationId: input.conversationId,
        sourceKind: input.sourceKind,
        conversationContentId:
            input.sourceKind === "conversation" ? input.sourceContentId : null,
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
        displayLanguageCode: input.targetLanguageCode,
        status: "pending" as const,
        priorityRank: priority,
        requestedAt: now,
        createdAt: now,
        updatedAt: now,
    };

    const insertedRows = await db
        .insert(contentTranslationWorkTable)
        .values(insertValues)
        .returning({ id: contentTranslationWorkTable.id });
    const inserted = insertedRows.at(0);
    if (inserted === undefined) {
        throw new Error("Failed to create content translation work row");
    }
    log.info(
        {
            workId: inserted.id,
            sourceKind: input.sourceKind,
            targetLanguageCode: input.targetLanguageCode,
            priorityRank: priority,
        },
        "[ContentTranslation] Created translation work row",
    );
    return { workId: inserted.id, shouldQueue: true };
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
    now,
    log,
    priority,
}: {
    db: PostgresDatabase;
    valkey: Valkey | undefined;
    queueScript: Script;
    input: TranslationWorkInput;
    now: Date;
    log: Pick<BaseLogger, "info" | "error">;
    priority: ContentTranslationQueuePriority;
}): Promise<void> {
    const ensuredWork = await ensureTranslationWork({
        db,
        input,
        now,
        priority,
        log,
    });
    if (!ensuredWork.shouldQueue) {
        log.info(
            {
                workId: ensuredWork.workId,
                sourceKind: input.sourceKind,
                targetLanguageCode: input.targetLanguageCode,
            },
            "[ContentTranslation] Translation work already completed",
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
            sourceKind: input.sourceKind,
            targetLanguageCode: input.targetLanguageCode,
            priorityRank: priority,
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
            contentId: conversationContentTable.id,
            title: conversationContentTable.title,
            body: conversationContentTable.body,
            sourceLanguageCode: conversationContentTable.sourceLanguageCode,
            sourceRawLanguageCode: conversationContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: conversationContentTable.sourceLanguageProvider,
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
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
    opinionSlugId: string;
}): Promise<OpinionContentSource | undefined> {
    const rows = await db
        .select({
            conversationId: conversationTable.id,
            conversationSlugId: conversationTable.slugId,
            opinionSlugId: opinionTable.slugId,
            contentId: opinionContentTable.id,
            content: opinionContentTable.content,
            sourceLanguageCode: opinionContentTable.sourceLanguageCode,
            sourceRawLanguageCode: opinionContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: opinionContentTable.sourceLanguageProvider,
            sourceLanguageConfidence: opinionContentTable.sourceLanguageConfidence,
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
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(opinionTable.slugId, opinionSlugId),
                isNotNull(opinionTable.currentContentId),
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
            questionText: surveyQuestionContentTable.questionText,
            sourceLanguageCode: surveyQuestionContentTable.sourceLanguageCode,
            sourceRawLanguageCode: surveyQuestionContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: surveyQuestionContentTable.sourceLanguageProvider,
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
            eq(surveyQuestionContentTable.id, surveyQuestionTable.currentContentId),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
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
                eq(surveyQuestionOptionTable.surveyQuestionId, question.questionId),
                isNotNull(surveyQuestionOptionTable.currentContentId),
            ),
        )
        .orderBy(asc(surveyQuestionOptionTable.displayOrder));

    return { ...question, options };
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
        .select({ sourceLanguageCode: opinionContentTranslationTable.sourceLanguageCode })
        .from(opinionContentTranslationTable)
        .where(
            and(
                eq(opinionContentTranslationTable.opinionContentId, source.contentId),
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

    const optionContentIds = source.options.map((option) => option.contentId);
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
                    sourceLanguageByTranslatedOptionContentId.get(option.contentId);
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

function shouldTranslateContent({
    sourceLanguageCode,
    targetLanguageCode,
}: {
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): boolean {
    return !shouldSkipTranslation({
        sourceLanguageCode: sourceLanguageCode ?? undefined,
        targetLanguageCode,
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
            targetLanguageCode,
        }) ||
        source.options.some((option) =>
            shouldTranslateContent({
                sourceLanguageCode: option.sourceLanguageCode,
                targetLanguageCode,
            }),
        )
    );
}

async function fetchConfiguredTargetLanguageCodes({
    db,
    conversationSlugId,
}: {
    db: PostgresDatabase;
    conversationSlugId: string;
}): Promise<SupportedDisplayLanguageCodes[]> {
    const rows = await db
        .select({
            mode: conversationLanguageSettingTable.mode,
            languageCode: conversationLanguageSettingTable.languageCode,
            detectedLanguageCode:
                conversationLanguageSettingTable.detectedLanguageCode,
            additionalLanguageCode:
                conversationTranslationTargetLanguageTable.languageCode,
        })
        .from(conversationTable)
        .innerJoin(
            conversationTranslationSettingTable,
            eq(
                conversationTranslationSettingTable.conversationId,
                conversationTable.id,
            ),
        )
        .leftJoin(
            conversationLanguageSettingTable,
            eq(
                conversationLanguageSettingTable.conversationId,
                conversationTable.id,
            ),
        )
        .leftJoin(
            conversationTranslationTargetLanguageTable,
            eq(
                conversationTranslationTargetLanguageTable.translationSettingId,
                conversationTranslationSettingTable.id,
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(
                    conversationTranslationSettingTable.dynamicTranslationEnabled,
                    true,
                ),
            ),
        )
        .orderBy(asc(conversationTranslationTargetLanguageTable.id));

    const targetLanguageCodes: SupportedDisplayLanguageCodes[] = [];
    const seenTargetLanguageCodes = new Set<SupportedDisplayLanguageCodes>();
    for (const row of rows) {
        const mainLanguageCode =
            row.mode === "manual"
                ? row.languageCode
                : row.mode === "auto"
                  ? row.detectedLanguageCode
                  : null;
        if (
            mainLanguageCode !== null &&
            !seenTargetLanguageCodes.has(mainLanguageCode)
        ) {
            targetLanguageCodes.push(mainLanguageCode);
            seenTargetLanguageCodes.add(mainLanguageCode);
        }
        if (
            row.additionalLanguageCode !== null &&
            !seenTargetLanguageCodes.has(row.additionalLanguageCode)
        ) {
            targetLanguageCodes.push(row.additionalLanguageCode);
            seenTargetLanguageCodes.add(row.additionalLanguageCode);
        }
    }
    return targetLanguageCodes;
}

async function fetchSeedOpinionSources({
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
            content: opinionContentTable.content,
            sourceLanguageCode: opinionContentTable.sourceLanguageCode,
            sourceRawLanguageCode: opinionContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: opinionContentTable.sourceLanguageProvider,
            sourceLanguageConfidence: opinionContentTable.sourceLanguageConfidence,
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
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                eq(conversationTable.slugId, conversationSlugId),
                eq(opinionTable.isSeed, true),
                isNotNull(opinionTable.currentContentId),
            ),
        )
        .orderBy(asc(opinionTable.id));
}

async function fetchCurrentSurveyQuestionSources({
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
            questionText: surveyQuestionContentTable.questionText,
            sourceLanguageCode: surveyQuestionContentTable.sourceLanguageCode,
            sourceRawLanguageCode: surveyQuestionContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: surveyQuestionContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                surveyQuestionContentTable.sourceLanguageConfidence,
            optionSlugId: surveyQuestionOptionTable.slugId,
            optionContentId: surveyQuestionOptionContentTable.id,
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
            eq(surveyQuestionContentTable.id, surveyQuestionTable.currentContentId),
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
            row.optionText !== null
        ) {
            source.options.push({
                optionSlugId: row.optionSlugId,
                contentId: row.optionContentId,
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

async function ensureAndQueueEagerTranslationWork({
    db,
    valkey,
    queueScript,
    input,
    now,
    log,
}: {
    db: PostgresDatabase;
    valkey: Valkey | undefined;
    queueScript: Script;
    input: TranslationWorkInput;
    now: Date;
    log: Pick<BaseLogger, "info" | "error">;
}): Promise<void> {
    await queueMissingTranslationWork({
        db,
        valkey,
        queueScript,
        input,
        now,
        log,
        priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.eagerVisible,
    });
}

export async function scheduleEagerContentTranslationForConversation({
    db,
    valkey,
    queueScript,
    conversationSlugId,
    now,
    log,
}: ScheduleEagerContentTranslationParams): Promise<void> {
    const targetLanguageCodes = await fetchConfiguredTargetLanguageCodes({
        db,
        conversationSlugId,
    });
    if (targetLanguageCodes.length === 0) {
        return;
    }

    const conversationSource = await fetchConversationSource({
        db,
        conversationSlugId,
    });
    if (conversationSource === undefined) {
        return;
    }
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

    for (const targetLanguageCode of targetLanguageCodes) {
        if (
            shouldTranslateContent({
                sourceLanguageCode: conversationSource.sourceLanguageCode,
                targetLanguageCode,
            }) &&
            !(await hasConversationTranslation({
                db,
                source: conversationSource,
                targetLanguageCode,
            }))
        ) {
            await ensureAndQueueEagerTranslationWork({
                db,
                valkey,
                queueScript,
                input: {
                    conversationId: conversationSource.conversationId,
                    sourceKind: "conversation",
                    sourceContentId: conversationSource.contentId,
                    targetLanguageCode,
                },
                now,
                log,
            });
        }

        for (const source of surveySources) {
            if (
                !shouldTranslateSurveyQuestionSource({
                    source,
                    targetLanguageCode,
                }) ||
                (await hasSurveyQuestionTranslation({
                    db,
                    source,
                    targetLanguageCode,
                }))
            ) {
                continue;
            }
            await ensureAndQueueEagerTranslationWork({
                db,
                valkey,
                queueScript,
                input: {
                    conversationId: source.conversationId,
                    sourceKind: "survey_question",
                    surveyQuestionContentId: source.contentId,
                    surveyQuestionOptionContentIds: source.options.map(
                        (option) => option.contentId,
                    ),
                    targetLanguageCode,
                },
                now,
                log,
            });
        }

        for (const source of seedOpinionSources) {
            if (
                !shouldTranslateContent({
                    sourceLanguageCode: source.sourceLanguageCode,
                    targetLanguageCode,
                }) ||
                (await hasOpinionTranslation({
                    db,
                    source,
                    targetLanguageCode,
                }))
            ) {
                continue;
            }
            await ensureAndQueueEagerTranslationWork({
                db,
                valkey,
                queueScript,
                input: {
                    conversationId: source.conversationId,
                    sourceKind: "opinion",
                    sourceContentId: source.contentId,
                    targetLanguageCode,
                },
                now,
                log,
            });
        }
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
            translationSourceLanguageCode: questionTranslation.sourceLanguageCode,
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
        source.options.map((option) => [option.contentId, option.sourceLanguageCode]),
    );
    const translatedOptionsByContentId = new Map(
        optionTranslationRows
            .filter((row) => {
                const currentSourceLanguageCode = sourceLanguageByOptionContentId.get(
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
    return buildLocalizedSurveyQuestionContent({
        source,
        translation:
            freshQuestionTranslation === undefined
                ? undefined
                : {
                      translatedQuestionText:
                          freshQuestionTranslation.translatedQuestionText,
                      sourceLanguageCode: freshQuestionTranslation.sourceLanguageCode,
                      sourceRawLanguageCode:
                          freshQuestionTranslation.sourceRawLanguageCode,
                      sourceLanguageProvider:
                          freshQuestionTranslation.sourceLanguageProvider,
                      sourceLanguageConfidence:
                          freshQuestionTranslation.sourceLanguageConfidence,
                      translatedOptionsByContentId,
                  },
        targetLanguageCode,
        requestMode,
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
            translatedTitle: conversationContentTranslationTable.translatedTitle,
            translatedBody: conversationContentTranslationTable.translatedBody,
            sourceLanguageCode: conversationContentTranslationTable.sourceLanguageCode,
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
                sourceVersion: `conversation_content:${String(source.contentId)}`,
                initialMode: "translated",
                translation: {
                    ...buildTranslationMetadata({
                        targetLanguageCode,
                        sourceMetadata: freshTranslation,
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
            sourceVersion: `conversation_content:${String(source.contentId)}`,
            initialMode: "original",
            translation: {
                ...buildTranslationMetadata({
                    targetLanguageCode,
                    sourceMetadata: source,
                    status:
                        requestMode === "read_existing"
                            ? "not_requested"
                            : "pending",
                }),
            },
            variants: {
                original,
            },
        },
    };
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
            sourceLanguageCode: opinionContentTranslationTable.sourceLanguageCode,
            sourceRawLanguageCode: opinionContentTranslationTable.sourceRawLanguageCode,
            sourceLanguageProvider:
                opinionContentTranslationTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                opinionContentTranslationTable.sourceLanguageConfidence,
        })
        .from(opinionContentTranslationTable)
        .where(
            and(
                eq(opinionContentTranslationTable.opinionContentId, source.contentId),
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
            },
            content: {
                kind: "translatable",
                sourceVersion: `opinion_content:${String(source.contentId)}`,
                initialMode: "translated",
                translation: {
                    ...buildTranslationMetadata({
                        targetLanguageCode,
                        sourceMetadata: freshTranslation,
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
        },
        content: {
            kind: "translatable",
            sourceVersion: `opinion_content:${String(source.contentId)}`,
            initialMode: "original",
            translation: {
                ...buildTranslationMetadata({
                    targetLanguageCode,
                    sourceMetadata: source,
                    status:
                        requestMode === "read_existing"
                            ? "not_requested"
                            : "pending",
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
    now,
    log,
    beforeQueueTranslationWork,
}: RequestContentTranslationParams) {
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
        if (
            shouldQueueTranslationWork({ requestMode, translationExists }) &&
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
                    surveyQuestionOptionContentIds: source.options.map(
                        (option) => option.contentId,
                    ),
                    targetLanguageCode,
                },
                now,
                log,
                priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
            });
        }
        return await buildSurveyQuestionResponse({
            db,
            source,
            targetLanguageCode,
            requestMode,
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
            targetLanguageCode,
        });
        if (
            shouldQueueTranslationWork({ requestMode, translationExists }) &&
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
                now,
                log,
                priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
            });
        }
        return await buildConversationResponse({
            db,
            source,
            targetLanguageCode,
            requestMode,
        });
    }

    const source = await fetchOpinionSource({
        db,
        conversationSlugId: subject.conversationSlugId,
        opinionSlugId: subject.opinionSlugId,
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
        targetLanguageCode,
    });
    if (
        shouldQueueTranslationWork({ requestMode, translationExists }) &&
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
            now,
            log,
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
        });
    }
    return await buildOpinionResponse({
        db,
        source,
        targetLanguageCode,
        requestMode,
    });
}
