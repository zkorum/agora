import { describe, expect, it } from "vitest";

import {
  getContentTranslationSourceLanguageLabel,
  getConversationLanguageSettingSourceLanguageCode,
  getLanguageDisplayName,
  isRequestedTranslationPreviewCurrent,
  isSameContentLanguage,
  resolveContentTranslationPollingOutcome,
  resolveContentTranslationState,
  type ResolveContentTranslationStateParams,
} from "./contentTranslation";

const defaultResolveStateParams: ResolveContentTranslationStateParams = {
  dynamicTranslationEnabled: true,
  sourceLanguageCode: "ja",
  displayLanguage: "en",
  spokenLanguages: ["en"],
  supportedTargetLanguageCodes: ["en"],
  hasTranslatedContent: true,
};

function resolveState(
  overrides: Partial<ResolveContentTranslationStateParams>
) {
  return resolveContentTranslationState({
    ...defaultResolveStateParams,
    ...overrides,
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
    expect(resolveState({ sourceLanguageCode: "en" })).toMatchObject({
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
    expect(resolveState({ sourceLanguageCode: undefined })).toMatchObject({
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

describe("isSameContentLanguage", () => {
  it("keeps Chinese scripts distinct", () => {
    expect(
      isSameContentLanguage({
        sourceLanguageCode: "zh-Hant",
        displayLanguage: "zh-Hans",
      })
    ).toBe(false);
  });

  it("matches identical canonical language codes", () => {
    expect(
      isSameContentLanguage({ sourceLanguageCode: "ky", displayLanguage: "ky" })
    ).toBe(true);
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

describe("resolveContentTranslationPollingOutcome", () => {
  it("treats business failures as terminal while resuming polling", () => {
    expect(
      resolveContentTranslationPollingOutcome({
        responseSuccess: false,
        translationStatus: undefined,
        hasTranslatedVariant: false,
      })
    ).toBe("terminal_failure");
  });

  it("treats a failed translation status as terminal", () => {
    expect(
      resolveContentTranslationPollingOutcome({
        responseSuccess: true,
        translationStatus: "failed",
        hasTranslatedVariant: false,
      })
    ).toBe("terminal_failure");
  });

  it("requires translated content before considering polling complete", () => {
    expect(
      resolveContentTranslationPollingOutcome({
        responseSuccess: true,
        translationStatus: "completed",
        hasTranslatedVariant: false,
      })
    ).toBe("pending");
    expect(
      resolveContentTranslationPollingOutcome({
        responseSuccess: true,
        translationStatus: "completed",
        hasTranslatedVariant: true,
      })
    ).toBe("completed");
  });
});

describe("isRequestedTranslationPreviewCurrent", () => {
  const sourceVersion = "00000000-0000-4000-8000-000000000001";

  it("disables a cached preview when translation control disappears", () => {
    expect(
      isRequestedTranslationPreviewCurrent({
        requestedSourceVersion: sourceVersion,
        currentSourceVersion: sourceVersion,
        hasTranslationControl: false,
      })
    ).toBe(false);
  });

  it("disables a cached preview after the source revision changes", () => {
    expect(
      isRequestedTranslationPreviewCurrent({
        requestedSourceVersion: sourceVersion,
        currentSourceVersion: "00000000-0000-4000-8000-000000000002",
        hasTranslationControl: true,
      })
    ).toBe(false);
  });

  it("keeps a requested preview for the current controlled revision", () => {
    expect(
      isRequestedTranslationPreviewCurrent({
        requestedSourceVersion: sourceVersion,
        currentSourceVersion: sourceVersion,
        hasTranslationControl: true,
      })
    ).toBe(true);
  });
});
