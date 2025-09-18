import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentModerationTranslations {
  edit: string;
  moderatorFlaggedMessage: string;
}

export const commentModerationTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentModerationTranslations
> = {
  en: {
    edit: "Edit",
    moderatorFlaggedMessage: "Moderator flagged this response as",
  },
  ar: {
    edit: "تحرير",
    moderatorFlaggedMessage: "أشر المشرف إلى هذا الرد كـ",
  },
  es: {
    edit: "Editar",
    moderatorFlaggedMessage: "El moderador marcó esta respuesta como",
  },
  fr: {
    edit: "Modifier",
    moderatorFlaggedMessage: "Le modérateur a signalé cette réponse comme",
  },
  "zh-Hans": {
    edit: "编辑",
    moderatorFlaggedMessage: "版主标记此回复为",
  },
  "zh-Hant": {
    edit: "編輯",
    moderatorFlaggedMessage: "版主標記此回覆為",
  },
  ja: {
    edit: "編集",
    moderatorFlaggedMessage: "モデレーターがこの回答を",
  },
};
