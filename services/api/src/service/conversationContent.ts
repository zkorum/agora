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
    LocalizedRankingItemContent,
    RankingItemDisplayedContent,
    LocalizedSurveyQuestionContent,
} from "@/shared/types/zod.js";
import { getInitialDisplayContentMode, toDisplayedContent } from "./displayContent.js";

type ConversationContentMode = ConversationContentFetchRequest["mode"];
type SurveyFormFetchSuccessResponse = Extract<
    SurveyFormFetchResponse,
    { success: true }
>;
type SurveyQuestionDisplayContent =
    SurveyFormFetchSuccessResponse["questions"][number]["displayContent"];
type OpinionDisplayContent = DisplayedOpinionItem["displayContent"];

export function getInitialConversationContentMode({
    content,
    translationAllowed,
    displayLanguage,
    spokenLanguages,
}: {
    content: LocalizedConversationContent;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}): ConversationContentMode {
    return getInitialDisplayContentMode({
        content,
        translationAllowed,
        displayLanguage,
        spokenLanguages,
    });
}

export function toConversationContentFetchResponse({
    content,
    mode,
    translationAllowed,
    displayLanguage,
    spokenLanguages,
}: {
    content: LocalizedConversationContent;
    mode: ConversationContentMode;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}): ConversationContentFetchResponse {
    return toDisplayedContent({
        content,
        translationAllowed,
        displayLanguage,
        spokenLanguages,
        mode,
        buildOriginal: ({ original, translationControl }) => ({
            sourceVersion: content.sourceVersion,
            status: "available",
            mode: "original",
            content: original,
            translationControl,
        }),
        buildTranslated: ({ translated, translationControl }) => ({
            sourceVersion: content.sourceVersion,
            status: "available",
            mode: "translated",
            content: translated,
            translationControl,
        }),
        buildUnavailable: ({ status, translationControl }) => ({
            sourceVersion: content.sourceVersion,
            status,
            translationControl,
        }),
    });
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
    return toDisplayedContent({
        content,
        translationAllowed,
        displayLanguage,
        spokenLanguages,
        buildOriginal: ({ original, translationControl }) => ({
            sourceVersion: content.sourceVersion,
            status: "available",
            mode: "original",
            content: original,
            translationControl,
        }),
        buildTranslated: ({ translated, translationControl }) => ({
            sourceVersion: content.sourceVersion,
            status: "available",
            mode: "translated",
            content: translated,
            translationControl,
        }),
        buildUnavailable: ({ status, translationControl }) => ({
            sourceVersion: content.sourceVersion,
            status,
            translationControl,
        }),
    });
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
    return toDisplayedContent({
        content,
        translationAllowed,
        displayLanguage,
        spokenLanguages,
        buildOriginal: ({ original, translationControl }) => ({
            sourceVersion: content.sourceVersion,
            status: "available",
            mode: "original",
            content: original,
            translationControl,
        }),
        buildTranslated: ({ translated, translationControl }) => ({
            sourceVersion: content.sourceVersion,
            status: "available",
            mode: "translated",
            content: translated,
            translationControl,
        }),
        buildUnavailable: ({ status, translationControl }) => ({
            sourceVersion: content.sourceVersion,
            status,
            translationControl,
        }),
    });
}

export function toRankingItemDisplayContent({
    content,
    translationAllowed,
    displayLanguage,
    spokenLanguages,
}: {
    content: LocalizedRankingItemContent;
    translationAllowed: boolean;
    displayLanguage: SupportedDisplayLanguageCodes;
    spokenLanguages: SupportedSpokenLanguageCodes[];
}): RankingItemDisplayedContent {
    return toDisplayedContent({
        content,
        translationAllowed,
        displayLanguage,
        spokenLanguages,
        buildOriginal: ({ original, translationControl }) => ({
            sourceVersion: content.sourceVersion,
            status: "available",
            mode: "original",
            content: original,
            translationControl,
        }),
        buildTranslated: ({ translated, translationControl }) => ({
            sourceVersion: content.sourceVersion,
            status: "available",
            mode: "translated",
            content: translated,
            translationControl,
        }),
        buildUnavailable: ({ status, translationControl }) => ({
            sourceVersion: content.sourceVersion,
            status,
            translationControl,
        }),
    });
}
