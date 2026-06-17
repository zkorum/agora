import {
  type SupportedDisplayLanguageCodes,
  type SupportedSpokenLanguageCodes,
  SupportedSpokenLanguageMetadataList,
} from "src/shared/languages";
import type { LocalizedContentTranslationStatus } from "src/shared/types/zod";

export type ContentTranslationDisplayMode = "original" | "translated";

export interface ContentTranslationState {
  isAvailable: boolean;
  initialMode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string;
  translationStatus: LocalizedContentTranslationStatus;
}

export interface ResolveContentTranslationStateParams {
  dynamicTranslationEnabled: boolean;
  sourceLanguageCode: string | null | undefined;
  displayLanguage: SupportedDisplayLanguageCodes;
  spokenLanguages: SupportedSpokenLanguageCodes[];
  hasTranslatedContent: boolean;
}

function getLanguageComparisonKey(languageCode: string): string {
  if (languageCode === "zh-Hans" || languageCode === "zh-Hant") {
    return languageCode;
  }
  return languageCode.split("-")[0]?.toLowerCase() ?? languageCode.toLowerCase();
}

export function getLanguageDisplayName(languageCode: string | null | undefined): string {
  if (languageCode === undefined || languageCode === null || languageCode === "") {
    return "undetermined language";
  }

  const language = SupportedSpokenLanguageMetadataList.find(
    (candidate) => candidate.code === languageCode
  );
  return language?.englishName ?? languageCode;
}

export function resolveContentTranslationState({
  dynamicTranslationEnabled,
  sourceLanguageCode,
  displayLanguage,
  spokenLanguages,
  hasTranslatedContent,
}: ResolveContentTranslationStateParams): ContentTranslationState {
  const sourceLanguageLabel = getLanguageDisplayName(sourceLanguageCode);
  if (!dynamicTranslationEnabled || !hasTranslatedContent) {
    return {
      isAvailable: false,
      initialMode: "original",
      sourceLanguageLabel,
      translationStatus: "not_requested",
    };
  }

  if (sourceLanguageCode !== undefined && sourceLanguageCode !== null) {
    const sourceLanguageKey = getLanguageComparisonKey(sourceLanguageCode);
    const displayLanguageKey = getLanguageComparisonKey(displayLanguage);
    if (sourceLanguageKey === displayLanguageKey) {
      return {
        isAvailable: false,
        initialMode: "original",
        sourceLanguageLabel,
        translationStatus: "not_requested",
      };
    }

    const isSpokenByViewer = spokenLanguages.some(
      (languageCode) => getLanguageComparisonKey(languageCode) === sourceLanguageKey
    );
    if (isSpokenByViewer) {
      return {
        isAvailable: true,
        initialMode: "original",
        sourceLanguageLabel,
        translationStatus: "completed",
      };
    }
  }

  return {
    isAvailable: true,
    initialMode: "translated",
    sourceLanguageLabel,
    translationStatus: "completed",
  };
}
