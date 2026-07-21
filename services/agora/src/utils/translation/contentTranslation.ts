import {
  type SupportedDisplayLanguageCodes,
  type SupportedSpokenLanguageCodes,
  SupportedSpokenLanguageMetadataList,
} from "src/shared/languages";
import { toUnionUndefined } from "src/shared/shared";
import type {
  ContentLanguageMetadataOutput,
  ContentTranslationSourceLanguage,
  ConversationLanguageSettingOutput,
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
  sourceLanguageCode: SupportedSpokenLanguageCodes | undefined;
  displayLanguage: SupportedDisplayLanguageCodes;
  spokenLanguages: SupportedSpokenLanguageCodes[];
  supportedTargetLanguageCodes: SupportedDisplayLanguageCodes[];
  hasTranslatedContent: boolean;
}

export type ContentTranslationPollingOutcome =
  | "completed"
  | "pending"
  | "terminal_failure";

export function resolveContentTranslationPollingOutcome({
  responseSuccess,
  translationStatus,
  hasTranslatedVariant,
}: {
  responseSuccess: boolean | undefined;
  translationStatus: LocalizedContentTranslationStatus | undefined;
  hasTranslatedVariant: boolean;
}): ContentTranslationPollingOutcome {
  if (responseSuccess === false || translationStatus === "failed") {
    return "terminal_failure";
  }
  if (translationStatus === "completed" && hasTranslatedVariant) {
    return "completed";
  }
  return "pending";
}

export function isRequestedTranslationPreviewCurrent({
  requestedSourceVersion,
  currentSourceVersion,
  hasTranslationControl,
}: {
  requestedSourceVersion: string | undefined;
  currentSourceVersion: string | undefined;
  hasTranslationControl: boolean;
}): boolean {
  return (
    hasTranslationControl &&
    requestedSourceVersion !== undefined &&
    requestedSourceVersion === currentSourceVersion
  );
}

function viewerUnderstandsSourceLanguage({
  sourceLanguageCode,
  displayLanguage,
  spokenLanguages,
}: {
  sourceLanguageCode: SupportedSpokenLanguageCodes;
  displayLanguage: SupportedDisplayLanguageCodes;
  spokenLanguages: SupportedSpokenLanguageCodes[];
}): boolean {
  const understoodLanguageCodes = new Set<string>([
    displayLanguage,
    ...spokenLanguages,
  ]);
  return understoodLanguageCodes.has(sourceLanguageCode);
}

export function isSameContentLanguage({
  sourceLanguageCode,
  displayLanguage,
}: {
  sourceLanguageCode: SupportedSpokenLanguageCodes;
  displayLanguage: SupportedDisplayLanguageCodes;
}): boolean {
  return sourceLanguageCode === displayLanguage;
}

export function getLanguageDisplayName({
  languageCode,
  displayLanguage,
}: {
  languageCode: string | null | undefined;
  displayLanguage: SupportedDisplayLanguageCodes;
}): string | undefined {
  if (
    languageCode === undefined ||
    languageCode === null ||
    languageCode === ""
  ) {
    return undefined;
  }

  try {
    const displayNames = new Intl.DisplayNames([displayLanguage], {
      type: "language",
    });
    return displayNames.of(languageCode) ?? languageCode;
  } catch {
    const language = SupportedSpokenLanguageMetadataList.find(
      (candidate) => candidate.code === languageCode
    );
    return language?.englishName ?? languageCode;
  }
}

export function getConversationLanguageSettingSourceLanguageCode({
  contentLanguageMetadata,
  languageSetting,
}: {
  contentLanguageMetadata?: ContentLanguageMetadataOutput;
  languageSetting?: ConversationLanguageSettingOutput;
}): SupportedSpokenLanguageCodes | undefined {
  return (
    contentLanguageMetadata?.detectedSourceLanguageCode ??
    languageSetting?.detectedSourceLanguageCode ??
    toUnionUndefined(languageSetting?.languageCode)
  );
}

export function getContentTranslationSourceLanguageLabel({
  sourceLanguage,
  fallbackLanguageCode,
  fallbackLabel,
  displayLanguage,
}: {
  sourceLanguage: ContentTranslationSourceLanguage | undefined;
  fallbackLanguageCode: string | null | undefined;
  fallbackLabel?: string;
  displayLanguage: SupportedDisplayLanguageCodes;
}): string | undefined {
  if (sourceLanguage?.kind === "recognized") {
    return getLanguageDisplayName({
      languageCode: sourceLanguage.languageCode,
      displayLanguage,
    });
  }

  if (sourceLanguage?.kind === "raw") {
    return (
      getLanguageDisplayName({
        languageCode: sourceLanguage.rawLanguageCode,
        displayLanguage,
      }) ??
      sourceLanguage.label ??
      sourceLanguage.rawLanguageCode
    );
  }

  return (
    getLanguageDisplayName({
      languageCode: fallbackLanguageCode,
      displayLanguage,
    }) ?? fallbackLabel
  );
}

export function resolveContentTranslationState({
  dynamicTranslationEnabled,
  sourceLanguageCode,
  displayLanguage,
  spokenLanguages,
  supportedTargetLanguageCodes,
  hasTranslatedContent,
}: ResolveContentTranslationStateParams): ContentTranslationState {
  const sourceLanguageLabel = getLanguageDisplayName({
    languageCode: sourceLanguageCode,
    displayLanguage,
  });
  const supportsDisplayLanguage =
    supportedTargetLanguageCodes.includes(displayLanguage);
  if (
    !dynamicTranslationEnabled ||
    !hasTranslatedContent ||
    !supportsDisplayLanguage
  ) {
    return {
      isAvailable: false,
      initialMode: "original",
      sourceLanguageLabel,
      translationStatus: "not_requested",
    };
  }

  if (sourceLanguageCode !== undefined) {
    if (isSameContentLanguage({ sourceLanguageCode, displayLanguage })) {
      return {
        isAvailable: false,
        initialMode: "original",
        sourceLanguageLabel,
        translationStatus: "not_requested",
      };
    }

    if (
      viewerUnderstandsSourceLanguage({
        sourceLanguageCode,
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
