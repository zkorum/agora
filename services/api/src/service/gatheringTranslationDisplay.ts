import { and, eq, inArray, or } from "drizzle-orm";
import type { z } from "zod";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import {
    contentTranslationWorkTable,
    gatheringAnswerTranslationTable,
    gatheringFieldTranslationTable,
} from "@/shared-backend/schema.js";
import type { Dto } from "@/shared/types/dto.js";
import type {
    zodLocalizedGatheringFieldContent,
    zodLocalizedGatheringResponseContent,
} from "@/shared/types/zod.js";
import type { SupportedSpokenLanguageCodes } from "@/shared/languages.js";
import {
    buildTranslationMetadata,
    toMissingContentTranslationStatus,
} from "./contentTranslationContent.js";
import type { MissingContentTranslationStatus } from "./contentTranslationContent.js";
import {
    toStandardDisplayedContent,
    type ContentDisplayPreferences,
} from "./displayContent.js";

type Answers = z.infer<typeof Dto.gatheringResponse>["answers"];
type AnswerTranslation = typeof gatheringAnswerTranslationTable.$inferSelect;

export interface GatheringResponseDisplaySource {
    contentId: number;
    sourceVersion: string;
    answers: Answers;
    permitsTranslation: boolean;
}

function localizedRevision<T>({
    original,
    translated,
    sourceVersion,
    preferences,
    status,
    sourceLanguageCode,
}: {
    original: T;
    translated: T | undefined;
    sourceVersion: string;
    preferences: ContentDisplayPreferences;
    status: MissingContentTranslationStatus;
    sourceLanguageCode: SupportedSpokenLanguageCodes | undefined;
}) {
    if (!preferences.translationAllowed) {
        return {
            kind: "original_only" as const,
            sourceVersion,
            initialMode: "original" as const,
            variants: { original },
        };
    }
    const sourceMetadata =
        sourceLanguageCode === undefined
            ? undefined
            : {
                  sourceLanguageCode,
                  sourceRawLanguageCode: null,
                  sourceLanguageProvider: null,
                  sourceLanguageConfidence: null,
              };
    if (translated === undefined) {
        return {
            kind: "translatable" as const,
            sourceVersion,
            initialMode: "original" as const,
            translation: buildTranslationMetadata({
                targetLanguageCode: preferences.targetLanguage,
                sourceMetadata,
                status,
            }),
            variants: { original },
        };
    }
    return {
        kind: "translatable" as const,
        sourceVersion,
        initialMode: "translated" as const,
        translation: buildTranslationMetadata({
            targetLanguageCode: preferences.targetLanguage,
            sourceMetadata,
            status: "completed",
        }),
        variants: { original, translated },
    };
}

/** Completeness and field identity are established together; missing text is never invented. */
export function assembleGatheringResponseTranslation({
    original,
    translations,
}: {
    original: Answers;
    translations: AnswerTranslation[];
}):
    | {
          answers: Answers;
          sourceLanguageCode: SupportedSpokenLanguageCodes | undefined;
      }
    | undefined {
    if (original.length === 0 || translations.length !== original.length)
        return undefined;
    if (
        new Set(original.map(({ fieldId }) => fieldId)).size !== original.length
    )
        return undefined;
    const byFieldId = new Map(
        translations.map((translation) => [translation.fieldId, translation]),
    );
    if (byFieldId.size !== original.length) return undefined;
    const answers: Answers = [];
    const sourceLanguages = new Set<SupportedSpokenLanguageCodes | null>();
    for (const answer of original) {
        const translation = byFieldId.get(answer.fieldId);
        if (translation === undefined) return undefined;
        answers.push({
            fieldId: answer.fieldId,
            value: translation.translatedValue,
        });
        if (answer.value.trim() !== "")
            sourceLanguages.add(translation.sourceLanguageCode);
    }
    const [sourceLanguageCode] = sourceLanguages;
    return {
        answers,
        sourceLanguageCode:
            sourceLanguages.size === 1
                ? (sourceLanguageCode ?? undefined)
                : undefined,
    };
}

/** Sources must already have passed Gathering's viewer-scoped authorization boundary. */
export async function buildGatheringDisplayContent({
    tx,
    fields = [],
    responses = [],
    preferences,
}: {
    tx: PostgresTransaction;
    fields?: { fieldId: string; label: string }[];
    responses?: GatheringResponseDisplaySource[];
    preferences: ContentDisplayPreferences;
}) {
    const fieldIds = fields.map(({ fieldId }) => fieldId);
    const contentIds = responses
        .filter(({ permitsTranslation }) => permitsTranslation)
        .map(({ contentId }) => contentId);
    const labels =
        preferences.translationAllowed && fieldIds.length > 0
            ? await tx
                  .select()
                  .from(gatheringFieldTranslationTable)
                  .where(
                      and(
                          inArray(
                              gatheringFieldTranslationTable.fieldId,
                              fieldIds,
                          ),
                          eq(
                              gatheringFieldTranslationTable.displayLanguageCode,
                              preferences.targetLanguage,
                          ),
                      ),
                  )
            : [];
    const answers =
        preferences.translationAllowed && contentIds.length > 0
            ? await tx
                  .select()
                  .from(gatheringAnswerTranslationTable)
                  .where(
                      and(
                          inArray(
                              gatheringAnswerTranslationTable.contentId,
                              contentIds,
                          ),
                          eq(
                              gatheringAnswerTranslationTable.displayLanguageCode,
                              preferences.targetLanguage,
                          ),
                      ),
                  )
            : [];
    const work =
        preferences.translationAllowed &&
        (fieldIds.length > 0 || contentIds.length > 0)
            ? await tx
                  .select({
                      fieldId: contentTranslationWorkTable.gatheringFieldId,
                      contentId:
                          contentTranslationWorkTable.gatheringResponseContentId,
                      status: contentTranslationWorkTable.status,
                  })
                  .from(contentTranslationWorkTable)
                  .where(
                      and(
                          eq(
                              contentTranslationWorkTable.displayLanguageCode,
                              preferences.targetLanguage,
                          ),
                          or(
                              fieldIds.length > 0
                                  ? and(
                                        eq(
                                            contentTranslationWorkTable.sourceKind,
                                            "gathering_field",
                                        ),
                                        inArray(
                                            contentTranslationWorkTable.gatheringFieldId,
                                            fieldIds,
                                        ),
                                    )
                                  : undefined,
                              contentIds.length > 0
                                  ? and(
                                        eq(
                                            contentTranslationWorkTable.sourceKind,
                                            "gathering_response",
                                        ),
                                        inArray(
                                            contentTranslationWorkTable.gatheringResponseContentId,
                                            contentIds,
                                        ),
                                    )
                                  : undefined,
                          ),
                      ),
                  )
            : [];
    const labelsById = new Map(labels.map((label) => [label.fieldId, label]));
    const answersByContentId = new Map<number, AnswerTranslation[]>();
    for (const answer of answers) {
        const group = answersByContentId.get(answer.contentId);
        if (group === undefined)
            answersByContentId.set(answer.contentId, [answer]);
        else group.push(answer);
    }
    const fieldWork = new Map(
        work.flatMap((row) =>
            row.fieldId === null ? [] : [[row.fieldId, row.status] as const],
        ),
    );
    const responseWork = new Map(
        work.flatMap((row) =>
            row.contentId === null
                ? []
                : [[row.contentId, row.status] as const],
        ),
    );
    return {
        fields: new Map(
            fields.map((field) => {
                const translation = labelsById.get(field.fieldId);
                const localized: z.infer<
                    typeof zodLocalizedGatheringFieldContent
                > = localizedRevision({
                    original: { text: field.label },
                    translated:
                        translation === undefined
                            ? undefined
                            : { text: translation.translatedLabel },
                    sourceVersion: field.fieldId,
                    preferences,
                    status: toMissingContentTranslationStatus(
                        fieldWork.get(field.fieldId) ?? "not_requested",
                    ),
                    sourceLanguageCode:
                        translation?.sourceLanguageCode ?? undefined,
                });
                return [
                    field.fieldId,
                    {
                        localized,
                        display: toStandardDisplayedContent({
                            content: localized,
                            preferences,
                        }),
                    },
                ] as const;
            }),
        ),
        responses: new Map(
            responses.map((source) => {
                const translated = assembleGatheringResponseTranslation({
                    original: source.answers,
                    translations:
                        answersByContentId.get(source.contentId) ?? [],
                });
                const responsePreferences = {
                    ...preferences,
                    translationAllowed:
                        preferences.translationAllowed &&
                        source.permitsTranslation,
                };
                const localized: z.infer<
                    typeof zodLocalizedGatheringResponseContent
                > = localizedRevision({
                    original: { answers: source.answers },
                    translated:
                        translated === undefined
                            ? undefined
                            : { answers: translated.answers },
                    sourceVersion: source.sourceVersion,
                    preferences: responsePreferences,
                    status: toMissingContentTranslationStatus(
                        responseWork.get(source.contentId) ?? "not_requested",
                    ),
                    sourceLanguageCode: translated?.sourceLanguageCode,
                });
                return [
                    source.contentId,
                    {
                        localized,
                        display: toStandardDisplayedContent({
                            content: localized,
                            preferences: responsePreferences,
                        }),
                    },
                ] as const;
            }),
        ),
    };
}
