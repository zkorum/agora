import {
  type SupportedDisplayLanguageCodes,
  ZodSupportedDisplayLanguageCodes,
} from "src/shared/languages";
import { describe, expect, test } from "vitest";

import { translateProjectPageText } from "./projectPageI18n";

describe("translateProjectPageText", () => {
  test("uses Facilitator terminology in every supported language", () => {
    const expected = {
      en: "Facilitator version",
      es: "Versión para facilitadores",
      fr: "Version pour les facilitateurs",
      "zh-Hans": "引导员版本",
      "zh-Hant": "引導員版本",
      ja: "ファシリテーター版",
      ar: "نسخة الميسّرين",
      fa: "نسخه تسهیل‌گران",
      he: "גרסה למנחים",
      ky: "Фасилитаторлор үчүн версия",
      ru: "Версия для фасилитаторов",
    } satisfies Record<SupportedDisplayLanguageCodes, string>;

    for (const languageCode of ZodSupportedDisplayLanguageCodes.options) {
      expect(
        translateProjectPageText({
          languageCode,
          key: "documentOwnerVersion",
        })
      ).toBe(expected[languageCode]);
    }
  });

  test("pluralizes the compact project details summary", () => {
    expect(
      translateProjectPageText({
        languageCode: "en",
        key: "projectDetailsSummary",
        params: { name: "Polity Cooperative", count: 1 },
      })
    ).toBe("Polity Cooperative & 1 other");

    expect(
      translateProjectPageText({
        languageCode: "en",
        key: "projectDetailsSummary",
        params: { name: "Polity Cooperative", count: 2 },
      })
    ).toBe("Polity Cooperative & 2 others");
  });
});
