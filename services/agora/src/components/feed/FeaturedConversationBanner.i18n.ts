import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface FeaturedConversationBannerTranslations {
  message: string;
}

export const featuredConversationBannerTranslations: Record<
  SupportedDisplayLanguageCodes,
  FeaturedConversationBannerTranslations
> = {
  en: {
    message: "Help shape Agora's future — vote on which features we build next",
  },
  ar: {
    message:
      "ساعد في تشكيل مستقبل أغورا — صوّت على الميزات التي نبنيها بعد ذلك",
  },
  es: {
    message:
      "Ayuda a dar forma al futuro de Agora — vota por las funciones que construiremos",
  },
  fr: {
    message:
      "Aidez-nous à façonner l'avenir d'Agora — votez pour les fonctionnalités à développer",
  },
  "zh-Hans": {
    message: "帮助塑造 Agora 的未来 - 投票决定我们接下来要构建的功能",
  },
  "zh-Hant": {
    message: "幫助塑造 Agora 的未來 - 投票決定我們接下來要構建的功能",
  },
  ja: {
    message:
      "Agoraの未来を一緒に作りましょう — 次に開発する機能に投票してください",
  },
  ky: {
    message: "Agoraнын келечегин калыптандырууга жардам бериңиз — кийинки функцияларга добуш бериңиз",
  },
  ru: {
    message: "Помогите определить будущее Agora — голосуйте за функции, которые мы разработаем следующими",
  },
};
