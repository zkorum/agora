import type {
    ContentTranslationSubject,
    LocalizedSurveyQuestionContent,
} from "@/shared/types/zod.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";

export type ContentTranslationInclude = "original" | "translation" | "both";

export interface SurveyQuestionLocalizedContentSource {
    conversationSlugId: string;
    questionSlugId: string;
    contentId: number;
    questionText: string;
    sourceLanguageCode: string | null;
    options: {
        optionSlugId: string;
        contentId: number;
        optionText: string;
    }[];
}

export interface SurveyQuestionTranslationSource {
    translatedQuestionText: string;
    translatedOptionsByContentId: ReadonlyMap<number, string>;
}

export function shouldQueueTranslationWork({
    include,
    translationExists,
}: {
    include: ContentTranslationInclude;
    translationExists: boolean;
}): boolean {
    return include !== "original" && !translationExists;
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

export function buildSurveyQuestionSourceVersion({
    surveyQuestionContentId,
    optionContentIds,
}: {
    surveyQuestionContentId: number;
    optionContentIds: readonly number[];
}): string {
    return `survey_question_content:${String(surveyQuestionContentId)}:option_content:${optionContentIds.map((contentId) => String(contentId)).join(",")}`;
}

export function getSourceLanguageLabel(sourceLanguageCode: string | null): string {
    return sourceLanguageCode ?? "unknown";
}

export function buildLocalizedSurveyQuestionContent({
    source,
    translation,
    targetLanguageCode,
    include,
}: {
    source: SurveyQuestionLocalizedContentSource;
    translation: SurveyQuestionTranslationSource | undefined;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    include: ContentTranslationInclude;
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
    const translatedOptions: { optionSlugId: string; optionText: string }[] = [];
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
        translation === undefined || translatedOptions.length !== source.options.length
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
    const sourceVersion = buildSurveyQuestionSourceVersion({
        surveyQuestionContentId: source.contentId,
        optionContentIds: source.options.map((option) => option.contentId),
    });

    if (translated !== undefined && include === "translation") {
        return {
            subject,
            content: {
                kind: "translatable",
                sourceVersion,
                initialMode: "translated",
                translation: {
                    targetLanguageCode,
                    sourceLanguageLabel: getSourceLanguageLabel(source.sourceLanguageCode),
                    status: "completed",
                },
                variants: { translated },
            },
        };
    }

    if (translated !== undefined && include === "both") {
        return {
            subject,
            content: {
                kind: "translatable",
                sourceVersion,
                initialMode: "translated",
                translation: {
                    targetLanguageCode,
                    sourceLanguageLabel: getSourceLanguageLabel(source.sourceLanguageCode),
                    status: "completed",
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
                targetLanguageCode,
                sourceLanguageLabel: getSourceLanguageLabel(source.sourceLanguageCode),
                status:
                    translated === undefined && include === "original"
                        ? "not_requested"
                        : translated === undefined
                          ? "pending"
                          : "completed",
            },
            variants: {
                original,
                ...(translated === undefined ? {} : { translated }),
            },
        },
    };
}
