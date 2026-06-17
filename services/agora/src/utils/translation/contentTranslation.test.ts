import type {
  SupportedDisplayLanguageCodes,
  SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import { describe, expect, it } from "vitest";

import { resolveContentTranslationState } from "./contentTranslation";

function resolveState({
  dynamicTranslationEnabled = true,
  sourceLanguageCode = "ja",
  displayLanguage = "en",
  spokenLanguages = ["en"],
  hasTranslatedContent = true,
}: {
  dynamicTranslationEnabled?: boolean;
  sourceLanguageCode?: string | null;
  displayLanguage?: SupportedDisplayLanguageCodes;
  spokenLanguages?: SupportedSpokenLanguageCodes[];
  hasTranslatedContent?: boolean;
}) {
  return resolveContentTranslationState({
    dynamicTranslationEnabled,
    sourceLanguageCode,
    displayLanguage,
    spokenLanguages,
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

  it("hides the control when the source matches the display language", () => {
    expect(resolveState({ sourceLanguageCode: "en-US" })).toMatchObject({
      isAvailable: false,
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
      sourceLanguageLabel: "undetermined language",
    });
  });
});
