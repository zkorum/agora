import type {
    ConversationContentFetchRequest,
    ConversationContentFetchResponse,
    SurveyFormFetchResponse,
} from "@/shared/types/dto.js";
import type {
    SupportedDisplayLanguageCodes,
    SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import type {
    LocalizedConversationContent,
    DisplayedOpinionItem,
    LocalizedOpinionContent,
    LocalizedSurveyQuestionContent,
} from "@/shared/types/zod.js";
import { getLanguageComparisonKey } from "@/shared-backend/translate.js";

type ConversationContentMode = ConversationContentFetchRequest["mode"];
type TranslationControl = NonNullable<
    ConversationContentFetchResponse["translationControl"]
>;
type UnavailableStatus = Extract<
    ConversationContentFetchResponse,
    { status: "not_requested" | "pending" | "running" | "failed" }
>["status"];
type SurveyFormFetchSuccessResponse = Extract<
    SurveyFormFetchResponse,
    { success: true }
>;
type SurveyQuestionDisplayContent =
    SurveyFormFetchSuccessResponse["questions"][number]["displayContent"];
type OpinionDisplayContent = DisplayedOpinionItem["displayContent"];
type DisplayableLocalizedContent =
    | LocalizedConversationContent
    | LocalizedOpinionContent
    | LocalizedSurveyQuestionContent;
type TranslatableLocalizedContent = Extract<
    DisplayableLocalizedContent,
    { kind: "translatable" }
>;

function getSourceLanguageLabel({
    content,
}: {
    content: TranslatableLocalizedContent;
}): string | undefined {
    const directLabel = content.translation.sourceLanguageLabel;
    if (directLabel !== undefined) {
        return directLabel;
    }

    const sourceLanguage = content.translation.sourceLanguage;
    if (sourceLanguage.kind === "recognized") {
        return sourceLanguage.label;
    }
    if (sourceLanguage.kind === "raw") {
        return sourceLanguage.label ?? sourceLanguage.rawLanguageCode;
    }
    return undefined;
}

function getSourceLanguageKey({
    content,
}: {
    content: TranslatableLocalizedContent;
}): string | undefined {
    const sourceLanguage = content.translation.sourceLanguage;
    if (sourceLanguage.kind === "recognized") {
        return getLanguageComparisonKey({ languageCode: sourceLanguage.languageCode });
    }
    if (content.translation.sourceLanguageCode != null) {
        return getLanguageComparisonKey({
            languageCode: content.translation.sourceLanguageCode,
        });
    }
    if (sourceLanguage.kind === "raw") {
        return getLanguageComparisonKey({ languageCode: sourceLanguage.rawLanguageCode });
    }
    return undefined;
}

function viewerUnderstandsSourceLanguage({
    sourceLanguageKey,
    displayLanguage,
    spokenLanguages,
}: {
    sourceLanguageKey: string;
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}): boolean {
    const understoodLanguageKeys = new Set<string>([
        getLanguageComparisonKey({ languageCode: displayLanguage }),
        ...spokenLanguages.map((languageCode) =>
            getLanguageComparisonKey({ languageCode }),
        ),
    ]);
    return understoodLanguageKeys.has(sourceLanguageKey);
}

function sourceMatchesDisplayLanguage({
    sourceLanguageKey,
    displayLanguage,
}: {
    sourceLanguageKey: string;
    displayLanguage: SupportedDisplayLanguageCodes;
}): boolean {
    return (
        sourceLanguageKey === getLanguageComparisonKey({ languageCode: displayLanguage })
    );
}

function canTranslateForDisplayLanguage({
    content,
    translationAllowed,
    displayLanguage,
}: {
    content: DisplayableLocalizedContent;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
}): boolean {
    if (!translationAllowed || content.kind !== "translatable") {
        return false;
    }

    const sourceLanguageKey = getSourceLanguageKey({ content });
    return (
        sourceLanguageKey === undefined ||
        !sourceMatchesDisplayLanguage({
            sourceLanguageKey,
            displayLanguage,
        })
    );
}

function getTranslationControl({
    content,
    mode,
    translationAllowed,
    displayLanguage,
}: {
    content: DisplayableLocalizedContent;
    mode: ConversationContentMode;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
}): TranslationControl | null {
    if (
        content.kind !== "translatable" ||
        !canTranslateForDisplayLanguage({
            content,
            translationAllowed,
            displayLanguage,
        })
    ) {
        return null;
    }

    const sourceLanguageLabel = getSourceLanguageLabel({ content });
    return {
        status: content.translation.status,
        ...(sourceLanguageLabel === undefined ? {} : { sourceLanguageLabel }),
        alternateMode: mode === "translated" ? "original" : "translated",
        canRequestAlternate: true,
    };
}

function unavailableStatus({
    content,
    translationAllowed,
    displayLanguage,
}: {
    content: DisplayableLocalizedContent;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
}): UnavailableStatus {
    if (
        content.kind !== "translatable" ||
        !canTranslateForDisplayLanguage({
            content,
            translationAllowed,
            displayLanguage,
        })
    ) {
        return "not_requested";
    }
    if (content.translation.status === "completed") {
        return "not_requested";
    }
    return content.translation.status;
}

export function getInitialConversationContentMode({
    content,
    translationAllowed,
    displayLanguage,
    spokenLanguages,
}: {
    content: DisplayableLocalizedContent;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}): ConversationContentMode {
    if (
        content.kind !== "translatable" ||
        !canTranslateForDisplayLanguage({
            content,
            translationAllowed,
            displayLanguage,
        }) ||
        content.translation.status !== "completed" ||
        content.variants.translated === undefined
    ) {
        return "original";
    }

    const sourceLanguageKey = getSourceLanguageKey({ content });
    if (
        sourceLanguageKey !== undefined &&
        viewerUnderstandsSourceLanguage({
            sourceLanguageKey,
            displayLanguage,
            spokenLanguages,
        })
    ) {
        return "original";
    }

    return "translated";
}

export function toConversationContentFetchResponse({
    content,
    mode,
    translationAllowed,
    displayLanguage,
}: {
    content: LocalizedConversationContent;
    mode: ConversationContentMode;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}): ConversationContentFetchResponse {
    const canTranslate = canTranslateForDisplayLanguage({
        content,
        translationAllowed,
        displayLanguage,
    });
    const translationControl = getTranslationControl({
        content,
        mode,
        translationAllowed,
        displayLanguage,
    });

    if (mode === "original") {
        const original = content.variants.original;
        if (original !== undefined) {
            return {
                contentId: content.sourceVersion,
                status: "available",
                mode,
                content: original,
                translationControl,
            };
        }
    }

    if (
        canTranslate &&
        content.kind === "translatable" &&
        mode === "translated"
    ) {
        const translated = content.variants.translated;
        if (translated !== undefined) {
            return {
                contentId: content.sourceVersion,
                status: "available",
                mode,
                content: translated,
                translationControl,
            };
        }
    }

    return {
        contentId: content.sourceVersion,
        status: unavailableStatus({
            content,
            translationAllowed,
            displayLanguage,
        }),
        translationControl,
    };
}

export function toInitialConversationDisplayContent({
    content,
    translationAllowed,
    displayLanguage,
    spokenLanguages,
}: {
    content: LocalizedConversationContent;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}): ConversationContentFetchResponse {
    return toConversationContentFetchResponse({
        content,
        translationAllowed,
        displayLanguage,
        spokenLanguages,
        mode: getInitialConversationContentMode({
            content,
            translationAllowed,
            displayLanguage,
            spokenLanguages,
        }),
    });
}

export function toSurveyQuestionDisplayContent({
    content,
    translationAllowed,
    displayLanguage,
    spokenLanguages,
}: {
    content: LocalizedSurveyQuestionContent;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}): SurveyQuestionDisplayContent {
    const mode = getInitialConversationContentMode({
        content,
        translationAllowed,
        displayLanguage,
        spokenLanguages,
    });
    const translationControl = getTranslationControl({
        content,
        mode,
        translationAllowed,
        displayLanguage,
    });
    const canTranslate = canTranslateForDisplayLanguage({
        content,
        translationAllowed,
        displayLanguage,
    });

    if (mode === "original") {
        const original = content.variants.original;
        if (original !== undefined) {
            return {
                contentId: content.sourceVersion,
                status: "available",
                mode,
                content: original,
                translationControl,
            };
        }
    }

    if (
        canTranslate &&
        content.kind === "translatable" &&
        mode === "translated"
    ) {
        const translated = content.variants.translated;
        if (translated !== undefined) {
            return {
                contentId: content.sourceVersion,
                status: "available",
                mode,
                content: translated,
                translationControl,
            };
        }
    }

    return {
        contentId: content.sourceVersion,
        status: unavailableStatus({
            content,
            translationAllowed,
            displayLanguage,
        }),
        translationControl,
    };
}

export function toOpinionDisplayContent({
    content,
    translationAllowed,
    displayLanguage,
    spokenLanguages,
}: {
    content: LocalizedOpinionContent;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}): OpinionDisplayContent {
    const mode = getInitialConversationContentMode({
        content,
        translationAllowed,
        displayLanguage,
        spokenLanguages,
    });
    const translationControl = getTranslationControl({
        content,
        mode,
        translationAllowed,
        displayLanguage,
    });
    const canTranslate = canTranslateForDisplayLanguage({
        content,
        translationAllowed,
        displayLanguage,
    });

    if (mode === "original") {
        const original = content.variants.original;
        if (original !== undefined) {
            return {
                contentId: content.sourceVersion,
                status: "available",
                mode,
                content: original,
                translationControl,
            };
        }
    }

    if (
        canTranslate &&
        content.kind === "translatable" &&
        mode === "translated"
    ) {
        const translated = content.variants.translated;
        if (translated !== undefined) {
            return {
                contentId: content.sourceVersion,
                status: "available",
                mode,
                content: translated,
                translationControl,
            };
        }
    }

    return {
        contentId: content.sourceVersion,
        status: unavailableStatus({
            content,
            translationAllowed,
            displayLanguage,
        }),
        translationControl,
    };
}
