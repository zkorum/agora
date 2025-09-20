import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CommentActionOptionsTranslations {
  agoraOpinion: string;
}

export const commentActionOptionsTranslations: Record<
  SupportedDisplayLanguageCodes,
  CommentActionOptionsTranslations
> = {
  en: {
    agoraOpinion: "Agora Opinion",
  },
  ar: {
    agoraOpinion: "رأي أجورا",
  },
  es: {
    agoraOpinion: "Opinión de Agora",
  },
  fr: {
    agoraOpinion: "Opinion Agora",
  },
  "zh-Hans": {
    agoraOpinion: "Agora 意见",
  },
  "zh-Hant": {
    agoraOpinion: "Agora 意見",
  },
  ja: {
    agoraOpinion: "Agora 意見",
  },
};
