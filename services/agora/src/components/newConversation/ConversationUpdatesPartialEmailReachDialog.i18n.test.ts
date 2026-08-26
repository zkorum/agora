import { ZodSupportedDisplayLanguageCodes } from "src/shared/languages";
import { describe, expect, it } from "vitest";

import { conversationUpdatesPartialEmailReachDialogTranslations } from "./ConversationUpdatesPartialEmailReachDialog.i18n";

describe("conversationUpdatesPartialEmailReachDialogTranslations", () => {
  it("provides every warning string in every display language", () => {
    expect(
      Object.keys(conversationUpdatesPartialEmailReachDialogTranslations).sort()
    ).toEqual([...ZodSupportedDisplayLanguageCodes.options].sort());

    for (const translations of Object.values(
      conversationUpdatesPartialEmailReachDialogTranslations
    )) {
      for (const value of Object.values(translations)) {
        expect(value.trim()).not.toBe("");
      }
    }
  });

  it("localizes the warning title outside English", () => {
    const englishTitle =
      conversationUpdatesPartialEmailReachDialogTranslations.en
        .partialReachTitle;
    for (const languageCode of ZodSupportedDisplayLanguageCodes.options) {
      if (languageCode !== "en") {
        expect(
          conversationUpdatesPartialEmailReachDialogTranslations[languageCode]
            .partialReachTitle
        ).not.toBe(englishTitle);
      }
    }
  });
});
