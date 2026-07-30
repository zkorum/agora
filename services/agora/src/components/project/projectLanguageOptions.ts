import {
  parseSupportedDisplayLanguageOrUndefined,
  type SupportedDisplayLanguageCodes,
  type SupportedSpokenLanguageCodes,
} from "src/shared/languages";

import type { ProjectLanguageOption } from "./projectPageTypes";

export function getConversationSourceDisplayLanguageCode({
  detectedDisplayLanguageCode,
  sourceLanguageCode,
}: {
  detectedDisplayLanguageCode: SupportedDisplayLanguageCodes | null;
  sourceLanguageCode: SupportedSpokenLanguageCodes | undefined;
}): SupportedDisplayLanguageCodes | null {
  if (detectedDisplayLanguageCode !== null) {
    return detectedDisplayLanguageCode;
  }
  return sourceLanguageCode === undefined
    ? null
    : (parseSupportedDisplayLanguageOrUndefined(sourceLanguageCode) ?? null);
}

export function getConversationSupportedLanguageCodes({
  sourceLanguageCode,
  configuredLanguageCodes,
  dynamicTranslationEnabled,
}: {
  sourceLanguageCode: SupportedDisplayLanguageCodes | null;
  configuredLanguageCodes: readonly SupportedDisplayLanguageCodes[];
  dynamicTranslationEnabled: boolean;
}): readonly SupportedDisplayLanguageCodes[] {
  return Array.from(
    new Set([
      ...(sourceLanguageCode === null ? [] : [sourceLanguageCode]),
      ...(dynamicTranslationEnabled ? configuredLanguageCodes : []),
    ])
  );
}

export function shouldTranslateProjectForConversation({
  selectedLanguageCode,
  languageOptions,
  conversationSupportedLanguageCodes,
  dynamicTranslationEnabled,
  projectDynamicTranslationEnabled,
}: {
  selectedLanguageCode: SupportedDisplayLanguageCodes;
  languageOptions: readonly ProjectLanguageOption[];
  conversationSupportedLanguageCodes: readonly SupportedDisplayLanguageCodes[];
  dynamicTranslationEnabled: boolean;
  projectDynamicTranslationEnabled: boolean;
}): boolean {
  if (!dynamicTranslationEnabled || !projectDynamicTranslationEnabled) {
    return false;
  }
  const selectedLanguageOption = languageOptions.find(
    (option) => option.value === selectedLanguageCode
  );
  return (
    selectedLanguageOption?.projectSupported !== true &&
    conversationSupportedLanguageCodes.includes(selectedLanguageCode)
  );
}

export function buildProjectLanguageDisplayOptions({
  languageOptions,
  conversationSupportedLanguageCodes,
  projectSupportedCaption,
  conversationSupportedCaption,
}: {
  languageOptions: readonly ProjectLanguageOption[];
  conversationSupportedLanguageCodes: readonly SupportedDisplayLanguageCodes[];
  projectSupportedCaption: string;
  conversationSupportedCaption: string;
}): readonly ProjectLanguageOption[] {
  const conversationSupportedLanguageSet = new Set(
    conversationSupportedLanguageCodes
  );
  const seenLanguageCodes = new Set<SupportedDisplayLanguageCodes>();
  const supportedOptions: ProjectLanguageOption[] = [];
  const unsupportedOptions: ProjectLanguageOption[] = [];

  for (const option of languageOptions) {
    if (seenLanguageCodes.has(option.value)) {
      continue;
    }

    seenLanguageCodes.add(option.value);
    const conversationSupported = conversationSupportedLanguageSet.has(
      option.value
    );
    const displayOption = {
      ...option,
      caption: option.projectSupported
        ? projectSupportedCaption
        : conversationSupported
          ? conversationSupportedCaption
          : undefined,
    } satisfies ProjectLanguageOption;

    if (option.projectSupported || conversationSupported) {
      supportedOptions.push(displayOption);
    } else {
      unsupportedOptions.push(displayOption);
    }
  }

  return [...supportedOptions, ...unsupportedOptions];
}
