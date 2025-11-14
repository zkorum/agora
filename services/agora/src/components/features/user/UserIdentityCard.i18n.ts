import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UserIdentityCardTranslations {
  guestParticipationTooltip: string;
}

export const userIdentityCardTranslations: Record<
  SupportedDisplayLanguageCodes,
  UserIdentityCardTranslations
> = {
  en: {
    guestParticipationTooltip: "Guest participation enabled",
  },
  ar: {
    guestParticipationTooltip: "مشاركة الضيوف مفعلة",
  },
  es: {
    guestParticipationTooltip: "Participación de invitados habilitada",
  },
  fr: {
    guestParticipationTooltip: "Participation des invités activée",
  },
  "zh-Hans": {
    guestParticipationTooltip: "已启用访客参与",
  },
  "zh-Hant": {
    guestParticipationTooltip: "已啟用訪客參與",
  },
  ja: {
    guestParticipationTooltip: "ゲスト参加が有効",
  },
};
