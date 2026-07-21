import type {
    ContentTranslationSubject,
    ContentTranslationSourceLanguage,
    LanguageDetectionProvider,
    LocalizedRankingItemContent,
    LocalizedContentTranslationStatus,
    LocalizedSurveyQuestionContent,
} from "@/shared/types/zod.js";
import type {
    NormalizedLanguageCodes,
    SupportedDisplayLanguageCodes,
    SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";

export type ContentTranslationRequestMode =
    | "read_existing"
    | "queue_if_missing";
export type MissingContentTranslationStatus = Exclude<
    LocalizedContentTranslationStatus,
    "completed"
>;

export function toMissingContentTranslationStatus(
    status: MissingContentTranslationStatus | "completed",
): MissingContentTranslationStatus {
    return status === "completed" ? "not_requested" : status;
}

export interface SurveyQuestionLocalizedContentSource {
    conversationSlugId: string;
    questionSlugId: string;
    contentId: number;
    publicId: string;
    questionText: string;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
    options: {
        optionSlugId: string;
        contentId: number;
        publicId: string;
        optionText: string;
        sourceLanguageCode: SupportedSpokenLanguageCodes | null;
        sourceRawLanguageCode: string | null;
        sourceLanguageProvider: LanguageDetectionProvider | null;
        sourceLanguageConfidence: number | null;
    }[];
}

export interface SurveyQuestionTranslationSource {
    translatedQuestionText: string;
    sourceLanguageCode: NormalizedLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
    translatedOptionsByContentId: ReadonlyMap<number, string>;
}

export interface RankingItemLocalizedContentSource {
    conversationSlugId: string;
    itemSlugId: string;
    contentId: number;
    publicId: string;
    title: string;
    bodyHtml: string | null;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}

export interface RankingItemTranslationSource {
    translatedTitle: string;
    translatedBodyHtml: string | null;
    sourceLanguageCode: NormalizedLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}

export interface TranslationSourceMetadata {
    sourceLanguageCode: NormalizedLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}

export function shouldQueueTranslationWork({
    requestMode,
    translationExists,
}: {
    requestMode: ContentTranslationRequestMode;
    translationExists: boolean;
}): boolean {
    return requestMode === "queue_if_missing" && !translationExists;
}

export function hasCompleteSurveyQuestionTranslation({
    questionTranslationExists,
    optionContentIds,
    translatedOptionContentIds,
}: {
    questionTranslationExists: boolean;
    optionContentIds: readonly number[];
    translatedOptionContentIds: ReadonlySet<number>;
}): boolean {
    return (
        questionTranslationExists &&
        optionContentIds.every((contentId) =>
            translatedOptionContentIds.has(contentId),
        )
    );
}

export function getSourceLanguageLabel(
    sourceLanguageCode: string | null,
): string | undefined {
    if (sourceLanguageCode === null || sourceLanguageCode.trim().length === 0) {
        return undefined;
    }

    try {
        const displayNames = new Intl.DisplayNames(["en"], {
            type: "language",
        });
        return displayNames.of(sourceLanguageCode) ?? sourceLanguageCode;
    } catch {
        return sourceLanguageCode;
    }
}

export function buildContentTranslationSourceLanguage({
    sourceMetadata,
}: {
    sourceMetadata: TranslationSourceMetadata | undefined;
}): ContentTranslationSourceLanguage {
    if (sourceMetadata?.sourceLanguageCode !== undefined) {
        const sourceLanguageCode = sourceMetadata.sourceLanguageCode;
        if (sourceLanguageCode !== null) {
            return {
                kind: "recognized",
                languageCode: sourceLanguageCode,
                label:
                    getSourceLanguageLabel(sourceLanguageCode) ??
                    sourceLanguageCode,
            };
        }
    }

    const rawLanguageCode = sourceMetadata?.sourceRawLanguageCode;
    if (rawLanguageCode !== undefined && rawLanguageCode !== null) {
        const label = getSourceLanguageLabel(rawLanguageCode);
        return {
            kind: "raw",
            rawLanguageCode,
            ...(label === undefined ? {} : { label }),
        };
    }

    return { kind: "unknown" };
}

export function buildTranslationMetadata<
    TStatus extends LocalizedContentTranslationStatus,
>({
    targetLanguageCode,
    sourceMetadata,
    status,
}: {
    targetLanguageCode: SupportedDisplayLanguageCodes;
    sourceMetadata: TranslationSourceMetadata | undefined;
    status: TStatus;
}) {
    const sourceLanguageCode = sourceMetadata?.sourceLanguageCode ?? null;
    const sourceLanguageLabel = getSourceLanguageLabel(sourceLanguageCode);
    const sourceLanguage = buildContentTranslationSourceLanguage({
        sourceMetadata,
    });
    return {
        targetLanguageCode,
        sourceLanguageCode,
        ...(sourceLanguageLabel === undefined ? {} : { sourceLanguageLabel }),
        sourceLanguage,
        status,
    };
}

export function buildLocalizedSurveyQuestionContent({
    source,
    translation,
    targetLanguageCode,
    missingTranslationStatus,
}: {
    source: SurveyQuestionLocalizedContentSource;
    translation: SurveyQuestionTranslationSource | undefined;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    missingTranslationStatus: MissingContentTranslationStatus;
}): {
    subject: Extract<ContentTranslationSubject, { kind: "survey_question" }>;
    content: LocalizedSurveyQuestionContent;
} {
    const original = {
        questionText: source.questionText,
        options: source.options.map((option) => ({
            optionSlugId: option.optionSlugId,
            optionText: option.optionText,
        })),
    };
    const translatedOptions: { optionSlugId: string; optionText: string }[] =
        [];
    for (const option of source.options) {
        const translatedOptionText =
            translation?.translatedOptionsByContentId.get(option.contentId);
        if (translatedOptionText !== undefined) {
            translatedOptions.push({
                optionSlugId: option.optionSlugId,
                optionText: translatedOptionText,
            });
        }
    }
    const translated =
        translation === undefined ||
        translatedOptions.length !== source.options.length
            ? undefined
            : {
                  questionText: translation.translatedQuestionText,
                  options: translatedOptions,
              };
    const subject = {
        kind: "survey_question" as const,
        conversationSlugId: source.conversationSlugId,
        questionSlugId: source.questionSlugId,
    };
    const sourceVersion = source.publicId;

    if (translated !== undefined) {
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
                variants: { original, translated },
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
                    sourceMetadata: translation ?? source,
                    status: missingTranslationStatus,
                }),
            },
            variants: {
                original,
            },
        },
    };
}

export function buildLocalizedRankingItemContent({
    source,
    translation,
    targetLanguageCode,
    missingTranslationStatus,
}: {
    source: RankingItemLocalizedContentSource;
    translation: RankingItemTranslationSource | undefined;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    missingTranslationStatus: MissingContentTranslationStatus;
}): {
    subject: Extract<ContentTranslationSubject, { kind: "ranking_item" }>;
    content: LocalizedRankingItemContent;
} {
    const original = {
        title: source.title,
        bodyHtml: source.bodyHtml ?? undefined,
    };
    const subject = {
        kind: "ranking_item" as const,
        conversationSlugId: source.conversationSlugId,
        itemSlugId: source.itemSlugId,
        sourceVersion: source.publicId,
    };

    if (translation !== undefined) {
        return {
            subject,
            content: {
                kind: "translatable",
                sourceVersion: source.publicId,
                initialMode: "translated",
                translation: buildTranslationMetadata({
                    targetLanguageCode,
                    sourceMetadata: source,
                    status: "completed",
                }),
                variants: {
                    original,
                    translated: {
                        title: translation.translatedTitle,
                        bodyHtml: translation.translatedBodyHtml ?? undefined,
                    },
                },
            },
        };
    }

    return {
        subject,
        content: {
            kind: "translatable",
            sourceVersion: source.publicId,
            initialMode: "original",
            translation: buildTranslationMetadata({
                targetLanguageCode,
                sourceMetadata: source,
                status: missingTranslationStatus,
            }),
            variants: {
                original,
            },
        },
    };
}
