import {
  type SupportedDisplayLanguageCodes,
  type SupportedSpokenLanguageCodes,
  SupportedSpokenLanguageMetadataList,
} from "src/shared/languages";
import type {
  ConversationLanguageSettingOutput,
  ConversationMultilingualSetting,
  LocalizedContentTranslationStatus,
} from "src/shared/types/zod";

export type ContentTranslationDisplayMode = "original" | "translated";

export interface ContentTranslationState {
  isAvailable: boolean;
  initialMode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string | undefined;
  translationStatus: LocalizedContentTranslationStatus;
}

export interface ResolveContentTranslationStateParams {
  dynamicTranslationEnabled: boolean;
  sourceLanguageCode: string | null | undefined;
  displayLanguage: SupportedDisplayLanguageCodes;
  spokenLanguages: SupportedSpokenLanguageCodes[];
  supportedTargetLanguageCodes: SupportedDisplayLanguageCodes[];
  hasTranslatedContent: boolean;
}

function getLanguageComparisonKey(languageCode: string): string {
  if (languageCode === "zh-Hans" || languageCode === "zh-Hant") {
    return languageCode;
  }
  return languageCode.split("-")[0]?.toLowerCase() ?? languageCode.toLowerCase();
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
    getLanguageComparisonKey(displayLanguage),
    ...spokenLanguages.map((languageCode) => getLanguageComparisonKey(languageCode)),
  ]);
  return understoodLanguageKeys.has(sourceLanguageKey);
}

export function getLanguageDisplayName(languageCode: string | null | undefined): string | undefined {
  if (languageCode === undefined || languageCode === null || languageCode === "") {
    return undefined;
  }

  const language = SupportedSpokenLanguageMetadataList.find(
    (candidate) => candidate.code === languageCode
  );
  if (language !== undefined) {
    return language.englishName;
  }

  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "language" });
    return displayNames.of(languageCode) ?? languageCode;
  } catch {
    return languageCode;
  }
}

export function resolveContentTranslationState({
  dynamicTranslationEnabled,
  sourceLanguageCode,
  displayLanguage,
  spokenLanguages,
  supportedTargetLanguageCodes,
  hasTranslatedContent,
}: ResolveContentTranslationStateParams): ContentTranslationState {
  const sourceLanguageLabel = getLanguageDisplayName(sourceLanguageCode);
  const supportsDisplayLanguage = supportedTargetLanguageCodes.includes(displayLanguage);
  if (!dynamicTranslationEnabled || !hasTranslatedContent || !supportsDisplayLanguage) {
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

    if (
      viewerUnderstandsSourceLanguage({
        sourceLanguageKey,
        displayLanguage,
        spokenLanguages,
      })
    ) {
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

export function getSupportedContentTranslationTargetLanguageCodes({
  languageSetting,
  multilingualSetting,
}: {
  languageSetting: ConversationLanguageSettingOutput;
  multilingualSetting: ConversationMultilingualSetting;
}): SupportedDisplayLanguageCodes[] {
  const supportedLanguageCodes = new Set<SupportedDisplayLanguageCodes>();
  const primaryLanguageCode =
    languageSetting.languageCode ?? languageSetting.detectedLanguageCode;
  if (primaryLanguageCode !== null) {
    supportedLanguageCodes.add(primaryLanguageCode);
  }

  for (const languageCode of multilingualSetting.additionalLanguageCodes) {
    supportedLanguageCodes.add(languageCode);
  }

  return [...supportedLanguageCodes];
}
