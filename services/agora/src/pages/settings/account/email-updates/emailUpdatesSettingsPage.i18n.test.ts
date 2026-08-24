import { ZodSupportedDisplayLanguageCodes } from "src/shared/languages";
import { describe, expect, it } from "vitest";

import { emailUpdatesSettingsPageTranslations } from "./emailUpdatesSettingsPage.i18n";

describe("emailUpdatesSettingsPageTranslations", () => {
  it("provides a localized title for every display language", () => {
    expect(Object.keys(emailUpdatesSettingsPageTranslations).sort()).toEqual(
      [...ZodSupportedDisplayLanguageCodes.options].sort()
    );

    const englishTitle = emailUpdatesSettingsPageTranslations.en.pageTitle;
    for (const languageCode of ZodSupportedDisplayLanguageCodes.options) {
      const title =
        emailUpdatesSettingsPageTranslations[languageCode].pageTitle;
      expect(title.trim()).not.toBe("");
      if (languageCode !== "en") {
        expect(title).not.toBe(englishTitle);
      }
    }
  });
});
