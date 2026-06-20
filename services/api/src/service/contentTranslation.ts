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
import { shouldSkipTranslation } from "@/shared-backend/translate.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import type {
    ContentTranslationSubject,
    LocalizedConversationContent,
    LocalizedOpinionContent,
    LocalizedSurveyQuestionContent,
} from "@/shared/types/zod.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
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
    sourceLanguageCode: string | null;
}

interface OpinionContentSource {
    conversationId: number;
    conversationSlugId: string;
    opinionSlugId: string;
    contentId: number;
    content: string;
    sourceLanguageCode: string | null;
}

interface SurveyQuestionOptionContentSource {
    optionSlugId: string;
    contentId: number;
    optionText: string;
}

interface SurveyQuestionContentSource {
    conversationId: number;
    conversationSlugId: string;
    questionSlugId: string;
    questionId: number;
    contentId: number;
    questionText: string;
    sourceLanguageCode: string | null;
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
    conversationContentId,
    targetLanguageCode,
}: {
    db: PostgresDatabase;
    conversationContentId: number;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): Promise<boolean> {
    const rows = await db
        .select({ id: conversationContentTranslationTable.id })
        .from(conversationContentTranslationTable)
        .where(
            and(
                eq(
                    conversationContentTranslationTable.conversationContentId,
                    conversationContentId,
                ),
                eq(
                    conversationContentTranslationTable.displayLanguageCode,
                    targetLanguageCode,
                ),
            ),
        )
        .limit(1);
    return rows.length > 0;
}

async function hasOpinionTranslation({
    db,
    opinionContentId,
    targetLanguageCode,
}: {
    db: PostgresDatabase;
    opinionContentId: number;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): Promise<boolean> {
    const rows = await db
        .select({ id: opinionContentTranslationTable.id })
        .from(opinionContentTranslationTable)
        .where(
            and(
                eq(opinionContentTranslationTable.opinionContentId, opinionContentId),
                eq(
                    opinionContentTranslationTable.displayLanguageCode,
                    targetLanguageCode,
                ),
            ),
        )
        .limit(1);
    return rows.length > 0;
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
        .select({ id: surveyQuestionContentTranslationTable.id })
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
    if (questionRows.length === 0) {
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
    const translatedOptionContentIds = new Set(
        translatedOptionRows.map((row) => row.surveyQuestionOptionContentId),
    );
    return hasCompleteSurveyQuestionTranslation({
        questionTranslationExists: true,
        optionContentIds,
        translatedOptionContentIds,
    });
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
            optionSlugId: surveyQuestionOptionTable.slugId,
            optionContentId: surveyQuestionOptionContentTable.id,
            optionText: surveyQuestionOptionContentTable.optionText,
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
            conversationSource.sourceLanguageCode !== null &&
            !shouldSkipTranslation({
                sourceLanguageCode: conversationSource.sourceLanguageCode,
                targetLanguageCode,
            }) &&
            !(await hasConversationTranslation({
                db,
                conversationContentId: conversationSource.contentId,
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
                source.sourceLanguageCode === null ||
                shouldSkipTranslation({
                    sourceLanguageCode: source.sourceLanguageCode,
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
                source.sourceLanguageCode === null ||
                shouldSkipTranslation({
                    sourceLanguageCode: source.sourceLanguageCode,
                    targetLanguageCode,
                }) ||
                (await hasOpinionTranslation({
                    db,
                    opinionContentId: source.contentId,
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
    const translatedOptionsByContentId = new Map(
        optionTranslationRows.map((row) => [
            row.surveyQuestionOptionContentId,
            row.translatedOptionText,
        ]),
    );
    return buildLocalizedSurveyQuestionContent({
        source,
        translation:
            questionTranslation === undefined
                ? undefined
                : {
                      translatedQuestionText: questionTranslation.translatedQuestionText,
                      sourceLanguageCode: questionTranslation.sourceLanguageCode,
                      sourceRawLanguageCode:
                          questionTranslation.sourceRawLanguageCode,
                      sourceLanguageProvider:
                          questionTranslation.sourceLanguageProvider,
                      sourceLanguageConfidence:
                          questionTranslation.sourceLanguageConfidence,
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
    const original = { title: source.title, body: source.body ?? undefined };

    if (translation !== undefined) {
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
                        sourceMetadata: translation,
                        status: "completed",
                    }),
                },
                variants: {
                    original,
                    translated: {
                        title: translation.translatedTitle,
                        body: translation.translatedBody ?? undefined,
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
                    sourceMetadata: translation,
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
    const original = { content: source.content };

    if (translation !== undefined) {
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
                        sourceMetadata: translation,
                        status: "completed",
                    }),
                },
                variants: {
                    original,
                    translated: { content: translation.translatedContent },
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
                    sourceMetadata: translation,
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
        const skipTranslation = shouldSkipTranslation({
            sourceLanguageCode: source.sourceLanguageCode ?? undefined,
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
            conversationContentId: source.contentId,
            targetLanguageCode,
        });
        const skipTranslation = shouldSkipTranslation({
            sourceLanguageCode: source.sourceLanguageCode ?? undefined,
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
        opinionContentId: source.contentId,
        targetLanguageCode,
    });
    const skipTranslation = shouldSkipTranslation({
        sourceLanguageCode: source.sourceLanguageCode ?? undefined,
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
