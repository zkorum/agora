import {
  type SupportedDisplayLanguageCodes,
  ZodSupportedDisplayLanguageCodes,
} from "src/shared/languages";
import { describe, expect, it } from "vitest";

import { projectDocumentManagerTranslations } from "./ProjectDocumentManager.i18n";

describe("ProjectDocumentManager translations", () => {
  it("labels private files for facilitators in every supported language", () => {
    const expected = {
      en: "Facilitator download (optional)",
      es: "Archivo privado para facilitadores (opcional)",
      fr: "Fichier privé pour les facilitateurs (facultatif)",
      "zh-Hans": "引导员私密文件（选填）",
      "zh-Hant": "引導員私人檔案（選填）",
      ja: "ファシリテーター向け非公開ファイル（任意）",
      ar: "ملف خاص بالميسّرين (اختياري)",
      fa: "فایل خصوصی تسهیل‌گران (اختیاری)",
      he: "קובץ פרטי למנחים (אופציונלי)",
      ky: "Фасилитаторлор үчүн купуя файл (милдеттүү эмес)",
      ru: "Закрытый файл для фасилитаторов (необязательно)",
    } satisfies Record<SupportedDisplayLanguageCodes, string>;

    for (const languageCode of ZodSupportedDisplayLanguageCodes.options) {
      expect(
        projectDocumentManagerTranslations[languageCode].ownerFileLabel
      ).toBe(expected[languageCode]);
    }
  });
});
