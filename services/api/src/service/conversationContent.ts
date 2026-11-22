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
import {
    getInitialDisplayContentMode,
    toStandardDisplayedContent,
} from "./displayContent.js";

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
    return toStandardDisplayedContent({
        content,
        mode,
        preferences: { translationAllowed, displayLanguage, spokenLanguages },
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
    return toStandardDisplayedContent({
        content,
        preferences: { translationAllowed, displayLanguage, spokenLanguages },
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
    return toStandardDisplayedContent({
        content,
        preferences: { translationAllowed, displayLanguage, spokenLanguages },
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
    return toStandardDisplayedContent({
        content,
        preferences: { translationAllowed, displayLanguage, spokenLanguages },
    });
}
