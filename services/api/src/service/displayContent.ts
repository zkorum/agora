import { getLanguageComparisonKey } from "@/shared-backend/translate.js";
import type {
    SupportedDisplayLanguageCodes,
    SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import type {
    LocalizedContentDisplayMode,
    LocalizedContentTranslationStatus,
} from "@/shared/types/zod.js";

export interface DisplayedContentTranslationControl {
    status: LocalizedContentTranslationStatus;
    sourceLanguageLabel?: string;
    alternateMode: LocalizedContentDisplayMode;
    canRequestAlternate: boolean;
}

export type DisplayedContentUnavailableStatus = Exclude<
    LocalizedContentTranslationStatus,
    "completed"
>;

interface TranslatableLocalizedContent {
    kind: "translatable";
    translation: {
        sourceLanguageCode?: string | null;
        sourceLanguageLabel?: string;
        sourceLanguage:
            | { kind: "recognized"; languageCode: string; label: string }
            | { kind: "raw"; rawLanguageCode: string; label?: string }
            | { kind: "unknown" };
        status: LocalizedContentTranslationStatus;
    };
}

type DisplayableLocalizedContent =
    | { kind: "original_only" }
    | TranslatableLocalizedContent;

type DisplayableLocalizedContentWithVariants<TOriginal, TTranslated> =
    DisplayableLocalizedContent & {
        sourceVersion: string;
        variants: {
            original?: TOriginal;
            translated?: TTranslated;
        };
    };

const languageDisplayNamesByLocale = new Map<
    SupportedDisplayLanguageCodes,
    Intl.DisplayNames
>();

function getLanguageDisplayNames(
    displayLanguage: SupportedDisplayLanguageCodes,
): Intl.DisplayNames | undefined {
    const cachedDisplayNames =
        languageDisplayNamesByLocale.get(displayLanguage);
    if (cachedDisplayNames !== undefined) {
        return cachedDisplayNames;
    }

    try {
        const displayNames = new Intl.DisplayNames([displayLanguage], {
            type: "language",
            fallback: "none",
        });
        languageDisplayNamesByLocale.set(displayLanguage, displayNames);
        return displayNames;
    } catch {
        return undefined;
    }
}

function getSourceLanguageLabel({
    content,
    displayLanguage,
}: {
    content: TranslatableLocalizedContent;
    displayLanguage: SupportedDisplayLanguageCodes;
}): string | undefined {
    const sourceLanguage = content.translation.sourceLanguage;
    if (sourceLanguage.kind === "recognized") {
        return (
            getLanguageDisplayName({
                languageCode: sourceLanguage.languageCode,
                displayLanguage,
            }) ?? sourceLanguage.label
        );
    }
    if (sourceLanguage.kind === "raw") {
        return (
            getLanguageDisplayName({
                languageCode: sourceLanguage.rawLanguageCode,
                displayLanguage,
            }) ??
            sourceLanguage.label ??
            sourceLanguage.rawLanguageCode
        );
    }
    return content.translation.sourceLanguageLabel;
}

function getLanguageDisplayName({
    languageCode,
    displayLanguage,
}: {
    languageCode: string;
    displayLanguage: SupportedDisplayLanguageCodes;
}): string | undefined {
    const displayNames = getLanguageDisplayNames(displayLanguage);
    try {
        return displayNames?.of(languageCode);
    } catch {
        return undefined;
    }
}

function getSourceLanguageKey({
    content,
}: {
    content: TranslatableLocalizedContent;
}): string | undefined {
    const sourceLanguage = content.translation.sourceLanguage;
    if (sourceLanguage.kind === "recognized") {
        return getLanguageComparisonKey({
            languageCode: sourceLanguage.languageCode,
        });
    }
    if (content.translation.sourceLanguageCode != null) {
        return getLanguageComparisonKey({
            languageCode: content.translation.sourceLanguageCode,
        });
    }
    if (sourceLanguage.kind === "raw") {
        return getLanguageComparisonKey({
            languageCode: sourceLanguage.rawLanguageCode,
        });
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
        sourceLanguageKey ===
        getLanguageComparisonKey({ languageCode: displayLanguage })
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
    mode: LocalizedContentDisplayMode;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
}): DisplayedContentTranslationControl | null {
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

    const sourceLanguageLabel = getSourceLanguageLabel({
        content,
        displayLanguage,
    });
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
}): DisplayedContentUnavailableStatus {
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

export function getInitialDisplayContentMode({
    content,
    translationAllowed,
    displayLanguage,
    spokenLanguages,
}: {
    content: DisplayableLocalizedContentWithVariants<unknown, unknown>;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}): LocalizedContentDisplayMode {
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

export function toDisplayedContent<
    TOriginal,
    TTranslated,
    TOriginalResponse,
    TTranslatedResponse,
    TUnavailableResponse,
>({
    content,
    translationAllowed,
    displayLanguage,
    spokenLanguages,
    mode,
    buildOriginal,
    buildTranslated,
    buildUnavailable,
}: {
    content: DisplayableLocalizedContentWithVariants<TOriginal, TTranslated>;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
    mode?: LocalizedContentDisplayMode;
    buildOriginal: (params: {
        original: TOriginal;
        translationControl: DisplayedContentTranslationControl | null;
    }) => TOriginalResponse;
    buildTranslated: (params: {
        translated: TTranslated;
        translationControl: DisplayedContentTranslationControl | null;
    }) => TTranslatedResponse;
    buildUnavailable: (params: {
        status: DisplayedContentUnavailableStatus;
        translationControl: DisplayedContentTranslationControl | null;
    }) => TUnavailableResponse;
}): TOriginalResponse | TTranslatedResponse | TUnavailableResponse {
    const selectedMode =
        mode ??
        getInitialDisplayContentMode({
            content,
            translationAllowed,
            displayLanguage,
            spokenLanguages,
        });
    const translationControl = getTranslationControl({
        content,
        mode: selectedMode,
        translationAllowed,
        displayLanguage,
    });
    const canTranslate = canTranslateForDisplayLanguage({
        content,
        translationAllowed,
        displayLanguage,
    });

    if (selectedMode === "original") {
        const original = content.variants.original;
        if (original !== undefined) {
            return buildOriginal({ original, translationControl });
        }
    }

    if (
        canTranslate &&
        content.kind === "translatable" &&
        selectedMode === "translated"
    ) {
        const translated = content.variants.translated;
        if (translated !== undefined) {
            return buildTranslated({ translated, translationControl });
        }
    }

    return buildUnavailable({
        status: unavailableStatus({
            content,
            translationAllowed,
            displayLanguage,
        }),
        translationControl,
    });
}
