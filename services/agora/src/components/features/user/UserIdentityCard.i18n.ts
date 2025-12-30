import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface UserIdentityCardTranslations {
  guestParticipationTooltip: string;
  edited: string;
}

export const userIdentityCardTranslations: Record<
  SupportedDisplayLanguageCodes,
  UserIdentityCardTranslations
> = {
  en: {
    guestParticipationTooltip: "Guest participation enabled",
    edited: "Edited",
  },
  ar: {
    guestParticipationTooltip: "مشاركة الضيوف مفعلة",
    edited: "معدل",
  },
  es: {
    guestParticipationTooltip: "Participación de invitados habilitada",
    edited: "Editado",
  },
  fr: {
    guestParticipationTooltip: "Participation des invités activée",
    edited: "Modifié",
  },
  "zh-Hans": {
    guestParticipationTooltip: "已启用访客参与",
    edited: "已编辑",
  },
  "zh-Hant": {
    guestParticipationTooltip: "已啟用訪客參與",
    edited: "已編輯",
  },
  ja: {
    guestParticipationTooltip: "ゲスト参加が有効",
    edited: "編集済み",
  },
};
