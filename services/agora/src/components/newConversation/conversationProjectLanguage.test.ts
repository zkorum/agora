import { describe, expect, it } from "vitest";
import { z } from "zod";

import { conversationProjectEditTranslations } from "./conversationProjectEdit.i18n";
import {
  type ConversationLanguageProject,
  getInheritedProjectLanguageCodes,
  getProjectLanguageOverride,
} from "./conversationProjectLanguage";
import { conversationProjectSettingsTranslations } from "./ConversationProjectSettings.i18n";

const project = {
  projectSlug: "project",
  projectTitle: "Project",
  participationMode: "guest",
  defaultLanguageCode: "en",
  languageSettings: {
    dynamicTranslationEnabled: true,
    targetLanguageCodes: ["en", "fr", "ar"],
  },
} satisfies ConversationLanguageProject;

describe("project language overrides", () => {
  it("deduplicates the primary language and preserves valid inherited targets", () => {
    expect(getInheritedProjectLanguageCodes(project)).toEqual([
      "en",
      "fr",
      "ar",
    ]);
    expect(
      getProjectLanguageOverride({
        project,
        detectedLanguageCode: "en",
        canUseDynamicTranslation: true,
      })
    ).toMatchObject({
      success: true,
      data: {
        additionalLanguageCodes: ["fr", "ar"],
        dynamicTranslationEnabled: true,
      },
    });
  });
  it("requires an explicit choice instead of silently truncating inherited languages", () => {
    expect(
      getProjectLanguageOverride({
        project,
        detectedLanguageCode: undefined,
        canUseDynamicTranslation: true,
      }).success
    ).toBe(false);
    expect(getInheritedProjectLanguageCodes(project)).toEqual([
      "en",
      "fr",
      "ar",
    ]);
  });
  it("preserves an explicit translation override", () => {
    expect(
      getProjectLanguageOverride({
        project,
        detectedLanguageCode: "en",
        canUseDynamicTranslation: true,
        dynamicTranslationEnabled: false,
      })
    ).toMatchObject({
      success: true,
      data: { dynamicTranslationEnabled: false },
    });
  });
  it.each([null, undefined, "fr"] as const)(
    "uses auto-detection when the destination cannot configure translation (detected=%s)",
    (detectedLanguageCode) => {
      expect(
        getProjectLanguageOverride({
          project,
          detectedLanguageCode,
          canUseDynamicTranslation: false,
        })
      ).toMatchObject({
        success: true,
        data: { additionalLanguageCodes: [], dynamicTranslationEnabled: false },
      });
    }
  );
});

describe("project settings translations", () => {
  for (const dictionary of [
    conversationProjectSettingsTranslations,
    conversationProjectEditTranslations,
  ]) {
    for (const [locale, translations] of Object.entries(dictionary)) {
      it(`keeps keys and interpolation parameters complete for ${locale}`, () => {
        expect(Object.keys(translations).sort()).toEqual(
          Object.keys(dictionary.en).sort()
        );
        const strings = z.record(z.string(), z.string());
        const original = new Map(Object.entries(strings.parse(dictionary.en)));
        for (const [key, value] of Object.entries(
          strings.parse(translations)
        )) {
          expect(value.trim().length).toBeGreaterThan(0);
          expect(value.match(/\{[^}]+\}/g) ?? []).toEqual(
            original.get(key)?.match(/\{[^}]+\}/g) ?? []
          );
        }
      });
    }
  }
});
