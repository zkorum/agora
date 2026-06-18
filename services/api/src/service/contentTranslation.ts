import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import type { PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import type { Script } from "@valkey/valkey-glide";
import type { BaseLogger } from "pino";
import {
    contentTranslationWorkTable,
    conversationContentTable,
    conversationContentTranslationTable,
    conversationTable,
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
    enqueueContentTranslationWork,
} from "@/shared-backend/contentTranslationQueue.js";
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
import type { ContentTranslationInclude } from "./contentTranslationContent.js";

interface RequestContentTranslationParams {
    db: PostgresDatabase;
    valkey: Valkey | undefined;
    queueScript: Script;
    subject: ContentTranslationSubject;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    include: ContentTranslationInclude;
    now: Date;
    log: Pick<BaseLogger, "info" | "error">;
    beforeQueueTranslationWork: () => Promise<void>;
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
}: {
    db: PostgresDatabase;
    input: TranslationWorkInput;
    now: Date;
}): Promise<number> {
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
            CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
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
        return existing.id;
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
        priorityRank: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
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
    return inserted.id;
}

async function queueTranslationWork({
    valkey,
    queueScript,
    workId,
    now,
    log,
}: {
    valkey: Valkey | undefined;
    queueScript: Script;
    workId: number;
    now: Date;
    log: Pick<BaseLogger, "info" | "error">;
}): Promise<void> {
    await enqueueContentTranslationWork({
        valkey,
        script: queueScript,
        workId,
        priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
        enqueuedAtMs: now.getTime(),
        log,
    });
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

async function buildSurveyQuestionResponse({
    db,
    source,
    targetLanguageCode,
    include,
}: {
    db: PostgresDatabase;
    source: SurveyQuestionContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    include: ContentTranslationInclude;
}): Promise<{
    subject: Extract<ContentTranslationSubject, { kind: "survey_question" }>;
    content: LocalizedSurveyQuestionContent;
}> {
    const questionTranslationRows = await db
        .select({
            translatedQuestionText:
                surveyQuestionContentTranslationTable.translatedQuestionText,
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
                      translatedOptionsByContentId,
                  },
        targetLanguageCode,
        include,
    });
}

async function buildConversationResponse({
    db,
    source,
    targetLanguageCode,
    include,
}: {
    db: PostgresDatabase;
    source: ConversationContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    include: ContentTranslationInclude;
}): Promise<{
    subject: Extract<ContentTranslationSubject, { kind: "conversation" }>;
    content: LocalizedConversationContent;
}> {
    const translationRows = await db
        .select({
            translatedTitle: conversationContentTranslationTable.translatedTitle,
            translatedBody: conversationContentTranslationTable.translatedBody,
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

    if (translation !== undefined && include === "translation") {
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
                        sourceLanguageCode: source.sourceLanguageCode,
                        status: "completed",
                    }),
                },
                variants: {
                    translated: {
                        title: translation.translatedTitle,
                        body: translation.translatedBody ?? undefined,
                    },
                },
            },
        };
    }

    if (translation !== undefined && include === "both") {
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
                        sourceLanguageCode: source.sourceLanguageCode,
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
                    sourceLanguageCode: source.sourceLanguageCode,
                    status:
                        translation === undefined && include === "original"
                            ? "not_requested"
                            : translation === undefined
                              ? "pending"
                              : "completed",
                }),
            },
            variants: {
                original,
                ...(translation === undefined
                    ? {}
                    : {
                          translated: {
                              title: translation.translatedTitle,
                              body: translation.translatedBody ?? undefined,
                          },
                      }),
            },
        },
    };
}

async function buildOpinionResponse({
    db,
    source,
    targetLanguageCode,
    include,
}: {
    db: PostgresDatabase;
    source: OpinionContentSource;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    include: ContentTranslationInclude;
}): Promise<{
    subject: Extract<ContentTranslationSubject, { kind: "opinion" }>;
    content: LocalizedOpinionContent;
}> {
    const translationRows = await db
        .select({ translatedContent: opinionContentTranslationTable.translatedContent })
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

    if (translation !== undefined && include === "translation") {
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
                        sourceLanguageCode: source.sourceLanguageCode,
                        status: "completed",
                    }),
                },
                variants: {
                    translated: { content: translation.translatedContent },
                },
            },
        };
    }

    if (translation !== undefined && include === "both") {
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
                        sourceLanguageCode: source.sourceLanguageCode,
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
                    sourceLanguageCode: source.sourceLanguageCode,
                    status:
                        translation === undefined && include === "original"
                            ? "not_requested"
                            : translation === undefined
                              ? "pending"
                              : "completed",
                }),
            },
            variants: {
                original,
                ...(translation === undefined
                    ? {}
                    : {
                          translated: {
                              content: translation.translatedContent,
                          },
                      }),
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
    include,
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
        if (shouldQueueTranslationWork({ include, translationExists })) {
            await beforeQueueTranslationWork();
            const workId = await ensureTranslationWork({
                db,
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
            });
            await queueTranslationWork({ valkey, queueScript, workId, now, log });
        }
        return await buildSurveyQuestionResponse({
            db,
            source,
            targetLanguageCode,
            include,
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
        if (shouldQueueTranslationWork({ include, translationExists })) {
            await beforeQueueTranslationWork();
            const workId = await ensureTranslationWork({
                db,
                input: {
                    conversationId: source.conversationId,
                    sourceKind: "conversation",
                    sourceContentId: source.contentId,
                    targetLanguageCode,
                },
                now,
            });
            await queueTranslationWork({ valkey, queueScript, workId, now, log });
        }
        return await buildConversationResponse({
            db,
            source,
            targetLanguageCode,
            include,
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
    if (shouldQueueTranslationWork({ include, translationExists })) {
        await beforeQueueTranslationWork();
        const workId = await ensureTranslationWork({
            db,
            input: {
                conversationId: source.conversationId,
                sourceKind: "opinion",
                sourceContentId: source.contentId,
                targetLanguageCode,
            },
            now,
        });
        await queueTranslationWork({ valkey, queueScript, workId, now, log });
    }
    return await buildOpinionResponse({
        db,
        source,
        targetLanguageCode,
        include,
    });
}
