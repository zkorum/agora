import type {
  SupportedDisplayLanguageCodes,
  SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import { describe, expect, it } from "vitest";

import {
  getContentTranslationSourceLanguageLabel,
  getConversationLanguageSettingSourceLanguageCode,
  getLanguageDisplayName,
  getSupportedContentTranslationTargetLanguageCodes,
  resolveContentTranslationState,
} from "./contentTranslation";

function resolveState({
  dynamicTranslationEnabled = true,
  sourceLanguageCode = "ja",
  displayLanguage = "en",
  spokenLanguages = ["en"],
  supportedTargetLanguageCodes = ["en"],
  hasTranslatedContent = true,
}: {
  dynamicTranslationEnabled?: boolean;
  sourceLanguageCode?: string | null;
  displayLanguage?: SupportedDisplayLanguageCodes;
  spokenLanguages?: SupportedSpokenLanguageCodes[];
  supportedTargetLanguageCodes?: SupportedDisplayLanguageCodes[];
  hasTranslatedContent?: boolean;
}) {
  return resolveContentTranslationState({
    dynamicTranslationEnabled,
    sourceLanguageCode,
    displayLanguage,
    spokenLanguages,
    supportedTargetLanguageCodes,
    hasTranslatedContent,
  });
}

describe("resolveContentTranslationState", () => {
  it("hides the control when dynamic translation is off", () => {
    expect(resolveState({ dynamicTranslationEnabled: false })).toMatchObject({
      isAvailable: false,
      initialMode: "original",
    });
  });

  it("hides the control when translated content is unavailable", () => {
    expect(resolveState({ hasTranslatedContent: false })).toMatchObject({
      isAvailable: false,
      initialMode: "original",
    });
  });

  it("hides the control when the display language is not a supported target", () => {
    expect(
      resolveState({
        displayLanguage: "ru",
        supportedTargetLanguageCodes: ["es", "fr"],
      })
    ).toMatchObject({
      isAvailable: false,
      initialMode: "original",
    });
  });

  it("shows the control when the display language is an additional target", () => {
    expect(
      resolveState({
        displayLanguage: "fr",
        sourceLanguageCode: "ja",
        spokenLanguages: ["en"],
        supportedTargetLanguageCodes: ["es", "fr"],
      })
    ).toMatchObject({
      isAvailable: true,
      initialMode: "translated",
    });
  });

  it("hides the control when the source matches the display language", () => {
    expect(resolveState({ sourceLanguageCode: "en-US" })).toMatchObject({
      isAvailable: false,
      initialMode: "original",
    });
  });

  it("treats the display language as understood", () => {
    expect(
      resolveState({
        sourceLanguageCode: "fr",
        displayLanguage: "fr",
        spokenLanguages: ["en"],
      })
    ).toMatchObject({
      isAvailable: false,
      initialMode: "original",
    });
  });

  it("shows original content first when the viewer display language differs but they speak the source", () => {
    expect(
      resolveState({
        sourceLanguageCode: "fr",
        displayLanguage: "en",
        spokenLanguages: ["fr"],
      })
    ).toMatchObject({
      isAvailable: true,
      initialMode: "original",
    });
  });

  it("shows original content first when the viewer speaks the source language", () => {
    expect(resolveState({ spokenLanguages: ["en", "ja"] })).toMatchObject({
      isAvailable: true,
      initialMode: "original",
      sourceLanguageLabel: "Japanese",
    });
  });

  it("shows translated content first when the viewer does not speak the source language", () => {
    expect(resolveState({})).toMatchObject({
      isAvailable: true,
      initialMode: "translated",
    });
  });

  it("treats unknown source language as needing translation", () => {
    expect(resolveState({ sourceLanguageCode: null })).toMatchObject({
      isAvailable: true,
      initialMode: "translated",
      sourceLanguageLabel: undefined,
    });
  });
});

describe("getLanguageDisplayName", () => {
  it("localizes language names in the viewer display language", () => {
    expect(
      getLanguageDisplayName({ languageCode: "en", displayLanguage: "fr" })
    ).toBe("anglais");
  });

  it("returns undefined when no language code is known", () => {
    expect(
      getLanguageDisplayName({ languageCode: null, displayLanguage: "fr" })
    ).toBeUndefined();
  });
});

describe("getContentTranslationSourceLanguageLabel", () => {
  it("localizes recognized source languages instead of using backend labels", () => {
    expect(
      getContentTranslationSourceLanguageLabel({
        sourceLanguage: {
          kind: "recognized",
          languageCode: "fr",
          label: "French",
        },
        fallbackLanguageCode: undefined,
        displayLanguage: "es",
      })
    ).toBe("francés");
  });

  it("localizes fallback source language codes before using fallback labels", () => {
    expect(
      getContentTranslationSourceLanguageLabel({
        sourceLanguage: undefined,
        fallbackLanguageCode: "fr",
        fallbackLabel: "French",
        displayLanguage: "es",
      })
    ).toBe("francés");
  });

  it("falls back to backend labels when only a label is available", () => {
    expect(
      getContentTranslationSourceLanguageLabel({
        sourceLanguage: undefined,
        fallbackLanguageCode: undefined,
        fallbackLabel: "French",
        displayLanguage: "es",
      })
    ).toBe("French");
  });
});

describe("getConversationLanguageSettingSourceLanguageCode", () => {
  it("uses the detected source language when available", () => {
    expect(
      getConversationLanguageSettingSourceLanguageCode({
        languageSetting: {
          mode: "auto",
          languageCode: "es",
          detectedLanguageCode: "es",
          detectedSourceLanguageCode: "fr",
          detectedRawLanguageCode: "fr",
          detectionConfidence: 0.98,
          autoDetectionStatus: "detected",
        },
      })
    ).toBe("fr");
  });

  it("falls back to the manual conversation language", () => {
    expect(
      getConversationLanguageSettingSourceLanguageCode({
        languageSetting: {
          mode: "manual",
          languageCode: "fr",
          detectedLanguageCode: null,
          detectedSourceLanguageCode: null,
          detectedRawLanguageCode: null,
          detectionConfidence: null,
          autoDetectionStatus: "not_attempted",
        },
      })
    ).toBe("fr");
  });
});

describe("getSupportedContentTranslationTargetLanguageCodes", () => {
  it("uses a manual primary language as the main target", () => {
    expect(
      getSupportedContentTranslationTargetLanguageCodes({
        languageSetting: {
          mode: "manual",
          languageCode: "fr",
          detectedLanguageCode: "ja",
          detectedSourceLanguageCode: "ja",
          detectedRawLanguageCode: "ja",
          detectionConfidence: 0.98,
          autoDetectionStatus: "detected",
        },
        multilingualSetting: {
          dynamicTranslationEnabled: true,
          additionalLanguageCodes: ["en"],
        },
      })
    ).toEqual(["fr", "en"]);
  });

  it("uses a detected auto language as the main target", () => {
    expect(
      getSupportedContentTranslationTargetLanguageCodes({
        languageSetting: {
          mode: "auto",
          languageCode: null,
          detectedLanguageCode: "ja",
          detectedSourceLanguageCode: "ja",
          detectedRawLanguageCode: "ja",
          detectionConfidence: 0.98,
          autoDetectionStatus: "detected",
        },
        multilingualSetting: {
          dynamicTranslationEnabled: true,
          additionalLanguageCodes: ["en"],
        },
      })
    ).toEqual(["ja", "en"]);
  });

  it("ignores an unknown auto main language", () => {
    expect(
      getSupportedContentTranslationTargetLanguageCodes({
        languageSetting: {
          mode: "auto",
          languageCode: null,
          detectedLanguageCode: null,
          detectedSourceLanguageCode: null,
          detectedRawLanguageCode: null,
          detectionConfidence: null,
          autoDetectionStatus: "stable_unknown",
        },
        multilingualSetting: {
          dynamicTranslationEnabled: true,
          additionalLanguageCodes: ["en"],
        },
      })
    ).toEqual(["en"]);
  });
});
