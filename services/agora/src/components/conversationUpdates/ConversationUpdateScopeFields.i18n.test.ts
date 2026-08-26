import { ZodSupportedDisplayLanguageCodes } from "src/shared/languages";
import { describe, expect, it } from "vitest";

import { conversationUpdateScopeFieldsTranslations } from "./ConversationUpdateScopeFields.i18n";

describe("conversationUpdateScopeFieldsTranslations", () => {
  it("provides every translation key for every display language", () => {
    expect(
      Object.keys(conversationUpdateScopeFieldsTranslations).sort()
    ).toEqual([...ZodSupportedDisplayLanguageCodes.options].sort());
    const englishKeys = Object.keys(
      conversationUpdateScopeFieldsTranslations.en
    ).sort();

    for (const translations of Object.values(
      conversationUpdateScopeFieldsTranslations
    )) {
      expect(Object.keys(translations).sort()).toEqual(englishKeys);
      for (const value of Object.values(translations)) {
        expect(value.trim()).not.toBe("");
      }
    }
  });
});
