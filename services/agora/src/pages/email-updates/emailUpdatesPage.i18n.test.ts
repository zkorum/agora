import { ZodSupportedDisplayLanguageCodes } from "src/shared/languages";
import { describe, expect, it } from "vitest";

import { emailUpdatesPageTranslations } from "./emailUpdatesPage.i18n";

describe("emailUpdatesPageTranslations", () => {
  it("provides a non-empty title for every display language", () => {
    expect(Object.keys(emailUpdatesPageTranslations).sort()).toEqual(
      [...ZodSupportedDisplayLanguageCodes.options].sort()
    );

    for (const translations of Object.values(emailUpdatesPageTranslations)) {
      expect(translations.pageTitle.trim()).not.toBe("");
    }
  });

  it("uses localized page titles outside English", () => {
    const englishTitle = emailUpdatesPageTranslations.en.pageTitle;

    for (const languageCode of ZodSupportedDisplayLanguageCodes.options) {
      if (languageCode !== "en") {
        expect(emailUpdatesPageTranslations[languageCode].pageTitle).not.toBe(
          englishTitle
        );
      }
    }
    expect(emailUpdatesPageTranslations.fr.pageTitle).toBe(
      "Nouvelles par e-mail"
    );
    expect(emailUpdatesPageTranslations.es.pageTitle).toBe(
      "Novedades por correo"
    );
  });
});
