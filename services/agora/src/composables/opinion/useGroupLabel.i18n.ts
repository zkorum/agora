import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export const groupLabelTranslations = {
  en: { group: "Group {label}" },
  ar: { group: "المجموعة {label}" },
  "zh-Hans": { group: "群组 {label}" },
  "zh-Hant": { group: "群組 {label}" },
  fr: { group: "Groupe {label}" },
  de: { group: "Gruppe {label}" },
  he: { group: "אשכול {label}" },
  hi: { group: "समूह {label}" },
  ja: { group: "クラスタ {label}" },
  ky: { group: "Кластер {label}" },
  fa: { group: "خوشه {label}" },
  ru: { group: "Кластер {label}" },
  es: { group: "Grupo {label}" },
} satisfies Record<SupportedDisplayLanguageCodes, { group: string }>;
