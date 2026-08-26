import { ZodSupportedDisplayLanguageCodes } from "src/shared/languages";
import { describe, expect, it } from "vitest";

import {
  type ConversationUpdateComposerFormTranslations,
  conversationUpdateComposerFormTranslations,
} from "./ConversationUpdateComposerForm.i18n";

const interpolatedKeys = [
  "testEmailNotice",
  "zeroAudienceOwnerCopyWarning",
  "subjectHint",
  "ownerCopySummary",
] satisfies readonly (keyof ConversationUpdateComposerFormTranslations)[];
const reviewedKeys = [
  "contentConfirmation",
  "ownerCopySummary",
  "completeRequiredFields",
  "fixInvalidFields",
  "checkingRecipients",
] satisfies readonly (keyof ConversationUpdateComposerFormTranslations)[];

describe("conversationUpdateComposerFormTranslations", () => {
  it("provides every translation key for every display language", () => {
    expect(
      Object.keys(conversationUpdateComposerFormTranslations).sort()
    ).toEqual([...ZodSupportedDisplayLanguageCodes.options].sort());
    const englishKeys = Object.keys(
      conversationUpdateComposerFormTranslations.en
    ).sort();

    for (const translations of Object.values(
      conversationUpdateComposerFormTranslations
    )) {
      expect(Object.keys(translations).sort()).toEqual(englishKeys);
      for (const value of Object.values(translations)) {
        expect(value.trim()).not.toBe("");
      }
    }
  });

  it("preserves every interpolation placeholder in every locale", () => {
    const englishTranslations = conversationUpdateComposerFormTranslations.en;

    for (const translations of Object.values(
      conversationUpdateComposerFormTranslations
    )) {
      for (const key of interpolatedKeys) {
        expect(getPlaceholders(translations[key])).toEqual(
          getPlaceholders(englishTranslations[key])
        );
      }
    }
  });

  it("localizes the reviewed composer guidance outside English", () => {
    const englishTranslations = conversationUpdateComposerFormTranslations.en;

    for (const languageCode of ZodSupportedDisplayLanguageCodes.options) {
      if (languageCode === "en") {
        continue;
      }
      for (const key of reviewedKeys) {
        expect(
          conversationUpdateComposerFormTranslations[languageCode][key]
        ).not.toBe(englishTranslations[key]);
      }
    }
  });
});

function getPlaceholders(value: string): readonly string[] {
  return [...value.matchAll(/\{([^}]+)\}/g)]
    .map((match) => match[1] ?? "")
    .sort();
}
